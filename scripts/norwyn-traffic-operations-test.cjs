const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("modules/ads/services/traffic-operations.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
new Function("module", "exports", "require", compiled)(moduleBox, moduleBox.exports, require);
const { metaFreshness, sourceFreshness, trackingHealth, operationalAlerts } = moduleBox.exports;

const current = metaFreshness("2026-10-02T17:31:00Z", new Date("2026-10-02T18:10:00Z"));
assert.equal(current.status, "Atualizado");
assert.equal(current.nextExpectedLabel, "16:30");

const delayed = metaFreshness("2026-10-02T17:31:00Z", new Date("2026-10-02T20:00:00Z"));
assert.equal(delayed.status, "Atrasado");
assert.equal(delayed.nextExpectedLabel, "18:30");

const overnight = metaFreshness("2026-10-03T01:31:00Z", new Date("2026-10-03T03:00:00Z"));
assert.equal(overnight.status, "Aguardando próxima coleta");
assert.equal(overnight.nextExpectedLabel, "08:30");

const finalWindowGrace = metaFreshness("2026-10-02T23:31:00Z", new Date("2026-10-03T01:35:00Z"));
assert.equal(finalWindowGrace.status, "Aguardando próxima coleta");
assert.equal(finalWindowGrace.nextExpectedLabel, "08:30");

const missing = metaFreshness("2026-10-01T17:31:00Z", new Date("2026-10-02T20:00:00Z"));
assert.equal(missing.status, "Sem coleta recente");

const health = trackingHealth({ campaignRegistered: true, landingRegistered: true, pixelKnown: true, metaStatus: current.status, sessions: 30, campaignIdSessions: 0, adsetIdSessions: 0, adIdSessions: 0, fbclidSessions: 5, sckSessions: 0, checkoutPreserved: false, hotmartSourceSck: 0, divergenceCount: 1 });
assert.equal(health.quality, "Parcial");
assert.match(health.missing.join(" "), /adset_id\/ad_id/);

const normalAlerts = operationalAlerts({ meta: current, health: { ...health, quality: "Boa", reason: "ok", missing: [] }, activeCampaign: true, spend: 10, linkClicks: 3, lpv: 2, checkoutClicks: 0, metaPurchases: 0, hotmartSales: 0, attributedSales: 0, sessions: 2, adIdSessions: 1, sourceSckSessions: 0 });
assert.equal(normalAlerts.some((alert) => alert.id === "meta_freshness"), false, "normal interval must not trigger a Meta freshness alert");

const component = fs.readFileSync("modules/ads/components/TrafficIntelligenceV2.tsx", "utf8");
for (const label of ["Saúde do tracking", "Alertas operacionais", "LP Conversion Intelligence", "Campaign ↔ LP Registry", "O que mudou desde a última coleta", "Analytics / GA4", "Decisão humana"]) assert.ok(component.includes(label), `missing operational UI: ${label}`);
assert.match(component, /Próxima ação/);
assert.doesNotMatch(component, /pauseAd|updateBudget|createCampaign|updateCampaign/);

const route = fs.readFileSync("app/api/ads/decision-feedback/route.ts", "utf8");
assert.match(route, /norwyn_campaign_learnings/);
assert.match(route, /Aceitei/);
assert.match(route, /Fiz diferente/);

assert.equal(sourceFreshness("ga4", "Analytics \/ GA4", null).status, "Não disponível");
console.log("Traffic Control & Decision Operations PASS");
