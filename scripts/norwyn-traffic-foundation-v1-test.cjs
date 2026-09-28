const assert = require("node:assert/strict");
const fs = require("node:fs");

const analytics = fs.readFileSync("modules/ads/services/ads-analytics.ts", "utf8");
const foundation = fs.readFileSync("modules/ads/services/traffic-data-foundation.ts", "utf8");
const endpoint = fs.readFileSync("app/api/ads/traffic-foundation/route.ts", "utf8");
const workflow = JSON.parse(fs.readFileSync("modules/ads/Instagram Ads Daily Collector_V9_Traffic_Foundation.json", "utf8"));
const migration = fs.readFileSync("supabase/migrations/20260928123000_traffic_foundation_v1_zumbido_references.sql", "utf8");
const docs = fs.readFileSync("docs/traffic/data-foundation.md", "utf8");

assert.match(analytics, /canonicalActionValue/);
assert.match(analytics, /offsite_conversion\.fb_pixel_purchase/);
assert.doesNotMatch(workflow.name, /V8/);
assert.ok(workflow.nodes.some((node) => node.name === "Enriquecer Criativos e Destinos"));
assert.match(JSON.stringify(workflow), /canonical_alias_priority/);
assert.match(JSON.stringify(workflow), /meta_purchase_value/);
assert.match(foundation, /confidence: "medium"/);
assert.match(endpoint, /meta_reported_purchases/);
assert.match(endpoint, /confirmed_sales/);
assert.match(endpoint, /source_sck/);
for (const creative of ["VID_22.06_01", "IMG_22.06_01", "JUL_VID_04", "AD15 | IMG", "AD12 | IMG"]) {
  assert.ok(migration.includes(creative), `${creative} must be a historical reference`);
}
assert.match(docs, /Meta reported/);
assert.match(docs, /Venda confirmada/);
console.log("Traffic Data Foundation V1 regression PASS");
