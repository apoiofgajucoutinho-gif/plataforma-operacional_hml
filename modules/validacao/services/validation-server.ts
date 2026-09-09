import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { allModules } from "@/lib/auth/modules";
import { functionalRoleFor } from "@/lib/auth/roles";
import { getLocalBypassMembership, getLocalBypassUser } from "@/lib/auth/local-bypass";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ValidationTab = "hotmart" | "produtos" | "conteudos";
type SupabaseAny = any;

type ValidationAuth = {
  tenantId: string;
  role: string;
  functionalRole: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  allowedModules: string[];
  dataClient: SupabaseAny;
  canWrite: boolean;
};

const confirmedCanonicals = new Set(["APPROVED", "COMPLETED"]);
const pendingCanonicals = new Set(["OVERDUE", "STARTED", "PENDING_PAYMENT"]);
const lostCanonicals = new Set(["CANCELLED", "EXPIRED"]);
const refundCanonicals = new Set(["REFUNDED", "CHARGEBACK"]);
const commercialCanonicals = new Set([...confirmedCanonicals, ...pendingCanonicals, ...lostCanonicals, ...refundCanonicals]);

const statusMap: Record<string, string> = {
  APPROVED: "APPROVED",
  APROVADO: "APPROVED",
  COMPLETE: "COMPLETED",
  COMPLETO: "COMPLETED",
  COMPLETED: "COMPLETED",
  ATRASADO: "OVERDUE",
  OVERDUE: "OVERDUE",
  CANCELADO: "CANCELLED",
  CANCELADA: "CANCELLED",
  CANCELED: "CANCELLED",
  CANCELLED: "CANCELLED",
  EXPIRADO: "EXPIRED",
  EXPIRADA: "EXPIRED",
  EXPIRED: "EXPIRED",
  REEMBOLSADO: "REFUNDED",
  REEMBOLSADA: "REFUNDED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "REFUNDED",
  CHARGEBACK: "CHARGEBACK",
  INICIADA: "STARTED",
  INICIADO: "STARTED",
  STARTED: "STARTED",
  AGUARDANDO_PAGTO: "PENDING_PAYMENT",
  AGUARDANDO_PAGAMENTO: "PENDING_PAYMENT",
  WAITING_PAYMENT: "PENDING_PAYMENT",
  PRINTED_BILLET: "PENDING_PAYMENT",
  PROCESSING_TRANSACTION: "PENDING_PAYMENT",
  UNDER_ANALISYS: "PENDING_PAYMENT",
  UNDER_ANALYSIS: "PENDING_PAYMENT",
};

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeTransactionId(value: unknown) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
  return normalized || null;
}

export function canonicalHotmartStatus(value: unknown) {
  return statusMap[normalizeToken(value)] ?? "UNKNOWN";
}

export function commercialGroupFromCanonical(value: string) {
  if (confirmedCanonicals.has(value)) return "confirmed";
  if (pendingCanonicals.has(value)) return "pending";
  if (lostCanonicals.has(value)) return "lost";
  if (refundCanonicals.has(value)) return value === "CHARGEBACK" ? "chargeback" : "refunded";
  return "unknown";
}

export function eventClassForHotmart(value: unknown, transactionId: unknown) {
  const raw = normalizeToken(value);
  const canonical = canonicalHotmartStatus(value);
  const normalizedId = normalizeTransactionId(transactionId);
  if (raw === "CLUB_FIRST_ACCESS") return "PRODUCT_ACCESS_EVENT";
  if (raw === "CLUB_MODULE_COMPLETED") return "MODULE_EVENT";
  if (raw === "PURCHASE_OUT_OF_SHOPPING_CART") return "CHECKOUT_EVENT";
  if (canonical === "REFUNDED" || canonical === "CHARGEBACK") return "REFUND_EVENT";
  if (canonical !== "UNKNOWN" && /^HP\d+$/.test(normalizedId ?? "")) return "SALE_TRANSACTION";
  if (/^HP\d+$/.test(normalizedId ?? "")) return "UNKNOWN_EVENT";
  return "OTHER_EVENT";
}

export function isSaleComparable(value: unknown, transactionId: unknown) {
  return /^HP\d+$/.test(normalizeTransactionId(transactionId) ?? "") && commercialCanonicals.has(canonicalHotmartStatus(value));
}

export function parseHotmartValidationNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const compact = value.replace(/\s/g, "").replace(/R\$/gi, "").replace(/[^0-9,.-]/g, "");
  if (!compact) return null;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma >= 0 && lastDot >= 0
    ? lastComma > lastDot ? "," : "."
    : lastComma >= 0
      ? compact.length - lastComma - 1 === 2 ? "," : null
      : lastDot >= 0 && compact.length - lastDot - 1 === 2 ? "." : null;
  const normalized = decimalSeparator
    ? compact.replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "").replace(decimalSeparator, ".")
    : compact.replace(/[,.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = String(value).trim();
  if (!text) return null;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    const iso = `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}T${(br[4] ?? "12").padStart(2, "0")}:${br[5] ?? "00"}:00-03:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cell(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const key = Object.keys(row).find((candidate) => normalizeToken(candidate) === normalizeToken(name));
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return null;
}

export function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.split("\n").find((line) => line.trim()) ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(current); current = ""; }
    else if (char === "\n" && !quoted) { row.push(current); rows.push(row); row = []; current = ""; }
    else current += char;
  }
  if (current || row.length) { row.push(current); rows.push(row); }
  const headers = (rows.shift() ?? []).map((header) => header.trim());
  if (!headers.length) throw new Error("Não consegui identificar o cabeçalho do CSV.");
  return rows.filter((items) => items.some((item) => item.trim())).map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])));
}

export function normalizeHotmartOfficialRow(row: Record<string, string>, sourceFile: string, sourceRow: number) {
  const transactionId = cell(row, ["Transação", "Transacao", "transaction", "transaction_id", "Código da transação", "Codigo da transacao"]);
  const rawStatus = cell(row, ["Status da transação", "Status da transacao", "Status", "Status da compra", "status_original", "purchase_status"]);
  const rawValue = cell(row, ["Faturamento bruto (sem impostos)", "Valor de compra sem impostos", "Preço Total", "Preco Total", "Valor", "Valor da venda", "Preço", "Preco", "price", "valor_bruto"]);
  const currency = (cell(row, ["Moeda de recebimento", "Moeda", "Moeda de compra", "Currency", "currency_code"]) ?? "BRL").toUpperCase();
  const normalizedValue = parseHotmartValidationNumber(rawValue);
  const normalizedTransactionId = normalizeTransactionId(transactionId);
  return {
    transaction_id: transactionId,
    normalized_transaction_id: normalizedTransactionId,
    buyer_name: cell(row, ["Comprador(a)", "Nome", "Cliente", "Comprador", "Nome do comprador", "buyer_name"]),
    buyer_email: cell(row, ["Email do(a) Comprador(a)", "Email", "E-mail", "Email do comprador", "buyer_email"])?.toLowerCase() ?? null,
    hotmart_product_id: cell(row, ["Código do Produto", "Codigo do Produto", "Product ID", "product_id", "hotmart_product_id"]),
    hotmart_product_name: cell(row, ["Produto", "Nome do Produto", "Nome do Produto Principal", "product_name"]),
    offer_id: cell(row, ["Código de Oferta", "Codigo de Oferta", "Offer ID", "offer_id"]),
    offer_name: cell(row, ["Oferta", "Nome da Oferta", "offer_name"]),
    raw_status: rawStatus,
    canonical_status: canonicalHotmartStatus(rawStatus),
    raw_value: rawValue,
    normalized_value: normalizedValue,
    currency,
    purchase_date: parseDate(cell(row, ["Data da transação", "Data da transacao", "Data da compra", "Data Compra", "purchase_date", "Data de Venda"])),
    approved_date: parseDate(cell(row, ["Confirmação do pagamento", "Confirmacao do pagamento", "Data de aprovação", "Data de aprovacao", "approved_date", "Data confirmação", "Data confirmacao"])),
    refund_date: parseDate(cell(row, ["Data de reembolso", "refund_date"])),
    payment_method: cell(row, ["Método de pagamento", "Metodo de pagamento", "Forma de pagamento", "payment_method", "Pagamento"]),
    event_class: "SALE_TRANSACTION",
    sale_comparable: Boolean(normalizedTransactionId),
    raw_payload: row,
    normalized_payload: { source_file: sourceFile, source_row: sourceRow, purchase_currency: cell(row, ["Moeda de compra"]), settlement_currency: cell(row, ["Moeda de recebimento"]), purchase_value_with_taxes: parseHotmartValidationNumber(cell(row, ["Valor de compra com impostos"])), purchase_value_without_taxes: parseHotmartValidationNumber(cell(row, ["Valor de compra sem impostos"])), net_revenue: parseHotmartValidationNumber(cell(row, ["Faturamento líquido", "Faturamento liquido"])), producer_net_revenue: parseHotmartValidationNumber(cell(row, ["Faturamento líquido do(a) Produtor(a)", "Faturamento liquido do(a) Produtor(a)"])), processing_fee: parseHotmartValidationNumber(cell(row, ["Taxa de processamento"])), streaming_fee: parseHotmartValidationNumber(cell(row, ["Taxa de streaming"])), other_fees: parseHotmartValidationNumber(cell(row, ["Outras Taxas"])) },
  };
}

async function getMembershipByUserId(userId: string) {
  const admin = createAdminClient();
  const supabase = admin ?? (await createClient());
  const { data, error } = await supabase.from("tenant_members").select("tenant_id, role").eq("user_id", userId).eq("ativo", true).limit(1).maybeSingle();
  return { membership: data, error };
}

async function getAllowedModules(tenantId: string, role: string, dataClient: SupabaseAny) {
  if (role === "ADMIN") return allModules.map((module) => ({ module, can_write: true }));
  const { data } = await dataClient.from("tenant_module_permissions").select("module, can_write").eq("tenant_id", tenantId).eq("role", role).eq("can_read", true);
  return data ?? [];
}

export async function getValidationAuth(): Promise<ValidationAuth> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  const dataClient = createAdminClient() ?? userClient;
  const currentUser = user ?? getLocalBypassUser();
  if (!currentUser) redirect("/login");
  const localMembership = user ? null : await getLocalBypassMembership(dataClient);
  const { membership, error } = localMembership ? { membership: localMembership, error: null } : await getMembershipByUserId(currentUser.id);
  if (error) throw new Error(error.message);
  if (!membership) throw new Error("Usuário sem tenant ativo.");
  const permissions = await getAllowedModules(membership.tenant_id, membership.role, dataClient);
  const modules = permissions.map((item: any) => item.module);
  const canRead = membership.role === "ADMIN" || modules.includes("validacao") || modules.includes("norwyn");
  if (!canRead) throw new Error("Seu perfil não possui acesso à Central de Validação.");
  const canWrite = membership.role === "ADMIN" || permissions.some((item: any) => ["validacao", "norwyn"].includes(item.module) && item.can_write);
  const meta = ("user_metadata" in currentUser && currentUser.user_metadata && typeof currentUser.user_metadata === "object" ? currentUser.user_metadata : {}) as Record<string, unknown>;
  return { tenantId: membership.tenant_id, role: membership.role, functionalRole: functionalRoleFor(membership.role), userId: currentUser.id, userEmail: currentUser.email ?? null, userName: (meta.nome as string) || (meta.name as string) || currentUser.email || null, allowedModules: membership.role === "ADMIN" ? allModules : modules, dataClient, canWrite };
}

async function fetchRowsPaged(client: SupabaseAny, table: string, select: string, tenantId: string, options?: { order?: string; ascending?: boolean; pageSize?: number; maxRows?: number }) {
  const pageSize = options?.pageSize ?? 1000;
  const maxRows = options?.maxRows ?? 20000;
  const rows: any[] = [];
  let error: string | null = null;
  for (let from = 0; from < maxRows; from += pageSize) {
    let query = client.from(table).select(select).eq("tenant_id", tenantId).range(from, from + pageSize - 1);
    if (options?.order) query = query.order(options.order, { ascending: options.ascending ?? false, nullsFirst: false });
    const { data, error: pageError } = await query;
    if (pageError) { error = pageError.message; break; }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { data: rows, error };
}

async function countRows(client: SupabaseAny, table: string, tenantId: string) {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  return { count: count ?? 0, error: error?.message ?? null };
}

function latest(rows: any[]) {
  return rows.map((row) => row.updated_at ?? row.created_at ?? row.uploaded_at ?? row.imported_at ?? null).filter(Boolean).sort().at(-1) ?? null;
}

function money(value: number) { return Math.round(value * 100) / 100; }
function objectNumber(value: unknown) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function pct(part: number, total: number) { return total ? money((part / total) * 100) : 0; }

function uniqueCount(rows: any[], keyFor: (row: any) => string | null | undefined) {
  return new Set(rows.map(keyFor).filter(Boolean)).size;
}

function groupByKey(rows: any[], keyFor: (row: any) => string) {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = keyFor(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function productMatchMethod(row: any) {
  if (!row.external_product_id) return "NAME_ONLY_REVIEW";
  if (row.relationship === "MAIN_PRODUCT") return "EXACT_EXTERNAL_ID";
  if (row.relationship === "LEGACY_PRODUCT") return "VALIDATED_LEGACY";
  if (row.relationship === "BUNDLE") return "VALIDATED_BUNDLE";
  return "VALIDATED_ALIAS";
}

function productMatchRank(row: any) {
  if (row.relationship === "MAIN_PRODUCT") return 1;
  if (row.relationship === "LEGACY_PRODUCT") return 2;
  if (row.relationship === "BUNDLE") return 3;
  if (row.external_product_id) return 4;
  return 5;
}

function maskEmail(value: string) {
  const [name, domain] = String(value ?? "").split("@");
  if (!name || !domain) return "e-mail indisponível";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function coverageBucket(label: string, rows: any[]) {
  const official = rows.filter((row) => ["MATCH_EXACT", "MATCH_DIVERGENT", "ONLY_HOTMART"].includes(row.match_status));
  const matched = official.filter((row) => ["MATCH_EXACT", "MATCH_DIVERGENT"].includes(row.match_status)).length;
  const onlyHotmart = official.filter((row) => row.match_status === "ONLY_HOTMART").length;
  return { label, official: official.length, matched, onlyHotmart, coveragePct: pct(matched, official.length) };
}

function officialDate(row: any) {
  const value = row.official_snapshot?.purchase_date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function groupCoverage(rows: any[], keyFor: (row: any) => string, limit = 12) {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = keyFor(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([label, groupRows]) => coverageBucket(label, groupRows))
    .sort((a, b) => b.onlyHotmart - a.onlyHotmart || b.official - a.official)
    .slice(0, limit);
}

export async function getValidationContext(tab: ValidationTab = "hotmart") {
  const auth = await getValidationAuth();
  const client = auth.dataClient;
  const [tenantResult, sales, uploads, decisions, knowledge, products, productIdentities, posts, contentEvents, totalSalesCount] = await Promise.all([
    client.from("tenants").select("id, nome").eq("id", auth.tenantId).maybeSingle(),
    fetchRowsPaged(client, "comercial_vendas", "id, transaction_id, hotmart_product_id, produto_nome, comprador_nome, comprador_email, status_original, status_normalizado, status, grupo_comercial, moeda, valor_bruto, data_compra, data_aprovacao, data_reembolso, imported_at, updated_at", auth.tenantId, { order: "data_compra", pageSize: 1000, maxRows: 20000 }),
    fetchRowsPaged(client, "norwyn_validation_uploads", "*", auth.tenantId, { order: "uploaded_at", pageSize: 1000, maxRows: 2000 }),
    fetchRowsPaged(client, "norwyn_validation_decisions", "*", auth.tenantId, { order: "decided_at", pageSize: 1000, maxRows: 5000 }),
    fetchRowsPaged(client, "norwyn_validation_knowledge", "*", auth.tenantId, { order: "created_at", pageSize: 1000, maxRows: 5000 }),
    fetchRowsPaged(client, "products", "id, nome_oficial, produto_base, categoria, ativo, metadata, product_aliases(id, alias, produto_base, principal, ativo), product_components(id, componente, categoria, ativo)", auth.tenantId, { order: "nome_oficial", ascending: true, pageSize: 1000, maxRows: 3000 }),
    fetchRowsPaged(client, "norwyn_product_external_identities", "*", auth.tenantId, { order: "created_at", pageSize: 1000, maxRows: 3000 }),
    fetchRowsPaged(client, "instagram_posts", "id, post_id, data_postagem, tipo, legenda, permalink", auth.tenantId, { order: "data_postagem", pageSize: 1000, maxRows: 3000 }),
    fetchRowsPaged(client, "norwyn_content_events", "id, source_id, title, caption, published_at, product_tags, theme_tags, objective, funnel_stage, campaign_id, metadata, updated_at", auth.tenantId, { order: "published_at", pageSize: 1000, maxRows: 3000 }),
    countRows(client, "comercial_vendas", auth.tenantId),
  ]);
  const uploadRows = uploads.data as any[];
  const latestHotmartUpload = uploadRows.filter((row) => row.validation_type === "HOTMART").sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)))[0] ?? null;
  const comparisons = latestHotmartUpload
    ? await fetchRowsPaged(client, "norwyn_hotmart_validation_comparisons", "*", auth.tenantId, { order: "created_at", pageSize: 1000, maxRows: 20000 })
    : { data: [], error: null };
  const comparisonRows = (comparisons.data as any[]).filter((row) => !latestHotmartUpload || row.upload_id === latestHotmartUpload.id);
  const officialComparisonRows = comparisonRows.filter((row) => row.sale_comparable && ["MATCH_EXACT", "MATCH_DIVERGENT", "ONLY_HOTMART"].includes(row.match_status));
  const coverage = coverageBucket("Total", officialComparisonRows);
  const coverageByYear = groupCoverage(officialComparisonRows, (row) => String(officialDate(row)?.getUTCFullYear() ?? "Sem data"), 8).sort((a, b) => a.label.localeCompare(b.label));
  const coverageByProduct = groupCoverage(officialComparisonRows, (row) => {
    const productId = row.official_snapshot?.hotmart_product_id ?? row.norwyn_snapshot?.hotmart_product_id ?? "Sem produto";
    const productName = row.official_snapshot?.hotmart_product_name ?? row.norwyn_snapshot?.produto_nome ?? "";
    return productName ? `${productId} - ${productName}` : String(productId);
  });
  const coverageByStatus = groupCoverage(officialComparisonRows, (row) => row.official_snapshot?.raw_status ?? row.official_snapshot?.canonical_status ?? "Sem status");
  const onlyHotmartClassification = groupCoverage(
    comparisonRows.filter((row) => row.match_status === "ONLY_HOTMART"),
    (row) => {
      const status = row.official_snapshot?.raw_status;
      const transaction = row.normalized_transaction_id ?? "";
      if (status === "Completo" && /^HP\d+C\d+$/.test(transaction)) return "Completo com sufixo de item";
      if (status === "Completo") return "Venda completa ausente";
      if (["Atrasado", "Cancelado", "Expirado", "Iniciada", "Aguardando Pagto"].includes(status)) return "Não concluída/perdida";
      if (["Reembolsado", "Chargeback"].includes(status)) return "Reembolso/chargeback em revisão";
      return "Revisão necessária";
    },
    8,
  );
  const saleRows = sales.data as any[];
  const comparableSales = saleRows.filter((row) => isSaleComparable(row.status_original ?? row.status_normalizado ?? row.status, row.transaction_id));
  const nonComparableSales = saleRows.filter((row) => !isSaleComparable(row.status_original ?? row.status_normalizado ?? row.status, row.transaction_id));
  const clubEvents = nonComparableSales.filter((row) => ["CLUB_FIRST_ACCESS", "CLUB_MODULE_COMPLETED"].includes(row.status_original ?? row.status_normalizado ?? row.status));
  const unknownCommercial = comparableSales.filter((row) => canonicalHotmartStatus(row.status_original ?? row.status_normalizado ?? row.status) === "UNKNOWN");
  const nonBrlCommercial = comparableSales.filter((row) => row.moeda && row.moeda !== "BRL");
  const summary = latestHotmartUpload?.summary ?? {};
  const comparisonCounts = summary.comparison_counts ?? comparisonRows.reduce((acc: Record<string, number>, row: any) => { acc[row.match_status] = (acc[row.match_status] ?? 0) + 1; return acc; }, {});
  const decisionRows = decisions.data as any[];
  const knowledgeRows = knowledge.data as any[];
  const productRows = products.data as any[];
  const identityRows = productIdentities.data as any[];
  const contentRows = (contentEvents.data.length ? contentEvents.data : posts.data) as any[];
  const [productMatchQuality, clubMatchCandidates, learningEvents, customerRows] = await Promise.all([
    fetchRowsPaged(client, "norwyn_student_360_p13_product_match_quality", "enrollment_id, hotmart_product_id, product_name, canonical_product_id, external_product_id, relationship, source, confidence", auth.tenantId, { pageSize: 1000, maxRows: 6000 }),
    fetchRowsPaged(client, "norwyn_student_360_club_match_candidates", "event_id, customer_id, canonical_product_id, enrollment_id", auth.tenantId, { pageSize: 1000, maxRows: 5000 }),
    fetchRowsPaged(client, "norwyn_hotmart_learning_events", "event_id, event_type, event_class, buyer_email, buyer_name, hotmart_product_id, hotmart_product_name, module_name, occurred_at", auth.tenantId, { order: "occurred_at", pageSize: 1000, maxRows: 2000 }),
    fetchRowsPaged(client, "norwyn_customers", "id, primary_email", auth.tenantId, { pageSize: 1000, maxRows: 3000 }),
  ]);
  const productRowsById = new Map(productRows.map((product) => [product.id, product]));
  const rankedProductMatches = [...groupByKey(productMatchQuality.data as any[], (row) => row.enrollment_id).entries()].map(([enrollmentId, rows]) => {
    const best = [...rows].sort((a, b) => productMatchRank(a) - productMatchRank(b))[0] ?? {};
    const canonical = productRowsById.get(best.canonical_product_id) as any;
    return { ...best, enrollment_id: enrollmentId, match_method: productMatchMethod(best), canonical_product_name: canonical?.nome_oficial ?? best.canonical_product_id };
  });
  const nameOnlyReviewGroups = [...groupByKey(rankedProductMatches.filter((row) => row.match_method === "NAME_ONLY_REVIEW"), (row) => `${row.hotmart_product_id ?? "sem-id"}::${row.product_name ?? "sem-produto"}::${row.canonical_product_id ?? "sem-candidato"}`).entries()]
    .map(([key, rows]) => ({ key, hotmart_product_id: rows[0]?.hotmart_product_id ?? null, product_name: rows[0]?.product_name ?? "Produto sem nome", canonical_product_id: rows[0]?.canonical_product_id ?? null, canonical_product_name: rows[0]?.canonical_product_name ?? "Candidato não identificado", enrollments: rows.length }))
    .sort((a, b) => b.enrollments - a.enrollments);
  const productMatchCounts = rankedProductMatches.reduce((acc: Record<string, number>, row: any) => { acc[row.match_method] = (acc[row.match_method] ?? 0) + 1; return acc; }, {});
  const learningRows = learningEvents.data as any[];
  const customerEmails = new Set(((customerRows.data as any[]).map((row) => String(row.primary_email ?? "").trim().toLowerCase()).filter(Boolean)));
  const accessOnlyGroups = [...groupByKey(learningRows.filter((event) => event.buyer_email && !customerEmails.has(String(event.buyer_email).toLowerCase())), (event) => String(event.buyer_email).toLowerCase()).entries()]
    .map(([email, rows]) => ({ email, masked_email: maskEmail(email), events: rows.length, products: [...new Set(rows.map((row) => row.hotmart_product_name).filter(Boolean))], event_types: [...new Set(rows.map((row) => row.event_type).filter(Boolean))], first_event: rows.map((row) => row.occurred_at).filter(Boolean).sort()[0] ?? null, last_event: rows.map((row) => row.occurred_at).filter(Boolean).sort().at(-1) ?? null }))
    .sort((a, b) => b.events - a.events);
  const p13DecisionRows = decisionRows.filter((decision) => (decision.source === "P1.3_STUDENT_360" || decision.source === "P1.4_STUDENT_360") && decision.status === "active" && decision.decision_type === "PENDING_HUMAN_REVIEW");
  const probableEnrollmentEvents = p13DecisionRows.some((row) => row.entity_id === "CLUB_PROBABLE_PRODUCT_BASE_14") ? 14 : 0;
  const ambiguousEnrollmentEvents = p13DecisionRows.some((row) => row.entity_id === "CLUB_AMBIGUOUS_ENROLLMENT_5") ? 7 : 0;
  const pendingProducts = productRows.filter((product) => !identityRows.some((identity) => identity.product_id === product.id));
  const pendingContents = contentRows.filter((content) => !content.product_tags || (Array.isArray(content.product_tags) && content.product_tags.length === 0));
  const brlConfirmed = comparableSales.filter((row) => row.moeda === "BRL" && confirmedCanonicals.has(canonicalHotmartStatus(row.status_original ?? row.status_normalizado ?? row.status)));
  const needsReview = objectNumber(comparisonCounts.MATCH_DIVERGENT) + objectNumber(comparisonCounts.ONLY_HOTMART) + objectNumber(comparisonCounts.ONLY_NORWYN) + unknownCommercial.length + nonBrlCommercial.length + pendingProducts.length + pendingContents.length;
  return {
    tab,
    tenant: tenantResult.data,
    role: auth.role,
    functionalRole: auth.functionalRole,
    user: { id: auth.userId, email: auth.userEmail, name: auth.userName },
    allowedModules: auth.allowedModules,
    canWrite: auth.canWrite,
    updatedAt: latest([...saleRows, ...comparisonRows, ...decisionRows, ...knowledgeRows]),
    schemaReady: !uploads.error && !comparisons.error && !decisions.error && !knowledge.error,
    schemaErrors: [uploads.error, comparisons.error, decisions.error, knowledge.error, sales.error, totalSalesCount.error].filter(Boolean),
    bigNumbers: { pending: needsReview, validated: decisionRows.filter((row) => row.status === "active").length, divergences: objectNumber(comparisonCounts.MATCH_DIVERGENT) + objectNumber(comparisonCounts.ONLY_HOTMART) + objectNumber(comparisonCounts.ONLY_NORWYN) + nonBrlCommercial.length, learnings: knowledgeRows.length },
    hotmart: {
      transactionsNorwynRaw: totalSalesCount.count || saleRows.length,
      transactionsNorwyn: comparableSales.length,
      nonComparableEvents: nonComparableSales.length,
      clubEvents: clubEvents.length,
      statusUnknown: unknownCommercial.length,
      nonBrl: nonBrlCommercial.length,
      needsAttention: needsReview,
      brlCommercialGross: money(brlConfirmed.reduce((sum, row) => sum + Number(row.valor_bruto ?? 0), 0)),
      currencyCounts: comparableSales.reduce((acc: Record<string, number>, row) => { const key = row.moeda ?? "UNKNOWN"; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}),
      unknownStatusCounts: unknownCommercial.reduce((acc: Record<string, number>, row) => { const key = row.status_original ?? row.status_normalizado ?? "UNKNOWN"; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}),
      uploads: uploadRows,
      latestUpload: latestHotmartUpload,
      comparisonCounts,
      coverage,
      coverageByYear,
      coverageByProduct,
      coverageByStatus,
      onlyHotmartClassification,
      comparisons: comparisonRows.slice(0, 250),
    },
    products: { canonical: productRows, identities: identityRows, pending: pendingProducts, hotmartProductIds: [...new Set(comparableSales.map((row) => row.hotmart_product_id).filter(Boolean))], matchCounts: productMatchCounts, nameOnlyReviewGroups, clubProductReviews: p13DecisionRows.filter((row) => row.entity_type === "HOTMART_CLUB_PRODUCT"), enrollmentReviewGroups: p13DecisionRows.filter((row) => row.entity_type === "HOTMART_CLUB_ENROLLMENT_MATCH_GROUP"), accessOnlyGroups, probableEnrollmentEvents, ambiguousEnrollmentEvents, p14SchemaErrors: [productMatchQuality.error, clubMatchCandidates.error, learningEvents.error, customerRows.error].filter(Boolean) },
    contents: { rows: contentRows, pending: pendingContents },
    decisions: decisionRows,
    knowledge: knowledgeRows,
  };
}

export async function processHotmartCsvUpload(files: Array<{ name: string; text: string }>) {
  const auth = await getValidationAuth();
  if (!auth.canWrite) throw new Error("Seu perfil não pode enviar validações.");
  const client = auth.dataClient;
  const seen = new Set<string>();
  const duplicateTransactions = new Set<string>();
  const normalizedRows: any[] = [];
  const statusFound = new Set<string>();
  const currencies = new Set<string>();
  const products = new Set<string>();
  const periods: string[] = [];
  for (const file of files) {
    const rows = parseCsv(file.text);
    rows.forEach((row, index) => {
      const normalized = normalizeHotmartOfficialRow(row, file.name, index + 2);
      if (!normalized.transaction_id) return;
      if (seen.has(normalized.normalized_transaction_id ?? normalized.transaction_id)) duplicateTransactions.add(normalized.normalized_transaction_id ?? normalized.transaction_id);
      seen.add(normalized.normalized_transaction_id ?? normalized.transaction_id);
      if (normalized.raw_status) statusFound.add(normalized.raw_status);
      if (normalized.currency) currencies.add(normalized.currency);
      if (normalized.hotmart_product_id) products.add(normalized.hotmart_product_id);
      if (normalized.purchase_date) periods.push(normalized.purchase_date.slice(0, 10));
      normalizedRows.push(normalized);
    });
  }
  if (!normalizedRows.length) throw new Error("Não consegui identificar transações oficiais nos CSVs. Verifique a coluna Transação.");
  const sortedPeriods = [...periods].sort();
  const statusCounts = normalizedRows.reduce((acc: Record<string, number>, row) => {
    const key = row.raw_status ?? row.canonical_status ?? "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const confirmedRows = normalizedRows.filter((row) => confirmedCanonicals.has(row.canonical_status));
  const pendingRows = normalizedRows.filter((row) => pendingCanonicals.has(row.canonical_status));
  const lostRows = normalizedRows.filter((row) => lostCanonicals.has(row.canonical_status));
  const refundedRows = normalizedRows.filter((row) => refundCanonicals.has(row.canonical_status));
  const netRevenueAllRows = money(normalizedRows.reduce((sum, row) => sum + Number(row.normalized_payload?.producer_net_revenue ?? row.normalized_payload?.net_revenue ?? 0), 0));
  const confirmedNetRevenue = money(confirmedRows.reduce((sum, row) => sum + Number(row.normalized_payload?.producer_net_revenue ?? row.normalized_payload?.net_revenue ?? 0), 0));
  const refundRateDenominator = confirmedRows.length + refundedRows.length;
  const hotmartReconciliation = {
    total_transactions: normalizedRows.length,
    confirmed_transactions: confirmedRows.length,
    pending_transactions: pendingRows.length,
    lost_transactions: lostRows.length,
    refunded_or_chargeback_transactions: refundedRows.length,
    status_counts: statusCounts,
    net_revenue_export_total: netRevenueAllRows,
    confirmed_net_revenue: confirmedNetRevenue,
    refund_rate_pct: refundRateDenominator ? money((refundedRows.length / refundRateDenominator) * 100) : 0,
    chargeback_rate_pct: refundRateDenominator ? money((normalizedRows.filter((row) => row.canonical_status === "CHARGEBACK").length / refundRateDenominator) * 100) : 0,
    semantic_rule: "confirmed = APPROVED + COMPLETED; refund_rate = refunded_or_chargeback / (confirmed + refunded_or_chargeback)",
  };
  const fileHash = createHash("sha256").update(files.map((file) => `${file.name}:${file.text}`).join("\n---file---\n")).digest("hex");
  const { data: uploadData, error: uploadError } = await client.from("norwyn_validation_uploads").insert({
    tenant_id: auth.tenantId,
    validation_type: "HOTMART",
    source: "HOTMART_OFFICIAL_EXPORT",
    original_filename: files.map((file) => file.name).join(", ").slice(0, 1000),
    file_hash: fileHash,
    uploaded_by: auth.userId,
    detected_period_start: sortedPeriods[0] ?? null,
    detected_period_end: sortedPeriods.at(-1) ?? null,
    row_count: normalizedRows.length,
    unique_transaction_count: seen.size,
    duplicate_count: duplicateTransactions.size,
    status: "staged",
    summary: { files: files.length, rows: normalizedRows.length, unique_transactions: seen.size, duplicate_transactions: duplicateTransactions.size, statuses: [...statusFound], currencies: [...currencies], products: [...products], hotmart_reconciliation: hotmartReconciliation, parser_version: "hotmart_validation_v4_golden_30d" },
  }).select("*").single();
  if (uploadError) throw new Error(uploadError.message);
  const upload = uploadData as { id: string } & Record<string, unknown>;
  const rowPayloads = normalizedRows.map((row) => ({ tenant_id: auth.tenantId, upload_id: upload.id, source_file: row.normalized_payload.source_file, source_row: row.normalized_payload.source_row, ...row }));
  for (let index = 0; index < rowPayloads.length; index += 500) {
    const { error } = await client.from("norwyn_hotmart_validation_rows").insert(rowPayloads.slice(index, index + 500));
    if (error) throw new Error(error.message);
  }
  const { data: counts, error: rpcError } = await client.rpc("norwyn_rebuild_hotmart_validation_comparisons", { p_upload_id: upload.id });
  if (rpcError) throw new Error(rpcError.message);
  const comparison = Object.fromEntries((counts ?? []).map((row: any) => [row.result_status ?? row.match_status, Number(row.result_total ?? row.total ?? 0)]));
  const { count: stagedCount } = await client.from("norwyn_hotmart_validation_rows").select("id", { count: "exact", head: true }).eq("tenant_id", auth.tenantId).eq("upload_id", upload.id);
  const { data: refreshedUpload } = await client.from("norwyn_validation_uploads").select("*").eq("tenant_id", auth.tenantId).eq("id", upload.id).single();
  return { upload: refreshedUpload ?? upload, preview: { files: files.length, rows: normalizedRows.length, stagedRows: stagedCount ?? normalizedRows.length, uniqueTransactions: seen.size, duplicateTransactions: duplicateTransactions.size, statuses: [...statusFound], currencies: [...currencies], products: products.size, periodStart: sortedPeriods[0] ?? null, periodEnd: sortedPeriods.at(-1) ?? null, hotmartReconciliation }, comparison };
}

export async function createValidationDecision(input: any) {
  const auth = await getValidationAuth();
  if (!auth.canWrite) throw new Error("Seu perfil não pode registrar validações.");
  const payload = { tenant_id: auth.tenantId, validation_type: input.validation_type ?? "GENERAL", entity_type: input.entity_type ?? "feedback", entity_id: input.entity_id ? String(input.entity_id) : null, upload_id: input.upload_id || null, decision_type: input.decision_type ?? "feedback", previous_value: input.previous_value ?? null, new_value: input.new_value ?? null, comment: input.comment || null, learn_scope: input.learn_scope ?? "single_case", decided_by: auth.userId, decided_role: auth.role, metadata: input.metadata ?? {} };
  const { data: decisionData, error } = await auth.dataClient.from("norwyn_validation_decisions").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  const decision = decisionData as { id: string } & Record<string, unknown>;
  const sourceDecisionId = input.metadata?.source_decision_id ? String(input.metadata.source_decision_id) : null;
  if (sourceDecisionId && sourceDecisionId !== decision.id && payload.decision_type !== "REVISAR_DECISAO") {
    const { error: sourceUpdateError } = await auth.dataClient.from("norwyn_validation_decisions").update({ status: "superseded", metadata: { ...(input.metadata ?? {}), superseded_by: decision.id, superseded_at: new Date().toISOString() } }).eq("tenant_id", auth.tenantId).eq("id", sourceDecisionId);
    if (sourceUpdateError) throw new Error(sourceUpdateError.message);
  }
  if (payload.learn_scope !== "single_case") {
    const { error: knowledgeError } = await auth.dataClient.from("norwyn_validation_knowledge").insert({ tenant_id: auth.tenantId, knowledge_type: payload.learn_scope === "suggested_rule" ? "suggested_rule" : "reusable_learning", subject_type: payload.entity_type, subject_key: payload.entity_id ?? decision.id, predicate: payload.decision_type, object_type: input.object_type ?? null, object_key: input.object_key ?? null, confidence: input.confidence ?? 0.7, status: payload.learn_scope === "suggested_rule" ? "suggested" : "approved", source_decision_id: decision.id, evidence: { comment: payload.comment, previous_value: payload.previous_value, new_value: payload.new_value }, approved_by: payload.learn_scope === "reusable_learning" ? auth.userId : null, approved_at: payload.learn_scope === "reusable_learning" ? new Date().toISOString() : null });
    if (knowledgeError) throw new Error(knowledgeError.message);
  }
  return decision;
}

















