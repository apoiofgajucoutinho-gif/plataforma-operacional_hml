const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadTs(path) {
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require, Intl, Date, Set, Map, URL, Math });
  return module.exports;
}

const intraday = loadTs("modules/ads/analytics/intraday-delta.ts");
const traffic = loadTs("modules/landing-pages/analytics/traffic-classification.ts");
const migration = fs.readFileSync("supabase/migrations/20261003000931_ads_intraday_snapshots.sql", "utf8");
const adsService = fs.readFileSync("modules/ads/services/ads-server.ts", "utf8");
const adsUi = fs.readFileSync("modules/ads/components/TrafficIntelligenceV2.tsx", "utf8");
const landingService = fs.readFileSync("modules/landing-pages/services/landing-pages-dashboard.ts", "utf8");
const landingUi = fs.readFileSync("modules/landing-pages/components/LandingPagesAdminPage.tsx", "utf8");

assert.match(migration, /instagram_ads_intraday_snapshots/);
assert.match(migration, /unique \(tenant_id, data_referencia, row_key, collected_at\)/);
assert.match(migration, /after insert or update on public\.instagram_ads_daily/);
assert.match(migration, /on conflict \(tenant_id, data_referencia, row_key, collected_at\)/);
assert.match(migration, /enable row level security/);

const oneWindow = intraday.buildIntradayDelta([{ collected_at: "2026-10-02T19:30:00Z", row_key: "a", valor_gasto: 10 }]);
assert.equal(oneWindow.available, false);
const delta = intraday.buildIntradayDelta([
  { collected_at: "2026-10-02T19:30:00Z", row_key: "a", ad_id: "1", anuncio: "AD01", valor_gasto: 10, link_clicks: 2, initiate_checkouts: 0, meta_purchases: 0 },
  { collected_at: "2026-10-02T21:30:00Z", row_key: "a", ad_id: "1", anuncio: "AD01", valor_gasto: 18.4, link_clicks: 7, initiate_checkouts: 1, meta_purchases: 1 },
]);
assert.equal(delta.available, true);
assert.equal(Number(delta.spend.toFixed(2)), 8.4);
assert.equal(delta.linkClicks, 5);
assert.equal(delta.checkouts, 1);
assert.equal(delta.metaPurchases, 1);
assert.equal(delta.perAd.length, 1);

assert.equal(traffic.technicalTrafficReason({ source_type: "SIMULATED" }), "Evento classificado como SIMULATED");
assert.equal(traffic.technicalTrafficReason({ source_type: "REAL", payload: { traffic_type: "smoke" } }), "traffic_type=smoke");
assert.equal(traffic.technicalTrafficReason({ source_type: "REAL", utm_source: "codex", page_url: "https://imersaozumbido.fgajulianacoutinho.com.br" }), null, "text alone must not classify technical traffic");
assert.equal(traffic.technicalTrafficReason({ source_type: "REAL", utm_source: "codex", utm_medium: "qa", page_url: "https://imersaozumbido.fgajulianacoutinho.com.br" }), "utm_medium=qa");
assert.equal(traffic.technicalTrafficReason({ source_type: "REAL", utm_campaign: "pixel_public_denied", page_url: "https://imersaozumbido.fgajulianacoutinho.com.br" }), "Campanha técnica de validação");
assert.equal(traffic.eventOrigin({ utm_source: null, page_url: "https://imersaozumbido.fgajulianacoutinho.com.br", payload: {} }), "Direto");
assert.equal(traffic.eventOrigin({ utm_source: null, fbclid: "opaque" }), "Origem não identificada");
assert.equal(traffic.eventOrigin({ utm_source: null, payload: { referrer: "https://facebook.com/post" }, page_url: "https://imersaozumbido.fgajulianacoutinho.com.br" }), "Origem não identificada");
assert.equal(traffic.eventOrigin({ utm_source: "instagram", utm_medium: "organic", utm_content: "stories" }), "Instagram · Stories");

assert.match(adsService, /destinationDiverges/);
assert.match(adsUi, /Não representa tendência/);
assert.match(landingService, /source_sck sem chave Norwyn resolvida/);
assert.match(landingService, /attributedPurchasesByOrigin\.set\(origin, item\.sales\.size\)/);
assert.match(landingUi, /De onde vieram as vendas/);
assert.match(landingUi, /Saúde da jornada/);
assert.match(landingUi, /Meta Purchase é um sinal reportado/);

console.log("Traffic & LP Operations V2.2 regression PASS");
