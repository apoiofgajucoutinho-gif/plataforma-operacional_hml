alter table public.norwyn_landing_registry
  add column if not exists operation_mode text not null default 'SHADOW',
  add column if not exists external_owner text null,
  add column if not exists next_check_at timestamptz null,
  add column if not exists monitor_frequency_minutes integer not null default 720;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'norwyn_landing_registry_operation_mode_check'
      and conrelid = 'public.norwyn_landing_registry'::regclass
  ) then
    alter table public.norwyn_landing_registry
      add constraint norwyn_landing_registry_operation_mode_check
      check (operation_mode in ('SHADOW', 'ASSISTED', 'NORWYN_OWNED'));
  end if;
end $$;

create table if not exists public.norwyn_growth_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  incident_key text not null,
  title text not null,
  severity text not null check (severity in ('INFO', 'WARNING', 'CRITICAL', 'BLOCKER')),
  status text not null default 'DETECTED' check (status in ('DETECTED', 'REPORTED', 'ACKNOWLEDGED', 'FIX_IN_PROGRESS', 'RESOLVED', 'MONITORING', 'CLOSED')),
  operation_mode text not null default 'SHADOW' check (operation_mode in ('SHADOW', 'ASSISTED', 'NORWYN_OWNED')),
  external_owner text null,
  norwyn_role text not null default 'DETECT / DOCUMENT / MONITOR',
  detected_by text not null default 'Norwyn Campaign Readiness',
  detected_at timestamptz not null default now(),
  first_observed_at timestamptz null,
  last_observed_at timestamptz null,
  potential_impact text null,
  commercial_impact jsonb not null default '{}'::jsonb,
  confirmed_impact jsonb not null default '{}'::jsonb,
  potential_impact_data jsonb not null default '{}'::jsonb,
  unknowns jsonb not null default '[]'::jsonb,
  root_cause text null,
  prevention_rule text null,
  preflight_rule text null,
  automation_opportunity text null,
  debrief_draft jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, incident_key)
);

create table if not exists public.norwyn_growth_incident_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  incident_id uuid not null references public.norwyn_growth_incidents(id) on delete cascade,
  landing_id uuid null references public.norwyn_landing_registry(id) on delete set null,
  snapshot_id uuid null references public.norwyn_landing_snapshots(id) on delete set null,
  landing_key text not null,
  url text not null,
  content_hash text null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'AFFECTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, incident_id, landing_key)
);

create table if not exists public.norwyn_growth_playbook_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_key text not null,
  category text not null,
  severity text not null check (severity in ('INFO', 'WARNING', 'CRITICAL', 'BLOCKER')),
  title text not null,
  rule text not null,
  source_incident_id uuid null references public.norwyn_growth_incidents(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'APPROVED', 'ARCHIVED')),
  version text not null default '2026-08-13',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, rule_key)
);

create table if not exists public.norwyn_landing_monitor_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid null references public.norwyn_landing_registry(id) on delete set null,
  previous_snapshot_id uuid null references public.norwyn_landing_snapshots(id) on delete set null,
  current_snapshot_id uuid null references public.norwyn_landing_snapshots(id) on delete set null,
  campaign_key text not null,
  landing_key text not null,
  url text not null,
  status text not null check (status in ('NO_CHANGE', 'CHANGE_DETECTED', 'ERROR', 'UNAVAILABLE')),
  changed_fields jsonb not null default '[]'::jsonb,
  message text null,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.norwyn_growth_incidents enable row level security;
alter table public.norwyn_growth_incident_assets enable row level security;
alter table public.norwyn_growth_playbook_rules enable row level security;
alter table public.norwyn_landing_monitor_log enable row level security;

create index if not exists norwyn_growth_incidents_tenant_status_idx
on public.norwyn_growth_incidents (tenant_id, status, detected_at desc);

create index if not exists norwyn_growth_incident_assets_incident_idx
on public.norwyn_growth_incident_assets (tenant_id, incident_id, landing_key);

create index if not exists norwyn_growth_playbook_rules_tenant_category_idx
on public.norwyn_growth_playbook_rules (tenant_id, category, status);

create index if not exists norwyn_landing_monitor_log_tenant_landing_idx
on public.norwyn_landing_monitor_log (tenant_id, landing_key, detected_at desc);
