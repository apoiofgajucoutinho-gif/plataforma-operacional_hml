import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedEvents = new Set(["page_view", "create", "update", "approve", "delete", "send", "run", "search", "export", "error"]);

function cleanText(value: unknown, fallback: string, max = 160) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function sanitizeError(value: unknown) {
  return cleanText(value, "Falha não identificada", 180)
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/(?:token|key|secret|password)\s*[:=]\s*\S+/gi, "[redacted]");
}

export async function POST(request: Request) {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => ({}));
  const module = cleanText(body.module, "unknown", 80);
  const pagePath = cleanText(body.pagePath, "/", 240);
  const pageLabel = cleanText(body.pageLabel, pagePath, 160);
  const eventName = allowedEvents.has(body.eventName) ? body.eventName : "page_view";
  const admin = createAdminClient();
  const dataClient = admin ?? userClient;

  const { data: membership } = await dataClient
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: true });
  }

  const userMetadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata as Record<string, unknown> : {};
  const userName = [userMetadata.preferred_name, userMetadata.nome_preferido, userMetadata.full_name, userMetadata.name, userMetadata.nome].find((value) => typeof value === "string" && value.trim());
  const metadata: Record<string, unknown> = {
    page_label: pageLabel,
    user_email: user.email,
    user_name: typeof userName === "string" ? userName.slice(0, 120) : undefined,
    user_agent: request.headers.get("user-agent")?.slice(0, 240),
  };
  if (typeof body.sessionId === "string") metadata.session_id = body.sessionId.slice(0, 80);
  if (Number.isFinite(body.pageLoadMs) && body.pageLoadMs >= 0 && body.pageLoadMs < 300000) metadata.page_load_ms = Math.round(body.pageLoadMs);
  if (typeof body.entity === "string") metadata.entity = body.entity.slice(0, 80);
  if (typeof body.entityId === "string") metadata.entity_id = body.entityId.slice(0, 120);
  if (typeof body.label === "string") metadata.label = body.label.slice(0, 160);
  if (typeof body.outcome === "string") metadata.outcome = body.outcome.slice(0, 40);
  if (typeof body.statusCode === "number") metadata.status_code = body.statusCode;
  if (eventName === "error") {
    metadata.error_type = cleanText(body.errorType, "frontend_error", 80);
    metadata.error_message = sanitizeError(body.errorMessage);
  }

  if (eventName === "page_view") {
    const since = new Date(Date.now() - 2000).toISOString();
    const { data: duplicate } = await dataClient.from("adoption_events").select("id").eq("tenant_id", membership.tenant_id).eq("user_id", user.id).eq("module", module).eq("page_path", pagePath).eq("event_name", eventName).contains("metadata", { page_label: pageLabel }).gte("created_at", since).limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ ok: true, deduplicated: true });
  }

  const { error } = await dataClient.from("adoption_events").insert({
    tenant_id: membership.tenant_id,
    user_id: user.id,
    module,
    page_path: pagePath,
    event_name: eventName,
    metadata,
  });

  return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
}
