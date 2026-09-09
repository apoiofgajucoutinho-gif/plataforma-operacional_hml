import type { NorwynAdsRow, NorwynCampaign, NorwynCommercialSale, NorwynContext, NorwynLandingRegistry, NorwynProduct } from "@/modules/norwyn/types";
import { listCanonicalProductOptions, matchProductToSale } from "@/modules/norwyn/services/product-identity";

export type GrowthPeriodPreset = "today" | "last_7_days" | "last_30_days" | "campaign_full" | "custom";

export type GrowthContextSelection = {
  productId?: string | null;
  campaignKey?: string | null;
  periodPreset?: GrowthPeriodPreset;
  start?: string | null;
  end?: string | null;
};

export type GrowthResolvedCampaign = {
  key: string;
  label: string;
  source: "campaigns" | "ads" | "landing_registry";
  campaign: NorwynCampaign | null;
};

export type GrowthProductOption = {
  id: string;
  label: string;
  source: "products" | "hotmart" | "landing_registry";
  product: NorwynProduct | null;
  hotmartProductId: string | null;
  evidence: string;
};

export type GrowthResolvedContext = {
  tenant: NorwynContext["tenant"];
  product: NorwynProduct | null;
  productLabel: string | null;
  productOptionId: string | null;
  hotmartProductId: string | null;
  campaign: NorwynCampaign | null;
  campaignKey: string | null;
  campaignLabel: string;
  period: { preset: GrowthPeriodPreset; start: string; end: string };
  relatedProducts: Array<{ product: NorwynProduct; relationship: "PRIMARY" | "RELATED_ONLY"; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"; evidence: string }>;
  metaCampaigns: Array<{ key: string; label: string; rows: number; spend: number; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"; evidence: string }>;
  landings: NorwynLandingRegistry[];
  hotmartProducts: Array<{ hotmartProductId: string; productName: string; sales: number; revenue: number; relationship: "PRIMARY" | "RELATED_ONLY"; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"; evidence: string }>;
  dataAvailability: Array<{ source: string; state: "REAL DATA" | "ZERO" | "NO DATA" | "NOT INSTRUMENTED" | "STALE" | "ERROR" | "NOT APPLICABLE"; detail: string; lastUpdatedAt: string | null }>;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function dateKey(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? dateFormatter.format(new Date()) : dateFormatter.format(date);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function productTokens(product: NorwynProduct | null) {
  if (!product) return [];
  return [
    product.nome_oficial,
    product.produto_base,
    ...(product.product_aliases ?? []).map((alias) => alias.alias),
    ...(product.product_components ?? []).map((component) => component.componente),
  ].map(normalize).filter((item) => item.length > 2);
}

function textMatchesProduct(value: string | null | undefined, product: NorwynProduct | null) {
  if (!product) return false;
  const haystack = normalize(value);
  return productTokens(product).some((token) => haystack.includes(token) || token.split(/\s+/).filter((part) => part.length > 5).some((part) => haystack.includes(part)));
}

function saleDate(sale: NorwynCommercialSale) {
  return sale.data_aprovacao ?? sale.data_compra;
}

function isConfirmedSale(sale: NorwynCommercialSale) {
  if (sale.sale_confirmed !== null && sale.sale_confirmed !== undefined) return sale.sale_confirmed === true;
  return sale.grupo_comercial === "confirmed" || ["approved", "complete", "completed", "purchase_completed"].includes(normalize(sale.status_normalizado));
}

function saleMatchesProduct(sale: NorwynCommercialSale, product: NorwynProduct | null) {
  if (!product) return false;
  if (sale.produto_id && sale.produto_id === product.id) return true;
  return matchProductToSale(product, sale) || textMatchesProduct(`${sale.produto_nome ?? ""} ${sale.hotmart_product_id ?? ""}`, product);
}

function campaignKeyFor(campaign: NorwynCampaign) {
  return campaign.id || campaign.name;
}

export function listGrowthProductOptions(context: NorwynContext): GrowthProductOption[] {
  return listCanonicalProductOptions({
    products: context.products,
    sales: context.commercialSales,
    landings: context.landingRegistry,
  }).map((option) => ({
    id: option.id,
    label: option.label,
    source: option.source === "comercial_produtos" ? "hotmart" : option.source,
    product: option.productId ? context.products.find((product) => product.id === option.productId) ?? null : null,
    hotmartProductId: option.hotmartProductId,
    evidence: option.evidence,
  }));
}

function resolveProductOption(context: NorwynContext, selection: GrowthContextSelection): GrowthProductOption | null {
  if (!selection.productId) return null;
  return listGrowthProductOptions(context).find((item) => item.id === selection.productId) ?? null;
}

export function listGrowthCampaignOptions(context: NorwynContext, product: NorwynProduct | null, hotmartProductId: string | null = null): GrowthResolvedCampaign[] {
  const options = new Map<string, GrowthResolvedCampaign>();
  for (const campaign of context.campaigns) {
    if (product && campaign.product_id && campaign.product_id !== product.id) continue;
    if (product && !campaign.product_id && !textMatchesProduct(campaign.name, product)) continue;
    if (!product && hotmartProductId && !context.landingRegistry.some((landing) => landing.hotmart_product_id === hotmartProductId && landing.campaign_key === campaignKeyFor(campaign))) continue;
    const key = campaignKeyFor(campaign);
    options.set(key, { key, label: campaign.name, source: "campaigns", campaign });
  }
  for (const landing of context.landingRegistry) {
    if (hotmartProductId && landing.hotmart_product_id !== hotmartProductId) continue;
    if (product && landing.product_id && landing.product_id !== product.id) continue;
    if (product && !landing.product_id && !textMatchesProduct(`${landing.landing_name} ${landing.url} ${landing.hotmart_product_id ?? ""}`, product)) continue;
    if (!options.has(landing.campaign_key)) options.set(landing.campaign_key, { key: landing.campaign_key, label: landing.campaign_key, source: "landing_registry", campaign: null });
  }
  for (const row of context.adsRows) {
    if (hotmartProductId) continue;
    if (product && !textMatchesProduct(`${row.campanha ?? ""} ${row.conjunto ?? ""} ${row.anuncio ?? ""}`, product)) continue;
    const key = row.campanha || row.campaign_id || "ads_campaign_unknown";
    if (!options.has(key)) options.set(key, { key, label: key, source: "ads", campaign: null });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function resolvePeriod(selection: GrowthContextSelection, campaign: NorwynCampaign | null) {
  const preset = selection.periodPreset ?? "last_30_days";
  if (preset === "today") return { preset, start: dateKey(new Date()), end: dateKey(new Date()) };
  if (preset === "last_7_days") return { preset, start: dateKey(daysAgo(6)), end: dateKey(new Date()) };
  if (preset === "campaign_full" && campaign?.starts_at && campaign?.ends_at) return { preset, start: dateKey(campaign.starts_at), end: dateKey(campaign.ends_at) };
  if (preset === "custom" && selection.start && selection.end) return { preset, start: selection.start, end: selection.end };
  return { preset: "last_30_days" as const, start: dateKey(daysAgo(29)), end: dateKey(new Date()) };
}

function inPeriod(value: string | null | undefined, start: string, end: string) {
  const key = dateKey(value);
  return key >= start && key <= end;
}

export function resolveGrowthContext(context: NorwynContext, selection: GrowthContextSelection = {}): GrowthResolvedContext {
  const productOption = resolveProductOption(context, selection);
  const product = productOption?.product ?? null;
  const selectedHotmartProductId = productOption?.hotmartProductId ?? null;
  const campaignOptions = listGrowthCampaignOptions(context, product, selectedHotmartProductId);
  const selectedCampaignOption = selection.campaignKey
    ? campaignOptions.find((item) => item.key === selection.campaignKey || item.label === selection.campaignKey) ?? null
    : null;
  const campaign = selectedCampaignOption?.campaign ?? null;
  const campaignKey = selectedCampaignOption?.key ?? null;
  const period = resolvePeriod(selection, campaign);
  const landings = context.landingRegistry.filter((landing) => {
    if (landing.status && !["active", "monitored", "ACTIVE", "MONITORED"].includes(landing.status)) return false;
    if (campaignKey && landing.campaign_key !== campaignKey) return false;
    if (!campaignKey && selectedHotmartProductId && landing.hotmart_product_id !== selectedHotmartProductId) return false;
    if (!campaignKey && product?.id && landing.product_id !== product.id) return false;
    return true;
  });
  const campaignLabel = selectedCampaignOption?.label ?? "NO CAMPAIGN SELECTED";

  const relatedSales = context.commercialSales.filter((sale) => selectedHotmartProductId ? sale.hotmart_product_id === selectedHotmartProductId : saleMatchesProduct(sale, product));
  const hotmartById = new Map<string, { hotmartProductId: string; productName: string; sales: number; revenue: number }>();
  for (const sale of relatedSales) {
    const id = sale.hotmart_product_id ?? "UNKNOWN";
    const current = hotmartById.get(id) ?? { hotmartProductId: id, productName: sale.produto_nome ?? "Produto sem nome", sales: 0, revenue: 0 };
    if (isConfirmedSale(sale)) {
      current.sales += 1;
      current.revenue += Number(sale.valor_bruto ?? 0);
    }
    hotmartById.set(id, current);
  }
  const periodAds = context.adsRows.filter((row) => inPeriod(row.data_referencia, period.start, period.end));
  const landingCampaignKeys = new Set(landings.map((landing) => landing.campaign_key));
  const metaRows = campaignKey
    ? periodAds.filter((row) => row.campanha === campaignKey || row.campaign_id === campaignKey || row.campanha === campaignLabel)
    : product
      ? periodAds.filter((row) => textMatchesProduct(`${row.campanha} ${row.anuncio} ${row.conjunto}`, product))
      : selectedHotmartProductId
        ? periodAds.filter((row) => landingCampaignKeys.has(String(row.campanha ?? "")) || landingCampaignKeys.has(String(row.campaign_id ?? "")))
        : [];
  const metaCampaigns = [...new Map(metaRows.map((row) => [row.campanha ?? row.campaign_id ?? "UNKNOWN", row])).keys()].map((key) => {
    const rows = metaRows.filter((row) => (row.campanha ?? row.campaign_id ?? "UNKNOWN") === key);
    return { key, label: key, rows: rows.length, spend: rows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0), confidence: "HIGH" as const, evidence: "Linha encontrada em instagram_ads_daily no periodo/contexto." };
  });
  const periodSales = relatedSales.filter((sale) => inPeriod(saleDate(sale), period.start, period.end));
  return {
    tenant: context.tenant,
    product,
    productLabel: productOption?.label ?? product?.nome_oficial ?? null,
    productOptionId: productOption?.id ?? product?.id ?? null,
    hotmartProductId: selectedHotmartProductId,
    campaign,
    campaignKey,
    campaignLabel,
    period,
    relatedProducts: product ? [{ product, relationship: "PRIMARY", confidence: "HIGH", evidence: "Produto selecionado no Growth Context." }] : [],
    metaCampaigns,
    landings,
    hotmartProducts: [...hotmartById.values()].map((item) => ({ ...item, relationship: "PRIMARY", confidence: "MEDIUM", evidence: "Descoberto por vendas Hotmart cujo nome/id combina com produto selecionado." })),
    dataAvailability: [
      { source: "META ADS", state: metaRows.length ? "REAL DATA" : "NO DATA", detail: metaRows.length ? `${metaRows.length} linhas no contexto.` : "Nenhuma linha Meta relacionada ao contexto.", lastUpdatedAt: context.adsRows.map((row) => row.imported_at ?? row.data_referencia).filter(Boolean).sort().at(-1) ?? null },
      { source: "HOTMART", state: periodSales.length ? "REAL DATA" : "NO DATA", detail: periodSales.length ? `${periodSales.length} transacoes no contexto.` : "Nenhuma transacao Hotmart relacionada ao contexto/periodo.", lastUpdatedAt: context.commercialSales.map((sale) => sale.imported_at ?? sale.last_event_at ?? sale.data_compra).filter(Boolean).sort().at(-1) ?? null },
      { source: "LANDINGS", state: landings.length ? "REAL DATA" : "NO DATA", detail: landings.length ? `${landings.length} landing(s) registrada(s).` : "NO LANDING REGISTERED.", lastUpdatedAt: landings.map((landing) => landing.last_checked_at ?? landing.updated_at).filter(Boolean).sort().at(-1) ?? null },
      { source: "FUNNEL EVENTS", state: context.funnelEvents.length ? "REAL DATA" : "NOT INSTRUMENTED", detail: context.funnelEvents.length ? "Eventos Norwyn carregados; filtragem ocorre no engine." : "Nenhum evento de funil carregado.", lastUpdatedAt: context.funnelEvents.map((event) => event.created_at ?? event.occurred_at).filter(Boolean).sort().at(-1) ?? null },
    ],
  };
}
