alter table public.instagram_ads_daily
  add column if not exists destination_domain text,
  add column if not exists url_tags text,
  add column if not exists landing_key text;

create index if not exists instagram_ads_daily_landing_key_idx
on public.instagram_ads_daily (tenant_id, landing_key, data_referencia);

create index if not exists instagram_ads_daily_destination_domain_idx
on public.instagram_ads_daily (tenant_id, destination_domain);
