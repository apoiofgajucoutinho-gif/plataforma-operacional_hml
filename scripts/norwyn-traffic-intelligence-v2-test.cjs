const assert = require("node:assert/strict");
const fs = require("node:fs");

const component = fs.readFileSync("modules/ads/components/TrafficIntelligenceV2.tsx", "utf8");
const glossary = fs.readFileSync("modules/ads/data/operational-glossary.ts", "utf8");
const glossaryUi = fs.readFileSync("modules/ads/components/AdsOperationalGlossary.tsx", "utf8");
const dashboard = fs.readFileSync("modules/ads/components/AdsDashboard.tsx", "utf8");
const server = fs.readFileSync("modules/ads/services/ads-server.ts", "utf8");
const engine = fs.readFileSync("modules/ads/services/traffic-decision-engine.ts", "utf8");

for (const label of ["Onde investimos", "Quem recebeu", "Maior sinal atual", "Conversão real", "O que fazer agora", "Jornada observada", "Performance por anúncio", "Reconciliação de fontes", "Memória de decisão"]) {
  assert.ok(component.includes(label), `missing V2 UI: ${label}`);
}
for (const source of ["Meta Ads", "Site / Analytics", "Norwyn Tracking", "Hotmart"]) assert.ok(component.includes(source), `missing source: ${source}`);
for (const status of ["Evidência comercial forte", "Sinal promissor", "Sinal de atenção", "Divergência de mensuração"]) assert.ok(engine.includes(status), `missing recommendation state: ${status}`);
assert.match(engine, /\.slice\(0, 3\)/, "attention block must expose no more than three recommendations");
assert.match(component, /row\.ad_id \?\? idByName\.get/, "ad identity must prefer ad_id and only fall back to names");
assert.match(component + engine, /Meta Purchase sem confirmação Hotmart|Meta Purchase.*Hotmart/);
assert.match(component, /anúncio não foi determinado/);
assert.match(component, /campaignScope\.resolved/);
assert.match(component, /Tracking · campanha/);
assert.match(server, /hotmart_attribution_bridge_v/);
assert.match(server, /Totais Norwyn\/Hotmart não são creditados à campanha|não pode ser creditada à campanha Meta filtrada/);
assert.match(server, /norwyn_campaign_learnings/);
assert.match(server, /Fonte Site Kit\/GA4 ainda não integrada|Não existe uma fonte Site Kit\/GA4 canônica/);
assert.match(server, /source_type", "REAL/);
assert.ok(dashboard.includes("TrafficIntelligenceV2"), "V2 must be mounted in Intelligence tab");
assert.ok(dashboard.includes("Traffic Intelligence V1"), "V1 must remain visible");

const requiredTerms = ["Impressões", "Alcance", "Frequência", "CTR de link", "CPC de link", "Meta Purchase", "Landing Page View", "InitiateCheckout", "Confirmed Sale", "Audience Confidence", "Attribution Bridge", "config_snapshot", "row_key", "measurement divergence"];
for (const label of requiredTerms) assert.ok(glossary.includes(`"${label}"`), `missing glossary term: ${label}`);
for (const field of ["definition", "example", "marketRule", "norwynRule", "reason", "source", "limitations", "related", "shortHelp"]) assert.ok(glossary.includes(`${field}:`), `missing structured glossary field: ${field}`);
assert.match(glossaryUi, /Buscar CTR, atribuição, LPV/);
assert.match(glossaryUi, /Não confunda/);
assert.match(glossaryUi, /Regras metodológicas Norwyn/);
assert.doesNotMatch(component, /pauseAd|updateBudget|createCampaign|deleteCampaign/);

console.log("Traffic Intelligence V2 regression PASS");
