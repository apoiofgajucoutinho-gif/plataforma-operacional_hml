const config = $items('Configuracao V9')[0]?.json || {};
const ttlMs = Math.max(Number(config.config_ttl_hours || 24), Number(config.creative_ttl_hours || 168)) * 60 * 60 * 1000;

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

const cacheRows = rowsFrom('Carregar Cache Supabase');
const latest = new Map();
for (const row of cacheRows) {
  const key = `${row.entity_type}:${row.entity_id}`;
  if (!latest.has(key) || Date.parse(row.last_seen_at || '') > Date.parse(latest.get(key).last_seen_at || '')) latest.set(key, row);
}

const bundles = new Map();
for (const row of cacheRows) {
  if (row.entity_type === 'ad' && row.config_json?._norwyn_bundle_v9_cloud === true) bundles.set(String(row.entity_id), row.config_json);
}
const requestDefs = rowsFrom('Preparar Configuracao Meta').filter(row => row.fetch === true);
const responses = rowsFrom('Meta Graph - Configuracao de Anuncios');
requestDefs.forEach((request, index) => {
  const response = responses[index];
  if (response && !response.error) bundles.set(String(request.entity_id), response);
});

const requests = [];
const seen = new Set();
function queue(entityType, entityId, fields, parentIds) {
  const id = String(entityId || '').trim();
  if (!id || seen.has(`${entityType}:${id}`)) return;
  seen.add(`${entityType}:${id}`);
  const snapshot = latest.get(`${entityType}:${id}`);
  const seenAt = Date.parse(snapshot?.last_seen_at || '');
  const fresh = snapshot && Number.isFinite(seenAt) && Date.now() - seenAt < ttlMs;
  if (!fresh) requests.push({ json: { fetch: true, entity_type: entityType, entity_id: id, fields, parent_ids: parentIds || {} } });
}

for (const [adId, bundle] of bundles) {
  const targeting = bundle.adset?.targeting || {};
  for (const ref of [...(targeting.custom_audiences || []), ...(targeting.excluded_custom_audiences || [])]) {
    queue('audience', ref?.id, 'id,name,subtype,customer_file_source,lookalike_spec,retention_days,rule', { adset_id: bundle.adset?.id || null });
  }
  const creative = bundle.creative || {};
  const videoId = creative.object_story_spec?.video_data?.video_id || creative.asset_feed_spec?.videos?.[0]?.video_id || null;
  queue('video', videoId, 'id,title,length,picture,permalink_url', { ad_id: adId, creative_id: creative.id || null });
}

return requests.length ? requests : [{ json: { fetch: false, reason: 'asset_cache_fresh_or_no_assets' } }];
