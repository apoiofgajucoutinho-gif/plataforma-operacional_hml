const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...rest] = line.split("=");
      process.env[key.trim()] ||= rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

async function queryRest(table, params) {
  loadDotEnv();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!baseUrl || !key) return null;
  assert.match(baseUrl, /oerdsmgiebquecqwcbox/, "Financeiro V2 DB check must only target HML");
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  assert.equal(response.ok, true, await response.text());
  return response.json();
}

(async () => {
  const dashboard = read("modules/financeiro/components/FinanceiroDashboard.tsx");
  const service = read("modules/financeiro/services/financeiro-server.ts");
  const migration = read("supabase/migrations/20260911143000_financeiro_v2_foundation.sql");

  for (const label of ["Visão Geral", "Lançamentos", "Consultas", "Admin", "Apoio"]) {
    assert.ok(dashboard.includes(label), `Missing Financeiro V2 tab ${label}`);
  }
  assert.ok(dashboard.includes("Entrou na conta"), "Financeiro V2 must show cash-in, not commercial fallback");
  assert.ok(dashboard.includes("Saldo do período"), "Financeiro V2 must label cash balance clearly");
  assert.ok(!/\.limit\(1500\)/.test(service), "Financeiro service must not use fixed 1500 row reads");
  assert.ok(!/commercial_vendas/.test(service.replace(/commercialSales: \[\]/g, "")), "Financeiro service must not query Hotmart/comercial as cash fallback");
  assert.ok(migration.includes("fin_lancamentos_snapshot"), "Migration must preserve old launch snapshot support");
  assert.ok(migration.includes("fin_is_especialista"), "Migration must include specialist finance access policy");

  const rows = await queryRest("fin_lancamentos", {
    select: "tipo,valor,fonte_original,classificacao_status",
    tenant_id: "eq.ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0",
    limit: "1000",
  });
  if (rows) {
    const loaded = rows.filter((row) => row.fonte_original === "Fluxo de caixa V2.xlsx");
    const totals = loaded.reduce((acc, row) => {
      acc[row.tipo] = Math.round(((acc[row.tipo] || 0) + Number(row.valor)) * 100) / 100;
      return acc;
    }, {});
    assert.equal(loaded.length, 186, "Financeiro HML should contain 186 loaded spreadsheet rows");
    assert.equal(totals.entrada, 161254.23, "Financeiro entradas must reconcile with spreadsheet");
    assert.equal(totals.saida, 189747.21, "Financeiro saidas must reconcile with spreadsheet");
    assert.equal(loaded.filter((row) => row.classificacao_status === "review").length, 0, "Financeiro V2 should not leave known spreadsheet rows in review after explicit taxonomy mapping");
  }

  console.log("Financeiro V2 regression PASS", { db: Boolean(rows) });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});


