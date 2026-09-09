-- P1 Customer & Student 360: keep purchase-derived enrollments separate from real access evidence.

create or replace view public.norwyn_customer_student_360
with (security_invoker = true)
as
with eligible_sales as (
  select v.*
  from public.comercial_vendas v
  where v.commercial_transaction = true
    and v.sale_confirmed = true
    and v.student_eligible = true
), sales_ranked as (
  select
    c.id as customer_id,
    v.*,
    row_number() over (partition by c.id order by coalesce(v.data_aprovacao, v.data_compra, v.created_at), v.id) as purchase_rank_asc,
    row_number() over (partition by c.id order by coalesce(v.data_aprovacao, v.data_compra, v.created_at) desc nulls last, v.id desc) as purchase_rank_desc,
    lead(coalesce(v.data_aprovacao, v.data_compra, v.created_at)) over (partition by c.id order by coalesce(v.data_aprovacao, v.data_compra, v.created_at), v.id) as next_purchase_at
  from eligible_sales v
  join public.norwyn_customers c
    on c.tenant_id = v.tenant_id
   and lower(c.primary_email) = lower(v.comprador_email)
  where v.comprador_email is not null
), purchase_agg as (
  select
    c.id as customer_id,
    count(v.id) filter (where v.sale_confirmed and v.student_eligible) as purchase_count,
    count(distinct coalesce(v.produto_id::text, v.hotmart_product_id, v.produto_nome)) filter (where v.sale_confirmed and v.student_eligible) as product_count,
    min(coalesce(v.data_aprovacao, v.data_compra, v.created_at)) filter (where v.sale_confirmed and v.student_eligible) as first_purchase_at,
    max(coalesce(v.data_aprovacao, v.data_compra, v.created_at)) filter (where v.sale_confirmed and v.student_eligible) as last_purchase_at,
    coalesce(sum(v.valor_bruto) filter (where v.revenue_eligible and v.moeda = 'BRL'),0) as ltv_brl,
    count(v.id) filter (where v.moeda <> 'BRL') as non_brl_count,
    count(v.id) filter (where v.grupo_comercial in ('refunded','chargeback')) as refund_or_chargeback_count,
    count(v.id) filter (where v.grupo_comercial = 'chargeback') as chargeback_count,
    count(v.id) filter (where v.commercial_transaction and not v.sale_confirmed and v.grupo_comercial in ('pending','lost')) as checkout_opportunity_count,
    max(coalesce(v.last_event_at, v.imported_at, v.updated_at, v.created_at)) as sale_freshness
  from public.norwyn_customers c
  left join public.comercial_vendas v
    on v.tenant_id = c.tenant_id
   and lower(v.comprador_email) = lower(c.primary_email)
  group by c.id
), first_latest as (
  select
    customer_id,
    max(produto_nome) filter (where purchase_rank_asc = 1) as first_product,
    max(produto_nome) filter (where purchase_rank_desc = 1) as latest_product,
    min(extract(epoch from (next_purchase_at - coalesce(data_aprovacao, data_compra, created_at))) / 86400) filter (where purchase_rank_asc = 1 and next_purchase_at is not null) as days_to_second_purchase
  from sales_ranked
  group by customer_id
), enrollment_agg as (
  select
    e.customer_id,
    count(*) as enrollment_count,
    count(*) filter (where e.status = 'ACTIVE') as active_enrollments,
    count(*) filter (where e.status = 'INACTIVE') as inactive_enrollments,
    count(*) filter (where e.status = 'COMPLETED') as completed_enrollments,
    count(*) filter (where e.status = 'REFUNDED') as refunded_enrollments,
    max(e.completed_at) as completed_at,
    max(e.progress_pct) filter (where e.progress_pct is not null) as max_progress_pct,
    count(*) filter (where e.progress_pct is not null) as progress_known_count,
    max(coalesce(e.freshness, e.updated_at, e.created_at)) as enrollment_freshness
  from public.norwyn_customer_enrollments e
  group by e.customer_id
), learning_agg as (
  select
    c.id as customer_id,
    count(*) as learning_event_count,
    min(le.occurred_at) filter (where le.event_type = 'CLUB_FIRST_ACCESS' or le.event_class = 'PRODUCT_ACCESS_EVENT') as club_first_access_at,
    max(le.occurred_at) as club_last_event_at,
    count(*) filter (where le.event_type = 'CLUB_MODULE_COMPLETED' or le.event_class = 'MODULE_EVENT') as module_completed_events
  from public.norwyn_hotmart_learning_events le
  join public.norwyn_customers c
    on c.tenant_id = le.tenant_id
   and lower(c.primary_email) = lower(le.buyer_email)
  where le.buyer_email is not null
  group by c.id
), identity_agg as (
  select
    i.customer_id,
    count(*) as identity_count,
    string_agg(distinct i.identity_type, ', ' order by i.identity_type) as identity_types,
    max(i.last_seen_at) as identity_freshness
  from public.norwyn_customer_identities i
  group by i.customer_id
), product_list as (
  select
    sr.customer_id,
    string_agg(distinct sr.produto_nome, ', ' order by sr.produto_nome) filter (where sr.produto_nome is not null) as products_summary
  from sales_ranked sr
  group by sr.customer_id
)
select
  c.tenant_id,
  c.id as customer_id,
  c.display_name,
  c.primary_email as email,
  case
    when c.primary_phone is null then null
    when length(regexp_replace(c.primary_phone, '\D', '', 'g')) >= 4 then repeat('*', greatest(length(regexp_replace(c.primary_phone, '\D', '', 'g')) - 4, 0)) || right(regexp_replace(c.primary_phone, '\D', '', 'g'), 4)
    else null
  end as phone_masked,
  c.identity_level as identity_confidence,
  coalesce(ia.identity_count, 0) as identity_count,
  coalesce(ia.identity_types, '') as identity_types,
  case
    when coalesce(pa.purchase_count,0) > 0 and coalesce(ea.enrollment_count,0) > 0 then 'STUDENT'
    when coalesce(pa.purchase_count,0) > 0 then 'BUYER'
    when coalesce(pa.checkout_opportunity_count,0) > 0 then 'LEAD'
    else 'UNRECONCILED'
  end as lifecycle_status,
  c.first_seen_at,
  coalesce(c.source, 'unknown') as lead_source,
  pa.first_purchase_at,
  pa.last_purchase_at,
  coalesce(pa.purchase_count,0)::integer as purchase_count,
  coalesce(pa.product_count,0)::integer as product_count,
  coalesce(pa.ltv_brl,0)::numeric as ltv_brl,
  fl.first_product,
  fl.latest_product,
  coalesce(pl.products_summary, '') as products_summary,
  coalesce(ea.enrollment_count,0)::integer as enrollment_count,
  case
    when coalesce(ea.enrollment_count,0) = 0 then 'NOT_APPLICABLE'
    when coalesce(ea.completed_enrollments,0) > 0 then 'COMPLETED'
    when coalesce(ea.refunded_enrollments,0) > 0 and coalesce(ea.active_enrollments,0) = 0 then 'REFUNDED'
    when coalesce(ea.active_enrollments,0) > 0 then 'ACTIVE'
    when coalesce(ea.inactive_enrollments,0) > 0 then 'INACTIVE'
    else 'UNKNOWN'
  end as student_status,
  la.club_first_access_at as first_access_at,
  la.club_last_event_at as last_access_at,
  case
    when coalesce(ea.enrollment_count,0) = 0 then 'NOT_APPLICABLE'
    when coalesce(la.learning_event_count,0) = 0 then 'UNKNOWN_ACCESS'
    when la.club_last_event_at >= now() - interval '45 days' then 'ACTIVE'
    else 'INACTIVE'
  end as activity_status,
  ea.max_progress_pct as progress_pct,
  case
    when coalesce(ea.enrollment_count,0) = 0 then 'NOT_APPLICABLE'
    when ea.max_progress_pct is null and coalesce(la.module_completed_events,0) > 0 then 'PARTIAL_EVENTS_ONLY'
    when ea.max_progress_pct is null then 'UNKNOWN'
    when ea.max_progress_pct = 0 then '0%'
    when ea.max_progress_pct < 25 then '1-24%'
    when ea.max_progress_pct < 50 then '25-49%'
    when ea.max_progress_pct < 75 then '50-74%'
    when ea.max_progress_pct < 100 then '75-99%'
    else '100%'
  end as progress_status,
  coalesce(ea.progress_known_count,0)::integer as progress_known_count,
  coalesce(la.learning_event_count,0)::integer as learning_event_count,
  coalesce(la.module_completed_events,0)::integer as module_completed_events,
  case
    when coalesce(ea.enrollment_count,0) = 0 then 'NOT_APPLICABLE'
    when la.club_first_access_at is not null then 'IN_PROGRESS'
    else 'UNKNOWN'
  end as onboarding_status,
  (coalesce(pa.refund_or_chargeback_count,0) > 0) as refund_flag,
  (coalesce(pa.chargeback_count,0) > 0) as chargeback_flag,
  coalesce(pa.non_brl_count,0)::integer as non_brl_count,
  coalesce(pa.checkout_opportunity_count,0)::integer as checkout_opportunity_count,
  fl.days_to_second_purchase,
  case
    when coalesce(pa.checkout_opportunity_count,0) > 0 and coalesce(pa.purchase_count,0) = 0 then 'CHECKOUT_NAO_CONCLUIDO'
    when coalesce(ea.enrollment_count,0) > 0 and coalesce(la.learning_event_count,0) = 0 then 'ACESSO_DESCONHECIDO'
    when coalesce(pa.purchase_count,0) >= 2 then 'CLIENTE_MULTIPRODUTO'
    when coalesce(pa.purchase_count,0) = 1 then 'POTENCIAL_ASCENSAO'
    else 'REVISAR_IDENTIDADE'
  end as next_opportunity,
  case
    when c.identity_level = 'IDENTIFIED' and coalesce(pa.purchase_count,0) > 0 and coalesce(pa.ltv_brl,0) > 0 and coalesce(ea.enrollment_count,0) > 0 then 'TRUSTED'
    when c.identity_level = 'IDENTIFIED' and (coalesce(pa.purchase_count,0) > 0 or coalesce(pa.checkout_opportunity_count,0) > 0) then 'PARTIAL'
    when c.identity_level = 'PROBABLE_MATCH' then 'REVIEW'
    else 'INSUFFICIENT_DATA'
  end as data_quality_status,
  greatest(c.updated_at, coalesce(pa.sale_freshness, c.updated_at), coalesce(ea.enrollment_freshness, c.updated_at), coalesce(ia.identity_freshness, c.updated_at), coalesce(la.club_last_event_at, c.updated_at)) as freshness
from public.norwyn_customers c
left join purchase_agg pa on pa.customer_id = c.id
left join first_latest fl on fl.customer_id = c.id
left join enrollment_agg ea on ea.customer_id = c.id
left join learning_agg la on la.customer_id = c.id
left join identity_agg ia on ia.customer_id = c.id
left join product_list pl on pl.customer_id = c.id;

grant select on public.norwyn_customer_student_360 to authenticated;
