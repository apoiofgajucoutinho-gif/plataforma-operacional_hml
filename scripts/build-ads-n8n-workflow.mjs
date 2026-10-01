import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const readCode = (name) => readFileSync(join(root, "scripts", "n8n", name), "utf8");
const outputPath = join(root, "modules", "ads", "Instagram Ads Daily Collector_V9_Traffic_Foundation.json");
const fields = [
  "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name", "impressions", "reach", "clicks",
  "unique_clicks", "unique_ctr", "cost_per_unique_click", "inline_link_clicks", "unique_inline_link_clicks",
  "unique_inline_link_click_ctr", "cost_per_unique_inline_link_click", "outbound_clicks", "unique_outbound_clicks", "ctr", "cpc",
  "cpm", "frequency", "spend", "objective", "date_start", "date_stop", "actions", "action_values", "cost_per_action_type",
  "purchase_roas", "quality_ranking", "engagement_rate_ranking", "conversion_rate_ranking", "video_play_actions",
  "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions", "video_p95_watched_actions",
  "video_p100_watched_actions", "video_thruplay_watched_actions",
].join(",");

function node(id, name, type, typeVersion, position, parameters = {}, extra = {}) {
  return { id, name, type, typeVersion, position, parameters, ...extra };
}

const modeCode = (mode) => `return [{ json: { mode: '${mode}' } }];`;
const configCode = `const input = items[0]?.json || {};
const config = {
  ad_account_id: 'CONFIGURE_AD_ACCOUNT_ID',
  tenant_id: 'CONFIGURE_TENANT_ID',
  supabase_url: 'https://CONFIGURE_PROJECT_REF.supabase.co',
  graph_version: 'v23.0',
  lookback_days: 7,
  smoke_days: 1,
  smoke_persist: false,
  max_pages: 100,
  upsert_batch_size: 50,
  config_ttl_hours: 24,
  creative_ttl_hours: 168,
};
for (const key of ['ad_account_id', 'tenant_id', 'supabase_url']) {
  if (!config[key] || String(config[key]).includes('CONFIGURE_')) throw new Error('Preencha ' + key + ' no node Configuracao V9 antes de executar o smoke.');
}
return [{ json: { ...input, ...config } }];`;

const calculateWindowCode = `const config = $items('Configuracao V9')[0]?.json || {};
const mode = String(config.mode || 'incremental');
const today = new Date();
today.setHours(0, 0, 0, 0);
const fmt = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
if (mode === 'backfill_2026') {
  const ranges = [];
  let cursor = new Date('2026-01-01T00:00:00');
  while (cursor <= today) {
    const since = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const until = monthEnd > today ? today : monthEnd;
    ranges.push({ json: { since: fmt(since), until: fmt(until), mode, periodo: String(cursor.getMonth() + 1).padStart(2, '0') + '/' + cursor.getFullYear() } });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return ranges;
}
const days = mode === 'smoke_manual' ? Math.min(2, Math.max(1, Number(config.smoke_days || 1))) : Math.max(1, Number(config.lookback_days || 7));
const since = new Date(today.getTime() - (days - (mode === 'smoke_manual' ? 1 : 0)) * 24 * 60 * 60 * 1000);
return [{ json: { since: fmt(since), until: fmt(today), mode, smoke: mode === 'smoke_manual', smoke_persist: mode === 'smoke_manual' && config.smoke_persist === true } }];`;

const flattenCode = `const config = $items('Configuracao V9')[0]?.json || {};
const rows = [];
for (const item of items) {
  const response = item.json?.body ?? item.json;
  for (const row of Array.isArray(response?.data) ? response.data : []) rows.push({ json: { ...row, _norwyn_mode: config.mode, _norwyn_smoke_persist: config.mode === 'smoke_manual' && config.smoke_persist === true } });
}
return rows;`;

const batchCode = `const batchSize = Number($items('Configuracao V9')[0]?.json?.upsert_batch_size || 50);
const uniqueMap = new Map();
for (const item of items) {
  if (!item.json.row_key) throw new Error('Registro sem row_key.');
  uniqueMap.set(item.json.row_key, item.json);
}
const rows = [...uniqueMap.values()];
const output = [];
for (let index = 0; index < rows.length; index += batchSize) output.push({ json: { rows: rows.slice(index, index + batchSize), batch_size: Math.min(batchSize, rows.length - index), total_items: rows.length, original_items: items.length, removed_duplicates: items.length - rows.length } });
return output;`;

const boolIf = (id, expression) => ({
  conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [{ id, leftValue: expression, rightValue: true, operator: { type: "boolean", operation: "equals", singleValue: true } }], combinator: "and" },
  options: {},
});
const metaAuth = { authentication: "predefinedCredentialType", nodeCredentialType: "facebookGraphApi" };
const supabaseAuth = { authentication: "predefinedCredentialType", nodeCredentialType: "supabaseApi" };
const graphOptions = { batching: { batch: { batchSize: 5, batchInterval: 200 } }, response: { response: { neverError: true, responseFormat: "json" } }, timeout: 120000 };
const metaValidatorCode = (stage, endpoint, kind) => `const stage = ${JSON.stringify(stage)};
const endpoint = ${JSON.stringify(endpoint)};
const kind = ${JSON.stringify(kind)};

function sanitize(value) {
  return String(value || 'Meta retornou um erro sem mensagem.')
    .replace(/([?&]access_token=)[^&\\s]+/gi, '$1[redacted]')
    .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/EAA[A-Za-z0-9_-]{12,}/g, '[redacted]')
    .slice(0, 400);
}

function fail(error, fallback) {
  const code = error?.code ?? 'unknown';
  const subcode = error?.error_subcode ?? error?.subcode ?? 'none';
  const type = error?.type || 'MetaError';
  const message = sanitize(error?.message || fallback);
  throw new Error(\`Meta request failed | etapa=\${stage} | endpoint=\${endpoint} | type=\${type} | code=\${code} | subcode=\${subcode} | message=\${message}\`);
}

for (const [index, item] of items.entries()) {
  const response = item.json?.body ?? item.json;
  const error = response?.error || (response?.type === 'OAuthException' ? response : null);
  if (error) fail(error);
  const serialized = JSON.stringify(response || {}).toLowerCase();
  if (/oauth(exception)?|token (expired|invalid)|permission denied/.test(serialized)) fail(response, 'Falha de autenticacao ou permissao Meta.');
  const valid = kind === 'insights' ? Array.isArray(response?.data) : Boolean(response && typeof response === 'object' && response.id);
  if (!valid) fail({ code: 'malformed_response', message: \`Estrutura minima ausente no item \${index + 1}.\` });
}
return items;`;

const nodes = [
  node("manual-backfill", "Executar Backfill 2026", "n8n-nodes-base.manualTrigger", 1, [-4300, 600]),
  node("mode-backfill", "Modo Backfill", "n8n-nodes-base.code", 2, [-4080, 600], { jsCode: modeCode("backfill_2026") }),
  node("schedule", "20h30 Daily", "n8n-nodes-base.scheduleTrigger", 1.2, [-4300, 300], { rule: { interval: [{ field: "days", daysInterval: 1, triggerAtHour: 20, triggerAtMinute: 30 }] } }),
  node("mode-incremental", "Modo Incremental", "n8n-nodes-base.code", 2, [-4080, 300], { jsCode: modeCode("incremental") }),
  node("manual-smoke", "Executar Smoke Manual", "n8n-nodes-base.manualTrigger", 1, [-4300, 0]),
  node("mode-smoke", "Modo Smoke Dry Run", "n8n-nodes-base.code", 2, [-4080, 0], { jsCode: modeCode("smoke_manual") }),
  node("config", "Configuracao V9", "n8n-nodes-base.code", 2, [-3820, 300], { jsCode: configCode }, { notes: "Somente parametros nao secretos. Tokens e chaves ficam em Credentials do n8n Cloud." }),
  node("load-registry", "Carregar Registry Supabase", "n8n-nodes-base.httpRequest", 4.2, [-3560, 300], {
    ...supabaseAuth, url: "={{ $('Configuracao V9').first().json.supabase_url.replace(/\/$/, '') + '/rest/v1/norwyn_landing_registry' }}", sendQuery: true,
    queryParameters: { parameters: [{ name: "select", value: "landing_key,campaign_key,url,product_id,metadata" }, { name: "tenant_id", value: "={{ 'eq.' + $('Configuracao V9').first().json.tenant_id }}" }] },
    options: { response: { response: { responseFormat: "json" } }, timeout: 30000 },
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000, alwaysOutputData: true }),
  node("registry-ready", "Registry carregado", "n8n-nodes-base.code", 2, [-3380, 300], { jsCode: "return [{ json: $items('Configuracao V9')[0].json }];" }),
  node("load-cache", "Carregar Cache Supabase", "n8n-nodes-base.httpRequest", 4.2, [-3160, 300], {
    ...supabaseAuth, url: "={{ $('Configuracao V9').first().json.supabase_url.replace(/\/$/, '') + '/rest/v1/instagram_ads_config_snapshots' }}", sendQuery: true,
    queryParameters: { parameters: [{ name: "select", value: "entity_type,entity_id,config_json,config_hash,last_seen_at" }, { name: "tenant_id", value: "={{ 'eq.' + $('Configuracao V9').first().json.tenant_id }}" }, { name: "order", value: "last_seen_at.desc" }] },
    options: { response: { response: { responseFormat: "json" } }, timeout: 30000 },
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000, alwaysOutputData: true }),
  node("cache-ready", "Cache carregado", "n8n-nodes-base.code", 2, [-2960, 300], { jsCode: "return [{ json: $items('Configuracao V9')[0].json }];" }),
  node("window", "Calcular Janela", "n8n-nodes-base.code", 2, [-2760, 300], { jsCode: calculateWindowCode }),
  node("meta-insights", "Meta Ads API - Insights", "n8n-nodes-base.httpRequest", 4.2, [-2500, 300], {
    ...metaAuth,
    url: "={{ 'https://graph.facebook.com/' + $('Configuracao V9').first().json.graph_version + '/' + ($('Configuracao V9').first().json.ad_account_id.startsWith('act_') ? $('Configuracao V9').first().json.ad_account_id : 'act_' + $('Configuracao V9').first().json.ad_account_id) + '/insights' }}",
    sendQuery: true, queryParameters: { parameters: [{ name: "fields", value: fields }, { name: "level", value: "ad" }, { name: "time_range", value: "={{ JSON.stringify({ since: $json.since, until: $json.until }) }}" }, { name: "time_increment", value: "1" }, { name: "limit", value: "500" }] },
    options: { pagination: { pagination: { paginationMode: "responseContainsNextURL", nextURL: "={{ $response.body.paging?.next }}", paginationCompleteWhen: "other", completeExpression: "={{ !$response.body.paging?.next }}", limitPagesFetched: true, maxRequests: "={{ $('Configuracao V9').first().json.max_pages }}", requestInterval: 300 } }, response: { response: { responseFormat: "json" } }, timeout: 120000 },
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
  node("validate-meta-insights", "Validar Insights Meta", "n8n-nodes-base.code", 2, [-2370, 300], { jsCode: metaValidatorCode("insights", "ad_account/insights", "insights") }),
  node("flatten", "Tratar Paginacao", "n8n-nodes-base.code", 2, [-2240, 300], { jsCode: flattenCode }),
  node("prepare-config", "Preparar Configuracao Meta", "n8n-nodes-base.code", 2, [-2000, 300], { jsCode: readCode("meta-ads-v9-prepare-config.js") }),
  node("has-config", "Buscar configuracao Meta?", "n8n-nodes-base.if", 2.2, [-1760, 300], boolIf("fetch_config", "={{ $json.fetch === true }}")),
  node("meta-config", "Meta Graph - Configuracao de Anuncios", "n8n-nodes-base.httpRequest", 4.2, [-1520, 180], {
    ...metaAuth, url: "={{ 'https://graph.facebook.com/' + $('Configuracao V9').first().json.graph_version + '/' + $json.entity_id }}", sendQuery: true,
    queryParameters: { parameters: [{ name: "fields", value: "={{ $json.fields }}" }] }, options: graphOptions,
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 }),
  node("validate-meta-config", "Validar Configuracao Meta", "n8n-nodes-base.code", 2, [-1400, 180], { jsCode: metaValidatorCode("configuracao", "ad_bundle", "entity") }),
  node("prepare-assets", "Preparar Assets Meta", "n8n-nodes-base.code", 2, [-1280, 300], { jsCode: readCode("meta-ads-v9-prepare-assets.js") }),
  node("has-assets", "Buscar assets Meta?", "n8n-nodes-base.if", 2.2, [-1040, 300], boolIf("fetch_assets", "={{ $json.fetch === true }}")),
  node("meta-assets", "Meta Graph - Assets", "n8n-nodes-base.httpRequest", 4.2, [-800, 180], {
    ...metaAuth, url: "={{ 'https://graph.facebook.com/' + $('Configuracao V9').first().json.graph_version + '/' + $json.entity_id }}", sendQuery: true,
    queryParameters: { parameters: [{ name: "fields", value: "={{ $json.fields }}" }] }, options: graphOptions,
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 }),
  node("validate-meta-assets", "Validar Assets Meta", "n8n-nodes-base.code", 2, [-680, 180], { jsCode: metaValidatorCode("assets", "audience_or_video", "entity") }),
  node("consolidate", "Consolidar Enriquecimento", "n8n-nodes-base.code", 2, [-560, 300], { jsCode: readCode("meta-ads-v9-consolidate.js") }),
  node("normalize", "Normalizar para Supabase", "n8n-nodes-base.code", 2, [-320, 300], { jsCode: readCode("meta-ads-v9-transform.js") }),
  node("snapshots", "Preparar Snapshots de Configuracao", "n8n-nodes-base.code", 2, [-320, 600], { jsCode: readCode("meta-ads-v9-snapshots.js") }),
  node("persist-snapshots", "Persistir snapshots?", "n8n-nodes-base.if", 2.2, [-80, 600], boolIf("persist_snapshots", "={{ $json._norwyn_mode !== 'smoke_manual' || $json._norwyn_smoke_persist === true }}")),
  node("snapshot-batches", "Montar Lotes de Snapshots", "n8n-nodes-base.code", 2, [160, 600], { jsCode: readCode("meta-ads-v9-snapshot-batches.js") }),
  node("upsert-snapshots", "Upsert Snapshots de Configuracao", "n8n-nodes-base.httpRequest", 4.2, [420, 600], {
    ...supabaseAuth, method: "POST", url: "={{ $('Configuracao V9').first().json.supabase_url.replace(/\\/+$/, '') + '/rest/v1/instagram_ads_config_snapshots?on_conflict=tenant_id,entity_type,entity_id,config_hash' }}",
    sendHeaders: true, headerParameters: { parameters: [{ name: "Prefer", value: "resolution=merge-duplicates,return=minimal" }] }, sendBody: true,
    contentType: "raw", rawContentType: "application/json", body: "={{ JSON.stringify($json.rows) }}", options: { timeout: 120000 },
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
  node("valid", "Registro valido?", "n8n-nodes-base.if", 2.2, [-80, 300], {
    conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [
      { id: "campaign", leftValue: "={{ $json.campanha }}", rightValue: "", operator: { type: "string", operation: "notEmpty", singleValue: true } },
      { id: "ad", leftValue: "={{ $json.anuncio }}", rightValue: "", operator: { type: "string", operation: "notEmpty", singleValue: true } },
      { id: "spend", leftValue: "={{ $json.valor_gasto }}", rightValue: 0, operator: { type: "number", operation: "gt" } },
    ], combinator: "and" }, options: {},
  }),
  node("persist", "Persistir coleta?", "n8n-nodes-base.if", 2.2, [160, 220], boolIf("persist_collection", "={{ $json.raw_payload?._norwyn_mode !== 'smoke_manual' || $json.raw_payload?._norwyn_smoke_persist === true }}")),
  node("batches", "Montar Lotes Supabase", "n8n-nodes-base.code", 2, [420, 140], { jsCode: batchCode }),
  node("upsert", "Upsert Supabase Ads", "n8n-nodes-base.httpRequest", 4.2, [680, 140], {
    ...supabaseAuth, method: "POST", url: "={{ $('Configuracao V9').first().json.supabase_url.replace(/\\/+$/, '') + '/rest/v1/instagram_ads_daily?on_conflict=tenant_id,row_key' }}",
    sendHeaders: true, headerParameters: { parameters: [{ name: "Prefer", value: "resolution=merge-duplicates,return=minimal" }] }, sendBody: true,
    contentType: "raw", rawContentType: "application/json", body: "={{ JSON.stringify($json.rows) }}", options: { timeout: 120000 },
  }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
  node("discard", "Log Descartados", "n8n-nodes-base.code", 2, [420, 380], { jsCode: "console.log('[FGA Ads V9] Registros descartados:', items.length); return items;" }),
  node("smoke-summary", "Resumo Smoke sem Persistir", "n8n-nodes-base.code", 2, [420, 280], { jsCode: "return [{ json: { mode: 'smoke_manual', persisted: false, rows_validated: items.length, message: 'Dry-run concluido sem escrita no Supabase.' } }];" }),
];

const connections = {
  "Executar Backfill 2026": { main: [[{ node: "Modo Backfill", type: "main", index: 0 }]] },
  "Modo Backfill": { main: [[{ node: "Configuracao V9", type: "main", index: 0 }]] },
  "20h30 Daily": { main: [[{ node: "Modo Incremental", type: "main", index: 0 }]] },
  "Modo Incremental": { main: [[{ node: "Configuracao V9", type: "main", index: 0 }]] },
  "Executar Smoke Manual": { main: [[{ node: "Modo Smoke Dry Run", type: "main", index: 0 }]] },
  "Modo Smoke Dry Run": { main: [[{ node: "Configuracao V9", type: "main", index: 0 }]] },
  "Configuracao V9": { main: [[{ node: "Carregar Registry Supabase", type: "main", index: 0 }]] },
  "Carregar Registry Supabase": { main: [[{ node: "Registry carregado", type: "main", index: 0 }]] },
  "Registry carregado": { main: [[{ node: "Carregar Cache Supabase", type: "main", index: 0 }]] },
  "Carregar Cache Supabase": { main: [[{ node: "Cache carregado", type: "main", index: 0 }]] },
  "Cache carregado": { main: [[{ node: "Calcular Janela", type: "main", index: 0 }]] },
  "Calcular Janela": { main: [[{ node: "Meta Ads API - Insights", type: "main", index: 0 }]] },
  "Meta Ads API - Insights": { main: [[{ node: "Validar Insights Meta", type: "main", index: 0 }]] },
  "Validar Insights Meta": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
  "Tratar Paginacao": { main: [[{ node: "Preparar Configuracao Meta", type: "main", index: 0 }]] },
  "Preparar Configuracao Meta": { main: [[{ node: "Buscar configuracao Meta?", type: "main", index: 0 }]] },
  "Buscar configuracao Meta?": { main: [[{ node: "Meta Graph - Configuracao de Anuncios", type: "main", index: 0 }], [{ node: "Preparar Assets Meta", type: "main", index: 0 }]] },
  "Meta Graph - Configuracao de Anuncios": { main: [[{ node: "Validar Configuracao Meta", type: "main", index: 0 }]] },
  "Validar Configuracao Meta": { main: [[{ node: "Preparar Assets Meta", type: "main", index: 0 }]] },
  "Preparar Assets Meta": { main: [[{ node: "Buscar assets Meta?", type: "main", index: 0 }]] },
  "Buscar assets Meta?": { main: [[{ node: "Meta Graph - Assets", type: "main", index: 0 }], [{ node: "Consolidar Enriquecimento", type: "main", index: 0 }]] },
  "Meta Graph - Assets": { main: [[{ node: "Validar Assets Meta", type: "main", index: 0 }]] },
  "Validar Assets Meta": { main: [[{ node: "Consolidar Enriquecimento", type: "main", index: 0 }]] },
  "Consolidar Enriquecimento": { main: [[{ node: "Normalizar para Supabase", type: "main", index: 0 }, { node: "Preparar Snapshots de Configuracao", type: "main", index: 0 }]] },
  "Preparar Snapshots de Configuracao": { main: [[{ node: "Persistir snapshots?", type: "main", index: 0 }]] },
  "Persistir snapshots?": { main: [[{ node: "Montar Lotes de Snapshots", type: "main", index: 0 }], []] },
  "Montar Lotes de Snapshots": { main: [[{ node: "Upsert Snapshots de Configuracao", type: "main", index: 0 }]] },
  "Normalizar para Supabase": { main: [[{ node: "Registro valido?", type: "main", index: 0 }]] },
  "Registro valido?": { main: [[{ node: "Persistir coleta?", type: "main", index: 0 }], [{ node: "Log Descartados", type: "main", index: 0 }]] },
  "Persistir coleta?": { main: [[{ node: "Montar Lotes Supabase", type: "main", index: 0 }], [{ node: "Resumo Smoke sem Persistir", type: "main", index: 0 }]] },
  "Montar Lotes Supabase": { main: [[{ node: "Upsert Supabase Ads", type: "main", index: 0 }]] },
};

const workflow = {
  name: "Instagram Ads Daily Collector_V9_Traffic_Foundation",
  nodes, connections, pinData: {}, active: false,
  settings: { executionOrder: "v1", timezone: "America/Sao_Paulo" },
  versionId: "cb84a111-4f84-4a9c-bcac-5f8f4ce793d9",
  meta: { templateCredsSetupCompleted: false, norwynCollectorVersion: "v9-cloud-credentials" }, tags: [],
};

writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(`Generated ${outputPath}`);
