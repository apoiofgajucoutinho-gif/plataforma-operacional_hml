alter table public.norwyn_customer_channel_statuses
  add column if not exists activecampaign_contact_id text,
  add column if not exists activecampaign_status text not null default 'NOT_SYNCED',
  add column if not exists email_policy_decision text not null default 'REVIEW_REQUIRED',
  add column if not exists email_policy_evidence jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_status text not null default 'NOT_CONFIGURED';

alter table public.norwyn_customer_channel_statuses
  drop constraint if exists norwyn_customer_channel_statuses_ac_status_chk;
alter table public.norwyn_customer_channel_statuses
  add constraint norwyn_customer_channel_statuses_ac_status_chk check (activecampaign_status in ('ACTIVE_SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'SUPPRESSED', 'NOT_FOUND', 'UNKNOWN', 'NOT_SYNCED'));

alter table public.norwyn_customer_channel_statuses
  drop constraint if exists norwyn_customer_channel_statuses_email_policy_chk;
alter table public.norwyn_customer_channel_statuses
  add constraint norwyn_customer_channel_statuses_email_policy_chk check (email_policy_decision in ('ALLOWED', 'BLOCKED', 'REVIEW_REQUIRED'));

alter table public.norwyn_customer_channel_statuses
  drop constraint if exists norwyn_customer_channel_statuses_sync_status_chk;
alter table public.norwyn_customer_channel_statuses
  add constraint norwyn_customer_channel_statuses_sync_status_chk check (sync_status in ('OK', 'ERROR', 'NOT_CONFIGURED', 'PARTIAL', 'TEST_ONLY'));

create table if not exists public.norwyn_channel_contact_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  policy_key text not null,
  channel text not null,
  version integer not null default 1,
  status text not null default 'draft',
  allowed_statuses text[] not null default '{}',
  blocked_statuses text[] not null default '{}',
  review_required_statuses text[] not null default '{}',
  requires_human_approval boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_channel_contact_policies_status_chk check (status in ('draft', 'active', 'paused', 'archived')),
  constraint norwyn_channel_contact_policies_unique unique (tenant_id, policy_key, version)
);

create table if not exists public.norwyn_lifecycle_message_drafts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  experiment_id uuid references public.norwyn_lifecycle_experiments(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  draft_key text not null,
  journey_key text not null,
  offer_key text not null,
  channel text not null,
  message_step text not null,
  day_label text not null,
  objective text not null,
  subject text,
  copy text not null,
  cta text,
  approval_status text not null default 'DRAFT',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_lifecycle_message_drafts_approval_chk check (approval_status in ('DRAFT', 'READY_FOR_REVIEW', 'JULIANA_APPROVED', 'REJECTED')),
  constraint norwyn_lifecycle_message_drafts_unique unique (tenant_id, draft_key)
);

create table if not exists public.norwyn_lifecycle_internal_test_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  list_key text not null,
  email text not null,
  name text,
  authorized boolean not null default false,
  source text not null default 'manual',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists norwyn_customer_channel_statuses_ac_idx
  on public.norwyn_customer_channel_statuses (tenant_id, activecampaign_status, email_policy_decision);

create index if not exists norwyn_lifecycle_message_drafts_status_idx
  on public.norwyn_lifecycle_message_drafts (tenant_id, offer_key, approval_status);

create unique index if not exists norwyn_lifecycle_internal_test_contacts_unique
  on public.norwyn_lifecycle_internal_test_contacts (tenant_id, list_key, lower(email));

alter table public.norwyn_channel_contact_policies enable row level security;
alter table public.norwyn_lifecycle_message_drafts enable row level security;
alter table public.norwyn_lifecycle_internal_test_contacts enable row level security;

drop policy if exists "norwyn lifecycle read channel policies" on public.norwyn_channel_contact_policies;
create policy "norwyn lifecycle read channel policies" on public.norwyn_channel_contact_policies for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write channel policies" on public.norwyn_channel_contact_policies;
create policy "norwyn lifecycle write channel policies" on public.norwyn_channel_contact_policies for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read message drafts" on public.norwyn_lifecycle_message_drafts;
create policy "norwyn lifecycle read message drafts" on public.norwyn_lifecycle_message_drafts for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write message drafts" on public.norwyn_lifecycle_message_drafts;
create policy "norwyn lifecycle write message drafts" on public.norwyn_lifecycle_message_drafts for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn lifecycle read internal test contacts" on public.norwyn_lifecycle_internal_test_contacts;
create policy "norwyn lifecycle read internal test contacts" on public.norwyn_lifecycle_internal_test_contacts for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn lifecycle write internal test contacts" on public.norwyn_lifecycle_internal_test_contacts;
create policy "norwyn lifecycle write internal test contacts" on public.norwyn_lifecycle_internal_test_contacts for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on
  public.norwyn_channel_contact_policies,
  public.norwyn_lifecycle_message_drafts,
  public.norwyn_lifecycle_internal_test_contacts
to authenticated;
