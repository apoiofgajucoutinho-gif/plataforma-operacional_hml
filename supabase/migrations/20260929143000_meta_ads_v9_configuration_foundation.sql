alter table public.instagram_ads_daily
  alter column meta_purchase_value drop not null,
  alter column video_views drop not null,
  alter column video_plays_3s drop not null,
  alter column video_p25 drop not null,
  alter column video_p50 drop not null,
  alter column video_p75 drop not null,
  alter column video_p95 drop not null,
  alter column video_p100 drop not null,
  alter column thruplays drop not null,
  add column if not exists unique_clicks integer,
  add column if not exists unique_link_clicks integer,
  add column if not exists unique_link_ctr numeric(12,6),
  add column if not exists cost_per_unique_link_click numeric(14,4),
  add column if not exists outbound_clicks integer,
  add column if not exists unique_outbound_clicks integer,
  add column if not exists unique_ctr numeric(12,6),
  add column if not exists cost_per_unique_click numeric(14,4),
  add column if not exists cost_per_landing_page_view numeric(14,4),
  add column if not exists cost_per_checkout numeric(14,4),
  add column if not exists meta_purchase_roas numeric(14,6),
  add column if not exists quality_ranking text,
  add column if not exists engagement_rate_ranking text,
  add column if not exists conversion_rate_ranking text,
  add column if not exists audience_type text,
  add column if not exists audience_label text,
  add column if not exists targeting_summary text,
  add column if not exists audience_confidence text,
  add column if not exists audience_evidence jsonb,
  add column if not exists creative_format text,
  add column if not exists creative_body text,
  add column if not exists creative_headline text,
  add column if not exists creative_description text,
  add column if not exists creative_cta text,
  add column if not exists creative_image_url text,
  add column if not exists creative_video_id text,
  add column if not exists creative_video_duration_seconds numeric(12,3),
  add column if not exists object_story_id text,
  add column if not exists instagram_permalink_url text,
  add column if not exists config_snapshot_hash text;

create index if not exists instagram_ads_daily_tenant_audience_idx
on public.instagram_ads_daily (tenant_id, audience_type, data_referencia desc);

create table if not exists public.instagram_ads_config_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null check (entity_type in ('campaign', 'adset', 'ad', 'creative', 'audience', 'video')),
  entity_id text not null,
  entity_name text,
  parent_ids jsonb not null default '{}'::jsonb,
  config_hash text not null,
  config_json jsonb not null,
  audience_type text,
  audience_label text,
  targeting_summary text,
  audience_confidence text,
  audience_evidence jsonb,
  source text not null default 'meta_graph_api',
  graph_version text not null default 'v23.0',
  collector_version text not null default 'v9',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (tenant_id, entity_type, entity_id, config_hash)
);

create index if not exists instagram_ads_config_snapshots_latest_idx
on public.instagram_ads_config_snapshots (tenant_id, entity_type, entity_id, last_seen_at desc);

alter table public.instagram_ads_config_snapshots enable row level security;

drop policy if exists "ads config snapshots admin read" on public.instagram_ads_config_snapshots;
create policy "ads config snapshots admin read"
on public.instagram_ads_config_snapshots for select to authenticated
using (app_private.current_role(tenant_id) = 'ADMIN');

grant select on public.instagram_ads_config_snapshots to authenticated;

comment on table public.instagram_ads_config_snapshots is
  'Immutable-by-hash Meta configuration snapshots. Repeated unchanged payloads update last_seen_at instead of creating daily copies.';
