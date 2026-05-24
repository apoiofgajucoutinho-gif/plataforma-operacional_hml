create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_email text not null,
  refresh_token text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, account_email)
);

alter table public.google_calendar_connections enable row level security;

drop policy if exists "google calendar admins read" on public.google_calendar_connections;
create policy "google calendar admins read"
on public.google_calendar_connections for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = google_calendar_connections.tenant_id
      and tm.user_id = auth.uid()
      and tm.role = 'ADMIN'
      and tm.ativo = true
  )
);

drop policy if exists "google calendar admins manage" on public.google_calendar_connections;
create policy "google calendar admins manage"
on public.google_calendar_connections for all
to authenticated
using (
  exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = google_calendar_connections.tenant_id
      and tm.user_id = auth.uid()
      and tm.role = 'ADMIN'
      and tm.ativo = true
  )
)
with check (
  exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = google_calendar_connections.tenant_id
      and tm.user_id = auth.uid()
      and tm.role = 'ADMIN'
      and tm.ativo = true
  )
);

drop trigger if exists set_google_calendar_connections_updated_at on public.google_calendar_connections;
create trigger set_google_calendar_connections_updated_at
before update on public.google_calendar_connections
for each row execute function app_private.set_updated_at();
