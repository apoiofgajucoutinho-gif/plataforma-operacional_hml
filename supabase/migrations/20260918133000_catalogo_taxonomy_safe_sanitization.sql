with payment_candidates as (
  select
    o.id,
    o.tenant_id,
    o.product_id,
    o.payment_condition as previous_value,
    'parcelamento_hotmart'::text as new_value,
    case
      when lower(o.name) like '%boleto 6x%' then 'Pagamento classificado como Parcelamento Hotmart com base no nome da oferta: Boleto 6x.'
      when lower(o.name) like '%parcelamento boleto%' then 'Pagamento classificado como Parcelamento Hotmart com base no nome da oferta: parcelamento boleto.'
      when lower(o.name) like '%parcelamento no boleto%' then 'Pagamento classificado como Parcelamento Hotmart com base no nome da oferta: Parcelamento no Boleto.'
    end as reason
  from public.catalog_offers o
  where o.payment_condition = 'parcelamento_comum'
    and (
      lower(o.name) like '%boleto 6x%'
      or lower(o.name) like '%parcelamento boleto%'
      or lower(o.name) like '%parcelamento no boleto%'
    )
), updated_payment as (
  update public.catalog_offers o
  set payment_condition = c.new_value,
      updated_at = now()
  from payment_candidates c
  where o.id = c.id
  returning o.id, o.tenant_id, o.product_id, c.previous_value, c.new_value, c.reason
), audience_candidates as (
  select
    o.id,
    o.tenant_id,
    o.product_id,
    o.audience_type as previous_value,
    'ex_aluno'::text as new_value,
    'Público classificado como Ex-aluno com base no nome da oferta: Alunos antigos.'::text as reason
  from public.catalog_offers o
  where o.audience_type = 'a_confirmar'
    and lower(concat_ws(' ', o.name, o.use_type, o.special_rule, o.audience)) like '%alunos antigos%'
), updated_audience as (
  update public.catalog_offers o
  set audience_type = c.new_value,
      updated_at = now()
  from audience_candidates c
  where o.id = c.id
  returning o.id, o.tenant_id, o.product_id, c.previous_value, c.new_value, c.reason
)
insert into public.catalog_link_history (tenant_id, product_id, offer_id, event_type, previous_value, new_value, reason, actor_label)
select
  tenant_id,
  product_id,
  id,
  'commercial_taxonomy_sanitized',
  jsonb_build_object('field', 'payment_condition', 'value', previous_value),
  jsonb_build_object('field', 'payment_condition', 'value', new_value, 'confidence', 'Alta confiança'),
  reason,
  'system'
from updated_payment
union all
select
  tenant_id,
  product_id,
  id,
  'commercial_taxonomy_sanitized',
  jsonb_build_object('field', 'audience_type', 'value', previous_value),
  jsonb_build_object('field', 'audience_type', 'value', new_value, 'confidence', 'Média confiança'),
  reason,
  'system'
from updated_audience;
