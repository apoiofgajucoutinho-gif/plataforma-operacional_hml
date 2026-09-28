import "server-only";

import { redirect } from "next/navigation";
import { functionalRoleFor } from "@/lib/auth/roles";
import { getLandingAccess } from "@/modules/landing-pages/services/landing-pages-server";
import type { LandingDashboardContext, LandingDashboardItem, LandingMetric } from "@/modules/landing-pages/types";

type SupabaseAny = any;
type Params = Record<string, string | string[] | undefined>;

const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

const eventLabels: Record<string, string> = {
  page_view: "Página visualizada",
  landing_view: "Página visualizada",
  session_start: "Sessão iniciada",
  offer_view: "Oferta visualizada",
  checkout_click: "Clique no checkout",
  cta_click: "CTA acionado",
  cta_view: "CTA visualizado",
  section_view: "Seção visualizada",
  modules_view: "Módulos visualizados",
  module_open: "Módulo aberto",
  faq_open: "Pergunta aberta",
  scroll_25: "25% da página",
  scroll_50: "50% da página",
  scroll_75: "75% da página",
  scroll_90: "90% da página",
};

const sectionLabels: Record<string, string> = {
  header: "Cabeçalho",
  hero: "Hero",
  audience: "Para quem é",
  problem: "Problema",
  method: "Método",
  modules: "Conteúdo",
  authority: "Especialistas",
  testimonials: "Provas",
  offer: "Oferta",
  faq: "Dúvidas",
  final_cta: "CTA final",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function domainOf(value: string | null | undefined) {
  if (!value) return "Não disponível";
  try { return new URL(value, "https://norwyn.local").hostname || "Não disponível"; } catch { return "Não disponível"; }
}

function startOfTodaySaoPaulo(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day)) + SAO_PAULO_OFFSET_MS);
}

function resolvePeriod(params: Params) {
  const key = first(params.period) ?? "30d";
  const now = new Date();
  let start = new Date(now);
  let label = "Últimos 30 dias";
  if (key === "today") { start = startOfTodaySaoPaulo(now); label = "Hoje"; }
  else if (key === "7d") { start.setDate(start.getDate() - 7); label = "Últimos 7 dias"; }
  else if (key === "custom" && first(params.start) && first(params.end)) {
    start = new Date(`${first(params.start)}T00:00:00-03:00`);
    const customEnd = new Date(`${first(params.end)}T23:59:59.999-03:00`);
    return { key, label: `${first(params.start)} a ${first(params.end)}`, start, end: customEnd };
  } else { start.setDate(start.getDate() - 30); }
  return { key, label, start, end: now };
}

async function readAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function metric(current: number | null, previous: number | null): LandingMetric {
  return { value: current, previous };
}

function countBy(rows: any[], key: (row: any) => string) {
  const result = new Map<string, number>();
  for (const row of rows) result.set(key(row), (result.get(key(row)) ?? 0) + 1);
  return result;
}

function unique(rows: any[], key: (row: any) => string | null | undefined) {
  return new Set(rows.map(key).filter(Boolean)).size;
}

function eventSessions(rows: any[], eventNames: string[]) {
  return unique(rows.filter((row) => eventNames.includes(row.event_name)), (row) => row.session_id);
}

function isArchived(row: any) {
  return row?.metadata?.operational_visibility === "archived";
}

function isKnownTestTraffic(row: any) {
  const campaign = String(row.utm_campaign ?? "").toLowerCase();
  const source = String(row.utm_source ?? "").toLowerCase();
  const sck = String(row.sck ?? "").toLowerCase();
  const trafficType = String(row.payload?.traffic_type ?? "").toLowerCase();
  const host = domainOf(row.page_url);
  return trafficType === "test" || trafficType === "internal"
    || source === "codex_qa"
    || campaign.startsWith("codex_hml_qa_")
    || sck === "teste123" || sck === "qa_endpoint" || sck.startsWith("codex_")
    || host === "lp-ju.vercel.app" || host === "v0-zumbidoju.vercel.app";
}

function humanOrigin(sourceValue: string | null | undefined, mediumValue: string | null | undefined, contentValue: string | null | undefined) {
  const source = String(sourceValue ?? "").toLowerCase();
  const medium = String(mediumValue ?? "").toLowerCase();
  const content = String(contentValue ?? "").toLowerCase();
  if (source === "instagram" && content === "stories") return "Instagram · Stories";
  if (source === "instagram" && content === "bio") return "Instagram · Link da bio";
  if (source === "whatsapp" && (medium === "group" || content === "grupo_whatsapp")) return "WhatsApp · Grupo";
  if (source === "site" && content === "site_juliana") return "Site Juliana";
  if (source === "meta" && medium === "paid") return "Meta Ads";
  if (!source) return "Direto / sem identificação";
  return source.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type OfficialAttributionSource = {
  source: string;
  medium: string;
  content: string;
  displayName: string;
  campaign: string;
  sortOrder: number;
  active: boolean;
};

const officialAttributionSourcesByLanding: Record<string, OfficialAttributionSource[]> = {
  imersao_zumbido: [
    { source: "instagram", medium: "organic", content: "stories", displayName: "Instagram · Stories", campaign: "Imersão Zumbido", sortOrder: 1, active: true },
    { source: "instagram", medium: "organic", content: "bio", displayName: "Instagram · Link da bio", campaign: "Imersão Zumbido", sortOrder: 2, active: true },
    { source: "whatsapp", medium: "group", content: "grupo_whatsapp", displayName: "WhatsApp · Grupo", campaign: "Imersão Zumbido", sortOrder: 3, active: true },
    { source: "site", medium: "owned", content: "site_juliana", displayName: "Site Juliana", campaign: "Imersão Zumbido", sortOrder: 4, active: true },
    { source: "meta", medium: "paid", content: "ads", displayName: "Meta Ads", campaign: "Imersão Zumbido", sortOrder: 5, active: true },
    { source: "", medium: "", content: "", displayName: "Direto / sem identificação", campaign: "Sem campanha identificada", sortOrder: 6, active: true },
  ],
};

function attributionRows(landingKey: string, rows: any[], totalSessions: number) {
  const officialSources = (officialAttributionSourcesByLanding[landingKey] ?? []).filter((item) => item.active);
  const officialByName = new Map(officialSources.map((item) => [item.displayName, item]));
  const attributionMap = new Map<string, { source: string; campaign: string; sessions: Set<string>; checkoutClicks: number; sortOrder: number }>();
  const eligibleSessionIds = new Set(rows.filter((row) => ["session_start", "page_view", "landing_view"].includes(row.event_name)).map((row) => row.session_id).filter(Boolean));
  const sessionOrigins = new Map<string, { source: string; campaign: string; sortOrder: number; score: number }>();

  for (const item of officialSources) {
    attributionMap.set(`official:${item.sortOrder}`, {
      source: item.displayName,
      campaign: item.campaign,
      sessions: new Set<string>(),
      checkoutClicks: 0,
      sortOrder: item.sortOrder,
    });
  }

  function originFor(row: any) {
    const source = humanOrigin(row.utm_source, row.utm_medium, row.utm_content);
    const official = officialByName.get(source);
    const campaign = official?.campaign ?? row.utm_campaign ?? row.campaign_key ?? "Sem campanha identificada";
    const key = official ? `official:${official.sortOrder}` : `extra:${source}::${campaign}`;
    const sortOrder = official?.sortOrder ?? officialSources.length + attributionMap.size + 1;
    return { source, campaign, key, sortOrder };
  }

  function ensureAttributionItem(origin: ReturnType<typeof originFor>) {
    const item = attributionMap.get(origin.key) ?? {
      source: origin.source,
      campaign: origin.campaign,
      sessions: new Set<string>(),
      checkoutClicks: 0,
      sortOrder: origin.sortOrder,
    };
    attributionMap.set(origin.key, item);
    return item;
  }

  for (const row of rows) {
    if (!row.session_id || !eligibleSessionIds.has(row.session_id)) continue;
    const origin = originFor(row);
    const identified = origin.source !== "Direto / sem identificação";
    const entryEvent = row.event_name === "session_start" ? 2 : ["page_view", "landing_view"].includes(row.event_name) ? 1 : 0;
    const score = (identified ? 10 : 0) + entryEvent;
    const current = sessionOrigins.get(row.session_id);
    if (!current || score > current.score) {
      sessionOrigins.set(row.session_id, { source: origin.source, campaign: origin.campaign, sortOrder: origin.sortOrder, score });
    }
  }

  for (const [sessionId, sessionOrigin] of sessionOrigins) {
    const official = officialByName.get(sessionOrigin.source);
    const key = official ? `official:${official.sortOrder}` : `extra:${sessionOrigin.source}::${sessionOrigin.campaign}`;
    ensureAttributionItem({ ...sessionOrigin, key }).sessions.add(sessionId);
  }

  for (const row of rows) {
    if (row.event_name !== "checkout_click") continue;
    let origin = originFor(row);
    if (origin.source === "Direto / sem identificação" && row.session_id) {
      const sessionOrigin = sessionOrigins.get(row.session_id);
      if (sessionOrigin) {
        const official = officialByName.get(sessionOrigin.source);
        origin = {
          source: sessionOrigin.source,
          campaign: sessionOrigin.campaign,
          key: official ? `official:${official.sortOrder}` : `extra:${sessionOrigin.source}::${sessionOrigin.campaign}`,
          sortOrder: sessionOrigin.sortOrder,
        };
      }
    }
    const item = ensureAttributionItem(origin);
    item.checkoutClicks += 1;
  }

  return [...attributionMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      source: item.source,
      campaign: item.campaign,
      sessions: item.sessions.size,
      sessionShare: totalSessions ? (item.sessions.size / totalSessions) * 100 : 0,
      checkoutClicks: item.checkoutClicks,
    }));
}

function landingIdentity(key: string) {
  if (key === "imersao_zumbido") return { name: "Imersão Zumbido", productName: "Imersão Zumbido", campaign: "Imersão Zumbido", url: "https://imersaozumbido.fgajulianacoutinho.com.br", status: "active" };
  return { name: key.replace(/[-_]/g, " "), productName: "Não vinculado", campaign: "Não informada", url: null, status: "tracking" };
}

export async function getLandingDashboardContext(params: Params): Promise<LandingDashboardContext> {
  const access = await getLandingAccess();
  if (!access) redirect("/login");
  const role = functionalRoleFor(access.role);
  if (role !== "ADMIN" && role !== "ESPECIALISTA") {
    return emptyContext(access.role, access.allowedModules, "Seu perfil não possui acesso a Landing Pages.");
  }

  const client: SupabaseAny = access.client;
  const tenantId = access.tenantId;
  const period = resolvePeriod(params);
  const duration = Math.max(1, period.end.getTime() - period.start.getTime());
  const previousStart = new Date(period.start.getTime() - duration);
  const selectedKeyParam = first(params.lp);
  const includeTest = role === "ADMIN" && first(params.include_test) === "1";

  const [definitionsResult, registryResult, productsResult, knowledgeProductsResult, allTracking] = await Promise.all([
    client.from("landing_page_definitions").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    client.from("norwyn_landing_registry").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    client.from("catalog_products").select("id,name").eq("tenant_id", tenantId),
    client.from("products").select("id,nome_oficial").eq("tenant_id", tenantId),
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("landing_key,landing_version,environment,product_key,campaign_key,page_url,event_name,occurred_at")
      .eq("tenant_id", tenantId).eq("source_type", "REAL").order("occurred_at", { ascending: false }).range(from, to)),
  ]);
  if (definitionsResult.error) throw new Error(definitionsResult.error.message);
  if (registryResult.error) throw new Error(registryResult.error.message);
  if (productsResult.error) throw new Error(productsResult.error.message);
  if (knowledgeProductsResult.error) throw new Error(knowledgeProductsResult.error.message);

  const definitionRows = definitionsResult.data ?? [];
  const registryRows = registryResult.data ?? [];
  const archivedLandingKeys = new Set<string>([
    ...definitionRows.filter((row: any) => isArchived(row)).map((row: any) => String(row.landing_key)),
    ...registryRows.filter((row: any) => isArchived(row)).map((row: any) => String(row.landing_key)),
  ]);
  const definitions = definitionRows.filter((row: any) => !isArchived(row));
  const registry = registryRows.filter((row: any) => !isArchived(row));
  const products = productsResult.data ?? [];
  const productById = new Map<string, string>([
    ...products.map((product: any) => [String(product.id), String(product.name)] as [string, string]),
    ...(knowledgeProductsResult.data ?? []).map((product: any) => [String(product.id), String(product.nome_oficial)] as [string, string]),
  ]);
  const byKey = new Map<string, LandingDashboardItem>();

  for (const row of registry) {
    byKey.set(row.landing_key, {
      landingKey: row.landing_key, name: row.landing_name, productId: row.product_id,
      productName: productById.get(row.product_id) ?? "Não vinculado", campaign: row.campaign_key || "Não informada",
      environment: String(row.environment || "Não informado").toUpperCase(), status: row.status,
      url: row.url, domain: domainOf(row.url), version: row.landing_version, source: "registry",
    });
  }
  for (const row of definitions) {
    const current = byKey.get(row.landing_key);
    byKey.set(row.landing_key, {
      landingKey: row.landing_key, name: row.name, productId: row.product_id ?? current?.productId ?? null,
      productName: productById.get(row.product_id) ?? current?.productName ?? "Não vinculado",
      campaign: current?.campaign ?? String(row.metadata?.campaign ?? "Não informada"),
      environment: row.current_environment ?? current?.environment ?? "Não informado", status: row.status,
      url: current?.url ?? (String(row.preview_path ?? "").startsWith("http") ? row.preview_path : null),
      domain: current?.domain ?? domainOf(row.preview_path), version: current?.version ?? null, source: "definition",
    });
  }
  for (const event of allTracking) {
    if (!event.landing_key || byKey.has(event.landing_key) || archivedLandingKeys.has(String(event.landing_key))) continue;
    const identity = landingIdentity(event.landing_key);
    const url = event.landing_key === "imersao_zumbido" ? identity.url : event.page_url;
    byKey.set(event.landing_key, {
      landingKey: event.landing_key, name: identity.name, productId: event.product_key ?? null,
      productName: productById.get(event.product_key) ?? identity.productName,
      campaign: event.landing_key === "imersao_zumbido" ? identity.campaign : event.campaign_key || "Não informada",
      environment: String(event.environment || "Não informado").toUpperCase(), status: identity.status,
      url, domain: domainOf(url), version: event.landing_version ?? null, source: "tracking",
    });
  }

  const landings = [...byKey.values()].sort((a, b) => a.landingKey === "imersao_zumbido" ? -1 : b.landingKey === "imersao_zumbido" ? 1 : a.name.localeCompare(b.name, "pt-BR"));
  const selected = byKey.get(selectedKeyParam ?? "imersao_zumbido") ?? landings[0] ?? null;
  if (!selected) return emptyContext(access.role, access.allowedModules, "Nenhuma landing page cadastrada ou rastreada.");

  const [rawEvents, rawPreviousEvents] = await Promise.all([
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("id,event_name,session_id,utm_source,utm_medium,utm_campaign,utm_content,sck,campaign_key,block_id,cta_id,page_url,payload,source_type,occurred_at")
      .eq("tenant_id", tenantId).eq("landing_key", selected.landingKey)
      .gte("occurred_at", period.start.toISOString()).lte("occurred_at", period.end.toISOString())
      .order("occurred_at", { ascending: false }).range(from, to)),
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("event_name,session_id,utm_source,utm_campaign,utm_content,sck,page_url,payload,source_type,occurred_at")
      .eq("tenant_id", tenantId).eq("landing_key", selected.landingKey)
      .gte("occurred_at", previousStart.toISOString()).lt("occurred_at", period.start.toISOString())
      .order("occurred_at", { ascending: false }).range(from, to)),
  ]);
  const publicEvents = rawEvents.filter((row) => row.source_type === "REAL" && !isKnownTestTraffic(row));
  const events = includeTest ? rawEvents : publicEvents;
  const previousEvents = includeTest ? rawPreviousEvents : rawPreviousEvents.filter((row) => row.source_type === "REAL" && !isKnownTestTraffic(row));
  const excludedEvents = rawEvents.length - events.length;

  const definition = definitions.find((row: any) => row.landing_key === selected.landingKey) ?? null;
  const registryRow = registry.find((row: any) => row.landing_key === selected.landingKey) ?? null;
  const pageNames = ["page_view", "landing_view"];
  const visitorCount = unique(events.filter((row) => pageNames.includes(row.event_name)), (row) => row.payload?.visitor_id);
  const previousVisitorCount = unique(previousEvents.filter((row) => pageNames.includes(row.event_name)), (row) => row.payload?.visitor_id);
  const sessionCount = eventSessions(events, ["session_start", ...pageNames]);
  const previousSessionCount = eventSessions(previousEvents, ["session_start", ...pageNames]);
  const pageViews = events.filter((row) => pageNames.includes(row.event_name)).length;
  const previousPageViews = previousEvents.filter((row) => pageNames.includes(row.event_name)).length;
  const offerViews = events.filter((row) => row.event_name === "offer_view").length;
  const previousOfferViews = previousEvents.filter((row) => row.event_name === "offer_view").length;
  const checkoutSessions = eventSessions(events, ["checkout_click"]);
  const previousCheckoutSessions = eventSessions(previousEvents, ["checkout_click"]);
  const conversion = sessionCount ? (checkoutSessions / sessionCount) * 100 : null;
  const previousConversion = previousSessionCount ? (previousCheckoutSessions / previousSessionCount) * 100 : null;

  const eventCounts = countBy(events, (row) => row.event_name);
  const dailyMap = new Map<string, { date: string; pageViews: number; sessions: Set<string>; checkoutClicks: number }>();
  for (const row of events) {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(row.occurred_at));
    const item = dailyMap.get(date) ?? { date, pageViews: 0, sessions: new Set<string>(), checkoutClicks: 0 };
    if (pageNames.includes(row.event_name)) item.pageViews += 1;
    if (row.session_id) item.sessions.add(row.session_id);
    if (row.event_name === "checkout_click") item.checkoutClicks += 1;
    dailyMap.set(date, item);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({ ...item, sessions: item.sessions.size }));
  const sectionRows = events.filter((row) => row.event_name === "section_view" && row.block_id);
  const sectionCounts = countBy(sectionRows, (row) => row.block_id);
  const sections = [...sectionCounts.entries()].map(([id, views]) => ({ id, label: sectionLabels[id] ?? id, views, share: sessionCount ? (views / sessionCount) * 100 : null })).sort((a, b) => b.views - a.views);
  const publicSessionCount = eventSessions(publicEvents, ["session_start", ...pageNames]);
  const attribution = attributionRows(selected.landingKey, publicEvents, publicSessionCount);

  const registryId = registryRow?.id ?? null;
  const catalogProductId = definition?.metadata?.catalog_product_id ?? selected.productId;
  const [snapshotResult, monitorResult, issuesResult, versionsResult, qaResult, approvalsResult, linksResult, historyResult, assetsResult] = await Promise.all([
    registryId ? client.from("norwyn_landing_snapshots").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).order("fetched_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    registryId ? client.from("norwyn_landing_monitor_log").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).order("detected_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    registryId ? client.from("norwyn_landing_qa_issues").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).eq("status", "open").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_versions").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_qa_runs").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("completed_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_approvals").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("requested_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    catalogProductId ? client.from("catalog_sales_links").select("*").eq("tenant_id", tenantId).eq("product_id", catalogProductId).order("is_main_link", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    catalogProductId ? client.from("catalog_link_history").select("*").eq("tenant_id", tenantId).eq("product_id", catalogProductId).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
    client.from("digital_assets").select("*").eq("tenant_id", tenantId).contains("metadata", { landing_key: selected.landingKey }),
  ]);
  const healthAssets = assetsResult.data ?? [];
  const healthAssetIds = healthAssets.map((asset: any) => asset.id);
  const healthChecksResult = healthAssetIds.length
    ? await client.from("presence_checks").select("*").eq("tenant_id", tenantId).in("asset_id", healthAssetIds).order("checked_at", { ascending: false }).limit(200)
    : { data: [], error: null };
  const healthChecks = healthChecksResult.data ?? [];
  const snapshot = snapshotResult.data;
  const checkoutLinks = linksResult.data ?? [];
  const checkout = checkoutLinks.find((link: any) => link.hotmart_offer_id === "lov69pen") ?? checkoutLinks.find((link: any) => link.is_main_link) ?? checkoutLinks[0] ?? null;
  const openIssues = issuesResult.data ?? [];
  const monitorAlerts = (monitorResult.data ?? []).filter((item: any) => item.status !== "NO_CHANGE");
  const divergenceEvents = (historyResult.data ?? []).filter((item: any) => item.event_type === "commercial_divergence_detected");
  const eventErrors = events.filter((row) => /error|fail|exception/i.test(row.event_name));
  const extracted = snapshot?.extracted_json ?? {};
  const lastEventAt = events[0]?.occurred_at ?? allTracking.find((row) => row.landing_key === selected.landingKey)?.occurred_at ?? null;
  const latestHealthQa = (qaResult.data ?? []).find((item: any) => item.technical_results?.schema_version === "landing_health_v1") ?? null;
  const healthView = buildHealthView({ assets: healthAssets, checks: healthChecks, qaRun: latestHealthQa, lastEventAt });

  return {
    role: access.role,
    roleMode: role,
    allowedModules: access.allowedModules.includes("landing-pages") ? access.allowedModules : [...access.allowedModules, "landing-pages"],
    diagnostic: null,
    period: { key: period.key, label: period.label, start: period.start.toISOString(), end: period.end.toISOString(), comparisonAvailable: previousEvents.length > 0 },
    traffic: { includesTest: includeTest, excludedEvents },
    filters: {
      products: [...new Set(landings.map((item) => item.productName))].sort(), campaigns: [...new Set(landings.map((item) => item.campaign))].sort(),
      environments: [...new Set(landings.map((item) => item.environment))].sort(), statuses: [...new Set(landings.map((item) => item.status))].sort(),
      domains: [...new Set(landings.map((item) => item.domain))].sort(),
    },
    landings,
    selected,
    metrics: {
      visitors: metric(visitorCount || (events.length ? null : 0), previousEvents.length ? previousVisitorCount : null),
      sessions: metric(sessionCount, previousEvents.length ? previousSessionCount : null),
      pageViews: metric(pageViews, previousEvents.length ? previousPageViews : null),
      offerViews: metric(offerViews, previousEvents.length ? previousOfferViews : null),
      checkoutClicks: metric(checkoutSessions, previousEvents.length ? previousCheckoutSessions : null),
      conversionRate: metric(conversion, previousEvents.length ? previousConversion : null),
    },
    daily,
    funnel: [
      { label: "Sessões", value: sessionCount, rate: sessionCount ? 100 : null },
      { label: "Oferta visualizada", value: eventSessions(events, ["offer_view"]), rate: sessionCount ? (eventSessions(events, ["offer_view"]) / sessionCount) * 100 : null },
      { label: "Checkout", value: checkoutSessions, rate: sessionCount ? (checkoutSessions / sessionCount) * 100 : null },
    ],
    topEvents: [...eventCounts.entries()].map(([name, total]) => ({ name, total, sessions: eventSessions(events.filter((row) => row.event_name === name), [name]) })).sort((a, b) => b.total - a.total).slice(0, 10),
    sections,
    attribution,
    recentEvents: events.slice(0, 50).map((row) => ({ id: row.id, name: row.event_name, label: eventLabels[row.event_name] ?? row.event_name, occurredAt: row.occurred_at, section: row.block_id ? sectionLabels[row.block_id] ?? row.block_id : null, source: humanOrigin(row.utm_source, row.utm_medium, row.utm_content) })),
    content: {
      title: selected.name,
      summary: selected.landingKey === "imersao_zumbido" ? "Página da Imersão Zumbido com oferta clínica, módulos, especialistas, provas, checkout e dúvidas frequentes." : String(definition?.metadata?.change_summary ?? extracted?.headline?.value ?? "Aguardando conteúdo estruturado."),
      checkoutUrl: checkout?.checkout_url ?? (selected.landingKey === "imersao_zumbido" ? "https://pay.hotmart.com/B47092539B?off=lov69pen" : null),
      hotmartProductId: checkout?.hotmart_product_id ?? (selected.landingKey === "imersao_zumbido" ? "B47092539B" : registryRow?.hotmart_product_id ?? null),
      hotmartOfferId: checkout?.hotmart_offer_id ?? (selected.landingKey === "imersao_zumbido" ? "lov69pen" : null),
      previewUrl: selected.url,
    },
    health: {
      overallStatus: healthView.overallStatus,
      overallLabel: healthView.overallLabel,
      guidance: healthView.guidance,
      availability: snapshot?.status_code ? (snapshot.status_code < 400 ? "Disponível" : "Com problema") : "Aguardando monitoramento",
      httpStatus: snapshot?.status_code ?? null,
      lastCheckedAt: snapshot?.fetched_at ?? registryRow?.last_checked_at ?? null,
      domain: selected.domain,
      checkout: checkout ? healthLabel(checkout.technical_health) : "Aguardando dados",
      checkoutCheckedAt: checkout?.last_checked_at ?? null,
      links: Array.isArray(extracted?.ctas) || checkout ? "Links identificados" : "Aguardando dados",
      images: snapshot ? (Number(snapshot.content_length ?? 0) > 0 ? "Página capturada" : "Revisar") : "Não disponível",
      tracking: events.length || lastEventAt ? "Recebendo eventos" : "Aguardando dados",
      recentEventAt: lastEventAt,
      errors: events.length ? eventErrors.length : null,
      seo: extracted?.title ? "Título identificado" : "Não disponível",
      technicalPerformance: "Não disponível",
      publishedIntegrity: snapshot?.content_hash ? "Snapshot disponível" : "Aguardando snapshot",
      components: healthView.components,
      diagnostics: healthView.diagnostics,
      divergences: divergenceEvents.map((item: any) => item.reason || "Divergência comercial registrada"),
      alerts: [...openIssues.map((item: any) => item.title), ...monitorAlerts.map((item: any) => item.message || "Alteração detectada")].slice(0, 12),
    },
    versions: (versionsResult.data ?? []).map((item: any) => ({ id: item.id, version: item.version, status: item.status, summary: item.change_summary || "Sem resumo", createdAt: item.created_at })),
    qa: (qaResult.data ?? []).map((item: any) => ({ id: item.id, status: item.status, passed: item.passed_tests ?? 0, warnings: item.warning_tests ?? 0, blockers: item.blocker_tests ?? 0, completedAt: item.completed_at })),
    approvals: (approvalsResult.data ?? []).map((item: any) => ({ id: item.id, type: item.approval_type, decision: item.decision, requestedAt: item.requested_at, decidedAt: item.decided_at })),
  };
}

type HealthViewState = "healthy" | "warning" | "critical" | "unknown";

function normalizedHealthState(value: unknown): HealthViewState {
  return value === "healthy" || value === "warning" || value === "critical" ? value : "unknown";
}

function buildHealthView({ assets, checks, qaRun, lastEventAt }: { assets: any[]; checks: any[]; qaRun: any; lastEventAt: string | null }) {
  const latestByAsset = new Map<string, any>();
  for (const check of checks) {
    if (!latestByAsset.has(String(check.asset_id))) latestByAsset.set(String(check.asset_id), check);
  }
  const linkSummaries = new Map<string, any>((qaRun?.technical_results?.campaign_links ?? []).map((item: any) => [String(item.key), item]));
  const componentOrder: Record<string, number> = { page: 1, checkout: 2, tracking: 3, stories: 4, bio: 5, whatsapp: 6, site: 7, ads: 8 };
  const labels: Record<string, string> = { page: "Página", checkout: "Checkout", tracking: "Tracking", stories: "Stories", bio: "Bio", whatsapp: "WhatsApp", site: "Site", ads: "Ads" };
  const components: LandingDashboardContext["health"]["components"] = [];
  const diagnostics: LandingDashboardContext["health"]["diagnostics"] = [];

  for (const asset of assets) {
    const component = String(asset.metadata?.component ?? "");
    const key = component === "campaign_link" ? String(asset.metadata?.route_key ?? asset.id) : component;
    if (!key || !labels[key]) continue;
    const check = latestByAsset.get(String(asset.id));
    const summary = linkSummaries.get(key);
    const status = normalizedHealthState(summary?.state ?? check?.status);
    const message = summary?.message
      ?? (status === "healthy" ? `${labels[key]} funcionando normalmente.` : status === "critical" ? `${labels[key]} com problema. É necessário revisar.` : status === "warning" ? `${labels[key]} precisa de atenção.` : `${labels[key]} ainda não foi verificado.`);
    const landingHealth = check?.result_json?.landing_health ?? {};
    const expectedOrigin = landingHealth.expected_origin
      ? [landingHealth.expected_origin.source, landingHealth.expected_origin.medium, landingHealth.expected_origin.content].filter(Boolean).join(" · ")
      : null;
    const observedOrigin = landingHealth.observed_origin
      ? [landingHealth.observed_origin.source, landingHealth.observed_origin.medium, landingHealth.observed_origin.content].filter(Boolean).join(" · ")
      : null;
    components.push({ key, label: labels[key], status, lastCheckedAt: summary?.checkedAt ?? check?.checked_at ?? null, message });
    diagnostics.push({
      key,
      label: labels[key],
      url: String(asset.url ?? ""),
      status,
      httpStatus: check?.http_status ?? summary?.httpStatus ?? null,
      redirectChain: Array.isArray(check?.redirect_chain) ? check.redirect_chain : Array.isArray(landingHealth.redirect_chain) ? landingHealth.redirect_chain : [],
      sslOk: typeof check?.ssl_ok === "boolean" ? check.ssl_ok : null,
      sslExpiresAt: check?.ssl_expires_at ?? null,
      responseTimeMs: check?.response_time_ms ?? summary?.responseTimeMs ?? null,
      expectedOrigin,
      observedOrigin,
      expectedCheckout: landingHealth.checkout_expected ?? asset.metadata?.expected_checkout ?? null,
      observedCheckout: typeof landingHealth.checkout_observed === "boolean" ? landingHealth.checkout_observed : null,
      tracking: typeof landingHealth.tracking_recent === "boolean" ? landingHealth.tracking_recent : null,
      error: check?.error_message ?? null,
      evidence: landingHealth,
    });
  }

  const trackingStatus = normalizedHealthState(qaRun?.technical_results?.tracking?.status);
  components.push({
    key: "tracking",
    label: labels.tracking,
    status: trackingStatus,
    lastCheckedAt: qaRun?.completed_at ?? lastEventAt,
    message: trackingStatus === "healthy" ? "Tracking recebendo eventos reais." : trackingStatus === "warning" ? "Tracking sem evento real recente; revisar se a campanha está ativa." : "Tracking ainda não foi verificado.",
  });
  diagnostics.push({
    key: "tracking", label: labels.tracking, url: "", status: trackingStatus, httpStatus: null, redirectChain: [], sslOk: null,
    sslExpiresAt: null, responseTimeMs: null, expectedOrigin: null, observedOrigin: null, expectedCheckout: null, observedCheckout: null,
    tracking: trackingStatus === "healthy", error: null, evidence: qaRun?.technical_results?.tracking ?? {},
  });

  components.sort((a, b) => (componentOrder[a.key] ?? 99) - (componentOrder[b.key] ?? 99));
  diagnostics.sort((a, b) => (componentOrder[a.key] ?? 99) - (componentOrder[b.key] ?? 99));
  const computed = components.some((item) => item.status === "critical") ? "critical"
    : components.some((item) => item.status === "warning") ? "warning"
      : components.length && components.every((item) => item.status === "healthy") ? "healthy" : "unknown";
  const overallStatus = normalizedHealthState(qaRun?.technical_results?.overall ?? computed);
  const overallLabel = overallStatus === "healthy" ? "Saudável" : overallStatus === "warning" ? "Atenção" : overallStatus === "critical" ? "Crítico" : "Aguardando verificação";
  const problem = components.find((item) => item.status === "critical") ?? components.find((item) => item.status === "warning");
  const guidance = problem ? `${problem.label} precisa de revisão. ${problem.message}` : overallStatus === "healthy" ? "Página, checkout, tracking e links de entrada funcionando." : null;
  return { overallStatus, overallLabel, guidance, components, diagnostics };
}

function healthLabel(value: string | null | undefined) {
  const labels: Record<string, string> = { funcionando: "Funcionando", redirecionando: "Redirecionando", quebrado: "Quebrado", indisponivel: "Indisponível", nao_verificado: "Não verificado" };
  return labels[value ?? ""] ?? "Aguardando dados";
}

function emptyContext(role: string | null, allowedModules: string[], diagnostic: string): LandingDashboardContext {
  const emptyMetric = metric(null, null);
  return {
    role, roleMode: functionalRoleFor(role) === "ADMIN" ? "ADMIN" : "ESPECIALISTA", allowedModules, diagnostic,
    period: { key: "30d", label: "Últimos 30 dias", start: new Date().toISOString(), end: new Date().toISOString(), comparisonAvailable: false }, traffic: { includesTest: false, excludedEvents: 0 },
    filters: { products: [], campaigns: [], environments: [], statuses: [], domains: [] }, landings: [], selected: null,
    metrics: { visitors: emptyMetric, sessions: emptyMetric, pageViews: emptyMetric, offerViews: emptyMetric, checkoutClicks: emptyMetric, conversionRate: emptyMetric },
    daily: [], funnel: [], topEvents: [], sections: [], attribution: [], recentEvents: [],
    content: { title: "Landing Pages", summary: "Aguardando dados", checkoutUrl: null, hotmartProductId: null, hotmartOfferId: null, previewUrl: null },
    health: { overallStatus: "unknown", overallLabel: "Aguardando dados", guidance: null, availability: "Aguardando dados", httpStatus: null, lastCheckedAt: null, domain: "Não disponível", checkout: "Aguardando dados", checkoutCheckedAt: null, links: "Aguardando dados", images: "Aguardando dados", tracking: "Aguardando dados", recentEventAt: null, errors: null, seo: "Não disponível", technicalPerformance: "Não disponível", publishedIntegrity: "Aguardando dados", components: [], diagnostics: [], divergences: [], alerts: [] },
    versions: [], qa: [], approvals: [],
  };
}
