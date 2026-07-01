create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome_oficial text not null,
  produto_base text not null,
  categoria text,
  descricao text,
  status text not null default 'ativo',
  tipo text not null default 'Entrada' check (tipo in ('Entrada', 'Upsell', 'Order Bump', 'Flagship', 'Satelite', 'Satélite')),
  preco_oficial numeric(14,2),
  duracao integer,
  unidade_duracao text,
  link_oferta text,
  percentual_coproducao numeric(8,4),
  percentual_hotmart numeric(8,4),
  percentual_gateway numeric(8,4),
  percentual_imposto numeric(8,4),
  receita_liquida_estimada_pct numeric(8,4) generated always as (
    case
      when percentual_coproducao is null
        and percentual_hotmart is null
        and percentual_gateway is null
        and percentual_imposto is null
      then null
      else greatest(
        0,
        100
        - coalesce(percentual_coproducao, 0)
        - coalesce(percentual_hotmart, 0)
        - coalesce(percentual_gateway, 0)
        - coalesce(percentual_imposto, 0)
      )
    end
  ) stored,
  observacoes text,
  ativo boolean not null default true,
  source text not null default 'seed',
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_components (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  componente text not null,
  categoria text,
  ordem integer not null default 1,
  duracao integer,
  unidade_duracao text,
  link text,
  observacoes text,
  ativo boolean not null default true,
  source text not null default 'seed',
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alias text not null,
  produto_base text,
  origem text not null default 'manual',
  confianca integer not null default 80 check (confianca between 0 and 100),
  principal boolean not null default false,
  ativo boolean not null default true,
  source text not null default 'seed',
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  turma text not null,
  inicio date,
  fim date,
  status text not null default 'planejada',
  meta_alunos integer,
  alunos integer,
  receita_meta numeric(14,2),
  receita_real numeric(14,2),
  observacoes text,
  ativo boolean not null default true,
  source text not null default 'manual',
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_module text not null,
  knowledge_type text not null check (
    knowledge_type in ('aprendizado', 'briefing', 'draft', 'shadow_mode', 'recomendacao', 'decisao', 'missao_executada', 'padrao', 'produto')
  ),
  title text not null,
  summary text,
  product_id uuid references public.products(id) on delete set null,
  produto_base text,
  mission_id text,
  source_key text not null,
  confidence_score integer not null default 50 check (confidence_score between 0 and 100),
  occurrences integer not null default 1,
  last_used_at timestamptz,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists source text not null default 'seed';
alter table public.products add column if not exists manually_edited_at timestamptz;
alter table public.products add column if not exists manually_edited_by uuid references auth.users(id) on delete set null;

alter table public.product_components add column if not exists ativo boolean not null default true;
alter table public.product_components add column if not exists source text not null default 'seed';
alter table public.product_components add column if not exists manually_edited_at timestamptz;
alter table public.product_components add column if not exists manually_edited_by uuid references auth.users(id) on delete set null;

alter table public.product_aliases add column if not exists principal boolean not null default false;
alter table public.product_aliases add column if not exists source text not null default 'seed';
alter table public.product_aliases add column if not exists manually_edited_at timestamptz;
alter table public.product_aliases add column if not exists manually_edited_by uuid references auth.users(id) on delete set null;

alter table public.product_batches add column if not exists observacoes text;
alter table public.product_batches add column if not exists ativo boolean not null default true;
alter table public.product_batches add column if not exists source text not null default 'manual';
alter table public.product_batches add column if not exists manually_edited_at timestamptz;
alter table public.product_batches add column if not exists manually_edited_by uuid references auth.users(id) on delete set null;

create unique index if not exists products_tenant_official_uidx
  on public.products (tenant_id, lower(nome_oficial));
create index if not exists products_tenant_base_idx
  on public.products (tenant_id, produto_base);
create index if not exists products_tenant_active_idx
  on public.products (tenant_id, ativo, status);

create index if not exists product_components_product_idx
  on public.product_components (tenant_id, product_id, ordem);

create unique index if not exists product_aliases_tenant_alias_uidx
  on public.product_aliases (tenant_id, lower(alias));
create index if not exists product_aliases_product_idx
  on public.product_aliases (tenant_id, product_id);

create index if not exists product_batches_product_idx
  on public.product_batches (tenant_id, product_id, inicio, fim);

create unique index if not exists knowledge_base_source_uidx
  on public.knowledge_base (tenant_id, source_key);
create index if not exists knowledge_base_product_idx
  on public.knowledge_base (tenant_id, product_id, knowledge_type);
create index if not exists knowledge_base_type_idx
  on public.knowledge_base (tenant_id, knowledge_type, status);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function app_private.set_updated_at();

drop trigger if exists product_components_set_updated_at on public.product_components;
create trigger product_components_set_updated_at
before update on public.product_components
for each row execute function app_private.set_updated_at();

drop trigger if exists product_aliases_set_updated_at on public.product_aliases;
create trigger product_aliases_set_updated_at
before update on public.product_aliases
for each row execute function app_private.set_updated_at();

drop trigger if exists product_batches_set_updated_at on public.product_batches;
create trigger product_batches_set_updated_at
before update on public.product_batches
for each row execute function app_private.set_updated_at();

drop trigger if exists knowledge_base_set_updated_at on public.knowledge_base;
create trigger knowledge_base_set_updated_at
before update on public.knowledge_base
for each row execute function app_private.set_updated_at();

alter table public.products enable row level security;
alter table public.product_components enable row level security;
alter table public.product_aliases enable row level security;
alter table public.product_batches enable row level security;
alter table public.knowledge_base enable row level security;

drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "products write" on public.products;
create policy "products write" on public.products for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "product components read" on public.product_components;
create policy "product components read" on public.product_components for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "product components write" on public.product_components;
create policy "product components write" on public.product_components for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "product aliases read" on public.product_aliases;
create policy "product aliases read" on public.product_aliases for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "product aliases write" on public.product_aliases;
create policy "product aliases write" on public.product_aliases for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "product batches read" on public.product_batches;
create policy "product batches read" on public.product_batches for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "product batches write" on public.product_batches;
create policy "product batches write" on public.product_batches for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "knowledge base read" on public.knowledge_base;
create policy "knowledge base read" on public.knowledge_base for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "knowledge base write" on public.knowledge_base;
create policy "knowledge base write" on public.knowledge_base for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_components to authenticated;
grant select, insert, update, delete on public.product_aliases to authenticated;
grant select, insert, update, delete on public.product_batches to authenticated;
grant select, insert, update, delete on public.knowledge_base to authenticated;

create or replace function public.norwyn_product_base_from_name(product_name text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(product_name, '')) like '%aasi%'
      and lower(coalesce(product_name, '')) like '%ajuste%'
      and lower(coalesce(product_name, '')) like '%rampa%'
    then 'Formação AASI'
    when lower(coalesce(product_name, '')) like '%aasi%' then 'Formação AASI'
    when lower(coalesce(product_name, '')) like '%ajuste%' then 'Ajustes Finos'
    when lower(coalesce(product_name, '')) like '%rampa%' then 'Perda em Rampa'
    when lower(coalesce(product_name, '')) like '%zumbido%' then 'Imersão Zumbido'
    else nullif(trim(coalesce(product_name, '')), '')
  end
$$;

create or replace function public.norwyn_upsert_knowledge(
  target_tenant_id uuid,
  p_source_module text,
  p_knowledge_type text,
  p_title text,
  p_summary text,
  p_source_key text,
  p_product_id uuid default null,
  p_produto_base text default null,
  p_mission_id text default null,
  p_evidence jsonb default '[]'::jsonb,
  p_metadata jsonb default '{}'::jsonb,
  p_confidence_score integer default 50
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  result_id uuid;
begin
  insert into public.knowledge_base (
    tenant_id,
    source_module,
    knowledge_type,
    title,
    summary,
    source_key,
    product_id,
    produto_base,
    mission_id,
    evidence,
    metadata,
    confidence_score,
    last_used_at
  )
  values (
    target_tenant_id,
    p_source_module,
    p_knowledge_type,
    p_title,
    p_summary,
    p_source_key,
    p_product_id,
    p_produto_base,
    p_mission_id,
    coalesce(p_evidence, '[]'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    greatest(0, least(100, coalesce(p_confidence_score, 50))),
    now()
  )
  on conflict (tenant_id, source_key) do update
  set
    title = excluded.title,
    summary = coalesce(excluded.summary, public.knowledge_base.summary),
    product_id = coalesce(excluded.product_id, public.knowledge_base.product_id),
    produto_base = coalesce(excluded.produto_base, public.knowledge_base.produto_base),
    mission_id = coalesce(excluded.mission_id, public.knowledge_base.mission_id),
    confidence_score = greatest(public.knowledge_base.confidence_score, excluded.confidence_score),
    occurrences = public.knowledge_base.occurrences + 1,
    last_used_at = now(),
    evidence = case
      when jsonb_typeof(public.knowledge_base.evidence) = 'array'
       and jsonb_typeof(excluded.evidence) = 'array'
      then public.knowledge_base.evidence || excluded.evidence
      else excluded.evidence
    end,
    metadata = public.knowledge_base.metadata || excluded.metadata,
    updated_at = now()
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.norwyn_product_base_from_name(text) to authenticated;
grant execute on function public.norwyn_upsert_knowledge(uuid, text, text, text, text, text, uuid, text, text, jsonb, jsonb, integer) to authenticated;

with source_products as (
  select tenant_id, nome as nome_oficial, public.norwyn_product_base_from_name(nome) as produto_base
  from public.comercial_produtos
  where nome is not null
  union
  select tenant_id, produto_nome as nome_oficial, public.norwyn_product_base_from_name(produto_nome) as produto_base
  from public.comercial_vendas
  where produto_nome is not null
),
deduped as (
  select distinct on (tenant_id, lower(nome_oficial))
    tenant_id,
    nome_oficial,
    coalesce(produto_base, nome_oficial) as produto_base
  from source_products
  where nullif(trim(nome_oficial), '') is not null
  order by tenant_id, lower(nome_oficial), nome_oficial
)
insert into public.products (tenant_id, nome_oficial, produto_base, categoria, status, tipo, ativo, source, metadata)
select
  tenant_id,
  nome_oficial,
  produto_base,
  'Hotmart',
  'ativo',
  case when lower(nome_oficial) like '%combo%' or lower(nome_oficial) like '%aasi%ajuste%' then 'Flagship' else 'Entrada' end,
  true,
  'seed',
  jsonb_build_object('seeded_from', 'comercial_hotmart')
from deduped
on conflict (tenant_id, (lower(nome_oficial))) do nothing;

insert into public.product_aliases (tenant_id, product_id, alias, produto_base, origem, confianca, principal, ativo, source, metadata)
select
  p.tenant_id,
  p.id,
  p.nome_oficial,
  p.produto_base,
  'seed',
  90,
  true,
  true,
  'seed',
  jsonb_build_object('seeded_from', 'products.nome_oficial')
from public.products p
on conflict (tenant_id, (lower(alias))) do nothing;

insert into public.product_aliases (tenant_id, product_id, alias, produto_base, origem, confianca, principal, ativo, source, metadata)
select distinct
  p.tenant_id,
  p.id,
  p.produto_base,
  p.produto_base,
  'seed',
  80,
  false,
  true,
  'seed',
  jsonb_build_object('seeded_from', 'products.produto_base')
from public.products p
where nullif(trim(p.produto_base), '') is not null
on conflict (tenant_id, (lower(alias))) do nothing;

insert into public.product_components (tenant_id, product_id, componente, categoria, ordem, duracao, unidade_duracao, observacoes, ativo, source, metadata)
select p.tenant_id, p.id, component.componente, 'Curso', component.ordem, component.duracao, component.unidade_duracao, 'Componente inferido do nome composto do produto.', true, 'seed', jsonb_build_object('seeded_from', 'combo_name')
from public.products p
cross join (
  values
    ('Formação AASI', 1, 2, 'anos'),
    ('Ajustes Finos', 2, 15, 'dias'),
    ('Perda em Rampa', 3, 15, 'dias')
) as component(componente, ordem, duracao, unidade_duracao)
where lower(p.nome_oficial) like '%aasi%'
  and lower(p.nome_oficial) like '%ajuste%'
  and lower(p.nome_oficial) like '%rampa%'
  and not exists (
    select 1 from public.product_components existing
    where existing.product_id = p.id
      and lower(existing.componente) = lower(component.componente)
  );
