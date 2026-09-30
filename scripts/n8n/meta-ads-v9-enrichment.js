const token = String($env.META_ADS_ACCESS_TOKEN || '').trim();
const supabaseUrl = String($env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const tenantId = String($env.PLATAFORMA_TENANT_ID || '').trim();
const configTtlHours = Math.max(1, Number($env.META_ADS_CONFIG_TTL_HOURS || 24));
const creativeTtlHours = Math.max(configTtlHours, Number($env.META_ADS_CREATIVE_TTL_HOURS || 168));
const memoryCache = new Map();
const pendingSnapshots = new Map();

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stableValue(value[key]);
    return result;
  }, {});
}

function configHash(value) {
  const input = JSON.stringify(stableValue(value));
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'fnv1a-' + (hash >>> 0).toString(16).padStart(8, '0');
}

function isFresh(timestamp, ttlHours) {
  const parsed = Date.parse(timestamp || '');
  return Number.isFinite(parsed) && Date.now() - parsed < ttlHours * 60 * 60 * 1000;
}

async function readSnapshot(entityType, entityId, ttlHours) {
  if (!supabaseUrl || !serviceKey || !tenantId) return null;
  try {
    const query = [
      'select=config_json,config_hash,last_seen_at',
      'tenant_id=eq.' + encodeURIComponent(tenantId),
      'entity_type=eq.' + encodeURIComponent(entityType),
      'entity_id=eq.' + encodeURIComponent(entityId),
      'order=last_seen_at.desc',
      'limit=1',
    ].join('&');
    const response = await $http.request({
      method: 'GET',
      url: supabaseUrl + '/rest/v1/instagram_ads_config_snapshots?' + query,
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
    });
    const rows = response.data ?? response ?? [];
    const snapshot = Array.isArray(rows) ? rows[0] : null;
    return snapshot && isFresh(snapshot.last_seen_at, ttlHours) ? snapshot : null;
  } catch (error) {
    console.log('[FGA Ads] Cache de configuracao indisponivel; consultando Meta.');
    return null;
  }
}

async function graphGet(entityId, fields, fallbackFields) {
  try {
    const response = await $http.request({
      method: 'GET',
      url: 'https://graph.facebook.com/v23.0/' + encodeURIComponent(entityId),
      qs: { fields, access_token: token },
    });
    return { payload: response.data ?? response ?? {}, fieldSet: 'complete', error: null };
  } catch (completeError) {
    if (!fallbackFields || fallbackFields === fields) throw completeError;
    try {
      const response = await $http.request({
        method: 'GET',
        url: 'https://graph.facebook.com/v23.0/' + encodeURIComponent(entityId),
        qs: { fields: fallbackFields, access_token: token },
      });
      return {
        payload: response.data ?? response ?? {},
        fieldSet: 'fallback',
        error: String(completeError.message || completeError).slice(0, 300),
      };
    } catch (fallbackError) {
      throw new Error(String(fallbackError.message || fallbackError).slice(0, 300));
    }
  }
}

async function getEntity(entityType, entityId, fields, fallbackFields, ttlHours, parentIds) {
  const id = String(entityId || '').trim();
  if (!id || !token) return { payload: {}, hash: null, source: 'unavailable', error: id ? 'missing_token' : 'missing_id' };
  const cacheKey = entityType + ':' + id;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);

  const stored = await readSnapshot(entityType, id, ttlHours);
  if (stored) {
    const result = { payload: stored.config_json || {}, hash: stored.config_hash, source: 'snapshot_cache', error: null };
    memoryCache.set(cacheKey, result);
    return result;
  }

  try {
    const graph = await graphGet(id, fields, fallbackFields);
    const hash = configHash(graph.payload);
    const snapshot = {
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: id,
      entity_name: graph.payload.name || null,
      parent_ids: parentIds || {},
      config_hash: hash,
      config_json: graph.payload,
      source: 'meta_graph_api',
      graph_version: 'v23.0',
      collector_version: 'v9',
      last_seen_at: new Date().toISOString(),
    };
    pendingSnapshots.set(cacheKey + ':' + hash, snapshot);
    const result = { payload: graph.payload, hash, source: 'meta_graph_api', error: graph.error, fieldSet: graph.fieldSet };
    memoryCache.set(cacheKey, result);
    await new Promise(resolve => setTimeout(resolve, 80));
    return result;
  } catch (error) {
    const result = { payload: {}, hash: null, source: 'meta_graph_api', error: String(error.message || error).slice(0, 300) };
    memoryCache.set(cacheKey, result);
    return result;
  }
}

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

function firstText(values) {
  if (!Array.isArray(values)) return null;
  const item = values.find(entry => typeof entry?.text === 'string' && entry.text.trim());
  return item?.text?.trim() || null;
}

function firstUrl(creative) {
  const spec = creative?.object_story_spec || {};
  const candidates = [
    spec.link_data?.link,
    spec.video_data?.call_to_action?.value?.link,
    creative?.link_url,
    creative?.object_url,
  ];
  for (const entry of creative?.asset_feed_spec?.link_urls || []) {
    candidates.push(entry?.website_url, entry?.deeplink_url);
  }
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

function resolveLanding(destinationUrl, urlTags) {
  let destinationHost = null;
  try { destinationHost = destinationUrl ? new URL(destinationUrl).hostname.toLowerCase() : null; } catch {}
  for (const landing of landings) {
    let landingHost = null;
    try { landingHost = new URL(landing.url).hostname.toLowerCase(); } catch {}
    if (destinationHost && landingHost === destinationHost) {
      return { landing_key: landing.landing_key, confidence: 'high', reason: 'destination_domain_exact' };
    }
    if (urlTags && (urlTags.includes('landing_key=' + landing.landing_key) || urlTags.includes('utm_campaign=' + landing.campaign_key))) {
      return { landing_key: landing.landing_key, confidence: 'high', reason: 'url_tags_exact' };
    }
  }
  return { landing_key: null, confidence: 'unresolved', reason: 'no_explicit_destination_match' };
}

function targetingSignals(targeting, audienceDetails) {
  const categories = new Set();
  const evidence = [];
  const audienceNames = [];

  for (const audience of audienceDetails) {
    const raw = JSON.stringify({
      subtype: audience?.subtype,
      customer_file_source: audience?.customer_file_source,
      lookalike_spec: audience?.lookalike_spec,
      retention_days: audience?.retention_days,
      rule: audience?.rule,
    }).toLowerCase();
    const name = String(audience?.name || '').trim();
    if (name) audienceNames.push(name);
    if (audience?.lookalike_spec || String(audience?.subtype || '').toUpperCase().includes('LOOKALIKE')) {
      categories.add('Lookalike');
      evidence.push('custom_audience.lookalike_spec/subtype');
    } else if ((raw.includes('instagram') || raw.includes('ig_business')) && raw.includes('engag')) {
      categories.add('Engajamento Instagram');
      evidence.push('custom_audience.rule:instagram_engagement');
    } else if (raw.includes('url') || raw.includes('website')) {
      categories.add('Visitantes do site');
      evidence.push('custom_audience.rule:website');
    } else if (raw.includes('pixel') || raw.includes('offsite')) {
      categories.add('Pixel / site');
      evidence.push('custom_audience.rule:pixel');
    } else if (raw.includes('engagement') || raw.includes('remarket')) {
      categories.add('Remarketing');
      evidence.push('custom_audience.subtype/rule:engagement');
    } else if (audience?.subtype || audience?.customer_file_source) {
      categories.add('Lista / custom audience');
      evidence.push('custom_audience.subtype/customer_file_source');
    }
  }

  const interests = [
    ...(targeting?.interests || []),
    ...((targeting?.flexible_spec || []).flatMap(group => group?.interests || [])),
  ];
  const behaviors = [
    ...(targeting?.behaviors || []),
    ...((targeting?.flexible_spec || []).flatMap(group => group?.behaviors || [])),
  ];
  if (interests.length || behaviors.length) {
    categories.add('P\u00fablico por interesse');
    evidence.push('targeting.interests/behaviors');
  }

  const advantage = Boolean(
    targeting?.targeting_automation?.advantage_audience === 1 ||
    targeting?.targeting_automation?.advantage_audience === true ||
    targeting?.targeting_relaxation_types ||
    targeting?.advantage_audience,
  );
  const hasCustom = audienceDetails.length > 0 || (targeting?.custom_audiences || []).length > 0;
  if (advantage || (!hasCustom && !interests.length && !behaviors.length && targeting?.geo_locations)) {
    categories.add('P\u00fablico amplo / Advantage');
    evidence.push(advantage ? 'targeting.advantage_or_expansion' : 'targeting.only_demographic_geo');
  }

  let audienceType = 'N\u00e3o identificado';
  let confidence = 'unresolved';
  if (categories.size === 1) {
    audienceType = Array.from(categories)[0];
    confidence = audienceDetails.length || interests.length || advantage ? 'high' : 'medium';
  } else if (categories.size > 1) {
    audienceType = 'Misto';
    confidence = 'high';
  }

  const summaryParts = [];
  if (targeting?.age_min || targeting?.age_max) summaryParts.push('idade ' + (targeting.age_min || '?') + '-' + (targeting.age_max || '?'));
  if (targeting?.genders?.length) summaryParts.push('generos ' + targeting.genders.join(','));
  if (targeting?.geo_locations?.countries?.length) summaryParts.push('paises ' + targeting.geo_locations.countries.join(','));
  if (targeting?.publisher_platforms?.length) summaryParts.push('plataformas ' + targeting.publisher_platforms.join(','));
  if (targeting?.device_platforms?.length) summaryParts.push('dispositivos ' + targeting.device_platforms.join(','));
  if (audienceNames.length) summaryParts.push('audiencias ' + audienceNames.join(', '));

  return {
    audience_type: audienceType,
    audience_label: audienceNames.length ? audienceType + ': ' + audienceNames.join(', ') : audienceType,
    targeting_summary: summaryParts.join(' | ') || null,
    audience_confidence: confidence,
    audience_evidence: Array.from(new Set(evidence)),
  };
}

const campaignFields = 'id,name,objective,buying_type,status,effective_status,daily_budget,lifetime_budget,spend_cap,start_time,stop_time,bid_strategy,pacing_type';
const adsetFields = 'id,name,campaign_id,status,effective_status,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,attribution_spec,targeting,promoted_object,destination_type,pacing_type';
const adFields = 'id,name,adset_id,campaign_id,status,effective_status,creative{id}';
const creativeFields = 'id,name,body,title,thumbnail_url,image_url,image_hash,object_url,link_url,url_tags,object_story_id,effective_object_story_id,instagram_permalink_url,source_instagram_media_id,object_story_spec,asset_feed_spec';
const audienceFields = 'id,name,subtype,customer_file_source,lookalike_spec,retention_days,rule';

for (const item of items) {
  const row = item.json;
  const campaign = await getEntity('campaign', row.campaign_id, campaignFields, 'id,name,objective,status,effective_status', configTtlHours, {});
  const adset = await getEntity('adset', row.adset_id, adsetFields, 'id,name,campaign_id,status,effective_status,optimization_goal,billing_event,targeting', configTtlHours, { campaign_id: row.campaign_id || null });
  const ad = await getEntity('ad', row.ad_id, adFields, 'id,name,status,effective_status,creative{id}', configTtlHours, { campaign_id: row.campaign_id || null, adset_id: row.adset_id || null });
  const creativeId = ad.payload?.creative?.id || null;
  const creative = await getEntity('creative', creativeId, creativeFields, 'id,name,thumbnail_url,image_url,object_url,url_tags,object_story_spec,asset_feed_spec', creativeTtlHours, { ad_id: row.ad_id || null });
  const customAudienceRefs = [
    ...(adset.payload?.targeting?.custom_audiences || []),
    ...(adset.payload?.targeting?.excluded_custom_audiences || []),
  ];
  const audienceDetails = [];
  for (const reference of customAudienceRefs) {
    const detail = await getEntity('audience', reference?.id, audienceFields, 'id,name,subtype,lookalike_spec,retention_days', creativeTtlHours, { adset_id: row.adset_id || null });
    if (detail.payload?.id) audienceDetails.push(detail.payload);
  }
  const videoId = creativeDetails(creative.payload, null).video_id;
  const video = videoId
    ? await getEntity('video', videoId, 'id,title,length,picture,permalink_url', 'id,title,length,picture', creativeTtlHours, { creative_id: creativeId })
    : { payload: {}, hash: null };
  const details = creativeDetails(creative.payload, video.payload);
  const audience = targetingSignals(adset.payload?.targeting || {}, audienceDetails);

  const creativeSnapshotKey = 'creative:' + creativeId + ':' + creative.hash;
  const creativeSnapshot = pendingSnapshots.get(creativeSnapshotKey);
  if (creativeSnapshot) creativeSnapshot.config_json = { ...creativeSnapshot.config_json, _norwyn_details: details };

  const adsetSnapshotKey = 'adset:' + row.adset_id + ':' + adset.hash;
  const adsetSnapshot = pendingSnapshots.get(adsetSnapshotKey);
  if (adsetSnapshot) Object.assign(adsetSnapshot, audience);

  row.effective_status = ad.payload?.effective_status || row.effective_status || null;
  row.creative_id = creativeId;
  row.creative_name = creative.payload?.name || null;
  row.thumbnail_url = creative.payload?.thumbnail_url || creative.payload?.image_url || video.payload?.picture || null;
  row.preview_url = details.instagram_permalink_url;
  row.destination_url = firstUrl(creative.payload);
  try { row.destination_domain = row.destination_url ? new URL(row.destination_url).hostname.toLowerCase() : null; } catch { row.destination_domain = null; }
  row.url_tags = creative.payload?.url_tags || null;
  row._landing_resolution = resolveLanding(row.destination_url, row.url_tags);
  row.landing_key = row._landing_resolution.landing_key;
  row._creative_details = details;
  row._audience = audience;
  row._campaign_config = campaign.payload;
  row._adset_config = adset.payload;
  row._config_sources = {
    campaign: campaign.source,
    adset: adset.source,
    ad: ad.source,
    creative: creative.source,
    video: video.source || null,
  };
  row._config_snapshot_hash = configHash({
    campaign: campaign.hash,
    adset: adset.hash,
    ad: ad.hash,
    creative: creative.hash,
    video: video.hash,
  });
  row._creative_enrichment = creativeId
    ? { confidence: 'high', source: creative.source, field_set: creative.fieldSet || 'cache' }
    : { confidence: 'unresolved', source: ad.source, error: ad.error || null };
}

if (items.length) items[0].json._config_snapshots = Array.from(pendingSnapshots.values());
return items;
