import type { NorwynAdsRow, NorwynCommercialSale } from "@/modules/norwyn/types";
import { extractTrackingFromPayload, pairsFromTrackingString } from "@/modules/norwyn/services/tracking-hardening";

export type AttributionConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type TrackingPayload = {
  raw: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  campaignId: string | null;
  adsetId: string | null;
  adId: string | null;
  fbclid: string | null;
  clickId: string | null;
};

export type AttributionMatch = {
  transactionId: string;
  revenue: number;
  productName: string | null;
  purchasedAt: string | null;
  tracking: TrackingPayload;
  confidence: AttributionConfidence;
  campaignName: string | null;
  campaignId: string | null;
  adName: string | null;
  adId: string | null;
  adsetId: string | null;
  reason: string;
  evidence: string[];
};

export type AttributionCoverage = {
  totalSales: number;
  attributedSales: number;
  unattributedSales: number;
  totalRevenue: number;
  attributedRevenue: number;
  unattributedRevenue: number;
  coveragePercent: number | null;
};

export type AttributionCampaignMetrics = {
  campaignName: string;
  spend: number;
  attributedSales: number;
  attributedRevenue: number;
  cpa: number | null;
  roas: number | null;
  ticket: number | null;
  attributionRate: number | null;
  confidence: AttributionConfidence;
  observed: {
    impressions: number;
    clicks: number;
    leads: number;
  };
};

export type AttributionQualityItem = {
  status: "ok" | "warning" | "critical";
  label: string;
  detail: string;
};

export type AttributionBridgeResult = {
  matches: AttributionMatch[];
  coverage: AttributionCoverage;
  campaigns: AttributionCampaignMetrics[];
  quality: AttributionQualityItem[];
  recommendations: string[];
  trackingFieldsFound: string[];
  trackingFieldsMissing: string[];
  canCompareCreatives: boolean;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateKey(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function saleDate(sale: NorwynCommercialSale) {
  return sale.data_aprovacao ?? sale.data_compra;
}

function isConfirmedSale(sale: NorwynCommercialSale) {
  if (sale.sale_confirmed !== null && sale.sale_confirmed !== undefined) return sale.sale_confirmed === true;
  return sale.grupo_comercial === "confirmed" || ["approved", "complete", "completed", "purchase_completed"].includes(normalize(sale.status_normalizado));
}

function pairsFromSourceSck(value: string | null | undefined) {
  return pairsFromTrackingString(value);
}

function findNestedString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = record[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number") return String(direct);
  }
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      const found = findNestedString(nested, keys);
      if (found) return found;
    }
  }
  return null;
}

export function parseSaleTracking(sale: NorwynCommercialSale): TrackingPayload {
  const extracted = extractTrackingFromPayload(sale.metadata ?? {}, sale.source_sck);
  const source = pairsFromSourceSck(extracted.sourceSck);
  return {
    raw: extracted.sourceSck,
    source: source.s ?? source.utm_source ?? extracted.source ?? null,
    medium: source.m ?? source.utm_medium ?? extracted.medium ?? null,
    campaign: source.c ?? source.utm_campaign ?? extracted.campaign ?? null,
    content: source.co ?? source.utm_content ?? extracted.content ?? null,
    term: source.t ?? source.utm_term ?? extracted.term ?? null,
    campaignId: source.campaign_id ?? source.utm_id ?? extracted.campaignId ?? null,
    adsetId: source.adset_id ?? extracted.adsetId ?? null,
    adId: source.ad_id ?? extracted.adId ?? null,
    fbclid: source.fbclid ?? extracted.fbclid ?? null,
    clickId: source.click_id ?? source.clickid ?? extracted.clickId ?? null,
  };
}

function contentMatchesAd(content: string | null, adName: string | null | undefined) {
  if (!content || !adName) return false;
  const left = normalize(content);
  const right = normalize(adName);
  return left.length > 3 && right.length > 3 && (left.includes(right) || right.includes(left));
}

function bestMatch(sale: NorwynCommercialSale, adsRows: NorwynAdsRow[]): AttributionMatch {
  const tracking = parseSaleTracking(sale);
  const revenue = asNumber(sale.valor_bruto);
  const date = dateKey(saleDate(sale));
  const sameIds = adsRows.filter((row) => {
    const campaignMatches = tracking.campaignId && row.campaign_id && normalize(row.campaign_id) === normalize(tracking.campaignId);
    const adsetMatches = tracking.adsetId && row.adset_id && normalize(row.adset_id) === normalize(tracking.adsetId);
    const adMatches = tracking.adId && row.ad_id && normalize(row.ad_id) === normalize(tracking.adId);
    return Boolean(adMatches || (campaignMatches && adsetMatches) || campaignMatches);
  });
  const sameCampaign = tracking.campaign
    ? adsRows.filter((row) => normalize(row.campanha) === normalize(tracking.campaign))
    : [];
  const sameDay = date ? adsRows.filter((row) => row.data_referencia === date) : [];

  if (sameIds.length) {
    const ad = sameIds.find((row) => tracking.adId && normalize(row.ad_id) === normalize(tracking.adId)) ?? sameIds[0];
    const evidence = [
      tracking.campaignId ? `campaign_id=${tracking.campaignId}` : null,
      tracking.adsetId ? `adset_id=${tracking.adsetId}` : null,
      tracking.adId ? `ad_id=${tracking.adId}` : null,
      ad.campanha ? `Meta campanha=${ad.campanha}` : null,
      ad.anuncio ? `Meta anuncio=${ad.anuncio}` : null,
    ].filter(Boolean) as string[];
    return {
      transactionId: sale.transaction_id ?? sale.id,
      revenue,
      productName: sale.produto_nome,
      purchasedAt: saleDate(sale),
      tracking,
      confidence: tracking.adId || tracking.adsetId ? "HIGH" : "MEDIUM",
      campaignName: ad.campanha,
      campaignId: ad.campaign_id ?? tracking.campaignId,
      adName: ad.anuncio,
      adId: ad.ad_id ?? tracking.adId,
      adsetId: ad.adset_id ?? tracking.adsetId,
      reason: "Match por IDs Meta normalizados entre tracking da venda e Instagram Ads Analytics.",
      evidence,
    };
  }

  if (sameCampaign.length) {
    const ad = sameCampaign.find((row) => contentMatchesAd(tracking.content, row.anuncio)) ?? sameCampaign[0];
    return {
      transactionId: sale.transaction_id ?? sale.id,
      revenue,
      productName: sale.produto_nome,
      purchasedAt: saleDate(sale),
      tracking,
      confidence: "HIGH",
      campaignName: ad.campanha,
      campaignId: ad.campaign_id ?? tracking.campaignId,
      adName: contentMatchesAd(tracking.content, ad.anuncio) ? ad.anuncio : null,
      adId: contentMatchesAd(tracking.content, ad.anuncio) ? (ad.ad_id ?? null) : null,
      adsetId: ad.adset_id ?? null,
      reason: "Match direto por source_sck/UTM de campanha existente no Meta Ads.",
      evidence: [`source_sck.c=${tracking.campaign}`, `Meta campanha=${ad.campanha}`],
    };
  }

  if (tracking.campaign) {
    return {
      transactionId: sale.transaction_id ?? sale.id,
      revenue,
      productName: sale.produto_nome,
      purchasedAt: saleDate(sale),
      tracking,
      confidence: "MEDIUM",
      campaignName: tracking.campaign,
      campaignId: tracking.campaignId,
      adName: null,
      adId: tracking.adId,
      adsetId: tracking.adsetId,
      reason: "source_sck informa campanha, mas a linha Meta correspondente nao foi encontrada no recorte carregado.",
      evidence: [`source_sck.c=${tracking.campaign}`],
    };
  }

  if (sameDay.length) {
    return {
      transactionId: sale.transaction_id ?? sale.id,
      revenue,
      productName: sale.produto_nome,
      purchasedAt: saleDate(sale),
      tracking,
      confidence: "LOW",
      campaignName: null,
      campaignId: null,
      adName: null,
      adId: null,
      adsetId: null,
      reason: "Existe campanha Meta no mesmo dia, mas a venda nao possui tracking suficiente. Origem nao confirmada.",
      evidence: [`${sameDay.length} linhas de Ads no dia ${date}`],
    };
  }

  return {
    transactionId: sale.transaction_id ?? sale.id,
    revenue,
    productName: sale.produto_nome,
    purchasedAt: saleDate(sale),
    tracking,
    confidence: "UNKNOWN",
    campaignName: null,
    campaignId: null,
    adName: null,
    adId: null,
    adsetId: null,
    reason: "Sem source_sck/UTM/ID suficiente para atribuir.",
    evidence: [],
  };
}

function mergeConfidence(values: AttributionConfidence[]): AttributionConfidence {
  if (values.includes("HIGH")) return "HIGH";
  if (values.includes("MEDIUM")) return "MEDIUM";
  if (values.includes("LOW")) return "LOW";
  return "UNKNOWN";
}

export function buildAttributionBridge(sales: NorwynCommercialSale[], adsRows: NorwynAdsRow[]): AttributionBridgeResult {
  const confirmedSales = sales.filter(isConfirmedSale);
  const matches = confirmedSales.map((sale) => bestMatch(sale, adsRows));
  const attributed = matches.filter((match) => match.confidence === "HIGH" || match.confidence === "MEDIUM");
  const totalRevenue = matches.reduce((sum, match) => sum + match.revenue, 0);
  const attributedRevenue = attributed.reduce((sum, match) => sum + match.revenue, 0);
  const campaignsMap = new Map<string, AttributionCampaignMetrics>();

  for (const row of adsRows) {
    const name = row.campanha ?? "Campanha sem nome";
    const current = campaignsMap.get(name) ?? {
      campaignName: name,
      spend: 0,
      attributedSales: 0,
      attributedRevenue: 0,
      cpa: null,
      roas: null,
      ticket: null,
      attributionRate: null,
      confidence: "UNKNOWN" as AttributionConfidence,
      observed: { impressions: 0, clicks: 0, leads: 0 },
    };
    current.spend += asNumber(row.valor_gasto);
    current.observed.impressions += asNumber(row.impressoes);
    current.observed.clicks += asNumber(row.cliques);
    current.observed.leads += asNumber(row.leads);
    campaignsMap.set(name, current);
  }

  for (const [name, current] of campaignsMap) {
    const campaignMatches = attributed.filter((match) => match.campaignName === name);
    current.attributedSales = campaignMatches.length;
    current.attributedRevenue = campaignMatches.reduce((sum, match) => sum + match.revenue, 0);
    current.cpa = current.attributedSales ? current.spend / current.attributedSales : null;
    current.roas = current.spend ? current.attributedRevenue / current.spend : null;
    current.ticket = current.attributedSales ? current.attributedRevenue / current.attributedSales : null;
    current.attributionRate = matches.length ? (current.attributedSales / matches.length) * 100 : null;
    current.confidence = mergeConfidence(campaignMatches.map((match) => match.confidence));
    campaignsMap.set(name, current);
  }

  const coverage: AttributionCoverage = {
    totalSales: matches.length,
    attributedSales: attributed.length,
    unattributedSales: matches.length - attributed.length,
    totalRevenue,
    attributedRevenue,
    unattributedRevenue: totalRevenue - attributedRevenue,
    coveragePercent: matches.length ? (attributed.length / matches.length) * 100 : null,
  };
  const sourceSckCount = confirmedSales.filter((sale) => parseSaleTracking(sale).raw).length;
  const salesWithoutConfirmedOrigin = matches.filter((match) => match.confidence !== "HIGH" && match.confidence !== "MEDIUM").length;
  const trackingFieldsFound = [
    "transaction_id",
    "hotmart_product_id",
    "produto_nome",
    "source_sck",
    "status_normalizado",
    "grupo_comercial",
    "data_compra",
    "data_aprovacao",
    "instagram_ads_daily.campanha",
    "instagram_ads_daily.conjunto",
    "instagram_ads_daily.anuncio",
    "instagram_ads_daily.raw_payload",
    "raw_payload.data.purchase.origin.sck",
    "raw_payload.purchase.tracking.source_sck",
  ];
  const adsRowsWithIds = adsRows.filter((row) => row.campaign_id || row.adset_id || row.ad_id).length;
  const salesWithIds = confirmedSales.filter((sale) => {
    const tracking = parseSaleTracking(sale);
    return tracking.campaignId || tracking.adsetId || tracking.adId;
  }).length;
  const trackingFieldsMissing = [
    salesWithIds ? null : "ad_id/adset_id/campaign_id normalizados em vendas",
    "fbclid normalizado em vendas",
    "click_id normalizado em vendas",
    "landing page event",
    "checkout event",
  ].filter(Boolean) as string[];

  return {
    matches,
    coverage,
    campaigns: [...campaignsMap.values()]
      .filter((item) => item.spend > 0 || item.attributedSales > 0)
      .sort((a, b) => b.attributedRevenue - a.attributedRevenue || b.spend - a.spend),
    quality: [
      { status: adsRows.length ? "ok" : "critical", label: "Meta Ads disponivel", detail: adsRows.length ? `${adsRows.length} linhas de Ads no recorte.` : "Nenhuma linha de Ads no recorte." },
      { status: confirmedSales.length ? "ok" : "critical", label: "Hotmart disponivel", detail: confirmedSales.length ? `${confirmedSales.length} vendas COMPLETED/confirmadas.` : "Sem vendas confirmadas." },
      { status: sourceSckCount === confirmedSales.length ? "ok" : sourceSckCount ? "warning" : "critical", label: "source_sck", detail: `${sourceSckCount} de ${confirmedSales.length} vendas confirmadas possuem source_sck.` },
      { status: salesWithoutConfirmedOrigin ? "warning" : "ok", label: "Vendas sem origem confirmada", detail: salesWithoutConfirmedOrigin ? `${salesWithoutConfirmedOrigin} venda(s) confirmada(s) sem origem HIGH/MEDIUM no recorte.` : "Todas as vendas confirmadas do recorte possuem origem HIGH/MEDIUM." },
      {
        status: adsRowsWithIds && salesWithIds ? "ok" : adsRowsWithIds ? "warning" : "critical",
        label: "IDs Meta",
        detail: adsRowsWithIds
          ? `${adsRowsWithIds} linhas de Ads possuem IDs normalizados ou extraidos do raw_payload; ${salesWithIds} vendas possuem IDs no tracking.`
          : "campaign_id/adset_id/ad_id ainda nao estao disponiveis no recorte de Ads.",
      },
    ],
    recommendations: [
      "Padronizar UTMs: source, medium, campaign, content e term em todos os links.",
      "Preservar source_sck/UTMs da landing ate o checkout Hotmart.",
      "Salvar campaign_id, adset_id, ad_id e click_id em campos normalizados.",
      "Verificar redirects e parametros perdidos entre anuncio, landing e checkout.",
      "Validar se o webhook Hotmart recebe e persiste tracking completo.",
    ],
    trackingFieldsFound,
    trackingFieldsMissing,
    canCompareCreatives: coverage.coveragePercent !== null && coverage.coveragePercent >= 60 && attributed.some((match) => match.adName),
  };
}
