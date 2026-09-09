-- Hotfix P0: rebuild function without ambiguous output names.

drop function if exists public.norwyn_rebuild_hotmart_validation_comparisons(uuid);

create function public.norwyn_rebuild_hotmart_validation_comparisons(p_upload_id uuid)
returns table(result_status text, result_total bigint)
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_summary jsonb;
begin
  select u.tenant_id into v_tenant_id
  from public.norwyn_validation_uploads u
  where u.id = p_upload_id;

  if v_tenant_id is null then
    raise exception 'Validation upload not found: %', p_upload_id;
  end if;

  update public.norwyn_validation_uploads u
  set status = 'processing', updated_at = now()
  where u.id = p_upload_id;

  update public.norwyn_hotmart_validation_rows r
  set normalized_transaction_id = public.norwyn_normalize_transaction_id(r.transaction_id),
      canonical_status = public.norwyn_canonical_hotmart_status(coalesce(r.raw_status, r.canonical_status)),
      event_class = 'SALE_TRANSACTION',
      sale_comparable = public.norwyn_hotmart_sale_comparable(coalesce(r.raw_status, r.canonical_status), r.transaction_id)
  where r.upload_id = p_upload_id;

  delete from public.norwyn_hotmart_validation_comparisons c
  where c.upload_id = p_upload_id;

  insert into public.norwyn_hotmart_validation_comparisons (
    tenant_id, upload_id, validation_row_id, norwyn_sale_id, transaction_id, normalized_transaction_id,
    match_status, difference_types, official_snapshot, norwyn_snapshot, event_class, sale_comparable
  )
  with official_ranked as (
    select r.*,
           row_number() over (partition by r.normalized_transaction_id order by r.source_file, r.source_row, r.id) as row_rank
    from public.norwyn_hotmart_validation_rows r
    where r.tenant_id = v_tenant_id
      and r.upload_id = p_upload_id
      and r.normalized_transaction_id is not null
      and r.sale_comparable = true
  ), official as (
    select * from official_ranked where row_rank = 1
  ), norwyn_classified as (
    select cv.*,
           public.norwyn_normalize_transaction_id(cv.transaction_id) as normalized_id,
           public.norwyn_canonical_hotmart_status(coalesce(cv.status_original, cv.status_normalizado, cv.status)) as canonical_status_calc,
           public.norwyn_hotmart_event_class(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as event_class_calc,
           public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as sale_comparable_calc
    from public.comercial_vendas cv
    where cv.tenant_id = v_tenant_id
  ), norwyn_ranked as (
    select n.*,
           row_number() over (partition by n.normalized_id order by n.updated_at desc nulls last, n.created_at desc nulls last, n.id) as row_rank,
           count(*) over (partition by n.normalized_id) as duplicate_count
    from norwyn_classified n
    where n.sale_comparable_calc = true
      and n.normalized_id is not null
  ), norwyn_sales as (
    select * from norwyn_ranked where row_rank = 1
  ), joined as (
    select o.id as validation_row_id,
           n.id as norwyn_sale_id,
           coalesce(o.transaction_id, n.transaction_id) as raw_transaction_id,
           coalesce(o.normalized_transaction_id, n.normalized_id) as normalized_id,
           o.canonical_status as official_canonical_status,
           n.canonical_status_calc as norwyn_canonical_status,
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
           to_jsonb(o) as official_json,
           to_jsonb(n) as norwyn_json,
           coalesce(n.duplicate_count, 0) as duplicate_count
    from official o
    full join norwyn_sales n on n.normalized_id = o.normalized_transaction_id
  ), compared as (
    select j.*,
           array_remove(array[
             case when j.official_canonical_status is not null and j.norwyn_canonical_status is not null and j.official_canonical_status <> j.norwyn_canonical_status then 'status' end,
             case when j.official_currency is not null and j.norwyn_currency is not null and j.official_currency <> j.norwyn_currency then 'currency' end,
             case when j.official_currency = 'BRL' and j.norwyn_currency = 'BRL' and j.official_value is not null and j.norwyn_value is not null and abs(j.official_value - j.norwyn_value) > 0.01 then 'value' end,
             case when j.official_product_id is not null and j.norwyn_product_id is not null and j.official_product_id <> j.norwyn_product_id then 'product' end,
             case when j.official_buyer_email is not null and j.norwyn_buyer_email is not null and lower(j.official_buyer_email) <> lower(j.norwyn_buyer_email) then 'buyer' end,
             case when j.official_purchase_date is not null and j.norwyn_purchase_date is not null and j.official_purchase_date::date <> j.norwyn_purchase_date::date then 'date' end,
             case when j.duplicate_count > 1 then 'duplicate_norwyn_transaction_id' end
           ], null) as diffs
    from joined j
  )
  select v_tenant_id,
         p_upload_id,
         compared.validation_row_id,
         compared.norwyn_sale_id,
         compared.raw_transaction_id,
         compared.normalized_id,
         case
           when compared.validation_row_id is null then 'ONLY_NORWYN'
           when compared.norwyn_sale_id is null then 'ONLY_HOTMART'
           when cardinality(compared.diffs) = 0 then 'MATCH_EXACT'
           else 'MATCH_DIVERGENT'
         end,
         compared.diffs,
         case when compared.validation_row_id is null then '{}'::jsonb else compared.official_json end,
         coalesce(compared.norwyn_json, '{}'::jsonb),
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
         x.id,
         x.transaction_id,
         x.normalized_id,
         'NON_COMPARABLE',
         array[x.event_class_calc],
         '{}'::jsonb,
         to_jsonb(x),
         x.event_class_calc,
         false
  from (
    select cv.*,
           public.norwyn_normalize_transaction_id(cv.transaction_id) as normalized_id,
           public.norwyn_hotmart_event_class(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as event_class_calc,
           public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) as sale_comparable_calc
    from public.comercial_vendas cv
    where cv.tenant_id = v_tenant_id
  ) x
  where x.sale_comparable_calc = false;

  select jsonb_build_object(
    'comparison_counts', coalesce(jsonb_object_agg(q.match_status, q.total), '{}'::jsonb),
    'hotmart_total', (select count(distinct r.normalized_transaction_id) from public.norwyn_hotmart_validation_rows r where r.upload_id = p_upload_id and r.normalized_transaction_id is not null and r.sale_comparable = true),
    'norwyn_raw_events', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id),
    'norwyn_sale_comparable', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id)),
    'non_comparable_events', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and not public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id)),
    'club_events', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and coalesce(cv.status_original, cv.status_normalizado, cv.status) in ('CLUB_FIRST_ACCESS','CLUB_MODULE_COMPLETED')),
    'unknown_sale_status', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) and public.norwyn_canonical_hotmart_status(coalesce(cv.status_original, cv.status_normalizado, cv.status)) = 'UNKNOWN'),
    'brl_commercial_confirmed', (select coalesce(sum(cv.valor_bruto),0) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and cv.moeda = 'BRL' and public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id) and public.norwyn_canonical_hotmart_status(coalesce(cv.status_original, cv.status_normalizado, cv.status)) in ('APPROVED','COMPLETED')),
    'non_brl_commercial', (select count(*) from public.comercial_vendas cv where cv.tenant_id = v_tenant_id and cv.moeda <> 'BRL' and public.norwyn_hotmart_sale_comparable(coalesce(cv.status_original, cv.status_normalizado, cv.status), cv.transaction_id))
  ) into v_summary
  from (
    select c.match_status, count(*) as total
    from public.norwyn_hotmart_validation_comparisons c
    where c.tenant_id = v_tenant_id and c.upload_id = p_upload_id
    group by c.match_status
  ) q;

  update public.norwyn_validation_uploads u
  set status = 'compared', summary = u.summary || coalesce(v_summary, '{}'::jsonb), updated_at = now()
  where u.id = p_upload_id;

  return query
  select c.match_status, count(*)::bigint
  from public.norwyn_hotmart_validation_comparisons c
  where c.tenant_id = v_tenant_id and c.upload_id = p_upload_id
  group by c.match_status
  order by c.match_status;
end;
$$;

grant execute on function public.norwyn_rebuild_hotmart_validation_comparisons(uuid) to authenticated;


