"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { AlertTriangle, BookOpenCheck, CheckCircle2, FileSpreadsheet, GraduationCap, Lightbulb, MessageSquareText, PackageCheck, RefreshCw, Sparkles, UploadCloud } from "lucide-react";
import { ActionCard, DataFreshness, EmptyState, IconPill, InsightCard, MetricCard, PageHeader, SectionHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";
import type { ValidationTab } from "@/modules/validacao/services/validation-server";

type ValidationContext = Awaited<ReturnType<typeof import("@/modules/validacao/services/validation-server").getValidationContext>>;

const tabs: Array<{ key: ValidationTab; label: string; href: string; icon: typeof FileSpreadsheet }> = [
  { key: "hotmart", label: "Hotmart", href: "/validacao/hotmart", icon: FileSpreadsheet },
  { key: "produtos", label: "Produtos", href: "/validacao/produtos", icon: PackageCheck },
  { key: "conteudos", label: "Conteúdos", href: "/validacao/conteudos", icon: BookOpenCheck },
];

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function percent(value: number | null | undefined) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number(value ?? 0))}%`;
}

function shortCoverageLabel(value: string) {
  return value.length > 58 ? `${value.slice(0, 55)}...` : value;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function compact(value: unknown, fallback = "Não informado") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function toneForMatch(value: string) {
  if (value === "MATCH_EXACT") return "success" as const;
  if (value === "ONLY_HOTMART" || value === "ONLY_NORWYN") return "warning" as const;
  if (value === "MATCH_DIVERGENT") return "danger" as const;
  return "neutral" as const;
}

export function ValidationCenter({ context }: { context: ValidationContext }) {
  const [activeTab, setActiveTab] = useState<ValidationTab>(context.tab);
  const [feedback, setFeedback] = useState("");
  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  async function submitGeneralFeedback() {
    if (!feedback.trim()) return;
    const response = await fetch("/api/validacao/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation_type: "GENERAL", entity_type: "free_feedback", decision_type: "feedback", comment: feedback, learn_scope: "single_case" }),
    });
    if (response.ok) setFeedback("");
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <PageHeader
        eyebrow="Norwyn"
        title="Central de Validação"
        description="Ajude a Norwyn a entender melhor o negócio. Seus feedbacks viram aprendizado e melhoram nossas sugestões."
        aside={<div className="flex flex-col items-start gap-2 sm:items-end"><DataFreshness label={`Atualizado em ${dateLabel(context.updatedAt)}`} stale={!context.updatedAt} /><StatusBadge tone="info">{context.user.name ?? context.user.email}</StatusBadge></div>}
      />

      {!context.schemaReady ? (
        <InsightCard title="Migration pendente no HML" tone="warning">A Central já está no código. As tabelas novas precisam existir no banco para uploads, decisões e aprendizados persistirem. Erros: {context.schemaErrors.join(" | ") || "schema ainda não confirmado"}.</InsightCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={AlertTriangle} tone="warning" label="Precisam de revisão" value={number(context.bigNumbers.pending)} period="Dinheiro, produto e conteúdo" />
        <MetricCard icon={CheckCircle2} tone="success" label="Validados" value={number(context.bigNumbers.validated)} period="Decisões registradas" />
        <MetricCard icon={RefreshCw} tone="danger" label="Divergências" value={number(context.bigNumbers.divergences)} period="Comparações e moedas" />
        <MetricCard icon={Lightbulb} tone="info" label="Aprendizados" value={number(context.bigNumbers.learnings)} period="Knowledge layer" />
      </section>

      <Surface className="p-2 sm:p-2">
        <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Central de Validação">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-[var(--ds-radius-md)] px-4 py-3 text-sm font-semibold transition ${selected ? "bg-[color:var(--ds-primary)] text-white shadow-[var(--ds-shadow-sm)]" : "text-[color:var(--ds-text-secondary)] hover:bg-[color:var(--ds-bg-soft)]"}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </Surface>

      {active.key === "hotmart" ? <HotmartTab context={context} /> : null}
      {active.key === "produtos" ? <ProductsTab context={context} /> : null}
      {active.key === "conteudos" ? <ContentsTab context={context} /> : null}

      <Surface>
        <SectionHeader eyebrow="Feedback" title="Encontrou algo diferente?" description="Registre um comentário livre. Isso cria um evento de feedback e não altera regras automaticamente." action={<IconPill icon={MessageSquareText} tone="primary" />} />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="min-h-24 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-3 text-sm text-[color:var(--ds-text)] outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" placeholder="Ex.: esse status aparece errado apenas em vendas antigas." />
          <button type="button" onClick={submitGeneralFeedback} className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--ds-primary)] px-5 text-sm font-semibold text-white shadow-[var(--ds-shadow-sm)]">Registrar feedback</button>
        </div>
      </Surface>
    </div>
  );
}

function HotmartTab({ context }: { context: ValidationContext }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const comparisons = context.hotmart.comparisons.slice(0, 80);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)]);
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const response = await fetch("/api/validacao/hotmart/upload", { method: "POST", body: form });
    setResult(await response.json().catch(() => ({})));
    setUploading(false);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={FileSpreadsheet} tone="warning" label="Norwyn bruto" value={number(context.hotmart.transactionsNorwynRaw ?? context.hotmart.transactionsNorwyn)} period="Todos os registros Hotmart" />
        <MetricCard icon={CheckCircle2} tone="success" label="Comerciais comparáveis" value={number(context.hotmart.transactionsNorwyn)} period="Entram no matching" />
        <MetricCard icon={RefreshCw} tone="info" label="Eventos não comparáveis" value={number(context.hotmart.nonComparableEvents ?? 0)} period={`Club: ${number(context.hotmart.clubEvents ?? 0)}`} />
        <MetricCard icon={AlertTriangle} tone="danger" label="Unknown comercial" value={number(context.hotmart.statusUnknown)} period="Só vendas comparáveis" />
        <MetricCard icon={CheckCircle2} tone="success" label="BRL comercial confiável" value={money(context.hotmart.brlCommercialGross)} period="BRL + aprovado/completo" />
      </section>

      <Surface>
        <SectionHeader title="Cobertura histórica" description="Quanto do export oficial da Hotmart já está reconhecido na Norwyn. Lacunas não são inseridas automaticamente." action={<StatusBadge tone="info">{percent(context.hotmart.coverage?.coveragePct)}</StatusBadge>} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard icon={FileSpreadsheet} tone="info" label="Hotmart oficial" value={number(context.hotmart.coverage?.official)} period="Transações do export" />
          <MetricCard icon={CheckCircle2} tone="success" label="Reconhecidas" value={number(context.hotmart.coverage?.matched)} period="MATCH_EXACT + divergentes" />
          <MetricCard icon={AlertTriangle} tone="warning" label="Lacunas" value={number(context.hotmart.coverage?.onlyHotmart)} period="Aguardam classificação" />
        </div>
        <details className="mt-4 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--ds-text)]">Ver lacunas</summary>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <CoverageList title="Por ano" rows={context.hotmart.coverageByYear ?? []} />
            <CoverageList title="Por produto" rows={context.hotmart.coverageByProduct ?? []} />
            <CoverageList title="Por status" rows={context.hotmart.coverageByStatus ?? []} />
          </div>
          <div className="mt-4">
            <CoverageList title="Classificação inicial das lacunas" rows={context.hotmart.onlyHotmartClassification ?? []} />
          </div>
        </details>
      </Surface>
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <Surface>
          <SectionHeader title="Comparar exportação da Hotmart" description="Upload vai para staging, normaliza e compara por Transação. Não altera Comercial, Financeiro, Aluno 360 nem raw data." action={<IconPill icon={UploadCloud} tone="warning" />} />
          <label onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--ds-border-strong)] bg-[color:var(--ds-bg-soft)] p-6 text-center">
            <UploadCloud className="h-10 w-10 text-[color:var(--ds-warning)]" />
            <span className="mt-3 text-sm font-semibold text-[color:var(--ds-text)]">Arraste CSVs oficiais ou selecione arquivos</span>
            <span className="mt-1 text-xs text-[color:var(--ds-text-secondary)]">Aceita múltiplos CSVs de 2020 a 2026</span>
            <input type="file" accept=".csv,text/csv" multiple className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => addFiles(event.target.files)} />
          </label>
          {files.length ? <div className="mt-4 space-y-2 text-sm text-[color:var(--ds-text-secondary)]">{files.map((file) => <div key={`${file.name}-${file.size}`} className="rounded-full bg-[color:var(--ds-bg-soft)] px-3 py-2">{file.name}</div>)}</div> : null}
          <button type="button" onClick={upload} disabled={!files.length || uploading || !context.schemaReady} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--ds-primary)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{uploading ? "Comparando..." : "Comparar com a Norwyn"}</button>
          {result ? <UploadResult result={result} /> : null}
        </Surface>

        <Surface>
          <SectionHeader title="Fila Hotmart" description="Humano revisa divergências, unknown, não encontrados e anomalias. Matches exatos não exigem clique." action={<StatusBadge tone="warning">{number(context.hotmart.needsAttention)} atenção</StatusBadge>} />
          <div className="mt-4 overflow-hidden rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)]">
            <div className="hidden grid-cols-[0.8fr_1fr_1fr_0.8fr_0.8fr_1fr] bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)] lg:grid">
              <span>Data</span><span>Transação</span><span>Produto</span><span>Valor oficial</span><span>Status</span><span>Diferença</span>
            </div>
            <div className="divide-y divide-[color:var(--ds-border)]">
              {comparisons.map((row: any) => <ComparisonRow key={row.id} row={row} />)}
              {!comparisons.length ? <div className="p-4"><EmptyState title="Nenhum upload comparado ainda">Envie os exports oficiais para gerar MATCH_EXACT, divergências, só Hotmart e só Norwyn.</EmptyState></div> : null}
            </div>
          </div>
        </Surface>
      </div>

      <InsightCard title="Universo correto da comparação" tone="warning">ONLY_NORWYN agora significa apenas venda comercial comparável existente na Norwyn sem transação correspondente no export oficial selecionado. Eventos de acesso, módulo e checkout ficam como NON_COMPARABLE e não entram em receita, LTV comercial ou fila de vendas.</InsightCard>
    </div>
  );
}

function CoverageList({ title, rows }: { title: string; rows: Array<{ label: string; official: number; matched: number; onlyHotmart: number; coveragePct: number }> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--ds-text-muted)]">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-surface-solid)] p-3 shadow-[var(--ds-shadow-xs)]">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-[color:var(--ds-text)]">{shortCoverageLabel(row.label)}</span>
              <StatusBadge tone={row.coveragePct >= 90 ? "success" : row.coveragePct >= 60 ? "warning" : "danger"}>{percent(row.coveragePct)}</StatusBadge>
            </div>
            <p className="mt-1 text-xs text-[color:var(--ds-text-secondary)]">Hotmart {number(row.official)} · match {number(row.matched)} · lacunas {number(row.onlyHotmart)}</p>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-[color:var(--ds-text-secondary)]">Sem dados para este recorte.</p> : null}
      </div>
    </div>
  );
}
function UploadResult({ result }: { result: any }) {
  if (result.error) return <InsightCard title="Upload não processado" tone="warning">{result.error}</InsightCard>;
  const reconciliation = result.preview?.hotmartReconciliation;
  return (
    <div className="mt-4 rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4 text-sm text-[color:var(--ds-text-secondary)]">
      <p className="font-semibold text-[color:var(--ds-text)]">Preview do upload</p>
      <p>{number(result.preview?.files)} arquivo(s), {number(result.preview?.uniqueTransactions)} transações únicas, {number(result.preview?.products)} produtos, moedas: {(result.preview?.currencies ?? []).join(", ") || "não disponível"}.</p>
      {reconciliation ? <div className="mt-3 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-3">
        <p className="font-semibold text-[color:var(--ds-text)]">Reconciliação do período</p>
        <p className="mt-1">Total: {number(reconciliation.total_transactions)} = {number(reconciliation.confirmed_transactions)} confirmadas + {number(reconciliation.pending_transactions)} pendentes + {number(reconciliation.lost_transactions)} perdidas + {number(reconciliation.refunded_or_chargeback_transactions)} reembolsadas/chargeback.</p>
        <p className="mt-1">Receita líquida do export: {money(reconciliation.net_revenue_export_total)} · Líquido confirmado: {money(reconciliation.confirmed_net_revenue)} · Reembolso: {reconciliation.refund_rate_pct}% · Chargeback: {reconciliation.chargeback_rate_pct}%</p>
      </div> : null}
      <p className="mt-1">Comparação: {Object.entries(result.comparison ?? {}).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
    </div>
  );
}

function ComparisonRow({ row }: { row: any }) {
  const official = row.official_snapshot ?? {};
  const norwyn = row.norwyn_snapshot ?? {};
  return (
    <div className="grid gap-2 px-3 py-3 text-sm text-[color:var(--ds-text-secondary)] lg:grid-cols-[0.8fr_1fr_1fr_0.8fr_0.8fr_1fr]">
      <span>{dateLabel(official.purchase_date ?? norwyn.data_compra)}</span>
      <span className="font-mono text-xs">{row.transaction_id ?? "sem transação"}</span>
      <span>{compact(official.hotmart_product_name ?? norwyn.produto_nome)}</span>
      <span>{official.normalized_value != null ? `${official.currency ?? ""} ${official.normalized_value}` : "Não comparável"}</span>
      <span>{official.raw_status ?? norwyn.status_original ?? "-"}</span>
      <span className="flex flex-wrap gap-2"><StatusBadge tone={toneForMatch(row.match_status)}>{row.match_status}</StatusBadge>{(row.difference_types ?? []).map((item: string) => <StatusBadge key={item} tone="warning">{item}</StatusBadge>)}</span>
    </div>
  );
}

function ProductsTab({ context }: { context: ValidationContext }) {
  const products = context.products as any;
  const nameGroups = products.nameOnlyReviewGroups ?? [];
  const clubProducts = products.clubProductReviews ?? [];
  const enrollmentGroups = products.enrollmentReviewGroups ?? [];
  const accessOnly = products.accessOnlyGroups ?? [];
  const matchCounts = products.matchCounts ?? {};
  return (
    <div className="space-y-5">
      {products.p14SchemaErrors?.length ? <InsightCard title="Base Student 360 parcial" tone="warning">Algumas views de apoio ainda não responderam: {products.p14SchemaErrors.join(" | ")}</InsightCard> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={PackageCheck} tone="info" label="Produtos a entender" value={number(clubProducts.length)} period="Hotmart Club" />
        <MetricCard icon={GraduationCap} tone="warning" label="Matrículas por revisar" value={number(nameGroups.reduce((sum: number, group: any) => sum + Number(group.enrollments ?? 0), 0))} period={`${number(nameGroups.length)} grupos`} />
        <MetricCard icon={AlertTriangle} tone="warning" label="Vínculos de matrícula" value={number((products.probableEnrollmentEvents ?? 0) + (products.ambiguousEnrollmentEvents ?? 0))} period={`${number(products.probableEnrollmentEvents ?? 0)} prováveis · ${number(products.ambiguousEnrollmentEvents ?? 0)} ambíguos`} />
        <MetricCard icon={Sparkles} tone="info" label="Acesso sem compra" value={number(accessOnly.length)} period="Pessoas observadas no Club" />
      </section>

      <Surface>
        <SectionHeader title="Qualidade do vínculo de produto" description="A Norwyn prioriza ID externo validado. Relação por nome fica para revisão e não vira trusted automaticamente." action={<IconPill icon={PackageCheck} tone="info" />} />
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {['EXACT_EXTERNAL_ID', 'VALIDATED_LEGACY', 'VALIDATED_ALIAS', 'VALIDATED_BUNDLE', 'NAME_ONLY_REVIEW', 'UNMAPPED'].map((key) => <MetricCard key={key} icon={CheckCircle2} tone={key === 'NAME_ONLY_REVIEW' ? 'warning' : 'success'} label={key.replaceAll('_', ' ')} value={number(matchCounts[key] ?? 0)} />)}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Produtos que precisamos entender" description="Confirme o significado do produto encontrado na Hotmart antes de ensinar a Norwyn para as próximas ocorrências." />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {clubProducts.map((decision: any) => <HumanDecisionCard key={decision.id} decision={decision} />)}
          {!clubProducts.length ? <EmptyState title="Sem produtos Club pendentes" /> : null}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Matrículas que precisam de regra" description="Os 372 casos por nome foram agrupados para virar poucas decisões humanas em lote, sem despejar linha por linha." />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {nameGroups.slice(0, 12).map((group: any) => <GroupedDecisionCard key={group.key} group={group} />)}
          {!nameGroups.length ? <EmptyState title="Sem grupos NAME_ONLY_REVIEW" /> : null}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Vínculos de matrícula para confirmar" description="Prováveis podem ser confirmados por humano. Ambíguos mostram que há mais de uma matrícula candidata e precisam escolha cuidadosa." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {enrollmentGroups.map((decision: any) => <HumanDecisionCard key={decision.id} decision={decision} />)}
          {!enrollmentGroups.length ? <EmptyState title="Sem grupos de matrícula pendentes" /> : null}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Pessoas com acesso, mas sem compra encontrada" description="Encontramos atividade na área de alunos, mas não encontramos uma compra correspondente na base comercial. Ninguém foi criado automaticamente." />
        <div className="mt-4 max-h-[520px] overflow-y-auto rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)]">
          {accessOnly.map((item: any) => <div key={item.email} className="grid gap-2 border-b border-[color:var(--ds-border)] p-3 text-sm last:border-b-0 md:grid-cols-[1fr_0.8fr_0.7fr]"><span className="font-semibold text-[color:var(--ds-text)]">{item.masked_email}</span><span className="text-[color:var(--ds-text-secondary)]">{item.products?.slice(0, 2).join(', ') || 'Produto não identificado'}</span><span className="text-[color:var(--ds-text-muted)]">{number(item.events)} evento(s)</span></div>)}
          {!accessOnly.length ? <div className="p-4"><EmptyState title="Sem pessoas Club-only" /></div> : null}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Aprendizados de produto" description="Somente decisões humanas marcadas para uso futuro viram knowledge aprovado." />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {context.knowledge.filter((item: any) => item.subject_type?.includes("product") || item.subject_type?.includes("HOTMART_CLUB") || item.subject_type === "product").slice(0, 9).map((item: any) => <ActionCard key={item.id} icon={Lightbulb} tone={item.status === "approved" ? "success" : "info"} title={item.predicate} meta={item.status} description={`${item.subject_key} -> ${item.object_key ?? "aprendizado"}`} />)}
          {!context.knowledge.length ? <EmptyState title="Nenhum aprendizado registrado ainda" /> : null}
        </div>
      </Surface>
    </div>
  );
}

type HumanDecisionStatus = "idle" | "saving" | "saved" | "error";

function confidenceLabel(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text === "high" || text === "alta") return "Alta";
  if (text === "medium" || text === "média" || text === "media") return "Média";
  if (text === "low" || text === "baixa") return "Baixa";
  return "A confirmar";
}

function confidenceNumber(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text === "high" || text === "alta") return 0.9;
  if (text === "medium" || text === "média" || text === "media") return 0.7;
  if (text === "low" || text === "baixa") return 0.45;
  return 0.5;
}

function HumanDecisionCard({ decision }: { decision: any }) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<HumanDecisionStatus>("idle");
  const previous = decision.previous_value ?? {};
  const next = decision.new_value ?? {};
  const title = previous.hotmart_product_name ?? previous.product_name ?? next.title ?? decision.entity_id ?? "Caso para revisar";
  const suggestion = next.suggested_candidate_name ?? next.canonical_product_name ?? next.suggested_candidate ?? next.canonical_product_id ?? "Sem candidato único";
  const isProduct = decision.entity_type === "HOTMART_CLUB_PRODUCT";
  const isEnrollment = decision.entity_type === "HOTMART_CLUB_ENROLLMENT_MATCH_GROUP";

  async function decide(decisionType: string, learnScope: "single_case" | "reusable_learning" | "suggested_rule") {
    setStatus("saving");
    const response = await fetch("/api/validacao/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        validation_type: decision.validation_type ?? "GENERAL",
        entity_type: decision.entity_type,
        entity_id: decision.entity_id,
        decision_type: decisionType,
        previous_value: previous,
        new_value: { ...next, reviewed_from_decision_id: decision.id, title, suggestion },
        comment,
        learn_scope: learnScope,
        subject_type: decision.entity_type,
        subject_key: previous.hotmart_product_id ?? decision.entity_id,
        predicate: decisionType,
        object_type: isProduct ? "canonical_product" : "enrollment_match",
        object_key: next.suggested_candidate ?? next.canonical_product_id ?? decision.entity_id,
        confidence: confidenceNumber(next.confidence),
        metadata: { source_decision_id: decision.id, p14_action: decisionType, queue: decision.metadata?.queue },
      }),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ds-text)]">{compact(title)}</p>
          <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{isProduct ? `ID Hotmart: ${previous.hotmart_product_id ?? decision.entity_id}` : "Vínculo de matrícula"}</p>
        </div>
        <StatusBadge tone={status === "saved" ? "success" : status === "error" ? "danger" : "warning"}>{status === "saved" ? "registrado" : status === "error" ? "erro" : "decidir"}</StatusBadge>
      </div>
      <div className="mt-3 space-y-2 text-sm text-[color:var(--ds-text-secondary)]">
        <p>Sugestão Norwyn: <span className="font-semibold text-[color:var(--ds-text)]">{compact(suggestion)}</span></p>
        <p>Motivo: {compact(next.reason ?? next.match_reason ?? previous.reason, "Revisão humana necessária")}</p>
        <p>Confiança: {confidenceLabel(next.confidence)}</p>
        {previous.events != null ? <p>{number(previous.events)} evento(s) · {number(previous.people ?? previous.customers_affected ?? 0)} pessoa(s) afetada(s)</p> : null}
      </div>
      <input value={comment} onChange={(event) => setComment(event.target.value)} className="mt-3 h-10 w-full rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" placeholder="Motivo ou observação" />
      <div className="mt-3 flex flex-wrap gap-2">
        {isProduct ? <>
          <button type="button" onClick={() => decide("MESMO_PRODUTO", "reusable_learning")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-success-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-success)]">É o mesmo produto</button>
          <button type="button" onClick={() => decide("PRODUTO_LEGADO", "reusable_learning")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-info-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-info)]">É versão antiga</button>
          <button type="button" onClick={() => decide("PRODUTO_INDEPENDENTE", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)]">Produto independente</button>
          <button type="button" onClick={() => decide("ACESSO_BONUS", "reusable_learning")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-warning-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-warning)]">Acesso/bônus</button>
        </> : <>
          <button type="button" onClick={() => decide("HUMAN_CONFIRMED", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-success-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-success)]">Confirmar vínculo</button>
          <button type="button" onClick={() => decide("NOT_THIS_ENROLLMENT", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-warning-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-warning)]">Não é esta matrícula</button>
        </>}
        <button type="button" onClick={() => decide("NAO_SEI_AINDA", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)]">Não sei ainda</button>
        <button type="button" onClick={() => decide("REVISAR_DECISAO", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-danger-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-danger)]">Revisar/desfazer</button>
      </div>
      {isEnrollment ? <p className="mt-3 text-xs text-[color:var(--ds-text-muted)]">A confirmação humana fica registrada como vínculo confirmado, sem transformar o caso em match exato automático.</p> : null}
    </div>
  );
}

function GroupedDecisionCard({ group }: { group: any }) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<HumanDecisionStatus>("idle");

  async function decide(decisionType: string, learnScope: "single_case" | "reusable_learning" | "suggested_rule") {
    setStatus("saving");
    const response = await fetch("/api/validacao/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        validation_type: "PRODUCT",
        entity_type: "NAME_ONLY_REVIEW_GROUP",
        entity_id: group.key,
        decision_type: decisionType,
        previous_value: { hotmart_product_id: group.hotmart_product_id, product_name: group.product_name, enrollments: group.enrollments },
        new_value: { canonical_product_id: group.canonical_product_id, canonical_product_name: group.canonical_product_name, affects_enrollments: group.enrollments },
        comment,
        learn_scope: learnScope,
        subject_type: "NAME_ONLY_REVIEW_GROUP",
        subject_key: group.hotmart_product_id ?? group.product_name,
        predicate: decisionType,
        object_type: "canonical_product",
        object_key: group.canonical_product_id,
        confidence: learnScope === "reusable_learning" ? 0.85 : 0.5,
        metadata: { p14_action: decisionType, group_key: group.key, affects_enrollments: group.enrollments },
      }),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ds-text)]">{compact(group.product_name)}</p>
          <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">Resolverá {number(group.enrollments)} matrícula(s)</p>
        </div>
        <StatusBadge tone={status === "saved" ? "success" : status === "error" ? "danger" : "warning"}>{status === "saved" ? "registrado" : "lote"}</StatusBadge>
      </div>
      <p className="mt-3 text-sm text-[color:var(--ds-text-secondary)]">Candidato: <span className="font-semibold text-[color:var(--ds-text)]">{compact(group.canonical_product_name)}</span></p>
      <p className="mt-2 text-xs text-[color:var(--ds-text-muted)]">Antes de confirmar, a Norwyn mantém esses vínculos como revisão por nome. A validação em lote só deve ser usada quando todas as linhas compartilham a mesma regra.</p>
      <input value={comment} onChange={(event) => setComment(event.target.value)} className="mt-3 h-10 w-full rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" placeholder="Por que essa regra vale para o grupo?" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => decide("VALIDAR_GRUPO_PRODUTO", "reusable_learning")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-success-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-success)]">Validar grupo</button>
        <button type="button" onClick={() => decide("CORRIGIR_CASO_A_CASO", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-info-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-info)]">Corrigir caso a caso</button>
        <button type="button" onClick={() => decide("REVISAR_DEPOIS", "single_case")} disabled={status === "saving"} className="rounded-full bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)]">Revisar depois</button>
      </div>
    </div>
  );
}
function ContentsTab({ context }: { context: ValidationContext }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BookOpenCheck} tone="primary" label="Conteúdos revisáveis" value={number(context.contents.rows.length)} />
        <MetricCard icon={AlertTriangle} tone="warning" label="Sem classificação" value={number(context.contents.pending.length)} />
        <MetricCard icon={Sparkles} tone="info" label="Feedbacks" value={number(context.decisions.filter((item: any) => item.validation_type === "CONTENT").length)} />
        <MetricCard icon={Lightbulb} tone="success" label="Aprendizados" value={number(context.knowledge.filter((item: any) => item.subject_type === "content").length)} />
      </section>
      <Surface>
        <SectionHeader title="Conteúdos reais do Instagram" description="Produto pode ser confirmado, trocado ou removido. Nem todo conteúdo precisa estar ligado a um produto." action={<IconPill icon={BookOpenCheck} tone="primary" />} />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {context.contents.rows.slice(0, 16).map((content: any) => <ValidationCard key={content.id} validationType="CONTENT" entityType="content" entityId={content.id} title={compact(content.title ?? content.caption ?? content.legenda ?? content.tipo, "Conteúdo sem título")} meta={dateLabel(content.published_at ?? content.data_postagem)} description={`Produto sugerido: ${Array.isArray(content.product_tags) && content.product_tags.length ? content.product_tags.join(", ") : "sem produto relacionado"}. Funil: ${content.funnel_stage ?? "não classificado"}.`} />)}
          {!context.contents.rows.length ? <EmptyState title="Sem conteúdos carregados" /> : null}
        </div>
      </Surface>
    </div>
  );
}

function ValidationCard({ validationType, entityType, entityId, title, meta, description }: { validationType: string; entityType: string; entityId: string; title: string; meta: string; description: string }) {
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  async function decide(decisionType: string, learnScope = "single_case") {
    const response = await fetch("/api/validacao/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validation_type: validationType, entity_type: entityType, entity_id: entityId, decision_type: decisionType, comment, learn_scope: learnScope, new_value: { title, meta } }),
    });
    setSaved(response.ok);
  }
  return (
    <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ds-text)]">{title}</p>
          <p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{meta}</p>
        </div>
        {saved ? <StatusBadge tone="success">registrado</StatusBadge> : <StatusBadge tone="warning">revisar</StatusBadge>}
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{description}</p>
      <input value={comment} onChange={(event) => setComment(event.target.value)} className="mt-3 h-10 w-full rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" placeholder="Comentário opcional" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => decide("confirmed", "single_case")} className="rounded-full bg-[color:var(--ds-success-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-success)]">Confirmar</button>
        <button type="button" onClick={() => decide("corrected", "reusable_learning")} className="rounded-full bg-[color:var(--ds-info-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-info)]">Ensinar à Norwyn</button>
        <button type="button" onClick={() => decide("no_relation", "single_case")} className="rounded-full bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--ds-text-secondary)]">Sem relação</button>
      </div>
    </div>
  );
}






