alter table public.growth_tracking_keys
  add column if not exists transaction_id text,
  add column if not exists source_sck text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists gclid text,
  add column if not exists landing_url text,
  add column if not exists checkout_url text,
  add column if not exists tracking_source text,
  add column if not exists tracking_confidence text not null default 'UNKNOWN'
    check (tracking_confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'));

update public.growth_tracking_keys
set
  utm_source = coalesce(utm_source, source),
  utm_medium = coalesce(utm_medium, medium),
  utm_campaign = coalesce(utm_campaign, campaign),
  utm_content = coalesce(utm_content, content),
  utm_term = coalesce(utm_term, term)
where utm_source is null
   or utm_medium is null
   or utm_campaign is null
   or utm_content is null
   or utm_term is null;

create index if not exists growth_tracking_keys_transaction_idx
on public.growth_tracking_keys (tenant_id, transaction_id)
where transaction_id is not null;

create index if not exists growth_tracking_keys_utm_idx
on public.growth_tracking_keys (tenant_id, utm_campaign, utm_content)
where utm_campaign is not null;

create table if not exists public.growth_tracking_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mode text not null check (mode in ('dry_run', 'apply')),
  source_table text not null default 'comercial_hotmart_raw',
  target_table text not null default 'comercial_vendas',
  scanned_count integer not null default 0,
  recoverable_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  confidence_summary jsonb not null default '{}'::jsonb,
  field_summary jsonb not null default '{}'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists growth_tracking_backfill_runs_tenant_created_idx
on public.growth_tracking_backfill_runs (tenant_id, created_at desc);

alter table public.growth_tracking_backfill_runs enable row level security;

drop policy if exists "growth tracking backfill runs read" on public.growth_tracking_backfill_runs;
create policy "growth tracking backfill runs read" on public.growth_tracking_backfill_runs for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth tracking backfill runs write" on public.growth_tracking_backfill_runs;
create policy "growth tracking backfill runs write" on public.growth_tracking_backfill_runs for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.growth_tracking_backfill_runs to authenticated;
