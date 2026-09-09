alter table public.presence_discovered_links
  add column if not exists anchor_text text,
  add column if not exists suggested_asset_type text default 'internal_page',
  add column if not exists reviewed_by uuid,
  add column if not exists evidence jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.presence_discovered_links
  drop constraint if exists presence_discovered_links_suggested_asset_type_check;

alter table public.presence_discovered_links
  add constraint presence_discovered_links_suggested_asset_type_check
  check (suggested_asset_type in ('main_site','internal_page','landing_page','checkout','support','form','other'));