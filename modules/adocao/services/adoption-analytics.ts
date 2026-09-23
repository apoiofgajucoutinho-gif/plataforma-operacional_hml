import { allModules } from "@/lib/auth/modules";
import { unstable_cache } from "next/cache";
import type { AdoptionAnalytics, AdoptionPeriodKey, AdoptionPerson, AdoptionRanking, AdoptionSnapshot, AdoptionTimelineItem } from "@/modules/adocao/types";

type DataClient = any;
type RawPerson = {
  userId: string; name: string; email: string | null; role: string | null; lastAccess: string | null;
  activeDays: number; sessions: number; pageViews: number; modulesUsed: number; topModule: string | null;
  topModules: Array<{ module: string; views: number }>;
  topPages: Array<{ module: string; page: string; views: number }>;
};
type RawSummary = {
  people?: RawPerson[]; usersActive?: number; sessions?: number; activeDays?: number; pageViews?: number;
  modulesUsed?: number; actions?: number; topModule?: { module: string; views: number } | null;
  modules?: Array<{ module: string; views: number; users: number; lastUsedAt: string | null; trendPercent?: number | null }>;
  pages?: Array<{ module: string; page: string; views: number; users: number; lastUsedAt: string | null }>;
  daily?: Array<{ date: string; pageViews: number; sessions: number; users: number }>;
  recentActivity?: Array<Record<string, unknown>>;
  experience?: Record<string, any>;
  audit?: Record<string, any>;
};

export const adoptionModuleLabels: Record<string, string> = {
  norwyn: "Início", agenda: "Agenda", missoes: "Missões", marketing: "Marketing", instagram: "Instagram",
  ads: "Ads", comercial: "Comercial", catalogo: "Catálogo", "produtos-alunos": "Produtos & Alunos",
  alunos: "Aluno 360", resultados: "Resultados", financeiro: "Financeiro", automacoes: "Automações",
  presence: "Presença", validacao: "Validação", atividades: "Atividades", ocorrencias: "Suporte",
  relatorios: "Relatórios", "landing-pages": "Landing Pages", adocao: "Adoção", admin: "Admin",
};

const periods: Array<{ key: AdoptionPeriodKey; days: number; label: string }> = [
  { key: "today", days: 1, label: "Hoje" }, { key: "7d", days: 7, label: "Últimos 7 dias" },
  { key: "15d", days: 15, label: "Últimos 15 dias" }, { key: "30d", days: 30, label: "Últimos 30 dias" },
  { key: "90d", days: 90, label: "Últimos 90 dias" },
];
const analyticsCache = new Map<string, { expiresAt: number; promise: Promise<AdoptionAnalytics> }>();

function periodStart(now: Date, days: number) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const start = new Date(`${day}T00:00:00-03:00`);
  start.setDate(start.getDate() - days + 1);
  return start.toISOString();
}

function personStatus(lastAccess: string | null): AdoptionPerson["status"] {
  if (!lastAccess) return "inactive";
  const days = Math.floor((Date.now() - new Date(lastAccess).getTime()) / 86_400_000);
  return days <= 1 ? "recent" : days <= 7 ? "low" : "inactive";
}

function timelineItem(row: Record<string, any>): AdoptionTimelineItem {
  const module = String(row.module ?? "");
  return {
    id: String(row.id ?? crypto.randomUUID()), userId: row.userId ? String(row.userId) : null,
    userName: String(row.userName ?? "Usuário não identificado"), module,
    moduleLabel: adoptionModuleLabels[module] ?? module, pageLabel: String(row.pageLabel ?? row.pagePath ?? module),
    eventName: String(row.eventName ?? "page_view"), createdAt: String(row.createdAt ?? new Date(0).toISOString()),
    outcome: typeof row.outcome === "string" ? row.outcome : null,
    errorType: typeof row.errorType === "string" ? row.errorType : null,
    statusCode: typeof row.statusCode === "number" ? row.statusCode : null,
    message: typeof row.message === "string" ? row.message : null,
  };
}

function ranking(rows: RawSummary["modules"] | RawSummary["pages"], total: number, page = false): AdoptionRanking[] {
  return (rows ?? []).map((row: any) => ({
    key: page ? `${row.module}:${row.page}` : row.module,
    module: row.module,
    page: page ? row.page : undefined,
    label: page ? `${adoptionModuleLabels[row.module] ?? row.module} / ${row.page}` : adoptionModuleLabels[row.module] ?? row.module,
    views: Number(row.views ?? 0), users: Number(row.users ?? 0), lastUsedAt: row.lastUsedAt ?? null,
    share: total ? Number(row.views ?? 0) / total : 0, trendPercent: row.trendPercent == null ? null : Number(row.trendPercent),
  }));
}

function mapSnapshot(raw: RawSummary, period: typeof periods[number], from: string, to: string): AdoptionSnapshot {
  const totalViews = Number(raw.pageViews ?? 0);
  const people = (raw.people ?? []).map((person): AdoptionPerson => ({
    userId: person.userId, name: person.name, email: person.email, role: person.role, lastAccess: person.lastAccess,
    activeDays: Number(person.activeDays ?? 0), sessions: Number(person.sessions ?? 0), pageViews: Number(person.pageViews ?? 0),
    modulesUsed: Number(person.modulesUsed ?? 0), topModule: person.topModule ? adoptionModuleLabels[person.topModule] ?? person.topModule : null,
    topModules: (person.topModules ?? []).map((item) => ({ label: adoptionModuleLabels[item.module] ?? item.module, views: Number(item.views) })),
    topPages: (person.topPages ?? []).map((item) => ({ label: `${adoptionModuleLabels[item.module] ?? item.module} / ${item.page}`, views: Number(item.views) })),
    status: personStatus(person.lastAccess),
  }));
  const experience = raw.experience ?? {};
  const modules = ranking(raw.modules, totalViews);
  return {
    period: period.key, periodLabel: period.label, from, to, usersActive: Number(raw.usersActive ?? 0),
    sessions: Number(raw.sessions ?? 0), activeDays: Number(raw.activeDays ?? 0), pageViews: totalViews,
    modulesUsed: Number(raw.modulesUsed ?? 0), actions: Number(raw.actions ?? 0), errors: Number(experience.realErrors ?? 0),
    topModule: raw.topModule?.module ? adoptionModuleLabels[raw.topModule.module] ?? raw.topModule.module : null,
    people, modules, pages: ranking(raw.pages, totalViews, true),
    unusedModules: allModules.filter((module) => !modules.some((row) => row.module === module)).map((module) => adoptionModuleLabels[module] ?? module),
    recentActivity: (raw.recentActivity ?? []).map(timelineItem),
    daily: (raw.daily ?? []).map((row) => ({ date: String(row.date), pageViews: Number(row.pageViews), sessions: Number(row.sessions), users: Number(row.users) })),
    experience: {
      measuredNavigations: Number(experience.measuredNavigations ?? 0), medianPageLoadMs: experience.medianMs == null ? null : Number(experience.medianMs),
      p95PageLoadMs: experience.p95Ms == null ? null : Number(experience.p95Ms), slowLoads: Number(experience.slowLoads ?? 0),
      slowThresholdMs: Number(experience.slowThresholdMs ?? 3000), errors: Number(experience.realErrors ?? 0),
      capturedErrors: Number(experience.capturedErrors ?? 0), ignoredErrors: Number(experience.ignoredErrors ?? 0),
      indeterminateErrors: Number(experience.indeterminateErrors ?? 0), navigationMeasured: Number(experience.navigationMeasured ?? 0),
      navigationSuccessRate: experience.navigationSuccessRate == null ? null : Number(experience.navigationSuccessRate),
      apiMeasured: Number(experience.apiMeasured ?? 0), apiSuccessRate: experience.apiSuccessRate == null ? null : Number(experience.apiSuccessRate),
      slowestPages: (experience.slowestPages ?? []).map((item: any) => ({ module: item.module, page: item.page, label: `${adoptionModuleLabels[item.module] ?? item.module} / ${item.page}`, medianMs: Number(item.medianMs), p95Ms: Number(item.p95Ms), maxMs: Number(item.maxMs), samples: Number(item.samples), slowLoads: Number(item.slowLoads) })),
      recentErrors: (experience.recentErrors ?? []).map(timelineItem), errorAudit: experience.errorAudit ?? [],
    },
  };
}

async function fetchSummary(client: DataClient, tenantId: string, from: string, to: string): Promise<RawSummary> {
  const { data, error } = await client.rpc("get_adoption_report_summary", { p_tenant_id: tenantId, p_from: from, p_to: to, p_user_id: null, p_role: null });
  if (error) throw error;
  return (data ?? {}) as RawSummary;
}

export async function getAdoptionDirectory(client: DataClient, tenantId: string) {
  const now = new Date();
  const raw = await fetchSummary(client, tenantId, periodStart(now, 30), now.toISOString());
  return (raw.people ?? []).map((person) => ({ userId: person.userId, name: person.name, email: person.email, role: person.role }));
}

export async function getAdoptionAnalytics(client: DataClient, tenantId: string, now = new Date()): Promise<AdoptionAnalytics> {
  const to = now.toISOString();
  const rows = await Promise.all(periods.map(async (period) => {
    const from = periodStart(now, period.days);
    const raw = await fetchSummary(client, tenantId, from, to);
    return { key: period.key, snapshot: mapSnapshot(raw, period, from, to), raw };
  }));
  const snapshots = Object.fromEntries(rows.map((row) => [row.key, row.snapshot])) as Record<AdoptionPeriodKey, AdoptionSnapshot>;
  const auditRaw = rows.find((row) => row.key === "30d")?.raw.audit ?? {};
  return {
    snapshots,
    audit: {
      totalEvents: Number(auditRaw.totalEvents ?? 0), firstEventAt: auditRaw.firstEventAt ?? null, lastEventAt: auditRaw.lastEventAt ?? null,
      users: Number(auditRaw.users ?? 0), exactDuplicateGroups: Number(auditRaw.duplicatePageViews ?? 0),
      eventNames: auditRaw.eventNames ?? [], metadataCoverage: { session: Number(auditRaw.sessionCoverage ?? 0), performance: Number(auditRaw.performanceCoverage ?? 0) },
    },
    updatedAt: auditRaw.lastEventAt ?? null,
  };
}

export function getCachedAdoptionAnalytics(client: DataClient, tenantId: string, ttlMs = 60_000) {
  const current = analyticsCache.get(tenantId);
  if (current && current.expiresAt > Date.now()) return current.promise;
  const persistent = unstable_cache(() => getAdoptionAnalytics(client, tenantId), ["adoption-analytics-v3", tenantId], { revalidate: Math.max(1, Math.round(ttlMs / 1000)) });
  const promise = persistent().catch((error) => { analyticsCache.delete(tenantId); throw error; });
  analyticsCache.set(tenantId, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
}
