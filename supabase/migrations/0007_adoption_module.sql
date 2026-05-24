create table if not exists public.adoption_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  module text not null,
  page_path text not null,
  event_name text not null default 'page_view',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adoption_events_tenant_created_idx
on public.adoption_events (tenant_id, created_at desc);

create index if not exists adoption_events_tenant_module_idx
on public.adoption_events (tenant_id, module, created_at desc);

alter table public.adoption_events enable row level security;

drop policy if exists "adoption admin read" on public.adoption_events;
create policy "adoption admin read"
on public.adoption_events for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_members
    where tenant_members.tenant_id = adoption_events.tenant_id
      and tenant_members.user_id = auth.uid()
      and tenant_members.ativo = true
      and tenant_members.role = 'ADMIN'
  )
);

grant select, insert on public.adoption_events to authenticated, service_role;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, 'ADMIN'::public.app_role, 'adocao'::public.module_key, true, true
from public.tenants
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();
