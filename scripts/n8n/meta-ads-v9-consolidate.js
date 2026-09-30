const config = $items('Configuracao V9')[0]?.json || {};
const tenantId = String(config.tenant_id || '').trim();
if (!tenantId || tenantId.startsWith('CONFIGURE_')) throw new Error('Preencha tenant_id no node Configuracao V9.');

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

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
}

function configHash(value) {
  const input = JSON.stringify(stable(value));
  let result = 2166136261;
  for (let index = 0; index < input.length; index++) { result ^= input.charCodeAt(index); result = Math.imul(result, 16777619); }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, '0')}`;
}

function firstText(values) {
  const entry = Array.isArray(values) ? values.find(value => typeof value?.text === 'string' && value.text.trim()) : null;
  return entry?.text?.trim() || null;
}

function firstUrl(creative) {
  const spec = creative?.object_story_spec || {};
  const candidates = [spec.link_data?.link, spec.video_data?.call_to_action?.value?.link, creative?.link_url, creative?.object_url];
  for (const entry of creative?.asset_feed_spec?.link_urls || []) candidates.push(entry?.website_url, entry?.deeplink_url);
  return candidates.find(value => typeof value === 'string' && /^https?:\/\//i.test(value)) || null;
}

function creativeDetails(creative, video) {
  const spec = creative?.object_story_spec || {};
  const link = spec.link_data || {};
  const videoData = spec.video_data || {};
  const feed = creative?.asset_feed_spec || {};
  const children = Array.isArray(link.child_attachments) ? link.child_attachments : [];
  const videoId = videoData.video_id || feed.videos?.[0]?.video_id || null;
  const imageUrl = creative?.image_url || videoData.image_url || link.picture || feed.images?.[0]?.url || null;
  let format = 'outro';
  if (children.length > 1 || (feed.images?.length || 0) + (feed.videos?.length || 0) > 1) format = 'carrossel';
  else if (videoId) format = 'video';
  else if (imageUrl || creative?.image_hash || link.image_hash) format = 'imagem';
  return {
    format,
    body: videoData.message || link.message || creative?.body || firstText(feed.bodies) || null,
    headline: videoData.title || link.name || creative?.title || firstText(feed.titles) || null,
    description: videoData.link_description || link.description || firstText(feed.descriptions) || null,
    cta: videoData.call_to_action?.type || link.call_to_action?.type || feed.call_to_action_types?.[0] || null,
    image_url: imageUrl,
    video_id: videoId,
    video_duration_seconds: Number.isFinite(Number(video?.length)) ? Number(video.length) : null,
    object_story_id: creative?.object_story_id || creative?.effective_object_story_id || null,
    instagram_permalink_url: creative?.instagram_permalink_url || video?.permalink_url || null,
    asset_ids: {
      image_hashes: [creative?.image_hash, link.image_hash, ...(feed.images || []).map(entry => entry?.hash)].filter(Boolean),
      video_ids: [videoId, ...(feed.videos || []).map(entry => entry?.video_id)].filter(Boolean),
      child_attachment_ids: children.map(entry => entry?.image_hash || entry?.video_id).filter(Boolean),
    },
  };
}

function targetingSignals(targeting, audienceDetails) {
  const categories = new Set();
  const evidence = [];
  const names = [];
  for (const audience of audienceDetails) {
    const raw = JSON.stringify({ subtype: audience?.subtype, customer_file_source: audience?.customer_file_source, lookalike_spec: audience?.lookalike_spec, rule: audience?.rule }).toLowerCase();
    if (audience?.name) names.push(String(audience.name));
    if (audience?.lookalike_spec || String(audience?.subtype || '').toUpperCase().includes('LOOKALIKE')) { categories.add('Lookalike'); evidence.push('custom_audience.lookalike_spec/subtype'); }
    else if ((raw.includes('instagram') || raw.includes('ig_business')) && raw.includes('engag')) { categories.add('Engajamento Instagram'); evidence.push('custom_audience.rule:instagram_engagement'); }
    else if (raw.includes('url') || raw.includes('website')) { categories.add('Visitantes do site'); evidence.push('custom_audience.rule:website'); }
    else if (raw.includes('pixel') || raw.includes('offsite')) { categories.add('Pixel / site'); evidence.push('custom_audience.rule:pixel'); }
    else if (raw.includes('engagement') || raw.includes('remarket')) { categories.add('Remarketing'); evidence.push('custom_audience.subtype/rule:engagement'); }
    else if (audience?.subtype || audience?.customer_file_source) { categories.add('Lista / custom audience'); evidence.push('custom_audience.subtype/customer_file_source'); }
  }
  const interests = [...(targeting?.interests || []), ...((targeting?.flexible_spec || []).flatMap(group => group?.interests || []))];
  const behaviors = [...(targeting?.behaviors || []), ...((targeting?.flexible_spec || []).flatMap(group => group?.behaviors || []))];
  if (interests.length || behaviors.length) { categories.add('Publico por interesse'); evidence.push('targeting.interests/behaviors'); }
  const advantage = Boolean(targeting?.targeting_automation?.advantage_audience === 1 || targeting?.targeting_automation?.advantage_audience === true || targeting?.targeting_relaxation_types || targeting?.advantage_audience);
  const hasCustom = audienceDetails.length > 0 || (targeting?.custom_audiences || []).length > 0;
  if (advantage || (!hasCustom && !interests.length && !behaviors.length && targeting?.geo_locations)) { categories.add('Publico amplo / Advantage'); evidence.push(advantage ? 'targeting.advantage_or_expansion' : 'targeting.only_demographic_geo'); }
  const type = categories.size > 1 ? 'Misto' : categories.size === 1 ? [...categories][0] : 'Nao identificado';
  const summary = [];
  if (targeting?.age_min || targeting?.age_max) summary.push(`idade ${targeting.age_min || '?'}-${targeting.age_max || '?'}`);
  if (targeting?.geo_locations?.countries?.length) summary.push(`paises ${targeting.geo_locations.countries.join(',')}`);
  if (names.length) summary.push(`audiencias ${names.join(', ')}`);
  return { audience_type: type, audience_label: names.length ? `${type}: ${names.join(', ')}` : type, targeting_summary: summary.join(' | ') || null, audience_confidence: categories.size ? (audienceDetails.length || interests.length || advantage ? 'high' : 'medium') : 'unresolved', audience_evidence: [...new Set(evidence)] };
}

const cacheRows = rowsFrom('Carregar Cache Supabase');
const latest = new Map();
for (const row of cacheRows) {
  const key = `${row.entity_type}:${row.entity_id}`;
  if (!latest.has(key) || Date.parse(row.last_seen_at || '') > Date.parse(latest.get(key).last_seen_at || '')) latest.set(key, row);
}

const bundles = new Map();
for (const row of cacheRows) if (row.entity_type === 'ad' && row.config_json?._norwyn_bundle_v9_cloud === true) bundles.set(String(row.entity_id), { payload: row.config_json, source: 'snapshot_cache' });
const baseDefs = rowsFrom('Preparar Configuracao Meta').filter(row => row.fetch === true);
const baseResponses = rowsFrom('Meta Graph - Configuracao de Anuncios');
baseDefs.forEach((request, index) => {
  const response = baseResponses[index];
  if (response && !response.error) bundles.set(String(request.entity_id), { payload: { ...response, _norwyn_bundle_v9_cloud: true }, source: 'meta_graph_api' });
});

const assets = new Map();
for (const row of cacheRows) if (row.entity_type === 'audience' || row.entity_type === 'video') assets.set(`${row.entity_type}:${row.entity_id}`, { payload: row.config_json || {}, source: 'snapshot_cache' });
const assetDefs = rowsFrom('Preparar Assets Meta').filter(row => row.fetch === true);
const assetResponses = rowsFrom('Meta Graph - Assets');
assetDefs.forEach((request, index) => {
  const response = assetResponses[index];
  if (response && !response.error) assets.set(`${request.entity_type}:${request.entity_id}`, { payload: response, source: 'meta_graph_api' });
});

const landings = rowsFrom('Carregar Registry Supabase');
function resolveLanding(destinationUrl, urlTags) {
  let host = null;
  try { host = destinationUrl ? new URL(destinationUrl).hostname.toLowerCase() : null; } catch {}
  for (const landing of landings) {
    let landingHost = null;
    try { landingHost = new URL(landing.url).hostname.toLowerCase(); } catch {}
    if (host && host === landingHost) return { landing_key: landing.landing_key, confidence: 'high', reason: 'destination_domain_exact' };
    if (urlTags && (urlTags.includes(`landing_key=${landing.landing_key}`) || urlTags.includes(`utm_campaign=${landing.campaign_key}`))) return { landing_key: landing.landing_key, confidence: 'high', reason: 'url_tags_exact' };
  }
  return { landing_key: null, confidence: 'unresolved', reason: 'no_explicit_destination_match' };
}

const snapshots = new Map();
function addSnapshot(entityType, payload, parentIds, extra = {}) {
  if (!payload?.id) return null;
  const hash = configHash(payload);
  snapshots.set(`${entityType}:${payload.id}:${hash}`, { tenant_id: tenantId, entity_type: entityType, entity_id: String(payload.id), entity_name: payload.name || payload.title || null, parent_ids: parentIds || {}, config_hash: hash, config_json: payload, source: 'meta_graph_api', graph_version: config.graph_version || 'v23.0', collector_version: 'v9-cloud-credentials', last_seen_at: new Date().toISOString(), ...extra });
  return hash;
}

const output = rowsFrom('Tratar Paginacao').map(source => {
  const row = { ...source };
  const bundleResult = bundles.get(String(row.ad_id || '')) || { payload: {}, source: 'unavailable' };
  const bundle = bundleResult.payload || {};
  const campaign = bundle.campaign || {};
  const adset = bundle.adset || {};
  const creative = bundle.creative || {};
  const targeting = adset.targeting || {};
  const audienceDetails = [...(targeting.custom_audiences || []), ...(targeting.excluded_custom_audiences || [])].map(ref => assets.get(`audience:${ref?.id}`)?.payload).filter(Boolean);
  const initialDetails = creativeDetails(creative, null);
  const videoResult = initialDetails.video_id ? assets.get(`video:${initialDetails.video_id}`) : null;
  const details = creativeDetails(creative, videoResult?.payload || null);
  const audience = targetingSignals(targeting, audienceDetails);
  const destinationUrl = firstUrl(creative);
  const landing = resolveLanding(destinationUrl, creative.url_tags || null);
  const hashes = {};

  if (bundleResult.source === 'meta_graph_api') {
    hashes.campaign = addSnapshot('campaign', campaign, {});
    hashes.adset = addSnapshot('adset', adset, { campaign_id: row.campaign_id || campaign.id || null }, audience);
    hashes.creative = addSnapshot('creative', { ...creative, _norwyn_details: details }, { ad_id: row.ad_id || null });
    hashes.ad = addSnapshot('ad', { ...bundle, _norwyn_bundle_v9_cloud: true }, { campaign_id: row.campaign_id || null, adset_id: row.adset_id || null });
  }
  for (const request of assetDefs) {
    const result = assets.get(`${request.entity_type}:${request.entity_id}`);
    if (result?.source === 'meta_graph_api') addSnapshot(request.entity_type, result.payload, request.parent_ids || {});
  }

  row.effective_status = bundle.effective_status || row.effective_status || null;
  row.creative_id = creative.id || null;
  row.creative_name = creative.name || null;
  row.thumbnail_url = creative.thumbnail_url || creative.image_url || videoResult?.payload?.picture || null;
  row.preview_url = details.instagram_permalink_url;
  row.destination_url = destinationUrl;
  try { row.destination_domain = destinationUrl ? new URL(destinationUrl).hostname.toLowerCase() : null; } catch { row.destination_domain = null; }
  row.url_tags = creative.url_tags || null;
  row._landing_resolution = landing;
  row.landing_key = landing.landing_key;
  row._creative_details = details;
  row._audience = audience;
  row._campaign_config = campaign;
  row._adset_config = adset;
  row._config_sources = { campaign: bundleResult.source, adset: bundleResult.source, ad: bundleResult.source, creative: bundleResult.source, video: videoResult?.source || null };
  row._config_snapshot_hash = configHash({ campaign: hashes.campaign || latest.get(`campaign:${row.campaign_id}`)?.config_hash || null, adset: hashes.adset || latest.get(`adset:${row.adset_id}`)?.config_hash || null, ad: hashes.ad || latest.get(`ad:${row.ad_id}`)?.config_hash || null, creative: hashes.creative || latest.get(`creative:${creative.id}`)?.config_hash || null, video: latest.get(`video:${initialDetails.video_id}`)?.config_hash || null });
  row._creative_enrichment = creative.id ? { confidence: 'high', source: bundleResult.source } : { confidence: 'unresolved', source: bundleResult.source };
  return { json: row };
});

if (output.length) output[0].json._config_snapshots = [...snapshots.values()];
return output;
