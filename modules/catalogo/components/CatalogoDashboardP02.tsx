"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, Clipboard, Clock3, Copy, ExternalLink, Filter, Link2, PackageCheck, Pencil, Plus, RefreshCw, Search, ShieldCheck, Star, Tags, X } from "lucide-react";
import { ActionCard, DataFreshness, EmptyState, IconPill, MetricCard, PageHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";
import type { CatalogAccessDuration, CatalogAudienceType, CatalogBulkUpdateResult, CatalogCommercialStatus, CatalogComposition, CatalogContext, CatalogOfferPayload, CatalogOfferType, CatalogPaymentCondition, CatalogRow, CatalogTaxonomyField, CatalogTechnicalHealth } from "@/modules/catalogo/types";

type CatalogView = "offers" | "health" | "pending" | "history";
type PendingKey = "price" | "use" | "access" | "warranty" | "health" | "coparticipation" | "main" | "offer_id" | "payment" | "composition" | "audience";
type PendingGroup = "Cadastro incompleto" | "Saude" | "Link principal" | "Coparticipacao" | "Pagamento" | "Acesso" | "Composicao" | "Publico";
type PendingTag = { key: PendingKey; label: string; group: PendingGroup };
type TaxonomyPendingKey = "audience" | "access" | "payment" | "composition";
type PendingEntry = { row: CatalogRow; tag: PendingTag; field: CatalogTaxonomyField };
type Filters = { q: string; product: string; payment: string; access: string; composition: string; audience: string; copa: string; health: string; status: string; pending: string };

const viewLabels: Record<CatalogView, string> = { offers: "Ofertas", health: "Saude dos links", pending: "Pendencias", history: "Historico" };
const offerTypeLabels: Record<string, string> = { produto_individual: "Produto individual", combo: "Combo", upsell: "Upsell", downsell: "Downsell", order_bump: "Order bump", evento: "Evento", oferta_especial: "Oferta especial", outro: "Outro" };
const statusLabels: Record<string, string> = { rascunho: "Rascunho", ativo: "Ativo", pausado: "Pausado", desativado: "Desativado", substituido: "Substituido" };
const healthLabels: Record<CatalogTechnicalHealth, string> = { funcionando: "Funcionando", redirecionando: "Redirecionando", quebrado: "Quebrado", indisponivel: "Indisponivel", nao_verificado: "Nao verificado" };
const paymentLabels: Record<CatalogPaymentCondition, string> = { avista: "A vista", parcelamento_comum: "Parcelamento comum", parcelamento_hotmart: "Parcelamento Hotmart", a_confirmar: "A confirmar" };
const accessLabels: Record<CatalogAccessDuration, string> = { "1_ano": "1 ano", "2_anos": "2 anos", "3_anos": "3 anos", vitalicio: "Vitalicio", a_confirmar: "A confirmar" };
const compositionLabels: Record<CatalogComposition, string> = { individual: "Individual", combo: "Combo" };
const audienceLabels: Record<CatalogAudienceType, string> = { geral: "Geral", ex_aluno: "Ex-aluno", a_confirmar: "A confirmar" };
const pendingLabels: Record<PendingKey, string> = { price: "Preco a confirmar", use: "Uso nao informado", access: "Acesso a revisar", warranty: "Garantia a confirmar", health: "Saude nao verificada", coparticipation: "Coparticipacao a revisar", main: "Sem Link principal", offer_id: "Offer ID ausente", payment: "Pagamento a revisar", composition: "Composicao a revisar", audience: "Publico a revisar" };
const taxonomyPendingKeys: TaxonomyPendingKey[] = ["audience", "access", "payment", "composition"];
const taxonomyFieldByPendingKey: Record<TaxonomyPendingKey, CatalogTaxonomyField> = { audience: "audience_type", access: "access_duration", payment: "payment_condition", composition: "composition" };
const taxonomyFieldLabels: Record<CatalogTaxonomyField, string> = { audience_type: "Publico", access_duration: "Acesso", payment_condition: "Pagamento", composition: "Composicao" };
const taxonomyOptions: Record<CatalogTaxonomyField, Array<[string, string]>> = {
  audience_type: Object.entries(audienceLabels),
  access_duration: Object.entries(accessLabels),
  payment_condition: Object.entries(paymentLabels),
  composition: Object.entries(compositionLabels),
};

export function CatalogoDashboardP02({ context }: { context: CatalogContext }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkingLinkId, setCheckingLinkId] = useState<string | null>(null);
  const [taxonomySaving, setTaxonomySaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const view = parseView(searchParams.get("view"));
  const filters: Filters = {
    q: searchParams.get("q") ?? "",
    product: searchParams.get("product") ?? "all",
    payment: searchParams.get("payment") ?? "all",
    access: searchParams.get("access") ?? "all",
    composition: searchParams.get("composition") ?? "all",
    audience: searchParams.get("audience") ?? "all",
    copa: searchParams.get("copa") ?? "all",
    health: searchParams.get("health") ?? "all",
    status: searchParams.get("status") ?? "all",
    pending: searchParams.get("pending") ?? "all",
  };

  const productMainMap = useMemo(() => buildProductMainMap(context.rows), [context.rows]);
  const filteredRows = useMemo(() => filterRows(context.rows, filters, productMainMap), [context.rows, filters, productMainMap]);
  const selectedLinkId = searchParams.get("linkId") ?? filteredRows[0]?.link.id ?? context.rows[0]?.link.id ?? null;
  const selectedRow = context.rows.find((row) => row.link.id === selectedLinkId) ?? filteredRows[0] ?? context.rows[0] ?? null;
  const healthSummary = useMemo(() => summarizeHealth(context.rows), [context.rows]);
  const pendingItems = useMemo(() => filteredRows.map((row) => ({ row, tags: pendingTags(row, productMainMap) })).filter((item) => item.tags.length > 0), [filteredRows, productMainMap]);
  const historyRows = useMemo(() => filterHistory(context.history, filters.q), [context.history, filters.q]);

  function updateParams(changes: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    if (!next.get("view")) next.set("view", "offers");
    router.replace(`/catalogo?${next.toString()}`, { scroll: false });
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Link copiado.");
    window.setTimeout(() => setMessage(null), 2200);
  }

  function saveOffer(payload: CatalogOfferPayload) {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/catalogo/offers", { method: payload.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Nao foi possivel salvar."); return; }
      setMessage(payload.id ? "Link atualizado." : "Novo link cadastrado.");
      setFormOpen(false);
      router.refresh();
    });
  }
  async function updateTaxonomy(offerIds: string[], field: CatalogTaxonomyField, value: string, onlyPending = true, origin: "individual" | "bulk" = "bulk"): Promise<CatalogBulkUpdateResult | null> {
    setTaxonomySaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/catalogo/offers/bulk-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerIds, field, value, onlyPending, origin }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nao foi possivel atualizar as pendencias.");
      const data = result.data as CatalogBulkUpdateResult;
      const action = data.updated_count === 1 ? "1 oferta atualizada" : `${data.updated_count} ofertas atualizadas`;
      const skipped = data.skipped_count ? ` ${data.skipped_count} ignorada(s) por protecao ou valor ja aplicado.` : "";
      setMessage(`${action}.${skipped}`);
      router.refresh();
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar as pendencias.");
      return null;
    } finally {
      setTaxonomySaving(false);
    }
  }


  async function verifyNow(row: CatalogRow) {
    setCheckingLinkId(row.link.id);
    setMessage(null);
    try {
      const response = await fetch("/api/catalogo/links/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId: row.link.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Falha ao verificar link.");
      setMessage(`Verificacao concluida: ${healthLabels[result.data.technicalHealth as CatalogTechnicalHealth] ?? result.data.technicalHealth}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao verificar link.");
    } finally {
      setCheckingLinkId(null);
    }
  }

  if (context.diagnostic) return <Surface><p className="text-sm font-semibold text-[color:var(--ds-danger)]">{context.diagnostic}</p></Surface>;

  return <section className="norwyn-ds-page mx-auto max-w-[1540px] space-y-5 px-1">
    <PageHeader title="Catalogo" description="Gerencie produtos, ofertas e links de venda em um so lugar." aside={<div className="flex flex-wrap items-center gap-2"><DataFreshness label={context.updatedAt ? `Atualizado em ${dateTime(context.updatedAt)}` : "Base aguardando carga"} /><button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} disabled={!context.canEdit} className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ds-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--ds-shadow-sm)] disabled:opacity-50"><Plus className="h-4 w-4" />Novo link de venda</button></div>} />
    <div className="flex gap-2 overflow-x-auto pb-1">{(Object.keys(viewLabels) as CatalogView[]).map((item) => <button key={item} type="button" onClick={() => updateParams({ view: item })} className={pillClass(view === item)}>{viewLabels[item]}</button>)}</div>
    {message ? <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-4 py-3 text-sm font-semibold text-[color:var(--ds-text)] shadow-[var(--ds-shadow-sm)]">{message}</div> : null}
    <CatalogFilters filters={filters} products={context.products.map((product) => ({ id: product.id, name: product.name }))} onChange={updateParams} />
    {view === "offers" ? <OffersView context={context} rows={filteredRows} selectedRow={selectedRow} healthSummary={healthSummary} productMainMap={productMainMap} canEdit={context.canEdit} canSeeTechnical={context.canSeeTechnical} checkingLinkId={checkingLinkId} onSelect={(row) => updateParams({ linkId: row.link.id })} onCopy={copyLink} onEdit={(row) => { setEditing(row); setFormOpen(true); }} onVerify={verifyNow} /> : null}
    {view === "health" ? <HealthView rows={filteredRows} summary={healthSummary} checkingLinkId={checkingLinkId} onSelect={(row) => updateParams({ view: "offers", linkId: row.link.id })} onVerify={verifyNow} /> : null}
    {view === "pending" ? <PendingView items={pendingItems} canEdit={context.canEdit} pending={taxonomySaving} onSelect={(row) => updateParams({ view: "offers", linkId: row.link.id })} onUpdate={updateTaxonomy} /> : null}
    {view === "history" ? <HistoryView events={historyRows} rows={context.rows} /> : null}
    {formOpen ? <CatalogOfferForm row={editing} products={context.products.map((product) => product.name)} pending={isPending} onClose={() => setFormOpen(false)} onSave={saveOffer} /> : null}
  </section>;
}

function CatalogFilters({ filters, products, onChange }: { filters: Filters; products: Array<{ id: string; name: string }>; onChange: (changes: Record<string, string | null | undefined>) => void }) {
  return <Surface className="space-y-4"><div className="grid gap-3 lg:grid-cols-[minmax(260px,1.3fr)_repeat(4,minmax(145px,1fr))]"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ds-text-muted)]" /><input value={filters.q} onChange={(event) => onChange({ q: event.target.value, linkId: null })} placeholder="Buscar produto, oferta ou link..." className="h-11 w-full rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] pl-11 pr-4 text-sm font-semibold text-[color:var(--ds-text)] outline-none focus:border-[color:var(--ds-primary)]" /></label><FilterSelect label="Produto" value={filters.product} onChange={(value) => onChange({ product: value, linkId: null })} options={[["all", "Todos os produtos"], ...products.map((product) => [product.id, product.name] as [string, string])]} /><FilterSelect label="Pagamento" value={filters.payment} onChange={(value) => onChange({ payment: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(paymentLabels)]} /><FilterSelect label="Acesso" value={filters.access} onChange={(value) => onChange({ access: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(accessLabels)]} /><FilterSelect label="Composicao" value={filters.composition} onChange={(value) => onChange({ composition: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(compositionLabels)]} /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><FilterSelect label="Publico" value={filters.audience} onChange={(value) => onChange({ audience: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(audienceLabels)]} /><FilterSelect label="Coparticipacao" value={filters.copa} onChange={(value) => onChange({ copa: value, linkId: null })} options={[["all", "Todos"], ["sem", "Sem coparticipacao"], ["com", "Com coparticipacao"]]} /><FilterSelect label="Saude" value={filters.health} onChange={(value) => onChange({ health: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(healthLabels)]} /><FilterSelect label="Status" value={filters.status} onChange={(value) => onChange({ status: value, linkId: null })} options={[["all", "Todos"], ...Object.entries(statusLabels)]} /><FilterSelect label="Pendencias" value={filters.pending} onChange={(value) => onChange({ pending: value, linkId: null, view: value === "all" ? undefined : "pending" })} options={[["all", "Todas"], ["review", "Precisa de revisao"], ...Object.entries(pendingLabels)]} /></div><div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--ds-text-muted)]"><Filter className="h-4 w-4" />Filtros salvos na URL para refresh/back.</div></Surface>;
}

function OffersView(props: { context: CatalogContext; rows: CatalogRow[]; selectedRow: CatalogRow | null; healthSummary: ReturnType<typeof summarizeHealth>; productMainMap: Map<string, { activeMainCount: number; activeOfferCount: number }>; canEdit: boolean; canSeeTechnical: boolean; checkingLinkId: string | null; onSelect: (row: CatalogRow) => void; onCopy: (url: string) => void; onEdit: (row: CatalogRow) => void; onVerify: (row: CatalogRow) => void }) {
  const { context, rows, selectedRow, healthSummary, productMainMap, canEdit, canSeeTechnical, checkingLinkId, onSelect, onCopy, onEdit, onVerify } = props;
  const warnings = Array.from(productMainMap.values()).filter((item) => item.activeOfferCount > 0 && item.activeMainCount !== 1);
  return <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Produtos" value={String(context.loadSummary.products)} period="Cadastrados" tone="info" icon={PackageCheck} /><MetricCard label="Ofertas" value={String(context.loadSummary.links)} period={`${context.loadSummary.activeOffers} ativas`} tone="warning" icon={Tags} /><MetricCard label="Links ativos" value={String(context.loadSummary.activeOffers)} period="Status comercial" tone="success" icon={Link2} /><MetricCard label="Saude verificada" value={String(healthSummary.checked)} period={`${healthSummary.notChecked} nao verificados`} tone="success" icon={ShieldCheck} /></div>{warnings.length ? <ActionCard title="Link principal precisa de revisao" description="Ha produtos ativos sem Link principal ou com mais de um Link principal ativo." tone="warning" icon={AlertTriangle} /> : null}<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]"><Surface className="space-y-4"><div><h2 className="text-xl font-semibold text-[color:var(--ds-text)]">{rows.length} ofertas encontradas</h2><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">Busca, filtros e lista operacional de links.</p></div><div className="hidden overflow-hidden rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] xl:block"><table className="w-full text-left text-sm"><thead className="bg-[color:var(--ds-bg-soft)] text-xs font-semibold uppercase text-[color:var(--ds-text-muted)]"><tr><th className="px-4 py-3">Oferta</th><th className="px-4 py-3">Preco</th><th className="px-4 py-3">Comercial</th><th className="px-4 py-3">Coparticipacao</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Saude</th><th className="px-4 py-3">Pendencias</th><th className="px-4 py-3 text-right">Acoes</th></tr></thead><tbody className="divide-y divide-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)]">{rows.map((row) => <OfferTableRow key={row.link.id} row={row} tags={pendingTags(row, productMainMap)} selected={selectedRow?.link.id === row.link.id} onSelect={() => onSelect(row)} onCopy={() => onCopy(row.link.checkout_url)} onEdit={() => onEdit(row)} canEdit={canEdit} />)}</tbody></table></div><div className="grid gap-3 xl:hidden">{rows.map((row) => <OfferMobileCard key={row.link.id} row={row} tags={pendingTags(row, productMainMap)} selected={selectedRow?.link.id === row.link.id} onSelect={() => onSelect(row)} onCopy={() => onCopy(row.link.checkout_url)} onEdit={() => onEdit(row)} canEdit={canEdit} />)}</div>{rows.length === 0 ? <EmptyState title="Nenhum link encontrado">Tente ajustar a busca ou remover algum filtro.</EmptyState> : null}</Surface><DetailPanel row={selectedRow} canEdit={canEdit} canSeeTechnical={canSeeTechnical} history={context.history.filter((event) => event.offer_id === selectedRow?.offer.id || event.sales_link_id === selectedRow?.link.id).slice(0, 6)} tags={selectedRow ? pendingTags(selectedRow, productMainMap) : []} checking={Boolean(selectedRow && checkingLinkId === selectedRow.link.id)} onCopy={onCopy} onEdit={onEdit} onVerify={onVerify} /></div></>;
}

function HealthView({ rows, summary, checkingLinkId, onSelect, onVerify }: { rows: CatalogRow[]; summary: ReturnType<typeof summarizeHealth>; checkingLinkId: string | null; onSelect: (row: CatalogRow) => void; onVerify: (row: CatalogRow) => void }) {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><MetricCard label="Links verificados" value={String(summary.checked)} period="Com ultimo check" tone="info" icon={CheckCircle2} /><MetricCard label="Funcionando" value={String(summary.funcionando)} period="Ultimo check saudavel" tone="success" icon={ShieldCheck} /><MetricCard label="Redirecionando" value={String(summary.redirecionando)} period="Nao e erro por si so" tone="info" icon={ExternalLink} /><MetricCard label="Com problema" value={String(summary.withIssue)} period="Quebrado/indisponivel" tone={summary.withIssue ? "danger" : "neutral"} icon={AlertTriangle} /><MetricCard label="Nao verificados" value={String(summary.notChecked)} period="Pendencia de observabilidade" tone="warning" icon={Clock3} /></div><Surface className="space-y-4"><h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Saude dos links</h2><div className="grid gap-3">{rows.map((row) => <HealthRow key={row.link.id} row={row} checking={checkingLinkId === row.link.id} onSelect={() => onSelect(row)} onVerify={() => onVerify(row)} />)}</div></Surface></div>;
}

function PendingView({ items, canEdit, pending, onSelect, onUpdate }: { items: Array<{ row: CatalogRow; tags: PendingTag[] }>; canEdit: boolean; pending: boolean; onSelect: (row: CatalogRow) => void; onUpdate: (offerIds: string[], field: CatalogTaxonomyField, value: string, onlyPending?: boolean, origin?: "individual" | "bulk") => Promise<CatalogBulkUpdateResult | null> }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState<CatalogTaxonomyField>("audience_type");
  const [bulkValue, setBulkValue] = useState("geral");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const entries = useMemo(() => buildTaxonomyPendingEntries(items), [items]);
  const counts = useMemo(() => countTaxonomyPending(entries), [entries]);
  const grouped = useMemo(() => groupTaxonomyPending(entries), [entries]);
  const rowByOfferId = useMemo(() => new Map(entries.map((entry) => [entry.row.offer.id, entry.row])), [entries]);
  const selectedRows = selectedIds.map((id) => rowByOfferId.get(id)).filter(Boolean) as CatalogRow[];
  const selectedPendingRows = selectedRows.filter((row) => isPendingForField(row, bulkField));
  const selectedConfirmedRows = selectedRows.filter((row) => !isPendingForField(row, bulkField));
  const affectedRows = allowOverwrite ? selectedRows : selectedPendingRows;
  const visibleOfferIds = Array.from(new Set(entries.map((entry) => entry.row.offer.id)));

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectVisible() {
    setSelectedIds(visibleOfferIds);
  }

  async function quickUpdate(row: CatalogRow, field: CatalogTaxonomyField, value: string) {
    if (value === currentTaxonomyValue(row, field)) return;
    const result = await onUpdate([row.offer.id], field, value, true, "individual");
    if (result?.updated_count) setSelectedIds((current) => current.filter((id) => id !== row.offer.id));
  }

  async function applyBulk() {
    const result = await onUpdate(selectedIds, bulkField, bulkValue, !allowOverwrite, "bulk");
    if (result) {
      setConfirmOpen(false);
      setAllowOverwrite(false);
      setSelectedIds([]);
    }
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Publico a revisar" value={String(counts.audience)} period="Fila comercial" tone={counts.audience ? "warning" : "success"} icon={Tags} />
      <MetricCard label="Acesso a revisar" value={String(counts.access)} period="Tempo de acesso" tone={counts.access ? "warning" : "success"} icon={Clock3} />
      <MetricCard label="Pagamento a revisar" value={String(counts.payment)} period="Condicao comercial" tone={counts.payment ? "warning" : "success"} icon={Clipboard} />
      <MetricCard label="Composicao a revisar" value={String(counts.composition)} period="Individual ou combo" tone={counts.composition ? "warning" : "success"} icon={PackageCheck} />
    </div>

    <Surface className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Fila de pendencias</h2>
          <p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">Somente pendentes. Resolva individualmente ou selecione varias ofertas para aplicar em lote.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selectVisible} disabled={!canEdit || !visibleOfferIds.length} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)] disabled:opacity-50">Selecionar visiveis</button>
          <button type="button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)] disabled:opacity-50">Limpar selecao</button>
        </div>
      </div>

      {selectedIds.length ? <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <FilterSelect label={`${selectedIds.length} oferta(s) selecionada(s)`} value={bulkField} onChange={(value) => { const field = value as CatalogTaxonomyField; setBulkField(field); setBulkValue(taxonomyOptions[field][0]?.[0] ?? ""); setAllowOverwrite(false); }} options={(Object.entries(taxonomyFieldLabels) as Array<[CatalogTaxonomyField, string]>)} />
          <FilterSelect label="Novo valor" value={bulkValue} onChange={setBulkValue} options={taxonomyOptions[bulkField]} />
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canEdit || pending || !bulkValue} className="self-end rounded-full bg-[color:var(--ds-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Aplicar em lote</button>
        </div>
        <p className="mt-2 text-xs font-semibold text-[color:var(--ds-text-muted)]">Padrao: aplicar apenas nos itens ainda pendentes para este campo.</p>
      </div> : null}
    </Surface>

    {Object.entries(grouped).map(([key, groupEntries]) => <Surface key={key} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--ds-text)]">{pendingLabels[key as TaxonomyPendingKey]}</h3>
          <p className="text-sm text-[color:var(--ds-text-secondary)]">{groupEntries.length} oferta(s) para revisar.</p>
        </div>
        <StatusBadge tone="warning">{groupEntries.length}</StatusBadge>
      </div>
      <div className="grid gap-3">
        {groupEntries.map((entry) => <PendingWorkItem key={`${entry.tag.key}-${entry.row.offer.id}`} entry={entry} selected={selectedIds.includes(entry.row.offer.id)} canEdit={canEdit} pending={pending} onToggle={() => toggle(entry.row.offer.id)} onSelect={() => onSelect(entry.row)} onQuickUpdate={quickUpdate} />)}
      </div>
    </Surface>)}

    {entries.length === 0 ? <Surface><EmptyState title="Sem pendencias">Os links do recorte atual nao exigem acao humana nessa fila.</EmptyState></Surface> : null}

    {confirmOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--ds-text)]/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-5 shadow-[var(--ds-shadow-lg)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">Confirmacao em lote</p>
            <h3 className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">Aplicar {taxonomyFieldLabels[bulkField]} = {taxonomyValueLabel(bulkField, bulkValue)}</h3>
          </div>
          <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-full p-2 hover:bg-[color:var(--ds-bg-soft)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-[color:var(--ds-text-secondary)]">
          <Info label="Quantidade selecionada" value={`${selectedIds.length} oferta(s)`} />
          <Info label="Aplicacao padrao" value={`${affectedRows.length} oferta(s) ${allowOverwrite ? "incluindo valores ja confirmados" : "ainda pendente(s)"}`} />
          <Info label="Produtos afetados" value={uniqueValues(affectedRows.map((row) => row.product.name)).join(", ") || "Nenhum item pendente para esse campo"} />
          <Info label="Valores atuais" value={summarizeCurrentValues(affectedRows, bulkField)} />
        </div>
        {selectedConfirmedRows.length ? <div className="mt-4 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-warning)] bg-[color:var(--ds-warning-soft)] p-3 text-sm font-semibold text-[color:var(--ds-text)]">
          {selectedConfirmedRows.length} oferta(s) ja possuem {taxonomyFieldLabels[bulkField]} diferente de pendente. Por padrao, elas serao ignoradas.
          <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={allowOverwrite} onChange={(event) => setAllowOverwrite(event.target.checked)} className="h-4 w-4 accent-[color:var(--ds-primary)]" />Permitir sobrescrever tambem essas ofertas.</label>
        </div> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)]">Cancelar</button>
          <button type="button" onClick={applyBulk} disabled={pending || !affectedRows.length} className="rounded-full bg-[color:var(--ds-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Aplicando..." : `Aplicar em ${affectedRows.length} oferta(s)`}</button>
        </div>
      </div>
    </div> : null}
  </div>;
}

function PendingWorkItem({ entry, selected, canEdit, pending, onToggle, onSelect, onQuickUpdate }: { entry: PendingEntry; selected: boolean; canEdit: boolean; pending: boolean; onToggle: () => void; onSelect: () => void; onQuickUpdate: (row: CatalogRow, field: CatalogTaxonomyField, value: string) => void }) {
  const { row, tag, field } = entry;
  return <article className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <label className="flex min-w-0 flex-1 items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggle} disabled={!canEdit} className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--ds-primary)] disabled:opacity-50" />
        <span className="min-w-0">
          <span className="block font-semibold text-[color:var(--ds-text)]">{row.offer.name}</span>
          <span className="mt-1 block text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">{tag.label}</StatusBadge>
        <button type="button" onClick={onSelect} className="rounded-full border border-[color:var(--ds-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ds-text)] hover:bg-[color:var(--ds-bg-soft)]">Ver oferta</button>
      </div>
    </div>
    <div className="mt-4 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
      <Info label="Preco" value={money(row.offer.current_price)} />
      <Info label="Tipo" value={offerTypeLabels[row.offer.offer_type]} />
      <Info label="Uso" value={row.offer.use_type || "A confirmar"} />
      <Info label="Regra especial" value={row.offer.special_rule || "A confirmar"} />
      <Info label="Acesso atual" value={accessLabels[row.offer.access_duration]} />
      <Info label="Pagamento atual" value={paymentLabels[row.offer.payment_condition]} />
      <Info label="Publico atual" value={audienceLabels[row.offer.audience_type]} />
      <Info label="Composicao atual" value={compositionLabels[row.offer.composition]} />
    </div>
    <div className="mt-4 grid gap-2 md:grid-cols-[minmax(180px,260px)_auto] md:items-end">
      <FilterSelect label={`Definir ${taxonomyFieldLabels[field]}`} value={currentTaxonomyValue(row, field)} onChange={(value) => onQuickUpdate(row, field, value)} options={taxonomyOptions[field]} />
      <p className="text-xs font-semibold text-[color:var(--ds-text-muted)]">Salva direto e remove da fila quando a pendencia for resolvida.</p>
    </div>
  </article>;
}

function HistoryView({ events, rows }: { events: CatalogContext["history"]; rows: CatalogRow[] }) {
  return <Surface className="space-y-4"><h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Historico do Catalogo</h2><div className="space-y-3">{events.map((event) => { const row = rows.find((item) => item.offer.id === event.offer_id || item.link.id === event.sales_link_id); return <div key={event.id} className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[color:var(--ds-text)]">{historyLabel(event.event_type)}</p><span className="text-xs text-[color:var(--ds-text-muted)]">{dateTime(event.created_at)}</span></div><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row ? `${row.product.name} - ${row.offer.name}` : "Catalogo"}</p>{event.reason ? <p className="mt-2 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{event.reason}</p> : null}</div>; })}</div>{events.length === 0 ? <EmptyState title="Sem eventos no recorte">Ajuste a busca ou aguarde novos eventos.</EmptyState> : null}</Surface>;
}

function CommercialPills({ row, compact = false }: { row: CatalogRow; compact?: boolean }) {
  const pills = [
    paymentLabels[row.offer.payment_condition],
    accessLabels[row.offer.access_duration],
    compositionLabels[row.offer.composition],
    audienceLabels[row.offer.audience_type],
  ];
  return <div className={clsx("flex flex-wrap gap-1", compact ? "mt-2" : "mt-2 max-w-[260px]")}>{pills.map((pill) => <StatusBadge key={pill} tone={pill === "A confirmar" ? "warning" : "neutral"}>{pill}</StatusBadge>)}</div>;
}
function OfferTableRow({ row, tags, selected, onSelect, onCopy, onEdit, canEdit }: { row: CatalogRow; tags: PendingTag[]; selected: boolean; onSelect: () => void; onCopy: () => void; onEdit: () => void; canEdit: boolean }) {
  return <tr className={clsx("cursor-pointer transition hover:bg-[color:var(--ds-bg-soft)]", selected && "bg-[color:var(--ds-primary-soft)]")} onClick={onSelect}><td className="px-4 py-3"><div className="flex items-start gap-3"><IconPill icon={row.link.is_main_link ? Star : Tags} tone={row.link.is_main_link ? "warning" : "info"} /><div><p className="font-semibold text-[color:var(--ds-text)]">{row.offer.name}</p><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p><p className="mt-1 max-w-[260px] truncate text-xs text-[color:var(--ds-text-muted)]">{row.link.checkout_url}</p><CommercialPills row={row} /></div></div></td><td className="px-4 py-3 font-semibold text-[color:var(--ds-text)]">{money(row.offer.current_price)}</td><td className="px-4 py-3"><div className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]"><span>{paymentLabels[row.offer.payment_condition]}</span><span>{accessLabels[row.offer.access_duration]}</span><span>{compositionLabels[row.offer.composition]} · {audienceLabels[row.offer.audience_type]}</span></div></td><td className="px-4 py-3">{coparticipationLabel(row)}</td><td className="px-4 py-3"><StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge></td><td className="px-4 py-3"><HealthBadge health={row.link.technical_health} /></td><td className="px-4 py-3"><div className="flex max-w-[220px] flex-wrap gap-1">{tags.slice(0, 2).map((tag) => <StatusBadge key={tag.key} tone="warning">{tag.label}</StatusBadge>)}{tags.length > 2 ? <StatusBadge tone="neutral">+{tags.length - 2}</StatusBadge> : null}</div></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onCopy(); }} className="rounded-full border border-[color:var(--ds-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ds-text)] hover:bg-white"><Copy className="mr-1 inline h-3.5 w-3.5" />Copiar</button>{canEdit ? <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-full p-2 text-[color:var(--ds-text-secondary)] hover:bg-white" title="Editar"><Pencil className="h-4 w-4" /></button> : null}</div></td></tr>;
}

function OfferMobileCard({ row, tags, selected, onSelect, onCopy, onEdit, canEdit }: { row: CatalogRow; tags: PendingTag[]; selected: boolean; onSelect: () => void; onCopy: () => void; onEdit: () => void; canEdit: boolean }) {
  return <article onClick={onSelect} className={clsx("rounded-[var(--ds-radius-md)] border bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]", selected ? "border-[color:var(--ds-primary)]" : "border-[color:var(--ds-border)]")}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[color:var(--ds-text)]">{row.offer.name}</p><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p></div>{row.link.is_main_link ? <StatusBadge tone="warning">Principal</StatusBadge> : null}</div><CommercialPills row={row} compact /><div className="mt-3 flex flex-wrap gap-2"><StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge><HealthBadge health={row.link.technical_health} /><StatusBadge tone="neutral">{coparticipationLabel(row, true)}</StatusBadge></div>{tags.length ? <div className="mt-3 flex flex-wrap gap-1">{tags.slice(0, 3).map((tag) => <StatusBadge key={tag.key} tone="warning">{tag.label}</StatusBadge>)}</div> : null}<div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Info label="Preco" value={money(row.offer.current_price)} /><Info label="Pagamento" value={paymentLabels[row.offer.payment_condition]} /><Info label="Acesso" value={accessLabels[row.offer.access_duration]} /><Info label="Publico" value={audienceLabels[row.offer.audience_type]} /></div><div className="mt-4 flex gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onCopy(); }} className="flex-1 rounded-full bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white"><Copy className="mr-1 inline h-4 w-4" />Copiar link</button>{canEdit ? <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)]">Editar</button> : null}</div></article>;
}

function DetailPanel({ row, canEdit, canSeeTechnical, history, tags, checking, onCopy, onEdit, onVerify }: { row: CatalogRow | null; canEdit: boolean; canSeeTechnical: boolean; history: CatalogContext["history"]; tags: PendingTag[]; checking: boolean; onCopy: (url: string) => void; onEdit: (row: CatalogRow) => void; onVerify: (row: CatalogRow) => void }) {
  if (!row) return <Surface><EmptyState title="Selecione uma oferta">O detalhe aparece aqui depois de escolher um link.</EmptyState></Surface>;
  const presence = presenceDetails(row);
  return <Surface className="space-y-5 xl:sticky xl:top-6 xl:self-start"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-[color:var(--ds-text)]">{row.offer.name}</h2><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p></div><div className="flex flex-wrap justify-end gap-2">{row.link.is_main_link ? <StatusBadge tone="warning">Principal</StatusBadge> : null}<StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge></div></div><section className="space-y-3"><h3 className="text-sm font-semibold text-[color:var(--ds-text)]">Resumo comercial</h3><div className="grid grid-cols-2 gap-3 text-sm"><Info label="Preco" value={money(row.offer.current_price)} /><Info label="Condicao" value={paymentLabels[row.offer.payment_condition]} /><Info label="Parcelamento maximo" value={row.offer.max_installments ? `${row.offer.max_installments}x` : "A confirmar"} /><Info label="Acesso" value={accessLabels[row.offer.access_duration]} /><Info label="Composicao" value={compositionLabels[row.offer.composition]} /><Info label="Produtos incluidos" value={row.offer.composition === "combo" ? (row.offer.included_products.length ? row.offer.included_products.join(" · ") : "A confirmar") : row.product.name} /><Info label="Publico" value={audienceLabels[row.offer.audience_type]} /><Info label="Garantia" value={row.offer.warranty} /><Info label="Coparticipacao" value={coparticipationLabel(row, true)} /><Info label="Uso" value={row.offer.use_type} /></div></section><section className="space-y-3"><h3 className="text-sm font-semibold text-[color:var(--ds-text)]">Link de venda</h3><div className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4"><p className="break-all text-sm font-semibold text-[color:var(--ds-text)]">{row.link.checkout_url}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => onCopy(row.link.checkout_url)} className="rounded-full bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white"><Clipboard className="mr-2 inline h-4 w-4" />Copiar link</button><a href={row.link.checkout_url} target="_blank" rel="noreferrer" className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--ds-text)]"><ExternalLink className="mr-2 inline h-4 w-4" />Abrir checkout</a></div></div></section><section className="space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[color:var(--ds-text)]">Saude</h3><HealthBadge health={row.link.technical_health} /></div><div className="grid grid-cols-2 gap-3 text-sm"><Info label="Ultima verificacao" value={row.link.last_checked_at ? dateTime(row.link.last_checked_at) : "Nunca verificado"} /><Info label="HTTP" value={presence.httpStatus ?? "-"} /><Info label="Destino final" value={presence.finalUrl ? <span className="break-all">{presence.finalUrl}</span> : "-"} /><Info label="Resposta" value={presence.responseTimeMs ? `${presence.responseTimeMs} ms` : "-"} /></div><button type="button" onClick={() => onVerify(row)} disabled={checking} className="w-full rounded-full bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><RefreshCw className={clsx("mr-2 inline h-4 w-4", checking && "animate-spin")} />{checking ? "Verificando..." : "Verificar agora"}</button>{row.link.presence_asset_id ? <p className="text-xs text-[color:var(--ds-text-muted)]">Vinculado ao Presence: {row.link.presence_asset_id}</p> : null}</section><section className="space-y-3"><h3 className="text-sm font-semibold text-[color:var(--ds-text)]">Pendencias</h3>{tags.length ? <div className="flex flex-wrap gap-2">{tags.map((tag) => <StatusBadge key={tag.key} tone="warning">{tag.label}</StatusBadge>)}</div> : <StatusBadge tone="success">Sem pendencias derivadas</StatusBadge>}</section><ActionCard title="Performance por link" description="Sera exibida quando houver atribuicao confiavel. Nenhuma venda foi associada por aproximacao." tone="neutral" icon={ShieldCheck} />{canSeeTechnical ? <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] p-3 text-xs text-[color:var(--ds-text-secondary)]"><p><strong>Hotmart Product ID:</strong> {row.link.hotmart_product_id ?? "-"}</p><p><strong>Offer ID:</strong> {row.link.hotmart_offer_id ?? "-"}</p><p><strong>Redirects:</strong> {presence.redirectChain.length ? presence.redirectChain.length : "-"}</p><p><strong>Erro:</strong> {presence.errorMessage ?? "-"}</p></div> : null}<section className="space-y-2"><h3 className="text-sm font-semibold text-[color:var(--ds-text)]">Historico recente</h3>{history.length ? history.map((item) => <div key={item.id} className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-3 text-xs text-[color:var(--ds-text-secondary)]"><strong>{historyLabel(item.event_type)}</strong> - {dateTime(item.created_at)}{item.reason ? <p className="mt-1">{item.reason}</p> : null}</div>) : <p className="text-sm text-[color:var(--ds-text-muted)]">Sem eventos recentes.</p>}</section>{canEdit ? <button type="button" onClick={() => onEdit(row)} className="w-full rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)] hover:bg-white"><Pencil className="mr-2 inline h-4 w-4" />Editar oferta</button> : null}</Surface>;
}

function HealthRow({ row, checking, onSelect, onVerify }: { row: CatalogRow; checking: boolean; onSelect: () => void; onVerify: () => void }) {
  const presence = presenceDetails(row);
  return <div className="grid gap-3 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)] lg:grid-cols-[minmax(0,1.3fr)_120px_120px_minmax(0,1fr)_150px] lg:items-center"><button type="button" onClick={onSelect} className="text-left"><p className="font-semibold text-[color:var(--ds-text)]">{row.offer.name}</p><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p></button><StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge><HealthBadge health={row.link.technical_health} /><div className="min-w-0 text-sm text-[color:var(--ds-text-secondary)]"><p>HTTP {presence.httpStatus ?? "-"}</p><p className="truncate">{presence.finalUrl ?? "Sem destino final"}</p><p className="text-xs text-[color:var(--ds-text-muted)]">{row.link.last_checked_at ? dateTime(row.link.last_checked_at) : "Nunca verificado"}</p></div><button type="button" onClick={onVerify} disabled={checking} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)] disabled:opacity-60"><RefreshCw className={clsx("mr-1 inline h-4 w-4", checking && "animate-spin")} />Verificar</button></div>;
}

function CatalogOfferForm({ row, products, pending, onClose, onSave }: { row: CatalogRow | null; products: string[]; pending: boolean; onClose: () => void; onSave: (payload: CatalogOfferPayload) => void }) {
  const [form, setForm] = useState<CatalogOfferPayload>(() => row ? {
    id: row.offer.id,
    product_id: row.product.id,
    product_name: row.product.name,
    offer_name: row.offer.name,
    offer_type: row.offer.offer_type,
    included_products: row.offer.included_products,
    checkout_url: row.link.checkout_url,
    platform: row.offer.platform,
    current_price: row.offer.current_price,
    max_installments: row.offer.max_installments,
    smart_installments: row.offer.smart_installments,
    access_time: row.offer.access_time,
    warranty: row.offer.warranty,
    has_coparticipation: row.offer.has_coparticipation,
    partner: row.offer.partner,
    coparticipation_percent: row.offer.coparticipation_percent,
    use_type: row.offer.use_type,
    commercial_status: row.offer.commercial_status,
    is_main_link: row.link.is_main_link,
    responsible: row.offer.responsible,
    notes: row.offer.notes,
    campaign_name: row.offer.campaign_name,
    audience: row.offer.audience,
    lead_origin: row.offer.lead_origin,
    special_rule: row.offer.special_rule,
    payment_condition: row.offer.payment_condition,
    access_duration: row.offer.access_duration,
    composition: row.offer.composition,
    audience_type: row.offer.audience_type,
  } : { offer_name: "", offer_type: "produto_individual", product_name: "", included_products: [], checkout_url: "", platform: "Hotmart", current_price: null, max_installments: null, smart_installments: "A confirmar", access_time: "A confirmar", warranty: "A confirmar", has_coparticipation: null, partner: null, coparticipation_percent: null, use_type: "A confirmar", commercial_status: "rascunho", is_main_link: false, notes: null, audience: null, payment_condition: "a_confirmar", access_duration: "a_confirmar", composition: "individual", audience_type: "a_confirmar" });
  const isCombo = form.composition === "combo";
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--ds-text)]/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="mx-auto max-w-3xl rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-5 shadow-[var(--ds-shadow-lg)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">Catalogo</p><h2 className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">{row ? "Editar link" : "Novo link de venda"}</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[color:var(--ds-bg-soft)]"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Produto principal"><input list="catalog-products" value={form.product_name ?? ""} onChange={(event) => setForm({ ...form, product_id: undefined, product_name: event.target.value })} className={inputClass()} /><datalist id="catalog-products">{products.map((product) => <option key={product} value={product} />)}</datalist></Field><Field label="Nome da oferta"><input value={form.offer_name} onChange={(event) => setForm({ ...form, offer_name: event.target.value })} className={inputClass()} /></Field><Field label="Link de venda"><input value={form.checkout_url} onChange={(event) => setForm({ ...form, checkout_url: event.target.value })} className={inputClass()} /></Field><Field label="Tipo de oferta"><select value={form.offer_type} onChange={(event) => setForm({ ...form, offer_type: event.target.value as CatalogOfferType })} className={inputClass()}>{Object.entries(offerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Condicao de pagamento"><select value={form.payment_condition ?? "a_confirmar"} onChange={(event) => setForm({ ...form, payment_condition: event.target.value as CatalogPaymentCondition })} className={inputClass()}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Tempo de acesso"><select value={form.access_duration ?? "a_confirmar"} onChange={(event) => setForm({ ...form, access_duration: event.target.value as CatalogAccessDuration, access_time: accessLabels[event.target.value as CatalogAccessDuration] })} className={inputClass()}>{Object.entries(accessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Composicao"><select value={form.composition ?? "individual"} onChange={(event) => setForm({ ...form, composition: event.target.value as CatalogComposition })} className={inputClass()}>{Object.entries(compositionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Publico"><select value={form.audience_type ?? "a_confirmar"} onChange={(event) => setForm({ ...form, audience_type: event.target.value as CatalogAudienceType, audience: audienceLabels[event.target.value as CatalogAudienceType] })} className={inputClass()}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Preco"><input type="number" step="0.01" value={form.current_price ?? ""} onChange={(event) => setForm({ ...form, current_price: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Parcelamento maximo"><input type="number" value={form.max_installments ?? ""} onChange={(event) => setForm({ ...form, max_installments: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Garantia"><input value={form.warranty ?? ""} onChange={(event) => setForm({ ...form, warranty: event.target.value })} className={inputClass()} /></Field><Field label="Uso"><input value={form.use_type ?? ""} onChange={(event) => setForm({ ...form, use_type: event.target.value })} className={inputClass()} /></Field><Field label="Coparticipacao"><select value={form.has_coparticipation === true ? "sim" : form.has_coparticipation === false ? "nao" : "confirmar"} onChange={(event) => setForm({ ...form, has_coparticipation: event.target.value === "sim" ? true : event.target.value === "nao" ? false : null })} className={inputClass()}><option value="confirmar">A confirmar</option><option value="nao">Sem coparticipacao</option><option value="sim">Com coparticipacao</option></select></Field><Field label="Parceiro"><input value={form.partner ?? ""} onChange={(event) => setForm({ ...form, partner: event.target.value })} className={inputClass()} /></Field><Field label="Percentual"><input type="number" step="0.01" value={form.coparticipation_percent ?? ""} onChange={(event) => setForm({ ...form, coparticipation_percent: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Status comercial"><select value={form.commercial_status} onChange={(event) => setForm({ ...form, commercial_status: event.target.value as CatalogCommercialStatus })} className={inputClass()}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><label className="flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--ds-text)] md:col-span-2"><span>Marcar como Link principal</span><input type="checkbox" checked={Boolean(form.is_main_link)} onChange={(event) => setForm({ ...form, is_main_link: event.target.checked })} className="h-4 w-4 accent-[color:var(--ds-primary)]" /></label><Field label="Observacoes"><textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={clsx(inputClass(), "min-h-24 py-3")} /></Field>{isCombo ? <Field label="Produtos incluidos"><textarea value={(form.included_products ?? []).join(" | ")} onChange={(event) => setForm({ ...form, included_products: event.target.value.split("|").map((item) => item.trim()).filter(Boolean) })} className={clsx(inputClass(), "min-h-24 py-3")} /></Field> : <div className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4 text-sm text-[color:var(--ds-text-secondary)]"><p className="font-semibold text-[color:var(--ds-text)]">Oferta individual</p><p className="mt-1">Produtos incluidos nao sao obrigatorios para composicao Individual.</p></div>}</div><div className="mt-5 rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4 text-sm text-[color:var(--ds-text-secondary)]"><p className="font-semibold text-[color:var(--ds-text)]">Checklist antes de ativar</p><p className="mt-1">Link, produto, preco, pagamento, acesso, composicao, publico, coparticipacao, parcelamento e saude devem estar claros. Campos desconhecidos podem ficar como A confirmar.</p></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)]">Cancelar</button><button type="button" disabled={pending} onClick={() => onSave(form)} className="rounded-full bg-[color:var(--ds-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Salvando..." : "Salvar"}</button></div></div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-muted)]">{label}{children}</label>; }
function inputClass() { return "min-h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-white px-3 text-sm font-semibold text-[color:var(--ds-text)] outline-none focus:border-[color:var(--ds-primary)]"; }
function parseView(value: string | null): CatalogView { return value === "health" || value === "pending" || value === "history" || value === "offers" ? value : "offers"; }
function filterRows(rows: CatalogRow[], filters: Filters, productMainMap: Map<string, { activeMainCount: number; activeOfferCount: number }>) { const query = normalize(filters.q); return rows.filter((row) => { const haystack = normalize([row.product.name, row.offer.name, row.link.checkout_url, row.offer.campaign_name, row.offer.use_type, row.link.hotmart_product_id, row.link.hotmart_offer_id, paymentLabels[row.offer.payment_condition], accessLabels[row.offer.access_duration], compositionLabels[row.offer.composition], audienceLabels[row.offer.audience_type]].filter(Boolean).join(" ")); if (query && !haystack.includes(query)) return false; if (filters.product !== "all" && row.product.id !== filters.product) return false; if (filters.payment !== "all" && row.offer.payment_condition !== filters.payment) return false; if (filters.access !== "all" && row.offer.access_duration !== filters.access) return false; if (filters.composition !== "all" && row.offer.composition !== filters.composition) return false; if (filters.audience !== "all" && row.offer.audience_type !== filters.audience) return false; if (filters.copa === "sem" && row.offer.has_coparticipation !== false) return false; if (filters.copa === "com" && row.offer.has_coparticipation !== true) return false; if (filters.health !== "all" && row.link.technical_health !== filters.health) return false; if (filters.status !== "all" && row.offer.commercial_status !== filters.status) return false; if (filters.pending !== "all") { const tags = pendingTags(row, productMainMap); if (filters.pending === "review" && tags.length === 0) return false; if (filters.pending !== "review" && !tags.some((tag) => tag.key === filters.pending)) return false; } return true; }); }
function filterHistory(events: CatalogContext["history"], query: string) { const q = normalize(query); return q ? events.filter((event) => normalize([event.event_type, event.reason, event.actor_label].filter(Boolean).join(" ")).includes(q)) : events; }
function pendingTags(row: CatalogRow, productMainMap: Map<string, { activeMainCount: number; activeOfferCount: number }>): PendingTag[] { const tags: PendingTag[] = []; if (row.offer.current_price == null) tags.push(tag("price", "Cadastro incompleto")); if (isUnknown(row.offer.use_type)) tags.push(tag("use", "Cadastro incompleto")); if (row.offer.access_duration === "a_confirmar") tags.push(tag("access", "Acesso")); if (isUnknown(row.offer.warranty)) tags.push(tag("warranty", "Cadastro incompleto")); if (row.link.technical_health === "nao_verificado") tags.push(tag("health", "Saude")); if (row.offer.has_coparticipation == null) tags.push(tag("coparticipation", "Coparticipacao")); if (row.link.platform.toLowerCase().includes("hotmart") && !row.link.hotmart_offer_id) tags.push(tag("offer_id", "Cadastro incompleto")); if (row.offer.payment_condition === "a_confirmar") tags.push(tag("payment", "Pagamento")); if (hasCompositionConflict(row)) tags.push(tag("composition", "Composicao")); if (row.offer.audience_type === "a_confirmar") tags.push(tag("audience", "Publico")); const productMain = productMainMap.get(row.product.id); if (row.offer.commercial_status === "ativo" && productMain?.activeOfferCount && productMain.activeMainCount === 0) tags.push(tag("main", "Link principal")); return tags; }
function tag(key: PendingKey, group: PendingGroup): PendingTag { return { key, group, label: pendingLabels[key] }; }
function hasCompositionConflict(row: CatalogRow) {
  const includedCount = row.offer.included_products.length;
  if (row.offer.offer_type === "combo" && row.offer.composition !== "combo") return true;
  if (includedCount > 1 && row.offer.composition !== "combo") return true;
  if (row.offer.composition === "combo" && row.offer.offer_type !== "combo" && includedCount <= 1) return true;
  return false;
}
function buildProductMainMap(rows: CatalogRow[]) { const map = new Map<string, { activeMainCount: number; activeOfferCount: number }>(); for (const row of rows) { const current = map.get(row.product.id) ?? { activeMainCount: 0, activeOfferCount: 0 }; if (row.offer.commercial_status === "ativo") { current.activeOfferCount += 1; if (row.link.is_main_link) current.activeMainCount += 1; } map.set(row.product.id, current); } return map; }
function summarizeHealth(rows: CatalogRow[]) { const total = rows.length; const funcionando = rows.filter((row) => row.link.technical_health === "funcionando").length; const redirecionando = rows.filter((row) => row.link.technical_health === "redirecionando").length; const quebrados = rows.filter((row) => row.link.technical_health === "quebrado").length; const indisponiveis = rows.filter((row) => row.link.technical_health === "indisponivel").length; const notChecked = rows.filter((row) => row.link.technical_health === "nao_verificado").length; return { total, checked: total - notChecked, funcionando, redirecionando, quebrados, indisponiveis, notChecked, withIssue: quebrados + indisponiveis }; }
function buildTaxonomyPendingEntries(items: Array<{ row: CatalogRow; tags: PendingTag[] }>): PendingEntry[] {
  const entries: PendingEntry[] = [];
  for (const item of items) {
    for (const tagItem of item.tags) {
      if (isTaxonomyPendingKey(tagItem.key)) entries.push({ row: item.row, tag: tagItem, field: taxonomyFieldByPendingKey[tagItem.key] });
    }
  }
  return entries;
}
function groupTaxonomyPending(entries: PendingEntry[]) { const grouped: Record<TaxonomyPendingKey, PendingEntry[]> = { audience: [], access: [], payment: [], composition: [] }; for (const entry of entries) { if (isTaxonomyPendingKey(entry.tag.key)) grouped[entry.tag.key].push(entry); } return Object.fromEntries(Object.entries(grouped).filter(([, value]) => value.length > 0)) as Partial<Record<TaxonomyPendingKey, PendingEntry[]>>; }
function countTaxonomyPending(entries: PendingEntry[]) { const counts: Record<TaxonomyPendingKey, number> = { audience: 0, access: 0, payment: 0, composition: 0 }; for (const entry of entries) { if (isTaxonomyPendingKey(entry.tag.key)) counts[entry.tag.key] += 1; } return counts; }
function isTaxonomyPendingKey(value: PendingKey): value is TaxonomyPendingKey { return taxonomyPendingKeys.includes(value as TaxonomyPendingKey); }
function currentTaxonomyValue(row: CatalogRow, field: CatalogTaxonomyField) { if (field === "audience_type") return row.offer.audience_type; if (field === "access_duration") return row.offer.access_duration; if (field === "payment_condition") return row.offer.payment_condition; return row.offer.composition; }
function taxonomyValueLabel(field: CatalogTaxonomyField, value: string) { return taxonomyOptions[field].find(([optionValue]) => optionValue === value)?.[1] ?? value; }
function summarizeCurrentValues(rows: CatalogRow[], field: CatalogTaxonomyField) { const summary = new Map<string, number>(); for (const row of rows) { const label = taxonomyValueLabel(field, currentTaxonomyValue(row, field)); summary.set(label, (summary.get(label) ?? 0) + 1); } return Array.from(summary.entries()).map(([label, count]) => `${label}: ${count}`).join(" | ") || "Sem itens aplicaveis"; }
function isPendingForField(row: CatalogRow, field: CatalogTaxonomyField) { if (field === "audience_type") return row.offer.audience_type === "a_confirmar"; if (field === "access_duration") return row.offer.access_duration === "a_confirmar"; if (field === "payment_condition") return row.offer.payment_condition === "a_confirmar"; return hasCompositionConflict(row); }

function presenceDetails(row: CatalogRow) { const presence = (row.link.metadata?.presence ?? {}) as Record<string, unknown>; return { httpStatus: typeof presence.http_status === "number" ? presence.http_status : null, responseTimeMs: typeof presence.response_time_ms === "number" ? presence.response_time_ms : null, finalUrl: typeof presence.final_url === "string" ? presence.final_url : null, redirectChain: Array.isArray(presence.redirect_chain) ? presence.redirect_chain.filter((item): item is string => typeof item === "string") : [], errorMessage: typeof presence.error_message === "string" ? presence.error_message : null }; }
function HealthBadge({ health }: { health: CatalogTechnicalHealth }) { const tone = health === "funcionando" ? "success" : health === "redirecionando" ? "info" : health === "nao_verificado" ? "neutral" : "danger"; return <StatusBadge tone={tone}>{healthLabels[health]}</StatusBadge>; }
function FilterSelect({ label, value, options, compact = false, onChange }: { label: string; value: string; options: Array<[string, string]>; compact?: boolean; onChange: (value: string) => void }) { return <label className={clsx("grid gap-1 text-xs font-semibold text-[color:var(--ds-text-muted)]", compact && "max-w-xs")}>{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm font-semibold text-[color:var(--ds-text)] outline-none focus:border-[color:var(--ds-primary)]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function pillClass(active: boolean) { return clsx("inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-semibold transition", active ? "border-[color:var(--ds-primary)] bg-[color:var(--ds-primary)] text-white" : "border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] text-[color:var(--ds-text-secondary)] hover:bg-white"); }
function money(value: number | null) { return value == null ? "A confirmar" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function coparticipationLabel(row: CatalogRow, compact = false) { if (row.offer.has_coparticipation === false) return "Sem coparticipacao"; if (row.offer.has_coparticipation === true) return `${row.offer.partner ?? "Parceiro"}${row.offer.coparticipation_percent != null ? ` - ${row.offer.coparticipation_percent}%` : ""}`; return compact ? "A confirmar" : <StatusBadge tone="warning">A confirmar</StatusBadge>; }
function historyLabel(value: string) { const labels: Record<string, string> = { initial_load: "Carga inicial do Catalogo", created: "Oferta criada", updated: "Oferta editada", status_changed: "Status alterado", main_link_changed: "Link principal alterado", health_checked: "Saude verificada", health_changed: "Saude alterada" }; return labels[value] ?? value.replace(/_/g, " "); }
function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-3"><p className="text-[11px] font-semibold uppercase text-[color:var(--ds-text-muted)]">{label}</p><p className="mt-1 break-words font-semibold text-[color:var(--ds-text)]">{value}</p></div>; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function isUnknown(value: string | null | undefined) { return !value || normalize(value) === "a confirmar" || normalize(value) === "nao informado" || normalize(value) === "nao informada"; }
function uniqueValues(values: string[]) { return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")); }




