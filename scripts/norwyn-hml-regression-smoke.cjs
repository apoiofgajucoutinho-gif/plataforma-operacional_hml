const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const tests = [
  "scripts/norwyn-hotmart-golden-30d-test.cjs",
  "scripts/norwyn-hotmart-data-trust-tests.mjs",
  "scripts/norwyn-student360-pagination-test.cjs",
  "scripts/norwyn-student360-filters-sort-profile-test.cjs",
  "scripts/norwyn-student360-searchparams-test.cjs",
  "scripts/norwyn-student-enrollment-backfill-tests.cjs",
  "scripts/norwyn-presence-regression-test.cjs",
];

function runNode(script) {
  const result = spawnSync(process.execPath, [script], { stdio: "inherit", shell: false });
  assert.equal(result.status, 0, `${script} failed with status ${result.status}`);
}

async function checkHttp(baseUrl) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const routes = [
    { path: "/", allowRedirectToLogin: true, allowInternalRedirect: true },
    { path: "/comercial", allowRedirectToLogin: true },
    { path: "/produtos-alunos?view=students", allowRedirectToLogin: true },
    { path: "/financeiro", allowRedirectToLogin: true },
    { path: "/agenda", allowRedirectToLogin: true },
    { path: "/missoes", allowRedirectToLogin: true },
    { path: "/automacoes", allowRedirectToLogin: true },
    { path: "/validacao", allowRedirectToLogin: true },
    { path: "/presence", allowRedirectToLogin: true },
    { path: "/hml/lp/aasi-premium?debug=1&utm_source=regression&utm_medium=hml&sck=regression_smoke", requireOk: true },
  ];

  for (const route of routes) {
    const response = await fetch(`${normalizedBase}${route.path}`, { redirect: "manual" });
    const location = response.headers.get("location") || "";
    const ok = route.requireOk
      ? response.status === 200
      : response.status === 200 || (route.allowRedirectToLogin && response.status >= 300 && response.status < 400 && location.includes("/login")) || (route.allowInternalRedirect && response.status >= 300 && response.status < 400 && location.startsWith("/"));
    assert.equal(ok, true, `${route.path} returned ${response.status} ${location}`);

    if (route.path.startsWith("/hml/lp/aasi-premium")) {
      const html = await response.text();
      assert.match(html, /noindex/i, "AASI HML page must remain noindex");
      assert.match(html, /nofollow/i, "AASI HML page must remain nofollow");
    }
  }

  const tracking = await fetch(`${normalizedBase}/api/norwyn/lp-events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "landing_view", environment: "hml", landing_key: "aasi-premium", sck: "regression_smoke" }),
  });
  const payload = await tracking.json().catch(() => null);
  assert.equal(tracking.status, 200, "LP tracking endpoint should accept HML event");
  assert.equal(payload?.ok, true, "LP tracking endpoint should return ok=true");
}

(async () => {
  for (const script of tests) runNode(script);
  if (process.env.REGRESSION_BASE_URL) await checkHttp(process.env.REGRESSION_BASE_URL);
  console.log("Norwyn HML regression smoke PASS", { http: Boolean(process.env.REGRESSION_BASE_URL) });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

