import { writeFileSync } from "node:fs";
import { join } from "node:path";

const metaUrl =
  "={{ 'https://graph.facebook.com/v23.0/' + (($env.META_AD_ACCOUNT_ID || 'act_3360327820914673').startsWith('act_') ? ($env.META_AD_ACCOUNT_ID || 'act_3360327820914673') : 'act_' + $env.META_AD_ACCOUNT_ID) + '/insights' }}";

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

const paginationCode = `let allData = [];
const maxPages = Number($env.META_ADS_MAX_PAGES || 100);

for (const item of items) {
  const response = item.json;
  let batchData = Array.isArray(response.data) ? [...response.data] : [];
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
    batchData = batchData.concat(Array.isArray(pageData.data) ? pageData.data : []);
    nextUrl = pageData.paging?.next || null;
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  allData = allData.concat(batchData);
  console.log(\`[FGA Ads] Lote coletado: \${batchData.length} registros em \${pageCount} pagina(s).\`);
}

console.log(\`[FGA Ads] Total coletado: \${allData.length} registros.\`);
return allData.map(row => ({ json: row }));`;

const transformCode = `function actionValue(actions, types) {
  if (!Array.isArray(actions)) return 0;
  return actions
    .filter(action => types.has(String(action.action_type || '').toLowerCase()))
    .reduce((sum, action) => sum + Number(action.value || 0), 0);
}

const leadTypes = new Set([
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'omni_lead',
]);
const conversionTypes = new Set([
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.purchase',
  'complete_registration',
]);

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
  const leads = actionValue(d.actions, leadTypes);
  const conversoes = actionValue(d.actions, conversionTypes);

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
      performance_status,
      performance_score: Math.round(performance_score * 100) / 100,
      origem: 'n8n_meta_ads',
      row_key: rowKey,
      raw_payload: d,
      imported_at: new Date().toISOString()
    }
  };
});`;

const batchCode = `const batchSize = Number($env.SUPABASE_UPSERT_BATCH_SIZE || 50);
const batches = [];

for (let index = 0; index < items.length; index += batchSize) {
  batches.push({
    json: {
      rows: items.slice(index, index + batchSize).map(item => item.json),
      batch_start: index + 1,
      batch_end: Math.min(index + batchSize, items.length),
      batch_size: Math.min(batchSize, items.length - index),
      total_items: items.length,
    }
  });
}

console.log(\`[FGA Ads] Preparados \${batches.length} lote(s) para upsert. Total: \${items.length} registro(s).\`);
return batches;`;

const workflow = {
  name: "Instagram Ads Daily Collector_V8_Supabase_2026",
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
    }),
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
    }),
    node("pagination", "Tratar Paginacao", "n8n-nodes-base.code", 2, [-3480, 360], { jsCode: paginationCode }),
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
      notes: "Usa REST upsert em lote para atualizar linhas existentes por tenant_id,row_key. Nao exponha SUPABASE_SERVICE_ROLE_KEY fora do n8n.",
    }),
    node("discarded", "Log Descartados", "n8n-nodes-base.code", 2, [-2640, 520], {
      jsCode: "const count = items.length;\nconsole.log(`[FGA Ads] ${count} registro(s) descartado(s).`);\nreturn [{ json: { discarded_count: count, timestamp: new Date().toISOString() } }];",
    }),
  ],
  pinData: {},
  connections: {
    "Executar Backfill 2026": { main: [[{ node: "Calcular Periodo 2026", type: "main", index: 0 }]] },
    "Calcular Periodo 2026": { main: [[{ node: "Meta Ads API - Backfill 2026", type: "main", index: 0 }]] },
    "20h30 Daily": { main: [[{ node: "Calcular Incremental", type: "main", index: 0 }]] },
    "Calcular Incremental": { main: [[{ node: "Meta Ads API - Incremental", type: "main", index: 0 }]] },
    "Meta Ads API - Backfill 2026": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
    "Meta Ads API - Incremental": { main: [[{ node: "Tratar Paginacao", type: "main", index: 0 }]] },
    "Tratar Paginacao": { main: [[{ node: "Normalizar para Supabase", type: "main", index: 0 }]] },
    "Normalizar para Supabase": { main: [[{ node: "Registro valido?", type: "main", index: 0 }]] },
    "Registro valido?": {
      main: [
        [{ node: "Montar Lotes Supabase", type: "main", index: 0 }],
        [{ node: "Log Descartados", type: "main", index: 0 }],
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

const outputPath = join(process.cwd(), "modules", "ads", "Instagram Ads Daily Collector_V8_Supabase_2026.json");
writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(outputPath);
