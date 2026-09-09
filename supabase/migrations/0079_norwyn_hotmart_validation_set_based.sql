-- Hotfix P0: make Hotmart validation set-based and separate sales from non-commercial events.

create or replace function public.norwyn_normalize_transaction_id(value text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(btrim(coalesce(value, '')), '[[:space:]]+', '', 'g')), '')
$$;

create or replace function public.norwyn_canonical_hotmart_status(value text)
returns text
language sql
immutable
as $$
  select case upper(regexp_replace(btrim(coalesce(value, '')), '[[:space:]-]+', '_', 'g'))
    when 'APPROVED' then 'APPROVED'
    when 'APROVADO' then 'APPROVED'
    when 'COMPLETE' then 'COMPLETED'
    when 'COMPLETO' then 'COMPLETED'
    when 'COMPLETED' then 'COMPLETED'
    when 'OVERDUE' then 'OVERDUE'
    when 'ATRASADO' then 'OVERDUE'
    when 'CANCELLED' then 'CANCELLED'
    when 'CANCELED' then 'CANCELLED'
    when 'CANCELADO' then 'CANCELLED'
    when 'CANCELADA' then 'CANCELLED'
    when 'EXPIRED' then 'EXPIRED'
    when 'EXPIRADO' then 'EXPIRED'
    when 'EXPIRADA' then 'EXPIRED'
    when 'REFUNDED' then 'REFUNDED'
    when 'PARTIALLY_REFUNDED' then 'REFUNDED'
    when 'REEMBOLSADO' then 'REFUNDED'
    when 'REEMBOLSADA' then 'REFUNDED'
    when 'CHARGEBACK' then 'CHARGEBACK'
    when 'STARTED' then 'STARTED'
    when 'INICIADA' then 'STARTED'
    when 'INICIADO' then 'STARTED'
    when 'WAITING_PAYMENT' then 'PENDING_PAYMENT'
    when 'AGUARDANDO_PAGTO' then 'PENDING_PAYMENT'
    when 'AGUARDANDO_PAGAMENTO' then 'PENDING_PAYMENT'
    when 'PRINTED_BILLET' then 'PENDING_PAYMENT'
    when 'PROCESSING_TRANSACTION' then 'PENDING_PAYMENT'
    when 'UNDER_ANALISYS' then 'PENDING_PAYMENT'
    when 'UNDER_ANALYSIS' then 'PENDING_PAYMENT'
    else 'UNKNOWN'
  end
$$;

create or replace function public.norwyn_hotmart_event_class(value text, transaction_id text)
returns text
language sql
immutable
as $$
  select case
    when upper(btrim(coalesce(value, ''))) = 'CLUB_FIRST_ACCESS' then 'PRODUCT_ACCESS_EVENT'
    when upper(btrim(coalesce(value, ''))) = 'CLUB_MODULE_COMPLETED' then 'MODULE_EVENT'
    when upper(btrim(coalesce(value, ''))) = 'PURCHASE_OUT_OF_SHOPPING_CART' then 'CHECKOUT_EVENT'
    when public.norwyn_canonical_hotmart_status(value) = 'REFUNDED' then 'REFUND_EVENT'
    when public.norwyn_canonical_hotmart_status(value) = 'CHARGEBACK' then 'REFUND_EVENT'
    when public.norwyn_canonical_hotmart_status(value) <> 'UNKNOWN'
      and public.norwyn_normalize_transaction_id(transaction_id) ~ '^HP[0-9]+$' then 'SALE_TRANSACTION'
    when public.norwyn_normalize_transaction_id(transaction_id) ~ '^HP[0-9]+$' then 'UNKNOWN_EVENT'
    else 'OTHER_EVENT'
  end
$$;

create or replace function public.norwyn_hotmart_sale_comparable(value text, transaction_id text)
returns boolean
language sql
immutable
as $$
  select public.norwyn_normalize_transaction_id(transaction_id) ~ '^HP[0-9]+$'
    and public.norwyn_canonical_hotmart_status(value) in (
      'APPROVED', 'COMPLETED', 'OVERDUE', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK', 'STARTED'
    )
$$;

alter table public.norwyn_hotmart_validation_rows
  add column if not exists normalized_transaction_id text,
  add column if not exists event_class text not null default 'SALE_TRANSACTION',
  add column if not exists sale_comparable boolean not null default true;

alter table public.norwyn_hotmart_validation_comparisons
  add column if not exists normalized_transaction_id text,
  add column if not exists event_class text,
  add column if not exists sale_comparable boolean not null default true;

alter table public.norwyn_hotmart_validation_comparisons
  drop constraint if exists norwyn_hotmart_validation_match_chk;

alter table public.norwyn_hotmart_validation_comparisons
  add constraint norwyn_hotmart_validation_match_chk check (match_status in ('MATCH_EXACT', 'MATCH_DIVERGENT', 'ONLY_HOTMART', 'ONLY_NORWYN', 'REVIEW_REQUIRED', 'UNKNOWN_MATCH', 'NON_COMPARABLE'));

create index if not exists norwyn_hotmart_validation_rows_normalized_idx
on public.norwyn_hotmart_validation_rows (tenant_id, upload_id, normalized_transaction_id);

create index if not exists norwyn_hotmart_validation_comparisons_normalized_idx
on public.norwyn_hotmart_validation_comparisons (tenant_id, upload_id, normalized_transaction_id, match_status);

create or replace function public.norwyn_rebuild_hotmart_validation_comparisons(p_upload_id uuid)
returns table(match_status text, total bigint)
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_summary jsonb;
begin
  select tenant_id into v_tenant_id
  from public.norwyn_validation_uploads
  where id = p_upload_id;

  if v_tenant_id is null then
    raise exception 'Validation upload not found: %', p_upload_id;
  end if;

  update public.norwyn_validation_uploads
  set status = 'processing', updated_at = now()
  where id = p_upload_id;

  update public.norwyn_hotmart_validation_rows
  set normalized_transaction_id = public.norwyn_normalize_transaction_id(transaction_id),
      canonical_status = public.norwyn_canonical_hotmart_status(coalesce(raw_status, canonical_status)),
      event_class = 'SALE_TRANSACTION',
      sale_comparable = public.norwyn_normalize_transaction_id(transaction_id) is not null
  where upload_id = p_upload_id;

  delete from public.norwyn_hotmart_validation_comparisons
  where upload_id = p_upload_id;

  with official_ranked as (
    select row_number() over (partition by normalized_transaction_id order by source_file, source_row, id) as rn,
           *
    from public.norwyn_hotmart_validation_rows
    where tenant_id = v_tenant_id
      and upload_id = p_upload_id
      and normalized_transaction_id is not null
  ), official as (
    select * from official_ranked where rn = 1
  ), norwyn_classified as (
    select cv.*,
           public.norwyn_normalize_transaction_id(cv.transaction_id) as normalized_transaction_id,
           public.norwyn_canonical_hotmart_status(coalesce(cv.status_original, cv.status_normalizado, cv.status)) as canonical_status,
           public.norwyn_hotmart_event_class(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as event_class,
           public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as sale_comparable
    from public.comercial_vendas cv
    where cv.tenant_id = v_tenant_id
  ), norwyn_ranked as (
    select row_number() over (partition by normalized_transaction_id order by updated_at desc nulls last, created_at desc nulls last, id) as rn,
           count(*) over (partition by normalized_transaction_id) as duplicate_count,
           *
    from norwyn_classified
    where sale_comparable = true
      and normalized_transaction_id is not null
  ), norwyn_sales as (
    select * from norwyn_ranked where rn = 1
  ), joined as (
    select o.id as validation_row_id,
           n.id as norwyn_sale_id,
           coalesce(o.transaction_id, n.transaction_id) as raw_transaction_id,
           coalesce(o.normalized_transaction_id, n.normalized_transaction_id) as normalized_transaction_id,
           o.canonical_status as official_canonical_status,
           n.canonical_status as norwyn_canonical_status,
           o.currency as official_currency,
           n.moeda as norwyn_currency,
           o.normalized_value as official_value,
           n.valor_bruto as norwyn_value,
           o.hotmart_product_id as official_product_id,
           n.hotmart_product_id as norwyn_product_id,
           o.buyer_email as official_buyer_email,
           n.comprador_email as norwyn_buyer_email,
           o.purchase_date as official_purchase_date,
           n.data_compra as norwyn_purchase_date,
           to_jsonb(o) as official_row,
           to_jsonb(n) as norwyn_row,
           coalesce(n.duplicate_count, 0) as norwyn_duplicate_count
    from official o
    full join norwyn_sales n on n.normalized_transaction_id = o.normalized_transaction_id
  ), compared as (
    select *,
      array_remove(array[
        case when official_canonical_status is not null and norwyn_canonical_status is not null and official_canonical_status <> norwyn_canonical_status then 'status' end,
        case when official_currency is not null and norwyn_currency is not null and official_currency <> norwyn_currency then 'currency' end,
        case when official_currency = 'BRL' and norwyn_currency = 'BRL' and official_value is not null and norwyn_value is not null and abs(official_value - norwyn_value) > 0.01 then 'value' end,
        case when official_product_id is not null and norwyn_product_id is not null and official_product_id <> norwyn_product_id then 'product' end,
        case when official_buyer_email is not null and norwyn_buyer_email is not null and lower(official_buyer_email) <> lower(norwyn_buyer_email) then 'buyer' end,
        case when official_purchase_date is not null and norwyn_purchase_date is not null and official_purchase_date::date <> norwyn_purchase_date::date then 'date' end,
        case when norwyn_duplicate_count > 1 then 'duplicate_norwyn_transaction_id' end
      ], null) as difference_types
    from joined
  )
  insert into public.norwyn_hotmart_validation_comparisons (
    tenant_id, upload_id, validation_row_id, norwyn_sale_id, transaction_id, normalized_transaction_id,
    match_status, difference_types, official_snapshot, norwyn_snapshot, event_class, sale_comparable
  )
  select v_tenant_id,
         p_upload_id,
         validation_row_id,
         norwyn_sale_id,
         raw_transaction_id,
         normalized_transaction_id,
         case
           when validation_row_id is null then 'ONLY_NORWYN'
           when norwyn_sale_id is null then 'ONLY_HOTMART'
           when cardinality(difference_types) = 0 then 'MATCH_EXACT'
           else 'MATCH_DIVERGENT'
         end,
         difference_types,
         case when validation_row_id is null then '{}'::jsonb else to_jsonb(official_row) end,
         coalesce(norwyn_row, '{}'::jsonb),
         'SALE_TRANSACTION',
         true
  from compared;

  insert into public.norwyn_hotmart_validation_comparisons (
    tenant_id, upload_id, validation_row_id, norwyn_sale_id, transaction_id, normalized_transaction_id,
    match_status, difference_types, official_snapshot, norwyn_snapshot, event_class, sale_comparable
  )
  select v_tenant_id,
         p_upload_id,
         null,
         cv.id,
         cv.transaction_id,
         cv.normalized_transaction_id,
         'NON_COMPARABLE',
         array[cv.event_class],
         '{}'::jsonb,
         to_jsonb(cv),
         cv.event_class,
         false
  from (
    select cv.*,
           public.norwyn_normalize_transaction_id(cv.transaction_id) as normalized_transaction_id,
           public.norwyn_hotmart_event_class(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as event_class,
           public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as sale_comparable
    from public.comercial_vendas cv
    where cv.tenant_id = v_tenant_id
  ) cv
  where cv.sale_comparable = false;

  select jsonb_build_object(
    'comparison_counts', coalesce(jsonb_object_agg(match_status, total), '{}'::jsonb),
    'hotmart_total', (select count(distinct normalized_transaction_id) from public.norwyn_hotmart_validation_rows where upload_id = p_upload_id and normalized_transaction_id is not null),
    'norwyn_raw_events', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id),
    'norwyn_sale_comparable', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id and public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id)),
    'non_comparable_events', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id and not public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id)),
    'club_events', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id and coalesce(status_original, status_normalizado, status) in ('CLUB_FIRST_ACCESS','CLUB_MODULE_COMPLETED')),
    'unknown_sale_status', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id and public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id) and public.norwyn_canonical_hotmart_status(coalesce(status_original, status_normalizado, status)) = 'UNKNOWN'),
    'brl_commercial_confirmed', (select coalesce(sum(valor_bruto),0) from public.comercial_vendas where tenant_id = v_tenant_id and moeda = 'BRL' and public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id) and public.norwyn_canonical_hotmart_status(coalesce(status_original, status_normalizado, status)) in ('APPROVED','COMPLETED')),
    'non_brl_commercial', (select count(*) from public.comercial_vendas where tenant_id = v_tenant_id and moeda <> 'BRL' and public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id))
  ) into v_summary
  from (
    select match_status, count(*) as total
    from public.norwyn_hotmart_validation_comparisons
    where tenant_id = v_tenant_id and upload_id = p_upload_id
    group by match_status
  ) counts;

  update public.norwyn_validation_uploads
  set status = 'compared',
      summary = summary || coalesce(v_summary, '{}'::jsonb),
      updated_at = now()
  where id = p_upload_id;

  return query
  select c.match_status, count(*)::bigint
  from public.norwyn_hotmart_validation_comparisons c
  where c.tenant_id = v_tenant_id
    and c.upload_id = p_upload_id
  group by c.match_status
  order by c.match_status;
end;
$$;

grant execute on function public.norwyn_rebuild_hotmart_validation_comparisons(uuid) to authenticated;

