import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasDisallowedNorwynLpOrigin, isAllowedNorwynLpOrigin, norwynLpCorsHeaders } from "@/lib/norwyn/lp-cors";

const allowedEvents = new Set([
  "landing_view", "page_view", "session_start", "cta_view", "cta_click", "scroll_depth",
  "scroll_25", "scroll_50", "scroll_75", "scroll_90", "section_view", "offer_view",
  "modules_view", "module_open", "journey_step_view", "video_play", "video_progress",
  "testimonial_view", "testimonial_interaction", "faq_open", "form_start", "form_submit",
  "checkout_click", "page_error",
]);

const allowedEnvironments = new Set(["hml", "dev", "qa"]);
const allowedTrafficTypes = new Set(["public", "internal", "test"]);
function textValue(payload: Record<string, unknown>, key: string, maxLength = 2048) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function nestedText(payload: Record<string, unknown>, parent: string, key: string) {
  const nested = payload[parent];
  return nested && typeof nested === "object"
    ? textValue(nested as Record<string, unknown>, key)
    : null;
}

function timestampValue(payload: Record<string, unknown>) {
  const value = textValue(payload, "timestamp") ?? textValue(payload, "occurred_at");
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function sanitizedRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (!/^[a-z0-9_]{1,64}$/i.test(key)) continue;
    if (typeof item === "string") sanitized[key] = item.slice(0, 2048);
    else if (typeof item === "number" || typeof item === "boolean" || item === null) sanitized[key] = item;
  }
  return sanitized;
}

export async function OPTIONS(request: Request) {
  if (!isAllowedNorwynLpOrigin(request.headers.get("origin"))) {
    return new NextResponse(null, { status: 403, headers: { Vary: "Origin" } });
  }
  return new NextResponse(null, { status: 204, headers: norwynLpCorsHeaders(request, ["POST", "OPTIONS"]) });
}

export async function POST(request: Request) {
  if (hasDisallowedNorwynLpOrigin(request)) {
    return NextResponse.json({ ok: false, error: "origem_nao_permitida" }, { status: 403, headers: { Vary: "Origin" } });
  }
  const headers = { "Cache-Control": "no-store", ...norwynLpCorsHeaders(request, ["POST", "OPTIONS"]) };
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400, headers });
  }

  const body = payload as Record<string, unknown>;
  const eventName = textValue(body, "name") ?? textValue(body, "event");
  const environment = textValue(body, "environment");

  if (!eventName || !allowedEvents.has(eventName)) {
    return NextResponse.json({ ok: false, error: "evento_invalido" }, { status: 400, headers });
  }

  if (!environment || !allowedEnvironments.has(environment)) {
    return NextResponse.json({ ok: false, error: "ambiente_invalido" }, { status: 400, headers });
  }

  const attribution = {
    utm_source: textValue(body, "utm_source") ?? nestedText(body, "attribution", "utm_source"),
    utm_medium: textValue(body, "utm_medium") ?? nestedText(body, "attribution", "utm_medium"),
    utm_campaign: textValue(body, "utm_campaign") ?? nestedText(body, "attribution", "utm_campaign"),
    utm_content: textValue(body, "utm_content") ?? nestedText(body, "attribution", "utm_content"),
    utm_term: textValue(body, "utm_term") ?? nestedText(body, "attribution", "utm_term"),
    sck: textValue(body, "sck") ?? nestedText(body, "attribution", "sck"),
    src: textValue(body, "src") ?? nestedText(body, "attribution", "src"),
  };
  const pageId = textValue(body, "page_id") ?? textValue(body, "landing_key");
  const productId = textValue(body, "product_id");
  const landingId = textValue(body, "landing_id");
  const versionId = textValue(body, "version_id");
  const sessionId = textValue(body, "session_id");
  const visitorId = textValue(body, "visitor_id");
  const eventData = sanitizedRecord(body.event_data ?? body.params);
  const requestedTrafficType = textValue(body, "traffic_type")?.toLowerCase();
  const trafficType = requestedTrafficType && allowedTrafficTypes.has(requestedTrafficType)
    ? requestedTrafficType
    : textValue(body, "source_type") === "SIMULATED" ? "test" : "public";

  const admin = createAdminClient();
  let stored = false;
  let storageError: string | null = null;
  let resolvedLandingId = landingId;
  let resolvedTenantId: string | null = null;

  if (admin && (landingId || pageId || productId)) {
    if (landingId || pageId) {
      let query = admin.from("landing_page_definitions").select("id, tenant_id").limit(1);
      query = landingId ? query.eq("id", landingId) : query.eq("landing_key", pageId);
      const { data: landingRef } = await query.maybeSingle();
      resolvedLandingId = landingRef?.id ?? landingId;
      resolvedTenantId = landingRef?.tenant_id ?? null;
    }

    if (!resolvedTenantId && productId && /^[0-9a-f-]{36}$/i.test(productId)) {
      const { data: productRef } = await admin
        .from("catalog_products")
        .select("tenant_id")
        .eq("id", productId)
        .limit(1)
        .maybeSingle();
      resolvedTenantId = productRef?.tenant_id ?? null;
    }

    const normalizedPayload = {
      event: eventName,
      occurred_at: timestampValue(body),
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      product_id: productId,
      product: textValue(body, "product", 256),
      template: textValue(body, "template", 128),
      page_version: textValue(body, "page_version", 128),
      content_version: textValue(body, "content_version", 128),
      environment,
      url: textValue(body, "url") ?? textValue(body, "page_url"),
      referrer: textValue(body, "referrer"),
      landing_url: textValue(body, "landing_url"),
      attribution,
      first_touch: sanitizedRecord(body.first_touch),
      current_touch: sanitizedRecord(body.current_touch),
      event_data: eventData,
      traffic_type: trafficType,
    };

    const { error } = await admin.from("landing_page_tracking_events").insert({
      tenant_id: resolvedTenantId,
      landing_id: resolvedLandingId,
      version_id: versionId,
      landing_key: pageId,
      landing_version: textValue(body, "page_version") ?? textValue(body, "landing_version"),
      environment,
      event_name: eventName,
      campaign_key: textValue(body, "campaign_id") ?? attribution.utm_campaign,
      product_key: productId,
      block_id: textValue(body, "block_id") ?? (String(eventData.section_id ?? eventData.module_id ?? "") || null),
      block_type: textValue(body, "block_type"),
      cta_id: textValue(body, "cta_id") ?? (String(eventData.cta_id ?? "") || null),
      session_id: sessionId,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      sck: attribution.sck,
      page_url: textValue(body, "url") ?? textValue(body, "page_url"),
      source_type: trafficType === "public" ? "REAL" : "SIMULATED",
      payload: normalizedPayload,
      occurred_at: timestampValue(body),
    });
    stored = !error;
    storageError = error?.message ?? null;
  }

  return NextResponse.json(
    {
      ok: true,
      stored,
      storageError,
      note: stored
        ? "Evento persistido em HML."
        : "Evento validado em HML. Persistência não executada para payload legado ou tabela indisponível.",
    },
    { headers },
  );
}
