const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const analytics = fs.readFileSync("modules/ads/services/ads-analytics.ts", "utf8");
const foundation = fs.readFileSync("modules/ads/services/traffic-data-foundation.ts", "utf8");
const endpoint = fs.readFileSync("app/api/ads/traffic-foundation/route.ts", "utf8");
const workflow = JSON.parse(fs.readFileSync("modules/ads/Instagram Ads Daily Collector_V9_Traffic_Foundation.json", "utf8"));
const migration = fs.readFileSync("supabase/migrations/20260928123000_traffic_foundation_v1_zumbido_references.sql", "utf8");
const v9Migration = fs.readFileSync("supabase/migrations/20260929143000_meta_ads_v9_configuration_foundation.sql", "utf8");
const rowKeyMigration = fs.readFileSync("supabase/migrations/20261001133739_harmonize_instagram_ads_row_key_v9.sql", "utf8");
const docs = fs.readFileSync("docs/traffic/data-foundation.md", "utf8");
const workflowText = JSON.stringify(workflow);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const v3Hashes = {
  "modules/ads/Instagram Ads Daily Collector_V3_Supabase_2026_full.json": "A0DDD00F2E14BD046B8C2342FD9716BC85695CACE81DD9F386A720C6BF92A9B6",
  "modules/ads/Instagram Ads Daily Collector_V3_Supabase.json": "D993031799AA69E15E9F73CACDA593024032E17C2AB18D4F0D2E1E304B9581F3",
};

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
  assert.doesNotMatch(node.parameters.jsCode, /\$env|service[_ -]?role/i, `${node.name} cannot read secrets`);
  assert.doesNotThrow(() => new AsyncFunction("items", "$items", node.parameters.jsCode), `${node.name} must compile`);
}

for (const [path, expected] of Object.entries(v3Hashes)) {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex").toUpperCase();
  assert.equal(actual, expected, `${path} must remain byte-for-byte unchanged`);
}

const expectedMetaValidation = [
  ["Meta Ads API - Insights", "Validar Insights Meta"],
  ["Meta Graph - Configuracao de Anuncios", "Validar Configuracao Meta"],
  ["Meta Graph - Assets", "Validar Assets Meta"],
];
for (const [requestNode, validatorNode] of expectedMetaValidation) {
  assert.equal(workflow.connections[requestNode].main[0][0].node, validatorNode);
  assert.ok(workflow.nodes.some((node) => node.name === validatorNode));
}

const adsUpsert = workflow.nodes.find((node) => node.name === "Upsert Supabase Ads");
const snapshotsUpsert = workflow.nodes.find((node) => node.name === "Upsert Snapshots de Configuracao");
assert.equal(adsUpsert.parameters.url, "={{ $('Configuracao V9').first().json.supabase_url.replace(/\\/+$/, '') + '/rest/v1/instagram_ads_daily?on_conflict=tenant_id,row_key' }}");
assert.equal(snapshotsUpsert.parameters.url, "={{ $('Configuracao V9').first().json.supabase_url.replace(/\\/+$/, '') + '/rest/v1/instagram_ads_config_snapshots?on_conflict=tenant_id,entity_type,entity_id,config_hash' }}");
assert.match(rowKeyMigration, /existing\.campaign_id = btrim\(new\.campaign_id\)/, "database compatibility must reuse an existing row by Meta IDs");
assert.match(rowKeyMigration, /existing\.row_key = legacy_row_key/, "database compatibility must reuse the V3 legacy row key");
assert.match(rowKeyMigration, /if tg_op = 'UPDATE'[\s\S]*new\.row_key := old\.row_key/, "upsert updates must preserve the historical row key");
assert.match(rowKeyMigration, /case when has_meta_ids then md5\(identity_value\) else legacy_row_key end/, "new rows must prefer the canonical Meta ID key");
assert.match(rowKeyMigration, /set search_path = pg_catalog/, "trigger function must use a fixed search path");
assert.doesNotMatch(rowKeyMigration, /\b(update|delete|truncate)\s+public\.instagram_ads_daily\b/i, "row-key migration must not rewrite historical Ads rows");
assert.ok(!adsUpsert.parameters.url.startsWith("=="));
assert.ok(!snapshotsUpsert.parameters.url.startsWith("=="));

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
  const transform = new AsyncFunction("items", "$items", "require", transformNode.parameters.jsCode);
  const normalized = await transform(input, $items, require);
  const repeated = await transform(input, $items, require);
  const renamed = await transform([{ json: { ...input[0].json, campaign_name: "Campaign renamed", adset_name: "Ad Set renamed", ad_name: "Ad renamed" } }], $items, require);
  assert.equal(normalized[0].json.performance_status, "SEM_CLASSIFICACAO_AUTOMATICA");
  assert.equal(normalized[0].json.row_key, repeated[0].json.row_key, "reexecution must keep the same row_key");
  assert.equal(normalized[0].json.row_key, renamed[0].json.row_key, "names cannot change identity when Meta IDs are stable");
  assert.equal(normalized[0].json.raw_payload._norwyn_foundation.idempotency.row_key_strategy, "date_meta_ids_v1");
  const legacyInput = [{ json: { ...input[0].json, campaign_id: null, adset_id: null, ad_id: null } }];
  const legacy = await transform(legacyInput, $items, require);
  const expectedLegacyKey = crypto.createHash("md5").update("2026-09-28|Campaign|Ad Set|Ad").digest("hex");
  assert.equal(legacy[0].json.row_key, expectedLegacyKey, "rows without IDs must retain the V3 legacy identity");
  assert.equal(legacy[0].json.raw_payload._norwyn_foundation.idempotency.row_key_strategy, "date_legacy_names_v1");
  assert.equal(normalized[0].json.link_clicks, 50);
  assert.equal(normalized[0].json.cost_per_landing_page_view, 2.5);
  assert.equal(normalized[0].json.cost_per_checkout, 20);
  assert.equal(normalized[0].json.meta_purchases, 2);
  assert.equal(normalized[0].json.meta_purchase_value, 394);
  assert.equal(normalized[0].json.meta_purchase_roas, 3.94);
  assert.equal(normalized[0].json.creative_format, "imagem");
  assert.equal(normalized[0].json.raw_payload._norwyn_foundation.confirmed_sales_semantics, "not_collected_by_meta_workflow");

  const validator = workflow.nodes.find((node) => node.name === "Validar Insights Meta");
  const validateMeta = new AsyncFunction("items", "$items", validator.parameters.jsCode);
  await assert.doesNotReject(() => validateMeta([{ json: { data: [] } }], () => []));
  await assert.rejects(
    () => validateMeta([{ json: { error: { type: "OAuthException", code: 190, error_subcode: 463, message: "Token expirado access_token=EAA_SUPER_SECRET_VALUE_123" } } }], () => []),
    (error) => {
      assert.match(error.message, /etapa=insights/);
      assert.match(error.message, /code=190/);
      assert.match(error.message, /subcode=463/);
      assert.doesNotMatch(error.message, /EAA_SUPER_SECRET_VALUE_123/);
      return true;
    },
  );
  await assert.rejects(() => validateMeta([{ json: { unexpected: true } }], () => []), /malformed_response/);

  const consolidateNode = workflow.nodes.find((node) => node.name === "Consolidar Enriquecimento");
  const consolidate = new AsyncFunction("items", "$items", consolidateNode.parameters.jsCode);
  const destinationCases = [
    ["ad-slash", "https://zumbido.fgajulianacoutinho.com.br/"],
    ["ad-query", "  https://zumbido.fgajulianacoutinho.com.br/?utm_source=instagram  "],
    ["ad-subdomain", "https://sub.example.com/campaign/?utm_medium=paid"],
    ["ad-unregistered-path", "https://zumbido.fgajulianacoutinho.com.br/outra-pagina?utm_source=instagram"],
    ["ad-invalid", "https://"],
    ["ad-null", null],
  ];
  const configDefinitions = destinationCases.map(([adId]) => ({ json: { fetch: true, entity_id: adId } }));
  const targeting = {
    genders: [2], age_min: 23, age_max: 65,
    geo_locations: { countries: ["BR"] },
    interests: [{ id: "interest-1", name: "Audition" }],
    education_majors: [{ id: "education-1", name: "Audiology" }],
    work_positions: [{ id: "work-1", name: "Fonoaudiologa" }],
    custom_audiences: [{ id: "aud-included" }],
    excluded_custom_audiences: [{ id: "aud-excluded" }],
    targeting_automation: { advantage_audience: 1 },
  };
  const configResponses = destinationCases.map(([adId, destination]) => ({ json: {
    id: adId,
    campaign: { id: "campaign-1", name: "Campaign" },
    adset: { id: "adset-1", name: "Ad Set", targeting },
    creative: { id: `creative-${adId}`, name: `Creative ${adId}`, link_url: destination },
  } }));
  const itemMap = {
    "Configuracao V9": [{ json: { tenant_id: config.tenant_id, graph_version: "v23.0" } }],
    "Carregar Cache Supabase": [],
    "Preparar Configuracao Meta": configDefinitions,
    "Meta Graph - Configuracao de Anuncios": configResponses,
    "Preparar Assets Meta": [
      { json: { fetch: true, entity_type: "audience", entity_id: "aud-included", parent_ids: { adset_id: "adset-1" } } },
      { json: { fetch: true, entity_type: "audience", entity_id: "aud-excluded", parent_ids: { adset_id: "adset-1" } } },
    ],
    "Meta Graph - Assets": [
      { json: { id: "aud-included", name: "Lookalike Compradoras", subtype: "LOOKALIKE", lookalike_spec: { origin_event_name: "Purchase" } } },
      { json: { id: "aud-excluded", name: "Clientes existentes", subtype: "CUSTOM", customer_file_source: "USER_PROVIDED_ONLY" } },
    ],
    "Carregar Registry Supabase": [
      { json: { landing_key: "zumbido_antiga", campaign_key: "zumbido", url: "https://zumbido.fgajulianacoutinho.com.br" } },
      { json: { landing_key: "sub_campaign", campaign_key: "sub", url: "https://sub.example.com/campaign" } },
    ],
    "Tratar Paginacao": destinationCases.map(([adId]) => ({ json: { ad_id: adId, campaign_id: "campaign-1", adset_id: "adset-1" } })),
  };
  const consolidated = await consolidate([], (name) => itemMap[name] || []);
  assert.equal(consolidated[0].json.destination_domain, "zumbido.fgajulianacoutinho.com.br");
  assert.equal(consolidated[1].json.destination_domain, "zumbido.fgajulianacoutinho.com.br");
  assert.equal(consolidated[2].json.destination_domain, "sub.example.com");
  assert.equal(consolidated[3].json.destination_domain, "zumbido.fgajulianacoutinho.com.br");
  assert.equal(consolidated[4].json.destination_domain, null);
  assert.equal(consolidated[5].json.destination_domain, null);
  assert.equal(consolidated[0].json.landing_key, "zumbido_antiga");
  assert.equal(consolidated[1].json._landing_resolution.reason, "destination_host_path_exact");
  assert.equal(consolidated[2].json.landing_key, "sub_campaign");
  assert.equal(consolidated[3].json.landing_key, null);
  assert.equal(consolidated[3].json._landing_resolution.reason, "unregistered_destination_path");
  assert.equal(consolidated[4].json._landing_resolution.reason, "invalid_destination");
  assert.equal(consolidated[5].json._landing_resolution.reason, "missing_destination");
  assert.match(consolidated[0].json._audience.targeting_summary, /Mulheres \| 23-65 \| Brasil/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Interesse: Audition/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Formacao: Audiology/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Cargo: Fonoaudiologa/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Lookalike: Lookalike Compradoras \(origem: Purchase\)/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Exclusao: Clientes existentes/);
  assert.match(consolidated[0].json._audience.targeting_summary, /Advantage ativo/);
  assert.equal(consolidated[0].json._audience.audience_type, "Misto");
  assert.doesNotMatch(transformNode.parameters.jsCode, /complete_registration/i);
  assert.match(transformNode.parameters.jsCode, /date_meta_ids_v1/);
  assert.match(transformNode.parameters.jsCode, /date_legacy_names_v1/);
  console.log("Traffic Data Foundation V1 n8n Cloud credential regression PASS");
})().catch((error) => { console.error(error); process.exit(1); });
