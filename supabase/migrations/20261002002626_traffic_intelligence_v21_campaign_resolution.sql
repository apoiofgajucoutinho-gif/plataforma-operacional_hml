do $$
declare
  v_tenant constant uuid := 'ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0';
  v_campaign uuid;
begin
  select id into v_campaign
  from public.campaigns
  where tenant_id = v_tenant
    and id = '6a0fbc55-c9f4-4113-9bf3-d075dc2a09ef';

  if v_campaign is null then
    raise exception 'Campanha canônica Imersão Zumbido não encontrada no HML';
  end if;

  update public.campaigns
  set
    plan_json = jsonb_set(
      coalesce(plan_json, '{}'::jsonb),
      '{traffic_data_foundation}',
      coalesce(plan_json -> 'traffic_data_foundation', '{}'::jsonb) || jsonb_build_object(
        'version', 'v2.1',
        'meta_campaign_id', '120228561336470421',
        'meta_campaign_ids', jsonb_build_array('120228561336470421', '120252998912470421'),
        'active_meta_campaign_id', '120252998912470421',
        'landing_key', 'imersao_zumbido',
        'mapping_confidence', 'high',
        'mapping_reason', 'IDs Meta exatos preservam a campanha histórica e registram a campanha ativa sem resolução por nome',
        'meta_campaign_registry', jsonb_build_array(
          jsonb_build_object('id', '120228561336470421', 'state', 'historical', 'evidence', 'registry Traffic Foundation V1'),
          jsonb_build_object('id', '120252998912470421', 'state', 'active', 'valid_from', '2026-09-29', 'evidence', 'V9 campaign snapshot + exact campaign_id')
        )
      ),
      true
    ),
    growth_config = jsonb_set(
      coalesce(growth_config, '{}'::jsonb),
      '{traffic_decision_engine}',
      coalesce(growth_config -> 'traffic_decision_engine', '{}'::jsonb) || jsonb_build_object(
        'version', 'v2.1',
        'min_link_clicks_signal', 8,
        'min_link_clicks_decision', 20,
        'review_link_clicks_increment', 20,
        'review_hours', 24,
        'min_trend_days', 3,
        'comparable_spend_ratio', 0.5,
        'meaningful_spend', null,
        'target_cpa', null,
        'automatic_actions', false,
        'configuration_note', 'CPA e gasto significativo permanecem nulos até definição comercial; sem esses valores o motor não recomenda pausa por gasto.'
      ),
      true
    ),
    updated_at = now()
  where id = v_campaign;
end $$;
