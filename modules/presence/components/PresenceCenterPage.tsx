"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { AlertCircle, Clock3, ExternalLink, Globe2, Info, Link2, Plus, Radar, RefreshCw, ShieldCheck, Siren } from "lucide-react";
import type { PresenceAsset, PresenceCheck, PresenceContext, PresenceDiscoveredLink, PresenceIncident, PresenceStatus } from "@/modules/presence/types";

type Props = { context: PresenceContext };
type ViewMode = "specialist" | "admin" | "links" | "qa";
type DetailTab = "summary" | "availability" | "links" | "content" | "performance" | "incidents" | "history";

const statusLabel: Record<PresenceStatus, string> = {
  healthy: "Saudavel",
  warning: "Atencao",
  critical: "Critico",
  unknown: "Sem dados",
};

const contentStatusLabel: Record<string, string> = {
  ok: "OK",
  missing_expected: "Esperado ausente",
  suspicious: "Suspeito",
  changed: "Mudou",
  unknown: "Sem dados",
};

const statusTone: Record<PresenceStatus, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  warning: "warning",
  critical: "danger",
  unknown: "neutral",
};

const statusDot: Record<PresenceStatus, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
  unknown: "bg-slate-300",
};
type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  primary: "border-cyan-200 bg-cyan-50 text-cyan-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

function PageHeader({ eyebrow, title, description, aside }: { eyebrow?: string; title: string; description?: string; aside?: React.ReactNode }) {
  return <header className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl">{eyebrow ? <p className="text-xs font-semibold uppercase tracking-normal text-cyan-700">{eyebrow}</p> : null}<h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{title}</h1>{description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}</div>{aside ? <div className="shrink-0">{aside}</div> : null}</div></header>;
}

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex min-h-6 max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4 ${toneClass[tone]}`}>{children}</span>;
}

function DataFreshness({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800"><Clock3 className="h-3.5 w-3.5" />{label}</span>;
}

function MetricCard({ label, value, tone = "neutral", icon: Icon }: { label: string; value: string; tone?: Tone; icon?: React.ComponentType<{ className?: string }> }) {
  return <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3">{Icon ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}><Icon className="h-5 w-5" /></span> : null}<p className="text-sm font-medium text-slate-600">{label}</p></div><p className="mt-4 break-words text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">{value}</p></div>;
}

function InsightCard({ title, children, tone = "info" }: { title: string; children: React.ReactNode; tone?: Tone }) {
  return <div className={`rounded-[22px] border p-4 ${toneClass[tone]}`}><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70"><Info className="h-5 w-5" /></span><div><p className="font-semibold text-slate-950">{title}</p><div className="mt-1 text-sm leading-6 text-slate-700">{children}</div></div></div></div>;
}

function ActionCard({ title, meta, description, tone = "neutral", icon: Icon }: { title: string; meta?: string; description?: string; tone?: Tone; icon?: React.ComponentType<{ className?: string }> }) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3">{Icon ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass[tone]}`}><Icon className="h-5 w-5" /></span> : null}<div><p className="break-words font-semibold text-slate-950">{title}</p>{description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}</div></div>{meta ? <StatusBadge tone={tone}>{meta}</StatusBadge> : null}</div></div>;
}

function EmptyState({ title = "Sem dados por enquanto", children }: { title?: string; children?: React.ReactNode }) {
  return <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><p className="font-semibold text-slate-950">{title}</p>{children ? <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p> : null}</div>;
}

function formatRelative(value: string | null | undefined) {
  if (!value || value === "-") return "Nunca";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const diffMs = Date.now() - time;
  if (diffMs < 60_000) return "agora";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `ha ${hours} h`;
  const days = Math.round(hours / 24);
  return `ha ${days} dias`;
}

function formatMs(value: number | null | undefined) {
  if (value == null) return "-";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function latestCheck(asset: PresenceAsset, checks: PresenceCheck[]) {
  return checks.find((check) => check.asset_id === asset.id) ?? null;
}

function issueDescription(incident: PresenceIncident) {
  const priority = incident.severity === "critical" ? "Prioridade critica" : incident.severity === "high" ? "Prioridade alta" : incident.severity === "medium" ? "Prioridade media" : "Prioridade baixa";
  return `${incident.title}. ${priority}.`;
}

function resultList(check: PresenceCheck | null, key: string) {
  const value = check?.result_json?.[key];
  return Array.isArray(value) ? value : [];
}

function Button({ children, onClick, disabled, tone = "neutral", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "neutral" | "primary" | "danger"; type?: "button" | "submit" }) {
  const styles = tone === "primary" ? "bg-[color:var(--ds-primary)] text-white hover:opacity-90" : tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-[color:var(--ds-border)] bg-white text-[color:var(--ds-text)] hover:bg-[color:var(--ds-bg-soft)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${styles}`}>
      {children}
    </button>
  );
}

export function PresenceCenterPage({ context }: Props) {
  const [view, setView] = useState<ViewMode>(context.isAdmin ? "admin" : "specialist");
  const [selectedAssetId, setSelectedAssetId] = useState(context.assets[0]?.id ?? "");
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({ name: "", url: "", asset_type: "landing_page", is_critical: false, owner: "Juliana Coutinho" });

  const selectedAsset = context.assets.find((asset) => asset.id === selectedAssetId) ?? context.assets[0] ?? null;
  const selectedCheck = selectedAsset ? latestCheck(selectedAsset, context.checks) : null;
  const selectedIncidents = selectedAsset ? context.incidents.filter((incident) => incident.asset_id === selectedAsset.id && (incident.source_type ?? "REAL") === "REAL") : [];
  const pendingLinks = context.discoveredLinks.filter((link) => link.status === "pending");

  const assetsWithChecks = useMemo(() => context.assets.map((asset) => ({ asset, check: latestCheck(asset, context.checks) })), [context.assets, context.checks]);

  async function postJson(url: string, body?: Record<string, unknown>) {
    setBusy(url);
    setMessage(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Falha na operacao");
      setMessage(json.message ?? "Operacao concluida. Atualize a pagina para ver o estado final.");
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na operacao");
    } finally {
      setBusy(null);
    }
  }

  async function createAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postJson("/api/presence/assets", assetForm);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Presence Center"
        title="Saude da presenca digital"
        description="Monitore a saude dos seus sites, paginas e links importantes sem transformar a rotina em uma tela tecnica. Esta versao HML e somente leitura para ativos externos."
        aside={<DataFreshness label={`Atualizado ${formatRelative(context.updatedAt)}`} />}
      />

      <div className="flex flex-wrap gap-2">
        <Button tone={view === "specialist" ? "primary" : "neutral"} onClick={() => setView("specialist")}>Visao especialista</Button>
        {context.isAdmin ? <Button tone={view === "admin" ? "primary" : "neutral"} onClick={() => setView("admin")}>Admin</Button> : null}
        {context.isAdmin ? <Button tone={view === "links" ? "primary" : "neutral"} onClick={() => setView("links")}>Sublinks</Button> : null}
        {context.isAdmin ? <Button tone={view === "qa" ? "primary" : "neutral"} onClick={() => setView("qa")}>Testes / QA</Button> : null}
      </div>

      {message ? <InsightCard title="Retorno da operacao" tone={message.toLowerCase().includes("falha") ? "warning" : "success"}>{message}</InsightCard> : null}
      {context.diagnostic ? <InsightCard title="Diagnostico" tone="warning">{context.diagnostic}</InsightCard> : null}

      {view === "specialist" ? <SpecialistView context={context} /> : null}
      {view === "admin" && context.isAdmin ? (
        <AdminView
          assetsWithChecks={assetsWithChecks}
          incidents={context.incidents}
          selectedAsset={selectedAsset}
          selectedCheck={selectedCheck}
          selectedIncidents={selectedIncidents}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          setSelectedAssetId={setSelectedAssetId}
          onCheck={(assetId) => postJson("/api/presence/check", { assetId })}
          busy={busy}
        />
      ) : null}
      {view === "qa" && context.isAdmin ? <QaView context={context} /> : null}
      {view === "links" && context.isAdmin ? (
        <LinksView
          assets={context.assets}
          pendingLinks={pendingLinks}
          allLinks={context.discoveredLinks}
          assetForm={assetForm}
          setAssetForm={setAssetForm}
          createAsset={createAsset}
          onDiscover={(assetId) => postJson("/api/presence/assets/discover", { assetId })}
          onApprove={(linkId, action) => postJson("/api/presence/assets/approve", { linkId, action })}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function SpecialistView({ context }: { context: PresenceContext }) {
  const { summary } = context;
  const headline = summary.overallStatus === "healthy" ? "Tudo funcionando normalmente" : summary.overallStatus === "unknown" ? "Primeira checagem pendente" : `Encontramos ${summary.openIncidents} problema(s) que podem exigir atencao.`;
  return (
    <div className="space-y-6">
      <Surface className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[color:var(--ds-accent)]">Saude geral</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-5xl font-semibold tracking-normal text-[color:var(--ds-text)]">{summary.overallScore ?? "--"}</span>
              <span className="pb-2 text-sm font-medium text-[color:var(--ds-text-secondary)]">/100</span>
              <StatusBadge tone={statusTone[summary.overallStatus]}>{statusLabel[summary.overallStatus]}</StatusBadge>
            </div>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--ds-text-secondary)]">{headline}</p>
          </div>
          <div className="rounded-[24px] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4 text-sm leading-6 text-[color:var(--ds-text-secondary)] lg:max-w-sm">
            <b className="text-[color:var(--ds-text)]">Análise Norwyn</b>
            <p className="mt-2"><span className="font-semibold">Dado observado:</span> {summary.analysis.observed}</p>
            <p><span className="font-semibold">Inferencia:</span> {summary.analysis.inference}</p>
            <p><span className="font-semibold">Recomendacao:</span> {summary.analysis.recommendation}</p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sites ativos" value={String(summary.activeAssets)} icon={Globe2} tone="info" />
        <MetricCard label="LPs ativas" value={String(summary.landingPages)} icon={Radar} tone="primary" />
        <MetricCard label="Links criticos" value={String(summary.criticalLinks)} icon={Link2} tone="warning" />
        <MetricCard label="Incidentes abertos" value={String(summary.openIncidents)} icon={Siren} tone={summary.openIncidents ? "danger" : "success"} />
      </div>

      <Surface>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">O que precisa da minha atencao</h2>
          <StatusBadge tone={summary.needsAttention.length ? "warning" : "success"}>{summary.needsAttention.length ? "Revisar" : "Sem pendencias"}</StatusBadge>
        </div>
        <div className="grid gap-3">
          {summary.needsAttention.length ? summary.needsAttention.map((incident) => <ActionCard key={incident.id} title={incident.title} description={issueDescription(incident)} meta={incident.severity} tone={incident.severity === "critical" ? "danger" : "warning"} icon={AlertCircle} />) : <EmptyState title="Nada urgente agora">Nao ha incidentes abertos que exijam acao imediata.</EmptyState>}
        </div>
      </Surface>
    </div>
  );
}

function AdminView({ assetsWithChecks, incidents, selectedAsset, selectedCheck, selectedIncidents, detailTab, setDetailTab, setSelectedAssetId, onCheck, busy }: { assetsWithChecks: Array<{ asset: PresenceAsset; check: PresenceCheck | null }>; incidents: PresenceIncident[]; selectedAsset: PresenceAsset | null; selectedCheck: PresenceCheck | null; selectedIncidents: PresenceIncident[]; detailTab: DetailTab; setDetailTab: (tab: DetailTab) => void; setSelectedAssetId: (id: string) => void; onCheck: (assetId: string) => void; busy: string | null }) {
  const realIncidents = incidents.filter((incident) => (incident.source_type ?? "REAL") === "REAL");
  const openIncidents = realIncidents.filter((incident) => incident.status === "open" || incident.status === "acknowledged");
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Health Score Geral" value={selectedAsset?.last_health_score != null ? `${selectedAsset.last_health_score}/100` : "--"} icon={ShieldCheck} tone={statusTone[selectedAsset?.last_status ?? "unknown"]} />
        <MetricCard label="Ativos monitorados" value={String(assetsWithChecks.length)} icon={Globe2} tone="info" />
        <MetricCard label="Problemas ativos" value={String(openIncidents.length)} icon={AlertCircle} tone={openIncidents.length ? "danger" : "success"} />
        <MetricCard label="Incidentes hoje" value={String(realIncidents.filter((incident) => incident.detected_at.startsWith(new Date().toISOString().slice(0, 10))).length)} icon={Clock3} tone="neutral" />
      </div>

      <Surface>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Ativos monitorados</h2>
          {selectedAsset ? <Button onClick={() => onCheck(selectedAsset.id)} disabled={Boolean(busy)}><RefreshCw className="h-4 w-4" /> Checar ativo selecionado</Button> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase text-[color:var(--ds-text-muted)]">
              <tr><th className="px-3 py-2">Ativo</th><th>Tipo</th><th>Status</th><th>HTTP</th><th>Tempo</th><th>Conteudo</th><th>Links</th><th>SSL</th><th>Ultima checagem</th></tr>
            </thead>
            <tbody>
              {assetsWithChecks.map(({ asset, check }) => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className="cursor-pointer rounded-[18px] bg-white shadow-[var(--ds-shadow-sm)] transition hover:bg-[color:var(--ds-bg-soft)]">
                  <td className="rounded-l-[18px] px-3 py-3"><p className="font-semibold text-[color:var(--ds-text)]">{asset.name}</p><p className="max-w-xs truncate text-xs text-[color:var(--ds-text-muted)]">{asset.url}</p></td>
                  <td>{asset.asset_type}</td>
                  <td><span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${statusDot[asset.last_status]}`} />{statusLabel[asset.last_status]}</span></td>
                  <td>{check?.http_status ?? "-"}</td>
                  <td>{formatMs(check?.response_time_ms)}</td>
                  <td>{check ? contentStatusLabel[check.content_status] ?? check.content_status : "-"}</td>
                  <td>{check ? (check.broken_links_count ? `${check.broken_links_count} atencao` : "OK") : "-"}</td>
                  <td>{check?.ssl_ok == null ? "-" : check.ssl_ok ? "OK" : "Falha"}</td>
                  <td className="rounded-r-[18px] pr-3">{formatRelative(asset.last_checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {selectedAsset ? <AssetDetail asset={selectedAsset} check={selectedCheck} incidents={selectedIncidents} tab={detailTab} setTab={setDetailTab} /> : null}
    </div>
  );
}

function AssetDetail({ asset, check, incidents, tab, setTab }: { asset: PresenceAsset; check: PresenceCheck | null; incidents: PresenceIncident[]; tab: DetailTab; setTab: (tab: DetailTab) => void }) {
  const tabs: Array<[DetailTab, string]> = [["summary", "Resumo"], ["availability", "Disponibilidade"], ["links", "Links"], ["content", "Conteudo"], ["performance", "Performance"], ["incidents", "Incidentes"], ["history", "Historico"]];
  const brokenLinks = resultList(check, "broken_links") as Array<{ url?: string; status?: number }>;
  const scoreExplanation = resultList(check, "score_explanation") as string[];
  const suspiciousEvidence = ((check?.suspicious_evidence?.length ? check.suspicious_evidence : resultList(check, "suspicious_evidence")) as Array<Record<string, unknown>>);
  return (
    <Surface>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">Detalhe do ativo</p>
          <h2 className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">{asset.name}</h2>
          <a href={asset.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-sm text-[color:var(--ds-primary)]">{asset.url}<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        <StatusBadge tone={statusTone[asset.last_status]}>{asset.last_health_score ?? "--"}/100 · {statusLabel[asset.last_status]}</StatusBadge>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => <Button key={id} tone={tab === id ? "primary" : "neutral"} onClick={() => setTab(id)}>{label}</Button>)}
      </div>
      <div className="mt-5 rounded-[22px] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4">
        {tab === "summary" ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Mini label="URL" value={asset.url} /><Mini label="Tipo" value={asset.asset_type} /><Mini label="Ultima checagem" value={formatRelative(asset.last_checked_at)} /><Mini label="SSL" value={check?.ssl_ok == null ? "-" : check.ssl_ok ? "OK" : "Falha"} /><Mini label="Tempo" value={formatMs(check?.response_time_ms)} /><Mini label="Links quebrados" value={String(check?.broken_links_count ?? 0)} /><Mini label="Conteudo" value={check ? contentStatusLabel[check.content_status] ?? check.content_status : "-"} /><Mini label="Mudanca" value={check?.content_change_score == null ? "Sem base" : `${check.content_change_score}%`} /></div> : null}
        {tab === "availability" ? <Mini label="Disponibilidade" value={check?.is_available ? "Online" : check ? "Indisponivel" : "Nao checado"} detail={`HTTP ${check?.http_status ?? "-"} · ${check?.error_message ?? "sem erro registrado"}`} /> : null}
        {tab === "links" ? <List title="Links com atencao" items={brokenLinks.map((link) => `${link.url ?? "URL"} · HTTP ${link.status ?? "erro"}`)} empty="Nenhum link quebrado registrado na ultima checagem." /> : null}
        {tab === "content" ? <ContentIntegrity check={check} scoreExplanation={scoreExplanation} suspiciousEvidence={suspiciousEvidence} /> : null}
        {tab === "performance" ? <Mini label="Tempo de resposta" value={formatMs(check?.response_time_ms)} detail="Threshold inicial: saudavel abaixo de 1500 ms, atencao ate 3000 ms, critico acima de 3000 ms." /> : null}
        {tab === "incidents" ? <IncidentList incidents={incidents} /> : null}
        {tab === "history" ? <Mini label="Historico" value={check ? formatRelative(check.checked_at) : "Sem checagens"} detail="O historico completo fica persistido em presence_checks para analise de queda, recuperacao e tendencia." /> : null}
      </div>
    </Surface>
  );
}

function evidenceValue(item: Record<string, unknown>, key: string) {
  const value = item[key];
  return typeof value === "string" ? value : value == null ? "-" : String(value);
}

function ContentIntegrity({ check, scoreExplanation, suspiciousEvidence }: { check: PresenceCheck | null; scoreExplanation: string[]; suspiciousEvidence: Array<Record<string, unknown>> }) {
  const status = check ? contentStatusLabel[check.content_status] ?? check.content_status : "Sem checagem";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Mini label="Resposta da pagina" value={check?.is_available ? "Pagina respondeu" : check ? "Nao respondeu" : "Nao checado"} detail={check ? `HTTP ${check.http_status ?? "-"}` : undefined} />
        <Mini label="Conteudo" value={status} detail={suspiciousEvidence.length ? "Ha evidencia detalhada abaixo." : "Nenhuma evidencia suspeita registrada no ultimo check."} />
      </div>
      {suspiciousEvidence.length ? <div className="space-y-3">
        <p className="font-semibold text-[color:var(--ds-text)]">Conteudo suspeito</p>
        {suspiciousEvidence.map((item, index) => (
          <div key={`evidence-${index}`} className="rounded-[18px] border border-amber-200 bg-white p-4 text-sm text-[color:var(--ds-text-secondary)]">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge tone="warning">{evidenceValue(item, "category")}</StatusBadge><StatusBadge tone="neutral">{evidenceValue(item, "location")}</StatusBadge><StatusBadge tone="info">{evidenceValue(item, "confidence")}</StatusBadge></div>
            <p className="mt-3 font-semibold text-[color:var(--ds-text)]">Match: {evidenceValue(item, "match")}</p>
            <p className="mt-2 rounded-2xl bg-[color:var(--ds-bg-soft)] p-3 font-mono text-xs leading-5 text-[color:var(--ds-text)]">{evidenceValue(item, "snippet")}</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <Mini label="URL" value={evidenceValue(item, "url")} />
              <Mini label="Status atual" value={evidenceValue(item, "current_status")} />
              <Mini label="Primeira deteccao" value={formatRelative(evidenceValue(item, "first_detected_at"))} />
              <Mini label="Ultima deteccao" value={formatRelative(evidenceValue(item, "last_detected_at"))} />
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <Mini label="Dado observado" value={evidenceValue(item, "observed")} />
              <Mini label="Inferencia" value={evidenceValue(item, "inference")} />
              <Mini label="Recomendacao" value={evidenceValue(item, "recommendation")} />
            </div>
          </div>
        ))}
      </div> : <List title="Conteudo e score" items={scoreExplanation} empty="Sem explicacao de score registrada ainda." />}
    </div>
  );
}

function IncidentList({ incidents }: { incidents: PresenceIncident[] }) {
  return <div><p className="font-semibold text-[color:var(--ds-text)]">Incidentes operacionais do ativo</p>{incidents.length ? <div className="mt-3 space-y-2">{incidents.map((incident) => <div key={incident.id} className="rounded-2xl bg-white p-3 text-sm text-[color:var(--ds-text-secondary)]"><div className="flex flex-wrap gap-2"><StatusBadge tone={incident.severity === "critical" ? "danger" : "warning"}>{incident.severity}</StatusBadge><StatusBadge tone="neutral">{incident.status}</StatusBadge><StatusBadge tone="info">{incident.source_type ?? "REAL"}</StatusBadge></div><p className="mt-2 font-semibold text-[color:var(--ds-text)]">{incident.title}</p>{incident.description ? <p className="mt-1">{incident.description}</p> : null}</div>)}</div> : <p className="mt-2 text-sm text-[color:var(--ds-text-secondary)]">Nenhum incidente operacional registrado para este ativo.</p>}</div>;
}

function QaView({ context }: { context: PresenceContext }) {
  const qaAssets = context.assets.filter((asset) => asset.environment === "dev" || asset.url.startsWith("https://presence-simulated.invalid/") || asset.name.startsWith("QA Presence Center"));
  const qaChecks = context.checks.filter((check) => (check.source_type ?? "REAL") === "SIMULATED");
  const qaIncidents = context.incidents.filter((incident) => (incident.source_type ?? "REAL") === "SIMULATED");
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Ativos QA" value={String(qaAssets.length)} icon={Radar} tone="neutral" /><MetricCard label="Checks simulados" value={String(qaChecks.length)} icon={ShieldCheck} tone="info" /><MetricCard label="Incidentes simulados" value={String(qaIncidents.length)} icon={Siren} tone="warning" /></div>
      <InsightCard title="Separacao operacional" tone="info">Cenarios simulados continuam persistidos para testes, mas nao entram no Health Score real, nos KPIs operacionais ou na visao Especialista.</InsightCard>
      <Surface><List title="Incidentes simulados" items={qaIncidents.map((incident) => `${incident.status} · ${incident.severity} · ${incident.title}`)} empty="Nenhum incidente simulado registrado." /></Surface>
    </div>
  );
}

function LinksView({ assets, pendingLinks, allLinks, assetForm, setAssetForm, createAsset, onDiscover, onApprove, busy }: { assets: PresenceAsset[]; pendingLinks: PresenceDiscoveredLink[]; allLinks: PresenceDiscoveredLink[]; assetForm: { name: string; url: string; asset_type: string; is_critical: boolean; owner: string }; setAssetForm: (value: { name: string; url: string; asset_type: string; is_critical: boolean; owner: string }) => void; createAsset: (event: React.FormEvent<HTMLFormElement>) => void; onDiscover: (assetId: string) => void; onApprove: (linkId: string, action: "monitor" | "critical" | "ignored") => void; busy: string | null }) {
  const mainAsset = assets.find((asset) => asset.asset_type === "main_site") ?? assets[0];
  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
      <Surface>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Sublinks para aprovacao</h2><p className="text-sm text-[color:var(--ds-text-secondary)]">Discovery limitado a ate 30 links internos relevantes. Nada e ativado sem aprovacao.</p></div>
          {mainAsset ? <Button onClick={() => onDiscover(mainAsset.id)} disabled={Boolean(busy)}><Radar className="h-4 w-4" /> Descobrir links</Button> : null}
        </div>
        <div className="space-y-3">
          {pendingLinks.length ? pendingLinks.map((link) => (
            <div key={link.id} className="rounded-[22px] border border-[color:var(--ds-border)] bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0"><p className="font-semibold text-[color:var(--ds-text)]">{link.anchor_text || "Link interno"}</p><p className="truncate text-sm text-[color:var(--ds-text-secondary)]">{link.url}</p><p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">Sugestao: {link.suggested_asset_type}</p></div>
                <div className="flex flex-wrap gap-2"><Button onClick={() => onApprove(link.id, "monitor")}>Monitorar</Button><Button onClick={() => onApprove(link.id, "critical")} tone="primary">Critico</Button><Button onClick={() => onApprove(link.id, "ignored")} tone="danger">Ignorar</Button></div>
              </div>
            </div>
          )) : <EmptyState title="Nenhum sublink pendente">Execute o discovery ou revise os links ja classificados. Total encontrado: {allLinks.length}.</EmptyState>}
        </div>
      </Surface>

      <Surface>
        <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Adicionar ativo manual</h2>
        <form className="mt-4 space-y-3" onSubmit={createAsset}>
          <Input label="Nome" value={assetForm.name} onChange={(value) => setAssetForm({ ...assetForm, name: value })} />
          <Input label="URL" value={assetForm.url} onChange={(value) => setAssetForm({ ...assetForm, url: value })} />
          <label className="block text-sm font-medium text-[color:var(--ds-text-secondary)]">Tipo<select value={assetForm.asset_type} onChange={(event) => setAssetForm({ ...assetForm, asset_type: event.target.value })} className="mt-1 w-full rounded-2xl border border-[color:var(--ds-border)] bg-white px-3 py-2 text-[color:var(--ds-text)]"><option value="landing_page">landing_page</option><option value="checkout">checkout</option><option value="support">support</option><option value="form">form</option><option value="other">other</option></select></label>
          <Input label="Responsavel" value={assetForm.owner} onChange={(value) => setAssetForm({ ...assetForm, owner: value })} />
          <label className="flex items-center gap-2 text-sm text-[color:var(--ds-text-secondary)]"><input type="checkbox" checked={assetForm.is_critical} onChange={(event) => setAssetForm({ ...assetForm, is_critical: event.target.checked })} /> Critico</label>
          <Button type="submit" tone="primary" disabled={Boolean(busy)}><Plus className="h-4 w-4" /> Adicionar ativo</Button>
        </form>
      </Surface>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-[color:var(--ds-text-secondary)]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border border-[color:var(--ds-border)] bg-white px-3 py-2 text-[color:var(--ds-text)]" /></label>;
}

function Mini({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 rounded-[18px] bg-white p-3"><p className="text-xs uppercase text-[color:var(--ds-text-muted)]">{label}</p><p className="mt-1 break-words font-semibold text-[color:var(--ds-text)]">{value}</p>{detail ? <p className="mt-1 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{detail}</p> : null}</div>;
}

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div><p className="font-semibold text-[color:var(--ds-text)]">{title}</p>{items.length ? <ul className="mt-3 space-y-2 text-sm text-[color:var(--ds-text-secondary)]">{items.map((item, index) => <li key={`${item}-${index}`} className="rounded-2xl bg-white p-3">{item}</li>)}</ul> : <p className="mt-2 text-sm text-[color:var(--ds-text-secondary)]">{empty}</p>}</div>;
}
