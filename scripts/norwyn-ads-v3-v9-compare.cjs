const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const tenantId = process.env.PLATAFORMA_TENANT_ID || "ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("Comparativo V3 x V9 SKIP: credenciais HML somente leitura não disponíveis.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const metrics = ["valor_gasto", "impressoes", "cliques", "link_clicks", "outbound_clicks", "landing_page_views", "initiate_checkouts", "meta_purchases"];

function aggregate(rows) {
  return Object.fromEntries(metrics.map((metric) => [metric, rows.reduce((sum, row) => sum + Number(row[metric] || 0), 0)]));
}

async function load(origin) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("instagram_ads_daily")
      .select(`data_referencia,campaign_id,adset_id,ad_id,campanha,conjunto,anuncio,${metrics.join(",")}`)
      .eq("tenant_id", tenantId).eq("origem", origin).order("data_referencia", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

(async () => {
  const [v3, v9] = await Promise.all([load("n8n_meta_ads"), load("n8n_meta_ads_v9")]);
  const datesV3 = new Set(v3.map((row) => row.data_referencia));
  const datesV9 = new Set(v9.map((row) => row.data_referencia));
  const overlap = [...datesV9].filter((date) => datesV3.has(date)).sort();
  const selectPeriod = (rows) => overlap.length ? rows.filter((row) => overlap.includes(row.data_referencia)) : rows;
  const result = {
    mode: "read_only",
    tenant_id: tenantId,
    overlap_dates: overlap,
    comparable: overlap.length > 0,
    v3: { rows: selectPeriod(v3).length, dates: [v3[0]?.data_referencia ?? null, v3.at(-1)?.data_referencia ?? null], totals: aggregate(selectPeriod(v3)) },
    v9: { rows: selectPeriod(v9).length, dates: [v9[0]?.data_referencia ?? null, v9.at(-1)?.data_referencia ?? null], totals: aggregate(selectPeriod(v9)) },
    note: overlap.length
      ? "Diferenças devem considerar aliases canônicos, janela de atribuição e enriquecimento V9."
      : "Não há datas persistidas por ambas as origens. Como V3 e V9 compartilham row_key, uma comparação válida exige dry-run V9 contra a última coleta V3, sem persistir.",
  };
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error("Comparativo V3 x V9 falhou:", error.message);
  process.exit(1);
});
