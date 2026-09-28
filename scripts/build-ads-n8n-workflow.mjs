import { writeFileSync } from "node:fs";
import { join } from "node:path";

const metaUrl =
  "={{ 'https://graph.facebook.com/v23.0/' + ($env.META_AD_ACCOUNT_ID.startsWith('act_') ? $env.META_AD_ACCOUNT_ID : 'act_' + $env.META_AD_ACCOUNT_ID) + '/insights' }}";

const fields = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "spend",
  "objective",
  "date_start",
  "date_stop",
  "actions",
  "action_values",
  "cost_per_action_type",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p95_watched_actions",
  "video_p100_watched_actions",
  "video_thruplay_watched_actions",
].join(",");

function node(id, name, type, typeVersion, position, parameters = {}, extra = {}) {
  return { id, name, type, typeVersion, position, parameters, ...extra };
}

const calculateBackfill = `const start = new Date('2026-01-01T00:00:00');
const today = new Date();
today.setHours(0, 0, 0, 0);
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ranges = [];

let cursor = new Date(start);
while (cursor <= today) {
  const since = new Date(cursor);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const until = monthEnd > today ? today : monthEnd;

  ranges.push({
    json: {
      since: fmt(since),
      until: fmt(until),
      mode: 'backfill_2026',
      periodo: String(cursor.getMonth() + 1).padStart(2, '0') + '/' + cursor.getFullYear()
    }
  });

  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
}

console.log(\`[FGA Ads 2026] Backfill em \${ranges.length} lote(s) mensais.\`);
return ranges;`;

const calculateIncremental = `const LOOKBACK_DAYS = Number($env.META_ADS_LOOKBACK_DAYS || 7);
const today = new Date();
today.setHours(0, 0, 0, 0);
const since = new Date(today.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const sinceStr = fmt(since);
const untilStr = fmt(today);
console.log(\`[FGA Ads incremental] Buscando de \${sinceStr} ate \${untilStr}\`);
return [{ json: { since: sinceStr, until: untilStr, mode: 'incremental' } }];`;

const calculateSmoke = `const SMOKE_DAYS = Math.min(2, Math.max(1, Number($env.META_ADS_SMOKE_DAYS || 1)));
const today = new Date();
today.setHours(0, 0, 0, 0);
const since = new Date(today.getTime() - (SMOKE_DAYS - 1) * 24 * 60 * 60 * 1000);
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
return [{ json: { since: fmt(since), until: fmt(today), mode: 'smoke_manual', smoke: true } }];`;

const tagSmokeCode = `const persist = String($env.META_ADS_SMOKE_PERSIST || 'false').toLowerCase() === 'true';
return items.map(item => ({ json: { ...item.json, _norwyn_mode: 'smoke_manual', _norwyn_smoke_persist: persist } }));`;

const paginationCode = `let allData = [];
const maxPages = Number($env.META_ADS_MAX_PAGES || 100);

for (const item of items) {
  const response = item.json;
  const executionContext = {
    _norwyn_mode: response._norwyn_mode || null,
    _norwyn_smoke_persist: response._norwyn_smoke_persist === true,
  };
  let batchData = Array.isArray(response.data) ? response.data.map(row => ({ ...row, ...executionContext })) : [];
  let nextUrl = response.paging?.next || null;
  let pageCount = 1;

  while (nextUrl && pageCount < maxPages) {
    pageCount++;
    console.log(\`[FGA Ads] Pagina \${pageCount}...\`);

    let pageResp;
    try {
      pageResp = await $http.request({ method: 'GET', url: nextUrl });
    } catch (error) {
      throw new Error(\`Falha ao buscar pagina \${pageCount} da Meta Ads API: \${error.message}\`);
    }

    const pageData = pageResp.data ?? pageResp;
    batchData = batchData.concat(Array.isArray(pageData.data) ? pageData.data.map(row => ({ ...row, ...executionContext })) : []);
    nextUrl = pageData.paging?.next || null;
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  allData = allData.concat(batchData);
  console.log(\`[FGA Ads] Lote coletado: \${batchData.length} registros em \${pageCount} pagina(s).\`);
}

console.log(\`[FGA Ads] Total coletado: \${allData.length} registros.\`);
return allData.map(row => ({ json: row }));`;

const enrichmentCode = `const token = String($env.META_ADS_ACCESS_TOKEN || '').trim();
const supabaseUrl = String($env.SUPABASE_URL || '').replace(/\\/$/, '');
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const tenantId = String($env.PLATAFORMA_TENANT_ID || '').trim();
const cache = new Map();

let landings = [];
if (supabaseUrl && serviceKey && tenantId) {
  try {
    const response = await $http.request({
      method: 'GET',
      url: supabaseUrl + '/rest/v1/norwyn_landing_registry?select=landing_key,campaign_key,url,product_id,metadata&tenant_id=eq.' + encodeURIComponent(tenantId),
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
    });
    landings = response.data ?? response ?? [];
  } catch (error) {
    console.log('[FGA Ads] Registry de LP indisponivel; coleta continua sem resolver landing_key.');
  }
}

function firstUrl(creative) {
  const spec = creative?.object_story_spec || {};
  const candidates = [spec.link_data?.link, spec.video_data?.call_to_action?.value?.link, creative?.object_url];
  const feedLinks = creative?.asset_feed_spec?.link_urls || [];
  for (const entry of feedLinks) candidates.push(entry?.website_url || entry?.deeplink_url);
  return candidates.find(value => typeof value === 'string' && /^https?:\\/\\//i.test(value)) || null;
}

function resolveLanding(destinationUrl, urlTags) {
  let destinationHost = null;
  try { destinationHost = destinationUrl ? new URL(destinationUrl).hostname.toLowerCase() : null; } catch {}
  for (const landing of landings) {
    let landingHost = null;
    try { landingHost = new URL(landing.url).hostname.toLowerCase(); } catch {}
    if (destinationHost && landingHost === destinationHost) return { landing_key: landing.landing_key, confidence: 'high', reason: 'destination_domain_exact' };
    if (urlTags && (urlTags.includes('landing_key=' + landing.landing_key) || urlTags.includes('utm_campaign=' + landing.campaign_key))) {
      return { landing_key: landing.landing_key, confidence: 'high', reason: 'url_tags_exact' };
    }
  }
  return { landing_key: null, confidence: 'unresolved', reason: 'no_explicit_destination_match' };
}

for (const item of items) {
  const row = item.json;
  const adId = String(row.ad_id || '').trim();
  if (!adId || !token) continue;
  if (!cache.has(adId)) {
    try {
      const response = await $http.request({
        method: 'GET',
        url: 'https://graph.facebook.com/v23.0/' + encodeURIComponent(adId),
        qs: { fields: 'id,name,effective_status,creative{id,name,thumbnail_url,image_url,object_url,url_tags,object_story_spec,asset_feed_spec}', access_token: token },
      });
      cache.set(adId, response.data ?? response ?? {});
    } catch (error) {
      cache.set(adId, { _enrichment_error: String(error.message || error).slice(0, 300) });
    }
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  const ad = cache.get(adId);
  const creative = ad?.creative || {};
  row.effective_status = ad?.effective_status || row.effective_status || null;
  row.creative_id = creative.id || null;
  row.creative_name = creative.name || null;
  row.thumbnail_url = creative.thumbnail_url || creative.image_url || null;
  row.preview_url = null;
  row.destination_url = firstUrl(creative);
  row.destination_domain = row.destination_url ? new URL(row.destination_url).hostname.toLowerCase() : null;
  row.url_tags = creative.url_tags || null;
  row._landing_resolution = resolveLanding(row.destination_url, row.url_tags);
  row.landing_key = row._landing_resolution.landing_key;
  row._creative_enrichment = creative.id ? { confidence: 'high', source: 'meta_ad_creative' } : { confidence: 'unresolved', source: 'meta_ad_creative', error: ad?._enrichment_error || null };
}

return items;`;

const transformCode = `function actionValue(actions, types) {
  if (!Array.isArray(actions)) return 0;
  return actions
    .filter(action => types.has(String(action.action_type || '').toLowerCase()))
    .reduce((sum, action) => sum + Number(action.value || 0), 0);
}

function canonicalAction(actions, priority) {
  if (!Array.isArray(actions)) return { value: 0, action_type: null };
  for (const actionType of priority) {
    const found = actions.find(action => String(action.action_type || '').toLowerCase() === actionType);
    if (found) return { value: Number(found.value || 0), action_type: actionType };
  }
  return { value: 0, action_type: null };
}

const leadTypes = new Set([
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'omni_lead',
]);
const videoViewTypes = new Set(['video_view']);
const thruplayTypes = new Set(['video_view', 'thruplay']);

return items.map(item => {
  const d = item.json;
  const ctr = Number(d.ctr || 0);
  const cpc = Number(d.cpc || 0);
  const cpm = Number(d.cpm || 0);
  const freq = Number(d.frequency || 0);
  const spend = Number(d.spend || 0);
  const clicks = Number(d.clicks || 0);
  const impressions = Number(d.impressions || 0);
  const reach = Number(d.reach || 0);
  const dataRef = d.date_start ? d.date_start : new Date().toISOString().split('T')[0];
  const tenantId = String($env.PLATAFORMA_TENANT_ID || '').trim();

  if (!tenantId) {
    throw new Error('Configure PLATAFORMA_TENANT_ID no ambiente do n8n.');
  }

  const campanha = String(d.campaign_name || '').trim();
  const conjunto = String(d.adset_name || '').trim();
  const anuncio = String(d.ad_name || '').trim();
  const status = String(d.effective_status || 'UNKNOWN').trim().toUpperCase();
  const leadsMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_lead', 'lead', 'omni_lead', 'onsite_conversion.lead_grouped']);
  const leads = leadsMetric.value;
  const linkClicksMetric = canonicalAction(d.actions, ['link_click']);
  const landingPageViewsMetric = canonicalAction(d.actions, ['landing_page_view', 'omni_landing_page_view']);
  const initiateCheckoutsMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'omni_initiated_checkout', 'onsite_web_initiate_checkout']);
  const purchasesMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'onsite_web_purchase', 'onsite_conversion.purchase']);
  const purchaseValueMetric = canonicalAction(d.action_values, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'onsite_web_purchase', 'onsite_conversion.purchase']);
  const conversoes = purchasesMetric.value;
  const linkClicks = linkClicksMetric.value;
  const landingPageViews = landingPageViewsMetric.value;
  const initiateCheckouts = initiateCheckoutsMetric.value;

  let performance_status = 'OK';
  if (cpm > 50 && ctr < 1) performance_status = 'PUBLICO RUIM';
  else if (freq > 3) performance_status = 'SATURADO';
  else if (ctr < 1) performance_status = 'CTR BAIXO';

  const performance_score = (ctr * 40) + ((clicks > 0 ? ctr : 0) * 40) - (cpc * 10) - (freq * 10);
  const rowKey = [dataRef, campanha, conjunto, anuncio].join('|');

  return {
    json: {
      tenant_id: tenantId,
      data_referencia: dataRef,
      campanha,
      conjunto: conjunto || null,
      anuncio,
      status,
      objetivo: d.objective || null,
      alcance: Math.round(reach),
      impressoes: Math.round(impressions),
      cliques: Math.round(clicks),
      ctr,
      cpc,
      cpm,
      frequencia: freq,
      valor_gasto: spend,
      conversoes: Math.round(conversoes),
      leads: Math.round(leads),
      campaign_id: d.campaign_id || null,
      adset_id: d.adset_id || null,
      ad_id: d.ad_id || null,
      creative_id: d.creative_id || null,
      creative_name: d.creative_name || null,
      placement: d.placement || null,
      publisher_platform: d.publisher_platform || null,
      device_platform: d.device_platform || null,
      link_clicks: Math.round(linkClicks),
      landing_page_views: Math.round(landingPageViews),
      initiate_checkouts: Math.round(initiateCheckouts),
      meta_purchases: Math.round(conversoes),
      meta_purchase_value: purchaseValueMetric.action_type ? purchaseValueMetric.value : null,
      video_views: Math.round(actionValue(d.actions, videoViewTypes)),
      video_plays_3s: Math.round(actionValue(d.actions, videoViewTypes)),
      video_p25: Math.round(actionValue(d.video_p25_watched_actions, videoViewTypes)),
      video_p50: Math.round(actionValue(d.video_p50_watched_actions, videoViewTypes)),
      video_p75: Math.round(actionValue(d.video_p75_watched_actions, videoViewTypes)),
      video_p95: Math.round(actionValue(d.video_p95_watched_actions, videoViewTypes)),
      video_p100: Math.round(actionValue(d.video_p100_watched_actions, videoViewTypes)),
      thruplays: Math.round(actionValue(d.video_thruplay_watched_actions, thruplayTypes)),
      preview_url: d.preview_url || null,
      thumbnail_url: d.thumbnail_url || null,
      destination_url: d.destination_url || null,
      destination_domain: d.destination_domain || null,
      url_tags: d.url_tags || null,
      landing_key: d.landing_key || null,
      performance_status,
      performance_score: Math.round(performance_score * 100) / 100,
      origem: 'n8n_meta_ads',
      row_key: rowKey,
      raw_payload: { ...d, _norwyn_foundation: { collector_version: 'v9', baseline: 'Instagram Ads Daily Collector_V3', action_semantics: 'canonical_alias_priority', action_sources: { leads: leadsMetric.action_type, link_clicks: linkClicksMetric.action_type, landing_page_views: landingPageViewsMetric.action_type, initiate_checkouts: initiateCheckoutsMetric.action_type, purchases: purchasesMetric.action_type, purchase_value: purchaseValueMetric.action_type }, idempotency: { persisted_row_key: 'date|campaign_name|adset_name|ad_name', candidate_id_key: [dataRef, d.campaign_id, d.adset_id, d.ad_id].join('|') }, creative: d._creative_enrichment || null, landing: d._landing_resolution || null } },
      imported_at: new Date().toISOString()
    }
  };
});`;

const batchCode = `const batchSize = Number($env.SUPABASE_UPSERT_BATCH_SIZE || 50);
const uniqueMap = new Map();

for (const item of items) {
  const row = item.json;
  if (!row.row_key) throw new Error('Registro sem row_key.');
  uniqueMap.set(row.row_key, row);
}

const uniqueRows = Array.from(uniqueMap.values());
const batches = [];

for (let index = 0; index < uniqueRows.length; index += batchSize) {
  batches.push({
    json: {
      rows: uniqueRows.slice(index, index + batchSize),
      batch_start: index + 1,
      batch_end: Math.min(index + batchSize, uniqueRows.length),
      batch_size: Math.min(batchSize, uniqueRows.length - index),
      total_items: uniqueRows.length,
      original_items: items.length,
      removed_duplicates: items.length - uniqueRows.length,
    }
  });
}

console.log(\`[FGA Ads] Preparados \${batches.length} lote(s). Original: \${items.length}. Unicos: \${uniqueRows.length}.\`);
return batches;`;

const workflow = {
  name: "Instagram Ads Daily Collector_V9_Traffic_Foundation",
  nodes: [
    node("manual-backfill", "Executar Backfill 2026", "n8n-nodes-base.manualTrigger", 1, [-4240, 560]),
    node("calc-backfill", "Calcular Periodo 2026", "n8n-nodes-base.code", 2, [-4000, 560], { jsCode: calculateBackfill }),
    node("schedule", "20h30 Daily", "n8n-nodes-base.scheduleTrigger", 1.2, [-4240, 160], {
      rule: {
        interval: [
          {
            field: "days",
            daysInterval: 1,
            triggerAtHour: 20,
            triggerAtMinute: 30,
          },
        ],
      },
    }),
    node("manual-smoke", "Executar Smoke Manual", "n8n-nodes-base.manualTrigger", 1, [-4240, -160]),
    node("calc-smoke", "Calcular Smoke 1-2 dias", "n8n-nodes-base.code", 2, [-4000, -160], { jsCode: calculateSmoke }),
    node("calc-incremental", "Calcular Incremental", "n8n-nodes-base.code", 2, [-4000, 160], { jsCode: calculateIncremental }),
    node("meta-backfill", "Meta Ads API - Backfill 2026", "n8n-nodes-base.httpRequest", 4.2, [-3760, 560], {
      url: metaUrl,
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: "fields", value: fields },
          { name: "level", value: "ad" },
          { name: "time_range", value: "={{ JSON.stringify({ since: $json.since, until: $json.until }) }}" },
          { name: "time_increment", value: "1" },
          { name: "limit", value: "500" },
          { name: "access_token", value: "={{ $env.META_ADS_ACCESS_TOKEN }}" },
        ],
      },
      options: {},
    }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
    node("meta-incremental", "Meta Ads API - Incremental", "n8n-nodes-base.httpRequest", 4.2, [-3760, 160], {
      url: metaUrl,
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: "fields", value: fields },
          { name: "level", value: "ad" },
          { name: "time_range", value: "={{ JSON.stringify({ since: $json.since, until: $json.until }) }}" },
          { name: "time_increment", value: "1" },
          { name: "limit", value: "500" },
          { name: "access_token", value: "={{ $env.META_ADS_ACCESS_TOKEN }}" },
        ],
      },
      options: {},
    }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
    node("meta-smoke", "Meta Ads API - Smoke", "n8n-nodes-base.httpRequest", 4.2, [-3760, -160], {
      url: metaUrl,
      sendQuery: true,
      queryParameters: { parameters: [
        { name: "fields", value: fields },
        { name: "level", value: "ad" },
        { name: "time_range", value: "={{ JSON.stringify({ since: $json.since, until: $json.until }) }}" },
        { name: "time_increment", value: "1" },
        { name: "limit", value: "500" },
        { name: "access_token", value: "={{ $env.META_ADS_ACCESS_TOKEN }}" },
      ] },
      options: {},
    }, { retryOnFail: true, maxTries: 3, waitBetweenTries: 1500 }),
    node("tag-smoke", "Marcar Smoke Dry Run", "n8n-nodes-base.code", 2, [-3600, -160], { jsCode: tagSmokeCode }),
    node("pagination", "Tratar Paginacao", "n8n-nodes-base.code", 2, [-3480, 360], { jsCode: paginationCode }),
    node("enrichment", "Enriquecer Criativos e Destinos", "n8n-nodes-base.code", 2, [-3340, 360], { jsCode: enrichmentCode }),
    node("transform", "Normalizar para Supabase", "n8n-nodes-base.code", 2, [-3200, 360], { jsCode: transformCode }),
    node("valid", "Registro valido?", "n8n-nodes-base.if", 2.2, [-2920, 360], {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [
          {
            id: "valid_campaign",
            leftValue: "={{ $json.campanha }}",
            rightValue: "",
            operator: { type: "string", operation: "notEmpty", singleValue: true },
          },
          {
            id: "valid_ad",
            leftValue: "={{ $json.anuncio }}",
            rightValue: "",
            operator: { type: "string", operation: "notEmpty", singleValue: true },
          },
          {
            id: "valid_spend",
            leftValue: "={{ $json.valor_gasto }}",
            rightValue: 0,
            operator: { type: "number", operation: "gt" },
          },
        ],
        combinator: "and",
      },
      options: {},
    }),
    node("persist-check", "Persistir coleta?", "n8n-nodes-base.if", 2.2, [-2780, 280], {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          id: "persist_collection",
          leftValue: "={{ $json.raw_payload?._norwyn_mode !== 'smoke_manual' || $json.raw_payload?._norwyn_smoke_persist === true }}",
          rightValue: true,
          operator: { type: "boolean", operation: "equals", singleValue: true },
        }],
        combinator: "and",
      },
      options: {},
    }),
    node("batch", "Montar Lotes Supabase", "n8n-nodes-base.code", 2, [-2640, 280], { jsCode: batchCode }, {
      notes: "Agrupa registros para evitar timeout no Supabase/n8n. Ajuste SUPABASE_UPSERT_BATCH_SIZE se precisar; padrao 50.",
    }),
    node("upsert", "Upsert Supabase Ads", "n8n-nodes-base.httpRequest", 4.2, [-2360, 280], {
      method: "POST",
      url: "={{ $env.SUPABASE_URL.replace(/\\/$/, '') + '/rest/v1/instagram_ads_daily?on_conflict=tenant_id,row_key' }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "apikey", value: "={{ $env.SUPABASE_SERVICE_ROLE_KEY }}" },
          { name: "Authorization", value: "={{ 'Bearer ' + $env.SUPABASE_SERVICE_ROLE_KEY }}" },
          { name: "Content-Type", value: "application/json" },
          { name: "Prefer", value: "resolution=merge-duplicates,return=minimal" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.rows) }}",
      options: {
        timeout: 120000,
      },
    }, {
      retryOnFail: true,
      maxTries: 3,
      waitBetweenTries: 1500,
      notes: "Usa REST upsert em lote para atualizar linhas existentes por tenant_id,row_key. Nao exponha SUPABASE_SERVICE_ROLE_KEY fora do n8n.",
    }),
    node("discarded", "Log Descartados", "n8n-nodes-base.code", 2, [-2640, 520], {
      jsCode: "const count = items.length;\nconsole.log(`[FGA Ads] ${count} registro(s) descartado(s).`);\nreturn [{ json: { discarded_count: count, timestamp: new Date().toISOString() } }];",
    }),
    node("smoke-summary", "Resumo Smoke sem Persistir", "n8n-nodes-base.code", 2, [-2500, 440], {
      jsCode: "console.log(`[FGA Ads smoke] ${items.length} registro(s) normalizados; nenhum upsert executado.`); return items;",
      notes: "Dry-run por padrão. Defina META_ADS_SMOKE_PERSIST=true somente após validar a comparação.",
    }),
  ],
  pinData: {},
  connections: {
    "Executar Backfill 2026": { main: [[{ node: "Calcular Periodo 2026", type: "main", index: 0 }]] },
    "Calcular Periodo 2026": { main: [[{ node: "Meta Ads API - Backfill 2026", type: "main", index: 0 }]] },
    "20h30 Daily": { main: [[{ node: "Calcular Incremental", type: "main", index: 0 }]] },
    "Executar Smoke Manual": { main: [[{ node: "Calcular Smoke 1-2 dias", type: "main", index: 0 }]] },
    "Calcular Smoke 1-2 dias": { main: [[{ node: "Meta Ads API - Smoke", type: "main", index: 0 }]] },
    "Calcular Incremental": { main: [[{ node: "Meta Ads API - Incremental", type: "main", index: 0 }]] },
    "Meta Ads API - Backfill 2026": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
    "Meta Ads API - Incremental": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
    "Meta Ads API - Smoke": { main: [[{ node: "Marcar Smoke Dry Run", type: "main", index: 0 }]] },
    "Marcar Smoke Dry Run": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
    "Tratar Paginacao": { main: [[{ node: "Enriquecer Criativos e Destinos", type: "main", index: 0 }]] },
    "Enriquecer Criativos e Destinos": { main: [[{ node: "Normalizar para Supabase", type: "main", index: 0 }]] },
    "Normalizar para Supabase": { main: [[{ node: "Registro valido?", type: "main", index: 0 }]] },
    "Registro valido?": {
      main: [
        [{ node: "Persistir coleta?", type: "main", index: 0 }],
        [{ node: "Log Descartados", type: "main", index: 0 }],
      ],
    },
    "Persistir coleta?": {
      main: [
        [{ node: "Montar Lotes Supabase", type: "main", index: 0 }],
        [{ node: "Resumo Smoke sem Persistir", type: "main", index: 0 }],
      ],
    },
    "Montar Lotes Supabase": { main: [[{ node: "Upsert Supabase Ads", type: "main", index: 0 }]] },
  },
  active: false,
  settings: {
    executionOrder: "v1",
    timezone: "America/Sao_Paulo",
  },
  meta: {
    templateCredsSetupCompleted: false,
  },
  tags: [],
};

const outputPath = join(process.cwd(), "modules", "ads", "Instagram Ads Daily Collector_V9_Traffic_Foundation.json");
writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(outputPath);
