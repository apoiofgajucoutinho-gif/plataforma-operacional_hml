import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";
import type { AdsConfigSnapshot, AdsContext, AdsDailyRow, AdsDecisionConfig, AdsGranularity, AdsPeriodContext, AdsPeriodKey, AdsReconciliationSummary } from "@/modules/ads/types";

type SearchLike = Record<string, string | string[] | undefined>;

type AdsDataClient = Awaited<ReturnType<typeof createClient>>;

const PAGE_SIZE = 1000;
const DEFAULT_DECISION_CONFIG: AdsDecisionConfig = {
  minLinkClicksSignal: 8,
  minLinkClicksDecision: 20,
  reviewLinkClicksIncrement: 20,
  reviewHours: 24,
  minTrendDays: 3,
  comparableSpendRatio: 0.5,
  meaningfulSpend: null,
  targetCpa: null,
};
const periodLabels: Record<AdsPeriodKey, string> = {
  "30d": "30 dias",
  "90d": "90 dias",
  "6m": "6 meses",
  "12m": "12 meses",
  custom: "Personalizado",
};

function firstParam(searchParams: SearchLike | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function toIsoDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function parseIsoInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() - months);
  return copy;
}

function resolveAdsPeriod(searchParams?: SearchLike): AdsPeriodContext {
  const requested = firstParam(searchParams, "period") as AdsPeriodKey | undefined;
  const key: AdsPeriodKey = requested && ["30d", "90d", "6m", "12m", "custom"].includes(requested) ? requested : "30d";
  const requestedGranularity = firstParam(searchParams, "granularity") as AdsGranularity | undefined;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = new Date(end);
  let resolvedEnd = new Date(end);
  let resolvedKey = key;

  if (key === "custom") {
    const customStart = parseIsoInput(firstParam(searchParams, "start"));
    const customEnd = parseIsoInput(firstParam(searchParams, "end"));
    if (customStart && customEnd && customStart <= customEnd) {
      start = customStart;
      resolvedEnd = customEnd;
    } else {
      resolvedKey = "30d";
      start.setDate(end.getDate() - 29);
    }
  } else if (key === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (key === "90d") {
    start.setDate(end.getDate() - 89);
  } else if (key === "6m") {
    start = shiftMonths(end, 6);
  } else if (key === "12m") {
    start = shiftMonths(end, 12);
  }

  const defaultGranularity: AdsGranularity = resolvedKey === "30d" ? "day" : "month";
  const granularity: AdsGranularity = requestedGranularity && ["day", "week", "month"].includes(requestedGranularity) ? requestedGranularity : defaultGranularity;

  return {
    key: resolvedKey,
    start: toIsoDate(start),
    end: toIsoDate(resolvedEnd),
    label: periodLabels[resolvedKey],
    granularity,
    isCustom: resolvedKey === "custom",
  };
}

function emptyContext(overrides: Partial<AdsContext>, period: AdsPeriodContext): AdsContext {
  return {
    tenant: null,
    rows: [],
    updatedAt: null,
    role: null,
    diagnostic: null,
    allowedModules: [],
    period,
    configSnapshots: [],
    reconciliation: {
      campaignScope: { resolved: false, reason: "A leitura de Norwyn/Hotmart ainda está no escopo do tenant e não pode ser creditada à campanha Meta filtrada.", campaignId: null, campaignName: null, metaCampaignId: null, landingKey: null, resolution: "unresolved" },
      site: { available: false, visitors: null, sessions: null, engagedSessions: null, averageSessionSeconds: null, source: "Site / Analytics", limitation: "Fonte Site Kit/GA4 ainda não integrada ao contexto Ads." },
      norwyn: { sessions: null, offerViews: null, checkoutClicks: null, attributedSessions: null, paidSocialSessions: null, source: "landing_page_tracking_events" },
      hotmart: { confirmedSales: null, attributedSales: null, confirmedRevenue: null, unattributedSales: null, attributionStatus: "unavailable", source: "comercial_vendas", adAttributionAvailable: false },
      measurement: { quality: "Fraca", reasons: ["Campanha não resolvida."], trackingCoverage: null },
      note: "Fontes independentes; os valores não formam necessariamente uma sequência monotônica.",
    },
    decisionMemory: [],
    decisionConfig: DEFAULT_DECISION_CONFIG,
    campaignProgress: { startsAt: null, endsAt: null, daysElapsed: null, daysRemaining: null, budget: null, spend: 0, budgetUsedPct: null },
    ...overrides,
  };
}

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return {
    membership: data,
    error,
    source: admin ? "service_role" : "rls",
  };
}

async function getAllowedModules(tenantId: string, role: string) {
  if (role === "ADMIN") {
    return allModules;
  }

  const dataClient = createAdminClient() ?? (await createClient());
  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item) => item.module as string);
}

async function fetchAdsRows(dataClient: AdsDataClient, tenantId: string, period: AdsPeriodContext) {
  const rows: AdsDailyRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await dataClient
      .from("instagram_ads_daily")
      .select(adsAnalyticsSelect)
      .eq("tenant_id", tenantId)
      .gte("data_referencia", period.start)
      .lte("data_referencia", period.end)
      .order("data_referencia", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { rows, error };

    const page = (data ?? []).map((row) => normalizeAdsDailyRow(row as unknown as Record<string, unknown>)) as AdsDailyRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, error: null };
}

async function fetchPeriodRows(
  dataClient: AdsDataClient,
  table: string,
  select: string,
  tenantId: string,
  dateField: string,
  period: AdsPeriodContext,
  apply?: (query: any) => any,
) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query: any = dataClient
      .from(table)
      .select(select)
      .eq("tenant_id", tenantId)
      .gte(dateField, `${period.start}T00:00:00`)
      .lte(dateField, `${period.end}T23:59:59.999`)
      .order(dateField, { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null };
  }
}

async function fetchConfigSnapshots(dataClient: AdsDataClient, tenantId: string) {
  const rows: AdsConfigSnapshot[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await dataClient
      .from("instagram_ads_config_snapshots")
      .select("id,entity_type,entity_id,entity_name,parent_ids,config_hash,config_json,audience_type,audience_label,targeting_summary,audience_confidence,audience_evidence,source,graph_version,collector_version,first_seen_at,last_seen_at")
      .eq("tenant_id", tenantId)
      .order("last_seen_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    rows.push(...((data ?? []) as AdsConfigSnapshot[]));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null };
  }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function numeric(value: unknown, fallback: number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchTrafficIntelligence(dataClient: AdsDataClient, tenantId: string, period: AdsPeriodContext, metaCampaignIds: string[], spend: number) {
  const [snapshotsResult, trackingResult, salesResult, bridgeResult, learningsResult, campaignsResult] = await Promise.all([
    fetchConfigSnapshots(dataClient, tenantId),
    fetchPeriodRows(
      dataClient,
      "landing_page_tracking_events",
      "event_name,session_id,sck,landing_key,utm_source,utm_medium,utm_campaign,utm_content,source_type,occurred_at",
      tenantId,
      "occurred_at",
      period,
      (query) => query.eq("source_type", "REAL"),
    ),
    fetchPeriodRows(
      dataClient,
      "comercial_vendas",
      "transaction_id,source_sck,status_normalizado,sale_confirmed,revenue_eligible,moeda,valor_bruto,data_compra",
      tenantId,
      "data_compra",
      period,
    ),
    fetchPeriodRows(
      dataClient,
      "hotmart_attribution_bridge_v",
      "sale_id,sale_confirmed,data_compra,valor_bruto,hotmart_source_sck,norwyn_source,norwyn_channel,norwyn_campaign,norwyn_entry,norwyn_confidence",
      tenantId,
      "data_compra",
      period,
    ),
    dataClient
      .from("norwyn_campaign_learnings")
      .select("id,campaign_id,learning_type,title,detail,evidence,confidence,status,updated_at")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(20),
    dataClient
      .from("campaigns")
      .select("id,name,plan_json,growth_config")
      .eq("tenant_id", tenantId),
  ]);

  const resolvedCampaign = (campaignsResult.data ?? []).map((campaign) => {
    const plan = object(campaign.plan_json);
    const foundation = object(plan.traffic_data_foundation);
    const legacyId = typeof foundation.meta_campaign_id === "string" ? foundation.meta_campaign_id : null;
    const ids = new Set([...textArray(foundation.meta_campaign_ids), ...(legacyId ? [legacyId] : [])]);
    const activeId = typeof foundation.active_meta_campaign_id === "string" ? foundation.active_meta_campaign_id : null;
    const matched = activeId && metaCampaignIds.includes(activeId) ? activeId : metaCampaignIds.find((id) => ids.has(id)) ?? null;
    return { campaign, foundation, matched };
  }).find((item) => item.matched) ?? null;
  const landingKey = resolvedCampaign && typeof resolvedCampaign.foundation.landing_key === "string" ? resolvedCampaign.foundation.landing_key : null;
  const activeMetaId = resolvedCampaign?.matched ?? null;
  const campaignSnapshot = snapshotsResult.rows.find((snapshot) => snapshot.entity_type === "campaign" && snapshot.entity_id === activeMetaId);
  const campaignConfig = object(campaignSnapshot?.config_json);
  const start = typeof campaignConfig.start_time === "string" ? campaignConfig.start_time : null;
  const end = typeof campaignConfig.stop_time === "string" ? campaignConfig.stop_time : null;
  const campaignStartMs = start ? new Date(start).getTime() : Number.NaN;

  const trackingAvailable = !trackingResult.error;
  const salesAvailable = !salesResult.error;
  const tracking = resolvedCampaign && landingKey
    ? trackingResult.rows.filter((row) => {
      const matchesCampaign = row.landing_key === landingKey || row.utm_campaign === landingKey;
      const eventMs = new Date(String(row.occurred_at ?? "")).getTime();
      return matchesCampaign && (Number.isNaN(campaignStartMs) || eventMs >= campaignStartMs);
    })
    : [];
  const sales = salesResult.rows;
  const realSessions = new Set(tracking.map((row) => row.session_id).filter(Boolean));
  const sessionsFor = (eventName: string) => new Set(tracking.filter((row) => row.event_name === eventName).map((row) => row.session_id).filter(Boolean)).size;
  const attributedSessions = new Set(tracking.filter((row) => row.sck).map((row) => row.session_id).filter(Boolean));
  const paidSocialSessions = new Set(tracking.filter((row) => {
    const source = String(row.utm_source ?? "").toLowerCase();
    const medium = String(row.utm_medium ?? "").toLowerCase();
    return source.includes("meta_ads") || source.includes("facebook_ads") || medium.includes("paid") || medium === "cpc";
  }).map((row) => row.session_id).filter(Boolean));
  const bridgeAvailable = !bridgeResult.error;
  const scopedBridge = bridgeAvailable && landingKey ? bridgeResult.rows.filter((row) => {
    const saleMs = new Date(String(row.data_compra ?? "")).getTime();
    return row.norwyn_campaign === landingKey && (Number.isNaN(campaignStartMs) || saleMs >= campaignStartMs);
  }) : [];
  const confirmed = scopedBridge.filter((row) => row.sale_confirmed === true);
  const attributed = confirmed.filter((row) => row.hotmart_source_sck && row.norwyn_confidence);
  const revenue = confirmed.reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);
  const attributionStatus: AdsReconciliationSummary["hotmart"]["attributionStatus"] = !salesAvailable
    ? "unavailable"
    : attributed.length && attributed.length === confirmed.length
      ? "confirmed"
      : attributed.length
        ? "partial"
        : confirmed.length
          ? "unattributed"
          : "meta_only";

  const today = new Date(`${period.end}T12:00:00-03:00`);
  const startsAt = start ? new Date(start) : null;
  const endsAt = end ? new Date(end) : null;
  const daysElapsed = startsAt && !Number.isNaN(startsAt.getTime()) ? Math.max(0, Math.floor((today.getTime() - startsAt.getTime()) / 86400000) + 1) : null;
  const daysRemaining = endsAt && !Number.isNaN(endsAt.getTime()) ? Math.max(0, Math.ceil((endsAt.getTime() - today.getTime()) / 86400000)) : null;
  const dailyBudget = numeric(campaignConfig.daily_budget, null);
  const budget = dailyBudget != null && startsAt && endsAt ? (dailyBudget / 100) * Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / 86400000)) : null;
  const trackingCoverage = trackingAvailable && realSessions.size > 0 ? paidSocialSessions.size / realSessions.size : null;
  const measurementReasons: string[] = [];
  if (!resolvedCampaign) measurementReasons.push("Campaign registry sem ID Meta exato.");
  if (!attributed.length) measurementReasons.push("Nenhuma venda Hotmart atribuída no recorte.");
  measurementReasons.push("UTMs não carregam ad_id; venda por anúncio permanece indeterminada.");
  const measurementQuality: AdsReconciliationSummary["measurement"]["quality"] = !resolvedCampaign ? "Fraca" : attributed.length ? "Parcial" : "Fraca";
  const engine = object(object(resolvedCampaign?.campaign.growth_config).traffic_decision_engine);
  const decisionConfig: AdsDecisionConfig = {
    minLinkClicksSignal: numeric(engine.min_link_clicks_signal, DEFAULT_DECISION_CONFIG.minLinkClicksSignal)!,
    minLinkClicksDecision: numeric(engine.min_link_clicks_decision, DEFAULT_DECISION_CONFIG.minLinkClicksDecision)!,
    reviewLinkClicksIncrement: numeric(engine.review_link_clicks_increment, DEFAULT_DECISION_CONFIG.reviewLinkClicksIncrement)!,
    reviewHours: numeric(engine.review_hours, DEFAULT_DECISION_CONFIG.reviewHours)!,
    minTrendDays: numeric(engine.min_trend_days, DEFAULT_DECISION_CONFIG.minTrendDays)!,
    comparableSpendRatio: numeric(engine.comparable_spend_ratio, DEFAULT_DECISION_CONFIG.comparableSpendRatio)!,
    meaningfulSpend: numeric(engine.meaningful_spend, null),
    targetCpa: numeric(engine.target_cpa, null),
  };

  return {
    configSnapshots: snapshotsResult.error ? [] : snapshotsResult.rows,
    decisionMemory: learningsResult.error || campaignsResult.error ? [] : (learningsResult.data ?? []).flatMap((row) => {
      const campaign = (campaignsResult.data ?? []).find((item) => item.id === row.campaign_id);
      const plan = object(campaign?.plan_json);
      const foundation = object(plan.traffic_data_foundation);
      const ids = textArray(foundation.meta_campaign_ids);
      const metaCampaignId = activeMetaId && ids.includes(activeMetaId) ? activeMetaId : typeof foundation.meta_campaign_id === "string" ? foundation.meta_campaign_id : null;
      if (!metaCampaignId || !metaCampaignIds.includes(metaCampaignId)) return [];
      const evidence = row.evidence && typeof row.evidence === "object" && !Array.isArray(row.evidence) ? row.evidence as Record<string, unknown> : {};
      return [{
        id: row.id,
        campaignId: row.campaign_id,
        metaCampaignId,
        detected: row.title,
        recommended: row.detail ?? "Recomendação ainda não detalhada.",
        actionTaken: typeof evidence.action_taken === "string" ? evidence.action_taken : null,
        result: typeof evidence.result === "string" ? evidence.result : null,
        evidence,
        confidence: row.confidence,
        updatedAt: row.updated_at,
      }];
    }),
    reconciliation: {
      campaignScope: {
        resolved: Boolean(resolvedCampaign),
        reason: resolvedCampaign
          ? "Campanha resolvida por Meta campaign_id exato. Tracking e Hotmart estão no escopo da Imersão Zumbido; vendas por anúncio seguem indisponíveis sem ad_id na atribuição."
          : "Nenhum campaign_id Meta do recorte existe no registry canônico. Totais Norwyn/Hotmart não são creditados à campanha.",
        campaignId: resolvedCampaign?.campaign.id ?? null,
        campaignName: resolvedCampaign?.campaign.name ?? null,
        metaCampaignId: activeMetaId,
        landingKey,
        resolution: resolvedCampaign ? "exact_meta_id" as const : "unresolved" as const,
      },
      site: {
        available: false,
        visitors: null,
        sessions: null,
        engagedSessions: null,
        averageSessionSeconds: null,
        source: "Site Kit / GA4",
        limitation: "Não existe uma fonte Site Kit/GA4 canônica conectada ao módulo Ads. Relatórios manuais não são copiados.",
      },
      norwyn: {
        sessions: trackingAvailable ? realSessions.size : null,
        offerViews: trackingAvailable ? sessionsFor("offer_view") : null,
        checkoutClicks: trackingAvailable ? sessionsFor("checkout_click") : null,
        attributedSessions: trackingAvailable ? attributedSessions.size : null,
        paidSocialSessions: trackingAvailable ? paidSocialSessions.size : null,
        source: "landing_page_tracking_events · REAL",
      },
      hotmart: {
        confirmedSales: salesAvailable ? confirmed.length : null,
        attributedSales: salesAvailable ? attributed.length : null,
        confirmedRevenue: salesAvailable ? revenue : null,
        unattributedSales: salesAvailable ? Math.max(0, confirmed.length - attributed.length) : null,
        attributionStatus,
        source: bridgeAvailable ? "comercial_vendas + hotmart_attribution_bridge_v" : "comercial_vendas · sale_confirmed",
        adAttributionAvailable: false,
      },
      measurement: { quality: measurementQuality, reasons: measurementReasons, trackingCoverage },
      note: "Meta usa janelas de atribuição; Norwyn mede navegação própria; Hotmart confirma transações. Os números não são equivalentes.",
    },
    decisionConfig,
    campaignProgress: { startsAt: start, endsAt: end, daysElapsed, daysRemaining, budget, spend, budgetUsedPct: budget ? (spend / budget) * 100 : null },
  };
}

export async function getAdsContext(searchParams?: SearchLike): Promise<AdsContext> {
  const period = resolveAdsPeriod(searchParams);
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) {
    redirect("/login");
  }

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const {
    membership,
    error: membershipError,
    source,
  } = localMembership
    ? { membership: localMembership, error: null, source: "local_bypass" }
    : await getMembershipByUserId(currentUser.id);

  if (membershipError) {
    return emptyContext({ diagnostic: `${source}: ${membershipError.message}` }, period);
  }

  if (!membership) {
    return emptyContext({ diagnostic: "Nenhum tenant ativo encontrado para este usuario." }, period);
  }

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role);
  const canReadAds = allowedModules.includes("ads") || allowedModules.includes("marketing") || allowedModules.includes("norwyn");

  if (!canReadAds) {
    return emptyContext({ role: membership.role, diagnostic: "Seu perfil nao possui acesso ao modulo Ads.", allowedModules }, period);
  }

  const { data: tenant } = await dataClient
    .from("tenants")
    .select("id, nome")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  const { rows, error } = await fetchAdsRows(dataClient, membership.tenant_id, period);

  if (error) {
    return emptyContext({
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      role: membership.role,
      diagnostic: error.message,
      allowedModules,
    }, period);
  }

  const metaCampaignIds = [...new Set(rows.map((row) => row.campaign_id).filter((value): value is string => Boolean(value)))];
  const intelligence = await fetchTrafficIntelligence(dataClient, membership.tenant_id, period, metaCampaignIds, rows.reduce((sum, row) => sum + row.valor_gasto, 0));

  return {
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    rows,
    updatedAt: rows.map((row) => row.imported_at).filter(Boolean).sort().at(-1) ?? null,
    role: membership.role,
    diagnostic: null,
    allowedModules,
    period,
    configSnapshots: intelligence.configSnapshots,
    reconciliation: intelligence.reconciliation,
    decisionMemory: intelligence.decisionMemory,
    decisionConfig: intelligence.decisionConfig,
    campaignProgress: intelligence.campaignProgress,
  };
}
