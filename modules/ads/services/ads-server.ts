import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";
import type { AdsConfigSnapshot, AdsContext, AdsDailyRow, AdsGranularity, AdsPeriodContext, AdsPeriodKey } from "@/modules/ads/types";

type SearchLike = Record<string, string | string[] | undefined>;

type AdsDataClient = Awaited<ReturnType<typeof createClient>>;

const PAGE_SIZE = 1000;
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
      norwyn: { sessions: null, offerViews: null, checkoutClicks: null, attributedSessions: null, source: "landing_page_tracking_events" },
      hotmart: { confirmedSales: null, attributedSales: null, confirmedRevenue: null, source: "comercial_vendas" },
      note: "Fontes independentes; os valores não formam necessariamente uma sequência monotônica.",
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

async function fetchTrafficIntelligence(dataClient: AdsDataClient, tenantId: string, period: AdsPeriodContext) {
  const [snapshotsResult, trackingResult, salesResult] = await Promise.all([
    fetchConfigSnapshots(dataClient, tenantId),
    fetchPeriodRows(
      dataClient,
      "landing_page_tracking_events",
      "event_name,session_id,sck,landing_key,source_type,occurred_at",
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
  ]);

  const trackingAvailable = !trackingResult.error;
  const salesAvailable = !salesResult.error;
  const tracking = trackingResult.rows;
  const sales = salesResult.rows;
  const realSessions = new Set(tracking.map((row) => row.session_id).filter(Boolean));
  const sessionsFor = (eventName: string) => new Set(tracking.filter((row) => row.event_name === eventName).map((row) => row.session_id).filter(Boolean)).size;
  const attributedSessions = new Set(tracking.filter((row) => row.sck).map((row) => row.session_id).filter(Boolean));
  const confirmed = sales.filter((row) => row.sale_confirmed === true || ["APPROVED", "COMPLETED"].includes(String(row.status_normalizado ?? "").toUpperCase()));
  const attributed = confirmed.filter((row) => String(row.source_sck ?? "").startsWith("nw_"));
  const revenue = confirmed
    .filter((row) => row.revenue_eligible !== false && String(row.moeda ?? "BRL").toUpperCase() === "BRL")
    .reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0);

  return {
    configSnapshots: snapshotsResult.error ? [] : snapshotsResult.rows,
    reconciliation: {
      norwyn: {
        sessions: trackingAvailable ? realSessions.size : null,
        offerViews: trackingAvailable ? sessionsFor("offer_view") : null,
        checkoutClicks: trackingAvailable ? sessionsFor("checkout_click") : null,
        attributedSessions: trackingAvailable ? attributedSessions.size : null,
        source: "landing_page_tracking_events · REAL",
      },
      hotmart: {
        confirmedSales: salesAvailable ? confirmed.length : null,
        attributedSales: salesAvailable ? attributed.length : null,
        confirmedRevenue: salesAvailable ? revenue : null,
        source: "comercial_vendas · sale_confirmed",
      },
      note: "Meta usa janelas de atribuição; Norwyn mede navegação própria; Hotmart confirma transações. Os números não são equivalentes.",
    },
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

  const [{ rows, error }, intelligence] = await Promise.all([
    fetchAdsRows(dataClient, membership.tenant_id, period),
    fetchTrafficIntelligence(dataClient, membership.tenant_id, period),
  ]);

  if (error) {
    return emptyContext({
      tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
      role: membership.role,
      diagnostic: error.message,
      allowedModules,
    }, period);
  }

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
  };
}
