import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";
import { buildIntradayDelta } from "@/modules/ads/analytics/intraday-delta";
import { metaFreshness, operationalAlerts, sourceFreshness, trackingHealth } from "@/modules/ads/services/traffic-operations";
import type { AdsConfigSnapshot, AdsContext, AdsDailyRow, AdsDecisionConfig, AdsGranularity, AdsOperations, AdsPeriodContext, AdsPeriodKey, AdsReconciliationSummary } from "@/modules/ads/types";

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
  const meta = metaFreshness(null);
  const emptyHealth = trackingHealth({ campaignRegistered: false, landingRegistered: false, pixelKnown: false, metaStatus: meta.status, sessions: 0, campaignIdSessions: 0, adsetIdSessions: 0, adIdSessions: 0, fbclidSessions: 0, sckSessions: 0, checkoutPreserved: false, hotmartSourceSck: 0, divergenceCount: 0 });
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
      measurement: { quality: "Fraca", reasons: ["Campanha não resolvida."], trackingCoverage: null, freshnessImpact: "Sem fontes suficientes para avaliar recência." },
      note: "Fontes independentes; os valores não formam necessariamente uma sequência monotônica.",
    },
    decisionMemory: [],
    decisionConfig: DEFAULT_DECISION_CONFIG,
    campaignProgress: { startsAt: null, endsAt: null, daysElapsed: null, daysRemaining: null, budget: null, spend: 0, budgetUsedPct: null, periodUsedPct: null, averageDailySpend: null, expectedDailySpend: null, projectedSpend: null, pacingState: "orçamento desconhecido", sourceUpdatedAt: null },
    operations: {
      freshness: [meta, sourceFreshness("hotmart", "Hotmart", null), sourceFreshness("norwyn", "Norwyn Tracking", null), sourceFreshness("ga4", "Analytics / GA4", null)],
      trackingHealth: emptyHealth,
      alerts: [],
      journey: [],
      registry: { campaignResolved: false, metaCampaignId: null, campaignName: null, landingKey: null, productId: null, offerId: null, checkoutUrl: null, pixelId: null, version: null },
      destination: { metaUrl: null, metaDomain: null, canonicalUrl: null, canonicalDomain: null, diverges: false },
      journeyHealth: { status: "Aguardando dados", operational: "Aguardando dados", measurement: "Fraca", reasons: ["Sem fontes suficientes para avaliar a jornada."], lastCheckedAt: null },
      coverage: { sessions: 0, campaignIdSessions: 0, adsetIdSessions: 0, adIdSessions: 0, fbclidSessions: 0, sckSessions: 0, bridgeKeys: 0, bridgeKeysWithAd: 0, hotmartWithSourceSck: 0 },
      intradayDelta: { available: false, since: null, spend: null, linkClicks: null, checkouts: null, metaPurchases: null, confirmedSales: null, reason: "Aguardando histórico métrico entre coletas.", collectedAt: null, perAd: [] },
    },
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

function latestIso(rows: Array<Record<string, any>>, fields: string[]) {
  const values = rows.flatMap((row) => fields.map((field) => row[field])).filter((value): value is string => typeof value === "string" && !Number.isNaN(new Date(value).getTime()));
  return values.sort((left, right) => new Date(left).getTime() - new Date(right).getTime()).at(-1) ?? null;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

function domainOf(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

async function fetchTrafficIntelligence(dataClient: AdsDataClient, tenantId: string, period: AdsPeriodContext, metaCampaignIds: string[], adsRows: AdsDailyRow[]) {
  const [snapshotsResult, trackingResult, salesResult, bridgeResult, trackingKeysResult, learningsResult, campaignsResult, registryResult] = await Promise.all([
    fetchConfigSnapshots(dataClient, tenantId),
    fetchPeriodRows(
      dataClient,
      "landing_page_tracking_events",
      "event_name,session_id,visitor_id,sck,landing_key,utm_source,utm_medium,utm_campaign,utm_content,source_type,occurred_at,meta_campaign_id,meta_adset_id,meta_ad_id,fbclid,payload",
      tenantId,
      "occurred_at",
      period,
      (query) => query.eq("source_type", "REAL"),
    ),
    fetchPeriodRows(
      dataClient,
      "comercial_vendas",
      "transaction_id,source_sck,status_normalizado,sale_confirmed,revenue_eligible,moeda,valor_bruto,data_compra,imported_at,updated_at,last_event_at",
      tenantId,
      "data_compra",
      period,
    ),
    fetchPeriodRows(
      dataClient,
      "growth_tracking_keys",
      "campaign_id,campaign_platform_id,adset_id,ad_id,fbclid,source_sck,utm_source,utm_medium,utm_campaign,utm_content,checkout_url,tracking_confidence,created_at,updated_at,metadata",
      tenantId,
      "created_at",
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
    dataClient
      .from("norwyn_landing_registry")
      .select("landing_key,landing_name,landing_version,url,product_id,hotmart_product_id,metadata,status,updated_at")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
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
  const adsetSnapshot = snapshotsResult.rows.find((snapshot) => snapshot.entity_type === "adset" && (!activeMetaId || object(snapshot.parent_ids).campaign_id === activeMetaId));
  const promotedObject = object(object(adsetSnapshot?.config_json).promoted_object);
  const pixelId = typeof promotedObject.pixel_id === "string" ? promotedObject.pixel_id : null;
  const registry = (registryResult.data ?? []).find((row) => row.landing_key === landingKey) ?? null;
  const registryMetadata = object(registry?.metadata);
  const offerId = typeof registryMetadata.checkout_offer_id === "string" ? registryMetadata.checkout_offer_id : null;
  const checkoutUrl = registry?.hotmart_product_id ? `https://pay.hotmart.com/${registry.hotmart_product_id}${offerId ? `?off=${offerId}` : ""}` : null;
  const start = typeof campaignConfig.start_time === "string" ? campaignConfig.start_time : null;
  const end = typeof campaignConfig.stop_time === "string" ? campaignConfig.stop_time : null;
  const campaignStartMs = start ? new Date(start).getTime() : Number.NaN;
  let intradayQuery: any = dataClient
    .from("instagram_ads_intraday_snapshots")
    .select("collected_at,data_referencia,row_key,campaign_id,adset_id,ad_id,anuncio,valor_gasto,impressoes,cliques,link_clicks,outbound_clicks,landing_page_views,initiate_checkouts,meta_purchases")
    .eq("tenant_id", tenantId)
    .eq("data_referencia", period.end)
    .order("collected_at", { ascending: false });
  if (activeMetaId) intradayQuery = intradayQuery.eq("campaign_id", activeMetaId);
  const intradayResult = await intradayQuery.limit(500);

  const assetsResult = landingKey
    ? await dataClient.from("digital_assets").select("id,metadata,url").eq("tenant_id", tenantId).contains("metadata", { landing_key: landingKey })
    : { data: [], error: null };
  const assetIds = (assetsResult.data ?? []).map((asset: any) => asset.id);
  const checksResult = assetIds.length
    ? await dataClient.from("presence_checks").select("asset_id,status,checked_at,http_status,error_message").eq("tenant_id", tenantId).in("asset_id", assetIds).order("checked_at", { ascending: false }).limit(100)
    : { data: [], error: null };

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
  const trackingKeys = trackingKeysResult.error ? [] : trackingKeysResult.rows.filter((row) => {
    const metadata = object(row.metadata);
    const matchesLanding = !landingKey || row.utm_campaign === landingKey || metadata.landing_key === landingKey;
    return matchesLanding && metadata.traffic_type !== "test";
  });
  const realSessions = new Set(tracking.map((row) => row.session_id).filter(Boolean));
  const sessionsFor = (eventName: string) => new Set(tracking.filter((row) => row.event_name === eventName).map((row) => row.session_id).filter(Boolean)).size;
  const sessionsWith = (field: string) => new Set(tracking.filter((row) => row[field]).map((row) => row.session_id).filter(Boolean)).size;
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
  const trackingKeyBySck = new Map(trackingKeys.filter((row) => row.source_sck).map((row) => [row.source_sck, row]));
  const adAttributedSales = confirmed.filter((row) => row.hotmart_source_sck && trackingKeyBySck.get(row.hotmart_source_sck)?.ad_id);
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
  const spend = adsRows.reduce((sum, row) => sum + row.valor_gasto, 0);
  const metaLastUpdatedAt = latestIso(adsRows as Array<Record<string, any>>, ["imported_at", "updated_at"]);
  const hotmartLastUpdatedAt = latestIso(sales as Array<Record<string, any>>, ["imported_at", "updated_at", "last_event_at"]);
  const norwynLastEventAt = latestIso(tracking as Array<Record<string, any>>, ["occurred_at"]);
  const freshness = [
    metaFreshness(metaLastUpdatedAt),
    sourceFreshness("hotmart", "Hotmart", hotmartLastUpdatedAt),
    sourceFreshness("norwyn", "Norwyn Tracking", norwynLastEventAt),
    sourceFreshness("ga4", "Analytics / GA4", null),
  ];
  const metaSource = freshness[0];
  const campaignIdSessions = sessionsWith("meta_campaign_id");
  const adsetIdSessions = sessionsWith("meta_adset_id");
  const adIdSessions = sessionsWith("meta_ad_id");
  const fbclidSessions = sessionsWith("fbclid");
  const sckSessions = sessionsWith("sck");
  const checkoutPreserved = trackingKeys.some((row) => typeof row.checkout_url === "string" && row.checkout_url.includes("off=lov69pen") && row.checkout_url.includes("sck="));
  const hotmartWithSourceSck = confirmed.filter((row) => row.hotmart_source_sck).length;
  const totalLinkClicks = adsRows.reduce((sum, row) => sum + Number(row.link_clicks ?? 0), 0);
  const totalLpv = adsRows.reduce((sum, row) => sum + Number(row.landing_page_views ?? 0), 0);
  const totalMetaCheckouts = adsRows.reduce((sum, row) => sum + Number(row.initiate_checkouts ?? 0), 0);
  const totalMetaPurchases = adsRows.reduce((sum, row) => sum + Number(row.meta_purchases ?? 0), 0);
  const divergenceCount = Number(totalMetaPurchases > 0 && confirmed.length === 0) + Number(confirmed.length > attributed.length) + Number(totalLinkClicks >= 10 && totalLpv < totalLinkClicks * 0.25);
  const health = trackingHealth({
    campaignRegistered: Boolean(resolvedCampaign), landingRegistered: Boolean(registry), pixelKnown: Boolean(pixelId), metaStatus: metaSource.status,
    sessions: realSessions.size, campaignIdSessions, adsetIdSessions, adIdSessions, fbclidSessions, sckSessions, checkoutPreserved,
    hotmartSourceSck: hotmartWithSourceSck, divergenceCount,
  });
  const trackingCoverage = trackingAvailable && realSessions.size > 0 ? paidSocialSessions.size / realSessions.size : null;
  const measurementReasons: string[] = [];
  if (!resolvedCampaign) measurementReasons.push("Campaign registry sem ID Meta exato.");
  if (!attributed.length) measurementReasons.push("Nenhuma venda Hotmart atribuída no recorte.");
  if (!adIdSessions) measurementReasons.push("Sessões reais ainda não carregam ad_id; venda por anúncio permanece indeterminada.");
  if (["Atrasado", "Sem coleta recente"].includes(metaSource.status)) measurementReasons.push(`Meta Ads: ${metaSource.status.toLowerCase()}.`);
  const measurementQuality: AdsReconciliationSummary["measurement"]["quality"] = health.quality;
  const freshnessImpact = metaSource.status === "Atualizado" || metaSource.status === "Aguardando próxima coleta"
    ? freshness[1].status === "Atualizado" ? null : "Meta Ads está dentro da janela, mas Hotmart ainda pode não refletir a mesma janela."
    : "A confiança foi reduzida porque a Meta Ads está fora do schedule esperado.";
  const periodUsedPct = startsAt && endsAt && endsAt > startsAt ? Math.min(100, Math.max(0, ((today.getTime() - startsAt.getTime()) / (endsAt.getTime() - startsAt.getTime())) * 100)) : null;
  const averageDailySpend = daysElapsed && daysElapsed > 0 ? spend / daysElapsed : null;
  const totalCampaignDays = startsAt && endsAt ? Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / 86400000)) : null;
  const expectedDailySpend = budget != null && totalCampaignDays ? budget / totalCampaignDays : null;
  const projectedSpend = averageDailySpend != null && totalCampaignDays ? averageDailySpend * totalCampaignDays : null;
  const budgetUsedPct = budget ? (spend / budget) * 100 : null;
  const pacingState = budgetUsedPct == null || periodUsedPct == null
    ? "orçamento desconhecido" as const
    : budgetUsedPct > periodUsedPct + 10 ? "acima do ritmo" as const
      : budgetUsedPct < periodUsedPct - 10 ? "abaixo do ritmo" as const
        : "dentro do ritmo" as const;
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
  const journeyCounts = [
    { key: "session", label: "Sessão", sessions: realSessions.size, source: "Norwyn" as const },
    { key: "page_view", label: "Página vista", sessions: sessionsFor("page_view"), source: "Norwyn" as const },
    { key: "offer_view", label: "Oferta vista", sessions: sessionsFor("offer_view"), source: "Norwyn" as const },
    { key: "cta_click", label: "CTA clicado", sessions: sessionsFor("cta_click"), source: "Norwyn" as const },
    { key: "checkout_click", label: "Checkout", sessions: sessionsFor("checkout_click"), source: "Norwyn" as const },
    { key: "hotmart_confirmed", label: "Venda confirmada", sessions: confirmed.length, source: "Hotmart" as const },
  ];
  const journey = journeyCounts.map((stage, index) => ({
    ...stage,
    rateFromPrevious: index === 0 ? null : ratio(stage.sessions, journeyCounts[index - 1].sessions),
  }));
  const activeCampaign = [campaignConfig.status, campaignConfig.effective_status].some((value) => String(value ?? "").toUpperCase() === "ACTIVE");
  const alerts = operationalAlerts({
    meta: metaSource,
    health,
    activeCampaign,
    spend,
    linkClicks: totalLinkClicks,
    lpv: totalLpv,
    checkoutClicks: sessionsFor("checkout_click"),
    metaPurchases: totalMetaPurchases,
    hotmartSales: confirmed.length,
    attributedSales: attributed.length,
    sessions: realSessions.size,
    adIdSessions,
    sourceSckSessions: sckSessions,
  });
  const metaDestinationUrl = adsRows.find((row) => row.destination_url)?.destination_url ?? null;
  const metaDestinationDomain = adsRows.find((row) => row.destination_domain)?.destination_domain ?? domainOf(metaDestinationUrl);
  const canonicalUrl = typeof registry?.url === "string" ? registry.url : null;
  const canonicalDomain = domainOf(canonicalUrl);
  const destinationDiverges = Boolean(metaDestinationDomain && canonicalDomain && metaDestinationDomain !== canonicalDomain);
  if (destinationDiverges) alerts.push({
    id: "meta-destination-divergence", severity: "Atenção", title: "Destino Meta diverge da LP registrada",
    detail: `A Meta reporta ${metaDestinationDomain}; a LP canônica da campanha é ${canonicalDomain}. Nenhuma URL foi alterada.`,
    review: "Revisar antes de qualquer decisão sobre pós-clique ou mudança de anúncio.",
  });

  const latestCheckByAsset = new Map<string, any>();
  for (const check of checksResult.data ?? []) if (!latestCheckByAsset.has(String(check.asset_id))) latestCheckByAsset.set(String(check.asset_id), check);
  const componentCheck = (component: string) => {
    const asset = (assetsResult.data ?? []).find((item: any) => item.metadata?.component === component);
    return asset ? latestCheckByAsset.get(String(asset.id)) ?? null : null;
  };
  const pageCheck = componentCheck("page");
  const checkoutCheck = componentCheck("checkout");
  const healthState = (check: any) => check?.status === "healthy" ? "Saudável" : check?.status === "critical" ? "Crítico" : check?.status === "warning" ? "Atenção" : "Aguardando dados";
  const operationalStates = [healthState(pageCheck), healthState(checkoutCheck)];
  const operational = operationalStates.includes("Crítico") ? "Crítico" as const
    : operationalStates.includes("Atenção") ? "Atenção" as const
      : operationalStates.every((item) => item === "Saudável") ? "Saudável" as const : "Aguardando dados" as const;
  const journeyReasons: string[] = [];
  if (operational !== "Saudável") journeyReasons.push(`Saúde operacional: ${operational.toLowerCase()}.`);
  if (health.quality !== "Boa") journeyReasons.push(`Saúde da mensuração: ${health.quality.toLowerCase()}.`);
  if (!norwynLastEventAt) journeyReasons.push("Sem evento Norwyn recente no recorte.");
  if (!hotmartLastUpdatedAt) journeyReasons.push("Sem atualização Hotmart identificada no recorte.");
  const journeyStatus = operational === "Crítico" ? "Crítico" as const
    : operational === "Atenção" || operational === "Aguardando dados" || health.quality !== "Boa" ? "Atenção" as const : "Saudável" as const;
  if (healthState(pageCheck) === "Crítico") alerts.push({
    id: "landing-page-unavailable", severity: "Crítico", title: "Landing Page indisponível",
    detail: "O último check operacional da página falhou. Isso limita qualquer leitura de desempenho pós-clique.",
    review: "Revisar após uma nova verificação saudável da página.",
  });
  if (healthState(checkoutCheck) === "Crítico") alerts.push({
    id: "checkout-unavailable", severity: "Crítico", title: "Checkout indisponível",
    detail: "O último check operacional do checkout falhou. Não interpretar queda comercial como problema de anúncio enquanto persistir.",
    review: "Revisar após uma nova verificação saudável do checkout.",
  });
  const intraday = intradayResult.error ? {
    available: false, since: null, spend: null, linkClicks: null, checkouts: null, metaPurchases: null, confirmedSales: null,
    reason: "Histórico intradiário ainda não está disponível neste ambiente.", collectedAt: null, perAd: [],
  } : buildIntradayDelta(intradayResult.data ?? []);
  if (activeCampaign && !intradayResult.error && !(intradayResult.data ?? []).length) alerts.push({
    id: "intraday-snapshot-missing", severity: "Atenção", title: "Snapshot intradiário ainda não registrado",
    detail: "A campanha está ativa, mas não há snapshot para a data selecionada.", review: "Revisar após a próxima janela da V9.",
  });
  const operations: AdsOperations = {
    freshness,
    trackingHealth: health,
    alerts,
    journey,
    registry: {
      campaignResolved: Boolean(resolvedCampaign),
      metaCampaignId: activeMetaId,
      campaignName: resolvedCampaign?.campaign.name ?? null,
      landingKey,
      productId: registry?.product_id ?? null,
      offerId,
      checkoutUrl,
      pixelId,
      version: registry?.landing_version ?? null,
    },
    destination: { metaUrl: metaDestinationUrl, metaDomain: metaDestinationDomain, canonicalUrl, canonicalDomain, diverges: destinationDiverges },
    journeyHealth: {
      status: journeyStatus,
      operational,
      measurement: health.quality,
      reasons: journeyReasons.length ? journeyReasons : ["LP, checkout e mensuração estão dentro dos critérios operacionais disponíveis."],
      lastCheckedAt: latestIso((checksResult.data ?? []) as Array<Record<string, any>>, ["checked_at"]),
    },
    coverage: {
      sessions: realSessions.size,
      campaignIdSessions,
      adsetIdSessions,
      adIdSessions,
      fbclidSessions,
      sckSessions,
      bridgeKeys: trackingKeys.length,
      bridgeKeysWithAd: trackingKeys.filter((row) => row.ad_id).length,
      hotmartWithSourceSck,
    },
    intradayDelta: intraday,
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
          ? adAttributedSales.length
            ? "Campanha resolvida por Meta campaign_id exato, com venda Hotmart ligada a anúncio por source_sck."
            : "Campanha resolvida por Meta campaign_id exato. Tracking e Hotmart estão no escopo da Imersão Zumbido; venda por anúncio depende de source_sck com ad_id."
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
        adAttributionAvailable: adAttributedSales.length > 0,
      },
      measurement: { quality: measurementQuality, reasons: measurementReasons, trackingCoverage, freshnessImpact },
      note: "Meta usa janelas de atribuição; Norwyn mede navegação própria; Hotmart confirma transações. Os números não são equivalentes.",
    },
    decisionConfig,
    campaignProgress: { startsAt: start, endsAt: end, daysElapsed, daysRemaining, budget, spend, budgetUsedPct, periodUsedPct, averageDailySpend, expectedDailySpend, projectedSpend, pacingState, sourceUpdatedAt: metaLastUpdatedAt },
    operations,
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
  const intelligence = await fetchTrafficIntelligence(dataClient, membership.tenant_id, period, metaCampaignIds, rows);

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
    operations: intelligence.operations,
  };
}
