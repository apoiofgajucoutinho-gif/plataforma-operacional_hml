import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedEvents = new Set([
  "landing_view",
  "cta_view",
  "cta_click",
  "scroll_depth",
  "video_play",
  "video_progress",
  "testimonial_view",
  "testimonial_interaction",
  "faq_open",
  "form_start",
  "form_submit",
  "checkout_click",
  "page_error",
]);

const allowedEnvironments = new Set(["hml", "dev", "qa"]);

function textValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestampValue(payload: Record<string, unknown>) {
  const value = textValue(payload, "timestamp") ?? textValue(payload, "occurred_at");
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const eventName = textValue(body, "name");
  const environment = textValue(body, "environment");

  if (!eventName || !allowedEvents.has(eventName)) {
    return NextResponse.json({ ok: false, error: "evento_invalido" }, { status: 400 });
  }

  if (!environment || !allowedEnvironments.has(environment)) {
    return NextResponse.json({ ok: false, error: "ambiente_invalido" }, { status: 400 });
  }

  const admin = createAdminClient();
  let stored = false;
  let storageError: string | null = null;
  const landingId = textValue(body, "landing_id");
  const landingKey = textValue(body, "landing_key");
  const versionId = textValue(body, "version_id");
  let resolvedLandingId = landingId;
  let resolvedTenantId: string | null = null;

  if (admin && (landingId || landingKey)) {
    let query = admin.from("landing_page_definitions").select("id, tenant_id").limit(1);
    query = landingId ? query.eq("id", landingId) : query.eq("landing_key", landingKey);
    const { data: landingRef } = await query.maybeSingle();
    resolvedLandingId = landingRef?.id ?? landingId;
    resolvedTenantId = landingRef?.tenant_id ?? null;

    const { error } = await admin.from("landing_page_tracking_events").insert({
      tenant_id: resolvedTenantId,
      landing_id: resolvedLandingId,
      version_id: versionId,
      landing_key: landingKey,
      landing_version: textValue(body, "landing_version"),
      environment,
      event_name: eventName,
      campaign_key: textValue(body, "campaign_id"),
      product_key: textValue(body, "product_id"),
      block_id: textValue(body, "block_id"),
      block_type: textValue(body, "block_type"),
      cta_id: textValue(body, "cta_id"),
      session_id: textValue(body, "session_id"),
      utm_source: textValue(body, "utm_source"),
      utm_medium: textValue(body, "utm_medium"),
      utm_campaign: textValue(body, "utm_campaign"),
      utm_content: textValue(body, "utm_content"),
      utm_term: textValue(body, "utm_term"),
      sck: textValue(body, "sck"),
      page_url: textValue(body, "page_url"),
      source_type: textValue(body, "source_type") === "SIMULATED" ? "SIMULATED" : "REAL",
      payload: body,
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
      note: stored ? "Evento persistido em HML." : "Evento validado em HML. Persistência não executada para payload legado ou tabela indisponível.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}