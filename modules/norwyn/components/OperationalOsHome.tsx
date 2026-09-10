"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Bot, CalendarClock, CheckCircle2, CircleDollarSign, ClipboardList, GraduationCap, Instagram, Layers3, LineChart, Megaphone, Package, ShieldCheck, ShoppingCart, Sparkles, Target, UserRound, UsersRound, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  ActionCard,
  DataFreshness,
  EmptyState,
  InsightCard,
  MetricCard,
  PageHeader,
  SectionHeader as DsSectionHeader,
  StatusBadge,
  Surface,
  TaskCard,
} from "@/components/ui/norwyn-design-system";
import { functionalRoleFor, isAdminRole } from "@/lib/auth/roles";
import { buildOperationalOs, type FunnelBlueprint, type OsActivity, type Product360, type Student360 } from "@/modules/norwyn/services/operational-os";
import type { NorwynContext } from "@/modules/norwyn/types";
import { SpecialistLandingApprovals } from "@/modules/landing-pages/components/SpecialistLandingApprovals";

type ExecutivePeriod = "month" | "previousMonth" | "last30" | "year" | "all";

type DateRange = {
  key: ExecutivePeriod;
  label: string;
  start: Date | null;
  end: Date | null;
  isFiltered: boolean;
};

const executivePeriodOptions: Array<{ value: ExecutivePeriod; label: string }> = [
  { value: "month", label: "Este mes" },
  { value: "previousMonth", label: "Mes anterior" },
  { value: "last30", label: "Ultimos 30 dias" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Todo historico" },
];
export function OperationalOsHome({ context, goTo }: { context: NorwynContext; goTo: (tab: "growth" | "products" | "campaigns" | "capture" | "mission") => void }) {
  const snapshot = useMemo(() => buildOperationalOs(context), [context]);
  const functionalRole = functionalRoleFor(context.role);
  const isAdminExperience = isAdminRole(context.role);
  const [profile, setProfile] = useState<"specialist" | "operational">(functionalRole === "OPERACIONAL" ? "operational" : "specialist");
  const [executivePeriod, setExecutivePeriod] = useState<ExecutivePeriod>("month");
  const [productId, setProductId] = useState(() => snapshot.productOptions.find((item) => item.label.toLowerCase().includes("aasi"))?.id ?? snapshot.productOptions[0]?.id ?? "");
  const [studentId, setStudentId] = useState(snapshot.students[0]?.id ?? "");
  const selectedProduct = snapshot.productOptions.find((item) => item.id === productId) ?? snapshot.productOptions[0] ?? null;
  const selectedStudent = snapshot.students.find((item) => item.id === studentId) ?? snapshot.students[0] ?? null;
  const visibleProfile = isAdminExperience ? profile : functionalRole === "OPERACIONAL" ? "operational" : "specialist";
  const clock = useLocalClock();
  const userName = displayUserName(context);
  const perspectiveLabel = visibleProfile === "operational" ? "Operacional" : isAdminExperience ? "Admin · perspectiva especialista" : "Especialista";
  const periodRange = useMemo(() => executiveDateRange(executivePeriod, new Date()), [executivePeriod]);

  return (
    <div className="norwyn-ds-page space-y-6">
      <PageHeader
        eyebrow={`Norwyn · ${perspectiveLabel}`}
        title={`${clock.greeting}, ${userName}.`}
        description={clock.dateLabel}
        aside={
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              <label className="text-xs font-semibold text-[color:var(--ds-text-secondary)]" htmlFor="executive-period">Período</label>
              <select
                id="executive-period"
                value={executivePeriod}
                onChange={(event) => setExecutivePeriod(event.target.value as ExecutivePeriod)}
                className="h-9 rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-xs font-semibold text-[color:var(--ds-text)] shadow-[var(--ds-shadow-sm)] outline-none"
              >
                {executivePeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <DataFreshness label={`${periodRange.label} · ${freshnessLabel(snapshot)}`} stale={hasStaleData(snapshot)} />
            {isAdminExperience ? (
              <div className="flex rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-1 shadow-[var(--ds-shadow-sm)]">
                <button type="button" onClick={() => setProfile("specialist")} className={visibleProfile === "specialist" ? activePill : idlePill}>Especialista</button>
                <button type="button" onClick={() => setProfile("operational")} className={visibleProfile === "operational" ? activePill : idlePill}>Operacional</button>
              </div>
            ) : null}
          </div>
        }
      />

      {visibleProfile === "specialist" ? <SpecialistLandingApprovals items={context.landingApprovals ?? []} /> : null}

      {visibleProfile === "specialist" ? <JulianaHome snapshot={snapshot} context={context} periodRange={periodRange} goTo={goTo} /> : <RyanHome snapshot={snapshot} />}

      {isAdminExperience ? (
        <div className="space-y-4">
          <Surface>
            <DsSectionHeader title="Profundidade técnica" description="Disponível somente para Admin. Mantém validações, lifecycle, conciliação e Product 360 fora da primeira camada dos perfis operacionais." />
          </Surface>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Product360Panel products={snapshot.productOptions} selected={selectedProduct} selectedId={productId} setSelectedId={setProductId} />
            <Student360Panel students={snapshot.students} selected={selectedStudent} selectedId={studentId} setSelectedId={setStudentId} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ReconciliationPanel snapshot={snapshot} />
            <Blueprints blueprints={snapshot.blueprints} />
          </div>
          <LifecyclePanel snapshot={snapshot} context={context} />
          <div className="grid gap-4 xl:grid-cols-2">
            <OperationalTests snapshot={snapshot} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LifecyclePanel({ snapshot, context }: { snapshot: ReturnType<typeof buildOperationalOs>; context: NorwynContext }) {
  const lifecycle = snapshot.lifecycle;
  const primary = lifecycle.eligibility[0];
  const secondary = lifecycle.eligibility[1];
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<Layers3 className="h-5 w-5" />} title="Lifecycle / Base Revenue" subtitle="Missao 1: recompra, ascensao e retencao com dados reais da base. Dry-run: sem disparos." />
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Metric label="Compradores" value={String(lifecycle.economics.buyers)} state="COMMERCIAL" />
        <Metric label="% segunda compra" value={percent(lifecycle.economics.secondPurchaseRate)} state="LTV COMMERCIAL" />
        <Metric label="LTV medio" value={money(lifecycle.economics.averageLtv ?? 0)} state="COMMERCIAL" />
        <Metric label="Mediana 2a compra" value={lifecycle.economics.medianDaysToSecondPurchase == null ? "NO DATA" : `${Math.round(lifecycle.economics.medianDaysToSecondPurchase)} dias`} state="COHORT" />
      </div>
      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {lifecycle.mission.phases.map((phase) => (
          <div key={phase.label} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase text-brand-clay">{phase.label}</p>
            <p className="mt-1 text-xs leading-5 text-brand-teal/65">{phase.focus}</p>
          </div>
        ))}
      </div>
      {primary ? (
        <div className="mt-4 rounded-md border border-brand-sand bg-white/80 p-3">
          <p className="text-xs font-black uppercase text-brand-clay">{primary.label}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            <Metric label="Total" value={String(primary.total)} state="SOURCE" />
            <Metric label="Eligible" value={String(primary.eligible)} state="DRY RUN" />
            <Metric label="Excluded" value={String(primary.excluded)} state="RULE" />
            <Metric label="Com Formacao" value={String(primary.eligibleWithFormation)} state="SEGMENT" />
            <Metric label="Sem Formacao" value={String(primary.eligibleWithoutFormation)} state="SEGMENT" />
          </div>
          <p className="mt-3 text-xs leading-5 text-brand-teal/60">Campos faltantes para executar com seguranca: {primary.missingFields.join(" | ")}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {primary.sample.map((member) => (
              <div key={member.customerHash} className="rounded-md border border-brand-sand bg-brand-cream/30 p-3">
                <p className="text-xs font-black uppercase text-brand-clay">{member.customerHash} - {member.status}</p>
                <p className="mt-1 text-xs text-brand-teal/65">Produtos: {member.ownedProducts.join(", ")}</p>
                <p className="mt-1 text-xs text-brand-teal/65">LTV: {money(member.ltvCommercial)} | Formacao: {member.hasFormation ? "sim" : "nao"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {lifecycle.experiments.map((experiment) => (
          <div key={experiment.key} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-sm font-semibold text-brand-teal">{experiment.name}</p>
            <p className="mt-2 text-xs leading-5 text-brand-teal/65">{experiment.hypothesis}</p>
            <p className="mt-2 text-xs text-brand-teal/60">Amostra: {experiment.sampleSize} | Status: {experiment.status} | Executavel apos aprovacao: {experiment.executableAfterApproval ? "sim" : "nao"}</p>
            {experiment.blockers.length ? <p className="mt-2 text-xs text-brand-clay">Gaps: {experiment.blockers.join(" | ")}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {lifecycle.channelContract.map((channel) => (
          <div key={channel.channel} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase text-brand-clay">{channel.channel}: {channel.status}</p>
            <p className="mt-1 text-xs leading-5 text-brand-teal/60">{channel.contract}</p>
          </div>
        ))}
      </div>
      {secondary ? <p className="mt-3 text-xs text-brand-teal/60">Experimento 02 preparado: {secondary.label}, {secondary.eligible} elegiveis, randomizacao A/B reproduzivel somente apos aprovacao.</p> : null}
      <ExecutionClosurePanel snapshot={snapshot} context={context} />
    </Card>
  );
}

function ExecutionClosurePanel({ snapshot, context }: { snapshot: ReturnType<typeof buildOperationalOs>; context: NorwynContext }) {
  const closure = snapshot.lifecycle.executionClosure;
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const runtimeUniqueBuyers = new Set(context.commercialSales.map((sale) => String(sale.comprador_email ?? "").trim().toLowerCase()).filter(Boolean)).size;
  const originNotFound = closure.validationPack.people.filter((person) => person.originEvidenceStatus === "ZUMBIDO_NOT_FOUND").length;
  const originConfirmed = closure.validationPack.people.length - originNotFound;
  const validateOfferCount = closure.validationPack.summary.needsHumanReview - closure.validationPack.summary.potentialConflict;
  const humanAttentionCount = closure.validationPack.summary.needsHumanReview;
  const dataOpsAttentionCount = closure.validationPack.summary.needsDataOpsReview;
  const julianaAttentionCount = closure.validationPack.summary.needsJulianaReview;
  const downloadValidationPack = (variant: "final" | "review") => {
    setExportStatus(`Gerando CSV ${variant.toUpperCase()} no servidor...`);
    window.location.href = `/api/norwyn/mission1-validation-pack?variant=${variant}&t=${Date.now()}`;
    window.setTimeout(() => setExportStatus(`CSV ${variant.toUpperCase()} solicitado do servidor.`), 800);
  };
  return (
    <div className="mt-4 rounded-md border border-brand-sand bg-brand-cream/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-brand-clay">Execution Closure - Zumbido {"->"} Ajustes Finos</p>
          <p className="mt-1 text-xs leading-5 text-brand-teal/60">Email first. Offer key: {closure.offerKey}. Nenhum disparo automatico.</p>
        </div>
        <span className="rounded-md border border-brand-sand bg-white px-3 py-1 text-[10px] font-black uppercase text-brand-clay">{closure.emailFirstReadiness.status}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="Total" value={String(closure.emailFirstReadiness.total)} state="RUN" />
        <Metric label="Eligible" value={String(closure.emailFirstReadiness.eligible)} state="DRY RUN" />
        <Metric label="Ready" value={String(closure.emailFirstReadiness.readyToSend)} state="EMAIL" />
        <Metric label="Review required" value={String(closure.emailFirstReadiness.reviewRequired)} state="POLICY" />
        <Metric label="Opted out" value={String(closure.emailFirstReadiness.optedOut)} state="BLOCK" />
        <Metric label="Commercial block" value={String(closure.emailFirstReadiness.commercialBlocked)} state="BLOCK" />
        <Metric label="Already exposed" value={String(closure.emailFirstReadiness.alreadyExposed)} state="HISTORY" />
        <Metric label="Unknown consent" value={String(closure.emailFirstReadiness.unknownConsent)} state="NOT CONSENT" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="AC active" value={String(closure.emailFirstReadiness.activeSubscribed)} state="CHANNEL" />
        <Metric label="AC unsub" value={String(closure.emailFirstReadiness.unsubscribed)} state="CHANNEL" />
        <Metric label="AC bounce/suppress" value={String(closure.emailFirstReadiness.bouncedSuppressed)} state="CHANNEL" />
        <Metric label="AC not found" value={String(closure.emailFirstReadiness.notFound)} state="CHANNEL" />
        <Metric label="AC not synced" value={String(closure.emailFirstReadiness.notSynced)} state="CHANNEL" />
        <Metric label="Policy allowed" value={String(closure.emailFirstReadiness.allowedByPolicy)} state="POLICY" />
        <Metric label="Policy blocked" value={String(closure.emailFirstReadiness.blockedByPolicy)} state="POLICY" />
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="rounded-md border border-brand-sand bg-white/80 p-3">
          <p className="text-[10px] font-black uppercase text-brand-clay">Approval gate</p>
          <p className="mt-1 text-sm font-semibold text-brand-teal">{closure.emailFirstReadiness.approvalStatus} / {closure.emailFirstReadiness.copyStatus}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="h-9 rounded-md border border-brand-sand bg-white px-3 text-xs font-bold text-brand-teal">Revisar publico</button>
            <button type="button" disabled className="h-9 rounded-md border border-brand-sand bg-brand-cream px-3 text-xs font-bold text-brand-teal/45">Aprovar execucao</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-brand-teal/60">Aprovacao permanece bloqueada ate opt-in, QA, copy e ActiveCampaign/event return estarem prontos.</p>
        </div>
        <div className="rounded-md border border-brand-sand bg-white/80 p-3">
          <p className="text-[10px] font-black uppercase text-brand-clay">ActiveCampaign</p>
          <p className="mt-1 text-sm font-semibold text-brand-teal">{closure.activeCampaign.status}</p>
          <p className="mt-1 text-xs leading-5 text-brand-teal/60">{closure.activeCampaign.evidence.join(" | ")}</p>
        </div>
      </div>
      {closure.exposureRule ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <Metric label="Cooldown" value={closure.exposureRule.cooldownDays == null ? "CONFIGURE" : `${closure.exposureRule.cooldownDays} dias`} state={closure.exposureRule.status} />
          <Metric label="Max exposures" value={closure.exposureRule.maxExposures == null ? "CONFIGURE" : String(closure.exposureRule.maxExposures)} state="RULE" />
          <Metric label="Exit purchase" value={closure.exposureRule.exitOnPurchase ? "sim" : "nao"} state="RULE" />
          <Metric label="Exit optout" value={closure.exposureRule.exitOnOptout ? "sim" : "nao"} state="RULE" />
          <Metric label="Exit block" value={closure.exposureRule.exitOnBlock ? "sim" : "nao"} state="RULE" />
        </div>
      ) : null}
      <div className="mt-3 rounded-md border border-brand-sand bg-white/80 p-3">
        <p className="text-[10px] font-black uppercase text-brand-clay">Internal TEST list</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Metric label="Status" value={closure.internalTest.status} state="TEST" />
          <Metric label="Contacts" value={String(closure.internalTest.total)} state="TEST" />
          <Metric label="Authorized" value={String(closure.internalTest.authorized)} state="TEST" />
          <Metric label="Exit purchase" value={closure.internalTest.exitOnPurchaseTest} state="TEST" />
        </div>
        <p className="mt-2 text-xs leading-5 text-brand-teal/60">{closure.internalTest.evidence.join(" | ")}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {closure.eventDashboard.map((item) => (
          <div key={item.label} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase text-brand-clay">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-brand-teal">{item.value}</p>
            <p className="mt-1 text-[10px] leading-4 text-brand-teal/50">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="rounded-md border border-brand-sand bg-white/80 p-3">
          <p className="text-[10px] font-black uppercase text-brand-clay">With AASI Formation</p>
          <p className="mt-1 text-xs text-brand-teal/60">Eligible {closure.segments.withFormation.eligible} | Ready {closure.segments.withFormation.readyToSend} | Purchases {closure.segments.withFormation.purchases} | Revenue {money(closure.segments.withFormation.revenue)}</p>
        </div>
        <div className="rounded-md border border-brand-sand bg-white/80 p-3">
          <p className="text-[10px] font-black uppercase text-brand-clay">Without AASI Formation</p>
          <p className="mt-1 text-xs text-brand-teal/60">Eligible {closure.segments.withoutFormation.eligible} | Ready {closure.segments.withoutFormation.readyToSend} | Purchases {closure.segments.withoutFormation.purchases} | Revenue {money(closure.segments.withoutFormation.revenue)}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-brand-clay">QA pre-disparo</p>
          {closure.qaGates.map((gate) => (
            <div key={gate.label} className="rounded-md border border-brand-sand bg-white/80 p-3">
              <p className="text-xs font-black uppercase text-brand-clay">{gate.label}: {gate.status}</p>
              <p className="mt-1 text-xs leading-5 text-brand-teal/60">{gate.evidence}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-brand-clay">Sequencia em draft</p>
          {closure.sequenceDrafts.map((draft) => (
            <div key={draft.day} className="rounded-md border border-brand-sand bg-white/80 p-3">
              <p className="text-xs font-black uppercase text-brand-clay">{draft.day}: {draft.role} - {draft.status}</p>
              <p className="mt-1 text-xs leading-5 text-brand-teal/60">{draft.note}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-md border border-brand-sand bg-white/80 p-3">
        <p className="text-[10px] font-black uppercase text-brand-clay">Riscos</p>
        <p className="mt-1 text-xs leading-5 text-brand-teal/60">{closure.emailFirstReadiness.risks.join(" | ")}</p>
      </div>
      <div className="mt-3 rounded-md border border-brand-sand bg-white/80 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-brand-clay">Human Validation Pack</p>
            <p className="mt-1 text-xs leading-5 text-brand-teal/60">Lista operacional para Juliana/Ryan revisarem. Nao altera elegibilidade e nao envia comunicacao.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadValidationPack("final")} className="h-9 rounded-md border border-brand-sand bg-white px-3 text-xs font-bold text-brand-teal hover:border-brand-clay">Exportar FINAL</button>
            <button type="button" onClick={() => downloadValidationPack("review")} className="h-9 rounded-md border border-brand-sand bg-white px-3 text-xs font-bold text-brand-teal hover:border-brand-clay">Exportar REVIEW</button>
          </div>
        </div>
        {exportStatus ? <p className="mt-2 text-xs font-semibold text-brand-teal/70">{exportStatus}</p> : null}
        <p className="mt-2 text-[10px] font-semibold uppercase text-brand-teal/55">Runtime export diag: commercial_rows_loaded={context.commercialSales.length} | commercial_unique_buyers={runtimeUniqueBuyers} | validation_members={closure.validationPack.people.length} | confirmed_origin_count={originConfirmed} | not_found_count={originNotFound}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Pode ofertar" value={String(closure.validationPack.summary.clearlyOk)} state="Sem impedimento conhecido. Ainda depende de canal e aprovacao." />
          <Metric label="Validar oferta" value={String(validateOfferCount)} state="Inclui decisao comercial/clinica e pendencias de dados." />
          <Metric label="Possivel conflito" value={String(closure.validationPack.summary.potentialConflict)} state="Pode ja possuir entrega relacionada." />
          <Metric label="Nao ofertar" value={String(closure.validationPack.summary.excluded)} state="Excluido por regra objetiva atual." />
          <Metric label="Atencao humana" value={String(humanAttentionCount)} state="Validar oferta + Possivel conflito." />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Precisa da Juliana" value={String(julianaAttentionCount)} state="Clinico ou conflito de produto." />
          <Metric label="Operacao/Dados" value={String(dataOpsAttentionCount)} state="Resolver qualidade de dados antes da decisao." />
          <Metric label="Formacao AASI" value={String(closure.validationPack.summary.withFormationAasi)} state="Segmento informativo" />
          <Metric label="Somente Zumbido" value={String(closure.validationPack.summary.zumbidoOnly)} state="Motivo principal provavel" />
        </div>
        <p className="mt-3 text-xs leading-5 text-brand-teal/60">Pode ofertar nao exige revisao pessoa a pessoa nesta fase; Validar oferta agora separa decisao clinica/comercial de pendencia operacional de dados. Os status tecnicos continuam preservados no FINAL.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {closure.validationPack.segments.map((segment) => (
            <div key={segment.key} className="rounded-md border border-brand-sand bg-brand-cream/25 p-3">
              <p className="text-xs font-black uppercase text-brand-clay">{segment.key} - {segment.label}: {segment.count}</p>
              <p className="mt-1 text-xs leading-5 text-brand-teal/60">{segment.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-md border border-brand-sand bg-brand-cream/20 p-3">
          <p className="text-xs font-black uppercase text-brand-clay">10 ambiguidades representativas</p>
          <div className="mt-2 space-y-2">
            {closure.validationPack.representativeAmbiguities.map((person) => (
              <details key={person.customerHash} className="rounded-md border border-brand-sand bg-white/80 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-teal">{person.name ?? person.email} - {person.norwynRecommendationLabel} - {person.reviewReasonPrimaryLabel} - {money(person.ltvCommercial)}</summary>
                <p className="mt-2 text-xs leading-5 text-brand-teal/60">Produtos: {person.products.join(" | ") || "NO DATA"}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">Status tecnico: {person.status}. Categoria: {person.reviewCategoryLabel}. Revisao sugerida: {person.suggestedReviewer}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">Motivos: {person.reviewReasonAllLabels.join(" | ") || person.eligibilityReason}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">Pendencia de dados: {person.dataQualityPending}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">Detalhe: {person.reviewReasons.join(" | ") || person.eligibilityReason}</p>
                <div className="mt-2 space-y-1">
                  {person.journey.map((event, index) => (
                    <p key={`${person.customerHash}-${index}`} className="text-[11px] text-brand-teal/55">{event.date ?? "sem data"} - {event.productName} - {event.hotmartProductId ?? "sem Hotmart ID"} - {money(event.value)}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-brand-teal/60">Review storage: {closure.validationPack.reviewStorage.status} - {closure.validationPack.reviewStorage.evidence} Decisao humana fica exportavel nesta rodada; nao vira regra automaticamente.</p>
      </div>
    </div>
  );
}

function ReconciliationPanel({ snapshot }: { snapshot: ReturnType<typeof buildOperationalOs> }) {
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<ShieldCheck className="h-5 w-5" />} title="Reconciliation Health" subtitle="Financeiro, Comercial/Hotmart e Growth permanecem como verdades separadas." />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {snapshot.reconciliation.health.map((item) => (
          <div key={item.source} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase text-brand-clay">{item.source}</p>
            <p className="mt-1 text-sm font-semibold text-brand-teal">{item.status}</p>
            <p className="mt-1 text-xs leading-5 text-brand-teal/60">{item.detail}</p>
            {item.freshness ? <p className="mt-1 text-[10px] text-brand-teal/45">Atualização: {formatShortDate(item.freshness)}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Metric label="Recebimento financeiro" value={money(snapshot.reconciliation.hotmart.financialReceipts)} state="FINANCEIRO" />
        <Metric label="Vendas Hotmart" value={money(snapshot.reconciliation.hotmart.hotmartSales)} state="COMERCIAL" />
        <Metric label="Diferença" value={money(snapshot.reconciliation.hotmart.difference)} state="A CONCILIAR" />
        <Metric label="UNALLOCATED" value={money(snapshot.reconciliation.hotmart.unallocated)} state="SEM REGRA" />
      </div>
      <p className="mt-3 text-xs leading-5 text-brand-teal/60">{snapshot.reconciliation.hotmart.basis}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {snapshot.reconciliation.categories.map((item) => (
          <div key={item.label} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-[10px] font-black uppercase text-brand-clay">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-brand-teal">{money(item.value)}</p>
            <p className="mt-1 text-xs leading-5 text-brand-teal/60">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-brand-sand bg-white/80 p-3">
        <p className="text-xs font-black uppercase text-brand-clay">UNALLOCATED causes</p>
        <div className="mt-2 space-y-2">
          {snapshot.reconciliation.unallocatedCauses.length ? snapshot.reconciliation.unallocatedCauses.map((item) => (
            <div key={item.cause} className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-teal/70">
              <span>{item.cause}</span>
              <span>{item.count} transacoes - {money(item.value)} - {item.confidence} - {item.recoverable ? "recoverable" : "not recoverable"}</span>
            </div>
          )) : <p className="text-xs text-brand-teal/55">Sem UNALLOCATED no contexto carregado.</p>}
        </div>
      </div>
      <div className="mt-4 rounded-md border border-brand-sand bg-white/80 p-3">
        <p className="text-xs font-black uppercase text-brand-clay">Product Relationship Review</p>
        <div className="mt-2 space-y-2">
          {snapshot.reconciliation.relationshipReview.length ? snapshot.reconciliation.relationshipReview.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-md border border-brand-sand bg-brand-cream/30 p-2 text-xs text-brand-teal/70">
              <b>{item.source}</b> - {item.externalValue} - {item.confidence} - {item.cause} - {item.status}
            </div>
          )) : <p className="text-xs text-brand-teal/55">Sem revisoes pendentes.</p>}
        </div>
      </div>
    </Card>
  );
}

function JulianaHome({ snapshot, context, periodRange, goTo }: { snapshot: ReturnType<typeof buildOperationalOs>; context: NorwynContext; periodRange: DateRange; goTo: (tab: "growth" | "products" | "campaigns" | "capture" | "mission") => void }) {
  const business = executiveBusinessSummary(context, periodRange);
  const mission = snapshot.lifecycle.mission;
  const nextMissionStep = mission.phases[0]?.focus ?? "Sem próximo passo registrado.";
  const instagram = instagramSummary(context, periodRange);
  const finance = financeSummary(context, periodRange);
  const productsStudents = productsStudentsSummary(context, snapshot);
  const digitalHealth = digitalHealthSummary(context);
  const nextAgendaEvents = (context.agendaEvents ?? [])
    .filter((event) => new Date(event.inicio).getTime() >= Date.now())
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 4);
  const operationSummary = summarizeOperation(context);
  const teamDemandSummary = summarizeTeamDemand(context);
  const automations = summarizeAutomations(context);
  const attention = operationalAttentionSummary(context, operationSummary, digitalHealth, automations);
  const canCreateActivity = canCreateActivityFromHome(context);

  return (
    <div className="space-y-7">
      <Surface className="overflow-hidden p-0 shadow-[0_22px_70px_rgba(12,47,63,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-6 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--ds-accent)]">Norwyn</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ds-text)] sm:text-3xl">Visão executiva</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ds-text-secondary)]">Sua visão do dia: acompanhe alunos, agenda, marketing, financeiro e o que precisa da sua decisão.</p>
          </div>
          <div className="flex items-center justify-between gap-4 bg-[color:var(--ds-bg-soft)] px-6 py-5 sm:px-8 lg:justify-end">
            <div>
              <p className="text-xs font-semibold uppercase text-[color:var(--ds-text-muted)]">Período</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--ds-text)]">{periodRange.label}</p>
            </div>
          </div>
        </div>
      </Surface>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExecutiveNumber icon={ShoppingCart} tone="green" label="Vendas do período" value={money(business.salesValue)} meta={business.salesCount ? business.salesCount + " venda(s)" : "Sem vendas"} period={periodRange.label} />
        <ExecutiveNumber icon={GraduationCap} tone="purple" label="Novos alunos" value={String(business.students)} meta={business.students ? "Identificados" : "Sem novos"} period={periodRange.label} />
        <ExecutiveNumber icon={Megaphone} tone="coral" label="Investimento em Ads" value={money(business.adsSpend)} meta={business.adsRows ? business.adsRows + " registro(s)" : "Sem gasto"} period={periodRange.label} />
        <ExecutiveNumber icon={WalletCards} tone="gold" label="Resultado estimado" value={finance.estimated == null ? "Dados incompletos" : money(finance.estimated)} meta={finance.estimated == null ? "comparação indisponível" : "estimativa do período"} period={periodRange.label} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <InstagramSpotlight instagram={instagram} />
        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader eyebrow="Precisa de você" title="Decisões e aprovações" description="Itens que pedem uma decisão, resposta ou aprovação humana." />
          <div className="space-y-3">
            {snapshot.specialist.decisions.slice(0, 5).map((item) => <DecisionRow key={item.id} item={item} />)}
            {!snapshot.specialist.decisions.length ? <EmptyState title="Nada crítico agora">Sem decisão urgente com os dados atuais.</EmptyState> : null}
          </div>
          <ActionLink onClick={() => window.location.assign("/atividades")}>Ver atividades</ActionLink>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Surface className="space-y-5 p-5 sm:p-6">
          <DsSectionHeader title="Financeiro" description="Entradas, saídas e próximos movimentos." action={<ActionLink onClick={() => window.location.assign("/financeiro")}>Ver financeiro</ActionLink>} />
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniDomainCard icon={WalletCards} tone="green" label="Entradas" value={money(finance.entries)} detail={periodRange.label} />
            <MiniDomainCard icon={CircleDollarSign} tone="coral" label="Saídas" value={money(finance.expenses)} detail={periodRange.label} />
            <MiniDomainCard icon={CalendarClock} tone="gold" label="A receber" value={money(finance.nextReceipts)} detail="próximos movimentos" />
            <MiniDomainCard icon={AlertTriangle} tone="purple" label="A pagar" value={money(finance.nextPayments)} detail="próximos movimentos" />
          </div>
        </Surface>

        <Surface className="space-y-5 p-5 sm:p-6">
          <DsSectionHeader title="Operação" description="Atividades, pendências e acompanhamento da equipe." action={<ActionLink onClick={() => window.location.assign("/atividades")}>Ver atividades</ActionLink>} />
          <div className="grid gap-3 sm:grid-cols-3">
            <ActionCard icon={ClipboardList} title="Atividades" meta={operationSummary.inProgress + " em andamento"} description={operationSummary.overdue + " atrasada(s) · " + operationSummary.approval + " em aprovação"} tone={operationSummary.overdue ? "warning" : "neutral"} />
            {teamDemandSummary.slice(0, 2).map((item) => <ActionCard key={item.label} icon={UsersRound} title={item.label} meta={item.meta} description={item.description} tone={item.overdue ? "warning" : "neutral"} />)}
          </div>
          {canCreateActivity ? <ActionButton onClick={() => window.location.assign("/atividades?new=1")}>Nova atividade</ActionButton> : null}
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Surface className="space-y-5 p-5 sm:p-6">
          <DsSectionHeader title="Produtos & Alunos" description="Base canônica de produtos, alunos, LTV e recompra." action={<ActionLink onClick={() => window.location.assign("/produtos-alunos?view=students")}>Ver Produtos & Alunos</ActionLink>} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniDomainCard icon={Package} tone="teal" label="Produtos ativos" value={numberLabel(productsStudents.activeProducts)} detail="cadastro canônico" />
            <MiniDomainCard icon={GraduationCap} tone="purple" label="Alunos" value={numberLabel(productsStudents.students)} detail="matrículas canônicas" />
            <MiniDomainCard icon={WalletCards} tone="gold" label="LTV médio BRL" value={money(productsStudents.averageLtv)} detail="vendas elegíveis BRL" />
            <MiniDomainCard icon={UsersRound} tone="green" label="Recompra" value={productsStudents.repurchaseLabel} detail="compradores com 2+ compras" />
          </div>
        </Surface>

        <Surface className="space-y-5 p-5 sm:p-6">
          <DsSectionHeader title="Saúde Digital" description="Resumo de sites, LPs e monitoramento Presence." action={<ActionLink onClick={() => window.location.assign("/presence")}>Ver Saúde Digital</ActionLink>} />
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniDomainCard icon={ShieldCheck} tone={digitalHealth.tone} label="Saúde geral" value={digitalHealth.healthLabel} detail={digitalHealth.detail} />
            <MiniDomainCard icon={LineChart} tone="blue" label="Sites ativos" value={String(digitalHealth.activeSites)} detail="monitorados" />
            <MiniDomainCard icon={Package} tone="gold" label="LPs ativas" value={String(digitalHealth.activeLandings)} detail="HML/ativos digitais" />
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader title="Agenda de hoje" description="Compromissos, horários e preparação." action={<ActionLink onClick={() => window.location.assign("/agenda")}>Ver agenda</ActionLink>} />
          <div className="space-y-3">
            {nextAgendaEvents.map((event) => <AgendaRow key={event.id} title={event.titulo} type={event.tipo ?? "Agenda"} startsAt={event.inicio} />)}
            {!nextAgendaEvents.length ? <EmptyState title="Sem próximos compromissos">Nada futuro encontrado na agenda carregada.</EmptyState> : null}
          </div>
        </Surface>

        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader title="Atenção operacional" description="Sinais detectados pelo sistema para acompanhamento, sem misturar com decisões." />
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.map((item) => <ActionCard key={item.title} icon={item.icon} title={item.title} meta={item.meta} description={item.description} tone={item.tone} />)}
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader title="Missões" description="Próximo passo em linguagem de negócio." action={<ActionLink onClick={() => goTo("mission")}>Ver missões</ActionLink>} />
          <ActionCard icon={Target} title={mission.name} meta={mission.period} description={nextMissionStep} tone="primary" />
        </Surface>
        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader title="Automações" description="ManyChat, Telegram e sincronizações." action={<ActionLink onClick={() => window.location.assign("/automacoes")}>Ver automações</ActionLink>} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MiniDomainCard icon={Bot} tone="purple" label="ManyChat" value={automations.manychatLabel} detail={automations.manychatDetail} />
            <MiniDomainCard icon={Bot} tone="blue" label="Telegram" value={automations.telegramLabel} detail={automations.telegramDetail} />
          </div>
        </Surface>
        <Surface className="space-y-4 p-5 sm:p-6">
          <DsSectionHeader title="Marketing e resultados" description="Caminhos rápidos para aprofundar sem pesar a Home." />
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => window.location.assign("/marketing?view=instagram")}>Ver Instagram</ActionButton>
            <ActionButton onClick={() => window.location.assign("/marketing?view=ads&period=30d&granularity=day")}>Ver Ads</ActionButton>
            <ActionButton onClick={() => goTo("growth")}>Resultados</ActionButton>
          </div>
        </Surface>
      </section>
    </div>
  );
}
function RyanHome({ snapshot }: { snapshot: ReturnType<typeof buildOperationalOs> }) {
  const overdue = snapshot.operational.myDay.filter((item) => item.status.toLowerCase().includes("atras") || item.priority === "critical").length;
  const priorities = snapshot.operational.myDay.filter((item) => item.priority === "critical" || item.priority === "high").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Hoje" value={String(snapshot.operational.myDay.length)} period="atividades abertas" tone="primary" />
        <MetricCard label="Atrasadas/Críticas" value={String(overdue)} period="pedem atenção primeiro" tone={overdue ? "warning" : "success"} />
        <MetricCard label="Prioridades" value={String(priorities)} period="alta ou crítica" tone={priorities ? "info" : "neutral"} />
      </section>

      <Surface className="space-y-4">
        <DsSectionHeader eyebrow="Agora" title="O que fazer primeiro" description="Lista priorizada para execução, sem exigir leitura estratégica." />
        <TaskList items={snapshot.operational.myDay.slice(0, 8)} empty="Sem atividades operacionais abertas com os dados atuais." />
      </Surface>

      <section className="grid gap-4 xl:grid-cols-5">
        <OperationBlock title="Suporte" count={snapshot.operational.support.length} items={snapshot.operational.support} />
        <OperationBlock title="Certificados" count={snapshot.operational.certificates.length} items={snapshot.operational.certificates} />
        <OperationBlock title="Financeiro" count={snapshot.operational.finance.length} items={snapshot.operational.finance} />
        <OperationBlock title="Alunos" count={snapshot.operational.students.length} items={snapshot.operational.students.map((student) => ({ id: student.id, title: student.name || student.email, owner: "Operacional" as const, priority: "medium" as const, status: student.status, sourceModule: "Alunos", sourceEvent: "student", productId: null, campaignId: null, personId: student.id, dueAt: null, approvalRequired: false, evidence: [student.products.join(", ") || "Sem produto vinculado"] }))} />
        <OperationBlock title="Produtos" count={snapshot.productOptions.length} items={snapshot.productOptions.slice(0, 4).map((product) => ({ id: product.id, title: product.label, owner: "Operacional" as const, priority: "low" as const, status: translateState(product.states.operation) ?? "Sem dados", sourceModule: "Produtos", sourceEvent: "product", productId: product.id, campaignId: null, personId: null, dueAt: null, approvalRequired: false, evidence: [product.evidence] }))} />
      </section>
    </div>
  );
}

function Product360Panel({ products, selected, selectedId, setSelectedId }: { products: Product360[]; selected: Product360 | null; selectedId: string; setSelectedId: (id: string) => void }) {
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<Package className="h-5 w-5" />} title="Produtos & Alunos" subtitle="Leitura por produto: vendas, alunos, marketing e operação em linguagem de negócio." />
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-4 h-10 w-full rounded-md border border-brand-sand bg-white px-3 text-sm text-brand-teal">
        {products.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}
      </select>
      {selected ? (
        <>
          <p className="mt-3 text-xs text-brand-teal/55">{selected.evidence}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Vendas" value={String(selected.sales)} state={selected.states.commercial} />
            <Metric label="Receita" value={money(selected.revenue)} state={selected.states.commercial} />
            <Metric label="Investimento em Ads" value={money(selected.adsSpend)} state={selected.states.growth} />
            <Metric label="Alunos" value={String(selected.students)} state={selected.states.students} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Alcance pago" value={String(selected.impressions)} state={selected.states.growth} />
            <Metric label="Cliques" value={String(selected.clicks)} state={selected.states.growth} />
            <Metric label="Interações" value={String(selected.directSignals)} state={selected.directSignals ? "OK" : "NO DATA"} />
            <Metric label="Suporte" value={String(selected.supportTickets)} state={selected.supportTickets ? "OK" : "NO DATA"} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {Object.entries(selected.states).map(([key, state]) => <Metric key={key} label={sourceLabel(key)} value={statusLabel(state)} state={state} />)}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Vendas" value={money(selected.economics.grossSales)} state="COMMERCIAL" />
            <Metric label="Reembolsos" value={money(selected.economics.refunds)} state="COMMERCIAL" />
            <Metric label="Investimento" value={money(selected.economics.metaSpend)} state="GROWTH" />
            <Metric label="Resultado estimado" value={selected.economics.estimatedContribution == null ? "Dados incompletos" : money(selected.economics.estimatedContribution)} state={selected.economics.confidence} />
          </div>
          <div className="mt-4 space-y-2">
            {selected.sourceStatuses.map((item) => (
              <div key={item.source} className="rounded-md border border-brand-sand bg-white/75 p-3">
                <p className="text-[10px] font-black uppercase text-brand-clay">{sourceLabel(item.source.toLowerCase())} - {statusLabel(item.status)}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">{item.detail}</p>
                {item.freshness ? <p className="mt-1 text-[10px] text-brand-teal/45">Atualização: {formatShortDate(item.freshness)}</p> : null}
              </div>
            ))}
          </div>
        </>
      ) : <Empty>Nenhum produto disponivel.</Empty>}
    </Card>
  );
}

function Student360Panel({ students, selected, selectedId, setSelectedId }: { students: Student360[]; selected: Student360 | null; selectedId: string; setSelectedId: (id: string) => void }) {
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<UserRound className="h-5 w-5" />} title="Aluno 360" subtitle="Pessoa, compras e acompanhamento em linguagem humana." />
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-4 h-10 w-full rounded-md border border-brand-sand bg-white px-3 text-sm text-brand-teal">
        {students.map((student) => <option key={student.id} value={student.id}>{student.email}</option>)}
      </select>
      {selected ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Compras" value={String(selected.purchases)} state="OK" />
            <Metric label="LTV" value={money(selected.ltv)} state="OK" />
            <Metric label="Status" value={statusLabel(selected.status)} state="OK" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Suporte" value={String(selected.supportTickets)} state={selected.supportTickets ? "OK" : "NO DATA"} />
            <Metric label="Certificados" value={String(selected.certificateRequests)} state={selected.certificateRequests ? "OK" : "NO DATA"} />
            <Metric label="NPS" value={selected.npsStatus} state={selected.npsStatus} />
            <Metric label="Progresso" value={statusLabel(selected.progressStatus)} state={selected.progressStatus} />
          </div>
          <div className="mt-4 space-y-2">
            {selected.journey.map((step) => (
              <div key={step.step} className="rounded-md border border-brand-sand bg-white/75 p-3">
                <p className="text-xs font-black uppercase text-brand-clay">{humanizeText(step.step)}: {statusLabel(step.status)}</p>
                <p className="mt-1 text-xs leading-5 text-brand-teal/60">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {selected.timeline.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-md border border-brand-sand bg-white/75 p-3">
                <p className="text-xs font-black uppercase text-brand-clay">{event.type}</p>
                <p className="mt-1 text-sm font-semibold text-brand-teal">{event.title}</p>
                <p className="mt-1 text-xs text-brand-teal/55">{event.occurredAt ? formatShortDate(event.occurredAt) : "sem data"} - {humanizeText(event.sourceModule)}</p>
              </div>
            ))}
          </div>
        </>
      ) : <Empty>Sem aluno/comprador com email nos dados carregados.</Empty>}
    </Card>
  );
}

function Blueprints({ blueprints }: { blueprints: FunnelBlueprint[] }) {
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<Layers3 className="h-5 w-5" />} title="Funnel Blueprints" subtitle="Estrutura reutilizavel para campanhas, QA e atividades esperadas." />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {blueprints.map((blueprint) => (
          <div key={blueprint.key} className="rounded-md border border-brand-sand bg-white/80 p-3">
            <p className="text-sm font-semibold text-brand-teal">{blueprint.label}</p>
            <p className="mt-2 text-xs leading-5 text-brand-teal/65">{blueprint.steps.join(" -> ")}</p>
            <p className="mt-2 text-[11px] font-black uppercase text-brand-clay">KPIs: {blueprint.kpis.slice(0, 4).join(", ")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OperationalTests({ snapshot }: { snapshot: ReturnType<typeof buildOperationalOs> }) {
  return (
    <Card className="border-[#E9CBD1] p-4">
      <SectionHeader icon={<CalendarClock className="h-5 w-5" />} title="Validacao TEST/HML" subtitle="Dry-run: nao publica, nao compra, nao altera Meta/Hotmart." />
      <div className="mt-4 rounded-md border border-brand-sand bg-white/80 p-3">
        <p className="text-xs font-black uppercase text-brand-clay">Agenda</p>
        <p className="mt-1 text-sm font-semibold text-brand-teal">{snapshot.agendaConflictTest.status}</p>
        <p className="mt-1 text-xs leading-5 text-brand-teal/60">{snapshot.agendaConflictTest.evidence.join(" | ")} Sugestao: {snapshot.agendaConflictTest.suggestedStart ?? "sem sugestao"}</p>
      </div>
      <div className="mt-3 space-y-2">
        {snapshot.validations.map((item) => (
          <div key={item.scenario} className="flex gap-3 rounded-md border border-brand-sand bg-white/80 p-3">
            {item.status === "PASS" ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-brand-clay" />}
            <div>
              <p className="text-sm font-semibold text-brand-teal">{item.scenario}: {item.status}</p>
              <p className="mt-1 text-xs leading-5 text-brand-teal/60">{item.evidence}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActivityList({ items, empty }: { items: OsActivity[]; empty: string }) {
  if (!items.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActionCard key={item.id} title={item.title} meta={priorityLabel(item.priority)} description={item.evidence[0] ?? [item.sourceModule, item.status].join(" - ")} tone={toneFromPriority(item.priority)} />
      ))}
    </div>
  );
}

function TaskList({ items, empty }: { items: OsActivity[]; empty: string }) {
  if (!items.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TaskCard key={item.id} title={item.title} context={item.evidence[0] ?? item.sourceModule} due={formatDue(item.dueAt)} priority={priorityLabel(item.priority)} status={item.status} dependency={item.approvalRequired ? "Aprovação" : undefined} />
      ))}
    </div>
  );
}

function OperationBlock({ title, count, items }: { title: string; count: number; items: OsActivity[] }) {
  const first = items[0];
  return (
    <Surface className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ds-text)]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">{count}</p>
        </div>
        <StatusBadge tone={count ? "info" : "neutral"}>{count ? "Com pendência" : "Sem pendência"}</StatusBadge>
      </div>
      <p className="text-xs leading-5 text-[color:var(--ds-text-secondary)]">{first?.title ?? "Nada aberto com os dados atuais."}</p>
    </Surface>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-clay">{icon}</span>
      <div>
        <h3 className="text-base font-semibold text-brand-teal">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-brand-teal/60">{subtitle}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, state }: { label: string; value: string; state: string }) {
  return <MetricCard label={label} value={value} status={translateState(state)} tone={toneFromState(state)} />;
}

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="h-10 rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-4 text-sm font-semibold text-[color:var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition hover:bg-[color:var(--ds-bg-soft)]">{children}</button>;
}
type DomainTone = "green" | "purple" | "coral" | "gold" | "blue" | "teal";

const domainToneClasses: Record<DomainTone, { icon: string; accent: string; glow: string }> = {
  green: { icon: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500", glow: "shadow-[0_14px_30px_rgba(16,185,129,0.16)]" },
  purple: { icon: "bg-violet-100 text-violet-700", accent: "bg-violet-500", glow: "shadow-[0_14px_30px_rgba(124,58,237,0.15)]" },
  coral: { icon: "bg-rose-100 text-rose-700", accent: "bg-rose-500", glow: "shadow-[0_14px_30px_rgba(244,63,94,0.14)]" },
  gold: { icon: "bg-amber-100 text-amber-700", accent: "bg-amber-500", glow: "shadow-[0_14px_30px_rgba(217,119,6,0.16)]" },
  blue: { icon: "bg-sky-100 text-sky-700", accent: "bg-sky-500", glow: "shadow-[0_14px_30px_rgba(14,165,233,0.14)]" },
  teal: { icon: "bg-teal-100 text-teal-700", accent: "bg-teal-500", glow: "shadow-[0_14px_30px_rgba(13,148,136,0.14)]" },
};

function ExecutiveNumber({ icon: Icon, tone, label, value, meta, period }: { icon: typeof ShoppingCart; tone: DomainTone; label: string; value: string; meta: string; period: string }) {
  const classes = domainToneClasses[tone];
  return (
    <Surface className="relative min-h-[150px] overflow-hidden p-5 shadow-[0_18px_45px_rgba(12,47,63,0.07)]">
      <div className={"absolute left-5 top-0 h-1 w-16 rounded-b-full " + classes.accent} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--ds-text-secondary)]">{label}</p>
          <p className="mt-4 break-words text-3xl font-semibold leading-none text-[color:var(--ds-text)]">{value}</p>
          <p className="mt-3 text-xs font-semibold text-[color:var(--ds-text-muted)]">{meta}</p>
          <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{period}</p>
        </div>
        <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " + classes.icon + " " + classes.glow}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Surface>
  );
}

function InstagramBrandIcon() {
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_30%_110%,#feda75_0%,#fa7e1e_25%,#d62976_48%,#962fbf_72%,#4f5bd5_100%)] text-white shadow-[0_18px_42px_rgba(214,41,118,0.22)]"><Instagram className="h-7 w-7" /></span>;
}

function InstagramSpotlight({ instagram }: { instagram: ReturnType<typeof instagramSummary> }) {
  return (
    <Surface className="relative overflow-hidden p-5 shadow-[0_22px_70px_rgba(12,47,63,0.08)] sm:p-6">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-[radial-gradient(circle_at_70%_20%,rgba(214,41,118,0.16),rgba(250,126,30,0.07)_42%,transparent_70%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <InstagramBrandIcon />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--ds-accent)]">Instagram</p>
            <h3 className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">{instagram.audienceTitle}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ds-text-secondary)]">{instagram.insight}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <DataFreshness label={instagram.freshness} stale={instagram.stale} />
          <ActionLink onClick={() => window.location.assign("/marketing?view=instagram")}>Ver Instagram</ActionLink>
        </div>
      </div>
      <div className="relative mt-7 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-3xl bg-[color:var(--ds-bg-soft)] p-5">
          <p className="text-sm font-semibold text-[color:var(--ds-text-secondary)]">Seguidores atuais</p>
          <p className="mt-3 text-5xl font-semibold leading-none text-[color:var(--ds-text)]">{instagram.followers != null ? numberLabel(instagram.followers) : "Sem dado"}</p>
          <div className="mt-5 grid gap-3">
            <FollowerDelta label="D-1" value={instagram.netDay} muted={!instagram.hasDay} />
            <FollowerDelta label="7 dias" value={instagram.net7} muted={!instagram.has7} />
            <FollowerDelta label="30 dias" value={instagram.net30} muted={!instagram.has30} />
          </div>
        </div>
        <div className="min-w-0 rounded-3xl border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ds-text)]">Seguidores - últimos 30 dias</p>
              <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">Série diária persistida</p>
            </div>
            <StatusBadge tone={instagram.healthTone}>{instagram.healthLabel}</StatusBadge>
          </div>
          <FollowerSparkline points={instagram.sparkline} />
        </div>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniDomainCard icon={LineChart} tone="blue" label="Alcance" value={numberLabel(instagram.reach)} detail={instagram.posts ? instagram.posts + " conteúdos" : "Sem posts no período"} />
        <MiniDomainCard icon={Sparkles} tone="purple" label="Interações" value={numberLabel(instagram.interactions)} detail={instagram.period} />
        <MiniDomainCard icon={ClipboardList} tone="teal" label="Conteúdos" value={numberLabel(instagram.posts)} detail={instagram.period} />
        <MiniDomainCard icon={CheckCircle2} tone="gold" label="Salvos" value={numberLabel(instagram.saves)} detail={instagram.period} />
      </div>
      {instagram.highlight ? <div className="relative mt-5"><ActionCard icon={Instagram} title="Destaque da semana" meta={instagram.highlight.meta} description={instagram.highlight.description} tone="primary" /></div> : null}
      {instagram.association ? <InsightCard title="Possível associação" tone="info">{instagram.association}</InsightCard> : null}
      <div className="relative mt-5 grid gap-3 md:grid-cols-3">
        {instagram.monthInsights.map((item) => <MiniDomainCard key={item.label} icon={item.icon} tone={item.tone} label={item.label} value={item.value} detail={item.detail} />)}
      </div>
    </Surface>
  );
}

function FollowerDelta({ label, value, muted }: { label: string; value: number; muted: boolean }) {
  const positive = value > 0;
  const negative = value < 0;
  return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--ds-surface-solid)] px-4 py-3 text-sm"><span className="font-semibold text-[color:var(--ds-text-secondary)]">{label}</span><span className={muted ? "font-semibold text-[color:var(--ds-text-muted)]" : positive ? "font-semibold text-emerald-700" : negative ? "font-semibold text-amber-700" : "font-semibold text-[color:var(--ds-text)]"}>{muted ? "indisponível" : signedNumberLabel(value)}</span></div>;
}

function FollowerSparkline({ points }: { points: Array<{ date: string; value: number }> }) {
  if (points.length < 3) return <div className="mt-5 flex h-48 items-center justify-center rounded-2xl bg-[color:var(--ds-bg-soft)] text-sm font-semibold text-[color:var(--ds-text-secondary)]">Histórico sendo construído</div>;
  const width = 520;
  const height = 190;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 24) - 12;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = path + ` L${width},${height} L0,${height} Z`;
  const lastY = height - (((values.at(-1) ?? min) - min) / range) * (height - 24) - 12;
  return (
    <svg className="mt-5 h-48 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução de seguidores nos últimos 30 dias">
      <defs>
        <linearGradient id="instagramLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#f59e0b" /><stop offset="45%" stopColor="#d62976" /><stop offset="100%" stopColor="#4f5bd5" /></linearGradient>
        <linearGradient id="instagramArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d62976" stopOpacity="0.18" /><stop offset="100%" stopColor="#d62976" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={area} fill="url(#instagramArea)" />
      <path d={path} fill="none" stroke="url(#instagramLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <circle cx={width} cy={lastY} r="5" fill="#d62976" />
    </svg>
  );
}

function MiniDomainCard({ icon: Icon, tone, label, value, detail }: { icon: typeof ShoppingCart; tone: DomainTone; label: string; value: string; detail: string }) {
  const classes = domainToneClasses[tone];
  return <div className="rounded-3xl border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]"><div className="flex items-start gap-3"><span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl " + classes.icon}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold text-[color:var(--ds-text-secondary)]">{label}</p><p className="mt-1 break-words text-xl font-semibold text-[color:var(--ds-text)]">{value}</p><p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{detail}</p></div></div></div>;
}

function DecisionRow({ item }: { item: OsActivity }) {
  const details = [
    ["Motivo", item.evidence[0]],
    ["Responsável", item.owner],
    ["Prazo", formatDue(item.dueAt)],
    ["Próxima ação", item.approvalRequired ? "Validar ou aprovar" : "Acompanhar pelo módulo de origem"],
    ["Origem", item.sourceModule],
    ["Status", item.status],
  ].filter(([, value]) => Boolean(value));
  return (
    <details className="group rounded-3xl border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-3 shadow-[var(--ds-shadow-sm)] open:rounded-[1.5rem]">
      <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + (item.priority === "critical" ? "bg-rose-500" : item.priority === "high" ? "bg-amber-500" : "bg-[color:var(--ds-accent)]")} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[color:var(--ds-text)]">{item.title}</p>
          <p className="truncate text-xs text-[color:var(--ds-text-muted)]">{item.sourceModule} · {formatDue(item.dueAt)}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[color:var(--ds-text-muted)] transition group-open:rotate-90" />
      </summary>
      <div className="mt-3 grid gap-2 rounded-2xl bg-[color:var(--ds-bg-soft)] p-3 text-xs text-[color:var(--ds-text-secondary)] sm:grid-cols-2">
        {details.map(([label, value]) => <p key={label}><span className="font-semibold text-[color:var(--ds-text)]">{label}:</span> {value}</p>)}
      </div>
    </details>
  );
}

function AgendaRow({ title, type, startsAt }: { title: string; type: string; startsAt: string }) {
  const date = new Date(startsAt);
  const label = Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date).replace(".", "").toUpperCase();
  return <div className="flex items-center gap-4 rounded-3xl border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]"><span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-100 px-2 text-center text-xs font-semibold leading-4 text-amber-800">{label}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[color:var(--ds-text)]">{title}</p><p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{type}</p></div></div>;
}

function ActionLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ds-primary)] hover:text-[color:var(--ds-accent)]">{children}<ArrowRight className="h-4 w-4" /></button>;
}

function Empty({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>;
}

function executiveDateRange(period: ExecutivePeriod, now: Date): DateRange {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (period === "month") return { key: period, label: monthYearLabel(startOfMonth), start: startOfMonth, end: endOfToday, isFiltered: true };
  if (period === "previousMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { key: period, label: monthYearLabel(start), start, end, isFiltered: true };
  }
  if (period === "last30") {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { key: period, label: "Últimos 30 dias", start, end: endOfToday, isFiltered: true };
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { key: period, label: String(now.getFullYear()), start, end: endOfToday, isFiltered: true };
  }
  return { key: period, label: "Todo o histórico disponível", start: null, end: null, isFiltered: false };
}

function monthYearLabel(date: Date) {
  const value = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dateInRange(value: string | null | undefined, range: DateRange) {
  if (!range.start || !range.end) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= range.start && date <= range.end;
}

function isConfirmedCommercialSale(sale: NorwynContext["commercialSales"][number]) {
  return sale.commercial_transaction !== false && sale.sale_confirmed === true;
}

function isRevenueEligibleBrlSale(sale: NorwynContext["commercialSales"][number]) {
  return isConfirmedCommercialSale(sale) && sale.revenue_eligible === true && isBrlSaleForUi(sale);
}

function isStudentEligibleBrlSale(sale: NorwynContext["commercialSales"][number]) {
  return isConfirmedCommercialSale(sale) && sale.student_eligible === true && isBrlSaleForUi(sale);
}

function isRefundOrChargeback(sale: NorwynContext["commercialSales"][number]) {
  const status = normalizeStatusForUi(sale.status_normalizado ?? sale.status_original);
  return status.includes("reembolso") || status.includes("chargeback");
}

function productsStudentsSummary(context: NorwynContext, snapshot: ReturnType<typeof buildOperationalOs>) {
  const revenueSales = context.commercialSales.filter(isRevenueEligibleBrlSale);
  const studentSales = context.commercialSales.filter(isStudentEligibleBrlSale);
  const byBuyer = new Map<string, NorwynContext["commercialSales"]>();
  for (const sale of studentSales) {
    const key = String(sale.comprador_email ?? "").trim().toLowerCase();
    if (!key) continue;
    const list = byBuyer.get(key) ?? [];
    list.push(sale);
    byBuyer.set(key, list);
  }
  const ltvValues = [...byBuyer.values()].map((sales) => sales.filter((sale) => sale.revenue_eligible === true).reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0)).filter((value) => value > 0);
  const repurchase = [...byBuyer.values()].filter((sales) => new Set(sales.map((sale) => sale.transaction_id ?? sale.id)).size >= 2).length;
  const activeProducts = context.products.filter((product) => product.ativo !== false && !isTestRecordForHome([product.nome_oficial, product.produto_base, product.status])).length || snapshot.productOptions.length;
  const students = snapshot.students.length || byBuyer.size;
  const averageLtv = ltvValues.length ? ltvValues.reduce((sum, value) => sum + value, 0) / ltvValues.length : 0;
  const repurchaseLabel = byBuyer.size ? `${numberLabel(repurchase)} / ${new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(repurchase / byBuyer.size)}` : "Sem dados";
  return { activeProducts, students, averageLtv, repurchaseLabel, revenue: revenueSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0) };
}

function digitalHealthSummary(context: NorwynContext) {
  const activeLandings = context.landingRegistry.filter((landing) => landing.status !== "archived" && landing.status !== "inactive").length;
  const activeSites = new Set(context.landingRegistry.filter((landing) => landing.status !== "archived" && landing.url).map((landing) => safeHostname(landing.url))).size;
  const openIncidents = context.growthIncidents.filter((incident) => !["resolved", "closed", "ignored"].includes(String(incident.status ?? "").toLowerCase()));
  const blockers = openIncidents.filter((incident) => incident.severity === "BLOCKER" || incident.severity === "CRITICAL").length;
  const healthLabel = blockers ? "Atenção" : openIncidents.length ? "Acompanhar" : "Saudável";
  const tone: DomainTone = blockers ? "coral" : openIncidents.length ? "gold" : "green";
  const detail = openIncidents.length ? `${openIncidents.length} incidente(s) aberto(s)` : "sem alerta real aberto";
  return { activeLandings, activeSites, openIncidents: openIncidents.length, healthLabel, tone, detail };
}

function operationalAttentionSummary(context: NorwynContext, operation: ReturnType<typeof summarizeOperation>, digitalHealth: ReturnType<typeof digitalHealthSummary>, automations: ReturnType<typeof summarizeAutomations>) {
  const items: Array<{ icon: typeof AlertTriangle; title: string; meta: string; description: string; tone: "neutral" | "warning" | "success" | "info" | "danger" }> = [];
  if (operation.overdue > 0) items.push({ icon: ClipboardList, title: "Atividades vencidas", meta: `${operation.overdue} pendência(s)`, description: "Acompanhamento operacional, sem duplicar o módulo Atividades.", tone: "warning" });
  if (digitalHealth.openIncidents > 0) items.push({ icon: ShieldCheck, title: "Saúde Digital", meta: digitalHealth.healthLabel, description: digitalHealth.detail, tone: digitalHealth.healthLabel === "Atenção" ? "warning" : "info" });
  if (automations.attention) items.push({ icon: Bot, title: "Automações", meta: "Acompanhar", description: automations.attention, tone: "warning" });
  if (!items.length) items.push({ icon: CheckCircle2, title: "Operação sem alerta crítico", meta: "Tudo em acompanhamento", description: "Nenhum incidente real ou atividade vencida apareceu no contexto carregado.", tone: "success" });
  return items.slice(0, 4);
}

function canCreateActivityFromHome(context: NorwynContext) {
  const role = functionalRoleFor(context.role);
  if (isAdminRole(context.role) || role === "ESPECIALISTA") return true;
  return context.allowedModules.includes("atividades") || context.allowedModules.includes("norwyn");
}

function safeHostname(value: string | null | undefined) {
  if (!value) return "";
  try { return new URL(value).hostname; } catch { return String(value).split("/")[0] ?? value; }
}

function isTestRecordForHome(values: Array<string | null | undefined>) {
  return values.some((value) => /\b(test|qa|demo|sandbox)\b/i.test(String(value ?? "")));
}
function executiveBusinessSummary(context: NorwynContext, range: DateRange) {
  const confirmedSales = context.commercialSales.filter((sale) => isRevenueEligibleBrlSale(sale) && dateInRange(sale.data_aprovacao ?? sale.data_compra ?? sale.last_event_at, range));
  const studentSales = context.commercialSales.filter((sale) => isStudentEligibleBrlSale(sale) && dateInRange(sale.data_aprovacao ?? sale.data_compra ?? sale.last_event_at, range));
  const students = new Set(studentSales.map((sale) => sale.comprador_email).filter(Boolean));
  const campaigns = context.campaigns.filter((campaign) => {
    const status = normalizeStatusForUi(campaign.status);
    return !status.includes("arquivado") && !status.includes("encerrado") && (dateInRange(campaign.starts_at ?? campaign.updated_at, range) || dateInRange(campaign.ends_at ?? campaign.updated_at, range));
  });
  const adsRows = context.adsRows.filter((row) => dateInRange(row.data_referencia ?? row.imported_at, range));
  return {
    salesCount: confirmedSales.length,
    salesValue: confirmedSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0),
    students: students.size,
    campaigns: campaigns.length,
    adsRows: adsRows.length,
    adsSpend: adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0),
  };
}

function financeSummary(context: NorwynContext, range: DateRange) {
  const revenueSales = context.commercialSales.filter((sale) => isRevenueEligibleBrlSale(sale) && dateInRange(sale.data_aprovacao ?? sale.data_compra ?? sale.last_event_at, range));
  const refunds = context.commercialSales.filter((sale) => isBrlSaleForUi(sale) && isRefundOrChargeback(sale) && dateInRange(sale.data_reembolso ?? sale.data_aprovacao ?? sale.data_compra ?? sale.last_event_at, range));
  const adsRows = context.adsRows.filter((row) => dateInRange(row.data_referencia ?? row.imported_at, range));
  const financeRows = context.financeLancamentos.filter((entry) => entry.status !== "cancelado");
  const entries = financeRows
    .filter((entry) => entry.tipo === "entrada" && dateInRange(entry.data_pagamento ?? entry.mes_competencia, range))
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const expenses = financeRows
    .filter((entry) => entry.tipo === "saida" && dateInRange(entry.data_pagamento ?? entry.mes_competencia, range))
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const now = new Date();
  const nextLimit = new Date(now);
  nextLimit.setDate(nextLimit.getDate() + 30);
  const nextReceipts = financeRows
    .filter((entry) => entry.tipo === "entrada" && ["previsto", "pendente", "aberto"].includes(normalizeStatusForUi(entry.status)) && dateBetweenLoose((entry as any).vencimento ?? entry.data_pagamento ?? entry.mes_competencia, now, nextLimit))
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const nextPayments = financeRows
    .filter((entry) => entry.tipo === "saida" && ["previsto", "pendente", "aberto"].includes(normalizeStatusForUi(entry.status)) && dateBetweenLoose((entry as any).vencimento ?? entry.data_pagamento ?? entry.mes_competencia, now, nextLimit))
    .reduce((sum, entry) => sum + Number(entry.valor ?? 0), 0);
  const salesValue = revenueSales.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const refundValue = refunds.reduce((sum, sale) => sum + Number(sale.valor_bruto ?? 0), 0);
  const adsSpend = adsRows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const hasAnyData = revenueSales.length || adsRows.length || expenses || entries || nextReceipts || nextPayments || refunds.length;
  return { sales: salesValue, refunds: refundValue, adsSpend, expenses, entries, nextReceipts, nextPayments, estimated: hasAnyData ? salesValue + entries - refundValue - adsSpend - expenses : null };
}
function isBrlSaleForUi(sale: NorwynContext["commercialSales"][number]) {
  return String(sale.moeda ?? "BRL").toUpperCase() === "BRL";
}

function normalizeStatusForUi(value: string | null | undefined) {
  return humanizeText(value)?.toLowerCase() ?? "";
}
function useLocalClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const value = now ?? new Date();
  const hour = value.getHours();
  const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(value);
  return { greeting, dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1) };
}

function displayUserName(context: NorwynContext) {
  const raw = context.user?.preferredName ?? context.user?.name ?? context.user?.email ?? "pessoa";
  const first = raw.includes("@") ? raw.split("@")[0] : raw;
  return first.trim() || "pessoa";
}

function numberLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function humanizeText(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replace(/NO DATA/g, "sem dados")
    .replace(/NOT_INSTRUMENTED|NOT INSTRUMENTED/g, "ainda não disponível")
    .replace(/UNKNOWN/g, "a confirmar")
    .replace(/\bOK\b/g, "identificado")
    .replace(/commercial/gi, "comercial")
    .replace(/growth/gi, "marketing")
    .replace(/students/gi, "alunos")
    .replace(/experience/gi, "experiência")
    .replace(/operation/gi, "operação")
    .replace(/finance/gi, "financeiro");
}

function statusLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    UNKNOWN: "A confirmar",
    OK: "Identificado",
    "NO DATA": "Sem dados neste período",
    NOT_INSTRUMENTED: "Ainda não disponível",
    "NOT INSTRUMENTED": "Ainda não disponível",
    "NOT CONFIGURED": "Ainda não configurado",
    PARTIAL: "Parcial",
    STALE: "Dados desatualizados",
  };
  return labels[normalized] ?? value ?? "Sem dados";
}

function sourceLabel(value: string) {
  const labels: Record<string, string> = {
    commercial: "Comercial",
    growth: "Marketing",
    content: "Conteúdo",
    students: "Alunos",
    experience: "Experiência",
    operation: "Operação",
    finance: "Financeiro",
  };
  return labels[value] ?? value;
}
function instagramSummary(context: NorwynContext, range: DateRange) {
  const posts = (context.posts ?? []).filter((post) => dateInRange(post.data_postagem, range));
  const reach = posts.reduce((sum, post) => sum + Number(post.alcance ?? 0), 0);
  const interactions = posts.reduce((sum, post) => sum + Number(post.likes ?? 0) + Number(post.comentarios ?? 0) + Number(post.compartilhamentos ?? 0), 0);
  const saves = posts.reduce((sum, post) => sum + Number(post.salvos ?? 0), 0);
  const summary = context.instagramFollowerGrowthSummary;
  const daily = [...(context.instagramFollowerDailyMetrics ?? [])]
    .filter((item: any) => item.snapshot_date && item.followers_total != null)
    .sort((a: any, b: any) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
  const sparkline = daily.slice(-30).map((item: any) => ({ date: String(item.snapshot_date), value: Number(item.followers_total ?? 0) }));
  const latestPost = posts.map((post) => post.data_postagem).filter(Boolean).sort().at(-1) ?? null;
  const latestDaily = daily.at(-1) as any;
  const freshnessDate = summary?.updated_at ?? latestDaily?.updated_at ?? summary?.latest_date ?? latestDaily?.snapshot_date ?? latestPost;
  const freshnessTime = freshnessDate ? new Date(freshnessDate).getTime() : NaN;
  const isStale = !freshnessDate || Number.isNaN(freshnessTime) || Date.now() - freshnessTime > 48 * 60 * 60 * 1000;
  const followers = summary?.followers_current ?? latestDaily?.followers_total ?? null;
  const netDay = Number(summary?.net_growth_day ?? latestDaily?.net_change_day ?? 0);
  const net7 = Number(summary?.net_growth_7d ?? deltaFromDaily(daily, 7) ?? 0);
  const net30 = Number(summary?.net_growth_30d ?? deltaFromDaily(daily, 30) ?? 0);
  const lossDays30 = Number(summary?.loss_days_30d ?? daily.slice(-30).filter((item: any) => Number(item.net_change_day ?? 0) < 0).length);
  const gainDays30 = Number(summary?.gain_days_30d ?? daily.slice(-30).filter((item: any) => Number(item.net_change_day ?? 0) > 0).length);
  const negativeStreak = trailingFollowerLossDays(daily);
  const hasDay = Boolean(summary?.net_growth_day != null || latestDaily?.net_change_day != null);
  const has7 = Boolean(summary?.net_growth_7d != null || daily.length >= 8);
  const has30 = Boolean(summary?.net_growth_30d != null || daily.length >= 30);
  const health = instagramAudienceHealth({ netDay, net7, net30, has7, has30, lossDays30, gainDays30, negativeStreak, reach, interactions });
  const highlight = topInstagramPost(posts);
  const association = instagramTemporalAssociation(posts, daily);
  const monthInsights = instagramMonthInsights(posts);
  return {
    posts: posts.length,
    reach,
    interactions,
    saves,
    followers: followers == null ? null : Number(followers),
    netDay,
    net7,
    net30,
    hasDay,
    has7,
    has30,
    trendLabel: health.label,
    stale: isStale,
    period: posts.length ? range.label : "Sem posts em " + range.label,
    freshness: freshnessDate ? freshnessLabelFromDate(freshnessDate, isStale) : "Sem dados",
    sparkline,
    healthLabel: health.label,
    healthTone: health.tone,
    audienceTitle: health.title,
    insight: instagramInsight({ netDay, net7, net30, has7, has30, negativeStreak, reach, interactions }),
    highlight,
    association,
    monthInsights,
  };
}
function deltaFromDaily(rows: any[], days: number) {
  if (rows.length <= days) return null;
  const latest = rows.at(-1);
  const previous = rows.at(-1 - days);
  if (!latest || !previous) return null;
  return Number(latest.followers_total ?? 0) - Number(previous.followers_total ?? 0);
}

function trailingFollowerLossDays(rows: any[]) {
  let count = 0;
  for (const item of [...rows].reverse()) {
    if (Number(item.net_change_day ?? 0) < 0) count += 1;
    else break;
  }
  return count;
}

function instagramAudienceHealth(input: { netDay: number; net7: number; net30: number; has7: boolean; has30: boolean; lossDays30: number; gainDays30: number; negativeStreak: number; reach: number; interactions: number }) {
  if (input.has30 && input.net30 > 0 && input.has7 && input.net7 > 0) return { label: "CRESCIMENTO ACELERANDO", title: "Sua audiência está em crescimento", tone: "success" as const };
  if (input.negativeStreak >= 4 && input.has7 && input.net7 < 0) return { label: "ATENÇÃO À TENDÊNCIA", title: "Vale acompanhar esta tendência", tone: "warning" as const };
  if (input.has30 && input.net30 > 0) return { label: "AUDIÊNCIA SAUDÁVEL", title: "Sua audiência segue saudável", tone: "success" as const };
  if (input.has7 && input.net7 < 0 && input.reach === 0 && input.interactions === 0) return { label: "MUDANÇA RELEVANTE", title: "Vale investigar os sinais recentes", tone: "warning" as const };
  return { label: "AUDIÊNCIA ESTÁVEL", title: "Audiência estável", tone: "neutral" as const };
}

function instagramInsight(input: { netDay: number; net7: number; net30: number; has7: boolean; has30: boolean; negativeStreak: number; reach: number; interactions: number }) {
  if (input.netDay < 0 && input.has7 && input.net7 > 0 && input.has30 && input.net30 > 0) return `A variação de ${signedNumberLabel(input.netDay)} desde ontem parece oscilação normal. A tendência de 7 e 30 dias continua positiva.`;
  if (input.negativeStreak >= 4 && input.has7 && input.net7 < 0) return "Seguidores caíram por alguns dias seguidos. Como o alcance também deve ser observado, vale revisar os conteúdos publicados nesse período.";
  if (input.has30 && input.net30 > 0) return `A audiência cresceu ${signedNumberLabel(input.net30)} nos últimos 30 dias. O movimento continua saudável no recorte disponível.`;
  if (input.reach > 0 || input.interactions > 0) return "Há sinais de alcance e interação no período. A leitura de seguidores ainda deve ser acompanhada junto com conteúdo e engajamento.";
  return "Ainda não há histórico suficiente para uma leitura forte. A Norwyn vai acompanhar a série diária sem inventar tendência.";
}

function topInstagramPost(posts: NorwynContext["posts"]) {
  const best = [...posts].sort((a, b) => Number(b.alcance ?? 0) - Number(a.alcance ?? 0))[0];
  if (!best || !Number(best.alcance ?? 0)) return null;
  return {
    meta: best.tipo ?? "Conteúdo",
    description: `${best.legenda ? truncateText(best.legenda, 80) : "Conteúdo com melhor alcance no período"} · ${numberLabel(Number(best.alcance ?? 0))} de alcance`,
  };
}

function instagramTemporalAssociation(posts: NorwynContext["posts"], daily: any[]) {
  if (posts.length < 3 || daily.length < 7) return null;
  const gains = daily
    .map((row: any) => ({ date: String(row.snapshot_date), gain: Number(row.net_change_day ?? 0) }))
    .filter((row) => row.gain > 0)
    .sort((a, b) => b.gain - a.gain);
  const bestGain = gains[0];
  if (!bestGain) return null;
  const related = posts
    .filter((post) => {
      const postDate = parseDateOnly(post.data_postagem);
      const gainDate = parseDateOnly(bestGain.date);
      if (!postDate || !gainDate) return false;
      const diffDays = Math.abs((gainDate.getTime() - postDate.getTime()) / 86400000);
      return diffDays <= 2;
    })
    .sort((a, b) => Number(b.alcance ?? 0) - Number(a.alcance ?? 0))[0];
  if (!related) return null;
  return `Dado observado: o maior crescimento diário foi ${signedNumberLabel(bestGain.gain)} em ${formatShortDate(bestGain.date)}. Possível associação: aconteceu próximo de ${related.tipo ?? "um conteúdo"} publicado em ${formatShortDate(related.data_postagem)}, sem afirmar causalidade.`;
}

function instagramMonthInsights(posts: NorwynContext["posts"]) {
  if (posts.length < 5) {
    return [
      { icon: CalendarClock, tone: "blue" as DomainTone, label: "Insights do mês", value: "Sinal atual", detail: "amostra ainda pequena" },
      { icon: Megaphone, tone: "coral" as DomainTone, label: "Formato", value: "A confirmar", detail: "não há base suficiente" },
      { icon: Sparkles, tone: "purple" as DomainTone, label: "Horário", value: "A confirmar", detail: "aguardando mais publicações" },
    ];
  }
  const byDay = bestGroup(posts, (post) => dayNameFromDate(post.data_postagem), (post) => Number(post.alcance ?? 0));
  const byHour = bestGroup(posts.filter((post) => post.hora_postagem), (post) => hourLabel(post.hora_postagem), (post) => Number(post.likes ?? 0) + Number(post.comentarios ?? 0) + Number(post.compartilhamentos ?? 0));
  const byFormat = bestGroup(posts, (post) => post.tipo ?? "Outro", (post) => Number(post.alcance ?? 0));
  return [
    { icon: CalendarClock, tone: "blue" as DomainTone, label: "Melhor dia por alcance", value: byDay?.label ?? "A confirmar", detail: byDay ? `${numberLabel(Math.round(byDay.average))} de alcance médio` : "sem amostra suficiente" },
    { icon: Sparkles, tone: "purple" as DomainTone, label: "Melhor horário por interação", value: byHour?.label ?? "A confirmar", detail: byHour ? `${numberLabel(Math.round(byHour.average))} interações médias` : "sem horário suficiente" },
    { icon: Megaphone, tone: "coral" as DomainTone, label: "Melhor formato por alcance", value: byFormat?.label ?? "A confirmar", detail: byFormat ? `${numberLabel(Math.round(byFormat.average))} de alcance médio` : "sem amostra suficiente" },
  ];
}

function bestGroup<T>(items: T[], groupBy: (item: T) => string, valueOf: (item: T) => number) {
  const groups = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const label = groupBy(item);
    if (!label) continue;
    const current = groups.get(label) ?? { total: 0, count: 0 };
    current.total += valueOf(item);
    current.count += 1;
    groups.set(label, current);
  }
  return [...groups.entries()]
    .filter(([, value]) => value.count >= 2)
    .map(([label, value]) => ({ label, average: value.total / value.count, count: value.count }))
    .sort((a, b) => b.average - a.average)[0] ?? null;
}

function dayNameFromDate(value: string | null | undefined) {
  const date = parseDateOnly(value);
  if (!date) return "";
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function hourLabel(value: string | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/(\d{1,2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}h`;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function freshnessLabelFromDate(value: string, stale: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return stale ? "Dados desatualizados" : "Atualizado recentemente";
  const now = new Date();
  const diffHours = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 36e5));
  const sameDay = date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
  if (stale) return diffHours >= 24 ? `Última atualização há ${Math.floor(diffHours / 24)} dia(s)` : "Dados desatualizados";
  return sameDay ? `Atualizado hoje às ${time}` : `Atualizado em ${formatShortDate(value)}`;
}

function dateBetweenLoose(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
}

function truncateText(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + "…" : value;
}
function automationToneFromDate(value: string | null | undefined) {
  if (!value) return { label: "Sem sync", tone: "warning" as const };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: "Sem sync", tone: "warning" as const };
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 12) return { label: "Saudável", tone: "success" as const };
  if (hours <= 24) return { label: "Atenção", tone: "warning" as const };
  return { label: "Desatualizado", tone: "warning" as const };
}

function summarizeAutomations(context: NorwynContext) {
  const manychatHealth = automationToneFromDate(context.manychatSummary?.collected_at as string | null | undefined);
  const activeTelegram = (context.telegramSchedules ?? []).filter((item) => item.canal === "telegram" && item.ativo);
  const telegramSends = (context.telegramSends ?? []).filter((item) => item.canal === "telegram");
  const recentFailure = telegramSends.find((item) => String(item.status ?? "").toLowerCase().includes("falh"));
  const telegramTone = recentFailure ? "warning" as const : activeTelegram.length || telegramSends.length ? "success" as const : "neutral" as const;
  const telegramLabel = recentFailure ? "Atenção" : activeTelegram.length || telegramSends.length ? "Saudável" : "Sem atividade";
  const manychatAttention = manychatHealth.tone !== "success" ? "ManyChat está " + manychatHealth.label.toLowerCase() + "." : null;
  const telegramAttention = recentFailure ? "Falha recente em envio Telegram." : null;
  return {
    manychatLabel: manychatHealth.label,
    manychatTone: manychatHealth.tone,
    manychatDetail: context.manychatSummary ? numberLabel(Number(context.manychatSummary.growth_tools_count ?? 0)) + " gatilhos detectados" : "Sem snapshot",
    telegramLabel,
    telegramTone,
    telegramDetail: activeTelegram[0]?.horario ? "Próximo horário: " + String(activeTelegram[0].horario).slice(0, 5) : activeTelegram.length + " agendamento(s) ativo(s)",
    attention: [manychatAttention, telegramAttention].filter(Boolean).join(" "),
  };
}

function summarizeOperation(context: NorwynContext) {
  const tasks = context.atividades ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const closed = new Set(["concluido", "concluida", "done", "finalizado", "cancelado"]);
  return {
    inProgress: tasks.filter((item) => !closed.has(normalizeStatusForUi(item.status))).length,
    overdue: tasks.filter((item) => !closed.has(normalizeStatusForUi(item.status)) && String(item.prazo ?? item.due_at ?? "") < today).length,
    approval: tasks.filter((item) => item.approval_required || normalizeStatusForUi(item.status).includes("aprova")).length,
  };
}

function summarizeTeamDemand(context: NorwynContext) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const closed = new Set(["concluido", "concluida", "done", "finalizado", "cancelado", "ignorada"]);
  const open = (context.atividades ?? []).filter((item) => !closed.has(normalizeStatusForUi(item.status)));
  const rows = [
    { label: "Ryan", match: (item: NorwynContext["atividades"][number]) => item.time_responsavel === "suporte" || normalizeStatusForUi((item as any).responsavel_nome).includes("ryan") },
    { label: "Jefferson", match: (item: NorwynContext["atividades"][number]) => item.time_responsavel === "gestao_dados" || normalizeStatusForUi((item as any).responsavel_nome).includes("jeff") },
    { label: "Minhas", match: (item: NorwynContext["atividades"][number]) => item.time_responsavel === "especialista" || normalizeStatusForUi((item as any).responsavel_nome).includes("juliana") },
  ];
  return rows.map((row) => {
    const tasks = open.filter(row.match);
    const dueToday = tasks.filter((item) => String(item.prazo ?? item.due_at ?? "").slice(0, 10) === today).length;
    const overdue = tasks.filter((item) => {
      const due = String(item.prazo ?? item.due_at ?? "").slice(0, 10);
      return Boolean(due && due < today);
    }).length;
    return {
      label: row.label,
      overdue,
      meta: `${dueToday} hoje · ${overdue} atrasada(s)`,
      description: tasks.length ? `${tasks.length} demanda(s) aberta(s) na fonte oficial de Atividades.` : "Sem demanda aberta no momento.",
    };
  });
}
function signedNumberLabel(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? "+" + numberLabel(numeric) : numberLabel(numeric);
}
function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatFriendlyDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (sameDay) return `hoje às ${time}`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
}
function priorityLabel(priority: OsActivity["priority"]) {
  const labels: Record<OsActivity["priority"], string> = { critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa" };
  return labels[priority];
}

function toneFromPriority(priority: OsActivity["priority"]) {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  return "neutral";
}

function translateState(state: string | null | undefined) {
  if (!state) return undefined;
  const normalized = state.toUpperCase();
  if (normalized === "NO DATA") return "Sem dados";
  if (normalized === "NOT INSTRUMENTED") return "Ainda sem dados";
  if (normalized === "PARTIAL") return "Parcial";
  if (normalized === "STALE") return "Desatualizado";
  if (normalized === "OK") return "Atualizado";
  return state;
}

function toneFromState(state: string | null | undefined) {
  const normalized = state?.toUpperCase();
  if (normalized === "OK" || normalized === "HIGH") return "success";
  if (normalized === "STALE" || normalized === "PARTIAL" || normalized === "LOW") return "warning";
  if (normalized === "ERROR" || normalized === "BROKEN") return "danger";
  if (normalized === "NO DATA" || normalized === "NOT INSTRUMENTED" || normalized === "UNKNOWN") return "neutral";
  return "info";
}

function formatDue(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function freshnessLabel(snapshot: ReturnType<typeof buildOperationalOs>) {
  const freshness = snapshot.reconciliation.health.find((item) => item.freshness)?.freshness;
  if (!freshness) return "Dados carregados agora";
  return freshness.toLowerCase().includes("stale") ? "Dados desatualizados" : `Atualizado em ${formatFriendlyDateTime(freshness)}`;
}

function hasStaleData(snapshot: ReturnType<typeof buildOperationalOs>) {
  return snapshot.reconciliation.health.some((item) => item.status === "STALE" || item.status === "ERROR");
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number | boolean | null>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number | boolean | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function percent(value: number | null) {
  if (value == null) return "NO DATA";
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

const activePill = "h-8 rounded-md bg-brand-teal px-3 text-xs font-bold text-white";
const idlePill = "h-8 rounded-md px-3 text-xs font-bold text-brand-teal hover:bg-brand-cream";
