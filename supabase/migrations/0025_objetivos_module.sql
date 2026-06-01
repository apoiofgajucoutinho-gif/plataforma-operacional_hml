create table if not exists public.objetivos_metas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  modulo text not null check (modulo in ('geral', 'instagram', 'ads', 'faturamento')),
  titulo text not null,
  descricao text,
  tipo_origem text not null default 'automatica' check (tipo_origem in ('automatica', 'estrategica')),
  indicador_key text not null,
  unidade text not null default 'numero' check (unidade in ('numero', 'moeda', 'percentual')),
  direcao text not null default 'maior_melhor' check (direcao in ('maior_melhor', 'menor_melhor')),
  periodo_tipo text not null default 'mensal' check (periodo_tipo in ('mensal', 'quarter', 'semestral', 'anual')),
  ano integer not null,
  mes integer check (mes between 1 and 12),
  quarter integer check (quarter between 1 and 4),
  semestre integer check (semestre between 1 and 2),
  meta_alcancavel numeric(14,2) not null default 0,
  meta_alta numeric(14,2),
  meta_super numeric(14,2),
  atual_manual numeric(14,2),
  plano_acao_padrao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objetivos_metas_periodo_check check (
    (periodo_tipo = 'mensal' and mes is not null)
    or (periodo_tipo = 'quarter' and quarter is not null)
    or (periodo_tipo = 'semestral' and semestre is not null)
    or (periodo_tipo = 'anual')
  )
);

create table if not exists public.objetivos_okrs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  objetivo text not null,
  descricao text,
  periodo_tipo text not null default 'quarter' check (periodo_tipo in ('mensal', 'quarter', 'semestral', 'anual')),
  ano integer not null,
  mes integer check (mes between 1 and 12),
  quarter integer check (quarter between 1 and 4),
  semestre integer check (semestre between 1 and 2),
  responsavel text,
  status text not null default 'em_andamento' check (status in ('planejado', 'em_andamento', 'concluido', 'em_risco', 'pausado')),
  confianca integer not null default 70 check (confianca between 0 and 100),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objetivos_key_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  okr_id uuid not null references public.objetivos_okrs(id) on delete cascade,
  titulo text not null,
  indicador_key text,
  unidade text not null default 'numero' check (unidade in ('numero', 'moeda', 'percentual')),
  direcao text not null default 'maior_melhor' check (direcao in ('maior_melhor', 'menor_melhor')),
  meta numeric(14,2) not null default 0,
  atual_manual numeric(14,2) not null default 0,
  peso numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objetivos_planos_acao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  meta_id uuid references public.objetivos_metas(id) on delete cascade,
  okr_id uuid references public.objetivos_okrs(id) on delete cascade,
  titulo text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'feito', 'cancelado')),
  responsavel text,
  prazo date,
  origem text not null default 'manual' check (origem in ('manual', 'sugerido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objetivos_metas_tenant_periodo_idx on public.objetivos_metas (tenant_id, modulo, ano, mes, quarter, semestre);
create index if not exists objetivos_okrs_tenant_periodo_idx on public.objetivos_okrs (tenant_id, ano, quarter, semestre);
create index if not exists objetivos_planos_tenant_status_idx on public.objetivos_planos_acao (tenant_id, status);

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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'objetivos_metas',
    'objetivos_okrs',
    'objetivos_key_results',
    'objetivos_planos_acao'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = table_name || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

alter table public.objetivos_metas enable row level security;
alter table public.objetivos_okrs enable row level security;
alter table public.objetivos_key_results enable row level security;
alter table public.objetivos_planos_acao enable row level security;

drop policy if exists "objetivos metas read" on public.objetivos_metas;
create policy "objetivos metas read"
on public.objetivos_metas for select
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, false));

drop policy if exists "objetivos metas write" on public.objetivos_metas;
create policy "objetivos metas write"
on public.objetivos_metas for all
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true));

drop policy if exists "objetivos okrs read" on public.objetivos_okrs;
create policy "objetivos okrs read"
on public.objetivos_okrs for select
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, false));

drop policy if exists "objetivos okrs write" on public.objetivos_okrs;
create policy "objetivos okrs write"
on public.objetivos_okrs for all
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true));

drop policy if exists "objetivos krs read" on public.objetivos_key_results;
create policy "objetivos krs read"
on public.objetivos_key_results for select
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, false));

drop policy if exists "objetivos krs write" on public.objetivos_key_results;
create policy "objetivos krs write"
on public.objetivos_key_results for all
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true));

drop policy if exists "objetivos planos read" on public.objetivos_planos_acao;
create policy "objetivos planos read"
on public.objetivos_planos_acao for select
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, false));

drop policy if exists "objetivos planos write" on public.objetivos_planos_acao;
create policy "objetivos planos write"
on public.objetivos_planos_acao for all
to authenticated
using (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'objetivos'::public.module_key, true));

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'objetivos'::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ADMIN', true, true),
    ('SUPORTE', true, false)
) as permissions(role, can_read, can_write)
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();

with meta_rows(mes, alcancavel, alta, supermeta, realizado) as (
  values
    (1, 43344.06, 47678.47, 61300.00, 4710.61),
    (2, 19656.85, 21622.53, 27800.00, 9508.15),
    (3, 9687.01, 10655.71, 13700.00, 46806.83),
    (4, 7070.81, 7777.89, 10000.00, 32962.49),
    (5, 75586.95, 83145.65, 106900.00, 15530.93),
    (6, 51121.95, 56234.15, 72300.00, null),
    (7, 96870.09, 106557.09, 137000.00, null),
    (8, 50909.83, 56000.81, 72000.00, null),
    (9, 120133.05, 132146.35, 169900.00, null),
    (10, 97294.33, 107023.77, 137600.00, null),
    (11, 128123.06, 140935.37, 181200.00, null),
    (12, 7353.64, 8089.01, 10400.00, null)
)
insert into public.objetivos_metas (
  tenant_id, modulo, titulo, descricao, tipo_origem, indicador_key, unidade, periodo_tipo, ano, mes,
  meta_alcancavel, meta_alta, meta_super, atual_manual, plano_acao_padrao
)
select
  tenants.id,
  'faturamento',
  'Faturamento bruto mensal',
  'Meta importada do modelo Meta_Faturamento.xlsx sugerido pelo time de marketing.',
  'automatica',
  'faturamento_bruto',
  'moeda',
  'mensal',
  2026,
  meta_rows.mes,
  meta_rows.alcancavel,
  meta_rows.alta,
  meta_rows.supermeta,
  meta_rows.realizado,
  'Se o mes ficar abaixo de 70% ate a metade do periodo, revisar oferta, calendario comercial e acoes de captacao.'
from public.tenants
cross join meta_rows
where not exists (
  select 1
  from public.objetivos_metas om
  where om.tenant_id = tenants.id
    and om.modulo = 'faturamento'
    and om.indicador_key = 'faturamento_bruto'
    and om.periodo_tipo = 'mensal'
    and om.ano = 2026
    and om.mes = meta_rows.mes
);

insert into public.objetivos_metas (
  tenant_id, modulo, titulo, descricao, tipo_origem, indicador_key, unidade, periodo_tipo, ano, meta_alcancavel, meta_alta, meta_super, plano_acao_padrao
)
select tenants.id, seed.modulo, seed.titulo, seed.descricao, seed.tipo_origem, seed.indicador_key, seed.unidade, seed.periodo_tipo, seed.ano, seed.meta_alcancavel, seed.meta_alta, seed.meta_super, seed.plano_acao_padrao
from public.tenants
cross join (
  values
    ('instagram', 'Alcance organico anual', 'Meta inicial para acompanhar tracao organica enquanto os OKRs finais nao sao definidos.', 'automatica', 'instagram_alcance_total', 'numero', 'anual', 2026, 300000.00, 450000.00, 600000.00, 'Se o alcance ficar abaixo da rota, repetir temas vencedores e priorizar Reels com CTA claro.'),
    ('instagram', 'Posts com bom engajamento', 'Percentual de publicacoes classificadas como Bom no periodo.', 'automatica', 'instagram_bom_engajamento_pct', 'percentual', 'anual', 2026, 50.00, 60.00, 70.00, 'Se cair abaixo da meta, revisar formato, gancho e utilidade pratica dos conteudos.'),
    ('ads', 'CTR medio Ads', 'Meta inicial de qualidade dos anuncios pagos.', 'automatica', 'ads_ctr_medio', 'percentual', 'anual', 2026, 1.00, 1.50, 2.00, 'Se CTR ficar baixo, testar novo criativo, promessa e publico.'),
    ('ads', 'CPC medio Ads', 'Meta inicial de eficiencia de clique. Aqui menor e melhor.', 'automatica', 'ads_cpc_medio', 'moeda', 'anual', 2026, 4.00, 3.00, 2.00, 'Se CPC subir, revisar segmentacao e criativos com pior performance.'),
    ('faturamento', 'Supermeta anual', 'Meta anual consolidada do modelo de faturamento.', 'automatica', 'faturamento_bruto', 'moeda', 'anual', 2026, 707080.92, 777789.01, 1000000.00, 'Acompanhar gap mensal e concentrar acoes comerciais nos produtos de maior alavanca.')
) as seed(modulo, titulo, descricao, tipo_origem, indicador_key, unidade, periodo_tipo, ano, meta_alcancavel, meta_alta, meta_super, plano_acao_padrao)
where not exists (
  select 1
  from public.objetivos_metas om
  where om.tenant_id = tenants.id
    and om.modulo = seed.modulo
    and om.indicador_key = seed.indicador_key
    and om.periodo_tipo = seed.periodo_tipo
    and om.ano = seed.ano
    and om.titulo = seed.titulo
);

insert into public.objetivos_okrs (tenant_id, objetivo, descricao, periodo_tipo, ano, semestre, responsavel, status, confianca)
select
  tenants.id,
  'Fortalecer a operacao digital da Juliana com previsibilidade',
  'OKR inicial para unir Instagram, Ads e faturamento enquanto a estrategia definitiva e estruturada com a especialista.',
  'semestral',
  2026,
  2,
  'Juliana / Especialista',
  'planejado',
  70
from public.tenants
where not exists (
  select 1
  from public.objetivos_okrs oo
  where oo.tenant_id = tenants.id
    and oo.objetivo = 'Fortalecer a operacao digital da Juliana com previsibilidade'
);
