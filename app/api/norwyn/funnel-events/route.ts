import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const allowedTestEvents = new Set([
  "LANDING_VIEW",
  "CTA_VIEW",
  "CTA_CLICK",
  "CHECKOUT_REDIRECT",
  "VSL_PLAY",
  "VSL_PROGRESS_25",
  "VSL_PROGRESS_50",
  "VSL_PROGRESS_75",
  "VSL_PROGRESS_90",
  "CTA",
  "VSL_CTA_VIEW",
  "VSL_CTA_CLICK",
  "CHECKOUT_VIEW",
  "TEST_DESTINATION_VIEW",
]);

const labEventOrder = [
  "LANDING_VIEW",
  "CTA_VIEW",
  "CTA_CLICK",
  "CHECKOUT_REDIRECT",
  "VSL_PLAY",
  "VSL_PROGRESS_25",
  "VSL_PROGRESS_50",
  "VSL_PROGRESS_75",
  "VSL_PROGRESS_90",
  "VSL_CTA_VIEW",
  "VSL_CTA_CLICK",
  "TEST_DESTINATION_VIEW",
];

type EventPayload = {
  funnel_session_id?: unknown;
  event_type?: unknown;
  environment?: unknown;
  page_url?: unknown;
  destination_url?: unknown;
  campaign_id?: unknown;
  adset_id?: unknown;
  ad_id?: unknown;
  creative_id?: unknown;
  campaign_key?: unknown;
  audience_key?: unknown;
  creative_key?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  sck?: unknown;
  source_sck?: unknown;
  fbclid?: unknown;
  click_id?: unknown;
  video_id?: unknown;
  event_key?: unknown;
  metadata?: unknown;
};

function cleanString(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value)).metadata ?? value;
}

async function resolveTenantId() {
  if (env.norwynFunnelLabTenantId) return env.norwynFunnelLabTenantId;
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client indisponivel.");
  const { data, error } = await admin
    .from("tenants")
    .select("id")
    .eq("nome", env.instagramDefaultTenantName)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Tenant padrao do Norwyn Funnel Lab nao encontrado.");
  return data.id as string;
}

function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

type LabEventRow = {
  funnel_session_id: string | null;
  event_type: string | null;
  environment: string | null;
  occurred_at: string | null;
  campaign_key: string | null;
  audience_key: string | null;
  creative_key: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  source_sck: string | null;
  provider: string | null;
};

function buildLabSummary(events: LabEventRow[]) {
  const eventCounts = new Map<string, number>();
  const sessions = new Set<string>();
  const tracking = new Map<string, string>();
  let lastEventAt: string | null = null;
  let latestSessionId: string | null = null;
  const sessionLastSeen = new Map<string, string>();

  for (const event of events) {
    const eventType = event.event_type;
    const sessionId = event.funnel_session_id;
    if (!eventType || !sessionId) continue;

    sessions.add(sessionId);
    eventCounts.set(eventType, (eventCounts.get(eventType) ?? 0) + 1);

    if (event.occurred_at && (!lastEventAt || event.occurred_at > lastEventAt)) {
      lastEventAt = event.occurred_at;
    }

    if (event.occurred_at && (!sessionLastSeen.get(sessionId) || event.occurred_at > sessionLastSeen.get(sessionId)!)) {
      sessionLastSeen.set(sessionId, event.occurred_at);
      if (!latestSessionId || event.occurred_at > (sessionLastSeen.get(latestSessionId) ?? "")) {
        latestSessionId = sessionId;
      }
    }

    for (const [label, value] of [
      ["campaign_key", event.campaign_key],
      ["audience_key", event.audience_key],
      ["creative_key", event.creative_key],
      ["utm_campaign", event.utm_campaign],
      ["utm_content", event.utm_content],
      ["utm_term", event.utm_term],
      ["source_sck", event.source_sck],
    ] as const) {
      if (value && !tracking.has(label)) tracking.set(label, value);
    }
  }

  const latestEvents = latestSessionId
    ? events
        .filter((event) => event.funnel_session_id === latestSessionId && event.event_type && event.occurred_at)
        .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))
        .map((event) => ({ eventType: event.event_type!, occurredAt: event.occurred_at! }))
    : [];
  const latestEventTypes = new Set(latestEvents.map((event) => event.eventType));
  const abandonment25to50Approved =
    latestEventTypes.has("LANDING_VIEW") &&
    latestEventTypes.has("VSL_PLAY") &&
    latestEventTypes.has("VSL_PROGRESS_25") &&
    !latestEventTypes.has("VSL_PROGRESS_50") &&
    !latestEventTypes.has("VSL_PROGRESS_75") &&
    !latestEventTypes.has("VSL_PROGRESS_90") &&
    !latestEventTypes.has("VSL_CTA_VIEW") &&
    !latestEventTypes.has("VSL_CTA_CLICK");

  const orderedEvents = labEventOrder
    .filter((eventType) => eventCounts.has(eventType))
    .map((eventType) => ({ eventType, count: eventCounts.get(eventType) ?? 0 }));
  for (const [eventType, count] of eventCounts.entries()) {
    if (!labEventOrder.includes(eventType)) orderedEvents.push({ eventType, count });
  }

  return {
    environment: "TEST",
    sessions: sessions.size,
    events: orderedEvents,
    lastEventAt,
    trackingKeys: Array.from(tracking.entries()).map(([label, value]) => ({ label, value })),
    latestSession: latestSessionId
      ? {
          funnelSessionId: latestSessionId,
          firstEventAt: latestEvents[0]?.occurredAt ?? null,
          lastEventAt: latestEvents.at(-1)?.occurredAt ?? null,
          events: latestEvents,
          abandonment25to50Approved,
        }
      : null,
    refreshedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const summary = cleanString(url.searchParams.get("summary"), 80);
    const sessionId = cleanString(url.searchParams.get("funnel_session_id"), 120);

    const admin = createAdminClient();
    if (!admin) return response({ error: "Admin client indisponivel." }, 503);
    const tenantId = await resolveTenantId();

    if (summary === "funnel_lab") {
      const { data, error } = await admin
        .from("growth_funnel_events")
        .select("funnel_session_id, event_type, environment, occurred_at, campaign_key, audience_key, creative_key, utm_campaign, utm_content, utm_term, source_sck, provider")
        .eq("tenant_id", tenantId)
        .eq("environment", "test")
        .or("campaign_key.eq.norwyn_funnel_lab,provider.eq.norwyn_funnel_lab")
        .order("occurred_at", { ascending: true })
        .limit(1000);

      if (error) throw error;
      return response(buildLabSummary((data ?? []) as LabEventRow[]));
    }

    if (!sessionId) return response({ error: "funnel_session_id obrigatorio." }, 400);

    const { data, error } = await admin
      .from("growth_funnel_events")
      .select("id, event_type, environment, occurred_at, page_url, campaign_key, audience_key, creative_key, utm_source, utm_medium, utm_campaign, utm_content, utm_term, source_sck, meta_campaign_id, meta_adset_id, meta_ad_id, metadata")
      .eq("tenant_id", tenantId)
      .eq("funnel_session_id", sessionId)
      .eq("environment", "test")
      .order("occurred_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    return response({ events: data ?? [] });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Falha ao consultar eventos." }, 400);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as EventPayload;
    const eventType = cleanString(payload.event_type, 80);
    const sessionId = cleanString(payload.funnel_session_id, 120);
    const environment = cleanString(payload.environment, 30)?.toLowerCase() ?? "test";

    if (!sessionId) return response({ error: "funnel_session_id obrigatorio." }, 400);
    if (!eventType || !allowedTestEvents.has(eventType)) return response({ error: "event_type invalido para o Funnel Lab." }, 400);
    if (environment !== "test") return response({ error: "Este endpoint publico aceita apenas environment=test." }, 400);

    const admin = createAdminClient();
    if (!admin) return response({ error: "Admin client indisponivel." }, 503);
    const tenantId = await resolveTenantId();
    const pageUrl = cleanString(payload.page_url, 1000);
    const videoId = cleanString(payload.video_id, 120) ?? "default_video";
    const eventKey =
      cleanString(payload.event_key, 300) ??
      `${sessionId}:${eventType}:${eventType.startsWith("VSL_") ? videoId : pageUrl ?? "page"}`;

    const sessionRow = {
      tenant_id: tenantId,
      funnel_session_id: sessionId,
      environment: "test",
      meta_campaign_id: cleanString(payload.campaign_id, 120),
      meta_adset_id: cleanString(payload.adset_id, 120),
      meta_ad_id: cleanString(payload.ad_id, 120),
      meta_creative_id: cleanString(payload.creative_id, 120),
      campaign_key: cleanString(payload.campaign_key, 180),
      audience_key: cleanString(payload.audience_key, 180),
      creative_key: cleanString(payload.creative_key, 180),
      source_sck: cleanString(payload.source_sck, 1000) ?? cleanString(payload.sck, 1000),
      utm_source: cleanString(payload.utm_source, 180),
      utm_medium: cleanString(payload.utm_medium, 180),
      utm_campaign: cleanString(payload.utm_campaign, 180),
      utm_content: cleanString(payload.utm_content, 180),
      utm_term: cleanString(payload.utm_term, 180),
      fbclid: cleanString(payload.fbclid, 500),
      click_id: cleanString(payload.click_id, 500),
      landing_url: pageUrl,
      last_seen_at: new Date().toISOString(),
      metadata: {
        lab: "norwyn_funnel_lab",
        destination_url: cleanString(payload.destination_url, 1000),
      },
    };

    const { error: sessionError } = await admin
      .from("growth_funnel_sessions")
      .upsert(sessionRow, { onConflict: "tenant_id,funnel_session_id" });
    if (sessionError) throw sessionError;

    const eventRow = {
      tenant_id: tenantId,
      funnel_session_id: sessionId,
      event_type: eventType,
      environment: "test",
      meta_campaign_id: sessionRow.meta_campaign_id,
      meta_adset_id: sessionRow.meta_adset_id,
      meta_ad_id: sessionRow.meta_ad_id,
      meta_creative_id: sessionRow.meta_creative_id,
      campaign_key: sessionRow.campaign_key,
      audience_key: sessionRow.audience_key,
      creative_key: sessionRow.creative_key,
      source_sck: sessionRow.source_sck,
      utm_source: sessionRow.utm_source,
      utm_medium: sessionRow.utm_medium,
      utm_campaign: sessionRow.utm_campaign,
      utm_content: sessionRow.utm_content,
      utm_term: sessionRow.utm_term,
      fbclid: sessionRow.fbclid,
      click_id: sessionRow.click_id,
      page_url: pageUrl,
      provider: "norwyn_funnel_lab",
      event_key: eventKey,
      metadata: {
        ...cleanMetadata(payload.metadata),
        video_id: videoId,
        destination_url: cleanString(payload.destination_url, 1000),
      },
    };

    const { data, error } = await admin
      .from("growth_funnel_events")
      .insert(eventRow)
      .select("id, event_type, environment, occurred_at")
      .single();

    if (error && error.code === "23505") {
      const { data: existing, error: existingError } = await admin
        .from("growth_funnel_events")
        .select("id, event_type, environment, occurred_at")
        .eq("tenant_id", tenantId)
        .eq("event_key", eventKey)
        .maybeSingle();
      if (existingError) throw existingError;
      return response({ ok: true, duplicate: true, event: existing });
    }

    if (error) throw error;
    return response({ ok: true, duplicate: false, event: data });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Falha ao registrar evento." }, 400);
  }
}
