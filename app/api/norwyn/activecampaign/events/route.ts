import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { normalizeActiveCampaignWebhookEvent } from "@/modules/norwyn/services/active-campaign";

const tenantId = "ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0";
const journeyKey = "zumbido_to_ajustes_finos";
const offerKey = "zumbido_to_ajustes_finos_set26";

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function valueFrom(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function metadataFrom(payload: Record<string, unknown>) {
  return {
    provider: "activecampaign",
    environment: "hml",
    raw_event: payload,
  };
}

export async function POST(request: Request) {
  if (!env.activeCampaignWebhookSecret) {
    return response({ status: "NOT_CONFIGURED", error: "ACTIVE_CAMPAIGN_WEBHOOK_SECRET ausente." }, 503);
  }

  const url = new URL(request.url);
  const providedSecret = request.headers.get("x-activecampaign-secret") ?? url.searchParams.get("secret");
  if (providedSecret !== env.activeCampaignWebhookSecret) {
    return response({ error: "unauthorized" }, 401);
  }

  const admin = createAdminClient();
  if (!admin) return response({ error: "Supabase admin client indisponivel." }, 503);

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return response({ error: "invalid json payload" }, 400);

  const email = valueFrom(payload, ["email", "contact_email", "contact[email]", "subscriber_email"])?.toLowerCase();
  if (!email) return response({ error: "missing email; event not attached to a Norwyn person" }, 400);

  const contactId = valueFrom(payload, ["contact_id", "contact[id]", "contactId"]);
  const eventType = normalizeActiveCampaignWebhookEvent(valueFrom(payload, ["event", "type", "action", "webhook_event"]));
  if (eventType === "NOT_INSTRUMENTED") {
    return response({ status: "IGNORED", reason: "event type not mapped", email });
  }

  const eventId = valueFrom(payload, ["id", "event_id", "webhook_id"]) ?? `${contactId ?? email}:${eventType}:${valueFrom(payload, ["date_time", "timestamp", "created_at"]) ?? Date.now()}`;
  const sourceEventId = `activecampaign:${eventId}`;
  const customerHash = `cust_${Buffer.from(email).toString("base64url").slice(0, 24)}`;

  const { data: existing, error: existingError } = await admin
    .from("norwyn_customer_offer_events")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("source_event_id", sourceEventId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return response({ status: "DUPLICATE_IGNORED", eventType, sourceEventId });

  const occurredAt = valueFrom(payload, ["date_time", "timestamp", "created_at"]) ?? new Date().toISOString();
  const { error: insertError } = await admin.from("norwyn_customer_offer_events").insert({
    tenant_id: tenantId,
    journey_key: journeyKey,
    offer_key: offerKey,
    person_key: email,
    customer_hash: customerHash,
    channel: "EMAIL",
    event_type: eventType,
    occurred_at: occurredAt,
    source: "activecampaign_webhook",
    source_event_id: sourceEventId,
    metadata: metadataFrom(payload),
  });
  if (insertError) throw insertError;

  if (eventType === "UNSUBSCRIBED" || eventType === "BOUNCED") {
    const activecampaignStatus = eventType === "UNSUBSCRIBED" ? "UNSUBSCRIBED" : "BOUNCED";
    const { error: statusError } = await admin.from("norwyn_customer_channel_statuses").upsert({
      tenant_id: tenantId,
      person_key: email,
      customer_hash: customerHash,
      email_status: "OPTED_OUT",
      whatsapp_status: "UNKNOWN",
      instagram_manychat_status: "UNKNOWN",
      commercial_block: false,
      activecampaign_contact_id: contactId,
      activecampaign_status: activecampaignStatus,
      email_policy_decision: "BLOCKED",
      email_policy_evidence: metadataFrom(payload),
      sync_status: "OK",
      last_synced_at: new Date().toISOString(),
      source: "activecampaign_webhook",
      evidence: metadataFrom(payload),
    }, { onConflict: "tenant_id,person_key" });
    if (statusError) throw statusError;
  }

  return response({ status: "RECORDED", eventType, sourceEventId });
}
