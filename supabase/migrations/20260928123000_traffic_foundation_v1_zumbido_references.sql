do $$
declare
  v_tenant constant uuid := 'ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0';
  v_campaign uuid;
begin
  select id into v_campaign
  from public.campaigns
  where tenant_id = v_tenant and lower(name) = lower('Imersão Zumbido')
  limit 1;

  if v_campaign is null then
    raise exception 'Campanha Imersão Zumbido não encontrada no tenant HML';
  end if;

  update public.campaigns
  set plan_json = coalesce(plan_json, '{}'::jsonb) || jsonb_build_object(
    'traffic_data_foundation', jsonb_build_object(
      'version', 'v1',
      'meta_campaign_id', '120228561336470421',
      'landing_key', 'imersao_zumbido',
      'mapping_confidence', 'high',
      'mapping_reason', 'ID Meta observado e campanha/produto/LP canônicos da Imersão Zumbido'
    )
  )
  where id = v_campaign;

  insert into public.campaign_materials (tenant_id, campaign_id, material_type, title, status, channel, metadata)
  values
    (v_tenant, v_campaign, 'video', 'VID_22.06_01', 'historical_reference', 'Meta Ads', '{"seed_key":"traffic_v1_zumbido_vid_22_06_01","meta_ad_id":"120228561336480421","reference_role":"historical_reference","winner_declared":false,"metrics_source":"instagram_ads_daily"}'::jsonb),
    (v_tenant, v_campaign, 'image', 'IMG_22.06_01', 'historical_reference', 'Meta Ads', '{"seed_key":"traffic_v1_zumbido_img_22_06_01","meta_ad_id":"120228956743530421","reference_role":"historical_reference","winner_declared":false,"metrics_source":"instagram_ads_daily"}'::jsonb),
    (v_tenant, v_campaign, 'video', 'JUL_VID_04', 'historical_reference', 'Meta Ads', '{"seed_key":"traffic_v1_zumbido_jul_vid_04","meta_ad_id":"120229541847870421","reference_role":"historical_reference","winner_declared":false,"metrics_source":"instagram_ads_daily"}'::jsonb),
    (v_tenant, v_campaign, 'image', 'AD15 | IMG', 'historical_reference', 'Meta Ads', '{"seed_key":"traffic_v1_zumbido_ad15_img","meta_ad_id":"120237847167970421","reference_role":"historical_reference","winner_declared":false,"metrics_source":"instagram_ads_daily"}'::jsonb),
    (v_tenant, v_campaign, 'image', 'AD12 | IMG', 'historical_reference', 'Meta Ads', '{"seed_key":"traffic_v1_zumbido_ad12_img","meta_ad_id":"120237847167950421","reference_role":"historical_reference","winner_declared":false,"metrics_source":"instagram_ads_daily"}'::jsonb)
  on conflict (tenant_id, campaign_id, (metadata ->> 'seed_key'))
    where metadata ? 'seed_key'
  do update set
    title = excluded.title,
    material_type = excluded.material_type,
    status = excluded.status,
    channel = excluded.channel,
    metadata = public.campaign_materials.metadata || excluded.metadata;
end $$;
