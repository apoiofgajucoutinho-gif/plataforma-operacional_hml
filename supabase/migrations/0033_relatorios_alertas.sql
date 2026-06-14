create table if not exists public.relatorio_destinatarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  perfil_alvo text not null default 'operacional' check (perfil_alvo in ('ju', 'jeff', 'suporte', 'marketing', 'operacional')),
  canal_preferencial text not null default 'telegram' check (canal_preferencial in ('telegram', 'email', 'whatsapp')),
  email text,
  telegram_chat_id text,
  whatsapp text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relatorio_agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  destinatario_id uuid not null references public.relatorio_destinatarios(id) on delete cascade,
  nome text not null,
  tipo_resumo text not null check (tipo_resumo in ('resumo_executivo', 'resumo_suporte', 'alerta_tecnico', 'agenda', 'ocorrencias', 'financeiro', 'lembrete_agendamento')),
  canal text not null default 'telegram' check (canal in ('telegram', 'email', 'whatsapp')),
  frequencia text not null default 'diario' check (frequencia in ('sob_demanda', 'diario', 'semanal', 'mensal', 'imediato')),
  horario time,
  timezone text not null default 'America/Sao_Paulo',
  incluir_modulos text[] not null default array[]::text[],
  filtros jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relatorio_envios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid references public.relatorio_agendamentos(id) on delete set null,
  destinatario_id uuid references public.relatorio_destinatarios(id) on delete set null,
  tipo_resumo text not null,
  canal text not null default 'telegram',
  destino text,
  status text not null default 'preparado' check (status in ('preparado', 'enviado', 'erro', 'ignorado')),
  assunto text,
  mensagem text,
  erro text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists relatorio_destinatarios_tenant_idx
on public.relatorio_destinatarios (tenant_id, ativo);

create unique index if not exists relatorio_destinatarios_tenant_perfil_nome_idx
on public.relatorio_destinatarios (tenant_id, perfil_alvo, nome);

create index if not exists relatorio_agendamentos_tenant_idx
on public.relatorio_agendamentos (tenant_id, ativo, tipo_resumo);

create unique index if not exists relatorio_agendamentos_tenant_dest_nome_idx
on public.relatorio_agendamentos (tenant_id, destinatario_id, nome);

create index if not exists relatorio_envios_tenant_created_idx
on public.relatorio_envios (tenant_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['relatorio_destinatarios', 'relatorio_agendamentos', 'relatorio_envios']
  loop
    if not exists (select 1 from pg_trigger where tgname = table_name || '_set_updated_at') then
      execute format(
        'create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

alter table public.relatorio_destinatarios enable row level security;
alter table public.relatorio_agendamentos enable row level security;
alter table public.relatorio_envios enable row level security;

drop policy if exists "relatorios destinatarios read" on public.relatorio_destinatarios;
create policy "relatorios destinatarios read"
on public.relatorio_destinatarios for select
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, false));

drop policy if exists "relatorios destinatarios write" on public.relatorio_destinatarios;
create policy "relatorios destinatarios write"
on public.relatorio_destinatarios for all
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true));

drop policy if exists "relatorios agendamentos read" on public.relatorio_agendamentos;
create policy "relatorios agendamentos read"
on public.relatorio_agendamentos for select
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, false));

drop policy if exists "relatorios agendamentos write" on public.relatorio_agendamentos;
create policy "relatorios agendamentos write"
on public.relatorio_agendamentos for all
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true));

drop policy if exists "relatorios envios read" on public.relatorio_envios;
create policy "relatorios envios read"
on public.relatorio_envios for select
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, false));

drop policy if exists "relatorios envios write" on public.relatorio_envios;
create policy "relatorios envios write"
on public.relatorio_envios for all
to authenticated
using (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'relatorios'::public.module_key, true));

grant select, insert, update, delete on public.relatorio_destinatarios to authenticated, service_role;
grant select, insert, update, delete on public.relatorio_agendamentos to authenticated, service_role;
grant select, insert, update, delete on public.relatorio_envios to authenticated, service_role;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'relatorios'::public.module_key, true, permissions.can_write
from public.tenants
cross join (values ('ADMIN', true), ('SUPORTE', true)) as permissions(role, can_write)
on conflict (tenant_id, role, module)
do update set can_read = true, can_write = excluded.can_write, updated_at = now();

insert into public.relatorio_destinatarios (tenant_id, nome, perfil_alvo, canal_preferencial, email)
select tenants.id, seed.nome, seed.perfil_alvo, 'telegram', seed.email
from public.tenants
cross join (
  values
    ('Ju', 'ju', 'fga.jucoutinho@gmail.com'),
    ('Jeff', 'jeff', 'jefferson.toniolo@gmail.com'),
    ('Suporte', 'suporte', null)
) as seed(nome, perfil_alvo, email)
where not exists (
  select 1
  from public.relatorio_destinatarios existing
  where existing.tenant_id = tenants.id
    and existing.perfil_alvo = seed.perfil_alvo
    and existing.nome = seed.nome
);

insert into public.relatorio_agendamentos (
  tenant_id, destinatario_id, nome, tipo_resumo, canal, frequencia, horario, incluir_modulos
)
select d.tenant_id, d.id, seed.nome, seed.tipo_resumo, 'telegram', 'diario', seed.horario::time, seed.modulos
from public.relatorio_destinatarios d
join (
  values
    ('ju', 'Resumo executivo da Ju', 'resumo_executivo', '07:30', array['agenda', 'financeiro', 'instagram', 'ads', 'objetivos', 'ocorrencias']::text[]),
    ('jeff', 'Alertas tecnicos do Jeff', 'alerta_tecnico', '08:00', array['agenda', 'ocorrencias', 'ads', 'instagram']::text[]),
    ('suporte', 'Resumo operacional do Suporte', 'resumo_suporte', '08:00', array['agenda', 'ocorrencias', 'instagram']::text[])
) as seed(perfil_alvo, nome, tipo_resumo, horario, modulos)
on seed.perfil_alvo = d.perfil_alvo
where not exists (
  select 1
  from public.relatorio_agendamentos existing
  where existing.tenant_id = d.tenant_id
    and existing.destinatario_id = d.id
    and existing.nome = seed.nome
);
