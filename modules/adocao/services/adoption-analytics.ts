import { allModules } from "@/lib/auth/modules";
import { unstable_cache } from "next/cache";
import type { AdoptionAnalytics, AdoptionPeriodKey, AdoptionPerson, AdoptionRanking, AdoptionRawEvent, AdoptionSnapshot, AdoptionTimelineItem } from "@/modules/adocao/types";

type DataClient = any;
type DirectoryEntry = { userId: string; name: string; email: string | null; role: string | null };

export const adoptionModuleLabels: Record<string, string> = {
  norwyn: "Início",
  agenda: "Agenda",
  missoes: "Missões",
  marketing: "Marketing",
  instagram: "Instagram",
  ads: "Ads",
  comercial: "Comercial",
  catalogo: "Catálogo",
  "produtos-alunos": "Produtos & Alunos",
  alunos: "Aluno 360",
  resultados: "Resultados",
  financeiro: "Financeiro",
  automacoes: "Automações",
  presence: "Presença",
  validacao: "Validação",
  atividades: "Atividades",
  ocorrencias: "Suporte",
  relatorios: "Relatórios",
  "landing-pages": "Landing Pages",
  adocao: "Adoção",
  admin: "Admin",
};

const periodDays: Record<AdoptionPeriodKey, number> = { today: 1, "7d": 7, "15d": 15, "30d": 30, "90d": 90 };
const periodLabels: Record<AdoptionPeriodKey, string> = { today: "Hoje", "7d": "Últimos 7 dias", "15d": "Últimos 15 dias", "30d": "Últimos 30 dias", "90d": "Últimos 90 dias" };
const timeZone = "America/Sao_Paulo";
const analyticsCache = new Map<string, { expiresAt: number; promise: Promise<AdoptionAnalytics> }>();

function localDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function pageLabel(event: AdoptionRawEvent) {
  const label = event.metadata?.page_label;
  if (typeof label === "string" && label.trim() && !label.startsWith("/")) return label;
  return adoptionModuleLabels[event.module] ?? event.page_path;
}

function numberMetadata(event: AdoptionRawEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function quantile(values: number[], percentile: number) {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentile * sorted.length) - 1))]);
}

function dedupeEvents(events: AdoptionRawEvent[]) {
  const unique = new Map<string, AdoptionRawEvent>();
  for (const event of events) {
    const second = event.created_at.slice(0, 19);
    const key = [event.user_id, event.module, event.page_path, event.event_name, pageLabel(event), second].join("|");
    if (!unique.has(key)) unique.set(key, event);
  }
  return [...unique.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function sessionKeys(events: AdoptionRawEvent[]) {
  const keys = new Set<string>();
  const byUser = new Map<string, AdoptionRawEvent[]>();
  for (const event of events) {
    const userId = event.user_id ?? "unknown";
    byUser.set(userId, [...(byUser.get(userId) ?? []), event]);
  }
  for (const [userId, rows] of byUser) {
    let legacyIndex = 0;
    let previous = 0;
    for (const event of rows.toSorted((a, b) => a.created_at.localeCompare(b.created_at))) {
      const sessionId = event.metadata?.session_id;
      if (typeof sessionId === "string" && sessionId) {
        keys.add(`${userId}:${sessionId}`);
        previous = new Date(event.created_at).getTime();
        continue;
      }
      const current = new Date(event.created_at).getTime();
      if (!previous || current - previous > 30 * 60 * 1000) legacyIndex += 1;
      keys.add(`${userId}:legacy:${legacyIndex}`);
      previous = current;
    }
  }
  return keys;
}

function ranking(events: AdoptionRawEvent[], kind: "module" | "page"): AdoptionRanking[] {
  const map = new Map<string, { label: string; views: number; users: Set<string>; lastUsedAt: string }>();
  const pageViews = events.filter((event) => event.event_name === "page_view");
  for (const event of pageViews) {
    const key = kind === "module" ? event.module : `${event.module}:${pageLabel(event)}`;
    const row = map.get(key) ?? { label: kind === "module" ? adoptionModuleLabels[event.module] ?? event.module : pageLabel(event), views: 0, users: new Set<string>(), lastUsedAt: event.created_at };
    row.views += 1;
    if (event.user_id) row.users.add(event.user_id);
    if (event.created_at > row.lastUsedAt) row.lastUsedAt = event.created_at;
    map.set(key, row);
  }
  const total = Math.max(pageViews.length, 1);
  return [...map.entries()].map(([key, row]) => ({ key, label: row.label, views: row.views, users: row.users.size, lastUsedAt: row.lastUsedAt, share: row.views / total })).toSorted((a, b) => b.views - a.views || a.label.localeCompare(b.label));
}

function timelineItem(event: AdoptionRawEvent, directory: Map<string, DirectoryEntry>): AdoptionTimelineItem {
  const person = event.user_id ? directory.get(event.user_id) : null;
  const outcome = event.metadata?.outcome;
  return { id: event.id, userId: event.user_id, userName: person?.name ?? "Usuário não identificado", module: event.module, moduleLabel: adoptionModuleLabels[event.module] ?? event.module, pageLabel: pageLabel(event), eventName: event.event_name, createdAt: event.created_at, outcome: typeof outcome === "string" ? outcome : null };
}

function personStatus(lastAccess: string | null): AdoptionPerson["status"] {
  if (!lastAccess) return "inactive";
  const days = Math.floor((Date.now() - new Date(lastAccess).getTime()) / 86400000);
  if (days <= 1) return "recent";
  if (days <= 7) return "low";
  return "inactive";
}

function buildSnapshot(allEvents: AdoptionRawEvent[], directoryRows: DirectoryEntry[], period: AdoptionPeriodKey, now: Date): AdoptionSnapshot {
  const to = now.toISOString();
  const start = new Date(now);
  start.setDate(start.getDate() - periodDays[period] + 1);
  const startDay = localDay(start);
  const filtered = allEvents.filter((event) => localDay(event.created_at) >= startDay && new Date(event.created_at) <= now);
  const pageViews = filtered.filter((event) => event.event_name === "page_view");
  const directory = new Map(directoryRows.map((item) => [item.userId, item]));
  const moduleRows = ranking(filtered, "module");
  const pageRows = ranking(filtered, "page");
  const people = directoryRows.map((person): AdoptionPerson => {
    const rows = filtered.filter((event) => event.user_id === person.userId);
    const allRows = allEvents.filter((event) => event.user_id === person.userId);
    const views = rows.filter((event) => event.event_name === "page_view");
    const modules = ranking(rows, "module");
    const pages = ranking(rows, "page");
    const lastAccess = allRows.at(-1)?.created_at ?? null;
    return { userId: person.userId, name: person.name, email: person.email, role: person.role, lastAccess, activeDays: new Set(rows.map((event) => localDay(event.created_at))).size, sessions: sessionKeys(rows).size, pageViews: views.length, modulesUsed: new Set(views.map((event) => event.module)).size, topModule: modules[0]?.label ?? null, topModules: modules.slice(0, 5).map((item) => ({ label: item.label, views: item.views })), topPages: pages.slice(0, 5).map((item) => ({ label: item.label, views: item.views })), status: personStatus(lastAccess) };
  }).toSorted((a, b) => b.pageViews - a.pageViews || a.name.localeCompare(b.name));

  const performanceRows = filtered.flatMap((event) => {
    const value = numberMetadata(event, "page_load_ms") ?? numberMetadata(event, "navigation_ms");
    return value == null ? [] : [{ label: pageLabel(event), value }];
  });
  const errors = filtered.filter((event) => event.event_name === "error" || event.metadata?.outcome === "error");
  const slowPages = new Map<string, number[]>();
  performanceRows.forEach((row) => slowPages.set(row.label, [...(slowPages.get(row.label) ?? []), row.value]));
  const slowestPages = [...slowPages.entries()].map(([label, values]) => ({ label, medianMs: quantile(values, 0.5) ?? 0, samples: values.length })).toSorted((a, b) => b.medianMs - a.medianMs).slice(0, 6);
  const allDays = Array.from({ length: periodDays[period] }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDay(date);
  });
  const daily = allDays.map((date) => {
    const rows = filtered.filter((event) => localDay(event.created_at) === date);
    return { date, pageViews: rows.filter((event) => event.event_name === "page_view").length, sessions: sessionKeys(rows).size, users: new Set(rows.map((event) => event.user_id).filter(Boolean)).size };
  });

  return {
    period,
    periodLabel: periodLabels[period],
    from: start.toISOString(),
    to,
    usersActive: new Set(filtered.map((event) => event.user_id).filter(Boolean)).size,
    sessions: sessionKeys(filtered).size,
    activeDays: new Set(filtered.map((event) => localDay(event.created_at))).size,
    pageViews: pageViews.length,
    modulesUsed: new Set(pageViews.map((event) => event.module)).size,
    actions: filtered.filter((event) => !["page_view", "error"].includes(event.event_name)).length,
    errors: errors.length,
    people,
    modules: moduleRows,
    pages: pageRows,
    unusedModules: allModules.filter((module) => !moduleRows.some((row) => row.key === module)).map((module) => adoptionModuleLabels[module] ?? module),
    recentActivity: filtered.toReversed().filter((event) => event.event_name !== "performance").slice(0, 50).map((event) => timelineItem(event, directory)),
    daily,
    experience: {
      measuredNavigations: performanceRows.length,
      medianPageLoadMs: quantile(performanceRows.map((row) => row.value), 0.5),
      p95PageLoadMs: quantile(performanceRows.map((row) => row.value), 0.95),
      slowLoads: performanceRows.filter((row) => row.value >= 3000).length,
      errors: errors.length,
      successRate: performanceRows.length ? performanceRows.length / Math.max(performanceRows.length + errors.length, 1) * 100 : null,
      slowestPages,
      recentErrors: errors.toReversed().slice(0, 10).map((event) => timelineItem(event, directory)),
    },
  };
}

async function fetchEventsPaged(client: DataClient, tenantId: string, from: string) {
  const pageSize = 1000;
  const selection = "id,module,page_path,event_name,user_id,created_at,page_label:metadata->>page_label,session_id:metadata->>session_id,page_load_ms:metadata->>page_load_ms,navigation_ms:metadata->>navigation_ms,outcome:metadata->>outcome,user_email:metadata->>user_email,user_name:metadata->>user_name";
  const base = (count = false) => client.from("adoption_events").select(selection, count ? { count: "exact" } : undefined).eq("tenant_id", tenantId).gte("created_at", from).order("created_at", { ascending: true });
  const first = await base(true).range(0, pageSize - 1);
  if (first.error) throw first.error;
  const total = first.count ?? first.data?.length ?? 0;
  const remainingPages = Math.max(0, Math.ceil(total / pageSize) - 1);
  const rest = await Promise.all(Array.from({ length: remainingPages }, (_, index) => {
    const offset = (index + 1) * pageSize;
    return base().range(offset, offset + pageSize - 1);
  }));
  const failed = rest.find((result) => result.error);
  if (failed?.error) throw failed.error;
  return [...(first.data ?? []), ...rest.flatMap((result) => result.data ?? [])].map((row: any): AdoptionRawEvent => ({
    id: row.id,
    module: row.module,
    page_path: row.page_path,
    event_name: row.event_name,
    user_id: row.user_id,
    created_at: row.created_at,
    metadata: {
      page_label: row.page_label,
      session_id: row.session_id,
      page_load_ms: row.page_load_ms == null ? null : Number(row.page_load_ms),
      navigation_ms: row.navigation_ms == null ? null : Number(row.navigation_ms),
      outcome: row.outcome,
      user_email: row.user_email,
      user_name: row.user_name,
    },
  }));
}

export async function getAdoptionDirectory(client: DataClient, tenantId: string) {
  const memberships = await client.from("tenant_members").select("user_id,role").eq("tenant_id", tenantId).eq("ativo", true);
  if (memberships.error) throw memberships.error;
  const memberIds = (memberships.data ?? []).map((member: { user_id: string }) => member.user_id);
  const profiles = memberIds.length ? await client.from("profiles").select("id,nome").in("id", memberIds) : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map<string, string | null>((profiles.data ?? []).map((profile: { id: string; nome: string | null }) => [profile.id, profile.nome]));
  return (memberships.data ?? []).map((member: { user_id: string; role: string }) => ({ userId: member.user_id, name: names.get(member.user_id) ?? "Usuário", role: member.role }));
}

export async function getAdoptionAnalytics(client: DataClient, tenantId: string, now = new Date()): Promise<AdoptionAnalytics> {
  const from = new Date(now);
  from.setDate(from.getDate() - 89);
  from.setHours(0, 0, 0, 0);
  const [rawEvents, memberships] = await Promise.all([
    fetchEventsPaged(client, tenantId, from.toISOString()),
    client.from("tenant_members").select("user_id,role").eq("tenant_id", tenantId).eq("ativo", true),
  ]);
  const memberIds = (memberships.data ?? []).map((member: { user_id: string }) => member.user_id);
  const profiles = memberIds.length ? await client.from("profiles").select("id,nome").in("id", memberIds) : { data: [] };
  const events = dedupeEvents(rawEvents);
  const profileNames = new Map<string, string | null>((profiles.data ?? []).map((profile: { id: string; nome: string | null }) => [profile.id, profile.nome]));
  const roleByUser = new Map<string, string>((memberships.data ?? []).map((member: { user_id: string; role: string }) => [member.user_id, member.role]));
  const directoryIds = new Set(events.map((event) => event.user_id).filter((id): id is string => Boolean(id)));
  const directory: DirectoryEntry[] = [...directoryIds].map((userId) => {
    const event = events.findLast((row) => row.user_id === userId);
    const email = typeof event?.metadata?.user_email === "string" ? event.metadata.user_email : null;
    const metadataName = typeof event?.metadata?.user_name === "string" ? event.metadata.user_name : null;
    return { userId, name: profileNames.get(userId) ?? metadataName ?? email?.split("@")[0] ?? "Usuário", email, role: roleByUser.get(userId) ?? null };
  });
  const eventNames = new Map<string, number>();
  rawEvents.forEach((event) => eventNames.set(event.event_name, (eventNames.get(event.event_name) ?? 0) + 1));
  return {
    snapshots: Object.fromEntries((Object.keys(periodDays) as AdoptionPeriodKey[]).map((period) => [period, buildSnapshot(events, directory, period, now)])) as Record<AdoptionPeriodKey, AdoptionSnapshot>,
    audit: {
      totalEvents: rawEvents.length,
      firstEventAt: rawEvents[0]?.created_at ?? null,
      lastEventAt: rawEvents.at(-1)?.created_at ?? null,
      exactDuplicateGroups: rawEvents.length - events.length,
      eventNames: [...eventNames.entries()].map(([label, total]) => ({ label, total })).toSorted((a, b) => b.total - a.total),
      metadataCoverage: { session: rawEvents.filter((event) => typeof event.metadata?.session_id === "string").length, performance: rawEvents.filter((event) => numberMetadata(event, "page_load_ms") != null || numberMetadata(event, "navigation_ms") != null).length },
    },
    updatedAt: rawEvents.at(-1)?.created_at ?? null,
  };
}

export function getCachedAdoptionAnalytics(client: DataClient, tenantId: string, ttlMs = 60_000) {
  const current = analyticsCache.get(tenantId);
  if (current && current.expiresAt > Date.now()) return current.promise;
  const persistent = unstable_cache(() => getAdoptionAnalytics(client, tenantId), ["adoption-analytics-v2", tenantId], { revalidate: Math.max(1, Math.round(ttlMs / 1000)) });
  const promise = persistent().catch((error) => {
    analyticsCache.delete(tenantId);
    throw error;
  });
  analyticsCache.set(tenantId, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}
