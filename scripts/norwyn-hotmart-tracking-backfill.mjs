import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const productArg = process.argv.find((item) => item.startsWith("--products="));
const startArg = process.argv.find((item) => item.startsWith("--start="));
const endArg = process.argv.find((item) => item.startsWith("--end="));

function loadEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function clean(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
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
  const raw = clean(value);
  if (!raw) return {};
  const output = {};
  for (const part of raw.split("|")) {
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

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const productIds = (productArg?.split("=")[1] || "8118159,8163835").split(",").map((item) => item.trim()).filter(Boolean);
  const start = startArg?.split("=")[1] || "2026-07-20";
  const end = endArg?.split("=")[1] || "2026-08-05T23:59:59";

  const { data: sales, error } = await supabase
    .from("comercial_vendas")
    .select("id,tenant_id,transaction_id,produto_id,hotmart_product_id,produto_nome,status_normalizado,grupo_comercial,valor_bruto,source_sck,metadata,data_compra,raw_id")
    .in("hotmart_product_id", productIds)
    .gte("data_compra", start)
    .lte("data_compra", end)
    .limit(5000);
  if (error) throw error;

  const rawIds = [...new Set((sales || []).map((sale) => sale.raw_id).filter(Boolean))];
  const rawRows = [];
  for (let index = 0; index < rawIds.length; index += 100) {
    const { data, error: rawError } = await supabase
      .from("comercial_hotmart_raw")
      .select("id,payload")
      .in("id", rawIds.slice(index, index + 100));
    if (rawError) throw rawError;
    rawRows.push(...(data || []));
  }
  const rawById = new Map(rawRows.map((row) => [row.id, row.payload]));
  const candidates = [];
  const confidenceSummary = {};

  for (const sale of sales || []) {
    const tracking = trackingFromPayload(rawById.get(sale.raw_id), sale.source_sck);
    confidenceSummary[tracking.tracking_confidence] = (confidenceSummary[tracking.tracking_confidence] || 0) + 1;
    if (!sale.source_sck && tracking.source_sck && tracking.tracking_confidence !== "UNKNOWN") {
      candidates.push({ sale, tracking });
    }
  }

  let updated = 0;
  if (apply) {
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
              applied_at: new Date().toISOString(),
            },
            tracking: item.tracking,
          },
        })
        .eq("id", item.sale.id)
        .is("source_sck", null);
      if (update.error) throw update.error;
      updated += 1;

      const existingKey = await supabase
        .from("growth_tracking_keys")
        .select("id")
        .eq("tenant_id", item.sale.tenant_id)
        .eq("transaction_id", item.sale.transaction_id)
        .maybeSingle();
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
          metadata: { source: "hotmart_raw_backfill" },
        });
        if (insert.error) throw insert.error;
      }
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry_run",
    products: productIds,
    period: { start, end },
    scanned: sales?.length || 0,
    rawRows: rawRows.length,
    recoverable: candidates.length,
    updated,
    confidenceSummary,
    sample: candidates.slice(0, 12).map((item) => ({
      transaction_id: item.sale.transaction_id,
      status: item.sale.status_normalizado,
      source_sck: item.tracking.source_sck,
      confidence: item.tracking.tracking_confidence,
      source: item.tracking.tracking_source,
    })),
    note: apply ? "Valores existentes nao foram sobrescritos; update usa source_sck IS NULL." : "Nenhum dado foi alterado. Rode com --apply apenas apos revisar o dry-run.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
