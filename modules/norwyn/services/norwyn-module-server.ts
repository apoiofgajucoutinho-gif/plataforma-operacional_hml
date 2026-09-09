import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { canAccessMissionFeature, functionalRoleFor } from "@/lib/auth/roles";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adsAnalyticsSelect, normalizeAdsDailyRow } from "@/modules/ads/services/ads-analytics";

export type NorwynModuleKey = "missoes" | "marketing" | "resultados" | "produtos-alunos" | "automacoes";

type ModuleSearchParams = Record<string, string | string[] | undefined>;

export type NorwynModuleContext = {
  module: NorwynModuleKey;
  role: string | null;
  tenant: { id: string; nome: string } | null;
  user: { id: string; email: string | null; name: string | null } | null;
  allowedModules: string[];
  diagnostic: string | null;
  updatedAt: string | null;
  posts: any[];
  interactions: any[];
  followerSnapshots: any[];
  followerGrowthSummary: any | null;
  followerDailyMetrics: any[];
  adsRows: any[];
  commercialSales: any[];
  products: any[];
  campaigns: any[];
  campaignMaterials: any[];
  campaignApprovals: any[];
  marketingQAReviews: any[];
  contentCaptures: any[];
  atividades: any[];
  objetivos: any[];
  financeLancamentos: any[];
  customerChannelStatuses: any[];
  lifecycleApprovals: any[];
  lifecycleDrafts: any[];
  manychatSummary: any | null;
  manychatGrowthTools: any[];
  manychatTags: any[];
  manychatCustomFields: any[];
  manychatChanges: any[];
  telegramSchedules: any[];
  telegramSends: any[];
  telegramRecipients: any[];
  customer360Rows: any[];
  customer360Selected: any | null;
  customer360Summary: any | null;
  customer360Page: { page: number; pageSize: number; total: number; query: string; product: string; lifecycle: string; quality: string; studentStatus: string; opportunity: string; sort: string; direction: "asc" | "desc" };
  customer360Journeys: any[];
  customer360Timeline: any[];
};

type SupabaseAny = any;

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());

  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return { membership: data, error, source: admin ? "service_role" : "rls" };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules;

  const { data } = await dataClient
    .from("tenant_module_permissions")
    .select("module")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("can_read", true);

  return (data ?? []).map((item: { module: string }) => item.module);
}

function emptyContext(module: NorwynModuleKey, partial?: Partial<NorwynModuleContext>): NorwynModuleContext {
  return {
    module,
    role: null,
    tenant: null,
    user: null,
    allowedModules: [],
    diagnostic: null,
    updatedAt: null,
    posts: [],
    interactions: [],
    followerSnapshots: [],
    followerGrowthSummary: null,
    followerDailyMetrics: [],
    adsRows: [],
    commercialSales: [],
    products: [],
    campaigns: [],
    campaignMaterials: [],
    campaignApprovals: [],
    marketingQAReviews: [],
    contentCaptures: [],
    atividades: [],
    objetivos: [],
    financeLancamentos: [],
    customerChannelStatuses: [],
    lifecycleApprovals: [],
    lifecycleDrafts: [],
    manychatSummary: null,
    manychatGrowthTools: [],
    manychatTags: [],
    manychatCustomFields: [],
    manychatChanges: [],
    telegramSchedules: [],
    telegramSends: [],
    telegramRecipients: [],
    customer360Rows: [],
    customer360Selected: null,
    customer360Summary: null,
    customer360Page: { page: 1, pageSize: 50, total: 0, query: "", product: "", lifecycle: "all", quality: "all", studentStatus: "all", opportunity: "all", sort: "ltv_brl", direction: "desc" },
    customer360Journeys: [],
    customer360Timeline: [],
    ...partial,
  };
}

async function safeRows(client: SupabaseAny, table: string, select: string, tenantId: string, options?: { order?: string; ascending?: boolean; limit?: number }) {
  const query = client.from(table).select(select).eq("tenant_id", tenantId);
  if (options?.order) query.order(options.order, { ascending: options.ascending ?? false, nullsFirst: false });
  if (options?.limit) query.limit(options.limit);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

async function fetchTenantRowsPaged(client: SupabaseAny, table: string, select: string, tenantId: string, options?: { order?: string; ascending?: boolean; pageSize?: number; maxRows?: number }) {
  const pageSize = options?.pageSize ?? 1000;
  const maxRows = options?.maxRows ?? 50000;
  const rows: any[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    let query = client.from(table).select(select).eq("tenant_id", tenantId).range(from, from + pageSize - 1);
    if (options?.order) query = query.order(options.order, { ascending: options.ascending ?? false, nullsFirst: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function fetchInstagram(client: SupabaseAny, tenantId: string) {
  const { data: account } = await client
    .from("instagram_accounts")
    .select("id, nome, username")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  const postQuery = client
    .from("instagram_posts")
    .select("id, post_id, data_postagem, hora_postagem, tipo, legenda, permalink")
    .eq("tenant_id", tenantId)
    .order("data_postagem", { ascending: false })
    .limit(160);
  if (account?.id) postQuery.eq("account_id", account.id);

  const { data: rawPosts } = await postQuery;
  const postIds = (rawPosts ?? []).map((post: any) => post.id);
  const { data: metrics } = postIds.length
    ? await client
        .from("instagram_metrics")
        .select("post_id, likes, comentarios, alcance, salvos, compartilhamentos, engajamento_score, engajamento_classificacao, imported_at, updated_at")
        .eq("tenant_id", tenantId)
        .in("post_id", postIds)
    : { data: [] };

  const metricsByPost = new Map((metrics ?? []).map((metric: any) => [metric.post_id, metric]));
  const posts = (rawPosts ?? []).map((post: any) => {
    const metric = metricsByPost.get(post.id) as any;
    return {
      ...post,
      likes: Number(metric?.likes ?? 0),
      comentarios: Number(metric?.comentarios ?? 0),
      alcance: metric?.alcance == null ? null : Number(metric.alcance),
      salvos: metric?.salvos == null ? null : Number(metric.salvos),
      compartilhamentos: metric?.compartilhamentos == null ? null : Number(metric.compartilhamentos),
      engajamento_score: metric?.engajamento_score == null ? null : Number(metric.engajamento_score),
      engajamento_classificacao: metric?.engajamento_classificacao ?? "N/A",
      metric_imported_at: metric?.imported_at ?? metric?.updated_at ?? null,
    };
  });

  const interactions = await safeRows(
    client,
    "instagram_interactions",
    "id, source, marketing_type, external_id, post_id, origem, profile_username, profile_name, message_text, media_id, post_permalink, interaction_at, status, potential, product_topic, next_action",
    tenantId,
    { order: "interaction_at", limit: 250 },
  );

  const summaryQuery = client
    .from("instagram_follower_growth_summary")
    .select("tenant_id, account_id, latest_date, followers_current, net_growth_day, net_growth_7d, net_growth_30d, gain_days_30d, loss_days_30d, max_gain_day_30d, max_loss_day_30d, trend_followers_per_day_30d, trend_status, updated_at")
    .eq("tenant_id", tenantId)
    .limit(1);
  if (account?.id) summaryQuery.eq("account_id", account.id);
  const { data: followerGrowthSummary } = await summaryQuery.maybeSingle();

  const dailyQuery = client
    .from("instagram_follower_daily_metrics")
    .select("tenant_id, account_id, snapshot_date, followers_total, followers_previous_day, net_change_day, source, updated_at")
    .eq("tenant_id", tenantId)
    .order("snapshot_date", { ascending: true })
    .limit(1000);
  if (account?.id) dailyQuery.eq("account_id", account.id);
  const { data: followerDailyMetrics } = await dailyQuery;

  const followerQuery = client
    .from("instagram_follower_snapshots")
    .select("snapshot_date, followers_total, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("snapshot_date", { ascending: true })
    .limit(400);
  if (account?.id) followerQuery.eq("account_id", account.id);
  const { data: followerSnapshots } = await followerQuery;

  return { posts, interactions, followerSnapshots: followerSnapshots ?? [], followerGrowthSummary: followerGrowthSummary ?? null, followerDailyMetrics: followerDailyMetrics ?? [] };
}

async function fetchCommercialSales(client: SupabaseAny, tenantId: string, limit = 1200) {
  return safeRows(
    client,
    "comercial_vendas",
    "id, transaction_id, produto_id, hotmart_product_id, produto_nome, comprador_nome, comprador_email, status_original, status_normalizado, grupo_comercial, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible, sale_comparable, event_class, forma_pagamento, moeda, valor_bruto, data_compra, data_aprovacao, data_reembolso, source_sck, origem, imported_at, last_event_at, created_at, updated_at, metadata",
    tenantId,
    { order: "data_compra", limit },
  );
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function itemKey(item: any) {
  return String(item?.id ?? item?.external_id ?? item?.manychat_id ?? item?.name ?? item?.field_name ?? "");
}

function diffManyChatItems(kind: string, current: any[], previous: any[]) {
  const currentKeys = new Set(current.map(itemKey).filter(Boolean));
  const previousKeys = new Set(previous.map(itemKey).filter(Boolean));
  const added = current.filter((item) => !previousKeys.has(itemKey(item))).slice(0, 8);
  const missing = previous.filter((item) => !currentKeys.has(itemKey(item))).slice(0, 8);
  return [
    ...added.map((item) => ({ kind, change: "added", label: item?.name ?? item?.field_name ?? itemKey(item) })),
    ...missing.map((item) => ({ kind, change: "missing", label: item?.name ?? item?.field_name ?? itemKey(item) })),
  ];
}

async function fetchManyChat(client: SupabaseAny, tenantId: string) {
  const { data: current } = await client
    .from("manychat_inventory_current")
    .select("id, tenant_id, account_external_id, account_name, account_username, is_pro, timezone, collected_at, flows_count, growth_tools_count, tags_count, custom_fields_count, flows, growth_tools, tags, custom_fields, source, created_at")
    .eq("tenant_id", tenantId)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: snapshots } = await client
    .from("manychat_inventory_snapshots")
    .select("id, tenant_id, collected_at, growth_tools, tags, custom_fields, flows_count, growth_tools_count, tags_count, custom_fields_count")
    .eq("tenant_id", tenantId)
    .order("collected_at", { ascending: false })
    .limit(2);

  const growthTools = parseJsonArray(current?.growth_tools);
  const tags = parseJsonArray(current?.tags);
  const customFields = parseJsonArray(current?.custom_fields);
  const previous = snapshots?.[1] ?? null;
  const changes = previous
    ? [
        ...diffManyChatItems("Growth Tool", growthTools, parseJsonArray(previous.growth_tools)),
        ...diffManyChatItems("Tag", tags, parseJsonArray(previous.tags)),
        ...diffManyChatItems("Campo", customFields, parseJsonArray(previous.custom_fields)),
      ]
    : [];

  return {
    manychatSummary: current
      ? {
          account_name: current.account_name,
          account_username: current.account_username,
          is_pro: current.is_pro,
          timezone: current.timezone,
          collected_at: current.collected_at,
          flows_count: current.flows_count,
          growth_tools_count: current.growth_tools_count,
          tags_count: current.tags_count,
          custom_fields_count: current.custom_fields_count,
          previous_collected_at: previous?.collected_at ?? null,
        }
      : null,
    manychatGrowthTools: growthTools,
    manychatTags: tags,
    manychatCustomFields: customFields,
    manychatChanges: changes,
  };
}

async function fetchTelegramReports(client: SupabaseAny, tenantId: string) {
  const [telegramSchedules, telegramSends, telegramRecipients] = await Promise.all([
    safeRows(client, "relatorio_agendamentos", "id, tenant_id, destinatario_id, nome, tipo_resumo, canal, frequencia, horario, timezone, incluir_modulos, filtros, ativo, created_at, updated_at", tenantId, { order: "updated_at", limit: 100 }),
    safeRows(client, "relatorio_envios", "id, tenant_id, agendamento_id, destinatario_id, tipo_resumo, canal, destino, status, assunto, erro, metadata, sent_at, created_at, updated_at", tenantId, { order: "created_at", limit: 120 }),
    safeRows(client, "relatorio_destinatarios", "id, tenant_id, nome, perfil_alvo, canal_preferencial, ativo, created_at, updated_at", tenantId, { order: "updated_at", limit: 100 }),
  ]);
  return { telegramSchedules, telegramSends, telegramRecipients };
}


function firstParam(params: ModuleSearchParams | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function quantile(values: number[], q: number) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lower = sorted[base] ?? 0;
  const upper = sorted[base + 1];
  return upper !== undefined ? lower + rest * (upper - lower) : lower;
}

function normalizeProductLabel(value: unknown) {
  return String(value ?? "Produto não identificado").trim() || "Produto não identificado";
}

function buildJourneyEdges(sales: any[]) {
  const byEmail = new Map<string, any[]>();
  for (const sale of sales) {
    const email = String(sale.comprador_email ?? "").toLowerCase();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(sale);
    byEmail.set(email, list);
  }
  const edges = new Map<string, { from: string; to: string; customers: Set<string>; days: number[] }>();
  for (const [email, rows] of byEmail.entries()) {
    const ordered = rows.sort((a, b) => String(a.data_aprovacao ?? a.data_compra ?? a.created_at ?? "").localeCompare(String(b.data_aprovacao ?? b.data_compra ?? b.created_at ?? "")));
    const distinct: any[] = [];
    for (const row of ordered) {
      const product = normalizeProductLabel(row.produto_nome ?? row.hotmart_product_id);
      distinct.push({ product, date: row.data_aprovacao ?? row.data_compra ?? row.created_at });
    }
    for (let index = 0; index < distinct.length - 1; index += 1) {
      const from = distinct[index];
      const to = distinct[index + 1];
      const key = `${from.product} -> ${to.product}`;
      const current: { from: string; to: string; customers: Set<string>; days: number[] } = edges.get(key) ?? { from: from.product, to: to.product, customers: new Set<string>(), days: [] };
      current.customers.add(email);
      const fromDate = new Date(from.date);
      const toDate = new Date(to.date);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) current.days.push((toDate.getTime() - fromDate.getTime()) / 86400000);
      edges.set(key, current);
    }
  }
  return [...edges.values()]
    .map((edge) => ({ from: edge.from, to: edge.to, type: edge.from === edge.to ? "REPEAT_SAME_PRODUCT" : "CROSS_SELL", customers: edge.customers.size, median_days: quantile(edge.days, 0.5) }))
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 10);
}

type Customer360SortKey = "person" | "lifecycle" | "ltv_brl" | "purchase_count" | "student_status" | "access" | "progress" | "opportunity" | "quality";
type Customer360Direction = "asc" | "desc";

const customer360SortColumns: Record<Customer360SortKey, { column: string; defaultDirection: Customer360Direction }> = {
  person: { column: "display_name", defaultDirection: "asc" },
  lifecycle: { column: "lifecycle_status", defaultDirection: "asc" },
  ltv_brl: { column: "ltv_brl", defaultDirection: "desc" },
  purchase_count: { column: "purchase_count", defaultDirection: "desc" },
  student_status: { column: "student_status", defaultDirection: "asc" },
  access: { column: "last_access_at", defaultDirection: "desc" },
  progress: { column: "module_completed_events", defaultDirection: "desc" },
  opportunity: { column: "next_opportunity", defaultDirection: "asc" },
  quality: { column: "data_quality_status", defaultDirection: "asc" },
};

function normalizeCustomer360Sort(value: string): Customer360SortKey {
  return Object.prototype.hasOwnProperty.call(customer360SortColumns, value) ? (value as Customer360SortKey) : "ltv_brl";
}

function normalizeCustomer360Direction(value: string, sort: Customer360SortKey): Customer360Direction {
  if (value === "asc" || value === "desc") return value;
  return customer360SortColumns[sort].defaultDirection;
}

function safeSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, "");
}

function applyCustomer360Filters(query: any, filters: { queryText: string; productText: string; lifecycle: string; quality: string; studentStatus: string; opportunity: string }) {
  if (filters.queryText) {
    const escaped = safeSearchTerm(filters.queryText);
    query = query.or(`display_name.ilike.%${escaped}%,email.ilike.%${escaped}%,products_summary.ilike.%${escaped}%,first_product.ilike.%${escaped}%,latest_product.ilike.%${escaped}%`);
  }
  if (filters.productText) {
    const escaped = safeSearchTerm(filters.productText);
    query = query.or(`products_summary.ilike.%${escaped}%,first_product.ilike.%${escaped}%,latest_product.ilike.%${escaped}%`);
  }
  if (filters.lifecycle !== "all") query = query.eq("lifecycle_status", filters.lifecycle);
  if (filters.quality !== "all") query = query.eq("data_quality_status", filters.quality);
  if (filters.studentStatus !== "all") query = query.eq("student_status", filters.studentStatus);
  if (filters.opportunity !== "all") query = query.eq("next_opportunity", filters.opportunity);
  return query;
}

async function fetchCustomerStudent360(client: SupabaseAny, tenantId: string, searchParams?: ModuleSearchParams) {
  const pageSize = 20;
  const page = Math.max(1, Number(firstParam(searchParams, "page") || 1));
  const queryText = firstParam(searchParams, "q").trim();
  const productText = firstParam(searchParams, "product").trim();
  const lifecycle = firstParam(searchParams, "lifecycle") || "all";
  const quality = firstParam(searchParams, "quality") || "all";
  const studentStatus = firstParam(searchParams, "studentStatus") || "all";
  const opportunity = firstParam(searchParams, "opportunity") || "all";
  const sort = normalizeCustomer360Sort(firstParam(searchParams, "sort") || "ltv_brl");
  const direction = normalizeCustomer360Direction(firstParam(searchParams, "direction"), sort);
  const selectedCustomerId = firstParam(searchParams, "customerId");
  const filters = { queryText, productText, lifecycle, quality, studentStatus, opportunity };

  let query = client.from("norwyn_customer_student_360").select("*", { count: "exact" }).eq("tenant_id", tenantId);
  query = applyCustomer360Filters(query, filters);
  const from = (page - 1) * pageSize;
  const sortConfig = customer360SortColumns[sort];
  const { data: rows, error, count } = await query
    .order(sortConfig.column, { ascending: direction === "asc", nullsFirst: false })
    .order("customer_id", { ascending: true })
    .range(from, from + pageSize - 1);

  const pageState = { page, pageSize, total: count ?? 0, query: queryText, product: productText, lifecycle, quality, studentStatus, opportunity, sort, direction };
  if (error) return { rows: [], selected: null, summary: null, page: pageState, journeys: [], timeline: [] };

  const all = await fetchTenantRowsPaged(client, "norwyn_customer_student_360", "customer_id, lifecycle_status, identity_confidence, student_status, activity_status, progress_status, onboarding_status, data_quality_status, purchase_count, product_count, enrollment_count, ltv_brl, non_brl_count, checkout_opportunity_count, learning_event_count, module_completed_events, first_access_at, last_access_at, days_to_second_purchase, freshness", tenantId, { order: "freshness", maxRows: 50000 });
  const ltvValues = all.map((row: any) => Number(row.ltv_brl ?? 0)).filter((value: number) => value > 0);
  const buyers = all.filter((row: any) => Number(row.purchase_count ?? 0) > 0);
  const students = all.filter((row: any) => Number(row.enrollment_count ?? 0) > 0);
  const secondPurchaseDays = all.map((row: any) => Number(row.days_to_second_purchase)).filter((value: number) => Number.isFinite(value) && value >= 0);
  const summary = {
    canonical: all.length,
    identified: all.filter((row: any) => row.identity_confidence === "IDENTIFIED").length,
    probable: all.filter((row: any) => row.identity_confidence === "PROBABLE_MATCH").length,
    unreconciled: all.filter((row: any) => row.identity_confidence === "UNRECONCILED").length,
    leads: all.filter((row: any) => row.lifecycle_status === "LEAD").length,
    buyers: buyers.length,
    students: students.length,
    enrollments: all.reduce((sum: number, row: any) => sum + Number(row.enrollment_count ?? 0), 0),
    active: all.filter((row: any) => row.activity_status === "ACCESSED").length,
    inactive: all.filter((row: any) => row.activity_status === "INACTIVE").length,
    unknownAccess: all.filter((row: any) => row.activity_status === "ACCESS_UNKNOWN" || row.activity_status === "UNKNOWN_ACCESS").length,
    completed: all.filter((row: any) => row.student_status === "COMPLETED").length,
    unknownStatus: all.filter((row: any) => row.student_status === "UNKNOWN").length,
    firstAccess: all.filter((row: any) => row.first_access_at).length,
    clubActivity: all.filter((row: any) => Number(row.learning_event_count ?? 0) > 0).length,
    progressKnown: all.filter((row: any) => Number(row.progress_known_count ?? 0) > 0).length,
    progressInsufficient: all.filter((row: any) => row.progress_status === "UNKNOWN" || row.progress_status === "PARTIAL_EVENTS_ONLY").length,
    onboardingComplete: all.filter((row: any) => row.onboarding_status === "COMPLETED").length,
    onboardingPending: all.filter((row: any) => row.onboarding_status === "NOT_STARTED" || row.onboarding_status === "IN_PROGRESS").length,
    onboardingUnknown: all.filter((row: any) => row.onboarding_status === "UNKNOWN").length,
    ltvAvg: ltvValues.length ? ltvValues.reduce((sum: number, value: number) => sum + value, 0) / ltvValues.length : 0,
    ltvMedian: quantile(ltvValues, 0.5),
    ltvP25: quantile(ltvValues, 0.25),
    ltvP75: quantile(ltvValues, 0.75),
    ltvP90: quantile(ltvValues, 0.9),
    ltvSum: ltvValues.reduce((sum: number, value: number) => sum + value, 0),
    buyers2Plus: all.filter((row: any) => Number(row.purchase_count ?? 0) >= 2).length,
    buyers3Plus: all.filter((row: any) => Number(row.purchase_count ?? 0) >= 3).length,
    products2Plus: all.filter((row: any) => Number(row.product_count ?? 0) >= 2).length,
    products3Plus: all.filter((row: any) => Number(row.product_count ?? 0) >= 3).length,
    daysToSecondMedian: quantile(secondPurchaseDays, 0.5),
    daysToSecondAvg: secondPurchaseDays.length ? secondPurchaseDays.reduce((sum: number, value: number) => sum + value, 0) / secondPurchaseDays.length : 0,
    repurchase30d: all.filter((row: any) => Number(row.days_to_second_purchase) <= 30).length,
    repurchase60d: all.filter((row: any) => Number(row.days_to_second_purchase) <= 60).length,
    repurchase90d: all.filter((row: any) => Number(row.days_to_second_purchase) <= 90).length,
    repurchase180d: all.filter((row: any) => Number(row.days_to_second_purchase) <= 180).length,
    learningEvents: all.reduce((sum: number, row: any) => sum + Number(row.learning_event_count ?? 0), 0),
    moduleCompletedPeople: all.filter((row: any) => Number(row.module_completed_events ?? 0) > 0).length,
    nonBrlPeople: all.filter((row: any) => Number(row.non_brl_count ?? 0) > 0).length,
    freshness: all.map((row: any) => row.freshness).filter(Boolean).sort().at(-1) ?? null,
  };

  const journeySales = await fetchTenantRowsPaged(client, "comercial_vendas", "id, comprador_email, produto_nome, hotmart_product_id, data_compra, data_aprovacao, created_at, commercial_transaction, sale_confirmed, student_eligible, revenue_eligible, sale_comparable", tenantId, { order: "data_compra", ascending: true, maxRows: 50000 });
  const journeys = buildJourneyEdges(journeySales.filter((row: any) => row.commercial_transaction && row.sale_confirmed && row.student_eligible && row.sale_comparable !== false));

  let selected: any | null = null;
  let timeline: any[] = [];
  if (selectedCustomerId) {
    const { data } = await client.from("norwyn_customer_student_360").select("*").eq("tenant_id", tenantId).eq("customer_id", selectedCustomerId).maybeSingle();
    selected = data ?? null;
    if (selected) {
      const selectedEmail = String(selected.email ?? "").toLowerCase();
      const selectedSalesQuery = client
        .from("comercial_vendas")
        .select("id, transaction_id, produto_nome, comprador_email, status_original, grupo_comercial, moeda, valor_bruto, data_compra, data_aprovacao, data_reembolso, source_sck, revenue_eligible, student_eligible, sale_confirmed, created_at")
        .eq("tenant_id", tenantId)
        .order("data_compra", { ascending: true, nullsFirst: false });
      const { data: selectedSalesData } = selectedEmail ? await selectedSalesQuery.eq("comprador_email", selectedEmail) : { data: [] };
      const selectedSales = selectedSalesData ?? [];
      const selectedLearningEventsQuery = client
        .from("norwyn_hotmart_learning_events")
        .select("event_id, event_type, event_class, buyer_email, hotmart_product_name, module_name, occurred_at")
        .eq("tenant_id", tenantId)
        .order("occurred_at", { ascending: true, nullsFirst: false });
      const { data: selectedLearningEventsData } = selectedEmail ? await selectedLearningEventsQuery.eq("buyer_email", selectedEmail) : { data: [] };
      const selectedLearningEvents = selectedLearningEventsData ?? [];
      const salesTimeline = selectedSales.map((sale: any) => ({ type: sale.sale_confirmed ? "Compra" : "Oportunidade", title: sale.produto_nome ?? sale.transaction_id, date: sale.data_aprovacao ?? sale.data_compra ?? sale.created_at, meta: sale.revenue_eligible ? `LTV ${sale.moeda} ${sale.valor_bruto}` : sale.status_original ?? sale.grupo_comercial }));
      const learningTimeline = selectedLearningEvents.map((event: any) => ({
        type: event.event_type === "CLUB_MODULE_COMPLETED" || event.event_class === "MODULE_EVENT" ? "Modulo concluido" : "Acesso Club",
        title: event.module_name || event.hotmart_product_name || "Hotmart Club",
        date: event.occurred_at,
        meta: event.hotmart_product_name || "Evidencia de engajamento Hotmart Club",
      }));
      timeline = [...salesTimeline, ...learningTimeline]
        .filter((event) => event.date)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .slice(-80);
    }
  }

  return { rows: rows ?? [], selected, summary, page: pageState, journeys, timeline };
}

function latestDate(...groups: any[][]) {
  return groups
    .flat()
    .map((item) => item?.updated_at ?? item?.imported_at ?? item?.metric_imported_at ?? item?.last_event_at ?? item?.created_at ?? item?.data_compra ?? item?.data_referencia ?? item?.snapshot_date ?? item?.published_at ?? item?.interaction_at ?? item?.data_pagamento)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

export async function getNorwynModuleContext(module: NorwynModuleKey, searchParams?: ModuleSearchParams): Promise<NorwynModuleContext> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();

  if (!currentUser) redirect("/login");

  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { membership, error: membershipError, source } = localMembership
    ? { membership: localMembership, error: null, source: "local_bypass" }
    : await getMembershipByUserId(currentUser.id);

  if (membershipError) return emptyContext(module, { diagnostic: `${source}: ${membershipError.message}` });
  if (!membership) return emptyContext(module, { diagnostic: "Nenhum tenant ativo encontrado para este usuario." });

  const allowedModules = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  const hasNorwyn = membership.role === "ADMIN" || allowedModules.includes("norwyn");
  if (!hasNorwyn) {
    return emptyContext(module, {
      role: membership.role,
      allowedModules,
      diagnostic: "Seu perfil nao possui acesso aos modulos Norwyn.",
    });
  }

  if (module === "missoes" && !canAccessMissionFeature(membership.role)) {
    return emptyContext(module, {
      role: membership.role,
      allowedModules,
      diagnostic: "Missões não estão disponíveis para o perfil operacional.",
    });
  }

  const { data: tenant } = await dataClient.from("tenants").select("id, nome").eq("id", membership.tenant_id).maybeSingle();
  const userMetadata = ("user_metadata" in currentUser && currentUser.user_metadata && typeof currentUser.user_metadata === "object" ? currentUser.user_metadata : {}) as Record<string, unknown>;
  const userName = [userMetadata.preferred_name, userMetadata.nome_preferido, userMetadata.full_name, userMetadata.name, userMetadata.nome]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;

  const base = {
    module,
    role: membership.role,
    user: { id: currentUser.id, email: currentUser.email ?? null, name: userName ?? currentUser.email ?? null },
    tenant: tenant ? { id: tenant.id, nome: tenant.nome } : null,
    allowedModules,
    diagnostic: null,
  };

  if (module === "missoes") {
    const [campaigns, materiais, approvals, atividades, objetivos, sales] = await Promise.all([
      safeRows(dataClient, "campaigns", "id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
      safeRows(dataClient, "campaign_materials", "id, tenant_id, campaign_id, material_type, title, status, channel, current_version_id, metadata, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 160 }),
      safeRows(dataClient, "campaign_approvals", "id, tenant_id, campaign_id, material_id, version_id, approver_id, approver_name, status, decided_at, observation, created_at, updated_at", membership.tenant_id, { order: "created_at", limit: 120 }),
      safeRows(dataClient, "atividades_tarefas", "id, titulo, time_responsavel, status, prioridade, prazo, source_module, campaign_id, product_id, blocked_reason, waiting_on, metadata, created_at, updated_at", membership.tenant_id, { order: "prazo", ascending: true, limit: 180 }),
      safeRows(dataClient, "objetivos_metas", "id, titulo, indicador_key, status, percentual, plano_acao_padrao, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
      fetchCommercialSales(dataClient, membership.tenant_id, 500),
    ]);
    return emptyContext(module, { ...base, campaigns, campaignMaterials: materiais, campaignApprovals: approvals, atividades, objetivos, commercialSales: sales, updatedAt: latestDate(campaigns, materiais, approvals, atividades, objetivos, sales) });
  }

  if (module === "marketing") {
    const instagram = await fetchInstagram(dataClient, membership.tenant_id);
    const [adsRows, campaigns, contentCaptures, qaReviews] = await Promise.all([
      safeRows(dataClient, "instagram_ads_daily", adsAnalyticsSelect, membership.tenant_id, { order: "data_referencia", limit: 1400 }),
      safeRows(dataClient, "campaigns", "id, tenant_id, name, type, objective_id, mission_external_key, product_id, status, starts_at, ends_at, target_sales, target_revenue, plan_json, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
      safeRows(dataClient, "content_capture", "id, tenant_id, title, capture_type, status, product_id, mission_id, campaign_id, summary, topics, cta, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
      safeRows(dataClient, "marketing_qa_reviews", "id, tenant_id, campaign_id, material_id, material_version_id, reviewer_type, status, overall_score, summary, blocking_reasons, warnings, success, error_message, created_at, completed_at", membership.tenant_id, { order: "created_at", limit: 120 }),
    ]);
    const normalizedAds = adsRows.map((row: any) => normalizeAdsDailyRow(row));
    return emptyContext(module, { ...base, ...instagram, adsRows: normalizedAds, campaigns, contentCaptures, marketingQAReviews: qaReviews, updatedAt: latestDate(instagram.posts, instagram.interactions, instagram.followerSnapshots, instagram.followerDailyMetrics, [instagram.followerGrowthSummary], normalizedAds, campaigns, contentCaptures, qaReviews) });
  }

  if (module === "resultados") {
    const instagram = await fetchInstagram(dataClient, membership.tenant_id);
    const [adsRows, commercialSales, financeLancamentos, objetivos] = await Promise.all([
      safeRows(dataClient, "instagram_ads_daily", adsAnalyticsSelect, membership.tenant_id, { order: "data_referencia", limit: 1400 }),
      fetchCommercialSales(dataClient, membership.tenant_id, 1400),
      safeRows(dataClient, "fin_lancamentos", "id, tenant_id, data_pagamento, mes_competencia, tipo, status, descricao, valor, origem, updated_at", membership.tenant_id, { order: "data_pagamento", limit: 600 }),
      safeRows(dataClient, "objetivos_metas", "id, titulo, indicador_key, status, percentual, plano_acao_padrao, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
    ]);
    const normalizedAds = adsRows.map((row: any) => normalizeAdsDailyRow(row));
    return emptyContext(module, { ...base, ...instagram, adsRows: normalizedAds, commercialSales, financeLancamentos, objetivos, updatedAt: latestDate(instagram.posts, instagram.interactions, instagram.followerSnapshots, instagram.followerDailyMetrics, [instagram.followerGrowthSummary], normalizedAds, commercialSales, financeLancamentos, objetivos) });
  }

  if (module === "produtos-alunos") {
    const [products, commercialSales, journeys, supportTickets, certificates, customer360] = await Promise.all([
      safeRows(dataClient, "products", "id, tenant_id, nome_oficial, produto_base, categoria, descricao, status, tipo, preco_oficial, duracao, unidade_duracao, link_oferta, observacoes, ativo, metadata, product_aliases(id, alias, produto_base, principal, ativo), product_batches(id, turma, inicio, fim, status, meta_alunos, alunos, receita_meta, receita_real, ativo)", membership.tenant_id, { order: "nome_oficial", ascending: true, limit: 400 }),
      fetchCommercialSales(dataClient, membership.tenant_id, 1400),
      safeRows(dataClient, "norwyn_student_journeys", "id, tenant_id, person_key, student_email, student_id, product_id, purchase_status, access_status, onboarding_status, progress_status, support_status, certificate_status, next_purchase_status, ltv_commercial, metadata, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 900 }),
      safeRows(dataClient, "norwyn_support_tickets", "id, tenant_id, person_key, student_email, student_id, product_id, topic, status, priority, assigned_to, opened_at, resolved_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 250 }),
      safeRows(dataClient, "norwyn_certificate_requests", "id, tenant_id, person_key, student_email, student_id, product_id, request_date, status, updated_at", membership.tenant_id, { order: "updated_at", limit: 250 }),
      fetchCustomerStudent360(dataClient, membership.tenant_id, searchParams),
    ]);
    return emptyContext(module, { ...base, products, commercialSales, customerChannelStatuses: journeys, atividades: [...supportTickets, ...certificates], customer360Rows: customer360.rows, customer360Selected: customer360.selected, customer360Summary: customer360.summary, customer360Page: customer360.page, customer360Journeys: customer360.journeys, customer360Timeline: customer360.timeline, updatedAt: latestDate(products, commercialSales, journeys, supportTickets, certificates, customer360.rows) });
  }

  const [customerChannelStatuses, lifecycleApprovals, lifecycleDrafts, atividades, manychat, telegram] = await Promise.all([
    safeRows(dataClient, "norwyn_customer_channel_statuses", "id, tenant_id, person_key, customer_hash, email_status, whatsapp_status, instagram_manychat_status, commercial_block, commercial_block_reason, activecampaign_contact_id, activecampaign_status, email_policy_decision, last_synced_at, sync_status, source, evidence, updated_at, created_at", membership.tenant_id, { order: "updated_at", limit: 600 }),
    safeRows(dataClient, "norwyn_lifecycle_execution_approvals", "id, tenant_id, approval_key, status, channel, offer_key, sequence_key, total, eligible, ready_to_send, opted_out, commercial_blocked, unknown_consent, risks, copy_status, approved_at, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
    safeRows(dataClient, "norwyn_lifecycle_message_drafts", "id, tenant_id, draft_key, journey_key, offer_key, channel, message_step, day_label, objective, subject, cta, approval_status, evidence, created_at, updated_at", membership.tenant_id, { order: "updated_at", limit: 120 }),
    safeRows(dataClient, "atividades_tarefas", "id, titulo, time_responsavel, status, prioridade, prazo, source_module, source_event, blocked_reason, waiting_on, metadata, created_at, updated_at", membership.tenant_id, { order: "prazo", ascending: true, limit: 160 }),
    fetchManyChat(dataClient, membership.tenant_id),
    fetchTelegramReports(dataClient, membership.tenant_id),
  ]);
  return emptyContext(module, { ...base, customerChannelStatuses, lifecycleApprovals, lifecycleDrafts, atividades, ...manychat, ...telegram, updatedAt: latestDate(customerChannelStatuses, lifecycleApprovals, lifecycleDrafts, atividades, [manychat.manychatSummary], manychat.manychatGrowthTools, manychat.manychatTags, manychat.manychatCustomFields, telegram.telegramSchedules, telegram.telegramSends, telegram.telegramRecipients) });
}







