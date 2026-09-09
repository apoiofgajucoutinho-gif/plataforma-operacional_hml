"use client";

import { AlertTriangle, Beaker, CheckCircle2, Copy, LineChart, Link2, LockKeyhole, Megaphone, RefreshCw, Target, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { buildGrowthAnalysis, type GrowthAnalysis, type GrowthDiagnostic, type GrowthMetric } from "@/modules/norwyn/services/growth-intelligence";
import { listGrowthCampaignOptions, listGrowthProductOptions, type GrowthPeriodPreset } from "@/modules/norwyn/services/growth-context-resolver";
import type { LandingReadinessReport, LandingSeverity } from "@/modules/norwyn/services/landing-intelligence";
import { buildNorwynTrackingUrl, normalizeTrackingKey, validateTrackingUrl } from "@/modules/norwyn/services/tracking-hardening";
import type { NorwynContext } from "@/modules/norwyn/types";

type TestLabSummary = GrowthAnalysis["testLab"] & {
  refreshedAt?: string | null;
  latestSession?: {
    funnelSessionId: string;
    firstEventAt: string | null;
    lastEventAt: string | null;
    events: Array<{ eventType: string; occurredAt: string }>;
    abandonment25to50Approved: boolean;
  } | null;
};

type ReadinessIssueSelection = {
  landingKey: string;
  landingName: string;
  landingUrl: string;
  contentHash: string;
  detectedAt: string;
  issue: LandingReadinessReport["landings"][number]["issues"][number];
} | null;

export function GrowthIntelligence({ context }: { context: NorwynContext }) {
  const contextControlClass = "h-10 w-full min-w-0 rounded-md border border-brand-sand bg-white px-3 text-sm font-medium normal-case text-brand-teal shadow-sm outline-none focus:border-brand-teal disabled:bg-brand-cream/60 disabled:text-brand-teal/50";
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const productOptions = useMemo(() => listGrowthProductOptions(context), [context]);
  const selectedProductOption = productOptions.find((product) => product.id === selectedProductId) ?? null;
  const selectedProduct = selectedProductOption?.product ?? null;
  const campaignOptions = useMemo(() => listGrowthCampaignOptions(context, selectedProduct, selectedProductOption?.hotmartProductId ?? null), [context, selectedProduct, selectedProductOption?.hotmartProductId]);
  const [selectedCampaignKey, setSelectedCampaignKey] = useState<string>("");
  const [periodPreset, setPeriodPreset] = useState<GrowthPeriodPreset>("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const selectedCampaign = campaignOptions.find((campaign) => campaign.key === selectedCampaignKey) ?? null;
  const analysis = buildGrowthAnalysis(context, {
    productId: selectedProductId || null,
    campaignKey: selectedCampaignKey && selectedCampaignKey !== "__all_product_campaigns" ? selectedCampaign?.key ?? selectedCampaignKey : null,
    periodPreset,
    start: customStart || null,
    end: customEnd || null,
  });
  const [testLab, setTestLab] = useState<TestLabSummary>(analysis.testLab);
  const [isRefreshingTestLab, setIsRefreshingTestLab] = useState(false);
  const [testLabError, setTestLabError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<LandingReadinessReport | null>(null);
  const [isRefreshingReadiness, setIsRefreshingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [selectedReadinessIssue, setSelectedReadinessIssue] = useState<ReadinessIssueSelection>(null);
  const [createdReadinessTasks, setCreatedReadinessTasks] = useState<Record<string, string>>({});
  const [isCreatingReadinessTask, setIsCreatingReadinessTask] = useState(false);
  const [landingPage, setLandingPage] = useState(analysis.product?.link_oferta || "https://pagina.com/oferta");
  const [adsetKey, setAdsetKey] = useState("audience");
  const [creativeKey, setCreativeKey] = useState("creative");
  const trackingUrl = useMemo(() => {
    try {
      return buildNorwynTrackingUrl({
        landingPage,
        productKey: analysis.product?.nome_oficial ?? analysis.product?.produto_base ?? analysis.campaign?.name,
        campaignKey: analysis.campaign?.name ?? "campanha_norwyn",
        adsetKey,
        creativeKey,
      });
    } catch {
      return "";
    }
  }, [adsetKey, analysis.campaign?.name, analysis.product?.link_oferta, analysis.product?.nome_oficial, analysis.product?.produto_base, creativeKey, landingPage]);
  const trackingUrlIssues = trackingUrl ? validateTrackingUrl(trackingUrl, true) : [{ severity: "critical" as const, title: "URL base invalida", detail: "Informe uma landing page valida." }];
  const heroMetrics = [
    analysis.metrics.media.find((item) => item.key === "spend"),
    analysis.metrics.conversion.find((item) => item.key === "revenue"),
    analysis.metrics.conversion.find((item) => item.key === "roas"),
    analysis.metrics.conversion.find((item) => item.key === "sales"),
    analysis.metrics.conversion.find((item) => item.key === "cpa"),
  ].filter(Boolean) as GrowthMetric[];
  const refreshTestLab = async () => {
    setIsRefreshingTestLab(true);
    setTestLabError(null);
    try {
      const result = await fetch("/api/norwyn/funnel-events?summary=funnel_lab", { cache: "no-store" });
      const data = await result.json().catch(() => null);
      if (!result.ok) throw new Error(data?.error ?? "Falha ao atualizar dados TEST.");
      setTestLab(data as TestLabSummary);
    } catch (error) {
      setTestLabError(error instanceof Error ? error.message : "Falha ao atualizar dados TEST.");
    } finally {
      setIsRefreshingTestLab(false);
    }
  };
  const refreshReadiness = async () => {
    if (!selectedProductId) {
      setReadiness(null);
      setReadinessError(null);
      return;
    }
    setIsRefreshingReadiness(true);
    setReadinessError(null);
    try {
      const params = new URLSearchParams();
      if (analysis.resolvedContext.campaignKey) params.set("campaign_key", analysis.resolvedContext.campaignKey);
      if (analysis.product?.id) params.set("product_id", analysis.product.id);
      if (analysis.resolvedContext.hotmartProductId) params.set("hotmart_product_id", analysis.resolvedContext.hotmartProductId);
      params.set("start", analysis.dateRange.start ?? "");
      params.set("end", analysis.dateRange.end ?? "");
      const result = await fetch(`/api/norwyn/landing-readiness?${params.toString()}`, { cache: "no-store" });
      const data = await result.json().catch(() => null);
      if (!result.ok) throw new Error(data?.error ?? "Falha ao analisar landings.");
      setReadiness(data as LandingReadinessReport);
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : "Falha ao analisar landings.");
    } finally {
      setIsRefreshingReadiness(false);
    }
  };
  const createReadinessTask = async () => {
    if (!selectedReadinessIssue) return;
    setIsCreatingReadinessTask(true);
    try {
      const { issue } = selectedReadinessIssue;
      const result = await fetch("/api/norwyn/landing-readiness/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${issue.title} - ${readiness?.campaign.name ?? analysis.resolvedContext.campaignLabel ?? "Growth"}`,
          description: issue.description,
          severity: issue.severity,
          campaign_key: readiness?.campaign.key ?? analysis.resolvedContext.campaignKey ?? "NO_CAMPAIGN_SELECTED",
          landing_key: selectedReadinessIssue.landingKey,
          url: selectedReadinessIssue.landingUrl,
          evidence: issue.evidence.map((evidence) => `${evidence.value}: ${evidence.source}`),
          rule_id: issue.ruleId,
          content_hash: selectedReadinessIssue.contentHash,
          detected_at: selectedReadinessIssue.detectedAt,
        }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok) throw new Error(data?.error ?? "Falha ao criar tarefa.");
      const signature = `${selectedReadinessIssue.landingKey}:${issue.ruleId}:${selectedReadinessIssue.contentHash}`;
      setCreatedReadinessTasks((current) => ({ ...current, [signature]: data.mission_os_id ?? "TASK" }));
      setSelectedReadinessIssue(null);
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : "Falha ao criar tarefa.");
    } finally {
      setIsCreatingReadinessTask(false);
    }
  };

  useEffect(() => {
    if (!selectedProductId) {
      setReadiness(null);
      return;
    }
    if (advancedOpen) void refreshTestLab();
    void refreshReadiness();
  }, [selectedProductId, selectedCampaignKey, periodPreset, customStart, customEnd, advancedOpen]);

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="rounded-md border border-brand-sand bg-white/85 px-3 py-2 text-xs font-black uppercase text-brand-teal"
        >
          {advancedOpen ? "Ocultar Advanced / Lab" : "Advanced / Lab"}
        </button>
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="mb-5 rounded-md border border-brand-sand bg-white/85 p-4">
          <p className="text-[11px] font-black uppercase text-brand-clay">Growth Context</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Cliente">
              <input value={context.tenant?.nome ?? "Tenant indisponivel"} readOnly className={`${contextControlClass} bg-brand-cream/40`} />
            </Field>
            <Field label="Produto">
              <select value={selectedProductId} onChange={(event) => { const value = event.target.value; setSelectedProductId(value); setSelectedCampaignKey(value ? "__all_product_campaigns" : ""); }} className={contextControlClass}>
                <option value="">Selecionar produto</option>
                {productOptions.map((product) => <option key={product.id} value={product.id}>{product.label}{product.source === "products" ? "" : ` (${product.source})`}</option>)}
              </select>
            </Field>
            <Field label="Campanha">
              <select value={selectedCampaignKey} onChange={(event) => setSelectedCampaignKey(event.target.value)} className={contextControlClass} disabled={!selectedProductId}>
                {!selectedProductId ? <option value="">Selecione produto</option> : null}
                {selectedProductId ? <option value="__all_product_campaigns">Todas as campanhas do produto</option> : null}
                {selectedProductId && campaignOptions.length ? campaignOptions.map((campaign) => <option key={campaign.key} value={campaign.key}>{campaign.label} ({campaign.source})</option>) : null}
                {selectedProductId && !campaignOptions.length ? <option value="">Nenhuma campanha relacionada</option> : null}
              </select>
              {selectedProductId && !campaignOptions.length ? <p className="mt-1 text-xs font-semibold text-amber-700">Configurar relacionamento</p> : null}
            </Field>
            <Field label="Periodo">
              <select value={periodPreset} onChange={(event) => setPeriodPreset(event.target.value as GrowthPeriodPreset)} className={contextControlClass}>
                <option value="today">Hoje</option>
                <option value="last_7_days">Ultimos 7 dias</option>
                <option value="last_30_days">Ultimos 30 dias</option>
                <option value="campaign_full">Campanha inteira</option>
                <option value="custom">Personalizado</option>
              </select>
            </Field>
          </div>
          {periodPreset === "custom" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Inicio"><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className={contextControlClass} /></Field>
              <Field label="Fim"><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className={contextControlClass} /></Field>
            </div>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <MiniMetric label="Periodo resolvido" value={`${analysis.dateRange.start ?? "N/A"} a ${analysis.dateRange.end ?? "N/A"}`} />
            <MiniMetric label="Landings" value={analysis.resolvedContext.landings.length ? String(analysis.resolvedContext.landings.length) : "NO LANDING REGISTERED"} />
            <MiniMetric label="Meta campaigns" value={String(analysis.resolvedContext.metaCampaigns.length)} />
            <MiniMetric label="Hotmart IDs" value={String(analysis.resolvedContext.hotmartProducts.length)} />
          </div>
        </div>
        {!selectedProductOption ? (
          <div className="rounded-md border border-brand-sand bg-brand-cream/45 p-5">
            <p className="text-xs font-black uppercase text-brand-clay">Selecione um contexto</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-teal">Escolha um produto para iniciar a Control Tower</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-teal/70">
              Escolha um produto e, opcionalmente, uma campanha para analisar performance, funil, readiness e recomendacoes. Sem produto selecionado, a Norwyn nao mostra spend, revenue, vendas, incidentes ou attribution especifica.
            </p>
          </div>
        ) : (
        <>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-brand-clay">Norwyn Growth Intelligence</p>
            <h2 className="mt-1 text-2xl font-semibold text-brand-teal">
              {analysis.campaign?.name ?? "Campanha nao selecionada"}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-brand-teal/70">{analysis.executiveSummary}</p>
          </div>
          <StatusBadge analysis={analysis} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {heroMetrics.map((item) => <MetricCard key={item.key} metric={item} />)}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-md border border-brand-sand bg-brand-cream/45 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Funil operacional</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.funnelSteps.map((step) => (
                <span key={step} className="rounded-md border border-brand-sand bg-white/80 px-3 py-1.5 text-xs font-bold text-brand-teal">
                  {step}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-brand-teal/60">
              Tipo detectado: {analysis.funnelType}. Etapas sem eventos disponiveis aparecem como dados indisponiveis.
            </p>
          </div>
          <div className="rounded-md border border-brand-sand bg-white/80 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Progresso e meta</p>
            {analysis.benchmarks.map((item) => (
              <p key={`${item.metric}-${item.source}`} className="mt-2 text-sm leading-6 text-brand-teal/70">
                <strong>{item.metric}:</strong> {item.description} Fonte: {item.source}.
              </p>
            ))}
          </div>
        </div>
        </>
        )}
      </Card>

      {selectedProduct ? (
      <>
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="Campaign Readiness" />
          <button
            type="button"
            onClick={() => void refreshReadiness()}
            disabled={isRefreshingReadiness}
            className="inline-flex items-center gap-2 rounded-md border border-brand-sand bg-white/85 px-3 py-2 text-xs font-black uppercase text-brand-teal transition hover:bg-brand-cream/60 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingReadiness ? "animate-spin" : ""}`} />
            Analisar landings
          </button>
        </div>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          As landings registradas para o contexto selecionado sao analisadas em modo read-only. A Norwyn nao altera landing, checkout, Hotmart, Meta Ads ou orcamento.
        </p>
        {readinessError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{readinessError}</p> : null}
        {readiness ? (
          <>
            <div className="mt-4 rounded-md border border-brand-sand bg-white/85 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase text-brand-clay">Operation Mode</p>
                  <h3 className="mt-1 text-xl font-semibold text-brand-teal">{readiness.operationMode.mode}</h3>
                  <p className="mt-2 text-sm leading-6 text-brand-teal/70">External owner: {readiness.operationMode.externalOwner}. Norwyn: {readiness.operationMode.norwynRole}.</p>
                </div>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase text-amber-900">Shadow Operation</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <NarrativePanelInline title="Pode fazer" items={readiness.operationMode.canDo} />
                <NarrativePanelInline title="Nao pode fazer" items={readiness.operationMode.cannotDo} />
              </div>
            </div>
            {readiness.monitoring ? (
              <div className="mt-4 rounded-md border border-brand-sand bg-white/85 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase text-brand-clay">Monitoramento ativo</p>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-800">ACTIVE/MONITORED</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  <MiniMetric label="Ultima verificacao" value={formatDateTime(readiness.monitoring.lastCheckedAt)} />
                  <MiniMetric label="Proxima verificacao" value={formatDateTime(readiness.monitoring.nextCheckAt)} />
                  <MiniMetric label="Ultima mudanca" value={formatDateTime(readiness.monitoring.lastChangeAt)} />
                  <MiniMetric label="Issues abertas" value={String(readiness.monitoring.openIssues)} />
                  <MiniMetric label="Historico" value={`${readiness.monitoring.changeLog.length} eventos`} />
                </div>
              </div>
            ) : null}
            {readiness.sourceHealth?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {readiness.sourceHealth.map((source) => (
                  <div key={source.source} className="rounded-md border border-brand-sand bg-white/85 p-3">
                    <p className="text-[10px] font-black uppercase text-brand-clay">{source.source}</p>
                    <p className="mt-2 text-base font-semibold text-brand-teal">{source.status}</p>
                    <p className="mt-1 text-xs leading-5 text-brand-teal/60">{source.detail}</p>
                    <p className="mt-1 text-xs text-brand-teal/50">Atualizado: {formatDateTime(source.lastUpdatedAt)}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {readiness.shadowOperation?.currentIncident ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
                <p className="text-[11px] font-black uppercase">Incident Learning</p>
                <h3 className="mt-1 text-lg font-semibold">{readiness.shadowOperation.currentIncident.title}</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <MiniMetric label="Status" value={readiness.shadowOperation.currentIncident.status} />
                  <MiniMetric label="Owner externo" value={readiness.shadowOperation.currentIncident.externalOwner} />
                  <MiniMetric label="Assets afetados" value={readiness.shadowOperation.currentIncident.affectedAssets.join(", ")} />
                  <MiniMetric label="Detectado em" value={formatDateTime(readiness.shadowOperation.currentIncident.detectedAt)} />
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <NarrativePanelInline title="Evidencias preservadas" items={readiness.shadowOperation.currentIncident.evidence.slice(0, 8)} />
                  <NarrativePanelInline title="Confirmed / Potential / Unknown" items={[
                    `CONFIRMED: ${JSON.stringify(readiness.shadowOperation.currentIncident.confirmedImpact)}`,
                    `POTENTIAL: ${JSON.stringify(readiness.shadowOperation.currentIncident.potentialImpact)}`,
                    ...readiness.shadowOperation.currentIncident.unknown.map((item) => `UNKNOWN: ${item}`),
                  ]} />
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {readiness.landings.map((landing) => (
                <article key={landing.registry.landing_key} className="rounded-md border border-brand-sand bg-white/85 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase text-brand-clay">{landing.registry.landing_name}</p>
                      <h3 className="mt-1 text-lg font-semibold text-brand-teal">{landing.registry.url}</h3>
                    </div>
                    <span className={`rounded-md border px-3 py-2 text-xs font-black uppercase ${preflightTone(landing.preflight.status)}`}>
                      {landing.preflight.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <MiniMetric label="Hash" value={landing.contentHash} />
                    <MiniMetric label="CTAs" value={String(landing.extraction.ctas.length)} />
                    <MiniMetric label="Issues" value={landing.preflight.reason} />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {landing.issues.filter((issue) => issue.severity !== "INFO" && issue.severity !== "PASS").slice(0, 5).map((issue) => (
                      <div key={`${landing.registry.landing_key}-${issue.ruleId}`} className={`rounded-md border p-3 text-sm ${severityTone(issue.severity)}`}>
                        <p className="text-[11px] font-black uppercase">{issue.severity} - {issue.category}</p>
                        <p className="mt-1 font-semibold">{issue.title}</p>
                        <p className="mt-1 leading-5">{issue.recommendation}</p>
                        {issue.evidence.length ? (
                          <ul className="mt-2 grid gap-1 text-xs leading-5">
                            {issue.evidence.slice(0, 4).map((evidence) => (
                              <li key={`${evidence.label}-${evidence.value}`}>- {evidence.value}: {evidence.source}</li>
                            ))}
                          </ul>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedReadinessIssue({
                            landingKey: landing.registry.landing_key,
                            landingName: landing.registry.landing_name,
                            landingUrl: landing.registry.url,
                            contentHash: landing.contentHash,
                            detectedAt: landing.fetchedAt,
                            issue,
                          })}
                          className="mt-3 rounded-md border border-current px-3 py-2 text-xs font-black uppercase"
                        >
                          Criar tarefa Mission OS
                        </button>
                        {createdReadinessTasks[`${landing.registry.landing_key}:${issue.ruleId}:${landing.contentHash}`] ? (
                          <p className="mt-2 text-xs font-semibold">Mission OS: {createdReadinessTasks[`${landing.registry.landing_key}:${issue.ruleId}:${landing.contentHash}`]} - Status: BACKLOG</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">Comparacao V1 x V5</p>
              <table className="mt-3 min-w-full text-left text-sm">
                <thead className="text-[11px] font-black uppercase text-brand-clay">
                  <tr className="border-b border-brand-sand">
                    <th className="py-2 pr-4">Campo</th>
                    <th className="py-2 pr-4">V1</th>
                    <th className="py-2 pr-4">V5</th>
                    <th className="py-2 pr-4">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {readiness.comparison.map((row) => (
                    <tr key={row.field} className="border-b border-brand-sand/70 align-top">
                      <td className="py-3 pr-4 font-semibold text-brand-teal">{row.field}</td>
                      <td className="max-w-sm py-3 pr-4 text-brand-teal/70">{row.v1}</td>
                      <td className="max-w-sm py-3 pr-4 text-brand-teal/70">{row.v5}</td>
                      <td className="max-w-xs py-3 pr-4 text-brand-teal/60">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <NarrativePanelInline title="FACT / OBSERVATION / NEXT" items={readiness.strategistContext.map((item) => `${item.type}: ${item.text}`)} />
              <NarrativePanelInline title="URLs TEST" items={readiness.trackingTestUrls.map((item) => `${item.landingKey}: ${item.url}`)} />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <NarrativePanelInline title="Meta -> Landing dry-run" items={[
                `Linhas analisadas: ${readiness.metaResolutionDryRun?.rowsAnalyzed ?? 0}`,
                `V1: ${readiness.metaResolutionDryRun?.v1 ?? 0}`,
                `V5: ${readiness.metaResolutionDryRun?.v5 ?? 0}`,
                `Outras: ${readiness.metaResolutionDryRun?.other ?? 0}`,
                `UNKNOWN: ${readiness.metaResolutionDryRun?.unknown ?? 0}`,
                `HIGH: ${readiness.metaResolutionDryRun?.high ?? 0} / LOW: ${readiness.metaResolutionDryRun?.low ?? 0}`,
              ]} />
              <NarrativePanelInline title="Tracking dinamico CTA" items={(readiness.dynamicTracking ?? []).flatMap((item) => [
                `${item.landingKey}: ${item.href ?? "CTA indisponivel"}`,
                ...item.parameters.map((param) => `${item.landingKey} ${param.key}: ${param.status} - ${param.evidence}`),
              ]).slice(0, 24)} />
            </div>
            <div className="mt-4 overflow-x-auto rounded-md border border-brand-sand bg-white/85 p-4">
              <p className="text-[11px] font-black uppercase text-brand-clay">Landing Performance</p>
              <table className="mt-3 min-w-full text-left text-sm">
                <thead className="text-[11px] font-black uppercase text-brand-clay">
                  <tr className="border-b border-brand-sand">
                    {["Landing", "Spend", "Impressions", "Link Clicks", "Meta LPV", "Norwyn Views", "CTA Views", "CTA Clicks", "Checkout", "Purchases", "Revenue", "CPA", "ROAS", "Confidence"].map((header) => <th key={header} className="py-2 pr-4">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(readiness.landingPerformance ?? []).map((row) => (
                    <tr key={row.landingKey} className="border-b border-brand-sand/70">
                      <td className="py-3 pr-4 font-semibold text-brand-teal">{row.landingKey}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableCurrency(row.spend)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.impressions)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.linkClicks)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.metaLpv)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.norwynViews)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.ctaViews)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.ctaClicks)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.checkout)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableNumber(row.purchases)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableCurrency(row.revenue)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{formatNullableCurrency(row.cpa)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{row.roas === null ? "Dados indisponiveis" : row.roas.toFixed(2).replace(".", ",")}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{row.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {readiness.shadowOperation ? (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {readiness.shadowOperation.scorecard.map((item) => (
                    <div key={item.label} className="rounded-md border border-brand-sand bg-white/85 p-3">
                      <p className="text-[10px] font-black uppercase text-brand-clay">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-brand-teal">{item.value}</p>
                      <p className="mt-1 text-xs leading-5 text-brand-teal/60">{item.note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 overflow-x-auto rounded-md border border-brand-sand bg-white/85 p-4">
                  <p className="text-[11px] font-black uppercase text-brand-clay">Norwyn Takeover Readiness</p>
                  <table className="mt-3 min-w-full text-left text-sm">
                    <thead className="text-[11px] font-black uppercase text-brand-clay">
                      <tr className="border-b border-brand-sand">
                        <th className="py-2 pr-4">Dominio</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Evidencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readiness.shadowOperation.takeoverReadiness.map((item) => (
                        <tr key={item.domain} className="border-b border-brand-sand/70 align-top">
                          <td className="py-3 pr-4 font-semibold text-brand-teal">{item.domain}</td>
                          <td className="py-3 pr-4 text-brand-teal/70">{item.status}</td>
                          <td className="py-3 pr-4 text-brand-teal/65">{item.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <NarrativePanelInline title="Norwyn Growth Playbook" items={readiness.shadowOperation.playbookRules.map((rule) => `${rule.category} / ${rule.severity} / ${rule.status}: ${rule.rule}`)} />
                  <NarrativePanelInline title="Change Log" items={(readiness.monitoring?.changeLog ?? []).map((item) => `${formatDateTime(item.detectedAt)} - ${item.landingKey} - ${item.status}: ${item.message}`)} />
                </div>
              </>
            ) : null}
          </>
        ) : (
          <EmptyState>{isRefreshingReadiness ? "Analisando landings..." : "Nenhuma analise de readiness carregada ainda."}</EmptyState>
        )}
      </Card>
      {selectedReadinessIssue ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-md bg-white p-5 shadow-xl">
            <p className="text-xs font-black uppercase text-brand-clay">Confirmar tarefa Mission OS</p>
            <h3 className="mt-2 text-xl font-semibold text-brand-teal">{selectedReadinessIssue.issue.title}</h3>
            <div className="mt-4 grid gap-2 text-sm leading-6 text-brand-teal/70">
              <p><strong>Descricao:</strong> {selectedReadinessIssue.issue.description}</p>
              <p><strong>Prioridade:</strong> {selectedReadinessIssue.issue.severity}</p>
              <p><strong>Campanha:</strong> {readiness?.campaign.key}</p>
              <p><strong>Landing:</strong> {selectedReadinessIssue.landingKey}</p>
              <p><strong>URL:</strong> {selectedReadinessIssue.landingUrl}</p>
              <p><strong>Regra QA:</strong> {selectedReadinessIssue.issue.ruleId}</p>
              <p><strong>Snapshot/hash:</strong> {selectedReadinessIssue.contentHash}</p>
              <p><strong>Deteccao:</strong> {new Date(selectedReadinessIssue.detectedAt).toLocaleString("pt-BR")}</p>
            </div>
            <ul className="mt-3 grid gap-1 text-xs leading-5 text-brand-teal/60">
              {selectedReadinessIssue.issue.evidence.map((evidence) => <li key={`${evidence.label}-${evidence.value}`}>- {evidence.value}: {evidence.source}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setSelectedReadinessIssue(null)} className="rounded-md border border-brand-sand px-4 py-2 text-sm font-bold text-brand-teal">Cancelar</button>
              <button type="button" onClick={() => void createReadinessTask()} disabled={isCreatingReadinessTask} className="rounded-md bg-brand-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {isCreatingReadinessTask ? "Criando..." : "Confirmar criacao"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<LineChart className="h-5 w-5" />} title="Full Funnel Observability" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analysis.funnelObservability.coverage.map((item) => (
            <div key={item.label} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-[10px] font-black uppercase text-brand-clay">{qualityPrefix(item.status)} {item.label}</p>
              <p className="mt-2 text-sm leading-6 text-brand-teal/70">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-brand-sand bg-white/85 p-4">
          <p className="text-[11px] font-black uppercase text-brand-clay">Etapas observadas</p>
          <table className="mt-3 min-w-full text-left text-sm">
            <thead className="text-[11px] font-black uppercase text-brand-clay">
              <tr className="border-b border-brand-sand">
                <th className="py-2 pr-4">Etapa</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Fonte</th>
                <th className="py-2 pr-4">Confianca</th>
                <th className="py-2 pr-4">Nota</th>
              </tr>
            </thead>
            <tbody>
              {analysis.funnelObservability.steps.map((step) => (
                <tr key={step.key} className="border-b border-brand-sand/70 align-top">
                  <td className="py-3 pr-4 font-semibold text-brand-teal">{step.label}</td>
                  <td className="py-3 pr-4 text-brand-teal/70">{step.value === null ? "Dados indisponiveis" : step.value.toLocaleString("pt-BR")}</td>
                  <td className="py-3 pr-4 text-brand-teal/70">{step.source}</td>
                  <td className="py-3 pr-4 text-brand-teal/70">{step.confidence}</td>
                  <td className="max-w-md py-3 pr-4 text-brand-teal/65">{step.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <NarrativePanelInline title="Contrato VSL" items={analysis.funnelObservability.vslAdapterContract} />
          <div className="rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Snippet landing externo</p>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-brand-cream/60 p-3 text-xs leading-5 text-brand-teal/75">
              {analysis.funnelObservability.trackingSnippet}
            </pre>
          </div>
        </div>
      </Card>

      {advancedOpen ? (
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={<Beaker className="h-5 w-5" />} title="Norwyn Funnel Lab - TEST" />
          <button
            type="button"
            onClick={() => void refreshTestLab()}
            disabled={isRefreshingTestLab}
            className="inline-flex items-center gap-2 rounded-md border border-brand-sand bg-white/85 px-3 py-2 text-xs font-black uppercase text-brand-teal transition hover:bg-brand-cream/60 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingTestLab ? "animate-spin" : ""}`} />
            Atualizar dados
          </button>
        </div>
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Eventos TEST sao exibidos aqui para validacao tecnica e nao entram nos indicadores reais de campanha, receita, CPA ou ROAS.
        </p>
        {testLabError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{testLabError}</p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <MiniMetric label="Environment" value={testLab.environment} />
          <MiniMetric label="Sessions" value={String(testLab.sessions)} />
          <MiniMetric label="Ultimo evento" value={testLab.lastEventAt ? new Date(testLab.lastEventAt).toLocaleString("pt-BR") : "N/A"} />
          <MiniMetric label="Atualizado em" value={testLab.refreshedAt ? new Date(testLab.refreshedAt).toLocaleString("pt-BR") : "Snapshot inicial"} />
          <MiniMetric label="Abandono 25-50" value={testLab.latestSession ? (testLab.latestSession.abandonment25to50Approved ? "Aprovado" : "Nao aprovado") : "N/A"} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {testLab.events.map((item) => (
            <MiniMetric key={item.eventType} label={item.eventType} value={String(item.count)} />
          ))}
        </div>
        {testLab.latestSession ? (
          <div className="mt-4 rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Sessao mais recente</p>
            <p className="mt-2 break-all text-xs leading-5 text-brand-teal/65">{testLab.latestSession.funnelSessionId}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {testLab.latestSession.events.map((event) => (
                <p key={`${event.eventType}-${event.occurredAt}`} className="rounded-md border border-brand-sand bg-brand-cream/35 p-2 text-xs leading-5 text-brand-teal/65">
                  <strong>{event.eventType}</strong><br />
                  {new Date(event.occurredAt).toLocaleString("pt-BR")}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4 rounded-md border border-brand-sand bg-white/85 p-4">
          <p className="text-[11px] font-black uppercase text-brand-clay">Tracking recebido</p>
          {testLab.trackingKeys.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {testLab.trackingKeys.map((item) => (
                <p key={item.label} className="break-all text-xs leading-5 text-brand-teal/65">
                  <strong>{item.label}:</strong> {item.value}
                </p>
              ))}
            </div>
          ) : (
            <EmptyState>Nenhum evento de lab encontrado ainda.</EmptyState>
          )}
        </div>
      </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <NarrativePanel title="O que esta funcionando" items={analysis.whatIsWorking} icon={<CheckCircle2 className="h-5 w-5" />} />
        <NarrativePanel title="O que preocupa" items={analysis.concerns.length ? analysis.concerns : ["Nenhum alerta forte alem das lacunas de dados."]} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Target className="h-5 w-5" />} title="Funnel Diagnostic Engine" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {analysis.recommendations.map((item) => <DiagnosticCard key={item.id} item={item} />)}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MetricGroup title="Midia" metrics={analysis.metrics.media} />
        <MetricGroup title="Conversao" metrics={analysis.metrics.conversion} />
        <MetricGroup title="Produto" metrics={analysis.metrics.product} />
        <MetricGroup title="Funil" metrics={analysis.metrics.funnel} />
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle icon={<LineChart className="h-5 w-5" />} title="Atribuicao" />
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="rounded-md border border-brand-sand bg-white/85 px-3 py-2 text-xs font-black uppercase text-brand-teal"
          >
            Ver detalhes da atribuicao
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniMetric label="Vendas" value={String(analysis.attribution.coverage.totalSales)} />
          <MiniMetric label="Atribuidas" value={String(analysis.attribution.coverage.attributedSales)} />
          <MiniMetric label="Sem atribuicao" value={String(analysis.attribution.coverage.unattributedSales)} />
          <MiniMetric label="Receita atribuida" value={currency(analysis.attribution.coverage.attributedRevenue)} />
          <MiniMetric label="Receita sem origem" value={currency(analysis.attribution.coverage.unattributedRevenue)} />
          <MiniMetric label="Cobertura" value={analysis.attribution.coverage.coveragePercent === null ? "N/A" : `${analysis.attribution.coverage.coveragePercent.toFixed(1).replace(".", ",")}%`} />
        </div>

        {advancedOpen ? (
        <>
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Qualidade da atribuicao</p>
            <div className="mt-3 grid gap-2">
              {analysis.attribution.quality.map((item) => (
                <p key={item.label} className="text-sm leading-6 text-brand-teal/70">
                  <span className="font-semibold text-brand-teal">{qualityPrefix(item.status)} {item.label}:</span> {item.detail}
                </p>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-brand-teal/55">
              LOW indica apenas inferencia temporal/textual. Nao e atribuicao confirmada.
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-brand-sand bg-white/85 p-4">
            <p className="text-[11px] font-black uppercase text-brand-clay">Campanhas relacionadas</p>
            {analysis.attribution.campaigns.length ? (
              <table className="mt-3 min-w-full text-left text-sm">
                <thead className="text-[11px] font-black uppercase text-brand-clay">
                  <tr className="border-b border-brand-sand">
                    <th className="py-2 pr-4">Campanha</th>
                    <th className="py-2 pr-4">Gasto observado</th>
                    <th className="py-2 pr-4">Vendas atribuidas</th>
                    <th className="py-2 pr-4">Receita atribuida</th>
                    <th className="py-2 pr-4">ROAS atribuivel</th>
                    <th className="py-2 pr-4">Confianca</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.attribution.campaigns.slice(0, 12).map((item) => (
                    <tr key={item.campaignName} className="border-b border-brand-sand/70">
                      <td className="py-3 pr-4 font-semibold text-brand-teal">{item.campaignName}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{currency(item.spend)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{item.attributedSales}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{currency(item.attributedRevenue)}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{item.roas === null ? "N/A" : item.roas.toFixed(2).replace(".", ",")}</td>
                      <td className="py-3 pr-4 text-brand-teal/70">{item.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>Nenhuma campanha recebeu atribuicao confirmada no recorte.</EmptyState>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <NarrativePanelInline title="Campos encontrados" items={analysis.attribution.trackingFieldsFound} />
          <NarrativePanelInline title="Ainda faltam" items={analysis.attribution.trackingFieldsMissing} />
        </div>
        </>
        ) : null}
      </Card>

      {advancedOpen ? (
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Link2 className="h-5 w-5" />} title="Tracking URL Builder" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr]">
          <Field label="Landing page">
            <input value={landingPage} onChange={(event) => setLandingPage(event.target.value)} className="form-input" />
          </Field>
          <Field label="Audience/adset key">
            <input value={adsetKey} onChange={(event) => setAdsetKey(event.target.value)} className="form-input" />
          </Field>
          <Field label="Creative key">
            <input value={creativeKey} onChange={(event) => setCreativeKey(event.target.value)} className="form-input" />
          </Field>
        </div>
        <div className="mt-4 rounded-md border border-brand-sand bg-white/85 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase text-brand-clay">URL final</p>
            <button
              type="button"
              onClick={() => trackingUrl && navigator.clipboard?.writeText(trackingUrl)}
              className="inline-flex items-center gap-2 rounded-md border border-brand-sand px-3 py-2 text-xs font-black uppercase text-brand-teal"
            >
              <Copy className="h-4 w-4" /> Copiar
            </button>
          </div>
          <p className="mt-3 break-all text-xs leading-5 text-brand-teal/70">{trackingUrl || "URL invalida"}</p>
          <div className="mt-3 grid gap-1 text-xs leading-5 text-brand-teal/60">
            <p>campaign_key: {normalizeTrackingKey(analysis.campaign?.name ?? "campanha_norwyn")}</p>
            <p>creative_key: {normalizeTrackingKey(creativeKey)}</p>
          </div>
          {trackingUrlIssues.length ? (
            <div className="mt-3 grid gap-1">
              {trackingUrlIssues.map((issue) => (
                <p key={`${issue.title}-${issue.detail}`} className={issue.severity === "critical" ? "text-xs font-semibold text-red-700" : "text-xs font-semibold text-amber-700"}>
                  {issue.title}: {issue.detail}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-emerald-700">Tracking minimo presente.</p>
          )}
        </div>
      </Card>
      ) : null}

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<Megaphone className="h-5 w-5" />} title="Ranking de criativos" />
        {!analysis.attribution.canCompareCreatives ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            A cobertura de atribuicao ainda nao permite comparar criativos como vencedores/perdedores. Use o ranking como leitura de midia, nao como prova causal.
          </p>
        ) : null}
        {analysis.creatives.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] font-black uppercase text-brand-clay">
                <tr className="border-b border-brand-sand">
                  <th className="py-2 pr-4">Criativo</th>
                  <th className="py-2 pr-4">Gasto</th>
                  <th className="py-2 pr-4">CTR</th>
                  <th className="py-2 pr-4">CPA</th>
                  <th className="py-2 pr-4">ROAS</th>
                  <th className="py-2 pr-4">Atribuicao</th>
                  <th className="py-2 pr-4">Diagnostico</th>
                  <th className="py-2 pr-4">Proxima acao</th>
                </tr>
              </thead>
              <tbody>
                {analysis.creatives.map((creative) => (
                  <tr key={creative.id} className="border-b border-brand-sand/70 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-brand-teal">{creative.name}</p>
                      <p className="text-xs text-brand-teal/55">{creative.campaignName}</p>
                    </td>
                    {["spend", "ctr", "cpa", "roas"].map((key) => (
                      <td key={key} className="py-3 pr-4 text-brand-teal/70">
                        {creative.metrics.find((metric) => metric.key === key)?.formatted ?? "-"}
                      </td>
                    ))}
                    <td className="py-3 pr-4 text-brand-teal/70">{creative.attributionConfidence}</td>
                    <td className="max-w-xs py-3 pr-4 text-brand-teal/70">{creative.diagnosis} Hipotese: {creative.hypothesis}</td>
                    <td className="max-w-xs py-3 pr-4 text-brand-teal/70">{creative.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Sem criativos/anuncios suficientes no recorte.</EmptyState>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<Beaker className="h-5 w-5" />} title="Experimentos sugeridos" />
          <div className="mt-4 grid gap-3">
            {analysis.experiments.map((experiment) => (
              <article key={experiment.id} className="rounded-md border border-brand-sand bg-white/85 p-4">
                <p className="text-sm font-semibold text-brand-teal">{experiment.hypothesis}</p>
                <p className="mt-2 text-sm text-brand-teal/70">Teste: {experiment.test}</p>
                <p className="mt-2 text-xs text-brand-teal/60">
                  Metrica primaria: {experiment.primaryMetric}. Seguranca: {experiment.safetyMetric}. Decisao: {experiment.decision}.
                </p>
                <p className="mt-2 text-xs font-semibold text-brand-clay">{experiment.missionOsAction}</p>
              </article>
            ))}
          </div>
        </Card>

        <Card className="border-[#E9CBD1] p-4 sm:p-5">
          <SectionTitle icon={<LockKeyhole className="h-5 w-5" />} title="Orcamento e aprovacao humana" />
          <div className="mt-4 grid gap-3">
            {analysis.dontChangeYet.map((item) => (
              <p key={item} className="rounded-md border border-brand-sand bg-white/85 p-3 text-sm text-brand-teal/70">{item}</p>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-brand-teal/65">
            A IA pode recomendar manter, reduzir, aumentar, redistribuir ou testar verba. Ela nao altera orcamento, nao publica campanha e nao executa integracao Meta automaticamente.
          </p>
        </Card>
      </div>

      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<TrendingUp className="h-5 w-5" />} title="Norwyn Growth Strategist" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <StrategyBlock title="O que sabemos" items={analysis.strategist.facts} />
          <StrategyBlock title="Hipoteses" items={analysis.strategist.hypotheses} />
          <StrategyBlock title="Dados ausentes" items={analysis.strategist.missingData} />
          <StrategyBlock title="Proximas 3 acoes" items={analysis.strategist.nextThreeActions} />
        </div>
        <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/45 p-4">
          <p className="text-[11px] font-black uppercase text-brand-clay">Confianca</p>
          <p className="mt-2 text-sm leading-6 text-brand-teal/70">
            {analysis.strategist.confidence}%. A leitura diferencia fatos de dados, diagnosticos por regra e hipoteses. Causalidade so deve ser assumida depois de tracking e teste controlado.
          </p>
        </div>
      </Card>

      {advancedOpen ? (
      <Card className="border-[#E9CBD1] p-4 sm:p-5">
        <SectionTitle icon={<LineChart className="h-5 w-5" />} title="Modelos por tarefa" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analysis.aiModelPolicy.map((item) => (
            <article key={item.task} className="rounded-md border border-brand-sand bg-white/85 p-3">
              <p className="text-sm font-semibold text-brand-teal">{item.task}</p>
              <p className="mt-2 text-xs text-brand-teal/60">Env: {item.modelEnv}</p>
              <p className="mt-1 text-xs text-brand-teal/60">Fallback: {item.fallback}</p>
              <p className="mt-2 text-xs leading-5 text-brand-teal/55">{item.note}</p>
            </article>
          ))}
        </div>
      </Card>
      ) : null}
      </>
      ) : null}
    </section>
  );
}

function StatusBadge({ analysis }: { analysis: GrowthAnalysis }) {
  const tone =
    analysis.status === "Saudavel"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : analysis.status === "Critico"
        ? "border-red-200 bg-red-50 text-red-800"
        : analysis.status === "Atencao"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-brand-sand bg-white text-brand-teal";
  return (
    <div className={`rounded-md border px-4 py-3 ${tone}`}>
      <p className="text-[11px] font-black uppercase">Situacao</p>
      <p className="mt-1 text-lg font-semibold">{analysis.status}</p>
      <p className="mt-1 max-w-xs text-xs leading-5">{analysis.statusExplanation}</p>
    </div>
  );
}

function MetricCard({ metric }: { metric: GrowthMetric }) {
  return (
    <div className="rounded-md border border-brand-sand bg-white/85 p-3">
      <p className="text-[10px] font-black uppercase text-brand-clay">{metric.label}</p>
      <p className="mt-2 text-lg font-semibold text-brand-teal">{metric.formatted}</p>
    </div>
  );
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNullableCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Dados indisponiveis" : currency(value);
}

function formatNullableNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "Dados indisponiveis" : value.toLocaleString("pt-BR");
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Dados indisponiveis";
}

function qualityPrefix(status: "ok" | "warning" | "critical") {
  return status === "ok" ? "[OK]" : status === "warning" ? "[ATENCAO]" : "[CRITICO]";
}

function severityTone(severity: LandingSeverity) {
  if (severity === "BLOCKER") return "border-red-300 bg-red-50 text-red-900";
  if (severity === "CRITICAL") return "border-red-200 bg-red-50 text-red-800";
  if (severity === "WARNING") return "border-amber-200 bg-amber-50 text-amber-900";
  if (severity === "INFO") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function preflightTone(status: "READY" | "READY WITH WARNINGS" | "NOT READY") {
  if (status === "READY") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "READY WITH WARNINGS") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-brand-sand bg-white/85 p-3">
      <p className="text-[10px] font-black uppercase text-brand-clay">{label}</p>
      <p className="mt-2 text-base font-semibold text-brand-teal">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-[11px] font-black uppercase text-brand-clay">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NarrativePanelInline({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-brand-sand bg-white/85 p-4">
      <p className="text-[11px] font-black uppercase text-brand-clay">{title}</p>
      <ul className="mt-2 grid gap-1 text-xs leading-5 text-brand-teal/65">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function MetricGroup({ title, metrics }: { title: string; metrics: GrowthMetric[] }) {
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <SectionTitle icon={<LineChart className="h-5 w-5" />} title={title} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((item) => <MetricCard key={item.key} metric={item} />)}
      </div>
    </Card>
  );
}

function DiagnosticCard({ item }: { item: GrowthDiagnostic }) {
  return (
    <article className="rounded-md border border-brand-sand bg-white/90 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-brand-teal">{item.title}</h3>
        <span className="rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-black uppercase text-brand-clay">
          {item.priority} - {item.confidence}%
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-brand-teal/70">{item.diagnosis}</p>
      <p className="mt-2 text-sm leading-6 text-brand-teal/70">Hipotese: {item.hypothesis}</p>
      <p className="mt-2 text-sm font-semibold text-brand-teal">Fazer agora: {item.nextAction}</p>
      <p className="mt-3 text-[11px] font-black uppercase text-brand-clay">Regra: {item.sourceRule}</p>
      <ul className="mt-2 grid gap-1 text-xs text-brand-teal/60">
        {item.evidence.map((evidence) => <li key={evidence}>- {evidence}</li>)}
      </ul>
    </article>
  );
}

function NarrativePanel({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
  return (
    <Card className="border-[#E9CBD1] p-4 sm:p-5">
      <SectionTitle icon={icon} title={title} />
      <ul className="mt-4 grid gap-2 text-sm leading-6 text-brand-teal/70">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </Card>
  );
}

function StrategyBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-brand-sand bg-white/85 p-4">
      <p className="text-[11px] font-black uppercase text-brand-clay">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-brand-teal/70">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="flex items-center gap-2 text-brand-teal">{icon}<h2 className="text-lg font-semibold">{title}</h2></div>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-brand-sand p-4 text-sm text-brand-teal/60">{children}</p>;
}
