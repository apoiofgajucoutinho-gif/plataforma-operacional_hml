create table if not exists public.norwyn_product_journey_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_product_id uuid references public.products(id) on delete cascade,
  to_product_id uuid references public.products(id) on delete cascade,
  relationship_type text not null,
  status text not null default 'OBSERVED',
  observed_buyers integer not null default 0,
  median_days_to_next numeric,
  avg_days_to_next numeric,
  revenue_after numeric not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_product_journey_edges_type_chk check (relationship_type in ('cross_sell', 'ascension', 'retention', 'bundle', 'unknown')),
  constraint norwyn_product_journey_edges_status_chk check (status in ('OBSERVED', 'HYPOTHESIS', 'APPROVED_STRATEGY')),
  constraint norwyn_product_journey_edges_unique unique (tenant_id, from_product_id, to_product_id, status)
);

create table if not exists public.norwyn_lifecycle_eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_key text not null,
  version integer not null default 1,
  name text not null,
  source_product_id uuid references public.products(id) on delete set null,
  target_product_id uuid references public.products(id) on delete set null,
  exclusion_days integer not null default 30,
  include_with_formation boolean not null default true,
  status text not null default 'draft',
  rules jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_lifecycle_eligibility_rules_status_chk check (status in ('draft', 'active', 'paused', 'archived')),
  constraint norwyn_lifecycle_eligibility_rules_unique unique (tenant_id, rule_key, version)
);

create table if not exists public.norwyn_lifecycle_eligibility_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_id uuid references public.norwyn_lifecycle_eligibility_rules(id) on delete set null,
  run_key text not null,
  status text not null default 'DRY_RUN',
  total integer not null default 0,
  eligible integer not null default 0,
  excluded integer not null default 0,
  needs_review integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_lifecycle_eligibility_runs_status_chk check (status in ('DRY_RUN', 'APPROVED', 'EXECUTED', 'CANCELLED')),
  constraint norwyn_lifecycle_eligibility_runs_unique unique (tenant_id, run_key)
);

create table if not exists public.norwyn_lifecycle_eligibility_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.norwyn_lifecycle_eligibility_runs(id) on delete cascade,
  person_key text not null,
  customer_hash text not null,
  status text not null,
  owned_product_ids uuid[] not null default '{}',
  source_product_id uuid references public.products(id) on delete set null,
  target_product_id uuid references public.products(id) on delete set null,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  ltv_commercial numeric not null default 0,
  has_formation boolean not null default false,
  eligibility_reasons jsonb not null default '[]'::jsonb,
  exclusion_reasons jsonb not null default '[]'::jsonb,
  confidence text not null default 'HIGH',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_lifecycle_eligibility_members_status_chk check (status in ('ELIGIBLE', 'EXCLUDED', 'NEEDS_REVIEW')),
  constraint norwyn_lifecycle_eligibility_members_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint norwyn_lifecycle_eligibility_members_unique unique (tenant_id, run_id, person_key)
);

create table if not exists public.norwyn_customer_offer_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_key text not null,
  customer_hash text not null,
  journey_key text,
  offer_key text,
  channel text,
  event_type text not null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  source_event_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_customer_offer_events_type_chk check (event_type in ('ELIGIBLE', 'ENTERED_JOURNEY', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_OPEN', 'LINK_CLICK', 'WHATSAPP_SENT', 'LANDING_VIEW', 'CHECKOUT', 'PURCHASE', 'REFUND', 'EXITED_JOURNEY', 'MANUAL_CONTACT', 'EXCLUDED', 'NOT_INSTRUMENTED'))
);

create table if not exists public.norwyn_lifecycle_experiments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  experiment_key text not null,
  name text not null,
  hypothesis text not null,
  target_cohort text not null,
  offer text not null,
  source_product_id uuid references public.products(id) on delete set null,
  target_product_id uuid references public.products(id) on delete set null,
  control_variant text,
  test_variant text,
  status text not null default 'planned',
  start_at timestamptz,
  end_at timestamptz,
  sample_size integer,
  eligibility_rule_id uuid references public.norwyn_lifecycle_eligibility_rules(id) on delete set null,
  exclusions jsonb not null default '[]'::jsonb,
  channels jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  confidence text not null default 'UNKNOWN',
  conclusion text,
  decision text,
  learning_id uuid references public.norwyn_campaign_learnings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_lifecycle_experiments_status_chk check (status in ('planned', 'approved', 'running', 'completed', 'inconclusive', 'cancelled')),
  constraint norwyn_lifecycle_experiments_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint norwyn_lifecycle_experiments_unique unique (tenant_id, experiment_key)
);

create index if not exists norwyn_lifecycle_members_run_idx on public.norwyn_lifecycle_eligibility_members (tenant_id, run_id, status);
create index if not exists norwyn_customer_offer_events_person_idx on public.norwyn_customer_offer_events (tenant_id, person_key, occurred_at desc);
create index if not exists norwyn_lifecycle_experiments_status_idx on public.norwyn_lifecycle_experiments (tenant_id, status);

alter table public.norwyn_product_journey_edges enable row level security;
alter table public.norwyn_lifecycle_eligibility_rules enable row level security;
alter table public.norwyn_lifecycle_eligibility_runs enable row level security;
alter table public.norwyn_lifecycle_eligibility_members enable row level security;
alter table public.norwyn_customer_offer_events enable row level security;
alter table public.norwyn_lifecycle_experiments enable row level security;

drop policy if exists "norwyn lifecycle read edges" on public.norwyn_product_journey_edges;
create policy "norwyn lifecycle read edges" on public.norwyn_product_journey_edges for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write edges" on public.norwyn_product_journey_edges;
create policy "norwyn lifecycle write edges" on public.norwyn_product_journey_edges for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read rules" on public.norwyn_lifecycle_eligibility_rules;
create policy "norwyn lifecycle read rules" on public.norwyn_lifecycle_eligibility_rules for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write rules" on public.norwyn_lifecycle_eligibility_rules;
create policy "norwyn lifecycle write rules" on public.norwyn_lifecycle_eligibility_rules for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read runs" on public.norwyn_lifecycle_eligibility_runs;
create policy "norwyn lifecycle read runs" on public.norwyn_lifecycle_eligibility_runs for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write runs" on public.norwyn_lifecycle_eligibility_runs;
create policy "norwyn lifecycle write runs" on public.norwyn_lifecycle_eligibility_runs for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read members" on public.norwyn_lifecycle_eligibility_members;
create policy "norwyn lifecycle read members" on public.norwyn_lifecycle_eligibility_members for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write members" on public.norwyn_lifecycle_eligibility_members;
create policy "norwyn lifecycle write members" on public.norwyn_lifecycle_eligibility_members for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read offer events" on public.norwyn_customer_offer_events;
create policy "norwyn lifecycle read offer events" on public.norwyn_customer_offer_events for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write offer events" on public.norwyn_customer_offer_events;
create policy "norwyn lifecycle write offer events" on public.norwyn_customer_offer_events for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read experiments" on public.norwyn_lifecycle_experiments;
create policy "norwyn lifecycle read experiments" on public.norwyn_lifecycle_experiments for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write experiments" on public.norwyn_lifecycle_experiments;
create policy "norwyn lifecycle write experiments" on public.norwyn_lifecycle_experiments for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on
  public.norwyn_product_journey_edges,
  public.norwyn_lifecycle_eligibility_rules,
  public.norwyn_lifecycle_eligibility_runs,
  public.norwyn_lifecycle_eligibility_members,
  public.norwyn_customer_offer_events,
  public.norwyn_lifecycle_experiments
to authenticated;
