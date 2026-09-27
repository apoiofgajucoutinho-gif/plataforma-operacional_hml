const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const component = fs.readFileSync("modules/landing-pages/components/LandingPagesAdminPage.tsx", "utf8");
const service = fs.readFileSync("modules/landing-pages/services/landing-pages-dashboard.ts", "utf8");
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
assert.doesNotMatch(service, /Math\.random\(/, "dashboard must not invent metrics");

const admin = navigationModule.exports.navigationDefinitionsForRole("ADMIN");
const specialist = navigationModule.exports.navigationDefinitionsForRole("ESPECIALISTA");
assert.equal(admin.some((item) => item.href === "/landing-pages"), true, "ADMIN must see Landing Pages");
assert.equal(specialist.some((item) => item.href === "/landing-pages"), true, "SPECIALIST must see Landing Pages");

console.log("Landing Pages V2 regression PASS");
