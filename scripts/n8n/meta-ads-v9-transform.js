function actionValue(actions, types) {
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

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function divideOrNull(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 10000) / 10000 : null;
}

function actionOrNull(actions, types) {
  if (!Array.isArray(actions)) return null;
  const matching = actions.filter(action => types.has(String(action.action_type || '').toLowerCase()));
  if (!matching.length) return null;
  return Math.round(matching.reduce((sum, action) => sum + Number(action.value || 0), 0));
}

const videoViewTypes = new Set(['video_view']);
const thruplayTypes = new Set(['video_view', 'thruplay']);

return items.map(item => {
  const d = item.json;
  const ctr = Number(d.ctr || 0);
  const cpc = Number(d.cpc || 0);
  const cpm = Number(d.cpm || 0);
  const frequency = Number(d.frequency || 0);
  const spend = Number(d.spend || 0);
  const clicks = Number(d.clicks || 0);
  const impressions = Number(d.impressions || 0);
  const reach = Number(d.reach || 0);
  const dataRef = d.date_start ? d.date_start : new Date().toISOString().split('T')[0];
  const tenantId = String($items('Configuracao V9')[0]?.json?.tenant_id || '').trim();
  if (!tenantId) throw new Error('Preencha tenant_id no node Configuracao V9.');

  const campaignName = String(d.campaign_name || '').trim();
  const adsetName = String(d.adset_name || '').trim();
  const adName = String(d.ad_name || '').trim();
  const status = String(d.effective_status || 'UNKNOWN').trim().toUpperCase();
  const leadsMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_lead', 'lead', 'omni_lead', 'onsite_conversion.lead_grouped']);
  const linkClicksMetric = canonicalAction(d.actions, ['link_click']);
  const landingPageViewsMetric = canonicalAction(d.actions, ['landing_page_view', 'omni_landing_page_view']);
  const checkoutMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'omni_initiated_checkout', 'onsite_web_initiate_checkout']);
  const purchasesMetric = canonicalAction(d.actions, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'onsite_web_purchase', 'onsite_conversion.purchase']);
  const purchaseValueMetric = canonicalAction(d.action_values, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase', 'onsite_web_purchase', 'onsite_conversion.purchase']);
  const outboundMetric = canonicalAction(d.outbound_clicks, ['outbound_click']);
  const uniqueOutboundMetric = canonicalAction(d.unique_outbound_clicks, ['outbound_click']);
  const purchaseRoasMetric = canonicalAction(d.purchase_roas, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase']);
  const uniqueClicks = nullableNumber(d.unique_clicks);
  const landingPageViews = landingPageViewsMetric.value;
  const checkouts = checkoutMetric.value;
  const details = d._creative_details || {};
  const audience = d._audience || {};
  const campaignConfig = d._campaign_config || {};
  const adsetConfig = d._adset_config || {};
  const {
    _config_snapshots,
    _campaign_config,
    _adset_config,
    ...rawInsight
  } = d;

  const rowKey = [dataRef, campaignName, adsetName, adName].join('|');
  return {
    json: {
      tenant_id: tenantId,
      data_referencia: dataRef,
      campanha: campaignName,
      conjunto: adsetName || null,
      anuncio: adName,
      status,
      objetivo: campaignConfig.objective || d.objective || null,
      alcance: Math.round(reach),
      impressoes: Math.round(impressions),
      cliques: Math.round(clicks),
      ctr,
      cpc,
      cpm,
      frequencia: frequency,
      valor_gasto: spend,
      conversoes: Math.round(purchasesMetric.value),
      leads: Math.round(leadsMetric.value),
      campaign_id: d.campaign_id || null,
      adset_id: d.adset_id || null,
      ad_id: d.ad_id || null,
      creative_id: d.creative_id || null,
      creative_name: d.creative_name || null,
      placement: d.placement || null,
      publisher_platform: d.publisher_platform || null,
      device_platform: d.device_platform || null,
      link_clicks: Math.round(linkClicksMetric.value),
      unique_link_clicks: nullableNumber(d.unique_inline_link_clicks) === null ? null : Math.round(Number(d.unique_inline_link_clicks)),
      unique_link_ctr: nullableNumber(d.unique_inline_link_click_ctr),
      cost_per_unique_link_click: nullableNumber(d.cost_per_unique_inline_link_click),
      unique_clicks: uniqueClicks === null ? null : Math.round(uniqueClicks),
      outbound_clicks: outboundMetric.action_type ? Math.round(outboundMetric.value) : null,
      unique_outbound_clicks: uniqueOutboundMetric.action_type ? Math.round(uniqueOutboundMetric.value) : null,
      unique_ctr: nullableNumber(d.unique_ctr),
      cost_per_unique_click: nullableNumber(d.cost_per_unique_click),
      landing_page_views: Math.round(landingPageViews),
      cost_per_landing_page_view: landingPageViewsMetric.action_type ? divideOrNull(spend, landingPageViews) : null,
      initiate_checkouts: Math.round(checkouts),
      cost_per_checkout: checkoutMetric.action_type ? divideOrNull(spend, checkouts) : null,
      meta_purchases: Math.round(purchasesMetric.value),
      meta_purchase_value: purchaseValueMetric.action_type ? purchaseValueMetric.value : null,
      meta_purchase_roas: purchaseRoasMetric.action_type ? purchaseRoasMetric.value : null,
      quality_ranking: d.quality_ranking || null,
      engagement_rate_ranking: d.engagement_rate_ranking || null,
      conversion_rate_ranking: d.conversion_rate_ranking || null,
      video_views: actionOrNull(d.actions, videoViewTypes),
      video_plays_3s: actionOrNull(d.video_play_actions, videoViewTypes),
      video_p25: actionOrNull(d.video_p25_watched_actions, videoViewTypes),
      video_p50: actionOrNull(d.video_p50_watched_actions, videoViewTypes),
      video_p75: actionOrNull(d.video_p75_watched_actions, videoViewTypes),
      video_p95: actionOrNull(d.video_p95_watched_actions, videoViewTypes),
      video_p100: actionOrNull(d.video_p100_watched_actions, videoViewTypes),
      thruplays: actionOrNull(d.video_thruplay_watched_actions, thruplayTypes),
      preview_url: d.preview_url || null,
      thumbnail_url: d.thumbnail_url || null,
      destination_url: d.destination_url || null,
      destination_domain: d.destination_domain || null,
      url_tags: d.url_tags || null,
      landing_key: d.landing_key || null,
      audience_type: audience.audience_type || 'N\u00e3o identificado',
      audience_label: audience.audience_label || 'N\u00e3o identificado',
      targeting_summary: audience.targeting_summary || null,
      audience_confidence: audience.audience_confidence || 'unresolved',
      audience_evidence: audience.audience_evidence || [],
      creative_format: details.format || null,
      creative_body: details.body || null,
      creative_headline: details.headline || null,
      creative_description: details.description || null,
      creative_cta: details.cta || null,
      creative_image_url: details.image_url || null,
      creative_video_id: details.video_id || null,
      creative_video_duration_seconds: details.video_duration_seconds,
      object_story_id: details.object_story_id || null,
      instagram_permalink_url: details.instagram_permalink_url || null,
      config_snapshot_hash: d._config_snapshot_hash || null,
      performance_status: 'SEM_CLASSIFICACAO_AUTOMATICA',
      performance_score: 0,
      origem: 'n8n_meta_ads_v9',
      row_key: rowKey,
      raw_payload: {
        ...rawInsight,
        _norwyn_foundation: {
          collector_version: 'v9',
          graph_version: 'v23.0',
          collected_at: new Date().toISOString(),
          origin: 'meta_graph_api',
          action_semantics: 'canonical_alias_priority',
          action_sources: {
            leads: leadsMetric.action_type,
            link_clicks: linkClicksMetric.action_type,
            outbound_clicks: outboundMetric.action_type,
            unique_outbound_clicks: uniqueOutboundMetric.action_type,
            landing_page_views: landingPageViewsMetric.action_type,
            initiate_checkouts: checkoutMetric.action_type,
            meta_purchases: purchasesMetric.action_type,
            meta_purchase_value: purchaseValueMetric.action_type,
            meta_purchase_roas: purchaseRoasMetric.action_type,
          },
          idempotency: {
            persisted_row_key: 'date|campaign_name|adset_name|ad_name',
            candidate_id_key: [dataRef, d.campaign_id, d.adset_id, d.ad_id].join('|'),
            migration_status: 'deferred_to_avoid_legacy_duplicates',
          },
          config: {
            snapshot_hash: d._config_snapshot_hash || null,
            sources: d._config_sources || null,
            campaign: {
              objective: campaignConfig.objective || null,
              buying_type: campaignConfig.buying_type || null,
              status: campaignConfig.status || null,
              effective_status: campaignConfig.effective_status || null,
              daily_budget: campaignConfig.daily_budget || null,
              lifetime_budget: campaignConfig.lifetime_budget || null,
              spend_cap: campaignConfig.spend_cap || null,
              bid_strategy: campaignConfig.bid_strategy || null,
              start_time: campaignConfig.start_time || null,
              stop_time: campaignConfig.stop_time || null,
            },
            adset: {
              optimization_goal: adsetConfig.optimization_goal || null,
              billing_event: adsetConfig.billing_event || null,
              bid_strategy: adsetConfig.bid_strategy || null,
              bid_amount: adsetConfig.bid_amount || null,
              daily_budget: adsetConfig.daily_budget || null,
              lifetime_budget: adsetConfig.lifetime_budget || null,
              start_time: adsetConfig.start_time || null,
              end_time: adsetConfig.end_time || null,
              attribution_spec: adsetConfig.attribution_spec || null,
              status: adsetConfig.status || null,
              effective_status: adsetConfig.effective_status || null,
            },
          },
          audience,
          creative: d._creative_enrichment || null,
          creative_details: details,
          landing: d._landing_resolution || null,
          confirmed_sales_semantics: 'not_collected_by_meta_workflow',
        },
      },
      imported_at: new Date().toISOString(),
    },
  };
});
