const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("components/layout/app-navigation.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleUnderTest = { exports: {} };
vm.runInNewContext(compiled, { module: moduleUnderTest, exports: moduleUnderTest.exports }, { filename: "app-navigation.js" });

const { navigationDefinitionsForRole } = moduleUnderTest.exports;
const expected = {
  ADMIN: { group: "Administração", adoption: true },
  ESPECIALISTA: { group: "Trabalho", adoption: false },
  OPERACIONAL: { group: "Operação", adoption: false },
  SUPORTE: { group: "Operação", adoption: false },
};

for (const [role, expectation] of Object.entries(expected)) {
  const items = navigationDefinitionsForRole(role);
  const reports = items.filter((item) => item.href === "/relatorios");
  assert.equal(reports.length, 1, `${role} must have exactly one Reports item`);
  assert.equal(reports[0].label, "Relatórios", `${role} must use the canonical Reports label`);
  assert.equal(reports[0].group, expectation.group, `${role} Reports group is incorrect`);
  assert.equal(items.some((item) => item.label === "Adoção" && item.href === "/adocao"), expectation.adoption, `${role} Adoption visibility is incorrect`);
  assert.equal(items.some((item) => item.label === "Integrações"), false, `${role} must not expose legacy Integrations`);
  assert.equal(items.some((item) => item.label === "Diagnósticos"), false, `${role} must not expose legacy Diagnostics`);
}

assert.notStrictEqual(
  navigationDefinitionsForRole("SUPORTE"),
  navigationDefinitionsForRole("OPERACIONAL"),
  "SUPPORT must have an explicit navigation composition",
);

console.log("AppShell role navigation PASS", Object.keys(expected));
