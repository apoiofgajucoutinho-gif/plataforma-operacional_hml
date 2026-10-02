const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const enginePath = "modules/ads/services/traffic-decision-engine.ts";
const source = fs.readFileSync(enginePath, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
new Function("module", "exports", "require", compiled)(moduleBox, moduleBox.exports, require);
const { buildTrafficDecisions } = moduleBox.exports;

const config = { minLinkClicksSignal: 8, minLinkClicksDecision: 20, reviewLinkClicksIncrement: 20, reviewHours: 24, minTrendDays: 3, comparableSpendRatio: 0.5, meaningfulSpend: null, targetCpa: null };
const reconciliation = {
  measurement: { quality: "Parcial", reasons: ["UTMs sem ad_id"], trackingCoverage: 0.2 },
  hotmart: { adAttributionAvailable: false },
};
const ads = [
  { key: "ad04", name: "AD 04", spend: 43.71, impressions: 1200, linkClicks: 23, lpv: 2, checkouts: 0, metaPurchases: 0, linkCtr: 1.92, linkCpc: 1.9, days: 3 },
  { key: "ad05", name: "AD 05", spend: 27.33, impressions: 900, linkClicks: 7, lpv: 0, checkouts: 0, metaPurchases: 1, linkCtr: 0.78, linkCpc: 3.9, days: 3 },
  { key: "ad06", name: "AD 06", spend: 29.85, impressions: 1000, linkClicks: 15, lpv: 2, checkouts: 3, metaPurchases: 3, linkCtr: 1.5, linkCpc: 1.99, days: 3 },
  { key: "ad03", name: "AD 03", spend: 1.52, impressions: 85, linkClicks: 3, lpv: 0, checkouts: 0, metaPurchases: 0, linkCtr: 3.53, linkCpc: 0.51, days: 2 },
  { key: "ad07", name: "AD 07", spend: 24, impressions: 1800, linkClicks: 12, lpv: 0, checkouts: 0, metaPurchases: 0, linkCtr: 0.67, linkCpc: 2, days: 3 },
];
const result = buildTrafficDecisions(ads, config, reconciliation);
const byKey = Object.fromEntries(result.decisions.map((item) => [item.adKey, item]));

assert.equal(byKey.ad04.state, "Bom tráfego, conversão ainda não comprovada");
assert.equal(byKey.ad04.action, "investigar pós-clique");
assert.notEqual(byKey.ad04.action, "considerar pausar");
assert.equal(byKey.ad05.state, "Resultado contraditório");
assert.equal(byKey.ad05.action, "observar");
assert.match(byKey.ad05.review, /Hotmart|24h/);
assert.equal(byKey.ad06.state, "Sinal comercial inicial");
assert.equal(byKey.ad03.state, "Amostra insuficiente");
assert.equal(byKey.ad03.confidence, "Baixa");
assert.equal(byKey.ad07.state, "Divergência de mensuração");
assert.ok(result.actions.length <= 3);
assert.ok(result.decisions.every((item) => item.review && item.confidenceReason && item.impact));
assert.ok(result.decisions.every((item) => !["pause", "budget", "targeting"].includes(item.action)));

const component = fs.readFileSync("modules/ads/components/TrafficIntelligenceV2.tsx", "utf8");
const server = fs.readFileSync("modules/ads/services/ads-server.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261002002626_traffic_intelligence_v21_campaign_resolution.sql", "utf8");
for (const label of ["O que fazer agora", "Estamos esperando", "Progresso da campanha", "Mensuração", "Quando revisar", "Impacto esperado"]) assert.ok(component.includes(label), `missing V2.1 UI: ${label}`);
assert.match(component, /creative_image_url \?\? ad\.row\.thumbnail_url/);
assert.match(component, /CreativeLightbox/);
assert.match(server, /meta_campaign_ids/);
assert.match(server, /active_meta_campaign_id/);
assert.match(server, /eventMs >= campaignStartMs/);
assert.match(server, /resolution: resolvedCampaign \? "exact_meta_id"/);
assert.match(migration, /120228561336470421/);
assert.match(migration, /120252998912470421/);
assert.match(migration, /automatic_actions', false/);
assert.doesNotMatch(component + source, /pauseAd|updateBudget|createCampaign|deleteCampaign/);

console.log("Traffic Intelligence V2.1 decision engine PASS");
