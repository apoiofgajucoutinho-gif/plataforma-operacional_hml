-- P0.3 official Hotmart missing transaction backfill.
-- Inserts official export rows that were absent from comercial_vendas as commercial history,
-- without making non-confirmed or bundle-child rows revenue/student eligible.

with latest_upload as (
  select id
  from public.norwyn_validation_uploads
  where validation_type = 'HOTMART'
  order by uploaded_at desc
  limit 1
), missing as (
  select c.tenant_id,
         r.*,
         c.normalized_transaction_id,
         public.norwyn_canonical_hotmart_status(r.raw_status) as canonical_status,
         case
           when public.norwyn_canonical_hotmart_status(r.raw_status) in ('APPROVED','COMPLETED') then 'confirmed'
           when public.norwyn_canonical_hotmart_status(r.raw_status) in ('OVERDUE','STARTED','PENDING_PAYMENT') then 'pending'
           when public.norwyn_canonical_hotmart_status(r.raw_status) in ('CANCELLED','EXPIRED') then 'lost'
           when public.norwyn_canonical_hotmart_status(r.raw_status) = 'REFUNDED' then 'refunded'
           when public.norwyn_canonical_hotmart_status(r.raw_status) = 'CHARGEBACK' then 'chargeback'
           else 'unknown'
         end as grupo_calc,
         c.normalized_transaction_id ~ '^HP[0-9]+C[0-9]+$' as is_bundle_child
  from public.norwyn_hotmart_validation_comparisons c
  join latest_upload u on u.id = c.upload_id
  join public.norwyn_hotmart_validation_rows r on r.id = c.validation_row_id
  where c.match_status = 'ONLY_HOTMART'
    and c.sale_comparable = true
    and c.normalized_transaction_id is not null
), raw_inserted as (
  insert into public.comercial_hotmart_raw (tenant_id, source, event_id, transaction_id, payload, status, processed_at)
  select m.tenant_id,
         'HOTMART_OFFICIAL_EXPORT',
         'official-export-' || m.upload_id || '-' || m.normalized_transaction_id,
         m.normalized_transaction_id,
         m.raw_payload || jsonb_build_object(
           'validation_upload_id', m.upload_id,
           'validation_row_id', m.id,
           'source_file', m.source_file,
           'source_row', m.source_row
         ),
         'processado',
         now()
  from missing m
  where not exists (
    select 1 from public.comercial_vendas cv
    where cv.tenant_id = m.tenant_id and cv.transaction_id = m.normalized_transaction_id
  )
  returning id, tenant_id, transaction_id
), product_upsert as (
  insert into public.comercial_produtos (tenant_id, plataforma, hotmart_product_id, nome, ativo, metadata)
  select distinct m.tenant_id, 'hotmart', m.hotmart_product_id, coalesce(m.hotmart_product_name, m.hotmart_product_id, 'Produto Hotmart sem nome'), true,
         jsonb_build_object('source', 'HOTMART_OFFICIAL_EXPORT', 'validation_upload_id', m.upload_id)
  from missing m
  where m.hotmart_product_id is not null
  on conflict (tenant_id, hotmart_product_id) do update
  set nome = coalesce(excluded.nome, public.comercial_produtos.nome),
      updated_at = now()
  returning id, tenant_id, hotmart_product_id
), inserted_sales as (
  insert into public.comercial_vendas (
    tenant_id, transaction_id, aluno_id, produto_id, hotmart_product_id, produto_nome,
    comprador_nome, comprador_email, status, status_original, status_normalizado, grupo_comercial,
    forma_pagamento, parcelas, moeda, valor_bruto, valor_liquido, taxas, coproducao,
    data_compra, data_aprovacao, data_reembolso, data_chargeback, expected_payment_date,
    source_sck, origem, raw_id, last_event_at, imported_at, data_lacunas, metadata,
    commercial_transaction, sale_confirmed, revenue_eligible, student_eligible, sale_comparable,
    event_class, eligibility_reason, import_run_id
  )
  select m.tenant_id,
         m.normalized_transaction_id,
         null,
         p.id,
         m.hotmart_product_id,
         m.hotmart_product_name,
         m.buyer_name,
         lower(m.buyer_email),
         coalesce(m.raw_status, m.canonical_status),
         m.raw_status,
         m.canonical_status,
         m.grupo_calc,
         m.payment_method,
         1,
         coalesce(m.currency, 'BRL'),
         coalesce(m.normalized_value, 0),
         null,
         null,
         null,
         m.purchase_date,
         case when m.canonical_status in ('APPROVED','COMPLETED') then coalesce(m.approved_date, m.purchase_date) else m.approved_date end,
         m.refund_date,
         null,
         null,
         null,
         'hotmart_official_export',
         r.id,
         coalesce(m.approved_date, m.purchase_date, m.created_at),
         now(),
         case
           when m.is_bundle_child then jsonb_build_array('bundle_item_requires_review')
           when m.grupo_calc <> 'confirmed' then jsonb_build_array('not_confirmed_status')
           when coalesce(m.currency,'BRL') <> 'BRL' then jsonb_build_array('non_brl_currency')
           else '[]'::jsonb
         end,
         jsonb_build_object(
           'source', 'HOTMART_OFFICIAL_EXPORT',
           'validation_upload_id', m.upload_id,
           'validation_row_id', m.id,
           'source_file', m.source_file,
           'source_row', m.source_row,
           'lineage', 'central_validacao_backfill_0083',
           'raw_value', m.raw_value,
           'offer_id', m.offer_id,
           'offer_name', m.offer_name
         ),
         true,
         m.grupo_calc = 'confirmed',
         m.grupo_calc = 'confirmed' and coalesce(m.currency,'BRL') = 'BRL' and not m.is_bundle_child,
         m.grupo_calc = 'confirmed' and not m.is_bundle_child,
         true,
         'SALE_TRANSACTION',
         case
           when m.is_bundle_child then 'bundle_item_requires_review'
           when m.grupo_calc <> 'confirmed' then 'not_confirmed_status'
           when coalesce(m.currency,'BRL') <> 'BRL' then 'non_brl_currency'
           else 'brl_confirmed_sale'
         end,
         'central_validacao_backfill_0083'
  from missing m
  join raw_inserted r on r.tenant_id = m.tenant_id and r.transaction_id = m.normalized_transaction_id
  left join public.comercial_produtos p on p.tenant_id = m.tenant_id and p.hotmart_product_id = m.hotmart_product_id
  where not exists (
    select 1 from public.comercial_vendas cv
    where cv.tenant_id = m.tenant_id and cv.transaction_id = m.normalized_transaction_id
  )
  returning *
)
insert into public.norwyn_hotmart_transaction_status_history (
  tenant_id, transaction_id, sale_id, raw_id, status_original, status_normalizado, grupo_comercial,
  event_class, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible,
  occurred_at, source, import_run_id, metadata
)
select tenant_id, transaction_id, id, raw_id, status_original, status_normalizado, grupo_comercial,
       event_class, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible,
       coalesce(data_aprovacao, data_compra, last_event_at), 'HOTMART_OFFICIAL_EXPORT', import_run_id,
       metadata
from inserted_sales
on conflict do nothing;

insert into public.norwyn_hotmart_transaction_status_history (
  tenant_id, transaction_id, sale_id, raw_id, status_original, status_normalizado, grupo_comercial,
  event_class, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible,
  occurred_at, source, import_run_id, metadata
)
select tenant_id, transaction_id, id, raw_id, status_original, status_normalizado, grupo_comercial,
       event_class, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible,
       coalesce(data_aprovacao, data_compra, last_event_at), coalesce(origem, 'hotmart'), coalesce(import_run_id, 'historical_existing'),
       metadata || jsonb_build_object('lineage', 'status_history_seed_0083')
from public.comercial_vendas
on conflict do nothing;

insert into public.norwyn_customers (tenant_id, primary_email, display_name, identity_level, source, first_seen_at, last_seen_at, metadata)
select i.tenant_id, i.email, i.name, 'IDENTIFIED', 'hotmart', i.first_seen, i.last_seen,
       jsonb_build_object('commercial_transactions', i.commercial_transactions, 'eligible_purchases', i.eligible_purchases, 'merge_rule', 'email_only_no_name_merge')
from (
  select tenant_id,
         lower(comprador_email) as email,
         max(comprador_nome) as name,
         min(coalesce(data_compra, data_aprovacao, created_at)) as first_seen,
         max(coalesce(data_aprovacao, data_compra, updated_at)) as last_seen,
         count(*) filter (where commercial_transaction)::int as commercial_transactions,
         count(*) filter (where sale_confirmed and student_eligible and revenue_eligible)::int as eligible_purchases
  from public.comercial_vendas
  where comprador_email is not null
  group by tenant_id, lower(comprador_email)
) i
where not exists (
  select 1 from public.norwyn_customers c
  where c.tenant_id = i.tenant_id and lower(c.primary_email) = i.email
);

update public.norwyn_customers c
set display_name = coalesce(c.display_name, i.name),
    first_seen_at = least(coalesce(c.first_seen_at, i.first_seen), i.first_seen),
    last_seen_at = greatest(coalesce(c.last_seen_at, i.last_seen), i.last_seen),
    updated_at = now(),
    metadata = c.metadata || jsonb_build_object('commercial_transactions', i.commercial_transactions, 'eligible_purchases', i.eligible_purchases, 'merge_rule', 'email_only_no_name_merge')
from (
  select tenant_id,
         lower(comprador_email) as email,
         max(comprador_nome) as name,
         min(coalesce(data_compra, data_aprovacao, created_at)) as first_seen,
         max(coalesce(data_aprovacao, data_compra, updated_at)) as last_seen,
         count(*) filter (where commercial_transaction)::int as commercial_transactions,
         count(*) filter (where sale_confirmed and student_eligible and revenue_eligible)::int as eligible_purchases
  from public.comercial_vendas
  where comprador_email is not null
  group by tenant_id, lower(comprador_email)
) i
where c.tenant_id = i.tenant_id and lower(c.primary_email) = i.email;

insert into public.norwyn_customer_identities (tenant_id, customer_id, identity_type, identity_value, normalized_value, confidence, source, first_seen_at, last_seen_at, metadata)
select c.tenant_id, c.id, 'email', c.primary_email, lower(c.primary_email), 'IDENTIFIED', 'hotmart', c.first_seen_at, c.last_seen_at,
       jsonb_build_object('merge_rule', 'email_only_no_name_merge')
from public.norwyn_customers c
where c.primary_email is not null
on conflict (tenant_id, identity_type, normalized_value) do nothing;

insert into public.norwyn_customer_enrollments (
  tenant_id, customer_id, commercial_product_id, purchase_transaction_id, purchase_sale_id,
  enrolled_at, status, source, freshness, metadata
)
select v.tenant_id, c.id, v.produto_id, v.transaction_id, v.id,
       coalesce(v.data_aprovacao, v.data_compra),
       case
         when v.grupo_comercial in ('refunded','chargeback') then 'REFUNDED'
         when v.grupo_comercial = 'lost' then 'CANCELLED'
         when v.sale_confirmed and v.student_eligible then 'ACTIVE'
         else 'UNKNOWN'
       end,
       'hotmart', now(),
       jsonb_build_object('progress_pct', 'unavailable', 'source', 'commercial_sale')
from public.comercial_vendas v
join public.norwyn_customers c on c.tenant_id = v.tenant_id and lower(c.primary_email) = lower(v.comprador_email)
where v.comprador_email is not null
  and v.student_eligible = true
on conflict (tenant_id, purchase_sale_id) where purchase_sale_id is not null do nothing;
