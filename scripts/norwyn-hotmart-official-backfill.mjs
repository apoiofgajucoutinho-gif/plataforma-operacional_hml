import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

const statusMap = new Map(Object.entries({
  APPROVED: "APPROVED", APROVADO: "APPROVED",
  COMPLETE: "COMPLETED", COMPLETO: "COMPLETED", COMPLETED: "COMPLETED",
  ATRASADO: "OVERDUE", OVERDUE: "OVERDUE",
  CANCELADO: "CANCELLED", CANCELADA: "CANCELLED", CANCELED: "CANCELLED", CANCELLED: "CANCELLED",
  EXPIRADO: "EXPIRED", EXPIRADA: "EXPIRED", EXPIRED: "EXPIRED",
  REEMBOLSADO: "REFUNDED", REEMBOLSADA: "REFUNDED", REFUNDED: "REFUNDED", PARTIALLY_REFUNDED: "REFUNDED",
  CHARGEBACK: "CHARGEBACK",
  INICIADA: "STARTED", INICIADO: "STARTED", STARTED: "STARTED",
  AGUARDANDO_PAGTO: "PENDING_PAYMENT", AGUARDANDO_PAGAMENTO: "PENDING_PAYMENT", WAITING_PAYMENT: "PENDING_PAYMENT", PRINTED_BILLET: "PENDING_PAYMENT",
  PROCESSING_TRANSACTION: "PENDING_PAYMENT", UNDER_ANALISYS: "PENDING_PAYMENT", UNDER_ANALYSIS: "PENDING_PAYMENT",
  NO_FUNDS: "CANCELLED", BLOCKED: "CANCELLED", PROTESTED: "CANCELLED",
}));
function token(value) { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/[\s-]+/g, "_"); }
function canonical(value) { return statusMap.get(token(value)) ?? "UNKNOWN"; }
function groupFor(value) {
  const c = canonical(value);
  if (["APPROVED", "COMPLETED"].includes(c)) return "confirmed";
  if (["OVERDUE", "STARTED", "PENDING_PAYMENT"].includes(c)) return "pending";
  if (["CANCELLED", "EXPIRED"].includes(c)) return "lost";
  if (c === "REFUNDED") return "refunded";
  if (c === "CHARGEBACK") return "chargeback";
  return "unknown";
}
function chunks(items, size = 500) { const out = []; for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size)); return out; }
async function fetchAll(factory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await factory().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const importRunId = "central_validacao_backfill_0083";

const { data: upload, error: uploadError } = await supabase.from("norwyn_validation_uploads").select("id").eq("validation_type", "HOTMART").order("uploaded_at", { ascending: false }).limit(1).single();
if (uploadError) throw new Error(uploadError.message);

const comparisons = await fetchAll(() => supabase.from("norwyn_hotmart_validation_comparisons").select("tenant_id,validation_row_id,normalized_transaction_id").eq("upload_id", upload.id).eq("match_status", "ONLY_HOTMART").eq("sale_comparable", true));
const rowIds = comparisons.map((row) => row.validation_row_id).filter(Boolean);
const validationRows = [];
for (const group of chunks(rowIds, 80)) {
  const { data, error } = await supabase.from("norwyn_hotmart_validation_rows").select("*").in("id", group);
  if (error) throw new Error(error.message);
  validationRows.push(...(data ?? []));
}
const compByRow = new Map(comparisons.map((row) => [row.validation_row_id, row]));
const missing = validationRows.map((row) => ({ ...row, comparison: compByRow.get(row.id), normalized_transaction_id: compByRow.get(row.id)?.normalized_transaction_id })).filter((row) => row.normalized_transaction_id);

let insertedRaw = 0;
let insertedSales = 0;
for (const group of chunks(missing, 300)) {
  const transactions = group.map((row) => row.normalized_transaction_id);
  const { data: existingSales, error: existingError } = await supabase.from("comercial_vendas").select("tenant_id,transaction_id").in("transaction_id", transactions);
  if (existingError) throw new Error(existingError.message);
  const existingSet = new Set((existingSales ?? []).map((row) => `${row.tenant_id}:${row.transaction_id}`));
  const toInsert = group.filter((row) => !existingSet.has(`${row.tenant_id}:${row.normalized_transaction_id}`));
  if (!toInsert.length) continue;

  const products = [...new Map(toInsert.filter((row) => row.hotmart_product_id).map((row) => [`${row.tenant_id}:${row.hotmart_product_id}`, {
    tenant_id: row.tenant_id, plataforma: "hotmart", hotmart_product_id: row.hotmart_product_id,
    nome: row.hotmart_product_name ?? row.hotmart_product_id ?? "Produto Hotmart sem nome", ativo: true,
    metadata: { source: "HOTMART_OFFICIAL_EXPORT", validation_upload_id: upload.id },
  }])).values()];
  if (products.length) {
    const { error } = await supabase.from("comercial_produtos").upsert(products, { onConflict: "tenant_id,hotmart_product_id" });
    if (error) throw new Error(error.message);
  }
  const { data: productRows, error: productError } = await supabase.from("comercial_produtos").select("id,tenant_id,hotmart_product_id").in("hotmart_product_id", [...new Set(toInsert.map((row) => row.hotmart_product_id).filter(Boolean))]);
  if (productError) throw new Error(productError.message);
  const productMap = new Map((productRows ?? []).map((row) => [`${row.tenant_id}:${row.hotmart_product_id}`, row.id]));

  const rawPayload = toInsert.map((row) => ({
    tenant_id: row.tenant_id, source: "HOTMART_OFFICIAL_EXPORT", event_id: `official-export-${upload.id}-${row.normalized_transaction_id}`,
    transaction_id: row.normalized_transaction_id,
    payload: { ...(row.raw_payload ?? {}), validation_upload_id: upload.id, validation_row_id: row.id, source_file: row.source_file, source_row: row.source_row },
    status: "processado", processed_at: new Date().toISOString(),
  }));
  const { data: rawRows, error: rawError } = await supabase.from("comercial_hotmart_raw").insert(rawPayload).select("id,tenant_id,transaction_id");
  if (rawError) throw new Error(rawError.message);
  insertedRaw += rawRows?.length ?? 0;
  const rawMap = new Map((rawRows ?? []).map((row) => [`${row.tenant_id}:${row.transaction_id}`, row.id]));

  const salesPayload = toInsert.map((row) => {
    const normalizedStatus = canonical(row.raw_status);
    const group = groupFor(row.raw_status);
    const isBundleChild = /^HP\d+C\d+$/.test(row.normalized_transaction_id);
    const currency = row.currency ?? "BRL";
    const reason = isBundleChild ? "bundle_item_requires_review" : group !== "confirmed" ? "not_confirmed_status" : currency !== "BRL" ? "non_brl_currency" : "brl_confirmed_sale";
    return {
      tenant_id: row.tenant_id, transaction_id: row.normalized_transaction_id, aluno_id: null,
      produto_id: productMap.get(`${row.tenant_id}:${row.hotmart_product_id}`) ?? null,
      hotmart_product_id: row.hotmart_product_id, produto_nome: row.hotmart_product_name,
      comprador_nome: row.buyer_name, comprador_email: row.buyer_email?.toLowerCase() ?? null,
      status: row.raw_status ?? normalizedStatus, status_original: row.raw_status, status_normalizado: normalizedStatus, grupo_comercial: group,
      forma_pagamento: row.payment_method, parcelas: 1, moeda: currency, valor_bruto: row.normalized_value ?? 0,
      valor_liquido: null, taxas: null, coproducao: null, data_compra: row.purchase_date,
      data_aprovacao: ["APPROVED", "COMPLETED"].includes(normalizedStatus) ? (row.approved_date ?? row.purchase_date) : row.approved_date,
      data_reembolso: row.refund_date, data_chargeback: null, expected_payment_date: null, source_sck: null,
      origem: "hotmart_official_export", raw_id: rawMap.get(`${row.tenant_id}:${row.normalized_transaction_id}`),
      last_event_at: row.approved_date ?? row.purchase_date ?? row.created_at, imported_at: new Date().toISOString(),
      data_lacunas: reason === "brl_confirmed_sale" ? [] : [reason],
      metadata: { source: "HOTMART_OFFICIAL_EXPORT", validation_upload_id: upload.id, validation_row_id: row.id, source_file: row.source_file, source_row: row.source_row, lineage: importRunId, raw_value: row.raw_value, offer_id: row.offer_id, offer_name: row.offer_name },
      commercial_transaction: true, sale_confirmed: group === "confirmed",
      revenue_eligible: group === "confirmed" && currency === "BRL" && !isBundleChild,
      student_eligible: group === "confirmed" && !isBundleChild,
      sale_comparable: true, event_class: "SALE_TRANSACTION", eligibility_reason: reason, import_run_id: importRunId,
    };
  });
  const { data: salesRows, error: salesError } = await supabase.from("comercial_vendas").insert(salesPayload).select("id");
  if (salesError) throw new Error(salesError.message);
  insertedSales += salesRows?.length ?? 0;
}

const allSales = await fetchAll(() => supabase.from("comercial_vendas").select("id,tenant_id,transaction_id,raw_id,status_original,status_normalizado,grupo_comercial,event_class,commercial_transaction,sale_confirmed,revenue_eligible,student_eligible,data_aprovacao,data_compra,last_event_at,origem,import_run_id,metadata"));
const { count: historyCount, error: historyCountError } = await supabase.from("norwyn_hotmart_transaction_status_history").select("id", { count: "exact", head: true });
if (historyCountError) throw new Error(historyCountError.message);
if (!historyCount) {
  for (const group of chunks(allSales, 500)) {
    const payload = group.map((row) => ({
      tenant_id: row.tenant_id, transaction_id: row.transaction_id, sale_id: row.id, raw_id: row.raw_id,
      status_original: row.status_original, status_normalizado: row.status_normalizado ?? "UNKNOWN", grupo_comercial: row.grupo_comercial ?? "unknown",
      event_class: row.event_class ?? "SALE_TRANSACTION", commercial_transaction: row.commercial_transaction, sale_confirmed: row.sale_confirmed,
      revenue_eligible: row.revenue_eligible, student_eligible: row.student_eligible, occurred_at: row.data_aprovacao ?? row.data_compra ?? row.last_event_at,
      source: row.origem ?? "hotmart", import_run_id: row.import_run_id ?? "historical_existing", metadata: { ...(row.metadata ?? {}), lineage: "status_history_seed_0083" },
    }));
    const { error } = await supabase.from("norwyn_hotmart_transaction_status_history").insert(payload);
    if (error) throw new Error(error.message);
  }
}

const emailGroups = new Map();
for (const row of allSales) {
  const email = row.metadata?.comprador_email ?? row.comprador_email;
}
const personRows = await fetchAll(() => supabase.from("comercial_vendas").select("tenant_id,comprador_email,comprador_nome,data_compra,data_aprovacao,created_at,updated_at,commercial_transaction,sale_confirmed,student_eligible,revenue_eligible").not("comprador_email", "is", null));
const grouped = new Map();
for (const row of personRows) {
  const key = `${row.tenant_id}:${String(row.comprador_email).toLowerCase()}`;
  const current = grouped.get(key) ?? { tenant_id: row.tenant_id, email: String(row.comprador_email).toLowerCase(), name: row.comprador_nome, first: row.data_compra ?? row.data_aprovacao ?? row.created_at, last: row.data_aprovacao ?? row.data_compra ?? row.updated_at, tx: 0, eligible: 0 };
  current.name ||= row.comprador_nome;
  if (row.data_compra && (!current.first || row.data_compra < current.first)) current.first = row.data_compra;
  if (row.updated_at && (!current.last || row.updated_at > current.last)) current.last = row.updated_at;
  if (row.commercial_transaction) current.tx += 1;
  if (row.sale_confirmed && row.student_eligible && row.revenue_eligible) current.eligible += 1;
  grouped.set(key, current);
}
let customersInserted = 0;
for (const group of chunks([...grouped.values()], 500)) {
  const payload = group.map((row) => ({ tenant_id: row.tenant_id, primary_email: row.email, display_name: row.name, identity_level: "IDENTIFIED", source: "hotmart", first_seen_at: row.first, last_seen_at: row.last, metadata: { commercial_transactions: row.tx, eligible_purchases: row.eligible, merge_rule: "email_only_no_name_merge" } }));
  const { data, error } = await supabase.from("norwyn_customers").upsert(payload, { onConflict: "tenant_id,primary_email" }).select("id");
  if (error) {
    for (const item of payload) {
      const { data: existing } = await supabase.from("norwyn_customers").select("id").eq("tenant_id", item.tenant_id).eq("primary_email", item.primary_email).maybeSingle();
      if (!existing) {
        const { error: insertError } = await supabase.from("norwyn_customers").insert(item);
        if (insertError) throw new Error(insertError.message);
        customersInserted += 1;
      }
    }
  } else customersInserted += data?.length ?? 0;
}

console.log(JSON.stringify({ upload_id: upload.id, missing_considered: missing.length, inserted_raw: insertedRaw, inserted_sales: insertedSales, status_history_seeded: allSales.length, customers_seen: grouped.size, customers_touched: customersInserted }, null, 2));


