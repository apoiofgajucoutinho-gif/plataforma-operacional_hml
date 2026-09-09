create table if not exists public.norwyn_customer_channel_statuses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_key text not null,
  customer_hash text not null,
  email_status text not null default 'UNKNOWN',
  whatsapp_status text not null default 'UNKNOWN',
  instagram_manychat_status text not null default 'UNKNOWN',
  commercial_block boolean not null default false,
  commercial_block_reason text,
  source text not null default 'norwyn',
  evidence jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint norwyn_customer_channel_statuses_email_chk check (email_status in ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN')),
  constraint norwyn_customer_channel_statuses_whatsapp_chk check (whatsapp_status in ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN')),
  constraint norwyn_customer_channel_statuses_instagram_chk check (instagram_manychat_status in ('AVAILABLE', 'BLOCKED', 'UNKNOWN')),
  constraint norwyn_customer_channel_statuses_unique unique (tenant_id, person_key)
);

create table if not exists public.norwyn_lifecycle_exposure_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_key text not null,
  journey_key text not null,
  offer_key text not null,
  version integer not null default 1,
  cooldown_days integer,
  max_exposures integer,
  exit_on_purchase boolean not null default true,
  exit_on_optout boolean not null default true,
  exit_on_block boolean not null default true,
  status text not null default 'draft',
  requires_human_approval boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_lifecycle_exposure_rules_status_chk check (status in ('draft', 'active', 'paused', 'archived')),
  constraint norwyn_lifecycle_exposure_rules_unique unique (tenant_id, rule_key, version),
  constraint norwyn_lifecycle_exposure_rules_cooldown_chk check (cooldown_days is null or cooldown_days >= 0),
  constraint norwyn_lifecycle_exposure_rules_max_chk check (max_exposures is null or max_exposures >= 1)
);

create table if not exists public.norwyn_lifecycle_execution_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  experiment_id uuid references public.norwyn_lifecycle_experiments(id) on delete set null,
  run_id uuid references public.norwyn_lifecycle_eligibility_runs(id) on delete set null,
  approval_key text not null,
  status text not null default 'review_required',
  channel text not null default 'EMAIL',
  offer_key text not null,
  sequence_key text,
  total integer not null default 0,
  eligible integer not null default 0,
  ready_to_send integer not null default 0,
  opted_out integer not null default 0,
  commercial_blocked integer not null default 0,
  unknown_consent integer not null default 0,
  already_exposed integer not null default 0,
  risks jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  tracking jsonb not null default '{}'::jsonb,
  copy_status text not null default 'draft_required',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_lifecycle_execution_approvals_status_chk check (status in ('review_required', 'ready_to_approve', 'approved', 'rejected', 'executed', 'cancelled')),
  constraint norwyn_lifecycle_execution_approvals_copy_chk check (copy_status in ('draft_required', 'draft_ready', 'juliana_approved')),
  constraint norwyn_lifecycle_execution_approvals_unique unique (tenant_id, approval_key)
);

alter table public.norwyn_customer_offer_events
  drop constraint if exists norwyn_customer_offer_events_type_chk;

alter table public.norwyn_customer_offer_events
  add constraint norwyn_customer_offer_events_type_chk check (event_type in (
    'ELIGIBLE',
    'EXCLUDED',
    'APPROVED',
    'SENT',
    'DELIVERED',
    'OPENED',
    'CLICKED',
    'LANDING_VIEW',
    'CHECKOUT',
    'PURCHASE',
    'REFUND',
    'EXITED',
    'BLOCKED',
    'NOT_INSTRUMENTED',
    'ENTERED_JOURNEY',
    'EMAIL_SENT',
    'EMAIL_DELIVERED',
    'EMAIL_OPEN',
    'LINK_CLICK',
    'WHATSAPP_SENT',
    'EXITED_JOURNEY',
    'MANUAL_CONTACT'
  ));

create unique index if not exists norwyn_customer_offer_events_source_uidx
  on public.norwyn_customer_offer_events (tenant_id, coalesce(source_event_id, ''))
  where source_event_id is not null;

create index if not exists norwyn_customer_channel_statuses_status_idx
  on public.norwyn_customer_channel_statuses (tenant_id, email_status, commercial_block);

create index if not exists norwyn_lifecycle_approvals_status_idx
  on public.norwyn_lifecycle_execution_approvals (tenant_id, status, channel);

alter table public.norwyn_customer_channel_statuses enable row level security;
alter table public.norwyn_lifecycle_exposure_rules enable row level security;
alter table public.norwyn_lifecycle_execution_approvals enable row level security;

drop policy if exists "norwyn lifecycle read channel statuses" on public.norwyn_customer_channel_statuses;
create policy "norwyn lifecycle read channel statuses" on public.norwyn_customer_channel_statuses for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write channel statuses" on public.norwyn_customer_channel_statuses;
create policy "norwyn lifecycle write channel statuses" on public.norwyn_customer_channel_statuses for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read exposure rules" on public.norwyn_lifecycle_exposure_rules;
create policy "norwyn lifecycle read exposure rules" on public.norwyn_lifecycle_exposure_rules for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write exposure rules" on public.norwyn_lifecycle_exposure_rules;
create policy "norwyn lifecycle write exposure rules" on public.norwyn_lifecycle_exposure_rules for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read execution approvals" on public.norwyn_lifecycle_execution_approvals;
create policy "norwyn lifecycle read execution approvals" on public.norwyn_lifecycle_execution_approvals for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write execution approvals" on public.norwyn_lifecycle_execution_approvals;
create policy "norwyn lifecycle write execution approvals" on public.norwyn_lifecycle_execution_approvals for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on
  public.norwyn_customer_channel_statuses,
  public.norwyn_lifecycle_exposure_rules,
  public.norwyn_lifecycle_execution_approvals
to authenticated;
