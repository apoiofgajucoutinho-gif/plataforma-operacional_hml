const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const component = fs.readFileSync("modules/landing-pages/components/LandingPagesAdminPage.tsx", "utf8");
const service = fs.readFileSync("modules/landing-pages/services/landing-pages-dashboard.ts", "utf8");
const insights = fs.readFileSync("modules/landing-pages/analytics/landing-insights.ts", "utf8");
const criteriaEndpoint = fs.readFileSync("app/api/landing-pages/criteria/route.ts", "utf8");
const accessService = fs.readFileSync("modules/landing-pages/services/landing-pages-server.ts", "utf8");
const trackingEndpoint = fs.readFileSync("app/api/norwyn/lp-events/route.ts", "utf8");
const corsHelper = fs.readFileSync("lib/norwyn/lp-cors.ts", "utf8");
const landingTracking = fs.readFileSync("apps/imersao-zumbido-hml/norwyn-tracking.js", "utf8");
const attributionFunction = service.slice(service.indexOf("function attributionRows"), service.indexOf("function buildAcquisitionReading"));
const moduleMigration = fs.readFileSync("supabase/migrations/20260927211000_add_landing_pages_module_key.sql", "utf8");
const permissionMigration = fs.readFileSync("supabase/migrations/20260927211100_enable_specialist_landing_pages.sql", "utf8");
const navigationSource = fs.readFileSync("components/layout/app-navigation.ts", "utf8");
const compiled = ts.transpileModule(navigationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const navigationModule = { exports: {} };
vm.runInNewContext(compiled, { module: navigationModule, exports: navigationModule.exports });
const insightsCompiled = ts.transpileModule(insights, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const insightsModule = { exports: {} };
vm.runInNewContext(insightsCompiled, { module: insightsModule, exports: insightsModule.exports, Intl, Date, Set, Map, Math });

for (const label of ["Visão Geral", "Insights", "Jornada", "Critérios", "Desempenho", "Comportamento", "Atribuição", "Conteúdo", "Saúde", "Eventos", "Versões", "QA e Integridade"]) {
  assert.match(component, new RegExp(label), `missing landing page tab: ${label}`);
}
for (const filter of ["Produto", "Campanha", "Ambiente", "Status", "Domínio"]) {
  assert.match(component, new RegExp(`label=\\"${filter}\\"`), `missing landing page filter: ${filter}`);
}
assert.match(service, /landing_page_definitions/);
assert.match(service, /landing_page_versions/);
assert.match(service, /landing_page_approvals/);
assert.match(service, /landing_page_qa_runs/);
assert.match(service, /landing_page_tracking_events/);
assert.match(service, /norwyn_landing_registry/);
assert.match(service, /norwyn_landing_snapshots/);
assert.match(service, /norwyn_landing_monitor_log/);
assert.match(service, /landingKey === "imersao_zumbido"/);
assert.match(service, /https:\/\/imersaozumbido\.fgajulianacoutinho\.com\.br/);
assert.match(service, /payload\?\.visitor_id/);
assert.match(service, /isKnownTestTraffic/);
assert.match(service, /operational_visibility === "archived"/);
assert.match(service, /Instagram · Stories/);
for (const source of ["Instagram · Stories", "Instagram · Link da bio", "WhatsApp · Grupo", "Site Juliana", "Meta Ads", "Direto \/ sem identificação"]) {
  assert.match(service, new RegExp(source), `missing official attribution source: ${source}`);
}
assert.match(insights, /sessionShare: totalSessions > 0/);
assert.match(service, /eligibleSessionIds/);
assert.match(service, /sessionOrigins/);
assert.match(component, /% das sessões/);
assert.match(component, /Taxa de checkout/);
assert.match(component, /% dos checkouts/);
assert.match(component, /Sessões em que a origem não pôde ser identificada/);
assert.match(component, /Compra atribuída/);
assert.match(component, /Aguardando atribuição/);
assert.match(component, /Uma compra sem atribuição nunca é somada a Direto/);
assert.doesNotMatch(component, /context\.attribution\.slice\(/, "official attribution rows must not be truncated");
assert.match(attributionFunction, /checkoutSessions\.add/);
assert.match(attributionFunction, /const sessionOrigin = sessionOrigins\.get\(row\.session_id\)/);
assert.doesNotMatch(attributionFunction, /checkoutClicks \+= 1/, "checkout acquisition must be deduplicated by session");
assert.doesNotMatch(service, /Math\.random\(/, "dashboard must not invent metrics");
assert.match(insights, /buildJourney/);
assert.match(insights, /journeyExecutiveRates/);
assert.match(insights, /buildInsights/);
assert.match(component, /correla[cç][aã]o em causalidade/i);
assert.match(insights, /Aguardando primeira reconciliação confiável via source_sck/);
assert.match(criteriaEndpoint, /insight_criterion_updated/);
assert.match(criteriaEndpoint, /landing_page_events/);
assert.match(criteriaEndpoint, /role !== "ADMIN" && role !== "ESPECIALISTA"/);
assert.match(criteriaEndpoint, /insight_maturity_updated/);
assert.match(component, /Aguardando prévia/);
assert.match(component, /Em observação/);
assert.doesNotMatch(insights, /Math\.random\(/, "insight confidence must be deterministic");
const emptyJourney = insightsModule.exports.buildJourney([], null);
assert.equal(emptyJourney.detailed[0].value, 0, "zero-data journey must show zero sessions");
assert.equal(emptyJourney.detailed.at(-1).value, null, "unreconciled purchase must remain unavailable");
const sampleEvents = [
  { event_name: "session_start", session_id: "s1" }, { event_name: "page_view", session_id: "s1" },
  { event_name: "scroll_25", session_id: "s1" }, { event_name: "offer_view", session_id: "s1" },
  { event_name: "cta_view", session_id: "s1" }, { event_name: "cta_click", session_id: "s1" },
  { event_name: "checkout_click", session_id: "s1" },
];
const sampleJourney = insightsModule.exports.buildJourney(sampleEvents, 1);
assert.equal(sampleJourney.detailed[0].value, 1);
assert.equal(sampleJourney.detailed.at(-1).value, 1);
assert.equal(sampleJourney.detailed.some((step) => step.key === "cta_view"), false, "generic CTA views must not be forced into the sequential journey");
const repeatedCtaEvents = [
  { event_name: "session_start", session_id: "repeat" },
  { event_name: "cta_view", session_id: "repeat", cta_id: "hero_primary" },
  { event_name: "cta_view", session_id: "repeat", cta_id: "offer_primary" },
  { event_name: "cta_click", session_id: "repeat", cta_id: "hero_primary" },
  { event_name: "cta_click", session_id: "repeat", cta_id: "hero_primary" },
];
const repeatedJourney = insightsModule.exports.buildJourney(repeatedCtaEvents, null);
assert.equal(repeatedJourney.behavioral.find((item) => item.key === "cta_view").sessions, 1, "journey behavior must deduplicate CTA views by session");
assert.equal(repeatedJourney.behavioral.find((item) => item.key === "cta_view").events, 2, "behavior must preserve raw CTA view count");
assert.equal(repeatedJourney.behavioral.find((item) => item.key === "cta_click").sessions, 1, "journey behavior must deduplicate repeated CTA clicks by session");
assert.equal(repeatedJourney.behavioral.find((item) => item.key === "cta_click").events, 2, "behavior must preserve raw CTA click count");
assert.equal(repeatedJourney.detailed.some((step) => step.key === "offer_view"), false, "offer views must not be forced into the sequential journey");
assert.equal(repeatedJourney.behavioral.find((item) => item.key === "offer_view").sessions, 0, "out-of-order CTA events must not fabricate an offer view");
const boundaryJourney = insightsModule.exports.buildJourney([
  { event_name: "session_start", session_id: "inside" },
  { event_name: "cta_view", session_id: "inside" },
  { event_name: "cta_view", session_id: "started-before-window" },
], null);
assert.equal(boundaryJourney.detailed[0].value, 1);
assert.equal(boundaryJourney.behavioral.find((item) => item.key === "cta_view").sessions, 1, "events from sessions outside the period cohort must not exceed the session base");
assert.equal(insightsModule.exports.maturityForSample(0, insightsModule.exports.defaultLandingMaturity), null);
assert.equal(insightsModule.exports.maturityForSample(19, insightsModule.exports.defaultLandingMaturity), null);
assert.equal(insightsModule.exports.maturityForSample(20, insightsModule.exports.defaultLandingMaturity), "Prévia");
assert.equal(insightsModule.exports.maturityForSample(49, insightsModule.exports.defaultLandingMaturity), "Prévia");
assert.equal(insightsModule.exports.maturityForSample(50, insightsModule.exports.defaultLandingMaturity), "Em observação");
assert.equal(insightsModule.exports.maturityForSample(99, insightsModule.exports.defaultLandingMaturity), "Em observação");
assert.equal(insightsModule.exports.maturityForSample(100, insightsModule.exports.defaultLandingMaturity), "Insight");
const checkoutRates = insightsModule.exports.attributionRates(26, 4, 93, 9);
assert.equal(Number(checkoutRates.checkoutRate.toFixed(1)), 15.4);
assert.equal(Number(checkoutRates.checkoutShare.toFixed(1)), 44.4);
assert.equal(insightsModule.exports.attributionRates(0, 0, 93, 9).checkoutRate, null, "zero sessions must not render a false 0% checkout rate");
assert.equal(insightsModule.exports.attributionRates(14, 0, 93, 0).checkoutShare, null, "periods without checkouts must not render a false checkout share");
const executiveRates = insightsModule.exports.journeyExecutiveRates(130, 12, 1, 0);
assert.equal(Number(executiveRates.checkoutRate.toFixed(1)), 9.2);
assert.equal(Number(executiveRates.checkoutToPurchaseRate.toFixed(1)), 8.3);
assert.equal(Number(executiveRates.landingConversionRate.toFixed(1)), 0.8);
assert.equal(executiveRates.attributionCoverage, 0);
assert.equal(insightsModule.exports.journeyExecutiveRates(0, 0, 0, 0).attributionCoverage, null, "zero confirmed purchases must not fabricate attribution coverage");
assert.match(service, /sale_confirmed.*true/);
assert.match(service, /attributedPurchasesByOrigin/);
assert.match(service, /trackingKeyIdSet\.has/);
assert.doesNotMatch(service, /attributedPurchasesByOrigin\.set\("Direto \/ sem identificação"/, "unattributed purchases must never be assigned to Direct");
const lowSampleInsights = insightsModule.exports.buildInsights({ journey: sampleJourney, previousJourney: emptyJourney, criteria: insightsModule.exports.defaultLandingCriteria, maturity: insightsModule.exports.defaultLandingMaturity });
assert.equal(lowSampleInsights.some((item) => item.id === "minimum_sample"), true, "low sample must be explicit");
assert.equal(lowSampleInsights.find((item) => item.id === "minimum_sample").confidence, null, "confidence must not be shown before Insight maturity");
assert.match(corsHelper, /imersaozumbido\.fgajulianacoutinho\.com\.br/);
assert.match(trackingEndpoint, /norwynLpCorsHeaders/);
assert.match(trackingEndpoint, /trafficType === "public" \? "REAL" : "SIMULATED"/);
assert.match(landingTracking, /traffic_type: trafficTypeFromLocation\(\)/);

const admin = navigationModule.exports.navigationDefinitionsForRole("ADMIN");
const specialist = navigationModule.exports.navigationDefinitionsForRole("ESPECIALISTA");
assert.equal(admin.some((item) => item.href === "/landing-pages"), true, "ADMIN must see Landing Pages");
assert.equal(specialist.some((item) => item.href === "/landing-pages"), true, "SPECIALIST must see Landing Pages");
assert.match(moduleMigration, /add value if not exists 'landing-pages'/);
assert.match(permissionMigration, /members\.role = 'ESPECIALISTA'/);
assert.match(permissionMigration, /can_read = true/);
assert.match(accessService, /functionalRoleFor\(membershipResult\.membership\.role\) === "ESPECIALISTA"/);

const specialistTabs = [...component.matchAll(/\{ key: "([^"]+)", label: "([^"]+)"(?:, adminOnly: true)? \}/g)]
  .filter((match) => !match[0].includes("adminOnly: true"))
  .map((match) => match[2]);
assert.deepEqual(specialistTabs, ["Visão Geral", "Insights", "Jornada", "Critérios", "Desempenho", "Conteúdo", "Saúde"]);

console.log("Landing Pages V2 regression PASS");
