import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeLandingHtml, type LandingRegistryEntry } from "@/modules/norwyn/services/landing-intelligence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseAny = any;

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(cronHeader || (env.n8nIngestToken && token === env.n8nIngestToken));
}

async function resolveTenantId(dataClient: SupabaseAny) {
  if (env.norwynFunnelLabTenantId) return env.norwynFunnelLabTenantId;
  const { data, error } = await dataClient.from("tenants").select("id").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Tenant Norwyn nao encontrado para monitoramento.");
  return data.id as string;
}

function asEntry(row: Record<string, unknown>): LandingRegistryEntry & { id?: string } {
  return {
    id: row.id ? String(row.id) : undefined,
    campaign_key: String(row.campaign_key ?? ""),
    landing_key: String(row.landing_key ?? ""),
    landing_name: String(row.landing_name ?? row.landing_key ?? "Landing"),
    landing_version: String(row.landing_version ?? ""),
    url: String(row.url ?? ""),
    product_id: row.product_id ? String(row.product_id) : null,
    hotmart_product_id: row.hotmart_product_id ? String(row.hotmart_product_id) : null,
    environment: String(row.environment ?? "test"),
    status: String(row.status ?? "active"),
    operation_mode: row.operation_mode ? String(row.operation_mode) : null,
    external_owner: row.external_owner ? String(row.external_owner) : null,
    monitor_frequency_minutes: row.monitor_frequency_minutes === null || row.monitor_frequency_minutes === undefined ? null : Number(row.monitor_frequency_minutes),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : null,
  };
}

async function loadDueLandings(dataClient: SupabaseAny, tenantId: string) {
  const now = new Date().toISOString();
  const { data, error } = await dataClient
    .from("norwyn_landing_registry")
    .select("id, campaign_key, landing_key, landing_name, landing_version, url, product_id, hotmart_product_id, environment, status, operation_mode, external_owner, monitor_frequency_minutes, metadata, next_check_at")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "monitored", "ACTIVE", "MONITORED"])
    .or(`next_check_at.is.null,next_check_at.lte.${now}`)
    .order("next_check_at", { ascending: true, nullsFirst: true })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(asEntry).filter((entry: LandingRegistryEntry & { id?: string }) => entry.campaign_key && entry.landing_key && entry.url);
}

async function monitorLanding(dataClient: SupabaseAny, tenantId: string, entry: LandingRegistryEntry & { id?: string }) {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(entry.url, { cache: "no-store", redirect: "follow", headers: { "User-Agent": "NorwynLandingMonitor/1.0 read-only" } });
    const html = await response.text();
    const analysis = analyzeLandingHtml(entry, html, response.status, fetchedAt);
    const landingId = entry.id;
    if (!landingId) throw new Error("Landing registry sem id.");

    const { data: previous } = await dataClient
      .from("norwyn_landing_snapshots")
      .select("id, content_hash")
      .eq("tenant_id", tenantId)
      .eq("landing_id", landingId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: snapshot, error: snapshotError } = await dataClient.from("norwyn_landing_snapshots").insert({
      tenant_id: tenantId,
      landing_id: landingId,
      campaign_key: entry.campaign_key,
      landing_key: entry.landing_key,
      url: entry.url,
      fetched_at: fetchedAt,
      status_code: analysis.statusCode,
      content_hash: analysis.contentHash,
      content_length: analysis.contentLength,
      extracted_json: analysis.extraction,
      qa_summary: analysis.preflight,
      previous_snapshot_id: previous?.id ?? null,
    }).select("id").single();
    if (snapshotError) throw new Error(snapshotError.message);

    const changed = previous?.content_hash && previous.content_hash !== analysis.contentHash;
    const status = changed ? "CHANGE_DETECTED" : "NO_CHANGE";
    const nextCheckAt = new Date(Date.now() + (entry.monitor_frequency_minutes ?? 720) * 60 * 1000).toISOString();
    await dataClient.from("norwyn_landing_registry").update({ last_checked_at: fetchedAt, next_check_at: nextCheckAt, updated_at: fetchedAt }).eq("tenant_id", tenantId).eq("id", landingId);
    await dataClient.from("norwyn_landing_monitor_log").insert({
      tenant_id: tenantId,
      landing_id: landingId,
      previous_snapshot_id: previous?.id ?? null,
      current_snapshot_id: snapshot.id,
      campaign_key: entry.campaign_key,
      landing_key: entry.landing_key,
      url: entry.url,
      status,
      changed_fields: changed ? ["content_hash"] : [],
      message: changed ? "Fingerprint mudou; pre-flight reprocessado." : "NO CHANGE: fingerprint sem mudanca.",
      detected_at: fetchedAt,
    });
    return { landingKey: entry.landing_key, status, contentHash: analysis.contentHash, preflight: analysis.preflight.status, nextCheckAt };
  } catch (error) {
    await dataClient.from("norwyn_landing_monitor_log").insert({
      tenant_id: tenantId,
      campaign_key: entry.campaign_key,
      landing_key: entry.landing_key,
      url: entry.url,
      status: "ERROR",
      changed_fields: [],
      message: error instanceof Error ? error.message : "Falha no monitoramento.",
      detected_at: fetchedAt,
    });
    return { landingKey: entry.landing_key, status: "ERROR", error: error instanceof Error ? error.message : "Falha no monitoramento." };
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Monitoramento nao autorizado." }, { status: 401 });
  const dataClient = createAdminClient();
  if (!dataClient) return NextResponse.json({ error: "Supabase admin client indisponivel." }, { status: 500 });
  try {
    const tenantId = await resolveTenantId(dataClient);
    const entries = await loadDueLandings(dataClient, tenantId);
    const results = await Promise.all(entries.map((entry: LandingRegistryEntry & { id?: string }) => monitorLanding(dataClient, tenantId, entry)));
    return NextResponse.json({ ok: true, monitored: entries.length, operationMode: "REGISTRY_DRIVEN_READ_ONLY", results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no monitoramento." }, { status: 500 });
  }
}
