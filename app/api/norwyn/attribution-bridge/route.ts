import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasDisallowedNorwynLpOrigin, isAllowedNorwynLpOrigin, norwynLpCorsHeaders } from "@/lib/norwyn/lp-cors";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CANONICAL_CHECKOUT = "https://pay.hotmart.com/B47092539B?off=lov69pen";
const LANDING_KEY = "imersao_zumbido";
type LandingRegistry = { tenant_id: string; product_id: string | null; campaign_key: string | null; url: string | null };
let registryCache: { value: LandingRegistry; expiresAt: number } | null = null;

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
  return Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "sck"]
    .map((key) => [key, clean(source[key])]).filter(([, item]) => item));
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

function attributionKey(tenantId: string, sessionId: string) {
  const digest = createHash("sha256").update(`${tenantId}|${LANDING_KEY}|${sessionId}`).digest("base64url").slice(0, 24);
  return `nw_${digest}`;
}

function isSmoke(body: Record<string, unknown>) {
  return clean(body.traffic_type)?.toLowerCase() === "test" && body.smoke === true;
}

async function landingRegistry(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  if (registryCache && registryCache.expiresAt > Date.now()) return registryCache.value;
  const { data } = await admin.from("norwyn_landing_registry")
    .select("tenant_id,product_id,campaign_key,url")
    .eq("landing_key", LANDING_KEY).eq("status", "active").limit(1).maybeSingle();
  if (!data?.tenant_id) return null;
  const value = data as LandingRegistry;
  registryCache = { value, expiresAt: Date.now() + 5 * 60 * 1000 };
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
  const smoke = url.searchParams.get("traffic_type") === "test" && url.searchParams.get("smoke") === "1";
  const enabled = globalEnabled() || smoke;
  if (enabled) {
    const admin = createAdminClient();
    if (admin) await landingRegistry(admin);
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

  const enabled = globalEnabled() || isSmoke(body);
  if (!enabled) return NextResponse.json({ enabled: false, bridged: false, checkout_url: fallback, reason: "feature_disabled" }, { headers: responseHeaders });

  const sessionId = clean(body.session_id, 160);
  const visitorId = clean(body.visitor_id, 160);
  if (!sessionId || !visitorId) {
    return NextResponse.json({ enabled: true, bridged: false, checkout_url: CANONICAL_CHECKOUT, reason: "anonymous_identity_unavailable" }, { headers: responseHeaders });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "storage_unavailable" }, { status: 503, headers: responseHeaders });

  const registry = await landingRegistry(admin);
  if (!registry?.tenant_id) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "landing_not_registered" }, { status: 503, headers: responseHeaders });

  const currentTouch = safeTouch(body.current_touch);
  const firstTouch = safeTouch(body.first_touch);
  const sck = attributionKey(String(registry.tenant_id), sessionId);
  const checkout = canonicalizeCheckout(fallback);
  const existingSck = checkout.searchParams.get("sck");
  if (existingSck && existingSck !== sck) {
    return NextResponse.json({ enabled: true, bridged: false, checkout_url: checkout.toString(), reason: "existing_sck_preserved" }, { headers: responseHeaders });
  }
  checkout.searchParams.set("sck", sck);

  const now = new Date().toISOString();
  const metadata = {
    bridge_version: "v1",
    landing_key: LANDING_KEY,
    session_id: sessionId,
    visitor_id: visitorId,
    checkout_click: true,
    checkout_click_at: now,
    traffic_type: isSmoke(body) ? "test" : "public",
    first_touch: firstTouch,
    current_touch: currentTouch,
    pii_policy: "anonymous_identifiers_only",
  };
  const payload = {
    tenant_id: registry.tenant_id,
    product_id: registry.product_id,
    campaign_key: registry.campaign_key ?? LANDING_KEY,
    product_key: LANDING_KEY,
    funnel_key: LANDING_KEY,
    source: clean(currentTouch.utm_source),
    medium: clean(currentTouch.utm_medium),
    campaign: clean(currentTouch.utm_campaign) ?? LANDING_KEY,
    content: clean(currentTouch.utm_content),
    term: clean(currentTouch.utm_term),
    source_sck: sck,
    utm_source: clean(currentTouch.utm_source),
    utm_medium: clean(currentTouch.utm_medium),
    utm_campaign: clean(currentTouch.utm_campaign) ?? LANDING_KEY,
    utm_content: clean(currentTouch.utm_content),
    utm_term: clean(currentTouch.utm_term),
    landing_url: clean(body.landing_url, 2048) ?? registry.url,
    checkout_url: checkout.toString(),
    tracking_source: "norwyn_attribution_bridge_v1",
    tracking_confidence: currentTouch.utm_source ? "HIGH" : "MEDIUM",
    status: "active",
    metadata,
  };

  const { error: insertError } = await admin.from("growth_tracking_keys").insert(payload);
  const { error } = insertError?.code === "23505"
    ? await admin.from("growth_tracking_keys").update(payload)
      .eq("tenant_id", registry.tenant_id).eq("source_sck", sck)
    : { error: insertError };
  if (error) return NextResponse.json({ enabled: true, bridged: false, checkout_url: fallback, reason: "persistence_failed" }, { status: 503, headers: responseHeaders });

  return NextResponse.json({ enabled: true, bridged: true, sck, checkout_url: checkout.toString(), confidence: payload.tracking_confidence }, { headers: responseHeaders });
}
