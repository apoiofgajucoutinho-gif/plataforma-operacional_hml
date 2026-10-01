import type { AdsDailyRow } from "@/modules/ads/types";

type JsonRecord = Record<string, unknown>;

export type AdsAnalyticsRow = AdsDailyRow & {
  raw_payload?: JsonRecord | null;
};

const leadActionPriority = [
  "offsite_conversion.fb_pixel_lead",
  "lead",
  "omni_lead",
  "onsite_conversion.lead_grouped",
] as const;

const purchaseActionPriority = [
  "offsite_conversion.fb_pixel_purchase",
  "purchase",
  "omni_purchase",
  "onsite_web_purchase",
  "onsite_conversion.purchase",
] as const;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedOrCanonical(row: JsonRecord, key: string, payload: JsonRecord, priority: readonly string[]) {
  const normalized = nullableNumber(row[key]);
  return normalized ?? canonicalActionValue(payload, priority).value;
}

export type CanonicalActionMetric = {
  value: number;
  actionType: string | null;
  available: boolean;
};

/** Meta commonly returns equivalent attribution aliases with the same value. Pick one
 * documented source by priority instead of adding aliases together. */
export function canonicalActionValue(payload: JsonRecord, priority: readonly string[]): CanonicalActionMetric {
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  for (const actionType of priority) {
    const match = actions.find((action) => String(asRecord(action).action_type ?? "").toLowerCase() === actionType);
    if (match) return { value: asNumber(asRecord(match).value), actionType, available: true };
  }
  return { value: 0, actionType: null, available: false };
}

export const canonicalMetaActions = {
  linkClicks: ["link_click"],
  landingPageViews: ["landing_page_view", "omni_landing_page_view"],
  initiateCheckouts: [
    "offsite_conversion.fb_pixel_initiate_checkout",
    "initiate_checkout",
    "omni_initiated_checkout",
    "onsite_web_initiate_checkout",
  ],
  purchases: [
    "offsite_conversion.fb_pixel_purchase",
    "purchase",
    "omni_purchase",
    "onsite_web_purchase",
    "onsite_conversion.purchase",
  ],
} as const;

function firstValue(row: JsonRecord, payload: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const fromRow = asString(row[key]);
    if (fromRow) return fromRow;
    const fromPayload = asString(payload[key]);
    if (fromPayload) return fromPayload;
  }
  return null;
}

export function normalizeAdsDailyRow(row: JsonRecord): AdsAnalyticsRow {
  const payload = asRecord(row.raw_payload);
  const linkClicks = normalizedOrCanonical(row, "link_clicks", payload, canonicalMetaActions.linkClicks);
  const landingPageViews = normalizedOrCanonical(row, "landing_page_views", payload, canonicalMetaActions.landingPageViews);
  const initiateCheckouts = normalizedOrCanonical(row, "initiate_checkouts", payload, canonicalMetaActions.initiateCheckouts);
  const metaPurchases = normalizedOrCanonical(row, "meta_purchases", payload, purchaseActionPriority);
  const leads = normalizedOrCanonical(row, "leads", payload, leadActionPriority);

  return {
    id: String(row.id ?? ""),
    data_referencia: String(row.data_referencia ?? payload.date_start ?? ""),
    campanha: String(row.campanha ?? payload.campaign_name ?? ""),
    conjunto: asString(row.conjunto) ?? asString(payload.adset_name),
    anuncio: String(row.anuncio ?? payload.ad_name ?? ""),
    status: String(row.status ?? payload.effective_status ?? "UNKNOWN"),
    objetivo: asString(row.objetivo) ?? asString(payload.objective),
    alcance: asNumber(row.alcance ?? payload.reach),
    impressoes: asNumber(row.impressoes ?? payload.impressions),
    cliques: asNumber(row.cliques ?? payload.clicks),
    ctr: asNumber(row.ctr ?? payload.ctr),
    cpc: asNumber(row.cpc ?? payload.cpc),
    cpm: asNumber(row.cpm ?? payload.cpm),
    frequencia: asNumber(row.frequencia ?? payload.frequency),
    valor_gasto: asNumber(row.valor_gasto ?? payload.spend),
    conversoes: asNumber(row.conversoes) || metaPurchases,
    leads,
    performance_status: String(row.performance_status ?? "UNKNOWN") as AdsDailyRow["performance_status"],
    performance_score: asNumber(row.performance_score),
    imported_at: String(row.imported_at ?? ""),
    raw_payload: payload,
    campaign_id: firstValue(row, payload, ["campaign_id"]),
    adset_id: firstValue(row, payload, ["adset_id"]),
    ad_id: firstValue(row, payload, ["ad_id"]),
    effective_status: firstValue(row, payload, ["effective_status", "status"]),
    creative_id: firstValue(row, payload, ["creative_id"]),
    creative_name: firstValue(row, payload, ["creative_name"]),
    placement: firstValue(row, payload, ["placement"]),
    publisher_platform: firstValue(row, payload, ["publisher_platform"]),
    device_platform: firstValue(row, payload, ["device_platform"]),
    link_clicks: linkClicks,
    unique_link_clicks: nullableNumber(row.unique_link_clicks),
    unique_link_ctr: nullableNumber(row.unique_link_ctr),
    cost_per_unique_link_click: nullableNumber(row.cost_per_unique_link_click),
    unique_clicks: nullableNumber(row.unique_clicks),
    outbound_clicks: nullableNumber(row.outbound_clicks),
    unique_outbound_clicks: nullableNumber(row.unique_outbound_clicks),
    unique_ctr: nullableNumber(row.unique_ctr),
    cost_per_unique_click: nullableNumber(row.cost_per_unique_click),
    landing_page_views: landingPageViews,
    cost_per_landing_page_view: nullableNumber(row.cost_per_landing_page_view),
    initiate_checkouts: initiateCheckouts,
    cost_per_checkout: nullableNumber(row.cost_per_checkout),
    meta_purchases: metaPurchases,
    meta_purchase_value: nullableNumber(row.meta_purchase_value),
    meta_purchase_roas: nullableNumber(row.meta_purchase_roas),
    cost_per_result: row.cost_per_result === null || row.cost_per_result === undefined ? null : asNumber(row.cost_per_result),
    quality_ranking: firstValue(row, payload, ["quality_ranking"]),
    engagement_rate_ranking: firstValue(row, payload, ["engagement_rate_ranking"]),
    conversion_rate_ranking: firstValue(row, payload, ["conversion_rate_ranking"]),
    video_views: asNumber(row.video_views),
    video_plays_3s: asNumber(row.video_plays_3s),
    video_p25: asNumber(row.video_p25),
    video_p50: asNumber(row.video_p50),
    video_p75: asNumber(row.video_p75),
    video_p95: asNumber(row.video_p95),
    video_p100: asNumber(row.video_p100),
    thruplays: asNumber(row.thruplays),
    preview_url: firstValue(row, payload, ["preview_url"]),
    thumbnail_url: firstValue(row, payload, ["thumbnail_url"]),
    destination_url: firstValue(row, payload, ["destination_url"]),
    destination_domain: firstValue(row, payload, ["destination_domain"]),
    url_tags: firstValue(row, payload, ["url_tags"]),
    landing_key: firstValue(row, payload, ["landing_key"]),
    audience_type: firstValue(row, payload, ["audience_type"]),
    audience_label: firstValue(row, payload, ["audience_label"]),
    targeting_summary: firstValue(row, payload, ["targeting_summary"]),
    audience_confidence: firstValue(row, payload, ["audience_confidence"]),
    audience_evidence: Array.isArray(row.audience_evidence) ? row.audience_evidence : null,
    creative_format: firstValue(row, payload, ["creative_format"]),
    creative_body: firstValue(row, payload, ["creative_body"]),
    creative_headline: firstValue(row, payload, ["creative_headline"]),
    creative_description: firstValue(row, payload, ["creative_description"]),
    creative_cta: firstValue(row, payload, ["creative_cta"]),
    creative_image_url: firstValue(row, payload, ["creative_image_url"]),
    creative_video_id: firstValue(row, payload, ["creative_video_id"]),
    creative_video_duration_seconds: nullableNumber(row.creative_video_duration_seconds),
    object_story_id: firstValue(row, payload, ["object_story_id"]),
    instagram_permalink_url: firstValue(row, payload, ["instagram_permalink_url"]),
    config_snapshot_hash: firstValue(row, payload, ["config_snapshot_hash"]),
    origem: firstValue(row, payload, ["origem"]),
  };
}

export const adsAnalyticsSelect = [
  "id",
  "data_referencia",
  "campanha",
  "conjunto",
  "anuncio",
  "status",
  "objetivo",
  "alcance",
  "impressoes",
  "cliques",
  "ctr",
  "cpc",
  "cpm",
  "frequencia",
  "valor_gasto",
  "conversoes",
  "leads",
  "performance_status",
  "performance_score",
  "imported_at",
  "raw_payload",
  "campaign_id",
  "adset_id",
  "ad_id",
  "creative_id",
  "creative_name",
  "placement",
  "publisher_platform",
  "device_platform",
  "link_clicks",
  "unique_link_clicks",
  "unique_link_ctr",
  "cost_per_unique_link_click",
  "unique_clicks",
  "outbound_clicks",
  "unique_outbound_clicks",
  "unique_ctr",
  "cost_per_unique_click",
  "landing_page_views",
  "cost_per_landing_page_view",
  "initiate_checkouts",
  "cost_per_checkout",
  "meta_purchases",
  "meta_purchase_value",
  "meta_purchase_roas",
  "cost_per_result",
  "quality_ranking",
  "engagement_rate_ranking",
  "conversion_rate_ranking",
  "video_views",
  "video_plays_3s",
  "video_p25",
  "video_p50",
  "video_p75",
  "video_p95",
  "video_p100",
  "thruplays",
  "preview_url",
  "thumbnail_url",
  "destination_url",
  "destination_domain",
  "url_tags",
  "landing_key",
  "audience_type",
  "audience_label",
  "targeting_summary",
  "audience_confidence",
  "audience_evidence",
  "creative_format",
  "creative_body",
  "creative_headline",
  "creative_description",
  "creative_cta",
  "creative_image_url",
  "creative_video_id",
  "creative_video_duration_seconds",
  "object_story_id",
  "instagram_permalink_url",
  "config_snapshot_hash",
  "origem",
].join(", ");
