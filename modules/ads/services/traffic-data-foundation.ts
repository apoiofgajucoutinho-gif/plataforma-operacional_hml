import { canonicalActionValue, canonicalMetaActions } from "@/modules/ads/services/ads-analytics";

export type LinkConfidence = "high" | "medium" | "low" | "unresolved";

type JsonRecord = Record<string, unknown>;

export type TrafficFoundationDailyRow = {
  data_referencia: string;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  creative_id?: string | null;
  creative_name?: string | null;
  campanha: string;
  conjunto?: string | null;
  anuncio: string;
  valor_gasto?: number | null;
  impressoes?: number | null;
  destination_url?: string | null;
  destination_domain?: string | null;
  url_tags?: string | null;
  landing_key?: string | null;
  raw_payload?: JsonRecord | null;
};

export type LandingEvidence = {
  landing_key: string;
  url: string;
  product_id: string | null;
  campaign_key: string | null;
  checkout_url: string | null;
};

const zumbidoHistoricalAds = new Set(["VID_22.06_01", "IMG_22.06_01", "JUL_VID_04", "AD15 | IMG", "AD12 | IMG"]);

function value(row: TrafficFoundationDailyRow, key: keyof typeof canonicalMetaActions) {
  return canonicalActionValue(row.raw_payload ?? {}, canonicalMetaActions[key]).value;
}

function host(url: string | null | undefined) {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

export function resolveLanding(rows: TrafficFoundationDailyRow[], landings: LandingEvidence[]) {
  const explicitKey = rows.find((row) => row.landing_key)?.landing_key ?? null;
  if (explicitKey) {
    const match = landings.find((landing) => landing.landing_key === explicitKey);
    if (match) return { landing: match, confidence: "high" as const, reason: "landing_key explícita no coletor", evidence: explicitKey };
  }
  const destinationHost = rows.map((row) => host(row.destination_url) ?? row.destination_domain?.toLowerCase()).find(Boolean);
  if (destinationHost) {
    const match = landings.find((landing) => host(landing.url) === destinationHost);
    if (match) return { landing: match, confidence: "high" as const, reason: "domínio de destino corresponde ao registro da LP", evidence: destinationHost };
  }
  const names = `${rows[0]?.campanha ?? ""} ${rows[0]?.anuncio ?? ""}`.toLowerCase();
  const semantic = landings.find((landing) => names.includes(landing.landing_key.replaceAll("_", " ")) || (landing.landing_key.includes("zumbido") && names.includes("zumbido")));
  if (semantic) return { landing: semantic, confidence: "medium" as const, reason: "nome da campanha/anúncio coincide com a LP, sem URL coletada", evidence: names };
  return { landing: null, confidence: "unresolved" as const, reason: "sem landing_key, URL destino ou vínculo explícito", evidence: null };
}

export function aggregateTrafficAd(rows: TrafficFoundationDailyRow[]) {
  const first = rows[0];
  const spend = rows.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0);
  const impressions = rows.reduce((sum, row) => sum + Number(row.impressoes ?? 0), 0);
  const linkClicks = rows.reduce((sum, row) => sum + value(row, "linkClicks"), 0);
  const landingPageViews = rows.reduce((sum, row) => sum + value(row, "landingPageViews"), 0);
  const initiateCheckouts = rows.reduce((sum, row) => sum + value(row, "initiateCheckouts"), 0);
  const metaPurchases = rows.reduce((sum, row) => sum + value(row, "purchases"), 0);
  return {
    identity: {
      campaign_id: first?.campaign_id ?? null,
      campaign_name: first?.campanha ?? null,
      adset_id: first?.adset_id ?? null,
      adset_name: first?.conjunto ?? null,
      ad_id: first?.ad_id ?? null,
      ad_name: first?.anuncio ?? null,
      creative_id: first?.creative_id ?? null,
      creative_name: first?.creative_name ?? null,
      historical_reference: zumbidoHistoricalAds.has(first?.anuncio ?? ""),
    },
    period: { start: rows.at(-1)?.data_referencia ?? null, end: first?.data_referencia ?? null },
    metrics: {
      spend,
      impressions,
      link_clicks: linkClicks,
      link_ctr: impressions ? (linkClicks / impressions) * 100 : null,
      link_cpc: linkClicks ? spend / linkClicks : null,
      cpm: impressions ? (spend / impressions) * 1000 : null,
      landing_page_views: landingPageViews,
      initiate_checkouts: initiateCheckouts,
      meta_purchases: metaPurchases,
    },
    quality: {
      action_semantics: "canonical_alias_priority",
      historical_columns_may_be_overcounted: true,
      creative_enrichment: first?.creative_id ? "available" : "missing",
      destination_enrichment: first?.destination_url ? "available" : "missing",
    },
  };
}
