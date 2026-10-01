const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const analytics = fs.readFileSync("modules/ads/services/ads-analytics.ts", "utf8");
const dashboard = fs.readFileSync("modules/ads/components/AdsDashboard.tsx", "utf8");
const server = fs.readFileSync("modules/ads/services/ads-server.ts", "utf8");
const pagination = fs.readFileSync("lib/supabase/pagination.ts", "utf8");
const compare = fs.readFileSync("scripts/norwyn-ads-v3-v9-compare.cjs", "utf8");
const workflow = JSON.parse(fs.readFileSync("modules/ads/Instagram Ads Daily Collector_V9_Traffic_Foundation.json", "utf8"));
const v3Path = "modules/ads/Instagram Ads Daily Collector_V3_Supabase_2026_full.json";

assert.match(analytics, /normalizedOrCanonical/);
assert.match(analytics, /canonicalMetaActions\.landingPageViews/);
assert.match(analytics, /canonicalMetaActions\.initiateCheckouts/);
assert.match(analytics, /purchaseActionPriority/);
assert.doesNotMatch(analytics, /complete_registration/);
assert.doesNotMatch(analytics, /actionValue\(payload, purchaseActions\)/);

for (const text of ["Alcance diário acumulado", "Frequência diária ponderada", "Status Meta ACTIVE", "Caminho de sinais", "Meta reported", "Hotmart confirmado", "Traffic Intelligence V1"]) assert.ok(dashboard.includes(text), `missing semantic UI: ${text}`);
for (const forbidden of ["pessoas únicas\"", "Impressões -> Alcance -> Cliques", "O que a Agência Deveria Ter Feito", "Público Ruim\""]) assert.ok(!dashboard.includes(forbidden), `legacy conclusion still visible: ${forbidden}`);
assert.match(server, /instagram_ads_config_snapshots/);
assert.match(server, /landing_page_tracking_events/);
assert.match(server, /comercial_vendas/);
assert.match(server, /source_type.*REAL/);
assert.match(pagination, /collectSupabasePages/);
assert.doesNotMatch(compare, /insert|update|delete|upsert/i);
assert.match(compare, /não comparável por ausência na coleta V3/);
assert.match(compare, /approved: !unexplainedBaseDifference && !unexplainedDifference/);

assert.equal(workflow.active, false, "V9 must remain inactive");
assert.equal(workflow.settings.timezone, "America/Sao_Paulo");
const schedule = workflow.nodes.find((node) => node.name === "20h30 Daily");
assert.equal(schedule.parameters.rule.interval[0].field, "days");
assert.equal(schedule.parameters.rule.interval[0].triggerAtHour, 20);
assert.equal(schedule.parameters.rule.interval[0].triggerAtMinute, 30);
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(v3Path)).digest("hex").toUpperCase(), "A0DDD00F2E14BD046B8C2342FD9716BC85695CACE81DD9F386A720C6BF92A9B6", "V3 must remain byte-for-byte unchanged");

console.log("Traffic Intelligence V1 regression PASS");
