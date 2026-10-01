const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

(async () => {
  const helper = fs.readFileSync("lib/norwyn/lp-cors.ts", "utf8");
  const compiled = ts.transpileModule(helper, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const corsModule = { exports: {} };
  vm.runInNewContext(compiled, { module: corsModule, exports: corsModule.exports, Set });
  const cors = corsModule.exports;
  const preview = "https://lp-1sc76jvge-apoio-fga-ju-coutinho-s-projects.vercel.app";

  for (const origin of [
    "https://imersaozumbido.fgajulianacoutinho.com.br",
    "https://lp-ju.vercel.app",
    "https://plataf-op-hml.vercel.app",
    preview,
  ]) assert.equal(cors.isAllowedNorwynLpOrigin(origin), true, `${origin} should be allowed`);

  for (const origin of [
    null,
    "https://evil.example",
    "https://random.vercel.app",
    "https://lp-1sc76jvge-other-team.vercel.app",
    "https://lp-1sc76jvge-apoio-fga-ju-coutinho-s-projects.vercel.app.evil.example",
    "https://other-1sc76jvge-apoio-fga-ju-coutinho-s-projects.vercel.app",
  ]) assert.equal(cors.isAllowedNorwynLpOrigin(origin), false, `${origin} should be rejected`);

  const headers = cors.norwynLpCorsHeaders(new Request("https://plataf-op-hml.vercel.app/api/norwyn/lp-events", { headers: { Origin: preview } }), ["POST", "OPTIONS"]);
  assert.equal(headers["Access-Control-Allow-Origin"], preview);
  assert.equal(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
  assert.equal(headers["Access-Control-Allow-Headers"], "Content-Type");
  assert.equal(headers.Vary, "Origin");
  assert.equal(headers["Access-Control-Allow-Credentials"], undefined);
  assert.equal(cors.hasDisallowedNorwynLpOrigin(new Request("https://example.test", { headers: { Origin: "https://random.vercel.app" } })), true);
  assert.equal(cors.hasDisallowedNorwynLpOrigin(new Request("https://example.test")), false, "server-to-server requests without Origin remain compatible");

  const lpEvents = fs.readFileSync("app/api/norwyn/lp-events/route.ts", "utf8");
  const bridge = fs.readFileSync("app/api/norwyn/attribution-bridge/route.ts", "utf8");
  assert.doesNotMatch(helper, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
  assert.match(lpEvents, /norwynLpCorsHeaders/);
  assert.match(bridge, /norwynLpCorsHeaders/);
  assert.match(lpEvents, /status: 403/);
  assert.match(bridge, /status: 403/);
  assert.match(lpEvents, /hasDisallowedNorwynLpOrigin/);
  assert.match(bridge, /hasDisallowedNorwynLpOrigin/);
  console.log("Norwyn LP CORS regression PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
