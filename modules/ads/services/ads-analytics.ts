import type { AdsDailyRow } from "@/modules/ads/types";

type JsonRecord = Record<string, unknown>;

export type AdsAnalyticsRow = AdsDailyRow & {
  raw_payload?: JsonRecord | null;
};

const leadActions = new Set([
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "omni_lead",
]);

const purchaseActions = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
]);

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

function actionValue(payload: JsonRecord, keys: Set<string>) {
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  return actions.reduce((sum, action) => {
    const record = asRecord(action);
    const key = String(record.action_type ?? "").toLowerCase();
    return keys.has(key) ? sum + asNumber(record.value) : sum;
  }, 0);
}

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
  const linkClicks = asNumber(row.link_clicks) || actionValue(payload, new Set(["link_click"]));
  const landingPageViews =
    asNumber(row.landing_page_views) || actionValue(payload, new Set(["landing_page_view", "omni_landing_page_view"]));
  const initiateCheckouts =
    asNumber(row.initiate_checkouts) ||
    actionValue(
      payload,
      new Set([
        "initiate_checkout",
        "offsite_conversion.fb_pixel_initiate_checkout",
        "omni_initiated_checkout",
        "onsite_web_initiate_checkout",
      ]),
    );
  const metaPurchases = asNumber(row.meta_purchases) || actionValue(payload, purchaseActions);
  const leads = asNumber(row.leads) || actionValue(payload, leadActions);

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
    creative_id: firstValue(row, payload, ["creative_id"]),
    creative_name: firstValue(row, payload, ["creative_name"]),
    placement: firstValue(row, payload, ["placement"]),
    publisher_platform: firstValue(row, payload, ["publisher_platform"]),
    device_platform: firstValue(row, payload, ["device_platform"]),
    link_clicks: linkClicks,
    landing_page_views: landingPageViews,
    initiate_checkouts: initiateCheckouts,
    meta_purchases: metaPurchases,
    meta_purchase_value: asNumber(row.meta_purchase_value),
    cost_per_result: row.cost_per_result === null || row.cost_per_result === undefined ? null : asNumber(row.cost_per_result),
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
  "landing_page_views",
  "initiate_checkouts",
  "meta_purchases",
  "meta_purchase_value",
  "cost_per_result",
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
].join(", ");
