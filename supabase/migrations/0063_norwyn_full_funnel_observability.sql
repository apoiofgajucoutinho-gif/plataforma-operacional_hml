alter table public.instagram_ads_daily
  add column if not exists campaign_id text,
  add column if not exists adset_id text,
  add column if not exists ad_id text,
  add column if not exists creative_id text,
  add column if not exists creative_name text,
  add column if not exists placement text,
  add column if not exists publisher_platform text,
  add column if not exists device_platform text,
  add column if not exists link_clicks integer not null default 0,
  add column if not exists landing_page_views integer not null default 0,
  add column if not exists initiate_checkouts integer not null default 0,
  add column if not exists meta_purchases integer not null default 0,
  add column if not exists meta_purchase_value numeric(14,2) not null default 0,
  add column if not exists cost_per_result numeric(14,4),
  add column if not exists video_views integer not null default 0,
  add column if not exists video_plays_3s integer not null default 0,
  add column if not exists video_p25 integer not null default 0,
  add column if not exists video_p50 integer not null default 0,
  add column if not exists video_p75 integer not null default 0,
  add column if not exists video_p95 integer not null default 0,
  add column if not exists video_p100 integer not null default 0,
  add column if not exists thruplays integer not null default 0,
  add column if not exists preview_url text,
  add column if not exists thumbnail_url text,
  add column if not exists destination_url text;

create or replace function app_private.meta_action_value(actions jsonb, action_keys text[])
returns integer
language sql
immutable
as $$
  select coalesce(sum((action->>'value')::numeric), 0)::integer
  from jsonb_array_elements(coalesce(actions, '[]'::jsonb)) action
  where lower(action->>'action_type') = any(action_keys);
$$;

update public.instagram_ads_daily
set
  campaign_id = coalesce(campaign_id, nullif(raw_payload->>'campaign_id', '')),
  adset_id = coalesce(adset_id, nullif(raw_payload->>'adset_id', '')),
  ad_id = coalesce(ad_id, nullif(raw_payload->>'ad_id', '')),
  creative_id = coalesce(creative_id, nullif(raw_payload->>'creative_id', '')),
  creative_name = coalesce(creative_name, nullif(raw_payload->>'creative_name', '')),
  placement = coalesce(placement, nullif(raw_payload->>'placement', '')),
  publisher_platform = coalesce(publisher_platform, nullif(raw_payload->>'publisher_platform', '')),
  device_platform = coalesce(device_platform, nullif(raw_payload->>'device_platform', '')),
  link_clicks = greatest(link_clicks, app_private.meta_action_value(raw_payload->'actions', array['link_click'])),
  landing_page_views = greatest(landing_page_views, app_private.meta_action_value(raw_payload->'actions', array['landing_page_view','omni_landing_page_view'])),
  initiate_checkouts = greatest(initiate_checkouts, app_private.meta_action_value(raw_payload->'actions', array['initiate_checkout','offsite_conversion.fb_pixel_initiate_checkout','omni_initiated_checkout','onsite_web_initiate_checkout'])),
  meta_purchases = greatest(meta_purchases, app_private.meta_action_value(raw_payload->'actions', array['purchase','omni_purchase','offsite_conversion.fb_pixel_purchase','onsite_conversion.purchase'])),
  video_views = greatest(video_views, app_private.meta_action_value(raw_payload->'actions', array['video_view'])),
  video_plays_3s = greatest(video_plays_3s, app_private.meta_action_value(raw_payload->'actions', array['video_view','video_play'])),
  video_p25 = greatest(video_p25, app_private.meta_action_value(raw_payload->'video_p25_watched_actions', array['video_view'])),
  video_p50 = greatest(video_p50, app_private.meta_action_value(raw_payload->'video_p50_watched_actions', array['video_view'])),
  video_p75 = greatest(video_p75, app_private.meta_action_value(raw_payload->'video_p75_watched_actions', array['video_view'])),
  video_p95 = greatest(video_p95, app_private.meta_action_value(raw_payload->'video_p95_watched_actions', array['video_view'])),
  video_p100 = greatest(video_p100, app_private.meta_action_value(raw_payload->'video_p100_watched_actions', array['video_view'])),
  thruplays = greatest(thruplays, app_private.meta_action_value(raw_payload->'video_thruplay_watched_actions', array['video_view','thruplay'])),
  preview_url = coalesce(preview_url, nullif(raw_payload->>'preview_url', '')),
  thumbnail_url = coalesce(thumbnail_url, nullif(raw_payload->>'thumbnail_url', '')),
  destination_url = coalesce(destination_url, nullif(raw_payload->>'destination_url', ''))
where raw_payload is not null;

create index if not exists instagram_ads_daily_tenant_campaign_id_idx
on public.instagram_ads_daily (tenant_id, campaign_id);

create index if not exists instagram_ads_daily_tenant_ad_ids_idx
on public.instagram_ads_daily (tenant_id, campaign_id, adset_id, ad_id);

create table if not exists public.growth_funnel_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  funnel_session_id text not null,
  environment text not null default 'production' check (environment in ('production', 'test')),
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  meta_creative_id text,
  campaign_key text,
  audience_key text,
  creative_key text,
  source_sck text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  click_id text,
  landing_url text,
  checkout_url text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, funnel_session_id)
);

create table if not exists public.growth_funnel_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  funnel_session_id text not null,
  event_type text not null check (event_type in (
    'LANDING_VIEW',
    'VSL_PLAY',
    'VSL_PROGRESS_25',
    'VSL_PROGRESS_50',
    'VSL_PROGRESS_75',
    'VSL_PROGRESS_90',
    'CTA',
    'CHECKOUT',
    'PURCHASE',
    'ORDER_BUMP',
    'UPSELL',
    'DOWNSELL'
  )),
  environment text not null default 'production' check (environment in ('production', 'test')),
  occurred_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  meta_creative_id text,
  campaign_key text,
  audience_key text,
  creative_key text,
  source_sck text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  click_id text,
  page_url text,
  provider text not null default 'norwyn_tracking',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists growth_funnel_sessions_tenant_session_idx
on public.growth_funnel_sessions (tenant_id, funnel_session_id);

create index if not exists growth_funnel_events_tenant_occurred_idx
on public.growth_funnel_events (tenant_id, occurred_at desc);

create index if not exists growth_funnel_events_tenant_meta_idx
on public.growth_funnel_events (tenant_id, meta_campaign_id, meta_adset_id, meta_ad_id);

drop trigger if exists growth_funnel_sessions_set_updated_at on public.growth_funnel_sessions;
create trigger growth_funnel_sessions_set_updated_at
before update on public.growth_funnel_sessions
for each row execute function app_private.set_updated_at();

alter table public.growth_funnel_sessions enable row level security;
alter table public.growth_funnel_events enable row level security;

drop policy if exists "growth funnel sessions read" on public.growth_funnel_sessions;
create policy "growth funnel sessions read" on public.growth_funnel_sessions for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth funnel sessions write" on public.growth_funnel_sessions;
create policy "growth funnel sessions write" on public.growth_funnel_sessions for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "growth funnel events read" on public.growth_funnel_events;
create policy "growth funnel events read" on public.growth_funnel_events for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth funnel events write" on public.growth_funnel_events;
create policy "growth funnel events write" on public.growth_funnel_events for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.growth_funnel_sessions to authenticated;
grant select, insert, update, delete on public.growth_funnel_events to authenticated;
