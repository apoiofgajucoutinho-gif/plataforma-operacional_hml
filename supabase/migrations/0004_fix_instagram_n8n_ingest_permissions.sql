alter function app_private.parse_ptbr_date(text)
set search_path = app_private, public, pg_temp;

alter function app_private.parse_ptbr_timestamp(text)
set search_path = app_private, public, pg_temp;

alter function app_private.normalize_instagram_post_type(text)
set search_path = app_private, public, pg_temp;

alter function app_private.classify_instagram_engagement(numeric)
set search_path = app_private, public, pg_temp;

alter function app_private.instagram_n8n_import_rows_insert()
security definer
set search_path = app_private, public, pg_temp;

grant usage on schema app_private to service_role;
grant insert, select on public.instagram_n8n_import_rows to authenticated, service_role;

grant select, insert, update on public.tenants to service_role;
grant select, insert, update on public.instagram_accounts to service_role;
grant select, insert, update on public.instagram_posts to service_role;
grant select, insert, update on public.instagram_metrics to service_role;
grant select, insert, update on public.instagram_import_runs to service_role;
