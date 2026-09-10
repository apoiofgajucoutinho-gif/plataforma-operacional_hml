import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";
import type { AdsContext, AdsDailyRow, AdsGranularity, AdsPeriodContext, AdsPeriodKey } from "@/modules/ads/types";

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

  return {
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    rows,
    updatedAt: rows.map((row) => row.imported_at).filter(Boolean).sort().at(-1) ?? null,
    role: membership.role,
    diagnostic: null,
    allowedModules,
    period,
  };
}