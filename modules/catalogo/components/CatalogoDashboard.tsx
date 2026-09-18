"use client";

import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  Link2,
  PackageCheck,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Tags,
  X,
} from "lucide-react";
import { ActionCard, DataFreshness, EmptyState, IconPill, MetricCard, PageHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";
import type { CatalogContext, CatalogOfferPayload, CatalogOfferType, CatalogRow, CatalogCommercialStatus } from "@/modules/catalogo/types";

const offerTypeLabels: Record<string, string> = {
  produto_individual: "Produto individual",
  combo: "Combo",
  upsell: "Upsell",
  downsell: "Downsell",
  order_bump: "Order bump",
  evento: "Evento",
  oferta_especial: "Oferta especial",
  outro: "Outro",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  pausado: "Pausado",
  desativado: "Desativado",
  substituido: "Substituído",
};

const healthLabels: Record<string, string> = {
  funcionando: "Funcionando",
  redirecionando: "Redirecionando",
  quebrado: "Quebrado",
  indisponivel: "Indisponível",
  nao_verificado: "Não verificado",
};

const blankForm: CatalogOfferPayload = {
  product_name: "",
  offer_name: "",
  offer_type: "produto_individual",
  included_products: [],
  checkout_url: "",
  platform: "Hotmart",
  current_price: null,
  max_installments: null,
  smart_installments: "A confirmar",
  access_time: "A confirmar",
  warranty: "A confirmar",
  has_coparticipation: null,
  partner: null,
  coparticipation_percent: null,
  use_type: "A confirmar",
  commercial_status: "rascunho",
  is_main_link: false,
  responsible: null,
  notes: null,
  campaign_name: null,
  audience: null,
  lead_origin: null,
  special_rule: null,
};

export function CatalogoDashboard({ context }: { context: CatalogContext }) {
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(context.products[0]?.id ?? null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(context.links.find((link) => link.is_main_link)?.id ?? context.links[0]?.id ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (context.diagnostic) {
    return <Surface><p className="text-sm font-semibold text-[color:var(--ds-danger)]">{context.diagnostic}</p></Surface>;
  }

  const queryValue = query.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    return context.rows.filter((row) => {
      const haystack = [row.product.name, row.offer.name, row.link.checkout_url, row.offer.campaign_name, row.offer.use_type, row.link.hotmart_product_id, row.link.hotmart_offer_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !queryValue || haystack.includes(queryValue);
      const matchesProduct = !selectedProductId || row.product.id === selectedProductId;
      return matchesQuery && matchesProduct;
    });
  }, [context.rows, queryValue, selectedProductId]);

  const selectedRow = context.rows.find((row) => row.link.id === selectedLinkId) ?? filteredRows[0] ?? context.rows[0] ?? null;
  const productsWithCounts = context.products.map((product) => ({ product, count: context.rows.filter((row) => row.product.id === product.id).length }));
  const activeMainConflicts = productsWithCounts
    .map(({ product }) => ({ product, count: context.rows.filter((row) => row.product.id === product.id && row.link.is_main_link && row.offer.commercial_status === "ativo").length }))
    .filter((item) => item.count > 1);
  const productsWithoutMain = productsWithCounts
    .filter(({ product }) => context.rows.some((row) => row.product.id === product.id && row.offer.commercial_status === "ativo"))
    .filter(({ product }) => !context.rows.some((row) => row.product.id === product.id && row.link.is_main_link && row.offer.commercial_status === "ativo"));

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: CatalogRow) {
    setEditing(row);
    setFormOpen(true);
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Link copiado.");
    window.setTimeout(() => setMessage(null), 2200);
  }

  function saveOffer(payload: CatalogOfferPayload) {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/catalogo/offers", {
        method: payload.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Não foi possível salvar.");
        return;
      }
      setMessage(payload.id ? "Link atualizado." : "Novo link cadastrado.");
      setFormOpen(false);
      window.location.reload();
    });
  }

  return (
    <section className="norwyn-ds-page mx-auto max-w-[1540px] space-y-6 px-1">
      <PageHeader
        eyebrow="Norwyn OS"
        title="Catálogo"
        description="Encontre produtos, ofertas e links de venda com segurança para enviar o checkout certo."
        aside={<div className="flex flex-wrap items-center gap-2"><DataFreshness label={context.updatedAt ? `Atualizado em ${dateTime(context.updatedAt)}` : "Base aguardando carga"} /><button type="button" onClick={openCreate} disabled={!context.canEdit} className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ds-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--ds-shadow-sm)] disabled:opacity-50"><Plus className="h-4 w-4" />Novo link de venda</button></div>}
      />

      {message ? <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-4 py-3 text-sm font-semibold text-[color:var(--ds-text)] shadow-[var(--ds-shadow-sm)]">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Links cadastrados" value={String(context.loadSummary.links)} period="Base inicial" tone="info" icon={Link2} />
        <MetricCard label="Ofertas ativas" value={String(context.loadSummary.activeOffers)} period="Status comercial" tone="success" icon={ShoppingCart} />
        <MetricCard label="Links com problema" value={String(context.loadSummary.linksWithIssue)} period="Saúde técnica" tone={context.loadSummary.linksWithIssue ? "danger" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Produtos principais" value={String(context.loadSummary.products)} period={`${context.loadSummary.mainLinks} link principal`} tone="primary" icon={PackageCheck} />
      </div>

      <Surface className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ds-text-muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, oferta ou link..." className="h-12 w-full rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] pl-11 pr-4 text-sm font-semibold text-[color:var(--ds-text)] outline-none transition focus:border-[color:var(--ds-primary)] focus:ring-2 focus:ring-[color:var(--ds-primary-soft)]" />
          </label>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-[color:var(--ds-text-muted)]">
            <StatusBadge tone="neutral">Atribuição ainda não disponível</StatusBadge>
            <StatusBadge tone="info">Saúde via Presence quando vinculada</StatusBadge>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setSelectedProductId(null)} className={pillClass(!selectedProductId)}>Todos</button>
          {productsWithCounts.map(({ product, count }) => <button key={product.id} type="button" onClick={() => setSelectedProductId(product.id)} className={pillClass(selectedProductId === product.id)}>{product.name}<span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-[11px]">{count}</span></button>)}
        </div>
      </Surface>

      {(activeMainConflicts.length || productsWithoutMain.length) ? (
        <div className="grid gap-3 md:grid-cols-2">
          {activeMainConflicts.length ? <ActionCard title="Conflito de Link principal" description={`${activeMainConflicts.length} produto(s) possuem mais de um link principal ativo.`} tone="warning" icon={AlertTriangle} /> : null}
          {productsWithoutMain.length ? <ActionCard title="Produto sem Link principal" description={`${productsWithoutMain.length} produto(s) ativos ainda precisam de definição manual.`} tone="info" icon={Star} /> : null}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Surface className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--ds-text)]">Ofertas e links</h2>
              <p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{filteredRows.length} resultado(s) no recorte atual.</p>
            </div>
          </div>
          <div className="hidden overflow-hidden rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--ds-bg-soft)] text-xs font-semibold uppercase text-[color:var(--ds-text-muted)]">
                <tr><th className="px-4 py-3">Oferta</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3">Coparticipação</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Saúde</th><th className="px-4 py-3">Uso</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)]">
                {filteredRows.map((row) => <OfferTableRow key={row.link.id} row={row} selected={selectedRow?.link.id === row.link.id} onSelect={() => setSelectedLinkId(row.link.id)} onCopy={() => copyLink(row.link.checkout_url)} onEdit={() => openEdit(row)} canEdit={context.canEdit} />)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {filteredRows.map((row) => <OfferMobileCard key={row.link.id} row={row} selected={selectedRow?.link.id === row.link.id} onSelect={() => setSelectedLinkId(row.link.id)} onCopy={() => copyLink(row.link.checkout_url)} onEdit={() => openEdit(row)} canEdit={context.canEdit} />)}
          </div>
          {filteredRows.length === 0 ? <EmptyState title="Nenhum link encontrado">Tente buscar por outro produto, oferta ou código Hotmart.</EmptyState> : null}
        </Surface>

        <DetailPanel row={selectedRow} canEdit={context.canEdit} canSeeTechnical={context.canSeeTechnical} history={context.history.filter((event) => event.offer_id === selectedRow?.offer.id || event.sales_link_id === selectedRow?.link.id).slice(0, 6)} onCopy={copyLink} onEdit={openEdit} />
      </div>

      {formOpen ? <OfferForm row={editing} products={context.products.map((product) => product.name)} pending={isPending} onClose={() => setFormOpen(false)} onSave={saveOffer} /> : null}
    </section>
  );
}

function OfferTableRow({ row, selected, onSelect, onCopy, onEdit, canEdit }: { row: CatalogRow; selected: boolean; onSelect: () => void; onCopy: () => void; onEdit: () => void; canEdit: boolean }) {
  return <tr className={clsx("cursor-pointer transition hover:bg-[color:var(--ds-bg-soft)]", selected && "bg-[color:var(--ds-primary-soft)]")} onClick={onSelect}>
    <td className="px-4 py-3"><div className="flex items-start gap-3"><IconPill icon={row.link.is_main_link ? Star : Tags} tone={row.link.is_main_link ? "warning" : "info"} /><div><p className="font-semibold text-[color:var(--ds-text)]">{row.offer.name}</p><p className="mt-1 max-w-[280px] truncate text-xs text-[color:var(--ds-text-muted)]">{row.link.checkout_url}</p>{row.link.is_main_link ? <span className="mt-2 inline-flex"><StatusBadge tone="warning">Link principal</StatusBadge></span> : null}</div></div></td>
    <td className="px-4 py-3 font-semibold text-[color:var(--ds-text)]">{money(row.offer.current_price)}</td>
    <td className="px-4 py-3">{coparticipationLabel(row)}</td>
    <td className="px-4 py-3"><StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge></td>
    <td className="px-4 py-3"><StatusBadge tone={row.link.technical_health === "funcionando" ? "success" : row.link.technical_health === "nao_verificado" ? "neutral" : "warning"}>{healthLabels[row.link.technical_health]}</StatusBadge></td>
    <td className="px-4 py-3 text-[color:var(--ds-text-secondary)]">{row.offer.use_type}</td>
    <td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onCopy(); }} className="rounded-full border border-[color:var(--ds-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ds-text)] hover:bg-white"><Copy className="mr-1 inline h-3.5 w-3.5" />Copiar</button>{canEdit ? <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-full p-2 text-[color:var(--ds-text-secondary)] hover:bg-white" title="Editar"><Pencil className="h-4 w-4" /></button> : null}</div></td>
  </tr>;
}

function OfferMobileCard(props: { row: CatalogRow; selected: boolean; onSelect: () => void; onCopy: () => void; onEdit: () => void; canEdit: boolean }) {
  const { row, selected, onSelect, onCopy, onEdit, canEdit } = props;
  return <article onClick={onSelect} className={clsx("rounded-[var(--ds-radius-md)] border bg-[color:var(--ds-surface-solid)] p-4 shadow-[var(--ds-shadow-sm)]", selected ? "border-[color:var(--ds-primary)]" : "border-[color:var(--ds-border)]")}>
    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[color:var(--ds-text)]">{row.offer.name}</p><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p></div>{row.link.is_main_link ? <StatusBadge tone="warning">Principal</StatusBadge> : null}</div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Info label="Preço" value={money(row.offer.current_price)} /><Info label="Status" value={statusLabels[row.offer.commercial_status]} /><Info label="Saúde" value={healthLabels[row.link.technical_health]} /><Info label="Copa" value={coparticipationLabel(row, true)} /></div>
    <div className="mt-4 flex gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); onCopy(); }} className="flex-1 rounded-full bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white"><Copy className="mr-1 inline h-4 w-4" />Copiar link</button>{canEdit ? <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)]">Editar</button> : null}</div>
  </article>;
}

function DetailPanel({ row, canEdit, canSeeTechnical, history, onCopy, onEdit }: { row: CatalogRow | null; canEdit: boolean; canSeeTechnical: boolean; history: any[]; onCopy: (url: string) => void; onEdit: (row: CatalogRow) => void }) {
  if (!row) return <Surface><EmptyState title="Selecione uma oferta">O detalhe aparece aqui depois de escolher um link.</EmptyState></Surface>;
  return <Surface className="space-y-5 xl:sticky xl:top-6 xl:self-start">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">Link de venda</p><h2 className="mt-1 text-xl font-semibold text-[color:var(--ds-text)]">{row.offer.name}</h2><p className="mt-1 text-sm text-[color:var(--ds-text-secondary)]">{row.product.name}</p></div>{row.link.is_main_link ? <StatusBadge tone="warning">Link principal</StatusBadge> : null}</div>
    <div className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4"><p className="break-all text-sm font-semibold text-[color:var(--ds-text)]">{row.link.checkout_url}</p><div className="mt-3 grid gap-2"><button type="button" onClick={() => onCopy(row.link.checkout_url)} className="rounded-full bg-[color:var(--ds-primary)] px-4 py-2 text-sm font-semibold text-white"><Clipboard className="mr-2 inline h-4 w-4" />Copiar link</button><a href={row.link.checkout_url} target="_blank" rel="noreferrer" className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--ds-text)]"><ExternalLink className="mr-2 inline h-4 w-4" />Abrir checkout</a></div></div>
    <div className="grid grid-cols-2 gap-3 text-sm"><Info label="Preço" value={money(row.offer.current_price)} /><Info label="Parcelamento" value={row.offer.max_installments ? `${row.offer.max_installments}x` : "A confirmar"} /><Info label="Acesso" value={row.offer.access_time} /><Info label="Garantia" value={row.offer.warranty} /><Info label="Coparticipação" value={coparticipationLabel(row, true)} /><Info label="Uso" value={row.offer.use_type} /></div>
    <div className="flex flex-wrap gap-2"><StatusBadge tone={row.offer.commercial_status === "ativo" ? "success" : "neutral"}>{statusLabels[row.offer.commercial_status]}</StatusBadge><StatusBadge tone="neutral">{offerTypeLabels[row.offer.offer_type]}</StatusBadge><StatusBadge tone={row.link.technical_health === "funcionando" ? "success" : "neutral"}>{healthLabels[row.link.technical_health]}</StatusBadge></div>
    <ActionCard title="Performance por link" description="Atribuição ainda não disponível. Nenhuma venda foi associada a este link por aproximação." tone="neutral" icon={ShieldCheck} />
    {canSeeTechnical ? <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] p-3 text-xs text-[color:var(--ds-text-secondary)]"><p><strong>Hotmart Product ID:</strong> {row.link.hotmart_product_id ?? "-"}</p><p><strong>Offer ID:</strong> {row.link.hotmart_offer_id ?? "-"}</p><p><strong>Presence:</strong> {row.link.presence_asset_id ? "Vinculado" : "Não vinculado"}</p></div> : null}
    {row.offer.notes ? <p className="text-sm leading-6 text-[color:var(--ds-text-secondary)]">{row.offer.notes}</p> : null}
    {history.length ? <div><p className="mb-2 text-sm font-semibold text-[color:var(--ds-text)]">Histórico</p><div className="space-y-2">{history.map((item) => <div key={item.id} className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-3 text-xs text-[color:var(--ds-text-secondary)]"><strong>{historyLabel(item.event_type)}</strong> · {dateTime(item.created_at)}{item.reason ? <p className="mt-1">{item.reason}</p> : null}</div>)}</div></div> : null}
    {canEdit ? <button type="button" onClick={() => onEdit(row)} className="w-full rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)] hover:bg-white"><Pencil className="mr-2 inline h-4 w-4" />Editar oferta</button> : null}
  </Surface>;
}

export function OfferForm({ row, products, pending, onClose, onSave }: { row: CatalogRow | null; products: string[]; pending: boolean; onClose: () => void; onSave: (payload: CatalogOfferPayload) => void }) {
  const [form, setForm] = useState<CatalogOfferPayload>(() => row ? {
    id: row.offer.id,
    product_id: row.product.id,
    product_name: row.product.name,
    offer_name: row.offer.name,
    offer_type: row.offer.offer_type,
    included_products: row.offer.included_products,
    checkout_url: row.link.checkout_url,
    platform: row.link.platform,
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
  } : blankForm);
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[color:var(--ds-text)]/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="mx-auto max-w-3xl rounded-[var(--ds-radius-lg)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-5 shadow-[var(--ds-shadow-lg)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[color:var(--ds-accent)]">Catálogo</p><h2 className="mt-1 text-2xl font-semibold text-[color:var(--ds-text)]">{row ? "Editar link" : "Novo link de venda"}</h2></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[color:var(--ds-bg-soft)]"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Produto principal"><input list="catalog-products" value={form.product_name ?? ""} onChange={(event) => setForm({ ...form, product_id: undefined, product_name: event.target.value })} className={inputClass()} /><datalist id="catalog-products">{products.map((product) => <option key={product} value={product} />)}</datalist></Field><Field label="Nome da oferta"><input value={form.offer_name} onChange={(event) => setForm({ ...form, offer_name: event.target.value })} className={inputClass()} /></Field><Field label="Link de venda"><input value={form.checkout_url} onChange={(event) => setForm({ ...form, checkout_url: event.target.value })} className={inputClass()} /></Field><Field label="Tipo de oferta"><select value={form.offer_type} onChange={(event) => setForm({ ...form, offer_type: event.target.value as CatalogOfferType })} className={inputClass()}>{Object.entries(offerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Preço"><input type="number" step="0.01" value={form.current_price ?? ""} onChange={(event) => setForm({ ...form, current_price: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Parcelamento máximo"><input type="number" value={form.max_installments ?? ""} onChange={(event) => setForm({ ...form, max_installments: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Tempo de acesso"><input value={form.access_time ?? ""} onChange={(event) => setForm({ ...form, access_time: event.target.value })} className={inputClass()} /></Field><Field label="Garantia"><input value={form.warranty ?? ""} onChange={(event) => setForm({ ...form, warranty: event.target.value })} className={inputClass()} /></Field><Field label="Coparticipação"><select value={form.has_coparticipation === true ? "sim" : form.has_coparticipation === false ? "nao" : "confirmar"} onChange={(event) => setForm({ ...form, has_coparticipation: event.target.value === "sim" ? true : event.target.value === "nao" ? false : null })} className={inputClass()}><option value="confirmar">A confirmar</option><option value="nao">Sem coparticipação</option><option value="sim">Com coparticipação</option></select></Field><Field label="Parceiro"><input value={form.partner ?? ""} onChange={(event) => setForm({ ...form, partner: event.target.value })} className={inputClass()} /></Field><Field label="Percentual"><input type="number" step="0.01" value={form.coparticipation_percent ?? ""} onChange={(event) => setForm({ ...form, coparticipation_percent: event.target.value ? Number(event.target.value) : null })} className={inputClass()} /></Field><Field label="Status comercial"><select value={form.commercial_status} onChange={(event) => setForm({ ...form, commercial_status: event.target.value as CatalogCommercialStatus })} className={inputClass()}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><label className="flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--ds-text)] md:col-span-2"><span>Marcar como Link principal</span><input type="checkbox" checked={Boolean(form.is_main_link)} onChange={(event) => setForm({ ...form, is_main_link: event.target.checked })} className="h-4 w-4 accent-[color:var(--ds-primary)]" /></label><Field label="Observações"><textarea value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={clsx(inputClass(), "min-h-24 py-3")} /></Field><Field label="Produtos incluídos"><textarea value={(form.included_products ?? []).join(" | ")} onChange={(event) => setForm({ ...form, included_products: event.target.value.split("|").map((item) => item.trim()).filter(Boolean) })} className={clsx(inputClass(), "min-h-24 py-3")} /></Field></div><div className="mt-5 rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-4 text-sm text-[color:var(--ds-text-secondary)]"><p className="font-semibold text-[color:var(--ds-text)]">Checklist antes de ativar</p><p className="mt-1">Link, produto, preço, produtos incluídos, coparticipação, parcelamento e saúde devem estar claros. Campos desconhecidos podem ficar como A confirmar.</p></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-[color:var(--ds-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-text)]">Cancelar</button><button type="button" disabled={pending} onClick={() => onSave(form)} className="rounded-full bg-[color:var(--ds-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Salvando..." : "Salvar"}</button></div></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]">{label}{children}</label>; }
function inputClass() { return "h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[color:var(--ds-text)] outline-none focus:border-[color:var(--ds-primary)]"; }
function pillClass(active: boolean) { return clsx("inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-semibold transition", active ? "border-[color:var(--ds-primary)] bg-[color:var(--ds-primary)] text-white" : "border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] text-[color:var(--ds-text-secondary)] hover:bg-white"); }
function money(value: number | null) { return value == null ? "A confirmar" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function coparticipationLabel(row: CatalogRow, compact = false) { if (row.offer.has_coparticipation === false) return "Sem coparticipação"; if (row.offer.has_coparticipation === true) return `${row.offer.partner ?? "Parceiro"}${row.offer.coparticipation_percent != null ? ` · ${row.offer.coparticipation_percent}%` : ""}`; return compact ? "A confirmar" : <StatusBadge tone="warning">A confirmar</StatusBadge>; }
function historyLabel(value: string) { return value === "created" ? "Criado" : value === "updated" ? "Editado" : value; }
function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)] p-3"><p className="text-[11px] font-semibold uppercase text-[color:var(--ds-text-muted)]">{label}</p><p className="mt-1 break-words font-semibold text-[color:var(--ds-text)]">{value}</p></div>; }

