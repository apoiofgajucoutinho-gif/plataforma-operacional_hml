create or replace function public.catalog_bulk_update_taxonomy(
  p_tenant_id uuid,
  p_offer_ids uuid[],
  p_field text,
  p_new_value text,
  p_only_pending boolean default true,
  p_actor_id uuid default null,
  p_actor_label text default null,
  p_origin text default 'bulk'
)
returns jsonb
language plpgsql
as $$
declare
  v_requested_count integer := 0;
  v_eligible_count integer := 0;
  v_updated_count integer := 0;
  v_valid_values text[];
begin
  if p_field not in ('audience_type', 'access_duration', 'payment_condition', 'composition') then
    raise exception 'Campo de taxonomia invalido: %', p_field;
  end if;

  v_valid_values := case p_field
    when 'audience_type' then array['geral','ex_aluno','a_confirmar']
    when 'access_duration' then array['1_ano','2_anos','3_anos','vitalicio','a_confirmar']
    when 'payment_condition' then array['avista','parcelamento_comum','parcelamento_hotmart','a_confirmar']
    when 'composition' then array['individual','combo']
    else array[]::text[]
  end;

  if not (p_new_value = any(v_valid_values)) then
    raise exception 'Valor invalido para %: %', p_field, p_new_value;
  end if;

  with requested as (
    select distinct unnest(coalesce(p_offer_ids, '{}'::uuid[])) as id
  )
  select count(*) into v_requested_count from requested;

  if v_requested_count = 0 then
    raise exception 'Informe ao menos uma oferta.';
  end if;

  with requested as (
    select distinct unnest(coalesce(p_offer_ids, '{}'::uuid[])) as id
  ), selected as (
    select
      o.*,
      case p_field
        when 'audience_type' then o.audience_type
        when 'access_duration' then o.access_duration
        when 'payment_condition' then o.payment_condition
        when 'composition' then o.composition
      end as previous_taxonomy_value,
      case
        when p_field = 'audience_type' then o.audience_type = 'a_confirmar'
        when p_field = 'access_duration' then o.access_duration = 'a_confirmar'
        when p_field = 'payment_condition' then o.payment_condition = 'a_confirmar'
        when p_field = 'composition' then (
          (o.offer_type = 'combo' and o.composition <> 'combo')
          or (coalesce(array_length(o.included_products, 1), 0) > 1 and o.composition <> 'combo')
          or (o.composition = 'combo' and o.offer_type <> 'combo' and coalesce(array_length(o.included_products, 1), 0) <= 1)
        )
        else false
      end as is_pending_for_field
    from public.catalog_offers o
    join requested r on r.id = o.id
    where o.tenant_id = p_tenant_id
  ), eligible as (
    select *
    from selected
    where (not p_only_pending or is_pending_for_field)
      and previous_taxonomy_value is distinct from p_new_value
  )
  select count(*) into v_eligible_count from eligible;

  with requested as (
    select distinct unnest(coalesce(p_offer_ids, '{}'::uuid[])) as id
  ), selected as (
    select
      o.*,
      case p_field
        when 'audience_type' then o.audience_type
        when 'access_duration' then o.access_duration
        when 'payment_condition' then o.payment_condition
        when 'composition' then o.composition
      end as previous_taxonomy_value,
      case
        when p_field = 'audience_type' then o.audience_type = 'a_confirmar'
        when p_field = 'access_duration' then o.access_duration = 'a_confirmar'
        when p_field = 'payment_condition' then o.payment_condition = 'a_confirmar'
        when p_field = 'composition' then (
          (o.offer_type = 'combo' and o.composition <> 'combo')
          or (coalesce(array_length(o.included_products, 1), 0) > 1 and o.composition <> 'combo')
          or (o.composition = 'combo' and o.offer_type <> 'combo' and coalesce(array_length(o.included_products, 1), 0) <= 1)
        )
        else false
      end as is_pending_for_field
    from public.catalog_offers o
    join requested r on r.id = o.id
    where o.tenant_id = p_tenant_id
  ), eligible as (
    select *
    from selected
    where (not p_only_pending or is_pending_for_field)
      and previous_taxonomy_value is distinct from p_new_value
  ), updated as (
    update public.catalog_offers o
    set
      audience_type = case when p_field = 'audience_type' then p_new_value else o.audience_type end,
      access_duration = case when p_field = 'access_duration' then p_new_value else o.access_duration end,
      payment_condition = case when p_field = 'payment_condition' then p_new_value else o.payment_condition end,
      composition = case when p_field = 'composition' then p_new_value else o.composition end,
      updated_at = now()
    from eligible e
    where o.id = e.id
      and o.tenant_id = p_tenant_id
    returning o.id, o.tenant_id, o.product_id, e.previous_taxonomy_value
  ), history as (
    insert into public.catalog_link_history (
      tenant_id,
      product_id,
      offer_id,
      event_type,
      previous_value,
      new_value,
      reason,
      actor_id,
      actor_label
    )
    select
      u.tenant_id,
      u.product_id,
      u.id,
      'taxonomy_updated',
      jsonb_build_object('field', p_field, 'value', u.previous_taxonomy_value),
      jsonb_build_object('field', p_field, 'value', p_new_value, 'origin', coalesce(nullif(p_origin, ''), 'bulk'), 'only_pending', p_only_pending),
      case coalesce(nullif(p_origin, ''), 'bulk')
        when 'individual' then 'Taxonomia comercial atualizada na fila de pendencias.'
        else 'Taxonomia comercial atualizada em lote na fila de pendencias.'
      end,
      p_actor_id,
      p_actor_label
    from updated u
    returning id
  )
  select count(*) into v_updated_count from history;

  return jsonb_build_object(
    'requested_count', v_requested_count,
    'eligible_count', v_eligible_count,
    'updated_count', v_updated_count,
    'skipped_count', greatest(v_requested_count - v_updated_count, 0),
    'field', p_field,
    'new_value', p_new_value,
    'only_pending', p_only_pending
  );
end;
$$;

revoke all on function public.catalog_bulk_update_taxonomy(uuid, uuid[], text, text, boolean, uuid, text, text) from public;
grant execute on function public.catalog_bulk_update_taxonomy(uuid, uuid[], text, text, boolean, uuid, text, text) to service_role;
