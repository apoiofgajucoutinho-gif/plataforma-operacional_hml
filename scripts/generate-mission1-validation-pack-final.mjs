import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "output", "mission1-validation");
const finalPath = path.join(outputDir, "mission1-zumbido-ajustes-validation-pack-FINAL-v3.csv");
const reviewPath = path.join(outputDir, "mission1-zumbido-ajustes-validation-pack-REVIEW-v3.csv");
const tenantId = "ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0";
const runKey = "mission1_zumbido_to_ajustes_2026_08_25";
const zumbidoProductId = "1a7ba875-9c1d-4007-9871-ae2636a722a7";
const zumbidoDirectHotmartId = "1266044";
const zumbidoRelatedHotmartIds = new Set(["5548267", "5555696", "8221278", "8221336"]);
const ajustesRelatedHotmartIds = new Set(["8026798", "7862053", "7862065", "8117615", "8014065"]);

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1]] ??= match[2].replace(/^"|"$/g, "");
  }
}

function norm(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isRefundOrCancel(sale) {
  return Boolean(sale.data_reembolso) || /(refund|cancel|reembols|cancelad)/.test(norm(`${sale.status_normalizado ?? ""} ${sale.status_original ?? ""}`));
}

function commercialValueBrl(sale) {
  const currency = String(sale.moeda ?? "BRL").toUpperCase();
  if (currency && currency !== "BRL") return 0;
  return Number(sale.valor_bruto ?? 0);
}

function originStatus(sale) {
  if (!sale) return "ZUMBIDO_NOT_FOUND";
  if (String(sale.hotmart_product_id ?? "") === zumbidoDirectHotmartId || String(sale.produto_id ?? "") === zumbidoProductId) return "ZUMBIDO_CONFIRMED";
  if (zumbidoRelatedHotmartIds.has(String(sale.hotmart_product_id ?? ""))) return "ZUMBIDO_CONFIRMED_VIA_RELATED_PRODUCT";
  return "ZUMBIDO_CONFIRMED_VIA_ALIAS";
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function csv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => esc(row[header])).join(","))].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { row.push(cell); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

async function fetchAll(client, table, select, filter) {
  const pageSize = 1000;
  const out = [];
  for (let from = 0; ; from += pageSize) {
    let query = client.from(table).select(select).range(from, from + pageSize - 1);
    query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

loadEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRole) throw new Error("Supabase env missing.");
const client = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

const { data: run, error: runError } = await client
  .from("norwyn_lifecycle_eligibility_runs")
  .select("id,total,eligible,excluded,needs_review,created_at")
  .eq("tenant_id", tenantId)
  .eq("run_key", runKey)
  .single();
if (runError) throw new Error(runError.message);

const members = await fetchAll(client, "norwyn_lifecycle_eligibility_members", "id,run_id,person_key,customer_hash,status,owned_product_ids,source_product_id,target_product_id,first_purchase_at,last_purchase_at,ltv_commercial,has_formation,eligibility_reasons,exclusion_reasons,confidence,evidence,created_at", (q) => q.eq("tenant_id", tenantId).eq("run_id", run.id));
const sales = await fetchAll(client, "comercial_vendas", "id,transaction_id,produto_id,hotmart_product_id,produto_nome,comprador_nome,comprador_email,status_original,status_normalizado,grupo_comercial,forma_pagamento,moeda,valor_bruto,data_compra,data_aprovacao,data_reembolso,source_sck,imported_at,last_event_at,metadata", (q) => q.eq("tenant_id", tenantId));

const salesByEmail = new Map();
for (const sale of sales) {
  const email = String(sale.comprador_email ?? "").trim().toLowerCase();
  if (!email) continue;
  if (!salesByEmail.has(email)) salesByEmail.set(email, []);
  salesByEmail.get(email).push(sale);
}

function productFlags(salesForPerson, member) {
  const names = salesForPerson.map((sale) => norm(sale.produto_nome)).join(" ");
  const ids = new Set(salesForPerson.map((sale) => String(sale.hotmart_product_id ?? "")).filter(Boolean));
  const directZumbidoSale = salesForPerson.find((sale) => String(sale.hotmart_product_id ?? "") === zumbidoDirectHotmartId || String(sale.produto_id ?? "") === zumbidoProductId);
  const relatedZumbidoSale = salesForPerson.find((sale) => zumbidoRelatedHotmartIds.has(String(sale.hotmart_product_id ?? "")));
  const aliasZumbidoSale = salesForPerson.find((sale) => norm(sale.produto_nome).includes("zumbido"));
  const zumbidoSale = directZumbidoSale ?? relatedZumbidoSale ?? aliasZumbidoSale;
  const hasAasi = Boolean(member.has_formation) || /aasi/.test(names);
  const hasMrc = /mascaramento|mrc|diagnost/.test(names);
  const hasAjustes = /ajustes\s*finos|perda\s*em\s*rampa/.test(names) || [...ids].some((id) => ajustesRelatedHotmartIds.has(id));
  const distinctProducts = new Set(salesForPerson.map((sale) => String(sale.hotmart_product_id ?? sale.produto_id ?? sale.produto_nome ?? "unknown"))).size;
  return { zumbidoSale, hasAasi, hasMrc, hasAjustes, distinctProducts };
}

const finalRows = members.map((member) => {
  const email = String(member.person_key ?? "").trim().toLowerCase();
  const personSales = [...(salesByEmail.get(email) ?? [])].sort((a, b) => String(a.data_compra ?? a.data_aprovacao ?? "").localeCompare(String(b.data_compra ?? b.data_aprovacao ?? "")));
  const latestSale = personSales.at(-1);
  const flags = productFlags(personSales, member);
  const evidenceStatus = originStatus(flags.zumbidoSale);
  const hasRefundCancel = personSales.some(isRefundOrCancel);
  const hasNonBrl = personSales.some((sale) => String(sale.moeda ?? "BRL").toUpperCase() !== "BRL");
  const ltv = personSales.reduce((sum, sale) => sum + commercialValueBrl(sale), 0);
  const potentialConflict = member.status === "ELIGIBLE" && flags.hasAjustes;
  const review = member.status === "ELIGIBLE" && !potentialConflict && (evidenceStatus === "ZUMBIDO_NOT_FOUND" || flags.hasAasi || flags.hasMrc || flags.distinctProducts >= 2 || hasRefundCancel);
  const status = member.status !== "ELIGIBLE" ? "EXCLUDED" : potentialConflict ? "POTENTIAL_CONFLICT" : review ? "REVIEW" : "OK";
  const reasons = [
    flags.hasAasi ? "Possui Formacao AASI ou bundle com AASI; validar se oferta ainda faz sentido." : null,
    flags.hasMrc ? "Possui MRC/Diagnostico; validar contexto comercial antes da oferta." : null,
    flags.hasAjustes ? "Possui Ajustes Finos/Perda em Rampa ou produto relacionado; possivel conflito de oferta." : null,
    flags.distinctProducts >= 2 ? "Cliente multiproduto; revisar jornada individual." : null,
    hasRefundCancel ? "Historico contem reembolso/cancelamento/teste; revisar antes de ofertar." : null,
    evidenceStatus === "ZUMBIDO_NOT_FOUND" ? "Run marcou elegibilidade, mas a venda de Zumbido nao foi localizada no contexto carregado." : null,
    member.status !== "ELIGIBLE" ? "Excluido pela regra atual." : null,
  ].filter(Boolean);
  const products = [...new Set(personSales.map((sale) => sale.produto_nome).filter(Boolean))].join("; ");
  const segment = [
    status === "OK" ? "A_ZUMBIDO_ONLY" : null,
    member.status === "ELIGIBLE" && flags.hasAasi ? "B_ZUMBIDO_FORMACAO_AASI" : null,
    member.status === "ELIGIBLE" && flags.hasMrc ? "D_ZUMBIDO_MRC_DIAGNOSTICO" : null,
    member.status === "ELIGIBLE" && flags.distinctProducts >= 2 ? "E_MULTIPRODUTO_ALTO_LTV" : null,
    potentialConflict ? "F_POSSIVEL_CONFLITO_AJUSTES" : null,
    review ? "G_REVISAO_MANUAL" : null,
    member.status !== "ELIGIBLE" ? "H_EXCLUIDOS_REGRA_ATUAL" : null,
  ].filter(Boolean).join(";");
  return {
    review_decision: "",
    review_notes: "",
    customer_hash: member.customer_hash,
    status,
    segment_keys: segment,
    name: latestSale?.comprador_nome ?? "",
    email,
    phone: "",
    first_product: personSales[0]?.produto_nome ?? "",
    products,
    first_purchase_at: member.first_purchase_at ?? personSales[0]?.data_compra ?? personSales[0]?.data_aprovacao ?? "",
    last_purchase_at: member.last_purchase_at ?? latestSale?.data_compra ?? latestSale?.data_aprovacao ?? "",
    purchase_count: personSales.length || (member.owned_product_ids ?? []).length,
    purchases: personSales.length || (member.owned_product_ids ?? []).length,
    ltv_commercial: Number(ltv.toFixed(2)),
    bought_zumbido: evidenceStatus !== "ZUMBIDO_NOT_FOUND",
    zumbido_product_id: flags.zumbidoSale?.hotmart_product_id ?? "",
    bought_formation_aasi: flags.hasAasi,
    bought_mrc: flags.hasMrc,
    bought_ajustes_finos: flags.hasAjustes,
    bought_perda_rampa: flags.hasAjustes,
    activecampaign_status: "NOT_SYNCED",
    eligibility_reason: (member.eligibility_reasons ?? []).map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" | ") || "Comprou Zumbido e nao possui target segundo a regra atual.",
    exclusion_reason: (member.exclusion_reasons ?? []).map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(" | "),
    origin_evidence_status: evidenceStatus,
    origin_hotmart_product_id: flags.zumbidoSale?.hotmart_product_id ?? "",
    origin_purchase_at: flags.zumbidoSale?.data_compra ?? flags.zumbidoSale?.data_aprovacao ?? "",
    origin_transaction_status: flags.zumbidoSale?.status_normalizado ?? flags.zumbidoSale?.status_original ?? "",
    data_quality_status: hasNonBrl ? "NON_BRL_REQUIRES_CONVERSION" : "OK",
    review_reasons: reasons.join(" | "),
  };
}).sort((a, b) => {
  const order = { POTENTIAL_CONFLICT: 0, REVIEW: 1, OK: 2, EXCLUDED: 3 };
  return order[a.status] - order[b.status] || Number(b.ltv_commercial) - Number(a.ltv_commercial);
});

const reviewRows = finalRows.map((row) => ({
  "Classificacao Norwyn": row.status,
  "Segmento": row.segment_keys,
  "Nome": row.name,
  "E-mail": row.email,
  "Produtos comprados": row.products,
  "Comprou Zumbido?": row.bought_zumbido ? "SIM" : "NAO",
  "Possui Formacao AASI?": row.bought_formation_aasi ? "SIM" : "NAO",
  "Possui MRC?": row.bought_mrc ? "SIM" : "NAO",
  "Possui Ajustes Finos/relacionado?": row.bought_ajustes_finos || row.bought_perda_rampa ? "SIM" : "NAO",
  "Quantidade de compras": row.purchase_count,
  "LTV comercial": row.ltv_commercial,
  "Evidencia Zumbido": row.origin_evidence_status,
  "Data origem Zumbido": row.origin_purchase_at,
  "Status transacao origem": row.origin_transaction_status,
  "Qualidade dos dados": row.data_quality_status,
  "Motivo da revisao": row.review_reasons || row.eligibility_reason,
  "Decisao humana": "",
  "Observacao": "",
}));

mkdirSync(outputDir, { recursive: true });
writeFileSync(finalPath, csv(finalRows), "utf8");
writeFileSync(reviewPath, csv(reviewRows), "utf8");

function validate(filePath, ltvColumn, statusColumn, evidenceColumn) {
  const rows = parseCsv(readFileSync(filePath, "utf8"));
  const counts = Object.create(null);
  const evidence = Object.create(null);
  for (const row of rows) {
    counts[row[statusColumn]] = (counts[row[statusColumn]] ?? 0) + 1;
    evidence[row[evidenceColumn]] = (evidence[row[evidenceColumn]] ?? 0) + 1;
  }
  const ltvs = rows.map((row) => Number(String(row[ltvColumn]).replace(",", "."))).filter((value) => Number.isFinite(value));
  return {
    total: rows.length,
    counts,
    evidence,
    zumbidoNotFound: rows.filter((row) => row[evidenceColumn] === "ZUMBIDO_NOT_FOUND").length,
    emptyOriginHotmart: rows.filter((row) => row[evidenceColumn] !== "ZUMBIDO_NOT_FOUND" && "origin_hotmart_product_id" in row && !row.origin_hotmart_product_id).length,
    missingOriginPurchase: rows.filter((row) => row[evidenceColumn] !== "ZUMBIDO_NOT_FOUND" && !row["origin_purchase_at"] && !("Data origem Zumbido" in row)).length,
    ltv: {
      avg: ltvs.reduce((a, b) => a + b, 0) / ltvs.length,
      median: percentile(ltvs, 0.5),
      p90: percentile(ltvs, 0.9),
      p95: percentile(ltvs, 0.95),
      p99: percentile(ltvs, 0.99),
      max: Math.max(...ltvs),
    },
  };
}

const finalValidation = validate(finalPath, "ltv_commercial", "status", "origin_evidence_status");
const reviewValidation = validate(reviewPath, "LTV comercial", "Classificacao Norwyn", "Evidencia Zumbido");
console.log(JSON.stringify({
  run: { total: run.total, eligible: run.eligible, excluded: run.excluded },
  finalPath,
  reviewPath,
  finalValidation,
  reviewValidation,
}, null, 2));



