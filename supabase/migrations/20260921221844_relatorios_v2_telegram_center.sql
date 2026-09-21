alter table public.relatorio_destinatarios
  add column if not exists descricao text,
  add column if not exists tipo_destino text not null default 'grupo'
    check (tipo_destino in ('grupo','individual','canal','outro')),
  add column if not exists observacao text,
  add column if not exists last_sent_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.relatorio_agendamentos
  add column if not exists descricao text,
  add column if not exists status text not null default 'ativo'
    check (status in ('ativo','pausado','rascunho')),
  add column if not exists modo_envio text not null default 'recorrente'
    check (modo_envio in ('recorrente','unico')),
  add column if not exists dias_semana integer[] not null default '{}'::integer[],
  add column if not exists dia_mes integer,
  add column if not exists regras jsonb not null default '{}'::jsonb,
  add column if not exists filtros_conteudo jsonb not null default '{}'::jsonb,
  add column if not exists observacao_interna text,
  add column if not exists last_run_at timestamptz,
  add column if not exists next_run_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.relatorio_envios
  add column if not exists origem text not null default 'agendado'
    check (origem in ('manual','agendado','preview','sistema')),
  add column if not exists resumo text,
  add column if not exists modulos text[] not null default '{}'::text[],
  add column if not exists filtros jsonb not null default '{}'::jsonb,
  add column if not exists generated_at timestamptz not null default now();

alter table public.relatorio_agendamentos
drop constraint if exists relatorio_agendamentos_frequencia_check;

alter table public.relatorio_agendamentos
add constraint relatorio_agendamentos_frequencia_check
check (
  frequencia in (
    'sob_demanda',
    'unico',
    'diario',
    'dias_uteis',
    'semanal',
    'quinzenal',
    'mensal',
    'fechamento_mes',
    'imediato'
  )
);

update public.relatorio_agendamentos
set status = case when ativo then 'ativo' else 'pausado' end
where status is null
   or status = '';

create index if not exists relatorio_agendamentos_tenant_status_idx
on public.relatorio_agendamentos (tenant_id, status, modo_envio, frequencia, horario);

create index if not exists relatorio_envios_tenant_status_created_idx
on public.relatorio_envios (tenant_id, status, created_at desc);

create index if not exists relatorio_envios_tenant_origin_created_idx
on public.relatorio_envios (tenant_id, origem, created_at desc);

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'relatorios'::public.module_key, true, true
from public.tenants
cross join (
  values
    ('ADMIN'),
    ('ESPECIALISTA'),
    ('SUPORTE'),
    ('OPERACIONAL')
) as permissions(role)
on conflict (tenant_id, role, module)
do update set can_read = true, can_write = true, updated_at = now();
