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

const sales = await fetchAll(() => supabase.from("comercial_vendas").select("id,tenant_id,transaction_id,produto_id,hotmart_product_id,produto_nome,comprador_email,comprador_nome,data_compra,data_aprovacao,created_at,updated_at,last_event_at,imported_at,commercial_transaction,sale_confirmed,revenue_eligible,student_eligible,grupo_comercial,valor_bruto,moeda").not("comprador_email", "is", null));
const grouped = new Map();
for (const row of sales) {
  const email = String(row.comprador_email ?? "").trim().toLowerCase();
  if (!email) continue;
  const key = `${row.tenant_id}:${email}`;
  const first = row.data_compra ?? row.data_aprovacao ?? row.created_at ?? null;
  const last = row.updated_at ?? row.last_event_at ?? row.imported_at ?? row.data_aprovacao ?? row.data_compra ?? null;
  const current = grouped.get(key) ?? { tenant_id: row.tenant_id, email, name: row.comprador_nome ?? null, first, last, commercial_transactions: 0, eligible_purchases: 0 };
  current.name ||= row.comprador_nome ?? null;
  if (first && (!current.first || first < current.first)) current.first = first;
  if (last && (!current.last || last > current.last)) current.last = last;
  if (row.commercial_transaction) current.commercial_transactions += 1;
  if (row.sale_confirmed && row.student_eligible) current.eligible_purchases += 1;
  grouped.set(key, current);
}

const existingCustomers = await fetchAll(() => supabase.from("norwyn_customers").select("id,tenant_id,primary_email,first_seen_at,last_seen_at").not("primary_email", "is", null));
const existingCustomerKeys = new Set(existingCustomers.map((row) => `${row.tenant_id}:${String(row.primary_email).toLowerCase()}`));
const newCustomers = [...grouped.values()].filter((row) => !existingCustomerKeys.has(`${row.tenant_id}:${row.email}`)).map((row) => ({
  tenant_id: row.tenant_id,
  primary_email: row.email,
  display_name: row.name,
  identity_level: "IDENTIFIED",
  source: "hotmart",
  first_seen_at: row.first,
  last_seen_at: row.last,
  metadata: { commercial_transactions: row.commercial_transactions, eligible_purchases: row.eligible_purchases, merge_rule: "email_only_no_name_merge", seed: "p0_3" },
}));
for (const group of chunks(newCustomers)) {
  const { error } = await supabase.from("norwyn_customers").insert(group);
  if (error) throw new Error(error.message);
}

const customers = await fetchAll(() => supabase.from("norwyn_customers").select("id,tenant_id,primary_email,first_seen_at,last_seen_at").not("primary_email", "is", null));
const customerByEmail = new Map(customers.map((row) => [`${row.tenant_id}:${String(row.primary_email).toLowerCase()}`, row]));
const identityPayload = customers.map((customer) => ({ tenant_id: customer.tenant_id, customer_id: customer.id, identity_type: "email", identity_value: customer.primary_email, normalized_value: String(customer.primary_email).toLowerCase(), confidence: "IDENTIFIED", source: "hotmart", first_seen_at: customer.first_seen_at, last_seen_at: customer.last_seen_at, metadata: { merge_rule: "email_only_no_name_merge", seed: "p0_3" } }));
for (const group of chunks(identityPayload)) {
  const { error } = await supabase.from("norwyn_customer_identities").upsert(group, { onConflict: "tenant_id,identity_type,normalized_value" });
  if (error) throw new Error(error.message);
}

const existingEnrollments = await fetchAll(() => supabase.from("norwyn_customer_enrollments").select("tenant_id,purchase_sale_id").not("purchase_sale_id", "is", null));
const existingEnrollmentKeys = new Set(existingEnrollments.map((row) => `${row.tenant_id}:${row.purchase_sale_id}`));
const eligibleSales = sales.filter((row) => row.commercial_transaction && row.sale_confirmed && row.student_eligible && row.comprador_email);
const enrollmentPayload = [];
for (const row of eligibleSales) {
  if (existingEnrollmentKeys.has(`${row.tenant_id}:${row.id}`)) continue;
  const customer = customerByEmail.get(`${row.tenant_id}:${String(row.comprador_email).toLowerCase()}`);
  if (!customer) continue;
  enrollmentPayload.push({ tenant_id: row.tenant_id, customer_id: customer.id, commercial_product_id: row.produto_id, purchase_transaction_id: row.transaction_id, purchase_sale_id: row.id, enrolled_at: row.data_aprovacao ?? row.data_compra ?? row.created_at, access_started_at: row.data_aprovacao, status: row.grupo_comercial === "refunded" || row.grupo_comercial === "chargeback" ? "REFUNDED" : "ACTIVE", source: "hotmart", freshness: row.last_event_at ?? row.imported_at ?? row.updated_at, metadata: { source: "comercial_vendas", hotmart_product_id: row.hotmart_product_id, product_name: row.produto_nome, revenue_eligible: row.revenue_eligible, student_eligible: row.student_eligible, seed: "p0_3" } });
}
for (const group of chunks(enrollmentPayload)) {
  const { error } = await supabase.from("norwyn_customer_enrollments").insert(group);
  if (error) throw new Error(error.message);
}

console.log(JSON.stringify({ sales_seen: sales.length, customers_seen: grouped.size, customers_inserted: newCustomers.length, identities_upserted: identityPayload.length, eligible_sales_seen: eligibleSales.length, enrollments_inserted: enrollmentPayload.length }, null, 2));
