const assert = require("node:assert/strict");
const fs = require("node:fs");

const analytics = fs.readFileSync("modules/ads/services/ads-analytics.ts", "utf8");
const foundation = fs.readFileSync("modules/ads/services/traffic-data-foundation.ts", "utf8");
const endpoint = fs.readFileSync("app/api/ads/traffic-foundation/route.ts", "utf8");
const workflow = JSON.parse(fs.readFileSync("modules/ads/Instagram Ads Daily Collector_V9_Traffic_Foundation.json", "utf8"));
const migration = fs.readFileSync("supabase/migrations/20260928123000_traffic_foundation_v1_zumbido_references.sql", "utf8");
const v9Migration = fs.readFileSync("supabase/migrations/20260929143000_meta_ads_v9_configuration_foundation.sql", "utf8");
const docs = fs.readFileSync("docs/traffic/data-foundation.md", "utf8");
const workflowText = JSON.stringify(workflow);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

assert.match(analytics, /canonicalActionValue/);
assert.match(analytics, /offsite_conversion\.fb_pixel_purchase/);
assert.doesNotMatch(workflow.name, /V8/);
assert.equal(workflow.active, false, "V9 must remain inactive until an authorized cutover");
assert.ok(workflow.nodes.some((node) => node.name === "Executar Smoke Manual"));
assert.ok(workflow.nodes.some((node) => node.name === "Resumo Smoke sem Persistir"));

const configNode = workflow.nodes.find((node) => node.name === "Configuracao V9");
assert.ok(configNode, "central configuration node is required");
for (const expected of ["ad_account_id", "tenant_id", "supabase_url", "smoke_days: 1", "smoke_persist: false", "config_ttl_hours: 24", "creative_ttl_hours: 168"]) {
  assert.ok(configNode.parameters.jsCode.includes(expected), `missing central setting: ${expected}`);
}

assert.doesNotMatch(workflowText, /\$env/);
assert.doesNotMatch(workflowText, /META_ADS_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(workflowText, /"access_token"|"apikey"|"Authorization"/);
assert.doesNotMatch(workflowText, /ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0|oerdsmgiebquecqwcbox|EAAnfR/);

const metaNodes = workflow.nodes.filter((node) => node.parameters.nodeCredentialType === "facebookGraphApi");
assert.deepEqual(metaNodes.map((node) => node.name), ["Meta Ads API - Insights", "Meta Graph - Configuracao de Anuncios", "Meta Graph - Assets"]);
for (const node of metaNodes) {
  assert.equal(node.parameters.authentication, "predefinedCredentialType");
  assert.equal(node.credentials, undefined, `${node.name} must not export a credential id`);
}

const supabaseNodes = workflow.nodes.filter((node) => node.parameters.nodeCredentialType === "supabaseApi");
assert.deepEqual(supabaseNodes.map((node) => node.name), ["Carregar Registry Supabase", "Carregar Cache Supabase", "Upsert Snapshots de Configuracao", "Upsert Supabase Ads"]);
for (const node of supabaseNodes) {
  assert.equal(node.parameters.authentication, "predefinedCredentialType");
  assert.equal(node.credentials, undefined, `${node.name} must not export a credential id`);
}

const codeNodes = workflow.nodes.filter((node) => node.type === "n8n-nodes-base.code");
for (const node of codeNodes) {
  assert.doesNotMatch(node.parameters.jsCode, /\$env|access[_ -]?token|service[_ -]?role/i, `${node.name} cannot read secrets`);
  assert.doesNotThrow(() => new AsyncFunction("items", "$items", node.parameters.jsCode), `${node.name} must compile`);
}

assert.match(workflowText, /canonical_alias_priority/);
assert.match(workflowText, /meta_purchase_value/);
assert.match(workflowText, /instagram_ads_config_snapshots/);
assert.match(workflowText, /targetingSignals/);
assert.match(workflowText, /excluded_custom_audiences/);
assert.match(workflowText, /snapshot_cache/);
assert.match(workflowText, /unique_outbound_clicks/);
assert.match(workflowText, /quality_ranking/);
assert.match(workflowText, /video_duration_seconds/);
assert.ok(workflow.nodes.some((node) => node.name === "Preparar Snapshots de Configuracao"));
assert.ok(workflow.nodes.some((node) => node.name === "Upsert Snapshots de Configuracao"));

const transformNode = workflow.nodes.find((node) => node.name === "Normalizar para Supabase");
assert.match(transformNode.parameters.jsCode, /SEM_CLASSIFICACAO_AUTOMATICA/);
assert.doesNotMatch(transformNode.parameters.jsCode, /PUBLICO RUIM|SATURADO|CTR BAIXO/);

assert.match(v9Migration, /instagram_ads_config_snapshots/);
assert.match(v9Migration, /unique \(tenant_id, entity_type, entity_id, config_hash\)/);
assert.match(foundation, /confidence: "medium"/);
assert.match(endpoint, /meta_reported_purchases/);
assert.match(endpoint, /confirmed_sales/);
assert.match(endpoint, /source_sck/);
for (const creative of ["VID_22.06_01", "IMG_22.06_01", "JUL_VID_04", "AD15 | IMG", "AD12 | IMG"]) assert.ok(migration.includes(creative));
assert.match(docs, /Meta reported/);
assert.match(docs, /Venda confirmada/);

(async () => {
  const config = { tenant_id: "00000000-0000-4000-8000-000000000001", upsert_batch_size: 50 };
  const $items = (name) => name === "Configuracao V9" ? [{ json: config }] : [];
  const input = [{ json: {
    campaign_id: "campaign-1", campaign_name: "Campaign", adset_id: "adset-1", adset_name: "Ad Set", ad_id: "ad-1", ad_name: "Ad",
    date_start: "2026-09-28", spend: "100", impressions: "1000", reach: "800", clicks: "80", unique_clicks: "70",
    inline_link_clicks: "50", unique_inline_link_clicks: "45", unique_inline_link_click_ctr: "4.5", cost_per_unique_inline_link_click: "2.2222",
    ctr: "8", cpc: "1.25", cpm: "100", frequency: "1.25", creative_id: "creative-1", creative_name: "Creative",
    _creative_details: { format: "imagem" }, _audience: { audience_type: "Engajamento Instagram" },
    _landing_resolution: { landing_key: "imersao_zumbido", confidence: "high" }, landing_key: "imersao_zumbido",
    actions: [{ action_type: "link_click", value: "50" }, { action_type: "landing_page_view", value: "40" }, { action_type: "offsite_conversion.fb_pixel_initiate_checkout", value: "5" }, { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" }],
    action_values: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "394" }], outbound_clicks: [{ action_type: "outbound_click", value: "48" }],
    unique_outbound_clicks: [{ action_type: "outbound_click", value: "43" }], purchase_roas: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "3.94" }],
    _norwyn_mode: "smoke_manual", _norwyn_smoke_persist: false,
  } }];
  const transform = new AsyncFunction("items", "$items", transformNode.parameters.jsCode);
  const normalized = await transform(input, $items);
  assert.equal(normalized[0].json.performance_status, "SEM_CLASSIFICACAO_AUTOMATICA");
  assert.equal(normalized[0].json.link_clicks, 50);
  assert.equal(normalized[0].json.cost_per_landing_page_view, 2.5);
  assert.equal(normalized[0].json.cost_per_checkout, 20);
  assert.equal(normalized[0].json.meta_purchases, 2);
  assert.equal(normalized[0].json.meta_purchase_value, 394);
  assert.equal(normalized[0].json.meta_purchase_roas, 3.94);
  assert.equal(normalized[0].json.creative_format, "imagem");
  assert.equal(normalized[0].json.raw_payload._norwyn_foundation.confirmed_sales_semantics, "not_collected_by_meta_workflow");
  console.log("Traffic Data Foundation V1 n8n Cloud credential regression PASS");
})().catch((error) => { console.error(error); process.exit(1); });
