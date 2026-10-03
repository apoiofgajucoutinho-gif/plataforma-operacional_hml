import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDisallowedNorwynLpOrigin, isAllowedNorwynLpOrigin, norwynLpCorsHeaders } from "@/lib/norwyn/lp-cors";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CANONICAL_CHECKOUT = "https://pay.hotmart.com/B47092539B?off=lov69pen";
const DEFAULT_LANDING_KEY = "imersao_zumbido";
const ALLOWED_LANDING_KEYS = new Set([DEFAULT_LANDING_KEY, "imersao-zumbido"]);
type LandingRegistry = {
  tenant_id: string;
  product_id: string | null;
  campaign_key: string | null;
  url: string | null;
  campaign_id: string | null;
  active_meta_campaign_id: string | null;
  meta_campaign_ids: string[];
};
const registryCache = new Map<string, { value: LandingRegistry; expiresAt: number }>();

function headers(request: Request) {
  return {
    "Cache-Control": "no-store",
    ...norwynLpCorsHeaders(request, ["GET", "POST", "OPTIONS"]),
  };
}

function clean(value: unknown, max = 256) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeTouch(value: unknown) {
  const source = record(value);
  return Object.fromEntries([
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "campaign_id", "adset_id", "ad_id", "fbclid", "sck", "source_sck", "src", "entry_source",
  ]
    .map((key) => [key, clean(source[key])]).filter(([, item]) => item));
}

function landingKey(value: unknown) {
  const candidate = clean(value, 120) ?? DEFAULT_LANDING_KEY;
  return ALLOWED_LANDING_KEYS.has(candidate) ? candidate : null;
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item)) : [];
}

function globalEnabled() {
  return ["1", "true", "on", "enabled"].includes(String(process.env.HOTMART_ATTRIBUTION_BRIDGE ?? "").toLowerCase());
}

function canonicalizeCheckout(value: unknown) {
  try {
    const candidate = new URL(clean(value, 2048) ?? CANONICAL_CHECKOUT);
    const canonical = new URL(CANONICAL_CHECKOUT);
    if (candidate.protocol !== "https:" || candidate.hostname !== canonical.hostname || candidate.pathname !== canonical.pathname) return canonical;
    if (candidate.searchParams.get("off") !== "lov69pen") return canonical;
    return candidate;
  } catch {
    return new URL(CANONICAL_CHECKOUT);
  }
}

function attributionKey(tenantId: string, resolvedLandingKey: string, sessionId: string) {
  const digest = createHash("sha256").update(`${tenantId}|${resolvedLandingKey}|${sessionId}`).digest("base64url").slice(0, 24);
  return `nw_${digest}`;
}

function isSmoke(body: Record<string, unknown>) {
  return clean(body.traffic_type)?.toLowerCase() === "test" && body.smoke === true;
}

async function landingRegistry(admin: NonNullable<ReturnType<typeof createAdminClient>>, resolvedLandingKey: string) {
  const cached = registryCache.get(resolvedLandingKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const { data } = await admin.from("norwyn_landing_registry")
    .select("tenant_id,product_id,campaign_key,url")
    .eq("landing_key", resolvedLandingKey).eq("status", "active").limit(1).maybeSingle();
  if (!data?.tenant_id) return null;
  const { data: definition } = await admin.from("landing_page_definitions")
    .select("campaign_id")
    .eq("tenant_id", data.tenant_id)
    .eq("landing_key", resolvedLandingKey)
    .limit(1)
    .maybeSingle();
  const { data: exactCampaign } = definition?.campaign_id
    ? await admin.from("campaigns").select("id,plan_json").eq("tenant_id", data.tenant_id).eq("id", definition.campaign_id).limit(1).maybeSingle()
    : { data: null };
  let campaign = exactCampaign;
  if (!campaign) {
    const { data: campaignRows } = await admin.from("campaigns")
      .select("id,plan_json")
      .eq("tenant_id", data.tenant_id)
      .eq("product_id", data.product_id)
      .limit(50);
    campaign = (campaignRows ?? []).find((row) => {
      const foundation = record(record(row.plan_json).traffic_data_foundation);
      return clean(foundation.landing_key) === resolvedLandingKey;
    }) ?? null;
  }
  const foundation = record(record(campaign?.plan_json).traffic_data_foundation);
  const legacyMetaId = clean(foundation.meta_campaign_id);
  const value: LandingRegistry = {
    ...(data as Omit<LandingRegistry, "campaign_id" | "active_meta_campaign_id" | "meta_campaign_ids">),
    campaign_id: clean(campaign?.id),
    active_meta_campaign_id: clean(foundation.active_meta_campaign_id),
    meta_campaign_ids: [...new Set([...textArray(foundation.meta_campaign_ids), ...(legacyMetaId ? [legacyMetaId] : [])])],
  };
  registryCache.set(resolvedLandingKey, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
  return value;
}

export async function OPTIONS(request: Request) {
  if (!isAllowedNorwynLpOrigin(request.headers.get("origin"))) {
    return new NextResponse(null, { status: 403, headers: { Vary: "Origin" } });
  }
  return new NextResponse(null, { status: 204, headers: headers(request) });
}

export async function GET(request: Request) {
  if (hasDisallowedNorwynLpOrigin(request)) {
    return NextResponse.json({ enabled: false, mode: "forbidden" }, { status: 403, headers: { Vary: "Origin" } });
  }
  const url = new URL(request.url);
  const resolvedLandingKey = landingKey(url.searchParams.get("landing_key"));
  if (!resolvedLandingKey) {
    return NextResponse.json({ enabled: false, mode: "invalid_landing_key" }, { status: 400, headers: headers(request) });
  }
  const smoke = url.searchParams.get("traffic_type") === "test" && url.searchParams.get("smoke") === "1";
  const enabled = globalEnabled() || smoke;
  if (enabled) {
    const admin = createAdminClient();
    if (admin) await landingRegistry(admin, resolvedLandingKey);
  }
  return NextResponse.json({ enabled, mode: globalEnabled() ? "enabled" : smoke ? "smoke" : "disabled" }, { headers: headers(request) });
}

export async function POST(request: Request) {
  if (hasDisallowedNorwynLpOrigin(request)) {
    return NextResponse.json({ enabled: false, bridged: false, reason: "forbidden_origin" }, { status: 403, headers: { Vary: "Origin" } });
  }
  const responseHeaders = headers(request);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const fallback = canonicalizeCheckout(body?.checkout_url).toString();
  if (!body) return NextResponse.json({ enabled: false, bridged: false, checkout_url: fallback, reason: "invalid_payload" }, { status: 400, headers: responseHeaders });
  const resolvedLandingKey = landingKey(body.landing_key);
  if (!resolvedLandingKey) return NextResponse.json({ enabled: false, bridged: false, checkout_url: fallback, reason: "invalid_landing_key" }, { status: 400, headers: responseHeaders });

  const enabled = globalEnabled() || isSmoke(body);
  if (!enabled) return NextResponse.json({ enabled: false, bridged: false, checkout_url: fallback, reason: "feature_disabled" }, { headers: responseHeaders });

  const sessionId = clean(body.session_id, 160);
  const visitorId = clean(body.visitor_id, 160);
  if (!sessionId || !visitorId) {
    return NextResponse.json({ enabled: true, bridged: false, checkout_url: CANONICAL_CHECKOUT, reason: "anonymous_identity_unavailable" }, { headers: responseHeaders });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "storage_unavailable" }, { status: 503, headers: responseHeaders });

  const registry = await landingRegistry(admin, resolvedLandingKey);
  if (!registry?.tenant_id) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "landing_not_registered" }, { status: 503, headers: responseHeaders });

  const currentTouch = safeTouch(body.current_touch);
  const firstTouch = safeTouch(body.first_touch);
  const metaCampaignId = clean(currentTouch.campaign_id);
  const metaAdsetId = clean(currentTouch.adset_id);
  const metaAdId = clean(currentTouch.ad_id);
  const fbclid = clean(currentTouch.fbclid, 500);
  const campaignRecognized = Boolean(metaCampaignId && registry.meta_campaign_ids.includes(metaCampaignId));
  const sck = attributionKey(String(registry.tenant_id), resolvedLandingKey, sessionId);
  const checkout = canonicalizeCheckout(fallback);
  const existingSck = checkout.searchParams.get("sck");
  if (existingSck && existingSck !== sck) {
    return NextResponse.json({ enabled: true, bridged: false, checkout_url: checkout.toString(), reason: "existing_sck_preserved" }, { headers: responseHeaders });
  }
  checkout.searchParams.set("sck", sck);

  const now = new Date().toISOString();
  const metadata = {
    bridge_version: "v1",
    landing_key: resolvedLandingKey,
    session_id: sessionId,
    visitor_id: visitorId,
    checkout_click: true,
    checkout_click_at: now,
    traffic_type: isSmoke(body) ? "test" : "public",
    first_touch: firstTouch,
    current_touch: currentTouch,
    campaign_resolution: {
      campaign_id: campaignRecognized ? registry.campaign_id : null,
      meta_campaign_id: metaCampaignId,
      recognized: campaignRecognized,
    },
    pii_policy: "anonymous_identifiers_only",
  };
  const payload = {
    tenant_id: registry.tenant_id,
    campaign_id: campaignRecognized ? registry.campaign_id : null,
    product_id: registry.product_id,
    campaign_key: registry.campaign_key ?? DEFAULT_LANDING_KEY,
    product_key: registry.campaign_key ?? DEFAULT_LANDING_KEY,
    funnel_key: resolvedLandingKey,
    source: clean(currentTouch.utm_source),
    medium: clean(currentTouch.utm_medium),
    campaign: clean(currentTouch.utm_campaign) ?? registry.campaign_key ?? DEFAULT_LANDING_KEY,
    content: clean(currentTouch.utm_content),
    term: clean(currentTouch.utm_term),
    campaign_platform_id: metaCampaignId,
    adset_id: metaAdsetId,
    ad_id: metaAdId,
    fbclid,
    click_id: fbclid,
    source_sck: sck,
    utm_source: clean(currentTouch.utm_source),
    utm_medium: clean(currentTouch.utm_medium),
    utm_campaign: clean(currentTouch.utm_campaign) ?? registry.campaign_key ?? DEFAULT_LANDING_KEY,
    utm_content: clean(currentTouch.utm_content),
    utm_term: clean(currentTouch.utm_term),
    landing_url: clean(body.landing_url, 2048) ?? registry.url,
    checkout_url: checkout.toString(),
    tracking_source: "norwyn_attribution_bridge_v1",
    tracking_confidence: campaignRecognized && metaAdsetId && metaAdId ? "HIGH" : currentTouch.utm_source ? "MEDIUM" : "LOW",
    status: "active",
    metadata,
  };

  const { error: insertError } = await admin.from("growth_tracking_keys").insert(payload);
  const { error } = insertError?.code === "23505"
    ? await admin.from("growth_tracking_keys").update(payload)
      .eq("tenant_id", registry.tenant_id).eq("source_sck", sck)
    : { error: insertError };
  if (error) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "persistence_failed" }, { status: 503, headers: responseHeaders });

  return NextResponse.json({
    enabled: true,
    bridged: true,
    sck,
    checkout_url: checkout.toString(),
    confidence: payload.tracking_confidence,
    identifiers: {
      campaign_id: metaCampaignId,
      adset_id: metaAdsetId,
      ad_id: metaAdId,
      fbclid_preserved: Boolean(fbclid),
      campaign_recognized: campaignRecognized,
    },
  }, { headers: responseHeaders });
}
