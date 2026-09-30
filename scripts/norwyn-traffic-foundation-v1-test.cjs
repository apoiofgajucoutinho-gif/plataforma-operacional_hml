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
const enrichmentNode = workflow.nodes.find((node) => node.name === "Enriquecer Configuracao, Publico e Criativo");
const transformNode = workflow.nodes.find((node) => node.name === "Normalizar para Supabase");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

assert.match(analytics, /canonicalActionValue/);
assert.match(analytics, /offsite_conversion\.fb_pixel_purchase/);
assert.doesNotMatch(workflow.name, /V8/);
assert.ok(enrichmentNode);
assert.equal(workflow.active, false, "V9 must remain inactive until an authorized cutover");
assert.ok(workflow.nodes.some((node) => node.name === "Executar Smoke Manual"));
assert.ok(workflow.nodes.some((node) => node.name === "Resumo Smoke sem Persistir"));
assert.match(workflow.nodes.find((node) => node.name === "Marcar Smoke Dry Run").parameters.jsCode, /META_ADS_SMOKE_PERSIST/);
assert.match(workflow.nodes.find((node) => node.name === "Calcular Smoke 1-2 dias").parameters.jsCode, /Math\.min\(2/);
assert.match(workflow.nodes.find((node) => node.name === "Montar Lotes Supabase").parameters.jsCode, /uniqueMap/);
assert.equal(workflow.nodes.find((node) => node.name === "Upsert Supabase Ads").retryOnFail, true);
assert.match(workflowText, /canonical_alias_priority/);
assert.match(workflowText, /meta_purchase_value/);
assert.match(workflowText, /instagram_ads_config_snapshots/);
assert.match(enrichmentNode.parameters.jsCode, /targetingSignals/);
assert.match(enrichmentNode.parameters.jsCode, /META_ADS_CONFIG_TTL_HOURS/);
assert.match(enrichmentNode.parameters.jsCode, /excluded_custom_audiences/);
assert.match(enrichmentNode.parameters.jsCode, /snapshot_cache/);
assert.match(transformNode.parameters.jsCode, /SEM_CLASSIFICACAO_AUTOMATICA/);
assert.doesNotMatch(transformNode.parameters.jsCode, /PUBLICO RUIM|SATURADO|CTR BAIXO/);
assert.ok(workflow.nodes.some((node) => node.name === "Preparar Snapshots de Configuracao"));
assert.ok(workflow.nodes.some((node) => node.name === "Upsert Snapshots de Configuracao"));
assert.match(workflowText, /unique_outbound_clicks/);
assert.match(workflowText, /quality_ranking/);
assert.match(workflowText, /creative_video_duration_seconds/);
assert.doesNotMatch(workflowText, /ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0|oerdsmgiebquecqwcbox|EAAnfR/);
assert.doesNotThrow(() => new AsyncFunction("items", "$env", "$http", enrichmentNode.parameters.jsCode));
assert.doesNotThrow(() => new AsyncFunction("items", "$env", "$http", transformNode.parameters.jsCode));
assert.match(v9Migration, /instagram_ads_config_snapshots/);
assert.match(v9Migration, /unique \(tenant_id, entity_type, entity_id, config_hash\)/);
assert.match(foundation, /confidence: "medium"/);
assert.match(endpoint, /meta_reported_purchases/);
assert.match(endpoint, /confirmed_sales/);
assert.match(endpoint, /source_sck/);
for (const creative of ["VID_22.06_01", "IMG_22.06_01", "JUL_VID_04", "AD15 | IMG", "AD12 | IMG"]) {
  assert.ok(migration.includes(creative), `${creative} must be a historical reference`);
}
assert.match(docs, /Meta reported/);
assert.match(docs, /Venda confirmada/);

(async () => {
  const env = {
    META_ADS_ACCESS_TOKEN: "test-token",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    PLATAFORMA_TENANT_ID: "00000000-0000-4000-8000-000000000001",
  };
  const payloads = {
    "campaign-1": { id: "campaign-1", name: "Campaign", objective: "OUTCOME_SALES", status: "ACTIVE", effective_status: "ACTIVE" },
    "adset-1": {
      id: "adset-1",
      name: "Ad Set",
      campaign_id: "campaign-1",
      optimization_goal: "OFFSITE_CONVERSIONS",
      billing_event: "IMPRESSIONS",
      targeting: {
        age_min: 25,
        age_max: 55,
        geo_locations: { countries: ["BR"] },
        custom_audiences: [{ id: "audience-1", name: "Any label" }],
      },
    },
    "ad-1": { id: "ad-1", name: "Ad", effective_status: "ACTIVE", creative: { id: "creative-1" } },
    "creative-1": {
      id: "creative-1",
      name: "Creative",
      thumbnail_url: "https://cdn.example/creative.jpg",
      url_tags: "utm_campaign=imersao_zumbido",
      object_story_spec: {
        link_data: {
          link: "https://imersaozumbido.fgajulianacoutinho.com.br",
          message: "Primary",
          name: "Headline",
          description: "Description",
          call_to_action: { type: "LEARN_MORE" },
          image_hash: "image-1",
        },
      },
    },
    "audience-1": {
      id: "audience-1",
      name: "Any label",
      subtype: "ENGAGEMENT_CUSTOM_AUDIENCE",
      rule: "{\"event_sources\":[{\"type\":\"ig_business\"}],\"event\":\"engagement\"}",
      retention_days: 30,
    },
  };
  const http = {
    request: async ({ url }) => {
      if (url.includes("norwyn_landing_registry")) {
        return { data: [{ landing_key: "imersao_zumbido", campaign_key: "imersao_zumbido", url: "https://imersaozumbido.fgajulianacoutinho.com.br" }] };
      }
      if (url.includes("instagram_ads_config_snapshots")) return { data: [] };
      const id = decodeURIComponent(url.split("/").pop());
      if (!payloads[id]) throw new Error("unexpected graph id " + id);
      return { data: payloads[id] };
    },
  };
  const input = [{
    json: {
      campaign_id: "campaign-1",
      campaign_name: "Campaign",
      adset_id: "adset-1",
      adset_name: "Ad Set",
      ad_id: "ad-1",
      ad_name: "Ad",
      date_start: "2026-09-28",
      spend: "100",
      impressions: "1000",
      reach: "800",
      clicks: "80",
      unique_clicks: "70",
      inline_link_clicks: "50",
      unique_inline_link_clicks: "45",
      unique_inline_link_click_ctr: "4.5",
      cost_per_unique_inline_link_click: "2.2222",
      ctr: "8",
      cpc: "1.25",
      cpm: "100",
      frequency: "1.25",
      actions: [
        { action_type: "link_click", value: "50" },
        { action_type: "landing_page_view", value: "40" },
        { action_type: "offsite_conversion.fb_pixel_initiate_checkout", value: "5" },
        { action_type: "offsite_conversion.fb_pixel_purchase", value: "2" },
      ],
      action_values: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "394" }],
      outbound_clicks: [{ action_type: "outbound_click", value: "48" }],
      unique_outbound_clicks: [{ action_type: "outbound_click", value: "43" }],
      purchase_roas: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "3.94" }],
      _norwyn_mode: "smoke_manual",
      _norwyn_smoke_persist: false,
    },
  }];
  const enrich = new AsyncFunction("items", "$env", "$http", enrichmentNode.parameters.jsCode);
  const enriched = await enrich(input, env, http);
  assert.equal(enriched[0].json._audience.audience_type, "Engajamento Instagram");
  assert.equal(enriched[0].json.landing_key, "imersao_zumbido");
  assert.ok(enriched[0].json._config_snapshots.length >= 5);

  const transform = new AsyncFunction("items", "$env", "$http", transformNode.parameters.jsCode);
  const normalized = await transform(enriched, env, http);
  assert.equal(normalized[0].json.performance_status, "SEM_CLASSIFICACAO_AUTOMATICA");
  assert.equal(normalized[0].json.link_clicks, 50);
  assert.equal(normalized[0].json.cost_per_landing_page_view, 2.5);
  assert.equal(normalized[0].json.cost_per_checkout, 20);
  assert.equal(normalized[0].json.meta_purchases, 2);
  assert.equal(normalized[0].json.meta_purchase_value, 394);
  assert.equal(normalized[0].json.meta_purchase_roas, 3.94);
  assert.equal(normalized[0].json.creative_format, "imagem");
  assert.equal(normalized[0].json.raw_payload._norwyn_foundation.confirmed_sales_semantics, "not_collected_by_meta_workflow");
  console.log("Traffic Data Foundation V1 regression PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
