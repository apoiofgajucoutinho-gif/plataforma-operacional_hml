import { NextResponse } from "next/server";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { analyzeLandingHtml, buildLandingReadinessReportForContext, type LandingAnalysis, type LandingRegistryEntry } from "@/modules/norwyn/services/landing-intelligence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupabaseAny = any;

async function getAuthContext() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const admin = createAdminClient();
  const dataClient: SupabaseAny = admin ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) return { error: "Nao autenticado.", status: 401 as const };
  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { data: membership } = localMembership ? { data: localMembership } : await dataClient
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", currentUser.id)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  if (!membership) return { error: "Usuario sem tenant ativo.", status: 403 as const };
  const { data: permission } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", membership.tenant_id)
    .eq("role", membership.role)
    .eq("module", "norwyn")
    .eq("can_read", true)
    .maybeSingle();
  if (membership.role !== "ADMIN" && !permission) return { error: "Sem permissao para Norwyn.", status: 403 as const };
  return { dataClient, tenantId: membership.tenant_id as string };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function param(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value?.trim() || null;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function asEntry(row: Record<string, unknown>): LandingRegistryEntry {
  return {
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

async function loadEntries(dataClient: SupabaseAny, tenantId: string, requestUrl: URL) {
  const campaignKey = param(requestUrl, "campaign_key");
  const productId = param(requestUrl, "product_id");
  const hotmartProductId = param(requestUrl, "hotmart_product_id");
  let query = dataClient
    .from("norwyn_landing_registry")
    .select("campaign_key, landing_key, landing_name, landing_version, url, product_id, hotmart_product_id, environment, status, operation_mode, external_owner, monitor_frequency_minutes, metadata")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(30);
  if (campaignKey) query = query.eq("campaign_key", campaignKey);
  else if (productId) query = query.eq("product_id", productId);
  else if (hotmartProductId) query = query.eq("hotmart_product_id", hotmartProductId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(asEntry)
    .filter((entry: LandingRegistryEntry) => entry.campaign_key && entry.landing_key && entry.url && ["active", "monitored", "ACTIVE", "MONITORED"].includes(entry.status));
}

async function analyzeRemoteLanding(entry: LandingRegistryEntry) {
  const response = await fetch(entry.url, { cache: "no-store", redirect: "follow", headers: { "User-Agent": "NorwynGrowthReadiness/1.0 read-only" } });
  const html = await response.text();
  return analyzeLandingHtml(entry, html, response.status);
}

async function persistAnalysis(dataClient: SupabaseAny, tenantId: string, analysis: LandingAnalysis) {
  const entry = analysis.registry;
  const nextCheckAt = new Date(Date.now() + (entry.monitor_frequency_minutes ?? 720) * 60 * 1000).toISOString();
  const { data: landing, error: landingError } = await dataClient.from("norwyn_landing_registry").upsert({
    tenant_id: tenantId,
    campaign_key: entry.campaign_key,
    landing_key: entry.landing_key,
    landing_name: entry.landing_name,
    landing_version: entry.landing_version,
    url: entry.url,
    product_id: entry.product_id ?? null,
    hotmart_product_id: entry.hotmart_product_id ?? null,
    environment: entry.environment,
    status: entry.status,
    operation_mode: entry.operation_mode ?? "SHADOW",
    external_owner: entry.external_owner ?? "UNKNOWN",
    monitor_frequency_minutes: entry.monitor_frequency_minutes ?? 720,
    next_check_at: nextCheckAt,
    metadata: { ...(entry.metadata ?? {}), read_only: true },
    last_checked_at: analysis.fetchedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,campaign_key,landing_key" }).select("id").single();
  if (landingError) throw new Error(landingError.message);

  const { data: previous } = await dataClient
    .from("norwyn_landing_snapshots")
    .select("id, content_hash")
    .eq("tenant_id", tenantId)
    .eq("landing_id", landing.id)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: snapshot, error: snapshotError } = await dataClient.from("norwyn_landing_snapshots").insert({
    tenant_id: tenantId,
    landing_id: landing.id,
    campaign_key: entry.campaign_key,
    landing_key: entry.landing_key,
    url: entry.url,
    fetched_at: analysis.fetchedAt,
    status_code: analysis.statusCode,
    content_hash: analysis.contentHash,
    content_length: analysis.contentLength,
    extracted_json: analysis.extraction,
    qa_summary: analysis.preflight,
    previous_snapshot_id: previous?.id ?? null,
  }).select("id").single();
  if (snapshotError) throw new Error(snapshotError.message);

  if (analysis.issues.length) {
    const { error } = await dataClient.from("norwyn_landing_qa_issues").insert(analysis.issues.map((issue) => ({
      tenant_id: tenantId,
      landing_id: landing.id,
      snapshot_id: snapshot.id,
      campaign_key: entry.campaign_key,
      landing_key: entry.landing_key,
      rule_id: issue.ruleId,
      rule_version: issue.ruleVersion,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      evidence: issue.evidence,
    })));
    if (error) throw new Error(error.message);
  }

  const changed = previous?.content_hash && previous.content_hash !== analysis.contentHash;
  await dataClient.from("norwyn_landing_monitor_log").insert({
    tenant_id: tenantId,
    landing_id: landing.id,
    previous_snapshot_id: previous?.id ?? null,
    current_snapshot_id: snapshot.id,
    campaign_key: entry.campaign_key,
    landing_key: entry.landing_key,
    url: entry.url,
    status: changed ? "CHANGE_DETECTED" : "NO_CHANGE",
    changed_fields: changed ? ["content_hash"] : [],
    message: changed ? "Fingerprint mudou; pre-flight reprocessado." : "Snapshot recorrente sem mudanca de fingerprint.",
    detected_at: analysis.fetchedAt,
  });
  return { landingId: landing.id as string, snapshotId: snapshot.id as string, changedSincePrevious: previous?.content_hash ? Boolean(changed) : null };
}

function resolveLanding(value: string, entries: LandingRegistryEntry[]) {
  const text = value.toLowerCase();
  for (const entry of entries) {
    const url = entry.url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (text.includes(entry.landing_key.toLowerCase()) || text.includes(url)) return entry.landing_key;
  }
  return "UNKNOWN";
}

async function loadMappings(dataClient: SupabaseAny, tenantId: string, entries: LandingRegistryEntry[], requestUrl: URL) {
  const start = param(requestUrl, "start");
  const end = param(requestUrl, "end");
  let adsQuery = dataClient.from("instagram_ads_daily").select("campanha, anuncio, valor_gasto, impressoes, cliques, link_clicks, landing_page_views, destination_url, url_tags, landing_key, data_referencia").eq("tenant_id", tenantId).limit(1000);
  if (start) adsQuery = adsQuery.gte("data_referencia", start);
  if (end) adsQuery = adsQuery.lte("data_referencia", end);
  let salesQuery = dataClient.from("comercial_vendas").select("transaction_id, hotmart_product_id, source_sck, status_normalizado, valor_bruto, data_compra").eq("tenant_id", tenantId).limit(500);
  const hotmartIds = [...new Set(entries.map((entry) => entry.hotmart_product_id).filter(Boolean).map(String))];
  if (hotmartIds.length) salesQuery = salesQuery.in("hotmart_product_id", hotmartIds);
  if (start) salesQuery = salesQuery.gte("data_compra", start);
  if (end) salesQuery = salesQuery.lte("data_compra", end);
  const [ads, sales] = await Promise.all([adsQuery, salesQuery]);
  if (ads.error) throw new Error(ads.error.message);
  if (sales.error) throw new Error(sales.error.message);
  const adsRows = ads.data ?? [];
  const salesRows = sales.data ?? [];
  const metaMapping = entries.map((entry) => {
    const matches = adsRows.filter((row: Record<string, unknown>) => resolveLanding(`${row.destination_url ?? ""} ${row.url_tags ?? ""} ${row.landing_key ?? ""}`, entries) === entry.landing_key);
    return matches.length ? { landingKey: entry.landing_key, status: "FOUND" as const, evidence: `${matches.length} linhas em instagram_ads_daily contem evidencia da landing.` } : { landingKey: entry.landing_key, status: "LANDING VERSION UNKNOWN" as const, evidence: "Sem destination_url/url_tags/landing_key deterministico." };
  });
  const hotmartMapping = entries.map((entry) => {
    const matches = salesRows.filter((row: Record<string, unknown>) => resolveLanding(String(row.source_sck ?? ""), entries) === entry.landing_key);
    return matches.length ? { landingKey: entry.landing_key, status: "FOUND" as const, evidence: `${matches.length} transacoes Hotmart contem evidencia da landing.` } : { landingKey: entry.landing_key, status: "UNKNOWN" as const, evidence: "Nenhuma transacao consultada contem URL/chave da landing em source_sck." };
  });
  return { adsRows, salesRows, metaMapping, hotmartMapping };
}

function buildDynamicTracking(analyses: LandingAnalysis[]) {
  const required = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "campaign_key", "landing_key", "creative_key", "audience_key", "sck", "source_sck"];
  return analyses.map((analysis) => {
    const href = analysis.extraction.checkoutLinks[0]?.href ?? analysis.extraction.ctas.find((cta) => cta.href)?.href ?? null;
    const parsed = href ? new URL(href, analysis.registry.url) : null;
    return { landingKey: analysis.registry.landing_key, href, parameters: required.map((key) => ({ key, status: parsed?.searchParams.get(key) ? "PRESERVED" as const : href ? "LOST" as const : "UNKNOWN" as const, evidence: href ? `${key} ${parsed?.searchParams.get(key) ? "presente" : "nao apareceu"} no href estatico do CTA.` : "Nenhum href de CTA detectado." })) };
  });
}

function buildLandingPerformance(adsRows: Record<string, unknown>[], salesRows: Record<string, unknown>[], entries: LandingRegistryEntry[]) {
  return entries.map((entry) => {
    const ads = adsRows.filter((row) => resolveLanding(`${row.destination_url ?? ""} ${row.url_tags ?? ""} ${row.landing_key ?? ""}`, entries) === entry.landing_key);
    const sales = salesRows.filter((row) => ["APPROVED", "COMPLETED"].includes(String(row.status_normalizado ?? "").toUpperCase()) && resolveLanding(String(row.source_sck ?? ""), entries) === entry.landing_key);
    const spend = ads.length ? ads.reduce((sum, row) => sum + Number(row.valor_gasto ?? 0), 0) : null;
    const revenue = sales.length ? sales.reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0) : null;
    return { landingKey: entry.landing_key, spend, impressions: ads.length ? ads.reduce((sum, row) => sum + Number(row.impressoes ?? 0), 0) : null, linkClicks: ads.length ? ads.reduce((sum, row) => sum + Number(row.link_clicks ?? 0), 0) : null, metaLpv: ads.length ? ads.reduce((sum, row) => sum + Number(row.landing_page_views ?? 0), 0) : null, norwynViews: null, ctaViews: null, ctaClicks: null, checkout: null, purchases: sales.length || null, revenue, cpa: spend && sales.length ? spend / sales.length : null, roas: spend ? Number(revenue ?? 0) / spend : null, confidence: ads.length ? "HIGH" : sales.length ? "MEDIUM_HOTMART_ONLY" : "UNKNOWN" };
  });
}

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if ("error" in auth) return json({ error: auth.error }, auth.status);
  try {
    const requestUrl = new URL(request.url);
    const entries = await loadEntries(auth.dataClient, auth.tenantId, requestUrl);
    const analyses = await Promise.all(entries.map(analyzeRemoteLanding));
    const persisted = await Promise.all(analyses.map((analysis) => persistAnalysis(auth.dataClient, auth.tenantId, analysis)));
    const mappings = await loadMappings(auth.dataClient, auth.tenantId, entries, requestUrl);
    const period = `${param(requestUrl, "start") ?? "DADOS INDISPONIVEIS"} a ${param(requestUrl, "end") ?? "DADOS INDISPONIVEIS"}`;
    const report = buildLandingReadinessReportForContext(analyses, { campaignKey: param(requestUrl, "campaign_key") ?? entries[0]?.campaign_key, productName: "Contexto selecionado", period, operationMode: entries[0]?.operation_mode, externalOwner: entries[0]?.external_owner });
    const critical = analyses.reduce((sum, item) => sum + item.issues.filter((issue: LandingAnalysis["issues"][number]) => issue.severity === "CRITICAL" || issue.severity === "BLOCKER").length, 0);
    return json({
      ...report,
      metaMapping: mappings.metaMapping,
      hotmartMapping: mappings.hotmartMapping,
      dynamicTracking: buildDynamicTracking(analyses),
      metaResolutionDryRun: { rowsAnalyzed: mappings.adsRows.length, recoverable: mappings.metaMapping.filter((item) => item.status === "FOUND").length, unrecoverable: mappings.metaMapping.filter((item) => item.status !== "FOUND").length, v1: 0, v5: 0, other: 0, unknown: 0, high: 0, medium: 0, low: 0, byLanding: mappings.metaMapping.map((item) => ({ landingKey: item.landingKey, rows: item.status === "FOUND" ? 1 : 0 })) },
      landingPerformance: buildLandingPerformance(mappings.adsRows as Record<string, unknown>[], mappings.salesRows as Record<string, unknown>[], entries),
      creativeLandingPurchase: [],
      operationalAlerts: analyses.filter((analysis) => analysis.preflight.status === "NOT READY").map((analysis) => `Existe risco operacional se houver midia direcionando trafego para ${analysis.registry.landing_key}, pois a landing esta NOT READY.`),
      shadowOperation: { currentIncident: null, scorecard: [{ label: "Issues detected by Norwyn", value: String(analyses.reduce((sum, item) => sum + item.issues.length, 0)), note: "Inclui INFO/WARNING/CRITICAL." }, { label: "Critical issues", value: String(critical), note: "CRITICAL/BLOCKER abertos no pre-flight." }, { label: "Potential financial impact detected", value: money(0), note: "Nao calculado sem vinculo deterministico completo." }], takeoverReadiness: [{ domain: "Landing QA", status: analyses.length ? "READY" : "NOT READY", evidence: analyses.length ? "Registry -> snapshot -> QA ativo." : "NO LANDING REGISTERED." }, { domain: "Meta Ads Analytics", status: "PARTIAL", evidence: "Usa instagram_ads_daily; exige URL/tag para mapping." }, { domain: "Operational Execution", status: "NOT READY", evidence: "Read-only; exige aprovacao humana para alterar landing/campanha/verba." }], playbookRules: [] },
      monitoring: { active: analyses.length > 0, lastCheckedAt: analyses.map((item) => item.fetchedAt).sort().at(-1) ?? null, nextCheckAt: null, lastChangeAt: null, openIssues: critical, changeLog: [] },
      sourceHealth: [{ source: "LANDING REGISTRY", status: entries.length ? "OK" : "UNAVAILABLE", lastUpdatedAt: analyses.map((item) => item.fetchedAt).sort().at(-1) ?? null, detail: entries.length ? `${entries.length} landing(s) encontrada(s).` : "NO LANDING REGISTERED." }, { source: "META ADS", status: "PARTIAL", lastUpdatedAt: null, detail: "Fonte oficial: instagram_ads_daily." }, { source: "HOTMART", status: "PARTIAL", lastUpdatedAt: null, detail: "Fonte: comercial_vendas." }],
      persisted,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha ao analisar landings." }, 500);
  }
}
