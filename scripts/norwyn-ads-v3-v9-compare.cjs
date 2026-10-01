const fs = require("node:fs");
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const tenantId = process.env.PLATAFORMA_TENANT_ID || "ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const date = process.argv.find((arg) => arg.startsWith("--date="))?.slice(7) || null;
const dryRunPath = process.argv.find((arg) => arg.startsWith("--v9-file="))?.slice(10) || null;

if (!url || !key) {
  console.log("Comparativo V3 x V9 SKIP: credenciais HML somente leitura não disponíveis.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const metrics = [
  { key: "valor_gasto", label: "spend", family: "base" },
  { key: "impressoes", label: "impressions", family: "base" },
  { key: "cliques", label: "clicks", family: "base" },
  { key: "link_clicks", label: "link clicks", family: "action" },
  { key: "outbound_clicks", label: "outbound clicks", family: "action" },
  { key: "landing_page_views", label: "LPV", family: "action" },
  { key: "initiate_checkouts", label: "checkout", family: "action" },
  { key: "meta_purchases", label: "Meta Purchase", family: "action" },
];

function asRows(value) {
  if (Array.isArray(value)) return value.flatMap(asRows);
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.data)) return value.data.flatMap(asRows);
  if (Array.isArray(value.items)) return value.items.flatMap(asRows);
  if (value.json && typeof value.json === "object") return asRows(value.json);
  return [value];
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function aggregate(rows, metric) {
  const values = rows.map((row) => numberOrNull(row[metric])).filter((value) => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function canonicalAction(actions, priority) {
  if (!Array.isArray(actions)) return { value: null, source: null };
  for (const source of priority) {
    const found = actions.find((action) => String(action?.action_type || "").toLowerCase() === source);
    if (found) return { value: Number(found.value || 0), source };
  }
  return { value: null, source: null };
}

function replayV9(rows) {
  return rows.map((row) => {
    const raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    const link = canonicalAction(raw.actions, ["link_click"]);
    const outbound = canonicalAction(raw.outbound_clicks, ["outbound_click"]);
    const lpv = canonicalAction(raw.actions, ["landing_page_view", "omni_landing_page_view"]);
    const checkout = canonicalAction(raw.actions, ["offsite_conversion.fb_pixel_initiate_checkout", "initiate_checkout", "omni_initiated_checkout", "onsite_web_initiate_checkout"]);
    const purchase = canonicalAction(raw.actions, ["offsite_conversion.fb_pixel_purchase", "purchase", "omni_purchase", "onsite_web_purchase", "onsite_conversion.purchase"]);
    return {
      valor_gasto: numberOrNull(raw.spend),
      impressoes: numberOrNull(raw.impressions),
      cliques: numberOrNull(raw.clicks),
      link_clicks: link.value,
      outbound_clicks: outbound.value,
      landing_page_views: lpv.value,
      initiate_checkouts: checkout.value,
      meta_purchases: purchase.value,
      _sources: { link_clicks: link.source, outbound_clicks: outbound.source, landing_page_views: lpv.source, initiate_checkouts: checkout.source, meta_purchases: purchase.source },
    };
  });
}

function almostEqual(left, right) {
  return left !== null && right !== null && Math.abs(left - right) < 0.0001;
}

function classify(metric, v3, v9, v9Sources, mode) {
  if (almostEqual(v3, v9)) return { classification: "igualdade", reason: "Mesmo total no período comum." };
  if (v9 === null) {
    return {
      classification: mode === "replay_v3_raw_payload"
        ? "não comparável por ausência na coleta V3"
        : "diferença de fonte",
      comparable: false,
      reason: mode === "replay_v3_raw_payload"
        ? "O payload bruto persistido pela V3 não contém esta família. A ausência não bloqueia o cutover."
        : "A fonte V9 não retornou esta métrica.",
    };
  }
  if (metric.family === "base") return { classification: "diferença inesperada", reason: "Métrica-base divergiu para a mesma data e deve bloquear o cutover." };
  const sources = new Set(v9Sources.filter(Boolean));
  if (sources.size > 1) return { classification: "diferença de alias", reason: `Aliases canônicos observados: ${[...sources].join(", ")}.` };
  if (sources.size === 1) return { classification: "diferença semântica", reason: `V9 usa prioridade canônica ${[...sources][0]}; V3 pode refletir alias legado ou ausência histórica.` };
  return { classification: "diferença inesperada", reason: "Não foi encontrada evidência de alias ou mudança de fonte que explique a diferença." };
}

async function load(origin) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("instagram_ads_daily")
      .select(`data_referencia,campaign_id,adset_id,ad_id,campanha,conjunto,anuncio,raw_payload,${metrics.map((metric) => metric.key).join(",")}`)
      .eq("tenant_id", tenantId)
      .eq("origem", origin)
      .order("data_referencia", { ascending: true })
      .range(from, from + 999);
    if (date) query = query.eq("data_referencia", date);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

(async () => {
  const [loadedV3, persistedV9] = await Promise.all([load("n8n_meta_ads"), load("n8n_meta_ads_v9")]);
  let v3 = loadedV3;
  let v9 = persistedV9;
  let mode = "persisted_overlap";
  if (dryRunPath) {
    v9 = asRows(JSON.parse(fs.readFileSync(dryRunPath, "utf8")));
    mode = "exported_v9_dry_run";
  } else if (!v9.length && date) {
    v9 = replayV9(v3);
    mode = "replay_v3_raw_payload";
  } else if (!date) {
    const datesV3 = new Set(v3.map((row) => row.data_referencia));
    const overlap = new Set(v9.map((row) => row.data_referencia).filter((value) => datesV3.has(value)));
    v3 = v3.filter((row) => overlap.has(row.data_referencia));
    v9 = v9.filter((row) => overlap.has(row.data_referencia));
  }

  const comparison = metrics.map((metric) => {
    const left = aggregate(v3, metric.key);
    const right = aggregate(v9, metric.key);
    const sources = v9.flatMap((row) => row._sources?.[metric.key] || row.raw_payload?._norwyn_foundation?.action_sources?.[metric.key] || []).filter(Boolean);
    return { metric: metric.label, v3: left, v9: right, ...classify(metric, left, right, sources, mode) };
  });
  const unexplainedBaseDifference = comparison.some((item) => ["spend", "impressions", "clicks"].includes(item.metric) && item.classification !== "igualdade");
  const complete = comparison.every((item) => item.v3 !== null && item.v9 !== null);
  const unexplainedDifference = comparison.some((item) => item.classification === "diferença inesperada");
  const nonComparableMetrics = comparison.filter((item) => item.comparable === false).map((item) => item.metric);

  console.log(JSON.stringify({
    mode: "read_only",
    comparison_mode: mode,
    tenant_id: tenantId,
    period: date || "persisted overlap",
    rows: { v3: v3.length, v9: v9.length },
    comparison,
    base_metrics_approved: !unexplainedBaseDifference,
    complete,
    non_comparable_metrics: nonComparableMetrics,
    approved: !unexplainedBaseDifference && !unexplainedDifference,
    note: mode === "replay_v3_raw_payload"
      ? "Replay determinístico da transformação V9 sobre o raw_payload V3. Métricas não solicitadas pela V3 ficam indisponíveis; passe --v9-file=<export.json> para usar a saída real do smoke dry-run."
      : "Conversões são classificadas conforme aliases canônicos e não precisam coincidir com aliases legados.",
  }, null, 2));
})().catch((error) => {
  console.error("Comparativo V3 x V9 falhou:", error.message);
  process.exit(1);
});
