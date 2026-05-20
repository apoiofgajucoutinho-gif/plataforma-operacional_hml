create extension if not exists "pgcrypto";

create schema if not exists app_private;

create type public.app_role as enum (
  'ADMIN',
  'MARKETING_PARTNER',
  'CLINICA',
  'USER'
);

create type public.module_key as enum (
  'instagram',
  'financeiro',
  'atividades',
  'agenda',
  'relatorios',
  'admin'
);

create type public.agenda_event_type as enum (
  'palestra',
  'paciente',
  'aula',
  'interno'
);

create type public.agenda_event_status as enum (
  'agendado',
  'confirmado',
  'concluido',
  'cancelado'
);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'cliente',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'USER',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.tenant_module_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.app_role not null,
  module public.module_key not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, role, module)
);

create table public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo public.agenda_event_type not null,
  status public.agenda_event_status not null default 'agendado',
  inicio timestamptz not null,
  fim timestamptz not null,
  local text,
  responsavel_id uuid references auth.users(id) on delete set null,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_eventos_periodo_valido check (fim > inicio)
);

create table public.agenda_palestras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  evento_id uuid not null references public.agenda_eventos(id) on delete cascade,
  tema text,
  publico_estimado integer,
  contratante text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agenda_pacientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  evento_id uuid not null references public.agenda_eventos(id) on delete cascade,
  paciente_nome text not null,
  paciente_contato text,
  status_atendimento text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agenda_aulas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  evento_id uuid not null references public.agenda_eventos(id) on delete cascade,
  curso text,
  turma text,
  modalidade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_email text not null,
  refresh_token text not null,
  scopes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, account_email)
);

create table public.logs_sistema (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  nivel text not null default 'info',
  origem text not null,
  mensagem text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.logs_usuario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  acao text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.logs_envio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  canal text not null,
  destino text,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.logs_api (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  provider text not null,
  endpoint text,
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app_private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.ativo = true
  );
$$;

create or replace function app_private.current_role(target_tenant_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.tenant_members tm
  where tm.tenant_id = target_tenant_id
    and tm.user_id = auth.uid()
    and tm.ativo = true
  limit 1;
$$;

create or replace function app_private.can_access_module(
  target_tenant_id uuid,
  target_module public.module_key,
  write_access boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    left join public.tenant_module_permissions permissions
      on permissions.tenant_id = tm.tenant_id
      and permissions.role = tm.role
      and permissions.module = target_module
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.ativo = true
      and (
        tm.role = 'ADMIN'
        or (
          coalesce(permissions.can_read, false) = true
          and (write_access = false or coalesce(permissions.can_write, false) = true)
        )
      )
  );
$$;

create index agenda_eventos_tenant_inicio_idx on public.agenda_eventos (tenant_id, inicio);
create index tenant_members_user_idx on public.tenant_members (user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tenants',
    'profiles',
    'tenant_members',
    'tenant_module_permissions',
    'agenda_eventos',
    'agenda_palestras',
    'agenda_pacientes',
    'agenda_aulas',
    'google_calendar_connections',
    'logs_sistema',
    'logs_usuario',
    'logs_envio',
    'logs_api'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function app_private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_module_permissions enable row level security;
alter table public.agenda_eventos enable row level security;
alter table public.agenda_palestras enable row level security;
alter table public.agenda_pacientes enable row level security;
alter table public.agenda_aulas enable row level security;
alter table public.google_calendar_connections enable row level security;
alter table public.logs_sistema enable row level security;
alter table public.logs_usuario enable row level security;
alter table public.logs_envio enable row level security;
alter table public.logs_api enable row level security;

create policy "members can read tenants"
on public.tenants for select
to authenticated
using (app_private.is_tenant_member(id));

create policy "users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can read own memberships"
on public.tenant_members for select
to authenticated
using (user_id = auth.uid() or app_private.current_role(tenant_id) = 'ADMIN');

create policy "admins manage memberships"
on public.tenant_members for all
to authenticated
using (app_private.current_role(tenant_id) = 'ADMIN')
with check (app_private.current_role(tenant_id) = 'ADMIN');

create policy "members read module permissions"
on public.tenant_module_permissions for select
to authenticated
using (app_private.is_tenant_member(tenant_id));

create policy "admins manage module permissions"
on public.tenant_module_permissions for all
to authenticated
using (app_private.current_role(tenant_id) = 'ADMIN')
with check (app_private.current_role(tenant_id) = 'ADMIN');

create policy "agenda read"
on public.agenda_eventos for select
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', false));

create policy "agenda insert"
on public.agenda_eventos for insert
to authenticated
with check (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "agenda update"
on public.agenda_eventos for update
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', false))
with check (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "agenda delete"
on public.agenda_eventos for delete
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "agenda detalhes read"
on public.agenda_palestras for select
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', false));

create policy "agenda detalhes write"
on public.agenda_palestras for all
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', true))
with check (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "agenda pacientes read"
on public.agenda_pacientes for select
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', false));

create policy "agenda pacientes write"
on public.agenda_pacientes for all
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', true))
with check (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "agenda aulas read"
on public.agenda_aulas for select
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', false));

create policy "agenda aulas write"
on public.agenda_aulas for all
to authenticated
using (app_private.can_access_module(tenant_id, 'agenda', true))
with check (app_private.can_access_module(tenant_id, 'agenda', true));

create policy "google calendar admins read"
on public.google_calendar_connections for select
to authenticated
using (app_private.current_role(tenant_id) = 'ADMIN');

create policy "google calendar admins manage"
on public.google_calendar_connections for all
to authenticated
using (app_private.current_role(tenant_id) = 'ADMIN')
with check (app_private.current_role(tenant_id) = 'ADMIN');

create policy "logs tenant read"
on public.logs_sistema for select
to authenticated
using (tenant_id is null or app_private.current_role(tenant_id) = 'ADMIN');

create policy "user logs tenant read"
on public.logs_usuario for select
to authenticated
using (user_id = auth.uid() or app_private.current_role(tenant_id) = 'ADMIN');

create policy "send logs tenant read"
on public.logs_envio for select
to authenticated
using (tenant_id is null or app_private.current_role(tenant_id) = 'ADMIN');

create policy "api logs tenant read"
on public.logs_api for select
to authenticated
using (tenant_id is null or app_private.current_role(tenant_id) = 'ADMIN');

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
