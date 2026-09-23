"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, BarChart3, CalendarDays, Clock3, Eye, Gauge, LayoutGrid, Users, UsersRound } from "lucide-react";
import { DataFreshness, EmptyState, IconPill, MetricCard, PageHeader, SectionHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";
import type { AdoptionAnalytics, AdoptionPeriodKey, AdoptionPerson, AdoptionSnapshot } from "@/modules/adocao/types";

type Tab = "overview" | "people" | "modules" | "experience";
const periods: Array<{ key: AdoptionPeriodKey; label: string }> = [{ key: "today", label: "Hoje" }, { key: "7d", label: "7 dias" }, { key: "15d", label: "15 dias" }, { key: "30d", label: "30 dias" }, { key: "90d", label: "90 dias" }];
const tabs: Array<{ key: Tab; label: string }> = [{ key: "overview", label: "Visão Geral" }, { key: "people", label: "Pessoas" }, { key: "modules", label: "Módulos" }, { key: "experience", label: "Experiência" }];

export function AdocaoDashboard({ analytics, diagnostic, updatedAt }: { analytics: AdoptionAnalytics | null; diagnostic: string | null; updatedAt: string | null }) {
  const [period, setPeriod] = useState<AdoptionPeriodKey>("30d");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedUser, setSelectedUser] = useState("all");
  const snapshot = analytics?.snapshots[period] ?? null;
  const visibleActivity = useMemo(() => snapshot?.recentActivity.filter((item) => selectedUser === "all" || item.userId === selectedUser) ?? [], [selectedUser, snapshot]);
  return <div className="norwyn-ds-page space-y-5">
    <PageHeader eyebrow="Norwyn" title="Adoção" description="Uso da plataforma e saúde da experiência, com leitura por pessoa, módulo e página." aside={<DataFreshness label={updatedAt ? `Atualizado em ${dateTime(updatedAt)}` : "Sem eventos registrados"} stale={!updatedAt} />} />
    {diagnostic ? <Surface><p className="font-semibold text-[color:var(--ds-text)]">{diagnostic}</p></Surface> : null}
    {!snapshot ? <Surface><EmptyState title="Adoção ainda sem dados">O tracking começará a aparecer após navegações autenticadas.</EmptyState></Surface> : <>
      <Surface className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">{tabs.map((item) => <FilterButton key={item.key} active={tab === item.key} onClick={() => setTab(item.key)}>{item.label}</FilterButton>)}</div>
        <div className="flex flex-wrap gap-2">{periods.map((item) => <FilterButton key={item.key} active={period === item.key} onClick={() => setPeriod(item.key)}>{item.label}</FilterButton>)}</div>
      </Surface>
      {tab === "overview" ? <Overview snapshot={snapshot} onSelectUser={(id) => { setSelectedUser(id); setTab("people"); }} /> : null}
      {tab === "people" ? <People snapshot={snapshot} selectedUser={selectedUser} setSelectedUser={setSelectedUser} activity={visibleActivity} /> : null}
      {tab === "modules" ? <Modules snapshot={snapshot} /> : null}
      {tab === "experience" ? <Experience snapshot={snapshot} /> : null}
    </>}
  </div>;
}

function Overview({ snapshot, onSelectUser }: { snapshot: AdoptionSnapshot; onSelectUser: (id: string) => void }) {
  return <>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="Usuários ativos" value={formatNumber(snapshot.usersActive)} period={snapshot.periodLabel} icon={Users} tone="primary" />
      <MetricCard label="Sessões" value={formatNumber(snapshot.sessions)} period="janela de 30 min" icon={Clock3} tone="info" />
      <MetricCard label="Dias com uso" value={formatNumber(snapshot.activeDays)} period={snapshot.periodLabel} icon={CalendarDays} tone="success" />
      <MetricCard label="Page views" value={formatNumber(snapshot.pageViews)} period="duplicatas exatas removidas" icon={Eye} tone="primary" />
      <MetricCard label="Módulo mais usado" value={snapshot.topModule ?? "Sem uso"} period={`${snapshot.modulesUsed} módulos utilizados`} icon={LayoutGrid} tone="warning" />
      <MetricCard label="Erros reais" value={formatNumber(snapshot.errors)} period={`${snapshot.experience.indeterminateErrors} indeterminados, fora da métrica`} icon={AlertTriangle} tone={snapshot.errors ? "danger" : "success"} />
    </section>
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Surface><SectionHeader title="Utilização por pessoa" description="Último acesso real e atividade no período." /><div className="mt-4 grid gap-3 sm:grid-cols-2">{snapshot.people.map((person) => <PersonCard key={person.userId} person={person} onClick={() => onSelectUser(person.userId)} />)}</div></Surface>
      <Surface><SectionHeader title="Atividade" description="Page views por dia no período selecionado." /><ActivityBars snapshot={snapshot} /></Surface>
    </section>
    <section className="grid gap-4 xl:grid-cols-2"><Ranking title="Módulos mais usados" rows={snapshot.modules} /><Ranking title="Páginas mais acessadas" rows={snapshot.pages} /></section>
  </>;
}

function People({ snapshot, selectedUser, setSelectedUser, activity }: { snapshot: AdoptionSnapshot; selectedUser: string; setSelectedUser: (id: string) => void; activity: AdoptionSnapshot["recentActivity"] }) {
  const selected = snapshot.people.find((person) => person.userId === selectedUser) ?? null;
  return <div className="space-y-4">
    <Surface><SectionHeader title="Pessoas" description="Distribuição de uso por usuário autenticado." action={<select className="h-10 rounded-full border border-[color:var(--ds-border)] bg-white px-4 text-sm font-semibold text-[color:var(--ds-text)]" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}><option value="all">Todos os usuários</option>{snapshot.people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select>} /><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{snapshot.people.map((person) => <PersonCard key={person.userId} person={person} onClick={() => setSelectedUser(person.userId)} selected={selectedUser === person.userId} />)}</div></Surface>
    {selected ? <><Surface><p className="font-semibold text-[color:var(--ds-text)]">{selected.name}</p><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{selected.email ?? "E-mail não disponível"} · {roleLabel(selected.role)}</p></Surface><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><MetricCard label="Último acesso" value={relativeDate(selected.lastAccess)} icon={Activity} tone={statusTone(selected.status)} /><MetricCard label="Dias ativos" value={String(selected.activeDays)} period={snapshot.periodLabel} icon={CalendarDays} /><MetricCard label="Sessões" value={String(selected.sessions)} icon={Clock3} /><MetricCard label="Page views" value={String(selected.pageViews)} icon={Eye} /><MetricCard label="Módulos usados" value={String(selected.modulesUsed)} icon={LayoutGrid} /><MetricCard label="Mais usado" value={selected.topModule ?? "Sem uso"} icon={BarChart3} /></section><section className="grid gap-4 xl:grid-cols-2"><CompactRanking title="Módulos mais usados" rows={selected.topModules} /><CompactRanking title="Páginas mais acessadas" rows={selected.topPages} /></section></> : null}
    <Surface><SectionHeader title={selected ? `Atividade recente — ${selected.name}` : "Atividade recente"} description="Navegação e ações operacionais relevantes; eventos técnicos repetitivos são omitidos." /><Timeline items={activity} /></Surface>
  </div>;
}

function Modules({ snapshot }: { snapshot: AdoptionSnapshot }) {
  const low = snapshot.modules.filter((row) => row.views <= Math.max(2, snapshot.pageViews * 0.02));
  return <div className="space-y-4"><Ranking title="Módulos mais acessados" rows={snapshot.modules} detailed /><section className="grid gap-4 xl:grid-cols-2"><Surface><SectionHeader title="Pouco utilizados" description="Baixo volume no período, sem interpretação automática." /><div className="mt-4 flex flex-wrap gap-2">{low.length ? low.map((row) => <StatusBadge key={row.key} tone="warning">{row.label} · {row.views}</StatusBadge>) : <EmptyState title="Nenhum módulo com uso muito baixo" />}</div></Surface><Surface><SectionHeader title="Sem uso no período" description="Módulos disponíveis sem page view no recorte." /><div className="mt-4 flex flex-wrap gap-2">{snapshot.unusedModules.map((label) => <StatusBadge key={label}>{label}</StatusBadge>)}</div></Surface></section></div>;
}

function Experience({ snapshot }: { snapshot: AdoptionSnapshot }) {
  const experience = snapshot.experience;
  return <div className="space-y-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="Navegação" value={experience.navigationSuccessRate == null ? "Dados insuficientes" : `${formatDecimal(experience.navigationSuccessRate)}%`} period={`${experience.navigationMeasured} resultados monitorados`} icon={Gauge} tone={experience.navigationSuccessRate == null ? "neutral" : "success"} />
      <MetricCard label="API" value={experience.apiSuccessRate == null ? "Dados insuficientes" : `${formatDecimal(experience.apiSuccessRate)}%`} period={`${experience.apiMeasured} chamadas monitoradas`} icon={Activity} tone={experience.apiSuccessRate == null ? "neutral" : "success"} />
      <MetricCard label="Tempo mediano de página" value={experience.medianPageLoadMs == null ? "Coletando" : duration(experience.medianPageLoadMs)} period={`${experience.measuredNavigations} amostras`} icon={Clock3} tone="info" />
      <MetricCard label="p95 de página" value={experience.p95PageLoadMs == null ? "Coletando" : duration(experience.p95PageLoadMs)} icon={Activity} tone="warning" />
      <MetricCard label="Carregamentos lentos" value={String(experience.slowLoads)} period={`acima de ${duration(experience.slowThresholdMs)}`} icon={AlertTriangle} tone={experience.slowLoads ? "warning" : "success"} />
      <MetricCard label="Erros reais" value={String(experience.errors)} period={`${experience.capturedErrors} eventos auditados`} icon={AlertTriangle} tone={experience.errors ? "danger" : "success"} />
    </section>
    {experience.measuredNavigations ? <section className="grid gap-4 xl:grid-cols-2"><Surface><SectionHeader title="Páginas mais lentas" description="Tempo de carregamento da página; não mistura duração de API." /><div className="mt-4 space-y-3">{experience.slowestPages.map((page) => <InfoRow key={page.label} label={page.label} value={`mediana ${duration(page.medianMs)} · p95 ${duration(page.p95Ms)} · ${plural(page.slowLoads, "lento", "lentos")}`} />)}{!experience.slowestPages.length ? <EmptyState title="Nenhum carregamento acima do limite" /> : null}</div></Surface><Surface><SectionHeader title="Erros reais recentes" description="Somente falhas com evidência funcional; mensagens sanitizadas." /><Timeline items={experience.recentErrors} /></Surface></section> : <Surface><EmptyState title="Dados de performance ainda insuficientes">As taxas de navegação e API só aparecem quando os eventos possuem resultado monitorado. Nenhuma taxa é inferida de eventos genéricos.</EmptyState></Surface>}
    <Surface><SectionHeader title="Auditoria dos eventos de erro" description={`${experience.capturedErrors} capturados · ${experience.errors} reais · ${experience.indeterminateErrors} indeterminados · ${experience.ignoredErrors} ignorados`} /><div className="mt-4 space-y-3">{experience.errorAudit.map((row, index) => <div key={`${row.classification}-${row.module}-${row.pagePath}-${row.userId}-${index}`} className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[color:var(--ds-text)]">{row.userName ?? "Usuário"} · {row.module}</p><StatusBadge tone={row.classification === "real" ? "danger" : row.classification === "ignored" ? "neutral" : "warning"}>{errorClassification(row.classification)} · {row.total}</StatusBadge></div><p className="mt-2 text-sm text-[color:var(--ds-text-secondary)]">{row.type ?? "Tipo não informado"} · {row.statusCode ? `HTTP ${row.statusCode}` : "sem HTTP"} · {row.pagePath}</p><p className="mt-1 text-sm text-[color:var(--ds-text-muted)]">{row.message ?? "Mensagem não disponível"}</p></div>)}{!experience.errorAudit.length ? <EmptyState title="Sem eventos de erro no período" /> : null}</div></Surface>
  </div>;
}

function PersonCard({ person, onClick, selected = false }: { person: AdoptionPerson; onClick: () => void; selected?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-[var(--ds-radius-md)] border p-4 text-left shadow-[var(--ds-shadow-sm)] transition ${selected ? "border-[color:var(--ds-primary)] bg-[color:var(--ds-primary-soft)]" : "border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] hover:border-[color:var(--ds-border-strong)]"}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><IconPill icon={UsersRound} tone={statusTone(person.status)} /><div className="min-w-0"><p className="truncate font-semibold text-[color:var(--ds-text)]">{person.name}</p><p className="mt-1 truncate text-xs text-[color:var(--ds-text-muted)]">{person.email ?? "E-mail não disponível"}</p><p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{roleLabel(person.role)}</p></div></div><StatusBadge tone={statusTone(person.status)}>{statusLabel(person.status)}</StatusBadge></div><p className="mt-4 text-sm font-semibold text-[color:var(--ds-text)]">{relativeDate(person.lastAccess)}</p><div className="mt-3 grid grid-cols-4 gap-2 text-xs text-[color:var(--ds-text-secondary)]"><span><b className="block text-base text-[color:var(--ds-text)]">{person.activeDays}</b>dias</span><span><b className="block text-base text-[color:var(--ds-text)]">{person.sessions}</b>sessões</span><span><b className="block text-base text-[color:var(--ds-text)]">{person.pageViews}</b>páginas</span><span><b className="block text-base text-[color:var(--ds-text)]">{person.modulesUsed}</b>módulos</span></div><p className="mt-3 text-xs text-[color:var(--ds-text-muted)]">Mais usado: <b className="text-[color:var(--ds-text-secondary)]">{person.topModule ?? "Sem uso"}</b></p></button>;
}

function Ranking({ title, rows, detailed = false }: { title: string; rows: AdoptionSnapshot["modules"]; detailed?: boolean }) {
  const max = Math.max(...rows.map((row) => row.views), 1);
  return <Surface><SectionHeader title={title} description="Page views humanas deduplicadas por usuário, página e segundo." /><div className="mt-5 space-y-4">{rows.slice(0, detailed ? 20 : 8).map((row, index) => <div key={row.key}><div className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-semibold text-[color:var(--ds-text)]">{index + 1}. {row.label}</span><span className="shrink-0 font-semibold text-[color:var(--ds-text-secondary)]">{row.views}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--ds-bg-soft)]"><div className="h-full rounded-full bg-[color:var(--ds-primary)]" style={{ width: `${Math.max(4, row.views / max * 100)}%` }} /></div>{detailed ? <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{plural(row.users, "usuário", "usuários")} · última utilização {relativeDate(row.lastUsedAt).toLowerCase()}{row.trendPercent == null ? "" : ` · tendência ${row.trendPercent > 0 ? "+" : ""}${formatDecimal(row.trendPercent)}%`}</p> : null}</div>)}{!rows.length ? <EmptyState /> : null}</div></Surface>;
}

function CompactRanking({ title, rows }: { title: string; rows: Array<{ label: string; views: number }> }) {
  return <Surface><SectionHeader title={title} /><div className="mt-4 space-y-2">{rows.map((row, index) => <InfoRow key={`${row.label}-${index}`} label={`${index + 1}. ${row.label}`} value={plural(row.views, "acesso", "acessos")} />)}{!rows.length ? <EmptyState title="Sem uso no período" /> : null}</div></Surface>;
}

function ActivityBars({ snapshot }: { snapshot: AdoptionSnapshot }) {
  const width = 520;
  const height = 190;
  const values = snapshot.daily.map((day) => day.pageViews);
  const max = Math.max(...values, 1);
  const path = snapshot.daily.map((day, index) => {
    const x = snapshot.daily.length === 1 ? 0 : index / (snapshot.daily.length - 1) * width;
    const y = height - day.pageViews / max * (height - 24) - 12;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const lastY = height - (values.at(-1) ?? 0) / max * (height - 24) - 12;
  return <div className="mt-5"><svg className="h-48 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolução de page views em ${snapshot.periodLabel.toLowerCase()}`}><defs><linearGradient id="adoptionLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#f59e0b" /><stop offset="45%" stopColor="#d62976" /><stop offset="100%" stopColor="#4f5bd5" /></linearGradient><linearGradient id="adoptionArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d62976" stopOpacity="0.18" /><stop offset="100%" stopColor="#d62976" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#adoptionArea)" /><path d={path} fill="none" stroke="url(#adoptionLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /><circle cx={width} cy={lastY} r="5" fill="#d62976" /></svg><div className="mt-2 flex justify-between text-xs text-[color:var(--ds-text-muted)]"><span>{shortDate(snapshot.daily[0]?.date)}</span><span>{shortDate(snapshot.daily.at(-1)?.date)}</span></div></div>;
}

function Timeline({ items }: { items: AdoptionSnapshot["recentActivity"] }) { return <div className="mt-4 divide-y divide-[color:var(--ds-border)]">{items.slice(0, 20).map((item) => <div key={item.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[120px_160px_1fr]"><span className="text-[color:var(--ds-text-muted)]">{dateTime(item.createdAt)}</span><span className="font-semibold text-[color:var(--ds-text)]">{item.userName}</span><span className="text-[color:var(--ds-text-secondary)]">{eventLabel(item.eventName)} · {item.pageLabel}</span></div>)}{!items.length ? <EmptyState title="Sem atividade no período" /> : null}</div>; }
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${active ? "border-[color:var(--ds-primary)] bg-[color:var(--ds-primary)] text-white" : "border-[color:var(--ds-border)] bg-white text-[color:var(--ds-text-secondary)] hover:bg-[color:var(--ds-bg-soft)]"}`}>{children}</button>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-3 text-sm"><span className="font-semibold text-[color:var(--ds-text)]">{label}</span><span className="text-[color:var(--ds-text-secondary)]">{value}</span></div>; }
function formatNumber(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function formatDecimal(value: number) { return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }); }
function plural(value: number, singular: string, pluralValue: string) { return `${formatNumber(value)} ${value === 1 ? singular : pluralValue}`; }
function errorClassification(value: "real" | "ignored" | "indeterminate") { return value === "real" ? "Erro real" : value === "ignored" ? "Ignorado" : "Indeterminado"; }
function duration(value: number) { return value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s` : `${value}ms`; }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function shortDate(value?: string) { return value ? value.split("-").reverse().slice(0, 2).join("/") : "-"; }
function relativeDate(value: string | null) { if (!value) return "Sem atividade recente"; const date = new Date(value); const day = localDay(date); const today = localDay(new Date()); const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1); const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date); if (day === today) return `Hoje, ${time}`; if (day === localDay(yesterdayDate)) return `Ontem, ${time}`; return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date); }
function localDay(value: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function statusTone(status: AdoptionPerson["status"]): "success" | "warning" | "neutral" { return status === "recent" ? "success" : status === "low" ? "warning" : "neutral"; }
function statusLabel(status: AdoptionPerson["status"]) { return status === "recent" ? "Ativo recentemente" : status === "low" ? "Pouco ativo" : "Sem atividade recente"; }
function roleLabel(role: string | null) { const labels: Record<string, string> = { ADMIN: "Admin", ESPECIALISTA: "Especialista", OPERACIONAL: "Operacional", SUPORTE: "Suporte" }; return role ? labels[role] ?? role : "Perfil não identificado"; }
function eventLabel(event: string) { const labels: Record<string, string> = { page_view: "abriu", create: "criou", update: "atualizou", approve: "aprovou", delete: "excluiu", send: "enviou", run: "executou", search: "pesquisou", export: "exportou", error: "erro" }; return labels[event] ?? event; }
