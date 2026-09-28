const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const component = fs.readFileSync("modules/landing-pages/components/LandingPagesAdminPage.tsx", "utf8");
const service = fs.readFileSync("modules/landing-pages/services/landing-pages-dashboard.ts", "utf8");
const accessService = fs.readFileSync("modules/landing-pages/services/landing-pages-server.ts", "utf8");
const trackingEndpoint = fs.readFileSync("app/api/norwyn/lp-events/route.ts", "utf8");
const landingTracking = fs.readFileSync("apps/imersao-zumbido-hml/norwyn-tracking.js", "utf8");
const moduleMigration = fs.readFileSync("supabase/migrations/20260927211000_add_landing_pages_module_key.sql", "utf8");
const permissionMigration = fs.readFileSync("supabase/migrations/20260927211100_enable_specialist_landing_pages.sql", "utf8");
const navigationSource = fs.readFileSync("components/layout/app-navigation.ts", "utf8");
const compiled = ts.transpileModule(navigationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const navigationModule = { exports: {} };
vm.runInNewContext(compiled, { module: navigationModule, exports: navigationModule.exports });

for (const label of ["Visão Geral", "Desempenho", "Comportamento", "Atribuição", "Conteúdo", "Saúde", "Eventos", "Versões", "QA e Integridade"]) {
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
assert.match(service, /sessionShare: totalSessions \?/);
assert.match(component, /% das sessões/);
assert.doesNotMatch(component, /context\.attribution\.slice\(/, "official attribution rows must not be truncated");
assert.doesNotMatch(service, /Math\.random\(/, "dashboard must not invent metrics");
assert.match(trackingEndpoint, /imersaozumbido\.fgajulianacoutinho\.com\.br/);
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
assert.deepEqual(specialistTabs, ["Visão Geral", "Desempenho", "Conteúdo", "Saúde"]);

console.log("Landing Pages V2 regression PASS");
