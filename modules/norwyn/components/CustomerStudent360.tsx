"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, CheckCircle2, Clock3, ExternalLink, GraduationCap, Search, ShieldCheck, Sparkles, UserRound, UsersRound, WalletCards } from "lucide-react";
import { ActionCard, EmptyState, InsightCard, MetricCard, SectionHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";
import type { NorwynModuleContext } from "@/modules/norwyn/services/norwyn-module-server";

type SearchLike = Record<string, string | string[] | undefined>;
type SortKey = "person" | "lifecycle" | "ltv_brl" | "purchase_count" | "student_status" | "access" | "progress" | "opportunity" | "quality";

type SortableColumn = {
  key: SortKey;
  label: string;
  className?: string;
};

const sortableColumns: SortableColumn[] = [
  { key: "person", label: "Pessoa" },
  { key: "lifecycle", label: "Ciclo" },
  { key: "ltv_brl", label: "LTV BRL" },
  { key: "purchase_count", label: "Compras" },
  { key: "student_status", label: "Aluno" },
  { key: "access", label: "Acesso" },
  { key: "progress", label: "Progresso" },
  { key: "opportunity", label: "Oportunidade" },
  { key: "quality", label: "Confiança" },
];

function number(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function percent(count: number, total: number) {
  if (!total) return "0%";
  return `${((count / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function dateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function getParam(searchParams: SearchLike | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function humanStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    STUDENT: "Aluno",
    BUYER: "Comprador",
    LEAD: "Lead",
    UNRECONCILED: "A reconciliar",
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    COMPLETED: "Concluído",
    REFUNDED: "Reembolso",
    CANCELLED: "Cancelado",
    ACCESS_EXPIRED: "Acesso expirado",
    UNKNOWN: "Desconhecido",
    UNKNOWN_ACCESS: "Acesso desconhecido",
    ACCESS_UNKNOWN: "Acesso desconhecido",
    ACCESSED: "Acesso observado",
    NOT_APPLICABLE: "Não aplicável",
    PARTIAL_EVENTS_ONLY: "Eventos parciais",
    TRUSTED: "Confiável",
    PARTIAL: "Parcial",
    REVIEW: "Revisar",
    INSUFFICIENT_DATA: "Dados insuficientes",
    UNAVAILABLE_NO_DENOMINATOR: "Não disponível: falta estrutura do curso",
    UNAVAILABLE_NO_ONBOARDING_SOURCE: "Não disponível: falta fonte de onboarding",
    CHECKOUT_NAO_CONCLUIDO: "Checkout não concluído",
    ACESSO_DESCONHECIDO: "Acesso desconhecido",
    CLIENTE_MULTIPRODUTO: "Cliente multiproduto",
    POTENCIAL_ASCENSAO: "Potencial ascensão",
    REVISAR_IDENTIDADE: "Revisar identidade",
    IDENTIFIED: "Identificado",
    PROBABLE_MATCH: "Provável match",
  };
  return labels[String(value ?? "")] ?? String(value ?? "-");
}

function badgeTone(value: string | null | undefined): "neutral" | "primary" | "success" | "warning" | "danger" | "info" {
  const normalized = String(value ?? "");
  if (["TRUSTED", "ACTIVE", "ACCESSED", "STUDENT", "IDENTIFIED"].includes(normalized)) return "success";
  if (["LEAD", "PARTIAL", "UNKNOWN_ACCESS", "ACCESS_UNKNOWN", "UNKNOWN", "CHECKOUT_NAO_CONCLUIDO", "ACESSO_DESCONHECIDO"].includes(normalized)) return "warning";
  if (["REFUNDED", "CHARGEBACK", "CANCELLED"].includes(normalized)) return "danger";
  if (["BUYER", "CLIENTE_MULTIPRODUTO", "POTENCIAL_ASCENSAO"].includes(normalized)) return "info";
  return "neutral";
}

function updateStudentSearchParams(context: NorwynModuleContext, changes: Record<string, string | undefined>, options?: { resetPage?: boolean; clearCustomer?: boolean }) {
  const current = context.customer360Page;
  const values: Record<string, string | undefined> = {
    view: "students",
    q: current.query,
    product: current.product,
    lifecycle: current.lifecycle,
    quality: current.quality,
    studentStatus: current.studentStatus,
    opportunity: current.opportunity,
    sort: current.sort,
    direction: current.direction,
    page: String(options?.resetPage ? 1 : current.page),
    ...changes,
  };
  if (options?.clearCustomer) values.customerId = undefined;

  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (!value || value === "all") return;
    if (key === "page" && value === "1") return;
    if (key === "sort" && value === "ltv_brl") return;
    if (key === "direction" && value === "desc") return;
    params.set(key, value);
  });
  return `/produtos-alunos?${params.toString()}`;
}

function sortHref(column: SortKey, context: NorwynModuleContext) {
  const current = context.customer360Page;
  const nextDirection = current.sort === column && current.direction === "asc" ? "desc" : "asc";
  return updateStudentSearchParams(context, { sort: column, direction: nextDirection }, { resetPage: true, clearCustomer: true });
}

function SortHeader({ column, context }: { column: SortableColumn; context: NorwynModuleContext }) {
  const active = context.customer360Page.sort === column.key;
  const Icon = !active ? ArrowUpDown : context.customer360Page.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-2 ${column.className ?? ""}`}>
      <Link className="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-ring)]" href={sortHref(column.key, context)}>
        {column.label}
        <Icon className={`h-3.5 w-3.5 ${active ? "text-[color:var(--ds-primary)]" : "text-[color:var(--ds-text-muted)]"}`} />
      </Link>
    </th>
  );
}

export function CustomerStudent360({ context, searchParams }: { context: NorwynModuleContext; searchParams?: SearchLike }) {
  const router = useRouter();
  const detailRef = useRef<HTMLDivElement | null>(null);
  const summary = context.customer360Summary ?? {};
  const page = context.customer360Page;
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const selectedId = getParam(searchParams, "customerId");
  const selected = context.customer360Selected;
  const columnMap = useMemo(() => new Map(sortableColumns.map((column) => [column.key, column])), []);

  useEffect(() => {
    if (selectedId && detailRef.current) detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} tone="primary" label="Clientes identificados" value={number(summary.identified)} period={`${number(summary.canonical)} pessoas canônicas`} />
        <MetricCard icon={GraduationCap} tone="success" label="Alunos" value={number(summary.students)} period={`${number(summary.enrollments)} matrículas elegíveis`} />
        <MetricCard icon={WalletCards} tone="success" label="LTV médio BRL" value={money(summary.ltvAvg)} period={`Mediana ${money(summary.ltvMedian)}`} />
        <MetricCard icon={BarChart3} tone="info" label="Recompra" value={percent(summary.buyers2Plus ?? 0, summary.buyers ?? 0)} period={`${number(summary.buyers2Plus)} com 2+ compras`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <Surface>
          <SectionHeader title="Alunos & Clientes" description="Filtros, paginação e ordenação rodam no servidor sobre a base completa." />
          <form className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_repeat(4,minmax(0,1fr))_auto_auto]" action="/produtos-alunos">
            <input type="hidden" name="view" value="students" />
            <input type="hidden" name="sort" value={page.sort} />
            <input type="hidden" name="direction" value={page.direction} />
            <label className="flex items-center gap-2 rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 py-2 text-sm text-[color:var(--ds-text-secondary)]">
              <Search className="h-4 w-4" />
              <input name="q" defaultValue={page.query} placeholder="Buscar nome ou e-mail" className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 py-2 text-sm text-[color:var(--ds-text-secondary)]">
              <GraduationCap className="h-4 w-4" />
              <input name="product" defaultValue={page.product} placeholder="Buscar produto" className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            <Select name="lifecycle" label="Ciclo" value={page.lifecycle} options={["all", "LEAD", "BUYER", "STUDENT", "UNRECONCILED"]} />
            <Select name="studentStatus" label="Aluno" value={page.studentStatus} options={["all", "STUDENT", "ACTIVE", "INACTIVE", "COMPLETED", "REFUNDED", "UNKNOWN", "NOT_APPLICABLE"]} />
            <Select name="quality" label="Confiança" value={page.quality} options={["all", "TRUSTED", "PARTIAL", "REVIEW", "INSUFFICIENT_DATA"]} />
            <Select name="opportunity" label="Oportunidade" value={page.opportunity} options={["all", "CHECKOUT_NAO_CONCLUIDO", "ACESSO_DESCONHECIDO", "CLIENTE_MULTIPRODUTO", "POTENCIAL_ASCENSAO", "REVISAR_IDENTIDADE"]} />
            <button className="rounded-md bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white" type="submit">Filtrar</button>
            <Link className="rounded-md border border-[color:var(--ds-border)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--ds-text-secondary)]" href="/produtos-alunos?view=students">Limpar</Link>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="text-xs uppercase text-[color:var(--ds-text-muted)]">
                <tr>
                  <SortHeader column={columnMap.get("person")!} context={context} />
                  <SortHeader column={columnMap.get("lifecycle")!} context={context} />
                  <th className="px-3 py-2">Produtos</th>
                  <SortHeader column={columnMap.get("ltv_brl")!} context={context} />
                  <SortHeader column={columnMap.get("purchase_count")!} context={context} />
                  <SortHeader column={columnMap.get("student_status")!} context={context} />
                  <SortHeader column={columnMap.get("access")!} context={context} />
                  <SortHeader column={columnMap.get("progress")!} context={context} />
                  <SortHeader column={columnMap.get("opportunity")!} context={context} />
                  <SortHeader column={columnMap.get("quality")!} context={context} />
                  <th className="px-3 py-2">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {context.customer360Rows.map((row) => {
                  const href = updateStudentSearchParams(context, { customerId: row.customer_id });
                  const selectedRow = selectedId === row.customer_id;
                  return (
                    <tr
                      key={row.customer_id}
                      className={`cursor-pointer border-t border-[color:var(--ds-border)] align-top transition hover:bg-[color:var(--ds-bg-soft)] ${selectedRow ? "bg-[color:var(--ds-primary-soft)]" : ""}`}
                      onClick={() => router.push(href)}
                    >
                      <td className="px-3 py-3"><div className="font-semibold text-[color:var(--ds-text)]">{row.display_name ?? "Sem nome"}</div><div className="text-xs text-[color:var(--ds-text-muted)]">{row.email ?? "Sem e-mail"}</div>{row.non_brl_count ? <div className="mt-1 text-xs text-[color:var(--ds-warning)]">Possui compra em outra moeda</div> : null}</td>
                      <td className="px-3 py-3"><StatusBadge tone={badgeTone(row.lifecycle_status)}>{humanStatus(row.lifecycle_status)}</StatusBadge></td>
                      <td className="max-w-[240px] px-3 py-3 text-[color:var(--ds-text-secondary)]">{row.products_summary || row.first_product || "Sem produto elegível"}</td>
                      <td className="px-3 py-3 font-semibold">{money(row.ltv_brl)}</td>
                      <td className="px-3 py-3">{number(row.purchase_count)}<br /><span className="text-xs text-[color:var(--ds-text-muted)]">{number(row.product_count)} produto(s)</span></td>
                      <td className="px-3 py-3"><StatusBadge tone={badgeTone(row.student_status)}>{humanStatus(row.student_status)}</StatusBadge></td>
                      <td className="px-3 py-3"><StatusBadge tone={badgeTone(row.activity_status)}>{humanStatus(row.activity_status)}</StatusBadge></td>
                      <td className="px-3 py-3">{humanStatus(row.progress_status)}</td>
                      <td className="px-3 py-3"><StatusBadge tone={badgeTone(row.next_opportunity)}>{humanStatus(row.next_opportunity)}</StatusBadge></td>
                      <td className="px-3 py-3"><StatusBadge tone={badgeTone(row.data_quality_status)}>{humanStatus(row.data_quality_status)}</StatusBadge></td>
                      <td className="px-3 py-3">
                        <Link className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--ds-primary)]" href={href} onClick={(event) => event.stopPropagation()}>
                          Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!context.customer360Rows.length ? <EmptyState title="Nenhum cliente encontrado">Ajuste os filtros ou confira a fonte Hotmart na Central de Validação.</EmptyState> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--ds-text-secondary)]">
            <span>{number(page.total)} resultado(s) · página {page.page} de {totalPages}</span>
            <div className="flex gap-2">
              <Link className="rounded-md border border-[color:var(--ds-border)] px-3 py-2" href={updateStudentSearchParams(context, { customerId: undefined, page: String(Math.max(1, page.page - 1)) })}>Anterior</Link>
              <Link className="rounded-md border border-[color:var(--ds-border)] px-3 py-2" href={updateStudentSearchParams(context, { customerId: undefined, page: String(Math.min(totalPages, page.page + 1)) })}>Próxima</Link>
            </div>
          </div>
        </Surface>

        <div ref={detailRef}>
          <CustomerDetail selected={selected} selectedId={selectedId} context={context} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="LTV protegido" tone="success">A soma dos LTVs individuais usa somente vendas BRL elegíveis e reconcilia com a receita auditada: {money(summary.ltvSum)}. A média é puxada por clientes de maior valor; a mediana mostra o cliente mais típico.</InsightCard>
        <InsightCard title="Progresso com ressalva" tone="warning">Ainda não há denominador confiável de aulas/módulos. Quando houver evento Club, mostramos eventos; sem denominador, não inventamos percentual.</InsightCard>
        <InsightCard title="Leads reais" tone="info">Hoje os leads confiáveis vêm de oportunidades Hotmart identificáveis, como checkout não concluído. ManyChat tem inventário, mas não contatos individuais suficientes para conversão.</InsightCard>
      </section>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-muted)]">
      {label}
      <select name={name} defaultValue={value} className="h-10 rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-2 text-sm font-medium text-[color:var(--ds-text)] outline-none">
        {options.map((option) => <option key={option} value={option}>{option === "all" ? "Todos" : humanStatus(option)}</option>)}
      </select>
    </label>
  );
}

function CustomerDetail({ selected, selectedId, context }: { selected: any | null; selectedId: string | undefined; context: NorwynModuleContext }) {
  if (!selectedId) {
    return (
      <Surface>
        <SectionHeader title="Perfil individual" description="Abra uma pessoa para ver resumo, identidade, compras, LTV, progresso, onboarding e timeline." />
        <div className="mt-6 flex flex-col items-center justify-center rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-8 text-center">
          <UserRound className="h-10 w-10 text-[color:var(--ds-primary)]" />
          <p className="mt-3 font-semibold text-[color:var(--ds-text)]">Selecione um cliente</p>
          <p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">A lista usa paginação no servidor para manter a tela leve.</p>
        </div>
      </Surface>
    );
  }
  if (!selected) {
    return (
      <Surface>
        <EmptyState title="Não foi possível carregar este perfil.">O ID canônico informado não retornou uma pessoa do tenant atual.</EmptyState>
      </Surface>
    );
  }

  return (
    <Surface>
      <SectionHeader title={selected.display_name ?? "Cliente sem nome"} description={selected.email ?? selected.customer_id ?? "Identidade sem e-mail visível"} action={<StatusBadge tone={badgeTone(selected.data_quality_status)}>{humanStatus(selected.data_quality_status)}</StatusBadge>} />
      <div className="mt-4 rounded-md bg-[color:var(--ds-bg-soft)] px-3 py-2 text-xs text-[color:var(--ds-text-muted)]">ID canônico: {selected.customer_id}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard icon={WalletCards} label="LTV BRL" value={money(selected.ltv_brl)} period={`${number(selected.purchase_count)} compra(s)`} tone="success" />
        <MetricCard icon={GraduationCap} label="Matrículas" value={number(selected.enrollment_count)} period={humanStatus(selected.student_status)} tone="primary" />
        <MetricCard icon={Clock3} label="Última compra" value={dateOnly(selected.last_purchase_at)} period={selected.latest_product ?? "Sem produto"} />
        <MetricCard icon={ShieldCheck} label="Identidade" value={humanStatus(selected.identity_confidence)} period={selected.identity_types || "e-mail"} tone={badgeTone(selected.identity_confidence)} />
      </div>
      <div className="mt-4 space-y-3">
        <ActionCard icon={GraduationCap} tone="primary" title="Produtos" meta={`${number(selected.product_count)} produto(s)`} description={selected.products_summary || selected.first_product || "Sem produto elegível encontrado para esta pessoa."} />
        <ActionCard icon={WalletCards} tone="success" title="Compras" meta={`${number(selected.purchase_count)} compra(s)`} description={`Primeira compra: ${dateOnly(selected.first_purchase_at)}. Última compra: ${dateOnly(selected.last_purchase_at)}.`} />
        <ActionCard icon={CheckCircle2} tone={badgeTone(selected.onboarding_status)} title="Onboarding" meta={humanStatus(selected.onboarding_status)} description={selected.first_access_at ? `Primeiro acesso observado: ${dateOnly(selected.first_access_at)}. Isso indica início de acesso, não onboarding concluído.` : "Sem fonte real de onboarding concluído."} />
        <ActionCard icon={Clock3} tone={badgeTone(selected.activity_status)} title="Engajamento Club" meta={`${number(selected.module_completed_events)} módulo(s) concluído(s)`} description={selected.last_access_at ? `Última atividade: ${dateOnly(selected.last_access_at)}${daysSince(selected.last_access_at) === null ? "" : ` (${daysSince(selected.last_access_at)} dias)`}. Progresso percentual não disponível sem estrutura total do curso.` : "Sem evidência de acesso Club para esta pessoa; isso não prova que nunca acessou."} />
        <ActionCard icon={Sparkles} tone={badgeTone(selected.next_opportunity)} title="Próxima oportunidade" meta={humanStatus(selected.next_opportunity)} description="Regra explicável baseada em compra, matrícula, checkout e evidência de acesso." action={<Link className="text-sm font-semibold text-[color:var(--ds-primary)]" href="/validacao">Enviar dúvida para Validação</Link>} />
      </div>
      <div className="mt-5">
        <SectionHeader title="Timeline" description="Eventos reais disponíveis para esta pessoa." />
        <div className="mt-3 space-y-2">
          {context.customer360Timeline.map((event, index) => <div key={`${event.type}-${index}`} className="rounded-md border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-[color:var(--ds-text)]">{event.type}: {event.title}</p><span className="text-xs text-[color:var(--ds-text-muted)]">{dateOnly(event.date)}</span></div><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{event.meta}</p></div>)}
          {!context.customer360Timeline.length ? <EmptyState title="Timeline sem eventos suficientes">Compras e acessos aparecem aqui quando a fonte traz evidência.</EmptyState> : null}
        </div>
      </div>
    </Surface>
  );
}
