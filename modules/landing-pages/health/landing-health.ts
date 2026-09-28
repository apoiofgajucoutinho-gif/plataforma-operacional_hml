import "server-only";

import { runPresenceCheck } from "@/modules/presence/services/presence-monitor";

type SupabaseAny = any;
type HealthState = "healthy" | "warning" | "critical";

const LANDING_KEY = "imersao_zumbido";
const CANONICAL_URL = "https://imersaozumbido.fgajulianacoutinho.com.br";
const CHECKOUT_URL = "https://pay.hotmart.com/B47092539B?off=lov69pen";

function expected(asset: any, key: string) {
  const value = asset?.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function stateFor(input: { available: boolean; destination: boolean; attribution: boolean; checkout: boolean; tracking: boolean }): HealthState {
  if (!input.available || !input.destination || !input.checkout) return "critical";
  if (!input.attribution || !input.tracking) return "warning";
  return "healthy";
}

function humanMessage(label: string, state: HealthState, input: { destination: boolean; attribution: boolean; checkout: boolean; tracking: boolean }) {
  if (state === "healthy") return `${label} está chegando corretamente à página e preservando a origem.`;
  if (!input.destination) return `O link ${label} não está chegando corretamente à página.`;
  if (!input.attribution) return `O link ${label} chega à página, mas não preserva a origem esperada.`;
  if (!input.checkout) return `A página aberta por ${label} não apresentou o checkout esperado.`;
  if (!input.tracking) return `O link ${label} funciona, mas ainda não há evento de teste recente para confirmar o tracking no navegador.`;
  return `${label} precisa de revisão.`;
}

async function checkCampaignLink(client: SupabaseAny, asset: any) {
  const { check } = await runPresenceCheck(client, asset, { origin: "automatic", retryOnFailure: true, sourceType: "SIMULATED" });
  const finalUrl = String(check.final_url ?? check.result_json?.final_url ?? "");
  let parsed: URL | null = null;
  try { parsed = new URL(finalUrl); } catch { parsed = null; }
  const destinationOk = parsed?.hostname === new URL(CANONICAL_URL).hostname;
  const expectedSource = expected(asset, "expected_source");
  const expectedMedium = expected(asset, "expected_medium");
  const expectedContent = expected(asset, "expected_content");
  const attributionOk = Boolean(parsed
    && parsed.searchParams.get("utm_source") === expectedSource
    && parsed.searchParams.get("utm_medium") === expectedMedium
    && parsed.searchParams.get("utm_content") === expectedContent);

  let checkoutObserved = false;
  try {
    const response = await fetch(finalUrl || asset.url, { cache: "no-store", redirect: "follow", headers: { "User-Agent": "NorwynLandingHealth/1.0 read-only" }, signal: AbortSignal.timeout(15000) });
    const html = await response.text();
    checkoutObserved = html.includes("B47092539B") && html.includes("lov69pen");
  } catch {
    checkoutObserved = false;
  }

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: trackingCount } = await client.from("landing_page_tracking_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", asset.tenant_id).eq("landing_key", LANDING_KEY).eq("source_type", "SIMULATED")
    .eq("utm_source", expectedSource).eq("utm_medium", expectedMedium).eq("utm_content", expectedContent)
    .gte("occurred_at", recentCutoff);
  const trackingOk = Number(trackingCount ?? 0) > 0;
  const state = stateFor({ available: Boolean(check.is_available), destination: Boolean(destinationOk), attribution: attributionOk, checkout: checkoutObserved, tracking: trackingOk });
  const label = expected(asset, "display_name") || asset.name;
  const evidence = {
    source_type: "SIMULATED",
    traffic_type: "test",
    short_url: asset.url,
    redirect_chain: check.redirect_chain ?? [],
    final_url: finalUrl || null,
    expected_origin: { source: expectedSource, medium: expectedMedium, content: expectedContent },
    observed_origin: parsed ? { source: parsed.searchParams.get("utm_source"), medium: parsed.searchParams.get("utm_medium"), content: parsed.searchParams.get("utm_content") } : null,
    attribution_ok: attributionOk,
    destination_ok: Boolean(destinationOk),
    checkout_expected: CHECKOUT_URL,
    checkout_observed: checkoutObserved,
    tracking_recent: trackingOk,
    tracking_events_found: trackingCount ?? 0,
  };
  await client.from("presence_checks").update({
    status: state,
    health_score: state === "healthy" ? 100 : state === "warning" ? 75 : 35,
    error_message: state === "healthy" ? null : humanMessage(label, state, { destination: Boolean(destinationOk), attribution: attributionOk, checkout: checkoutObserved, tracking: trackingOk }),
    result_json: { ...(check.result_json ?? {}), landing_health: evidence },
  }).eq("id", check.id);
  return { assetId: asset.id, key: expected(asset, "route_key"), label, state, checkedAt: check.checked_at, httpStatus: check.http_status, responseTimeMs: check.response_time_ms, message: humanMessage(label, state, { destination: Boolean(destinationOk), attribution: attributionOk, checkout: checkoutObserved, tracking: trackingOk }), evidence };
}

export async function runLandingHealthV1(client: SupabaseAny, tenantId: string) {
  const { data: definition, error: definitionError } = await client.from("landing_page_definitions").select("id,active_version_id").eq("tenant_id", tenantId).eq("landing_key", LANDING_KEY).maybeSingle();
  if (definitionError || !definition?.active_version_id) throw new Error(definitionError?.message ?? "Imersão Zumbido sem versão ativa.");
  const { data: assets, error: assetsError } = await client.from("digital_assets").select("*").eq("tenant_id", tenantId).contains("metadata", { landing_key: LANDING_KEY });
  if (assetsError) throw new Error(assetsError.message);
  const pageAsset = (assets ?? []).find((asset: any) => asset.metadata?.component === "page");
  const checkoutAsset = (assets ?? []).find((asset: any) => asset.metadata?.component === "checkout");
  const campaignAssets = (assets ?? []).filter((asset: any) => asset.metadata?.component === "campaign_link").sort((a: any, b: any) => String(a.metadata?.route_key).localeCompare(String(b.metadata?.route_key)));
  if (!pageAsset || !checkoutAsset || campaignAssets.length !== 5) throw new Error("Assets do Health da Imersão Zumbido estão incompletos.");

  const [page, checkout] = await Promise.all([
    runPresenceCheck(client, pageAsset, { origin: "automatic", retryOnFailure: true }),
    runPresenceCheck(client, checkoutAsset, { origin: "automatic", retryOnFailure: true }),
  ]);
  const links = [];
  for (const asset of campaignAssets) links.push(await checkCampaignLink(client, asset));
  const { data: latestTracking } = await client.from("landing_page_tracking_events").select("occurred_at").eq("tenant_id", tenantId).eq("landing_key", LANDING_KEY).eq("source_type", "REAL").order("occurred_at", { ascending: false }).limit(1).maybeSingle();
  const trackingFresh = latestTracking?.occurred_at ? Date.now() - new Date(latestTracking.occurred_at).getTime() < 7 * 24 * 60 * 60 * 1000 : false;
  const states: HealthState[] = [page.check.status, checkout.check.status, ...links.map((item) => item.state)].map((value) => value === "healthy" ? "healthy" : value === "critical" ? "critical" : "warning");
  if (!trackingFresh) states.push("warning");
  const overall: HealthState = states.includes("critical") ? "critical" : states.includes("warning") ? "warning" : "healthy";
  const completedAt = new Date().toISOString();
  const technicalResults = {
    schema_version: "landing_health_v1",
    overall,
    page: { asset_id: pageAsset.id, check_id: page.check.id, status: page.check.status },
    checkout: { asset_id: checkoutAsset.id, check_id: checkout.check.id, status: checkout.check.status },
    tracking: { status: trackingFresh ? "healthy" : "warning", latest_real_event_at: latestTracking?.occurred_at ?? null },
    campaign_links: links,
  };
  const { data: qaRun, error: qaError } = await client.from("landing_page_qa_runs").insert({
    tenant_id: tenantId,
    landing_id: definition.id,
    version_id: definition.active_version_id,
    environment: "HML",
    status: overall === "critical" ? "BLOCKER" : overall === "warning" ? "WARNING" : "PASS",
    total_tests: 8,
    passed_tests: states.filter((state) => state === "healthy").length,
    warning_tests: states.filter((state) => state === "warning").length,
    blocker_tests: states.filter((state) => state === "critical").length,
    technical_results: technicalResults,
    specialist_summary: { overall, message: overall === "healthy" ? "Página, checkout, tracking e links funcionando." : "Há itens que precisam de revisão.", links: links.map(({ label, state, message }) => ({ label, state, message })) },
    completed_at: completedAt,
  }).select("id").single();
  if (qaError) throw new Error(qaError.message);
  return { overall, checkedAt: completedAt, qaRunId: qaRun.id, page: technicalResults.page, checkout: technicalResults.checkout, tracking: technicalResults.tracking, links };
}
