"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowDownUp, BookOpenCheck, Check, ChevronLeft, ChevronRight, ExternalLink, ImageIcon, LoaderCircle, RefreshCw, Search, Sparkles, Tags } from "lucide-react";
import { EmptyState, InsightCard, SectionHeader, StatusBadge, Surface } from "@/components/ui/norwyn-design-system";

type Mode = "validation" | "marketing";
type ContentItem = {
  id: string;
  title: string | null;
  caption: string | null;
  subtype: string | null;
  published_at: string;
  product_tags: string[];
  theme_tags: string[];
  campaign_id: string | null;
  campaign_name: string | null;
  objective: string | null;
  funnel_stage: string | null;
  cta: string | null;
  permalink: string | null;
  thumbnail: string | null;
  metrics: { reach: number; interactions: number; likes: number; saves: number; shares: number; comments: number; engagement: number };
  classification: { tags: string[]; reuseStatus: string; reuseAction: string };
};
type Facets = { products: string[]; themes: string[]; campaigns: Array<{ value: string; label: string }>; objectives: string[]; formats: string[]; funnels: string[] };
type Payload = { items: ContentItem[]; highlights: ContentItem[]; highlightRule: string; page: number; pages: number; total: number; facets: Facets; canWrite: boolean; error?: string };
type Classification = { product: string; theme: string; campaign: string; objective: string; funnel: string; format: string; reuse_status: string; tags: string[] };

const emptyFacets: Facets = { products: [], themes: [], campaigns: [], objectives: [], formats: [], funnels: [] };
const emptyClassification: Classification = { product: "", theme: "", campaign: "", objective: "", funnel: "", format: "", reuse_status: "", tags: [] };
const reuseOptions = [
  ["reel", "Reel"], ["carrossel", "Carrossel"], ["stories", "Stories"], ["atualizar_hook", "Atualizar hook"], ["atualizar_legenda", "Atualizar legenda"], ["campanha_atual", "Usar na campanha atual"],
];

function number(value: number) { return new Intl.NumberFormat("pt-BR").format(value || 0); }
function percent(value: number) { return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(value || 0); }
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function time(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function titleFor(item: ContentItem) { return item.title?.trim() || item.caption?.trim() || "Conteúdo sem título"; }
function compact(value: string | null, size = 145) { const text = value?.trim() ?? ""; return text.length > size ? `${text.slice(0, size - 3)}...` : text; }

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm text-[color:var(--ds-text)] outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]">
        <option value="">Todos</option>
        {options.map((option) => typeof option === "string" ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function ContentLibrary({ mode }: { mode: Mode }) {
  const [data, setData] = useState<Payload>({ items: [], highlights: [], highlightRule: "", page: 1, pages: 1, total: 0, facets: emptyFacets, canWrite: false });
  const [filters, setFilters] = useState({ q: "", product: "", theme: "", campaign: "", objective: "", format: "", funnel: "", from: "", to: "", sort: "recent" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [classification, setClassification] = useState<Classification>(emptyClassification);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [aiSuggested, setAiSuggested] = useState(false);
  const [similarConfirmed, setSimilarConfirmed] = useState(false);
  const [similar, setSimilar] = useState<Array<{ id: string; title: string | null; caption: string | null; published_at: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), sort: applied.sort });
    for (const key of ["q", "product", "theme", "campaign", "objective", "format", "funnel"] as const) if (applied[key]) params.set(key, applied[key]);
    if (applied.from && applied.to) params.set("period", `${applied.from}:${applied.to}`);
    try {
      const response = await fetch(`/api/content-library?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o acervo.");
      setData(payload); setSelected([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o acervo."); }
    finally { setLoading(false); }
  }, [applied, page]);

  useEffect(() => { void load(); }, [load]);

  const selectedItems = useMemo(() => data.items.filter((item) => selected.includes(item.id)), [data.items, selected]);
  function updateFilter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }
  function search() { setPage(1); setApplied(filters); }
  function clear() { const next = { q: "", product: "", theme: "", campaign: "", objective: "", format: "", funnel: "", from: "", to: "", sort: "recent" }; setFilters(next); setApplied(next); setPage(1); }
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function teach(item: ContentItem) {
    setSelected([item.id]);
    setClassification({ product: item.product_tags?.[0] ?? "", theme: item.theme_tags?.[0] ?? "", campaign: item.campaign_id ?? "", objective: item.objective ?? "", funnel: item.funnel_stage ?? "", format: item.subtype ?? "", reuse_status: item.classification.reuseStatus ?? "", tags: item.classification.tags ?? [] });
    setTagsInput((item.classification.tags ?? []).join(", "));
    setFeedback("Classificação estruturada aberta para este conteúdo.");
    document.getElementById("content-classification")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/content-library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a ação.");
    return payload;
  }

  async function applyClassification() {
    if (!selected.length) return;
    setSaving(true); setFeedback("");
    try {
      const normalized = { ...classification, tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean) };
      await post({ action: "classify", ids: selected, classification: normalized, ai_suggestion_confirmed: aiSuggested, similar_confirmed: similarConfirmed });
      setFeedback(`Classificação aplicada a ${selected.length} conteúdo(s).`); setSimilar([]); setAiSuggested(false); setSimilarConfirmed(false); await load();
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível classificar."); }
    finally { setSaving(false); }
  }

  async function suggest() {
    if (!selected.length) return;
    setSaving(true); setFeedback("");
    try {
      const payload = await post({ action: "suggest", ids: selected });
      const suggestion = payload.suggestion ?? {};
      setClassification({ ...emptyClassification, ...suggestion, tags: Array.isArray(suggestion.tags) ? suggestion.tags : [] });
      setTagsInput(Array.isArray(suggestion.tags) ? suggestion.tags.join(", ") : "");
      setAiSuggested(true);
      setFeedback(`Sugestão da IA pronta para revisão (${Math.round(Number(suggestion.confidence ?? 0) * 100)}% de confiança). Nada foi salvo.`);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "IA indisponível."); }
    finally { setSaving(false); }
  }

  async function findSimilar() {
    if (!selected.length) return;
    setSaving(true); setFeedback("");
    try {
      const payload = await post({ action: "similar", ids: selected });
      setSimilar(payload.similar ?? []);
      setFeedback(payload.similar?.length ? `${payload.similar.length} conteúdo(s) semelhante(s) encontrado(s). Revise antes de adicionar.` : "Nenhum semelhante encontrado com evidência suficiente.");
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível localizar semelhantes."); }
    finally { setSaving(false); }
  }

  function includeSimilar() {
    if (!similar.length || !window.confirm(`Adicionar ${similar.length} conteúdo(s) semelhante(s) à seleção? A classificação só será salva ao clicar em Aplicar.`)) return;
    setSelected((current) => [...new Set([...current, ...similar.map((item) => item.id)])]);
    setSimilarConfirmed(true);
    setSimilar([]); setFeedback("Semelhantes adicionados à seleção. Confirme a classificação antes de aplicar.");
  }

  async function reuse(item: ContentItem, reuseAction: string) {
    setSaving(true); setFeedback("");
    try { await post({ action: "reuse", ids: [item.id], reuse_action: reuseAction }); setFeedback("Contexto de reaproveitamento salvo. Nenhum conteúdo foi gerado."); await load(); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível preparar o reaproveitamento."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <Surface>
        <SectionHeader eyebrow={mode === "validation" ? "Classificação" : "Acervo"} title={mode === "validation" ? "Validação de conteúdo" : "Conteúdos publicados"} description={mode === "validation" ? "Encontre, selecione e classifique vários conteúdos sem abrir um por vez." : "Pesquise o histórico publicado e compare performance real em páginas de 15 itens."} />
        <form onSubmit={(event) => { event.preventDefault(); search(); }} className="mt-5 grid gap-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ds-text-muted)]" />
            <input value={filters.q} onChange={(event) => updateFilter("q", event.target.value)} className="h-12 w-full rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] pl-11 pr-4 text-sm text-[color:var(--ds-text)] outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" placeholder="Buscar legenda, título, hashtag, CTA, produto, tag ou campanha..." />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <SelectFilter label="Produto" value={filters.product} options={data.facets.products} onChange={(value) => updateFilter("product", value)} />
            <SelectFilter label="Tema" value={filters.theme} options={data.facets.themes} onChange={(value) => updateFilter("theme", value)} />
            <SelectFilter label="Campanha" value={filters.campaign} options={data.facets.campaigns} onChange={(value) => updateFilter("campaign", value)} />
            <SelectFilter label="Objetivo" value={filters.objective} options={data.facets.objectives} onChange={(value) => updateFilter("objective", value)} />
            <SelectFilter label="Formato" value={filters.format} options={data.facets.formats} onChange={(value) => updateFilter("format", value)} />
            <SelectFilter label="Funil" value={filters.funnel} options={data.facets.funnels} onChange={(value) => updateFilter("funnel", value)} />
            {mode === "marketing" ? <SelectFilter label="Ordenar" value={filters.sort} options={[{ value: "recent", label: "Mais recente" }, { value: "reach", label: "Alcance" }, { value: "engagement", label: "Engajamento" }, { value: "saves", label: "Salvamentos" }, { value: "shares", label: "Compartilhamentos" }, { value: "comments", label: "Comentários" }]} onChange={(value) => updateFilter("sort", value)} /> : null}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]">De<input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm" /></label>
            <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]">Até<input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm" /></label>
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--ds-primary)] px-5 text-sm font-semibold text-white"><Search className="h-4 w-4" /> Buscar</button>
            <button type="button" onClick={clear} className="h-11 rounded-full border border-[color:var(--ds-border)] px-5 text-sm font-semibold text-[color:var(--ds-text-secondary)]">Limpar</button>
          </div>
        </form>
      </Surface>

      {feedback ? <InsightCard title="Atualização" tone={feedback.includes("Não") || feedback.includes("indisponível") ? "warning" : "info"}>{feedback}</InsightCard> : null}
      {error ? <InsightCard title="Acervo indisponível" tone="danger">{error}</InsightCard> : null}

      {mode === "marketing" && data.highlights.length ? (
        <Surface>
          <SectionHeader eyebrow="Performance real" title="Melhores para reaproveitar" description={data.highlightRule} action={<Archive className="h-5 w-5 text-[color:var(--ds-primary)]" />} />
          <div className="mt-4 grid gap-3 lg:grid-cols-3">{data.highlights.map((item) => <CompactHighlight key={item.id} item={item} onReuse={reuse} disabled={saving || !data.canWrite} />)}</div>
        </Surface>
      ) : null}

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-base font-bold text-[color:var(--ds-text)]">{number(data.total)} conteúdo(s)</p><p className="text-sm text-[color:var(--ds-text-secondary)]">Página {data.page} de {data.pages} · 15 por página</p></div>
          {mode === "validation" && data.items.length ? <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ds-text-secondary)]"><input type="checkbox" checked={selected.length === data.items.length} onChange={(event) => setSelected(event.target.checked ? data.items.map((item) => item.id) : [])} /> Selecionar página</label> : <ArrowDownUp className="h-5 w-5 text-[color:var(--ds-text-muted)]" />}
        </div>
        <div className="mt-4 grid gap-3">{loading ? <Loading /> : data.items.map((item) => <ContentRow key={item.id} item={item} mode={mode} selected={selected.includes(item.id)} onToggle={() => toggle(item.id)} onTeach={() => teach(item)} onReuse={reuse} disabled={saving || !data.canWrite} />)}</div>
        {!loading && !data.items.length ? <EmptyState title="Nenhum conteúdo encontrado">Tente remover um filtro ou buscar outro termo.</EmptyState> : null}
        <div className="mt-5 flex items-center justify-between border-t border-[color:var(--ds-border)] pt-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--ds-border)] px-4 text-sm font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((value) => Math.min(data.pages, value + 1))} className="inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--ds-border)] px-4 text-sm font-semibold disabled:opacity-40">Próxima <ChevronRight className="h-4 w-4" /></button>
        </div>
      </Surface>

      {mode === "validation" ? (
        <div id="content-classification">
        <Surface>
          <SectionHeader eyebrow={`${selected.length} selecionado(s)`} title="Classificação estruturada" description="Ensine produto, tema e contexto comercial. Sugestões da IA só entram depois da sua confirmação." action={<BookOpenCheck className="h-5 w-5 text-[color:var(--ds-primary)]" />} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Produto" value={classification.product} onChange={(value) => setClassification((current) => ({ ...current, product: value }))} list="content-products" />
            <Field label="Tema" value={classification.theme} onChange={(value) => setClassification((current) => ({ ...current, theme: value }))} list="content-themes" />
            <ClassificationSelect label="Campanha" value={classification.campaign} options={data.facets.campaigns} onChange={(value) => setClassification((current) => ({ ...current, campaign: value }))} />
            <Field label="Objetivo" value={classification.objective} onChange={(value) => setClassification((current) => ({ ...current, objective: value }))} />
            <Field label="Funil" value={classification.funnel} onChange={(value) => setClassification((current) => ({ ...current, funnel: value }))} />
            <Field label="Formato" value={classification.format} onChange={(value) => setClassification((current) => ({ ...current, format: value }))} />
            <Field label="Status de reaproveitamento" value={classification.reuse_status} onChange={(value) => setClassification((current) => ({ ...current, reuse_status: value }))} />
            <Field label="Tags (separadas por vírgula)" value={tagsInput} onChange={setTagsInput} />
            <datalist id="content-products">{data.facets.products.map((item) => <option key={item} value={item} />)}</datalist>
            <datalist id="content-themes">{data.facets.themes.map((item) => <option key={item} value={item} />)}</datalist>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled={!selected.length || saving} onClick={applyClassification} className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--ds-primary)] px-5 text-sm font-semibold text-white disabled:opacity-40">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aplicar aos selecionados</button>
            <button type="button" disabled={!selected.length || saving} onClick={suggest} className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--ds-border)] px-5 text-sm font-semibold disabled:opacity-40"><Sparkles className="h-4 w-4" /> Sugerir com IA</button>
            <button type="button" disabled={!selected.length || saving} onClick={findSimilar} className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--ds-border)] px-5 text-sm font-semibold disabled:opacity-40"><RefreshCw className="h-4 w-4" /> Encontrar semelhantes</button>
          </div>
          {aiSuggested ? <p className="mt-3 text-xs font-semibold text-[color:var(--ds-warning)]">Sugestão não persistida. Revise todos os campos e clique em Aplicar.</p> : null}
          {similar.length ? <div className="mt-4 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-bg-soft)] p-4"><p className="text-sm font-bold">Semelhantes para revisão</p><div className="mt-2 grid gap-1">{similar.slice(0, 8).map((item) => <p key={item.id} className="text-sm text-[color:var(--ds-text-secondary)]">{date(item.published_at)} · {compact(item.title || item.caption, 90)}</p>)}</div><button type="button" onClick={includeSimilar} className="mt-3 rounded-full bg-[color:var(--ds-info-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--ds-info)]">Adicionar semelhantes à seleção</button></div> : null}
        </Surface>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, list }: { label: string; value: string; onChange: (value: string) => void; list?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]">{label}<input list={list} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm text-[color:var(--ds-text)] outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]" /></label>;
}

function ClassificationSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-semibold text-[color:var(--ds-text-secondary)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-sm text-[color:var(--ds-text)] outline-none focus:ring-2 focus:ring-[color:var(--ds-primary)]"><option value="">Não classificado</option>{value && !options.some((option) => option.value === value) ? <option value={value}>{value}</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Loading() { return <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-[color:var(--ds-text-secondary)]"><LoaderCircle className="h-5 w-5 animate-spin" /> Carregando 15 conteúdos...</div>; }

function ContentRow({ item, mode, selected, onToggle, onTeach, onReuse, disabled }: { item: ContentItem; mode: Mode; selected: boolean; onToggle: () => void; onTeach: () => void; onReuse: (item: ContentItem, action: string) => void; disabled: boolean }) {
  return (
    <article className={`grid gap-4 rounded-[var(--ds-radius-md)] border p-4 shadow-[var(--ds-shadow-sm)] md:grid-cols-[88px_minmax(0,1fr)] ${selected ? "border-[color:var(--ds-primary)] bg-[color:var(--ds-info-soft)]" : "border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)]"}`}>
      <div className="relative flex aspect-square w-[88px] items-center justify-center overflow-hidden rounded-[var(--ds-radius-md)] bg-[color:var(--ds-bg-soft)]" style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{!item.thumbnail ? <ImageIcon className="h-6 w-6 text-[color:var(--ds-text-muted)]" /> : null}{mode === "validation" ? <input aria-label={`Selecionar ${titleFor(item)}`} type="checkbox" checked={selected} onChange={onToggle} className="absolute left-2 top-2 h-5 w-5" /> : null}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-[color:var(--ds-text)]">{compact(titleFor(item), 110)}</p><p className="mt-1 text-xs text-[color:var(--ds-text-muted)]">{date(item.published_at)} · {time(item.published_at)} · {item.subtype || "Formato não informado"}</p></div>{item.permalink ? <a href={item.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--ds-primary)]">Abrir <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div>
        <p className="mt-2 text-sm leading-6 text-[color:var(--ds-text-secondary)]">{compact(item.caption, 180) || "Sem legenda disponível."}</p>
        <div className="mt-3 flex flex-wrap gap-2">{item.product_tags?.map((tag) => <StatusBadge key={`p-${tag}`} tone="info">{tag}</StatusBadge>)}{item.theme_tags?.map((tag) => <StatusBadge key={`t-${tag}`} tone="neutral">{tag}</StatusBadge>)}{item.campaign_name ? <StatusBadge tone="warning">{item.campaign_name}</StatusBadge> : null}{item.funnel_stage ? <StatusBadge tone="neutral">{item.funnel_stage}</StatusBadge> : null}{item.classification.reuseStatus ? <StatusBadge tone="success">{item.classification.reuseStatus}</StatusBadge> : null}</div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"><Mini label="Alcance" value={number(item.metrics.reach)} /><Mini label="Interações" value={number(item.metrics.interactions)} /><Mini label="Salvos" value={number(item.metrics.saves)} /><Mini label="Compart." value={number(item.metrics.shares)} /><Mini label="Comentários" value={number(item.metrics.comments)} /><Mini label="Engajamento" value={percent(item.metrics.engagement)} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{mode === "validation" ? <button type="button" onClick={onTeach} className="inline-flex h-9 items-center gap-2 rounded-full bg-[color:var(--ds-info-soft)] px-4 text-xs font-semibold text-[color:var(--ds-info)]"><Tags className="h-3.5 w-3.5" /> Ensinar à Norwyn</button> : <ReuseMenu item={item} onReuse={onReuse} disabled={disabled} />}</div>
      </div>
    </article>
  );
}

function CompactHighlight({ item, onReuse, disabled }: { item: ContentItem; onReuse: (item: ContentItem, action: string) => void; disabled: boolean }) {
  return <div className="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] p-4"><p className="text-sm font-bold text-[color:var(--ds-text)]">{compact(titleFor(item), 78)}</p><p className="mt-2 text-sm text-[color:var(--ds-text-secondary)]">{number(item.metrics.saves)} salvos · {number(item.metrics.shares)} compartilhamentos · {number(item.metrics.reach)} de alcance</p><div className="mt-3"><ReuseMenu item={item} onReuse={onReuse} disabled={disabled} /></div></div>;
}

function ReuseMenu({ item, onReuse, disabled }: { item: ContentItem; onReuse: (item: ContentItem, action: string) => void; disabled: boolean }) {
  return <select disabled={disabled} defaultValue="" onChange={(event) => { if (event.target.value) onReuse(item, event.target.value); event.target.value = ""; }} className="h-9 rounded-full border border-[color:var(--ds-border)] bg-[color:var(--ds-surface-solid)] px-3 text-xs font-semibold text-[color:var(--ds-text)] disabled:opacity-40"><option value="" disabled>Reaproveitar...</option>{reuseOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>;
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--ds-radius-sm)] bg-[color:var(--ds-bg-soft)] px-3 py-2"><p className="text-[11px] text-[color:var(--ds-text-muted)]">{label}</p><p className="mt-0.5 text-sm font-bold text-[color:var(--ds-text)]">{value}</p></div>; }
