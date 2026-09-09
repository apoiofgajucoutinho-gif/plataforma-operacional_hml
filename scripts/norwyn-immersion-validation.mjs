import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PRODUCT_IDS = ["8118159", "8163835"];
const START = "2026-07-20";
const END = "2026-08-05T23:59:59";
const REF_DAY = "2026-07-29";
const APPLY = process.argv.includes("--apply");
const OUT_DIR = path.join("output", "norwyn-growth-validation");

function loadEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function clean(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(numerator, denominator) {
  return denominator ? (numerator / denominator) * 100 : null;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

function closeNumber(left, right, tolerance = 0.01) {
  return Math.abs(Number(left || 0) - Number(right || 0)) <= tolerance;
}

function dateKey(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isCompleted(sale) {
  const value = String(sale.status_normalizado || "").toUpperCase();
  return sale.grupo_comercial === "confirmed" || ["APPROVED", "COMPLETE", "COMPLETED"].includes(value);
}

function findNested(value, keys) {
  if (!value || typeof value !== "object") return null;
  for (const key of keys) {
    const direct = clean(value[key]);
    if (direct) return direct;
  }
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") {
      const found = findNested(nested, keys);
      if (found) return found;
    }
  }
  return null;
}

function findNestedWithPath(value, keys, prefix = "") {
  if (!value || typeof value !== "object") return null;
  for (const key of keys) {
    const direct = clean(value[key]);
    if (direct) return { value: direct, path: prefix ? `${prefix}.${key}` : key };
  }
  for (const [key, nested] of Object.entries(value)) {
    if (nested && typeof nested === "object") {
      const found = findNestedWithPath(nested, keys, prefix ? `${prefix}.${key}` : key);
      if (found) return found;
    }
  }
  return null;
}

function parseJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function pairs(value) {
  const output = {};
  for (const part of String(value || "").split("|")) {
    const [key, ...rest] = part.split("=");
    if (key && rest.length) output[key.trim()] = rest.join("=").trim();
  }
  return output;
}

function trackingFromPayload(payload, existingSck) {
  const origin = parseJson(findNested(payload, ["origin"]));
  const xcod = parseJson(clean(origin?.xcod));
  const foundSck = findNestedWithPath(payload, ["source_sck", "sck"]);
  const sourceSck = clean(existingSck) || clean(foundSck?.value) || clean(origin?.sck);
  const parsed = pairs(sourceSck);
  const read = (...keys) => {
    for (const key of keys) if (clean(parsed[key])) return clean(parsed[key]);
    for (const object of [payload, origin, xcod]) {
      const found = findNested(object, keys);
      if (found) return found;
    }
    return null;
  };
  const campaign = read("utm_campaign", "campaign", "campaign_name", "c");
  const content = read("utm_content", "content", "creative", "creative_name", "co");
  const campaignId = read("campaign_id", "utm_id");
  const adId = read("ad_id", "vid");
  const confidence = campaign && (campaignId || content || adId) ? "HIGH" : campaign ? "MEDIUM" : sourceSck ? "LOW" : "UNKNOWN";
  return {
    source_sck: sourceSck,
    utm_source: read("utm_source", "source", "src", "s"),
    utm_medium: read("utm_medium", "medium", "m"),
    utm_campaign: campaign,
    utm_content: content,
    utm_term: read("utm_term", "term", "placement", "t"),
    campaign_id: campaignId,
    adset_id: read("adset_id", "ad_set_id"),
    ad_id: adId,
    fbclid: read("fbclid"),
    gclid: read("gclid"),
    click_id: read("click_id", "clickid"),
    landing_url: read("landing_url", "url"),
    checkout_url: read("checkout_url", "checkout"),
    tracking_source: clean(existingSck) ? "comercial_vendas.source_sck" : foundSck?.path || (clean(origin?.sck) ? "raw_payload.data.purchase.origin.sck" : "raw_payload"),
    tracking_confidence: confidence,
  };
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchAdRow(tracking, ads) {
  if (!tracking.utm_campaign) return null;
  const rows = ads.filter((row) => normalize(row.campanha) === normalize(tracking.utm_campaign));
  if (!rows.length) return null;
  if (tracking.utm_content) {
    const content = normalize(tracking.utm_content);
    const byAd = rows.find((row) => {
      const ad = normalize(row.anuncio);
      return content.length > 2 && ad.length > 2 && (content.includes(ad) || ad.includes(content));
    });
    if (byAd) return byAd;
  }
  return rows[0];
}

function aggregateAds(rows) {
  return rows.reduce((acc, row) => {
    acc.spend += money(row.valor_gasto);
    acc.impressions += money(row.impressoes);
    acc.clicks += money(row.cliques);
    acc.reach += money(row.alcance);
    acc.leads += money(row.leads);
    const frequency = money(row.frequencia);
    if (frequency) acc.frequencyValues.push(frequency);
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, frequencyValues: [] });
}

function buildAttribution(items, ads) {
  return items.map((item) => {
    const ad = matchAdRow(item.tracking, ads);
    const confirmed = isCompleted(item.sale);
    const confidence = !confirmed ? "UNKNOWN" : ad && item.tracking.tracking_confidence === "HIGH" ? "HIGH" : item.tracking.utm_campaign ? "MEDIUM" : item.tracking.source_sck ? "LOW" : "UNKNOWN";
    return {
      transaction_id: item.sale.transaction_id,
      date: dateKey(item.sale.data_aprovacao || item.sale.data_compra),
      revenue: confirmed ? money(item.sale.valor_bruto) : 0,
      status: item.sale.status_normalizado,
      completed: confirmed,
      campaign: item.tracking.utm_campaign,
      adset: item.tracking.utm_medium,
      ad: ad?.anuncio || null,
      creative: item.tracking.utm_content,
      placement: item.tracking.utm_term,
      confidence,
      source_sck: item.tracking.source_sck,
    };
  });
}

function sumSales(rows) {
  const completed = rows.filter((item) => isCompleted(item.sale));
  return {
    total: rows.length,
    completed: completed.length,
    revenue: completed.reduce((sum, item) => sum + money(item.sale.valor_bruto), 0),
    sourceFilled: rows.filter((item) => clean(item.sale.source_sck)).length,
    completedSourceFilled: completed.filter((item) => clean(item.sale.source_sck)).length,
  };
}

function aggregateCampaigns(ads, attribution) {
  const map = new Map();
  for (const row of ads) {
    const key = row.campanha || "Campanha sem nome";
    const item = map.get(key) || { campaign: key, spend: 0, impressions: 0, clicks: 0, ctr: null, cpc: null, cpm: null, frequencyValues: [], attributedSales: 0, attributedRevenue: 0, cpa: null, roas: null, confidence: "UNKNOWN" };
    item.spend += money(row.valor_gasto);
    item.impressions += money(row.impressoes);
    item.clicks += money(row.cliques);
    const frequency = money(row.frequencia);
    if (frequency) item.frequencyValues.push(frequency);
    map.set(key, item);
  }
  for (const match of attribution.filter((item) => ["HIGH", "MEDIUM"].includes(item.confidence))) {
    const item = map.get(match.campaign) || { campaign: match.campaign || "Campanha nao carregada", spend: 0, impressions: 0, clicks: 0, ctr: null, cpc: null, cpm: null, frequencyValues: [], attributedSales: 0, attributedRevenue: 0, cpa: null, roas: null, confidence: "UNKNOWN" };
    item.attributedSales += 1;
    item.attributedRevenue += match.revenue;
    item.confidence = item.confidence === "HIGH" || match.confidence === "HIGH" ? "HIGH" : "MEDIUM";
    map.set(item.campaign, item);
  }
  return [...map.values()].map((item) => ({
    ...item,
    ctr: pct(item.clicks, item.impressions),
    cpc: ratio(item.spend, item.clicks),
    cpm: item.impressions ? (item.spend / item.impressions) * 1000 : null,
    frequency: item.frequencyValues.length ? item.frequencyValues.reduce((a, b) => a + b, 0) / item.frequencyValues.length : null,
    cpa: ratio(item.spend, item.attributedSales),
    roas: ratio(item.attributedRevenue, item.spend),
  })).sort((a, b) => b.attributedRevenue - a.attributedRevenue || b.spend - a.spend);
}

function aggregateCreatives(ads, attribution) {
  const map = new Map();
  for (const row of ads) {
    const key = `${row.campanha || ""}|${row.anuncio || ""}`;
    const item = map.get(key) || { campaign: row.campanha, creative: row.anuncio, spend: 0, impressions: 0, clicks: 0, frequencyValues: [], attributedSales: 0, attributedRevenue: 0, confidence: "UNKNOWN" };
    item.spend += money(row.valor_gasto);
    item.impressions += money(row.impressoes);
    item.clicks += money(row.cliques);
    const frequency = money(row.frequencia);
    if (frequency) item.frequencyValues.push(frequency);
    map.set(key, item);
  }
  for (const match of attribution.filter((item) => item.confidence === "HIGH" && item.ad)) {
    const key = `${match.campaign || ""}|${match.ad || ""}`;
    const item = map.get(key);
    if (!item) continue;
    item.attributedSales += 1;
    item.attributedRevenue += match.revenue;
    item.confidence = "HIGH";
  }
  return [...map.values()].map((item) => ({
    ...item,
    ctr: pct(item.clicks, item.impressions),
    cpc: ratio(item.spend, item.clicks),
    cpm: item.impressions ? (item.spend / item.impressions) * 1000 : null,
    frequency: item.frequencyValues.length ? item.frequencyValues.reduce((a, b) => a + b, 0) / item.frequencyValues.length : null,
    cpa: ratio(item.spend, item.attributedSales),
    roas: ratio(item.attributedRevenue, item.spend),
  })).sort((a, b) => b.attributedRevenue - a.attributedRevenue || b.spend - a.spend);
}

function aggregateDaily(ads, attribution) {
  const map = new Map();
  const ensure = (date) => {
    const item = map.get(date) || { date, spend: 0, impressions: 0, clicks: 0, sales: 0, revenue: 0, cpa: null, roas: null };
    map.set(date, item);
    return item;
  };
  for (const row of ads) {
    const date = dateKey(row.data_referencia);
    if (!date) continue;
    const item = ensure(date);
    item.spend += money(row.valor_gasto);
    item.impressions += money(row.impressoes);
    item.clicks += money(row.cliques);
  }
  for (const match of attribution.filter((item) => item.completed)) {
    const item = ensure(match.date);
    item.sales += 1;
    item.revenue += match.revenue;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
    ...item,
    cpa: ratio(item.spend, item.sales),
    roas: ratio(item.revenue, item.spend),
  }));
}

async function checkMigrations(supabase) {
  const checks = {};
  checks["0060"] = {
    campaignsGrowthColumns: !(await supabase.from("campaigns").select("id,funnel_type,growth_config").limit(1)).error,
    growthKnowledgeBase: !(await supabase.from("growth_knowledge_base").select("id").limit(1)).error,
    growthDiagnosticRules: !(await supabase.from("growth_diagnostic_rules").select("id").limit(1)).error,
    growthExperiments: !(await supabase.from("growth_experiments").select("id").limit(1)).error,
    growthAiModelPolicies: !(await supabase.from("growth_ai_model_policies").select("id").limit(1)).error,
  };
  checks["0061"] = {
    growthTrackingKeys: !(await supabase.from("growth_tracking_keys").select("id,campaign_key,product_key,campaign_platform_id").limit(1)).error,
  };
  checks["0062"] = {
    growthTrackingKeysHardened: !(await supabase.from("growth_tracking_keys").select("id,transaction_id,source_sck,utm_campaign,tracking_confidence").limit(1)).error,
    growthTrackingBackfillRuns: !(await supabase.from("growth_tracking_backfill_runs").select("id,mode,scanned_count").limit(1)).error,
  };
  return checks;
}

function migrationStatus(checks) {
  return Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, Object.values(value).every(Boolean) ? "applied" : "missing_or_partial"]));
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing.");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const migrations = await checkMigrations(supabase);
  const migrationSummary = migrationStatus(migrations);
  if (Object.values(migrationSummary).some((value) => value !== "applied")) {
    console.log(JSON.stringify({ migrations, migrationSummary, blocked: "Apply missing migrations before backfill." }, null, 2));
    process.exit(2);
  }

  const salesResult = await supabase
    .from("comercial_vendas")
    .select("id,tenant_id,transaction_id,produto_id,hotmart_product_id,produto_nome,status,status_original,status_normalizado,grupo_comercial,valor_bruto,data_compra,data_aprovacao,source_sck,metadata,raw_id")
    .in("hotmart_product_id", PRODUCT_IDS)
    .gte("data_compra", START)
    .lte("data_compra", END)
    .limit(5000);
  if (salesResult.error) throw salesResult.error;
  const sales = salesResult.data || [];
  const rawIds = [...new Set(sales.map((sale) => sale.raw_id).filter(Boolean))];
  const rawRows = [];
  for (let index = 0; index < rawIds.length; index += 100) {
    const rawResult = await supabase.from("comercial_hotmart_raw").select("id,transaction_id,payload").in("id", rawIds.slice(index, index + 100));
    if (rawResult.error) throw rawResult.error;
    rawRows.push(...(rawResult.data || []));
  }
  const rawById = new Map(rawRows.map((row) => [row.id, row.payload]));
  const items = sales.map((sale) => ({ sale, raw: rawById.get(sale.raw_id), tracking: trackingFromPayload(rawById.get(sale.raw_id), sale.source_sck) }));
  const before = sumSales(items);
  const candidates = items.filter((item) => !clean(item.sale.source_sck) && item.tracking.source_sck && item.tracking.tracking_confidence !== "UNKNOWN");
  const confidenceSummary = items.reduce((acc, item) => {
    acc[item.tracking.tracking_confidence] = (acc[item.tracking.tracking_confidence] || 0) + 1;
    return acc;
  }, {});
  const sample = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"].flatMap((confidence) => items.filter((item) => item.tracking.tracking_confidence === confidence).slice(0, confidence === "HIGH" ? 12 : 4)).slice(0, 24);

  const snapshot = candidates.map((item) => ({
    transaction_id: item.sale.transaction_id,
    hotmart_product_id: item.sale.hotmart_product_id,
    produto_nome: item.sale.produto_nome,
    status: item.sale.status_normalizado,
    data: item.sale.data_aprovacao || item.sale.data_compra,
    receita: item.sale.valor_bruto,
    source_sck_atual: item.sale.source_sck,
    raw_payload: item.raw,
    recovered_source_sck: item.tracking.source_sck,
    recovered_source: item.tracking.tracking_source,
    recovered_confidence: item.tracking.tracking_confidence,
  }));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(OUT_DIR, `snapshot-imersao-${timestamp}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  const manualSamplePath = path.join(OUT_DIR, `sample-imersao-${timestamp}.json`);
  fs.writeFileSync(manualSamplePath, JSON.stringify(sample.map((item) => ({
    transaction_id: item.sale.transaction_id,
    status: item.sale.status_normalizado,
    data: item.sale.data_aprovacao || item.sale.data_compra,
    raw_origin_sck: parseJson(findNested(item.raw, ["origin"]))?.sck || null,
    raw_tracking_source_sck: findNested(item.raw, ["source_sck"]),
    recovered_source_sck: item.tracking.source_sck,
    recovered_source: item.tracking.tracking_source,
    confidence: item.tracking.tracking_confidence,
    campaign: item.tracking.utm_campaign,
    creative: item.tracking.utm_content,
    placement: item.tracking.utm_term,
  })), null, 2));

  let applied = { updated: 0, logInserted: false };
  if (APPLY) {
    for (const item of candidates) {
      const metadata = item.sale.metadata && typeof item.sale.metadata === "object" ? item.sale.metadata : {};
      const update = await supabase
        .from("comercial_vendas")
        .update({
          source_sck: item.tracking.source_sck,
          metadata: {
            ...metadata,
            tracking_backfill: {
              source: item.tracking.tracking_source,
              confidence: item.tracking.tracking_confidence,
              rule: "raw_payload_sck_without_overwrite_v1",
              applied_at: new Date().toISOString(),
            },
            tracking: item.tracking,
          },
        }, { count: "exact" })
        .eq("id", item.sale.id)
        .is("source_sck", null);
      if (update.error) throw update.error;
      applied.updated += update.count || 0;
      const existingKey = await supabase.from("growth_tracking_keys").select("id").eq("tenant_id", item.sale.tenant_id).eq("transaction_id", item.sale.transaction_id).maybeSingle();
      if (!existingKey.data) {
        const insert = await supabase.from("growth_tracking_keys").insert({
          tenant_id: item.sale.tenant_id,
          transaction_id: item.sale.transaction_id,
          product_key: item.sale.hotmart_product_id,
          source_sck: item.tracking.source_sck,
          utm_source: item.tracking.utm_source,
          utm_medium: item.tracking.utm_medium,
          utm_campaign: item.tracking.utm_campaign,
          utm_content: item.tracking.utm_content,
          utm_term: item.tracking.utm_term,
          campaign_key: item.tracking.utm_campaign,
          content: item.tracking.utm_content,
          term: item.tracking.utm_term,
          campaign_platform_id: item.tracking.campaign_id,
          adset_id: item.tracking.adset_id,
          ad_id: item.tracking.ad_id,
          fbclid: item.tracking.fbclid,
          gclid: item.tracking.gclid,
          click_id: item.tracking.click_id,
          landing_url: item.tracking.landing_url,
          checkout_url: item.tracking.checkout_url,
          tracking_source: item.tracking.tracking_source,
          tracking_confidence: item.tracking.tracking_confidence,
          metadata: { source: "hotmart_raw_backfill", rule: "raw_payload_sck_without_overwrite_v1" },
        });
        if (insert.error) throw insert.error;
      }
    }
    const tenantId = items[0]?.sale.tenant_id;
    if (tenantId) {
      const log = await supabase.from("growth_tracking_backfill_runs").insert({
        tenant_id: tenantId,
        mode: "apply",
        scanned_count: items.length,
        recoverable_count: candidates.length,
        updated_count: applied.updated,
        skipped_count: items.length - applied.updated,
        confidence_summary: confidenceSummary,
        field_summary: { source: "raw_payload.data.purchase.origin.sck", products: PRODUCT_IDS, start: START, end: END },
        notes: "Backfill controlado Imersao Tecnica de Mascaramento. Sem sobrescrever source_sck existente.",
        metadata: { snapshot_path: snapshotPath, sample_path: manualSamplePath, rule: "raw_payload_sck_without_overwrite_v1" },
      });
      if (log.error) throw log.error;
      applied.logInserted = true;
    }
  }

  const afterSalesResult = await supabase
    .from("comercial_vendas")
    .select("id,tenant_id,transaction_id,produto_id,hotmart_product_id,produto_nome,status,status_original,status_normalizado,grupo_comercial,valor_bruto,data_compra,data_aprovacao,source_sck,metadata,raw_id")
    .in("hotmart_product_id", PRODUCT_IDS)
    .gte("data_compra", START)
    .lte("data_compra", END)
    .limit(5000);
  if (afterSalesResult.error) throw afterSalesResult.error;
  const afterItems = (afterSalesResult.data || []).map((sale) => ({ sale, raw: rawById.get(sale.raw_id), tracking: trackingFromPayload(rawById.get(sale.raw_id), sale.source_sck) }));
  const after = sumSales(afterItems);

  const adsResult = await supabase
    .from("instagram_ads_daily")
    .select("id,data_referencia,campanha,conjunto,anuncio,status,alcance,impressoes,cliques,ctr,cpc,cpm,frequencia,valor_gasto,conversoes,leads,performance_status,performance_score")
    .gte("data_referencia", START)
    .lte("data_referencia", END.slice(0, 10))
    .ilike("campanha", "%LP_MRC_0726%")
    .limit(5000);
  if (adsResult.error) throw adsResult.error;
  const ads = adsResult.data || [];
  const adsAgg = aggregateAds(ads);
  const attribution = buildAttribution(afterItems, ads);
  const attributed = attribution.filter((item) => ["HIGH", "MEDIUM"].includes(item.confidence) && item.completed);
  const attributionConfidence = attribution.filter((item) => item.completed).reduce((acc, item) => {
    acc[item.confidence] = (acc[item.confidence] || 0) + 1;
    return acc;
  }, {});
  const attributedRevenue = attributed.reduce((sum, item) => sum + item.revenue, 0);
  const campaigns = aggregateCampaigns(ads, attribution);
  const creatives = aggregateCreatives(ads, attribution);
  const daily = aggregateDaily(ads, attribution);
  const day29Ads = ads.filter((row) => dateKey(row.data_referencia) === REF_DAY);
  const day29Attribution = attribution.filter((item) => item.date === REF_DAY);
  const day29AdsAgg = aggregateAds(day29Ads);
  const day29Completed = day29Attribution.filter((item) => item.completed);
  const day29Attributed = day29Completed.filter((item) => ["HIGH", "MEDIUM"].includes(item.confidence));

  const report = {
    mode: APPLY ? "apply" : "dry_run",
    generatedAt: new Date().toISOString(),
    migrations,
    migrationSummary,
    artifacts: { snapshotPath, manualSamplePath },
    dryRun: {
      found: before.total,
      completed: before.completed,
      sourceSckAlreadyFilled: before.sourceFilled,
      completedSourceSckAlreadyFilled: before.completedSourceFilled,
      recoverable: candidates.length,
      wouldUpdate: candidates.length,
      wouldRemainIntact: before.total - candidates.length,
      confidenceSummary,
    },
    apply: applied,
    integrity: {
      before,
      after,
      unchangedTotals: before.total === after.total && before.completed === after.completed && closeNumber(before.revenue, after.revenue),
      sourceCoverageBefore: pct(before.completedSourceFilled, before.completed),
      sourceCoverageAfter: pct(after.completedSourceFilled, after.completed),
    },
    result: {
      period: { start: START, end: END.slice(0, 10) },
      spend: adsAgg.spend,
      impressions: adsAgg.impressions,
      clicks: adsAgg.clicks,
      revenue: after.revenue,
      sales: after.completed,
      observedRoas: ratio(after.revenue, adsAgg.spend),
      attributedRevenue,
      unattributedRevenue: after.revenue - attributedRevenue,
      attributableRoas: ratio(attributedRevenue, adsAgg.spend),
      cpaCac: ratio(adsAgg.spend, attributed.length),
      attributionCoverage: pct(attributed.length, after.completed),
      attributionConfidence,
    },
    daily,
    campaigns,
    creatives: {
      canRankReliably: pct(attributed.length, after.completed) !== null && pct(attributed.length, after.completed) >= 60 && creatives.some((item) => item.attributedSales > 0),
      rows: creatives,
    },
    day29: {
      spend: day29AdsAgg.spend,
      impressions: day29AdsAgg.impressions,
      clicks: day29AdsAgg.clicks,
      sales: day29Completed.length,
      revenue: day29Completed.reduce((sum, item) => sum + item.revenue, 0),
      attributedSales: day29Attributed.length,
      attributedRevenue: day29Attributed.reduce((sum, item) => sum + item.revenue, 0),
      coverage: pct(day29Attributed.length, day29Completed.length),
      campaigns: aggregateCampaigns(day29Ads, day29Attribution).slice(0, 20),
      creatives: aggregateCreatives(day29Ads, day29Attribution).slice(0, 20),
    },
    strategist: {
      executiveSummary: `No periodo ${START} a ${END.slice(0, 10)}, a Norwyn observou ${after.completed} vendas concluídas, R$ ${after.revenue.toFixed(2)} de receita Hotmart e R$ ${adsAgg.spend.toFixed(2)} de gasto Meta no recorte LP_MRC_0726.`,
      facts: [
        `${after.completed} vendas COMPLETED/confirmadas.`,
        `Receita observada: R$ ${after.revenue.toFixed(2)}.`,
        `Gasto Meta observado: R$ ${adsAgg.spend.toFixed(2)}.`,
        `Tracking coverage apos backfill: ${pct(after.completedSourceFilled, after.completed)?.toFixed(1)}%.`,
        `Receita atribuivel por tracking: R$ ${attributedRevenue.toFixed(2)}.`,
      ],
      working: [
        "O raw_payload da Hotmart preserva source_sck em data.purchase.origin.sck para a maioria das vendas.",
        "Campanhas LP_MRC_0726 podem ser relacionadas a vendas por c/utm_campaign.",
      ],
      concerns: [
        "Eventos intermediarios de landing, checkout e VSL ainda nao estao normalizados.",
        "Parte dos criativos nao recebe match HIGH por nome/ID de anuncio normalizado.",
      ],
      probableBottleneck: "Nao ha dados suficientes de landing/checkout/VSL para localizar o gargalo completo; o gargalo anterior era tracking normalizado.",
      hypotheses: [
        "A principal lacuna operacional era ingestao incompleta do sck, nao ausencia de tracking na Hotmart.",
        "Com ad_id/adset_id normalizados, o ranking de criativos ficaria mais confiavel.",
      ],
      recommendations: [
        "Usar o backfill controlado para esse recorte antes de qualquer leitura final de criativos.",
        "Validar preservacao de sck nos links de novas campanhas.",
        "Adicionar captura de eventos landing/checkout/VSL no proximo ciclo.",
      ],
      doNotChangeYet: [
        "Nao alterar orçamento por criativo usando apenas proximidade textual.",
        "Nao tentar ajustar dados para bater com relatório externo.",
        "Nao extrapolar regra para outros produtos sem dry-run próprio.",
      ],
      experiments: [
        { hypothesis: "Normalizar ad_id/adset_id aumenta confiança de atribuição criativa.", change: "Adicionar IDs Meta nos links e ingestao.", primaryMetric: "percentual HIGH por criativo", safetyMetric: "source_sck preservado", minimum: "1 campanha nova completa", expectedDecision: "manter padrao se cobertura HIGH subir" },
        { hypothesis: "Landing preserva tracking ate checkout.", change: "Teste controlado de URL Norwyn sem compra.", primaryMetric: "sck presente no checkout/webhook", safetyMetric: "URL final sem perda de UTMs", minimum: "3 URLs de teste", expectedDecision: "corrigir redirect se algum parametro cair" },
      ],
      nextThreeActions: [
        "Aplicar/validar backfill controlado no recorte da Imersao.",
        "Revisar campanhas/criativos com receita atribuida e marcar lacunas de ID.",
        "Testar URL Norwyn na landing/checkout antes da proxima campanha.",
      ],
      confidence: attributed.length && pct(after.completedSourceFilled, after.completed) > 80 ? "Alta para leitura campanha/produto; media para criativo individual." : "Media/baixa por lacunas de tracking/eventos.",
    },
    norwynVsNbf: {
      reproduced: ["gasto Meta", "receita Hotmart", "vendas/ingressos", "ROAS observado", "evolucao diaria", "campanhas"],
      partiallyReproduced: ["criativos/anuncios quando ha match por nome/conteudo", "ROAS atribuivel"],
      notYetCalculated: ["landing views", "checkout iniciado", "VSL play/CTA", "order bump/upsell detalhado"],
      note: "Numeros externos nao alimentaram os calculos. Diferencas devem ser investigadas por janela, status, produto relacionado, impostos/taxas e filtro de campanha.",
    },
    trackingFuture: {
      testUrl: (() => {
        const url = new URL("https://lp.fgajulianacoutinho.com.br/jul26-mrc-v1/");
        const sck = "s=meta|c=lp_mrc_0726_teste_norwyn|m=paid_social|co=creative_test|t=audience_test|utm_id=TEST_CAMPAIGN|adset_id=TEST_ADSET|ad_id=TEST_AD";
        url.searchParams.set("utm_source", "meta");
        url.searchParams.set("utm_medium", "paid_social");
        url.searchParams.set("utm_campaign", "lp_mrc_0726_teste_norwyn");
        url.searchParams.set("utm_content", "creative_test");
        url.searchParams.set("utm_term", "audience_test");
        url.searchParams.set("sck", sck);
        url.searchParams.set("source_sck", sck);
        return url.toString();
      })(),
      checkedUntil: "URL gerada e parseavel localmente. Nao abri checkout/producao e nao fiz compra real.",
    },
  };

  const reportPath = path.join(OUT_DIR, `report-imersao-${APPLY ? "after-apply" : "dry-run"}-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath, ...report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
