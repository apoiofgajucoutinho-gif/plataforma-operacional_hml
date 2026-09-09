export type TrackingConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type NorwynTrackingParams = {
  raw: string | null;
  sourceSck: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  campaignId: string | null;
  adsetId: string | null;
  adId: string | null;
  fbclid: string | null;
  gclid: string | null;
  clickId: string | null;
  landingUrl: string | null;
  checkoutUrl: string | null;
  trackingSource: string;
  trackingConfidence: TrackingConfidence;
};

export type TrackingUrlInput = {
  landingPage: string;
  productKey?: string | null;
  campaignKey: string;
  adsetKey?: string | null;
  creativeKey?: string | null;
  audienceKey?: string | null;
  source?: string | null;
  medium?: string | null;
  campaignId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
};

const EMPTY_TRACKING: NorwynTrackingParams = {
  raw: null,
  sourceSck: null,
  source: null,
  medium: null,
  campaign: null,
  content: null,
  term: null,
  campaignId: null,
  adsetId: null,
  adId: null,
  fbclid: null,
  gclid: null,
  clickId: null,
  landingUrl: null,
  checkoutUrl: null,
  trackingSource: "missing",
  trackingConfidence: "UNKNOWN",
};

const fieldAliases: Record<string, string[]> = {
  sourceSck: ["source_sck", "sck"],
  source: ["utm_source", "source", "src", "s"],
  medium: ["utm_medium", "medium", "m"],
  campaign: ["utm_campaign", "campaign", "campaign_name", "c"],
  content: ["utm_content", "content", "creative", "creative_name", "co"],
  term: ["utm_term", "term", "placement", "t"],
  campaignId: ["campaign_id", "utm_id"],
  adsetId: ["adset_id", "ad_set_id"],
  adId: ["ad_id", "vid"],
  fbclid: ["fbclid"],
  gclid: ["gclid"],
  clickId: ["click_id", "clickid"],
  landingUrl: ["landing_url", "url"],
  checkoutUrl: ["checkout_url", "checkout"],
};

function cleanString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function pairsFromTrackingString(value: string | null | undefined) {
  const raw = cleanString(value);
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const part of raw.split("|")) {
    const [key, ...rest] = part.split("=");
    if (!key || !rest.length) continue;
    result[key.trim()] = rest.join("=").trim();
  }
  return result;
}

function findNested(value: unknown, keys: string[], path = ""): { value: string; path: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const direct = cleanString(record[key]);
    if (direct) return { value: direct, path: path ? `${path}.${key}` : key };
  }
  for (const [key, nested] of Object.entries(record)) {
    if (!nested || typeof nested !== "object") continue;
    const found = findNested(nested, keys, path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return null;
}

function parseJsonObject(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function readPair(pairs: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = cleanString(pairs[alias]);
    if (value) return value;
  }
  return null;
}

export function extractTrackingFromPayload(payload: unknown, fallbackSourceSck?: string | null): NorwynTrackingParams {
  const foundSck = findNested(payload, fieldAliases.sourceSck);
  const fallbackSck = cleanString(fallbackSourceSck);
  const directSck = fallbackSck ?? foundSck?.value ?? null;
  const directPairs = pairsFromTrackingString(directSck);
  const origin = findNested(payload, ["origin"])?.value ?? null;
  const originObject = parseJsonObject(origin);
  const originSck = cleanString((originObject as Record<string, unknown> | null)?.sck);
  const xcodObject = parseJsonObject(cleanString((originObject as Record<string, unknown> | null)?.xcod) ?? findNested(payload, ["xcod"])?.value ?? null);
  const sourceSck = directSck ?? originSck;
  const source = fallbackSck ? "comercial_vendas.source_sck" : foundSck?.path ?? (originSck ? "raw_payload.data.purchase.origin.sck" : "missing");
  const pairs = { ...pairsFromTrackingString(originSck), ...directPairs };
  const nestedSources = [payload, originObject, xcodObject];

  const read = (key: keyof typeof fieldAliases) => {
    const fromPair = readPair(pairs, fieldAliases[key]);
    if (fromPair) return fromPair;
    for (const nested of nestedSources) {
      const found = findNested(nested, fieldAliases[key]);
      if (found) return found.value;
    }
    return null;
  };

  const campaign = read("campaign");
  const content = read("content");
  const campaignId = read("campaignId");
  const adId = read("adId");
  const trackingConfidence: TrackingConfidence = campaign && (campaignId || content || adId) ? "HIGH" : campaign ? "MEDIUM" : sourceSck ? "LOW" : "UNKNOWN";

  return {
    ...EMPTY_TRACKING,
    raw: sourceSck,
    sourceSck,
    source: read("source"),
    medium: read("medium"),
    campaign,
    content,
    term: read("term"),
    campaignId,
    adsetId: read("adsetId"),
    adId,
    fbclid: read("fbclid"),
    gclid: read("gclid"),
    clickId: read("clickId"),
    landingUrl: read("landingUrl"),
    checkoutUrl: read("checkoutUrl"),
    trackingSource: source,
    trackingConfidence,
  };
}

export function normalizeTrackingKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

export function buildNorwynTrackingUrl(input: TrackingUrlInput) {
  const url = new URL(input.landingPage);
  const source = input.source || "meta";
  const medium = input.medium || "paid_social";
  const campaignKey = normalizeTrackingKey(input.campaignKey);
  const creativeKey = normalizeTrackingKey(input.creativeKey || input.adId || "creative");
  const audienceKey = normalizeTrackingKey(input.audienceKey || input.adsetKey || "audience");
  const sck = [
    `s=${source}`,
    `c=${campaignKey}`,
    `m=${medium}`,
    `co=${creativeKey}`,
    `t=${audienceKey}`,
    input.campaignId ? `utm_id=${input.campaignId}` : null,
    input.adsetId ? `adset_id=${input.adsetId}` : null,
    input.adId ? `ad_id=${input.adId}` : null,
  ].filter(Boolean).join("|");

  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaignKey);
  url.searchParams.set("utm_content", creativeKey);
  url.searchParams.set("utm_term", audienceKey);
  url.searchParams.set("source_sck", sck);
  url.searchParams.set("sck", sck);
  if (input.productKey) url.searchParams.set("product_key", normalizeTrackingKey(input.productKey));
  if (input.campaignId) url.searchParams.set("campaign_id", input.campaignId);
  if (input.adsetId) url.searchParams.set("adset_id", input.adsetId);
  if (input.adId) url.searchParams.set("ad_id", input.adId);
  return url.toString();
}

export function validateTrackingUrl(value: string, requireAttribution = true) {
  const issues: Array<{ severity: "warning" | "critical"; title: string; detail: string }> = [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return [{ severity: "critical" as const, title: "URL invalida", detail: "Nao foi possivel interpretar a URL final." }];
  }
  const required = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "sck"];
  for (const key of required) {
    if (!url.searchParams.get(key) && !(key === "sck" && url.searchParams.get("source_sck"))) {
      issues.push({ severity: requireAttribution ? "critical" : "warning", title: `Parametro ausente: ${key}`, detail: "Campanhas rastreaveis precisam preservar UTMs e sck ate o checkout." });
    }
  }
  if (!normalizeTrackingKey(url.searchParams.get("utm_campaign")).length) {
    issues.push({ severity: "critical", title: "campaign_key invalida", detail: "utm_campaign precisa gerar uma chave operacional estavel." });
  }
  if (!normalizeTrackingKey(url.searchParams.get("utm_content")).length) {
    issues.push({ severity: "critical", title: "creative_key invalida", detail: "utm_content precisa identificar criativo ou variacao." });
  }
  return issues;
}
