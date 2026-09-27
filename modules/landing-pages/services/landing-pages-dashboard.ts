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

function landingIdentity(key: string) {
  if (key === "imersao_zumbido") return { name: "Imersão Zumbido", productName: "Imersão Zumbido", campaign: "Imersão Zumbido", url: "https://lp-ju.vercel.app", status: "active" };
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

  const [definitionsResult, registryResult, productsResult, allTracking] = await Promise.all([
    client.from("landing_page_definitions").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    client.from("norwyn_landing_registry").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    client.from("catalog_products").select("id,name").eq("tenant_id", tenantId),
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("landing_key,landing_version,environment,product_key,campaign_key,page_url,event_name,occurred_at")
      .eq("tenant_id", tenantId).eq("source_type", "REAL").order("occurred_at", { ascending: false }).range(from, to)),
  ]);
  if (definitionsResult.error) throw new Error(definitionsResult.error.message);
  if (registryResult.error) throw new Error(registryResult.error.message);
  if (productsResult.error) throw new Error(productsResult.error.message);

  const definitions = definitionsResult.data ?? [];
  const registry = registryResult.data ?? [];
  const products = productsResult.data ?? [];
  const productById = new Map<string, string>(products.map((product: any) => [String(product.id), String(product.name)]));
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
    if (!event.landing_key || byKey.has(event.landing_key)) continue;
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

  const [events, previousEvents] = await Promise.all([
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("id,event_name,session_id,utm_source,utm_medium,utm_campaign,campaign_key,block_id,cta_id,page_url,payload,occurred_at")
      .eq("tenant_id", tenantId).eq("landing_key", selected.landingKey).eq("source_type", "REAL")
      .gte("occurred_at", period.start.toISOString()).lte("occurred_at", period.end.toISOString())
      .order("occurred_at", { ascending: false }).range(from, to)),
    readAll((from, to) => client.from("landing_page_tracking_events")
      .select("event_name,session_id,payload,occurred_at")
      .eq("tenant_id", tenantId).eq("landing_key", selected.landingKey).eq("source_type", "REAL")
      .gte("occurred_at", previousStart.toISOString()).lt("occurred_at", period.start.toISOString())
      .order("occurred_at", { ascending: false }).range(from, to)),
  ]);

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
  const attributionMap = new Map<string, { source: string; campaign: string; sessions: Set<string>; checkoutClicks: number }>();
  for (const row of events) {
    const source = row.utm_source || "Direto / não identificado";
    const campaign = row.utm_campaign || row.campaign_key || "Sem campanha identificada";
    const key = `${source}::${campaign}`;
    const item = attributionMap.get(key) ?? { source, campaign, sessions: new Set<string>(), checkoutClicks: 0 };
    if (row.session_id) item.sessions.add(row.session_id);
    if (row.event_name === "checkout_click") item.checkoutClicks += 1;
    attributionMap.set(key, item);
  }

  const registryId = registryRow?.id ?? null;
  const [snapshotResult, monitorResult, issuesResult, versionsResult, qaResult, approvalsResult, linksResult, historyResult] = await Promise.all([
    registryId ? client.from("norwyn_landing_snapshots").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).order("fetched_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    registryId ? client.from("norwyn_landing_monitor_log").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).order("detected_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    registryId ? client.from("norwyn_landing_qa_issues").select("*").eq("tenant_id", tenantId).eq("landing_id", registryId).eq("status", "open").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_versions").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_qa_runs").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("completed_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    definition ? client.from("landing_page_approvals").select("*").eq("tenant_id", tenantId).eq("landing_id", definition.id).order("requested_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    selected.productId ? client.from("catalog_sales_links").select("*").eq("tenant_id", tenantId).eq("product_id", selected.productId).order("is_main_link", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    selected.productId ? client.from("catalog_link_history").select("*").eq("tenant_id", tenantId).eq("product_id", selected.productId).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [], error: null }),
  ]);
  const snapshot = snapshotResult.data;
  const checkoutLinks = linksResult.data ?? [];
  const checkout = checkoutLinks.find((link: any) => link.hotmart_offer_id === "lov69pen") ?? checkoutLinks.find((link: any) => link.is_main_link) ?? checkoutLinks[0] ?? null;
  const openIssues = issuesResult.data ?? [];
  const monitorAlerts = (monitorResult.data ?? []).filter((item: any) => item.status !== "NO_CHANGE");
  const divergenceEvents = (historyResult.data ?? []).filter((item: any) => item.event_type === "commercial_divergence_detected");
  const eventErrors = events.filter((row) => /error|fail|exception/i.test(row.event_name));
  const extracted = snapshot?.extracted_json ?? {};
  const lastEventAt = events[0]?.occurred_at ?? allTracking.find((row) => row.landing_key === selected.landingKey)?.occurred_at ?? null;

  return {
    role: access.role,
    roleMode: role,
    allowedModules: access.allowedModules.includes("landing-pages") ? access.allowedModules : [...access.allowedModules, "landing-pages"],
    diagnostic: null,
    period: { key: period.key, label: period.label, start: period.start.toISOString(), end: period.end.toISOString(), comparisonAvailable: previousEvents.length > 0 },
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
    attribution: [...attributionMap.values()].map((item) => ({ source: item.source, campaign: item.campaign, sessions: item.sessions.size, checkoutClicks: item.checkoutClicks })).sort((a, b) => b.sessions - a.sessions),
    recentEvents: events.slice(0, 50).map((row) => ({ id: row.id, name: row.event_name, label: eventLabels[row.event_name] ?? row.event_name, occurredAt: row.occurred_at, section: row.block_id ? sectionLabels[row.block_id] ?? row.block_id : null, source: row.utm_source || "Direto / não identificado" })),
    content: {
      title: selected.name,
      summary: selected.landingKey === "imersao_zumbido" ? "Página da Imersão Zumbido com oferta clínica, módulos, especialistas, provas, checkout e dúvidas frequentes." : String(definition?.metadata?.change_summary ?? extracted?.headline?.value ?? "Aguardando conteúdo estruturado."),
      checkoutUrl: checkout?.checkout_url ?? (selected.landingKey === "imersao_zumbido" ? "https://pay.hotmart.com/B47092539B?off=lov69pen" : null),
      hotmartProductId: checkout?.hotmart_product_id ?? (selected.landingKey === "imersao_zumbido" ? "B47092539B" : registryRow?.hotmart_product_id ?? null),
      hotmartOfferId: checkout?.hotmart_offer_id ?? (selected.landingKey === "imersao_zumbido" ? "lov69pen" : null),
      previewUrl: selected.url,
    },
    health: {
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
      divergences: divergenceEvents.map((item: any) => item.reason || "Divergência comercial registrada"),
      alerts: [...openIssues.map((item: any) => item.title), ...monitorAlerts.map((item: any) => item.message || "Alteração detectada")].slice(0, 12),
    },
    versions: (versionsResult.data ?? []).map((item: any) => ({ id: item.id, version: item.version, status: item.status, summary: item.change_summary || "Sem resumo", createdAt: item.created_at })),
    qa: (qaResult.data ?? []).map((item: any) => ({ id: item.id, status: item.status, passed: item.passed_tests ?? 0, warnings: item.warning_tests ?? 0, blockers: item.blocker_tests ?? 0, completedAt: item.completed_at })),
    approvals: (approvalsResult.data ?? []).map((item: any) => ({ id: item.id, type: item.approval_type, decision: item.decision, requestedAt: item.requested_at, decidedAt: item.decided_at })),
  };
}

function healthLabel(value: string | null | undefined) {
  const labels: Record<string, string> = { funcionando: "Funcionando", redirecionando: "Redirecionando", quebrado: "Quebrado", indisponivel: "Indisponível", nao_verificado: "Não verificado" };
  return labels[value ?? ""] ?? "Aguardando dados";
}

function emptyContext(role: string | null, allowedModules: string[], diagnostic: string): LandingDashboardContext {
  const emptyMetric = metric(null, null);
  return {
    role, roleMode: functionalRoleFor(role) === "ADMIN" ? "ADMIN" : "ESPECIALISTA", allowedModules, diagnostic,
    period: { key: "30d", label: "Últimos 30 dias", start: new Date().toISOString(), end: new Date().toISOString(), comparisonAvailable: false },
    filters: { products: [], campaigns: [], environments: [], statuses: [], domains: [] }, landings: [], selected: null,
    metrics: { visitors: emptyMetric, sessions: emptyMetric, pageViews: emptyMetric, offerViews: emptyMetric, checkoutClicks: emptyMetric, conversionRate: emptyMetric },
    daily: [], funnel: [], topEvents: [], sections: [], attribution: [], recentEvents: [],
    content: { title: "Landing Pages", summary: "Aguardando dados", checkoutUrl: null, hotmartProductId: null, hotmartOfferId: null, previewUrl: null },
    health: { availability: "Aguardando dados", httpStatus: null, lastCheckedAt: null, domain: "Não disponível", checkout: "Aguardando dados", checkoutCheckedAt: null, links: "Aguardando dados", images: "Aguardando dados", tracking: "Aguardando dados", recentEventAt: null, errors: null, seo: "Não disponível", technicalPerformance: "Não disponível", publishedIntegrity: "Aguardando dados", divergences: [], alerts: [] },
    versions: [], qa: [], approvals: [],
  };
}
