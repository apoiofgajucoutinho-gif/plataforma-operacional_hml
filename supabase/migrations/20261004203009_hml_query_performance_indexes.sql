-- HML performance hardening for the read paths used by Comercial, Landing Pages,
-- Student 360 and Hotmart validation. No RLS or business data is changed.

create index if not exists comercial_recebiveis_tenant_data_prevista_idx
  on public.comercial_recebiveis (tenant_id, data_prevista asc nulls last);

create index if not exists comercial_vendas_tenant_data_compra_idx
  on public.comercial_vendas (tenant_id, data_compra desc nulls last);

create index if not exists comercial_vendas_tenant_lower_email_idx
  on public.comercial_vendas (tenant_id, lower(comprador_email))
  where comprador_email is not null;

create index if not exists landing_page_tracking_tenant_landing_occurred_idx
  on public.landing_page_tracking_events (tenant_id, landing_key, occurred_at desc);

create index if not exists hotmart_validation_comparisons_upload_created_idx
  on public.norwyn_hotmart_validation_comparisons
    (tenant_id, upload_id, created_at desc nulls last);

analyze public.comercial_recebiveis;
analyze public.comercial_vendas;
analyze public.landing_page_tracking_events;
analyze public.norwyn_hotmart_validation_comparisons;
