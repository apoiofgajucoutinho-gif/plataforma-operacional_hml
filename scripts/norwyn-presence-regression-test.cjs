const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs");

for (const envFile of [".env.local", ".env"]) {
  if (!fs.existsSync(envFile)) continue;
  const envText = fs.readFileSync(envFile, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL is required");
assert.ok(serviceKey, "SUPABASE_SERVICE_ROLE_KEY is required");

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function isQaAsset(asset) {
  return asset.environment === "dev" || String(asset.url || "").startsWith("https://presence-simulated.invalid/") || String(asset.name || "").startsWith("QA Presence Center");
}

(async () => {
  const [{ data: assets, error: assetsError }, { data: checks, error: checksError }, { data: incidents, error: incidentsError }] = await Promise.all([
    supabase.from("digital_assets").select("id,name,url,environment,last_health_score,last_status,monitoring_enabled,is_critical,asset_type"),
    supabase.from("presence_checks").select("id,asset_id,source_type,suspicious_evidence,result_json,checked_at").limit(500),
    supabase.from("presence_incidents").select("id,asset_id,source_type,status,incident_type,severity,evidence").limit(500),
  ]);

  if (assetsError) throw new Error(assetsError.message);
  if (checksError) throw new Error(checksError.message);
  if (incidentsError) throw new Error(incidentsError.message);

  assert.ok(Array.isArray(checks), "presence_checks should be readable");
  assert.ok(Array.isArray(incidents), "presence_incidents should be readable");
  assert.ok(checks.every((check) => ["REAL", "SIMULATED"].includes(check.source_type)), "all checks must have source_type");
  assert.ok(incidents.every((incident) => ["REAL", "SIMULATED"].includes(incident.source_type)), "all incidents must have source_type");

  const simulatedChecks = checks.filter((check) => check.source_type === "SIMULATED");
  const realChecks = checks.filter((check) => check.source_type === "REAL");
  const simulatedIncidents = incidents.filter((incident) => incident.source_type === "SIMULATED");
  const realOpenIncidents = incidents.filter((incident) => incident.source_type === "REAL" && ["open", "acknowledged"].includes(incident.status));
  const qaAssetIds = new Set((assets || []).filter(isQaAsset).map((asset) => asset.id));

  assert.ok(simulatedChecks.length > 0, "QA simulated checks should remain persisted");
  assert.ok(simulatedChecks.every((check) => qaAssetIds.has(check.asset_id)), "simulated checks must belong to QA assets");
  assert.ok(simulatedIncidents.every((incident) => qaAssetIds.has(incident.asset_id)), "simulated incidents must belong to QA assets");

  const realScoredAssets = (assets || []).filter((asset) => !isQaAsset(asset) && typeof asset.last_health_score === "number");
  const realScore = realScoredAssets.length ? Math.round(realScoredAssets.reduce((sum, asset) => sum + Number(asset.last_health_score || 0), 0) / realScoredAssets.length) : null;
  assert.notEqual(realScore, null, "real Presence score should be computable from real assets");

  const suspiciousChecks = checks.filter((check) => check.source_type === "REAL" && Array.isArray(check.suspicious_evidence) && check.suspicious_evidence.length > 0);
  for (const check of suspiciousChecks) {
    const finding = check.suspicious_evidence[0];
    assert.ok(finding.url, "suspicious evidence must include url");
    assert.ok(finding.match, "suspicious evidence must include match");
    assert.ok(finding.snippet, "suspicious evidence must include sanitized snippet");
    assert.ok(finding.location, "suspicious evidence must include location");
  }

  console.log("Presence regression PASS", {
    realChecks: realChecks.length,
    simulatedChecks: simulatedChecks.length,
    realOpenIncidents: realOpenIncidents.length,
    simulatedIncidents: simulatedIncidents.length,
    realScore,
    suspiciousEvidenceChecks: suspiciousChecks.length,
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

