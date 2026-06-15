create table if not exists public.comercial_hotmart_raw (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null default 'hotmart',
  event_id text,
  transaction_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'recebido' check (status in ('recebido', 'processado', 'erro', 'ignorado')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comercial_produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plataforma text not null default 'hotmart' check (plataforma in ('hotmart', 'cademi', 'hotmart_club', 'manual')),
  hotmart_product_id text,
  nome text not null,
  curso_id uuid references public.fin_cursos(id) on delete set null,
  centro_resultado_id uuid references public.fin_centros_resultado(id) on delete set null,
  dias_acesso integer,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comercial_alunos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text,
  email text not null,
  telefone text,
  origem text not null default 'hotmart',
  primeira_compra_at timestamptz,
  ultima_compra_at timestamptz,
  status_acesso text not null default 'nao_validado' check (status_acesso in ('ativo', 'expirado', 'reembolsado', 'cancelado', 'nao_validado')),
  acesso_expira_em date,
  ultimo_acesso_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comercial_vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  transaction_id text not null,
  aluno_id uuid references public.comercial_alunos(id) on delete set null,
  produto_id uuid references public.comercial_produtos(id) on delete set null,
  hotmart_product_id text,
  produto_nome text,
  comprador_nome text,
  comprador_email text,
  status text not null default 'unknown',
  forma_pagamento text,
  parcelas integer not null default 1,
  moeda text not null default 'BRL',
  valor_bruto numeric(14,2) not null default 0,
  valor_liquido numeric(14,2),
  taxas numeric(14,2),
  coproducao numeric(14,2),
  data_compra timestamptz,
  data_aprovacao timestamptz,
  data_reembolso timestamptz,
  data_chargeback timestamptz,
  source_sck text,
  origem text not null default 'hotmart',
  raw_id uuid references public.comercial_hotmart_raw(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comercial_recebiveis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  venda_id uuid references public.comercial_vendas(id) on delete cascade,
  transaction_id text not null,
  parcela_numero integer not null default 1,
  total_parcelas integer not null default 1,
  status text not null default 'previsto' check (status in ('previsto', 'disponivel', 'recebido', 'atrasado', 'cancelado', 'reembolsado')),
  data_prevista date,
  data_recebimento date,
  valor_bruto numeric(14,2) not null default 0,
  valor_liquido numeric(14,2),
  fonte_previsao text not null default 'projetado' check (fonte_previsao in ('hotmart', 'projetado', 'manual')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comercial_parcelas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  venda_id uuid references public.comercial_vendas(id) on delete cascade,
  transaction_id text not null,
  parcela_numero integer not null default 1,
  total_parcelas integer not null default 1,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'cancelada', 'reembolsada')),
  data_vencimento date,
  data_pagamento date,
  valor numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comercial_hotmart_raw_tenant_idx
on public.comercial_hotmart_raw (tenant_id, received_at desc);

create unique index if not exists comercial_hotmart_raw_tenant_event_idx
on public.comercial_hotmart_raw (tenant_id, event_id);

create unique index if not exists comercial_produtos_tenant_hotmart_idx
on public.comercial_produtos (tenant_id, hotmart_product_id);

create unique index if not exists comercial_alunos_tenant_email_idx
on public.comercial_alunos (tenant_id, lower(email));

create unique index if not exists comercial_vendas_tenant_transaction_idx
on public.comercial_vendas (tenant_id, transaction_id);

create unique index if not exists comercial_recebiveis_tenant_transaction_parcela_idx
on public.comercial_recebiveis (tenant_id, transaction_id, parcela_numero);

create unique index if not exists comercial_parcelas_tenant_transaction_parcela_idx
on public.comercial_parcelas (tenant_id, transaction_id, parcela_numero);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'comercial_hotmart_raw',
    'comercial_produtos',
    'comercial_alunos',
    'comercial_vendas',
    'comercial_recebiveis',
    'comercial_parcelas'
  ]
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

alter table public.comercial_hotmart_raw enable row level security;
alter table public.comercial_produtos enable row level security;
alter table public.comercial_alunos enable row level security;
alter table public.comercial_vendas enable row level security;
alter table public.comercial_recebiveis enable row level security;
alter table public.comercial_parcelas enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'comercial_hotmart_raw',
    'comercial_produtos',
    'comercial_alunos',
    'comercial_vendas',
    'comercial_recebiveis',
    'comercial_parcelas'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'comercial read ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app_private.can_access_module(tenant_id, %L::public.module_key, false))',
      'comercial read ' || table_name,
      table_name,
      'comercial'
    );

    execute format('drop policy if exists %I on public.%I', 'comercial write ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (app_private.can_access_module(tenant_id, %L::public.module_key, true)) with check (app_private.can_access_module(tenant_id, %L::public.module_key, true))',
      'comercial write ' || table_name,
      table_name,
      'comercial',
      'comercial'
    );

    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', table_name);
  end loop;
end $$;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'comercial'::public.module_key, true, permissions.can_write
from public.tenants
cross join (values ('ADMIN', true), ('SUPORTE', true)) as permissions(role, can_write)
on conflict (tenant_id, role, module)
do update set can_read = true, can_write = excluded.can_write, updated_at = now();
