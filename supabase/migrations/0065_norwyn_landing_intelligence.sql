create table if not exists public.norwyn_landing_registry (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_key text not null,
  landing_key text not null,
  landing_name text not null,
  landing_version text not null,
  url text not null,
  product_id uuid null references public.products(id) on delete set null,
  hotmart_product_id text null,
  environment text not null default 'test',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, campaign_key, landing_key)
);

create table if not exists public.norwyn_landing_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.norwyn_landing_registry(id) on delete cascade,
  campaign_key text not null,
  landing_key text not null,
  url text not null,
  fetched_at timestamptz not null default now(),
  status_code integer null,
  content_hash text not null,
  content_length integer not null default 0,
  extracted_json jsonb not null default '{}'::jsonb,
  qa_summary jsonb not null default '{}'::jsonb,
  previous_snapshot_id uuid null references public.norwyn_landing_snapshots(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.norwyn_landing_qa_issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.norwyn_landing_registry(id) on delete cascade,
  snapshot_id uuid not null references public.norwyn_landing_snapshots(id) on delete cascade,
  campaign_key text not null,
  landing_key text not null,
  rule_id text not null,
  rule_version text not null,
  category text not null,
  severity text not null check (severity in ('PASS', 'INFO', 'WARNING', 'CRITICAL', 'BLOCKER')),
  status text not null default 'open',
  title text not null,
  description text null,
  recommendation text null,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.norwyn_landing_registry enable row level security;
alter table public.norwyn_landing_snapshots enable row level security;
alter table public.norwyn_landing_qa_issues enable row level security;

create index if not exists norwyn_landing_registry_tenant_campaign_idx
on public.norwyn_landing_registry (tenant_id, campaign_key, landing_key);

create index if not exists norwyn_landing_snapshots_tenant_landing_idx
on public.norwyn_landing_snapshots (tenant_id, landing_id, fetched_at desc);

create index if not exists norwyn_landing_qa_issues_tenant_landing_idx
on public.norwyn_landing_qa_issues (tenant_id, landing_id, severity, status);

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.growth_funnel_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%event_type%';

  if constraint_name is not null then
    execute format('alter table public.growth_funnel_events drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.growth_funnel_events
  add constraint growth_funnel_events_event_type_check
  check (event_type in (
    'LANDING_VIEW',
    'CTA_VIEW',
    'CTA_CLICK',
    'CHECKOUT_REDIRECT',
    'VSL_PLAY',
    'VSL_PROGRESS_25',
    'VSL_PROGRESS_50',
    'VSL_PROGRESS_75',
    'VSL_PROGRESS_90',
    'CTA',
    'VSL_CTA_VIEW',
    'VSL_CTA_CLICK',
    'CHECKOUT',
    'CHECKOUT_VIEW',
    'PURCHASE',
    'ORDER_BUMP',
    'UPSELL',
    'DOWNSELL',
    'TEST_DESTINATION_VIEW'
  ));
