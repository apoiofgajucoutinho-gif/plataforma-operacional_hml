import "server-only";

import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PresenceAsset, PresenceCheck, PresenceContext, PresenceDiscoveredLink, PresenceIncident, PresenceStatus, PresenceSummary } from "@/modules/presence/types";

type SupabaseAny = any;

const DEFAULT_SITE = {
  name: "Site principal Juliana Coutinho",
  url: "https://fgajulianacoutinho.com.br/",
  asset_type: "main_site",
  environment: "prod_external",
  owner: "Juliana Coutinho",
  is_critical: true,
  monitoring_enabled: true,
  monitor_content: true,
  monitor_links: true,
  monitor_performance: true,
  expected_content: ["Juliana Coutinho"],
  forbidden_patterns: ["casino", "bet", "aposta", "slot", "crypto spam", "adult", "pharma spam"],
  thresholds: { response_warning_ms: 1500, response_critical_ms: 3000, timeout_ms: 15000 },
};
export const PRESENCE_AUTOMATION_TIMEZONE = "America/Sao_Paulo" as const;
export const PRESENCE_AUTOMATION_HOURS = [8, 14, 20] as const;

function saoPauloParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRESENCE_AUTOMATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function saoPauloWallTimeAsUtc(year: number, month: number, day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

export function nextPresenceAutomationRun(now = new Date()) {
  const local = saoPauloParts(now);
  const todayHours = PRESENCE_AUTOMATION_HOURS.filter((hour) => hour > local.hour || (hour === local.hour && local.minute === 0));
  if (todayHours.length) return saoPauloWallTimeAsUtc(local.year, local.month, local.day, todayHours[0]).toISOString();
  return saoPauloWallTimeAsUtc(local.year, local.month, local.day + 1, PRESENCE_AUTOMATION_HOURS[0]).toISOString();
}

export function isPresenceAutomationWindow(now = new Date()) {
  const local = saoPauloParts(now);
  return PRESENCE_AUTOMATION_HOURS.includes(local.hour as (typeof PRESENCE_AUTOMATION_HOURS)[number]) && local.minute < 20;
}

function checkOrigin(check: PresenceCheck) {
  const origin = check.result_json?.check_origin;
  return origin === "automatic" || origin === "manual" ? origin : "legacy";
}

function buildAutomationSummary(assets: PresenceAsset[], checks: PresenceCheck[]) {
  const realAssets = assets.filter((asset) => !isSimulatedAsset(asset) && asset.monitoring_enabled);
  const lastAutomaticRunAt = checks.find((check) => check.source_type === "REAL" && checkOrigin(check) === "automatic")?.checked_at ?? null;
  return {
    enabled: true,
    timezone: PRESENCE_AUTOMATION_TIMEZONE,
    scheduledHours: PRESENCE_AUTOMATION_HOURS.map((hour) => `${String(hour).padStart(2, "0")}:00`),
    lastAutomaticRunAt,
    nextAutomaticRunAt: nextPresenceAutomationRun(),
    functioningAssets: realAssets.filter((asset) => asset.last_status === "healthy").length,
    problemAssets: realAssets.filter((asset) => asset.last_status === "warning" || asset.last_status === "critical").length,
    notVerifiedAssets: realAssets.filter((asset) => !asset.last_checked_at || asset.last_status === "unknown").length,
  };
}

function emptySummary(): PresenceSummary {
  return {
    overallScore: null,
    overallStatus: "unknown",
    activeAssets: 0,
    landingPages: 0,
    criticalLinks: 0,
    openIncidents: 0,
    incidentsToday: 0,
    simulatedIncidents: 0,
    needsAttention: [],
    analysis: {
      observed: "Ainda nao ha checagens suficientes para consolidar a saude da presenca digital.",
      inference: "O modulo esta pronto para executar a primeira verificacao.",
      recommendation: "Executar uma checagem manual no ativo principal e revisar os sublinks descobertos.",
    },
  };
}

function statusFromScore(score: number | null): PresenceStatus {
  if (score == null) return "unknown";
  if (score >= 90) return "healthy";
  if (score >= 70) return "warning";
  return "critical";
}

function isSimulatedAsset(asset: PresenceAsset) {
  return asset.environment === "dev" || asset.url.startsWith("https://presence-simulated.invalid/") || asset.name.startsWith("QA Presence Center");
}

function isRealIncident(incident: PresenceIncident) {
  return (incident.source_type ?? "REAL") === "REAL";
}

function buildSummary(assets: PresenceAsset[], incidents: PresenceIncident[]): PresenceSummary {
  const realAssets = assets.filter((asset) => !isSimulatedAsset(asset));
  const realIncidents = incidents.filter(isRealIncident);
  const activeAssets = realAssets.filter((asset) => asset.monitoring_enabled).length;
  const scored = realAssets.filter((asset) => typeof asset.last_health_score === "number");
  const overallScore = scored.length ? Math.round(scored.reduce((sum, asset) => sum + Number(asset.last_health_score ?? 0), 0) / scored.length) : null;
  const openIncidents = realIncidents.filter((incident) => incident.status === "open" || incident.status === "acknowledged");
  const today = new Date().toISOString().slice(0, 10);
  const incidentsToday = realIncidents.filter((incident) => incident.detected_at?.startsWith(today)).length;
  const needsAttention = [...openIncidents].sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 3);
  const broken = openIncidents.filter((incident) => incident.incident_type === "broken_link").length;
  const critical = openIncidents.filter((incident) => incident.severity === "critical").length;

  let observed = "Nao ha incidentes criticos neste momento.";
  let inference = "A presenca digital monitorada esta sem sinais relevantes de risco operacional.";
  let recommendation = "Manter a rotina de checagem e aprovar apenas os sublinks realmente importantes.";

  if (critical > 0) {
    observed = `Ha ${critical} incidente(s) critico(s) aberto(s).`;
    inference = "Algum ponto monitorado pode impactar clientes, alunos ou conversao.";
    recommendation = "Priorizar os itens criticos antes de ampliar o inventario de ativos.";
  } else if (openIncidents.length > 0) {
    observed = `Ha ${openIncidents.length} incidente(s) aberto(s), incluindo ${broken} alerta(s) de link.`;
    inference = "A operacao segue acessivel, mas existem pontos que merecem revisao.";
    recommendation = "Resolver ou ignorar conscientemente os alertas de baixa prioridade.";
  }

  return {
    overallScore,
    overallStatus: statusFromScore(overallScore),
    activeAssets,
    landingPages: realAssets.filter((asset) => asset.asset_type === "landing_page").length,
    criticalLinks: realAssets.filter((asset) => asset.is_critical).length,
    openIncidents: openIncidents.length,
    incidentsToday,
    simulatedIncidents: incidents.filter((incident) => (incident.source_type ?? "REAL") === "SIMULATED").length,
    needsAttention,
    analysis: { observed, inference, recommendation },
  };
}

function severityRank(severity: string) {
  return severity === "critical" ? 4 : severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  const { data, error } = await supabase.from("tenant_members").select("tenant_id, role").eq("user_id", userId).eq("ativo", true).limit(1).maybeSingle();
  return { membership: data, error };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;
  const { data } = await dataClient.from("tenant_module_permissions").select("module").eq("tenant_id", tenantId).eq("role", role).eq("can_read", true);
  return (data ?? []).map((item: { module: string }) => item.module);
}

export async function ensureDefaultPresenceAsset(client: SupabaseAny, tenantId: string) {
  const { data: existing } = await client.from("digital_assets").select("id").eq("tenant_id", tenantId).eq("url", DEFAULT_SITE.url).limit(1).maybeSingle();
  if (existing?.id) return existing.id;
  const { data } = await client.from("digital_assets").insert({ tenant_id: tenantId, ...DEFAULT_SITE }).select("id").single();
  return data?.id ?? null;
}

export async function resolvePresenceApiAccess() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const localUser = getLocalBypassUser();
  const { data: auth } = localUser ? { data: { user: localUser } } : await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: "unauthorized" as const };

  const localMembership = localUser ? await getLocalBypassMembership(admin ?? supabase) : null;
  const membershipResult = localMembership ? { membership: localMembership, error: null } : await getMembershipByUserId(user.id);
  if (!membershipResult.membership?.tenant_id) return { error: "missing_membership" as const };

  const dataClient = admin ?? supabase;
  const tenantId = membershipResult.membership.tenant_id;
  const role = membershipResult.membership.role ?? "ESPECIALISTA";
  await ensureDefaultPresenceAsset(dataClient, tenantId);
  return { error: null, dataClient, user, tenantId, role, isAdmin: role === "ADMIN" };
}

export async function resolvePresenceCronAccess() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Service role indisponivel para execucao do monitoramento.");
  const { data: asset } = await admin.from("digital_assets").select("tenant_id").eq("url", DEFAULT_SITE.url).limit(1).maybeSingle();
  if (asset?.tenant_id) return { dataClient: admin, tenantId: asset.tenant_id };
  const { data: tenant } = await admin.from("tenants").select("id,nome").ilike("nome", "%Juliana%Coutinho%").limit(1).maybeSingle();
  if (!tenant?.id) throw new Error("Tenant Juliana Coutinho nao encontrado.");
  await ensureDefaultPresenceAsset(admin, tenant.id);
  return { dataClient: admin, tenantId: tenant.id };
}

export async function getPresenceContext(): Promise<PresenceContext> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const localUser = getLocalBypassUser();
  const { data: auth } = localUser ? { data: { user: localUser } } : await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const localMembership = localUser ? await getLocalBypassMembership(admin ?? supabase) : null;
  const membershipResult = localMembership ? { membership: localMembership, error: null } : await getMembershipByUserId(user.id);
  if (!membershipResult.membership?.tenant_id) redirect("/login");

  const dataClient = admin ?? supabase;
  const tenantId = membershipResult.membership.tenant_id;
  const role = membershipResult.membership.role ?? "ESPECIALISTA";
  await ensureDefaultPresenceAsset(dataClient, tenantId);

  const [{ data: tenant }, { data: assets, error: assetsError }, { data: checks }, { data: incidents }, { data: discoveredLinks }] = await Promise.all([
    dataClient.from("tenants").select("id,nome").eq("id", tenantId).maybeSingle(),
    dataClient.from("digital_assets").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: true }).limit(200),
    dataClient.from("presence_checks").select("*").eq("tenant_id", tenantId).order("checked_at", { ascending: false }).limit(300),
    dataClient.from("presence_incidents").select("*").eq("tenant_id", tenantId).order("detected_at", { ascending: false }).limit(200),
    dataClient.from("presence_discovered_links").select("*").eq("tenant_id", tenantId).order("discovered_at", { ascending: false }).limit(120),
  ]);

  const allowedModules = await getAllowedModules(tenantId, role, dataClient);
  const assetRows = (assets ?? []) as PresenceAsset[];
  const checkRows = (checks ?? []) as PresenceCheck[];
  const incidentRows = (incidents ?? []) as PresenceIncident[];

  return {
    role,
    tenant: tenant ?? null,
    user: { id: user.id, email: user.email ?? null, name: ((user as any).user_metadata?.name as string | undefined) ?? user.email ?? null },
    allowedModules,
    diagnostic: assetsError?.message ?? null,
    updatedAt: new Date().toISOString(),
    isAdmin: role === "ADMIN",
    assets: assetRows,
    checks: checkRows,
    incidents: incidentRows,
    discoveredLinks: (discoveredLinks ?? []) as PresenceDiscoveredLink[],
    summary: assetRows.length || incidentRows.length ? buildSummary(assetRows, incidentRows) : emptySummary(),
    automation: buildAutomationSummary(assetRows, checkRows),
  };
}

export async function duePresenceAssets(client: SupabaseAny, tenantId: string, limit = 120) {
  const { data } = await client
    .from("digital_assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("monitoring_enabled", true)
    .order("is_critical", { ascending: false })
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  return ((data ?? []) as PresenceAsset[]).filter((asset) => !isSimulatedAsset(asset));
}
