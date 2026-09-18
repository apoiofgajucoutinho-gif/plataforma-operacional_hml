alter table public.catalog_offers
  add column if not exists payment_condition text not null default 'a_confirmar'
    check (payment_condition in ('avista','parcelamento_comum','parcelamento_hotmart','a_confirmar')),
  add column if not exists access_duration text not null default 'a_confirmar'
    check (access_duration in ('1_ano','2_anos','3_anos','vitalicio','a_confirmar')),
  add column if not exists composition text not null default 'individual'
    check (composition in ('individual','combo')),
  add column if not exists audience_type text not null default 'a_confirmar'
    check (audience_type in ('geral','ex_aluno','a_confirmar'));

update public.catalog_offers
set
  access_duration = case
    when lower(coalesce(access_time, '')) like '%1 ano%' then '1_ano'
    when lower(coalesce(access_time, '')) like '%2 ano%' or lower(coalesce(access_time, '')) like '%2 anos%' then '2_anos'
    when lower(coalesce(access_time, '')) like '%3 ano%' or lower(coalesce(access_time, '')) like '%3 anos%' then '3_anos'
    when lower(coalesce(access_time, '')) like '%vitalicio%' then 'vitalicio'
    when lower(coalesce(access_time, '')) like '%perpetuo%' then 'vitalicio'
    else 'a_confirmar'
  end,
  composition = case
    when offer_type = 'combo' then 'combo'
    when coalesce(array_length(included_products, 1), 0) > 1 then 'combo'
    else 'individual'
  end,
  payment_condition = case
    when lower(concat_ws(' ', smart_installments, name, use_type)) like '%pix parcelado%' then 'parcelamento_hotmart'
    when lower(concat_ws(' ', smart_installments, name, use_type)) like '%boleto parcelado%' then 'parcelamento_hotmart'
    when lower(concat_ws(' ', smart_installments, name, use_type)) like '%parcelamento inteligente%' then 'parcelamento_hotmart'
    when lower(coalesce(smart_installments, '')) in ('sim', 'yes', 'true') then 'parcelamento_hotmart'
    when lower(concat_ws(' ', smart_installments, name, use_type)) like '%a vista%' then 'avista'
    when coalesce(max_installments, 0) > 1 then 'parcelamento_comum'
    else 'a_confirmar'
  end,
  audience_type = case
    when lower(concat_ws(' ', use_type, audience, name)) like '%ex aluno%' then 'ex_aluno'
    when lower(concat_ws(' ', use_type, audience, name)) like '%ex-aluno%' then 'ex_aluno'
    when lower(concat_ws(' ', use_type, audience, name)) like '%ex alunos%' then 'ex_aluno'
    when lower(concat_ws(' ', use_type, audience, name)) like '%ex-alunos%' then 'ex_aluno'
    when lower(concat_ws(' ', use_type, audience, name)) like '%renova%' then 'ex_aluno'
    when coalesce(audience, '') <> '' and lower(audience) not in ('a confirmar', 'nao informado', 'nao informada') then 'geral'
    else 'a_confirmar'
  end
where true;

create index if not exists catalog_offers_taxonomy_idx
  on public.catalog_offers (tenant_id, payment_condition, access_duration, composition, audience_type);

drop view if exists public.catalog_v_offer_links;

create view public.catalog_v_offer_links
with (security_invoker = true)
as
select
  l.tenant_id,
  p.id as product_id,
  p.name as product_name,
  o.id as offer_id,
  o.name as offer_name,
  o.offer_type,
  o.included_products,
  o.current_price,
  o.max_installments,
  o.smart_installments,
  o.access_time,
  o.warranty,
  o.has_coparticipation,
  o.partner,
  o.coparticipation_percent,
  o.use_type,
  o.commercial_status,
  o.responsible,
  o.campaign_name,
  o.audience,
  o.lead_origin,
  o.special_rule,
  o.notes,
  o.data_quality_status,
  o.payment_condition,
  o.access_duration,
  o.composition,
  o.audience_type,
  l.id as sales_link_id,
  l.checkout_url,
  l.platform,
  l.hotmart_product_id,
  l.hotmart_offer_id,
  l.technical_health,
  l.last_checked_at,
  l.presence_asset_id,
  l.is_main_link,
  l.replaced_link_id,
  l.attribution_confidence,
  l.created_at,
  l.updated_at
from public.catalog_sales_links l
join public.catalog_offers o on o.id = l.offer_id
join public.catalog_products p on p.id = l.product_id;

grant select on public.catalog_v_offer_links to authenticated, service_role;

insert into public.catalog_link_history (tenant_id, product_id, offer_id, event_type, new_value, reason, actor_label)
select
  tenant_id,
  product_id,
  id,
  'commercial_taxonomy_normalized',
  jsonb_build_object(
    'payment_condition', payment_condition,
    'access_duration', access_duration,
    'composition', composition,
    'audience_type', audience_type
  ),
  'Normalizacao inicial da taxonomia comercial P0.3',
  'system'
from public.catalog_offers
where not exists (
  select 1
  from public.catalog_link_history h
  where h.offer_id = catalog_offers.id
    and h.event_type = 'commercial_taxonomy_normalized'
);