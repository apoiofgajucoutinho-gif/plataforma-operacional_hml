create extension if not exists pgcrypto;

create table if not exists public.digital_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  url text not null,
  asset_type text not null check (asset_type in ('main_site','internal_page','landing_page','checkout','support','form','other')),
  parent_asset_id uuid references public.digital_assets(id) on delete set null,
  environment text not null default 'external' check (environment in ('prod','hml','dev','external','prod_external')),
  owner text,
  is_critical boolean not null default false,
  monitoring_enabled boolean not null default true,
  monitor_content boolean not null default true,
  monitor_links boolean not null default true,
  monitor_performance boolean not null default true,
  expected_content text[] not null default '{}',
  forbidden_patterns text[] not null default '{casino,bet,aposta,slot,crypto spam,adult,pharma spam}',
  expected_elements jsonb not null default '[]'::jsonb,
  allowed_domains text[] not null default '{}',
  thresholds jsonb not null default '{"healthy_ms":1500,"warning_ms":3000,"ssl_expiry_warning_days":21,"critical_change_percent":55,"relevant_change_percent":30}'::jsonb,
  discovery_status text not null default 'none' check (discovery_status in ('none','pending_review','reviewed')),
  last_check_id uuid,
  last_checked_at timestamptz,
  last_health_score integer,
  last_status text check (last_status in ('healthy','warning','critical','unknown')),
  last_fingerprint text,
  last_change_level text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, url)
);

create table if not exists public.presence_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  asset_id uuid not null references public.digital_assets(id) on delete cascade,
  checked_at timestamptz not null default now(),
  http_status integer,
  status_family text,
  response_time_ms integer,
  is_available boolean not null default false,
  ssl_ok boolean,
  ssl_expires_at timestamptz,
  redirects_count integer not null default 0,
  final_url text,
  unexpected_redirect boolean not null default false,
  broken_links_count integer not null default 0,
  checked_links_count integer not null default 0,
  content_status text not null default 'unknown' check (content_status in ('ok','missing_expected','suspicious','changed','unknown')),
  content_hash text,
  content_change_percent numeric(5,2),
  content_change_level text not null default 'unknown' check (content_change_level in ('normal','relevant','critical','unknown')),
  missing_expected text[] not null default '{}',
  suspicious_matches text[] not null default '{}',
  missing_elements text[] not null default '{}',
  health_score integer not null default 0,
  status text not null default 'unknown' check (status in ('healthy','warning','critical','unknown')),
  score_explanation text[] not null default '{}',
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.digital_assets
  add constraint digital_assets_last_check_fk foreign key (last_check_id) references public.presence_checks(id) on delete set null;

create table if not exists public.presence_discovered_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  source_asset_id uuid not null references public.digital_assets(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  label text,
  domain text,
  status text not null default 'pending' check (status in ('pending','monitor','ignore','critical')),
  reason text,
  http_status integer,
  response_time_ms integer,
  created_asset_id uuid references public.digital_assets(id) on delete set null,
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (tenant_id, source_asset_id, normalized_url)
);

create table if not exists public.presence_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  asset_id uuid not null references public.digital_assets(id) on delete cascade,
  severity text not null check (severity in ('low','medium','high','critical')),
  incident_type text not null check (incident_type in ('site_down','http_error','slow_response','ssl_problem','broken_link','unexpected_redirect','content_change','suspicious_content','missing_element','checkout_problem','other')),
  title text not null,
  description text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','ignored')),
  evidence jsonb not null default '{}'::jsonb,
  last_check_id uuid references public.presence_checks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.presence_alert_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  channel text not null check (channel in ('in_app','telegram','whatsapp','email')),
  name text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists digital_assets_tenant_status_idx on public.digital_assets(tenant_id, monitoring_enabled, last_status);
create index if not exists presence_checks_asset_checked_idx on public.presence_checks(asset_id, checked_at desc);
create index if not exists presence_incidents_asset_status_idx on public.presence_incidents(asset_id, status, detected_at desc);
create index if not exists presence_discovered_links_source_status_idx on public.presence_discovered_links(source_asset_id, status);

alter table public.digital_assets enable row level security;
alter table public.presence_checks enable row level security;
alter table public.presence_discovered_links enable row level security;
alter table public.presence_incidents enable row level security;
alter table public.presence_alert_channels enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'digital_assets' and policyname = 'tenant members can read digital assets') then
    create policy "tenant members can read digital assets" on public.digital_assets for select to authenticated using (exists (select 1 from public.tenant_members tm where tm.tenant_id = digital_assets.tenant_id and tm.user_id = (select auth.uid()) and tm.ativo = true));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'presence_checks' and policyname = 'tenant members can read presence checks') then
    create policy "tenant members can read presence checks" on public.presence_checks for select to authenticated using (exists (select 1 from public.tenant_members tm where tm.tenant_id = presence_checks.tenant_id and tm.user_id = (select auth.uid()) and tm.ativo = true));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'presence_discovered_links' and policyname = 'tenant members can read discovered links') then
    create policy "tenant members can read discovered links" on public.presence_discovered_links for select to authenticated using (exists (select 1 from public.tenant_members tm where tm.tenant_id = presence_discovered_links.tenant_id and tm.user_id = (select auth.uid()) and tm.ativo = true));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'presence_incidents' and policyname = 'tenant members can read presence incidents') then
    create policy "tenant members can read presence incidents" on public.presence_incidents for select to authenticated using (exists (select 1 from public.tenant_members tm where tm.tenant_id = presence_incidents.tenant_id and tm.user_id = (select auth.uid()) and tm.ativo = true));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'presence_alert_channels' and policyname = 'tenant members can read alert channels') then
    create policy "tenant members can read alert channels" on public.presence_alert_channels for select to authenticated using (exists (select 1 from public.tenant_members tm where tm.tenant_id = presence_alert_channels.tenant_id and tm.user_id = (select auth.uid()) and tm.ativo = true));
  end if;
end $$;

insert into public.digital_assets (
  tenant_id,
  name,
  url,
  asset_type,
  environment,
  owner,
  is_critical,
  monitoring_enabled,
  expected_content,
  allowed_domains,
  metadata
)
select
  t.id,
  'Site principal Juliana Coutinho',
  'https://fgajulianacoutinho.com.br/',
  'main_site',
  'prod_external',
  'Juliana Coutinho',
  true,
  true,
  array['Juliana Coutinho'],
  array['fgajulianacoutinho.com.br'],
  '{"source":"presence_center_seed","notes":"Monitoramento somente leitura via GET/HEAD."}'::jsonb
from public.tenants t
where lower(t.nome) like '%juliana%coutinho%'
on conflict (tenant_id, url) do update set
  name = excluded.name,
  asset_type = excluded.asset_type,
  environment = excluded.environment,
  owner = excluded.owner,
  is_critical = true,
  monitoring_enabled = true,
  expected_content = excluded.expected_content,
  allowed_domains = excluded.allowed_domains,
  updated_at = now();