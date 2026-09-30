const config = $items('Configuracao V9')[0]?.json || {};
const ttlMs = Math.max(1, Number(config.config_ttl_hours || 24)) * 60 * 60 * 1000;

function rowsFrom(nodeName) {
  try {
    return $items(nodeName).flatMap(item => {
      const value = item.json?.body ?? item.json;
      return Array.isArray(value) ? value : [value];
    }).filter(Boolean);
  } catch {
    return [];
  }
}

const latest = new Map();
for (const row of rowsFrom('Carregar Cache Supabase')) {
  const key = `${row.entity_type}:${row.entity_id}`;
  if (!latest.has(key) || Date.parse(row.last_seen_at || '') > Date.parse(latest.get(key).last_seen_at || '')) {
    latest.set(key, row);
  }
}

const adIds = [...new Set(items.map(item => String(item.json.ad_id || '').trim()).filter(Boolean))];
const fields = [
  'id', 'name', 'status', 'effective_status',
  'campaign{id,name,objective,buying_type,status,effective_status,daily_budget,lifetime_budget,spend_cap,start_time,stop_time,bid_strategy,pacing_type}',
  'adset{id,name,campaign_id,status,effective_status,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,attribution_spec,targeting,promoted_object,destination_type,pacing_type}',
  'creative{id,name,body,title,thumbnail_url,image_url,image_hash,object_url,link_url,url_tags,object_story_id,effective_object_story_id,instagram_permalink_url,source_instagram_media_id,object_story_spec,asset_feed_spec}',
].join(',');
const requests = [];

for (const adId of adIds) {
  const snapshot = latest.get(`ad:${adId}`);
  const stored = snapshot?.config_json;
  const seenAt = Date.parse(snapshot?.last_seen_at || '');
  const fresh = stored?._norwyn_bundle_v9_cloud === true && Number.isFinite(seenAt) && Date.now() - seenAt < ttlMs;
  if (!fresh) requests.push({ json: { fetch: true, entity_type: 'ad_bundle', entity_id: adId, fields } });
}

return requests.length ? requests : [{ json: { fetch: false, reason: 'configuration_cache_fresh' } }];
