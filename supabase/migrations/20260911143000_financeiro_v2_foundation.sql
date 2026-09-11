-- Financeiro V2 foundation: taxonomy fields, specialist access and controlled snapshot support.
-- HML-only application in this task. Does not alter Hotmart, Student 360, Presence, Landing or raw data schemas.

alter type public.fin_perfil_acesso add value if not exists 'especialista';

alter table public.fin_lancamentos
  add column if not exists data_vencimento date,
  add column if not exists data_realizacao date,
  add column if not exists natureza_fluxo text not null default 'operacional',
  add column if not exists comportamento text not null default 'nao_aplicavel',
  add column if not exists fonte_original text,
  add column if not exists referencia_externa text,
  add column if not exists responsavel text,
  add column if not exists anexo_url text,
  add column if not exists classificacao_status text not null default 'trusted';

alter table public.fin_categorias
  add column if not exists natureza_fluxo_padrao text,
  add column if not exists comportamento_padrao text;

alter table public.fin_subcategorias
  add column if not exists natureza_fluxo_padrao text,
  add column if not exists comportamento_padrao text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_lancamentos_natureza_fluxo_check'
      and conrelid = 'public.fin_lancamentos'::regclass
  ) then
    alter table public.fin_lancamentos
      add constraint fin_lancamentos_natureza_fluxo_check
      check (natureza_fluxo in ('operacional', 'nao_operacional'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_lancamentos_comportamento_check'
      and conrelid = 'public.fin_lancamentos'::regclass
  ) then
    alter table public.fin_lancamentos
      add constraint fin_lancamentos_comportamento_check
      check (comportamento in ('fixo', 'variavel', 'nao_aplicavel'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_lancamentos_classificacao_status_check'
      and conrelid = 'public.fin_lancamentos'::regclass
  ) then
    alter table public.fin_lancamentos
      add constraint fin_lancamentos_classificacao_status_check
      check (classificacao_status in ('trusted', 'partial', 'review', 'unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_categorias_natureza_fluxo_padrao_check'
      and conrelid = 'public.fin_categorias'::regclass
  ) then
    alter table public.fin_categorias
      add constraint fin_categorias_natureza_fluxo_padrao_check
      check (natureza_fluxo_padrao is null or natureza_fluxo_padrao in ('operacional', 'nao_operacional'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_categorias_comportamento_padrao_check'
      and conrelid = 'public.fin_categorias'::regclass
  ) then
    alter table public.fin_categorias
      add constraint fin_categorias_comportamento_padrao_check
      check (comportamento_padrao is null or comportamento_padrao in ('fixo', 'variavel', 'nao_aplicavel'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_subcategorias_natureza_fluxo_padrao_check'
      and conrelid = 'public.fin_subcategorias'::regclass
  ) then
    alter table public.fin_subcategorias
      add constraint fin_subcategorias_natureza_fluxo_padrao_check
      check (natureza_fluxo_padrao is null or natureza_fluxo_padrao in ('operacional', 'nao_operacional'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'fin_subcategorias_comportamento_padrao_check'
      and conrelid = 'public.fin_subcategorias'::regclass
  ) then
    alter table public.fin_subcategorias
      add constraint fin_subcategorias_comportamento_padrao_check
      check (comportamento_padrao is null or comportamento_padrao in ('fixo', 'variavel', 'nao_aplicavel'));
  end if;
end $$;

update public.fin_lancamentos
set data_vencimento = coalesce(data_vencimento, data_pagamento),
    data_realizacao = coalesce(data_realizacao, case when status = 'realizado' then data_pagamento end),
    fonte_original = coalesce(fonte_original, origem::text),
    classificacao_status = coalesce(classificacao_status, 'trusted')
where data_vencimento is null
   or (status = 'realizado' and data_realizacao is null)
   or fonte_original is null
   or classificacao_status is null;

create index if not exists fin_lancamentos_tenant_vencimento_idx
on public.fin_lancamentos (tenant_id, data_vencimento);

create index if not exists fin_lancamentos_tenant_realizacao_idx
on public.fin_lancamentos (tenant_id, data_realizacao)
where data_realizacao is not null;

create index if not exists fin_lancamentos_tenant_taxonomy_idx
on public.fin_lancamentos (tenant_id, tipo, natureza_fluxo, comportamento, status);

create table if not exists public.fin_lancamentos_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  snapshot_key text not null,
  snapshot_at timestamptz not null default now(),
  lancamento_id uuid,
  row_data jsonb not null,
  created_by text not null default 'system',
  unique (tenant_id, snapshot_key, lancamento_id)
);

alter table public.fin_lancamentos_snapshot enable row level security;

drop policy if exists "fin admin snapshot read" on public.fin_lancamentos_snapshot;
create policy "fin admin snapshot read"
on public.fin_lancamentos_snapshot for select
to authenticated
using (app_private.fin_is_admin(tenant_id));

grant select on public.fin_lancamentos_snapshot to authenticated;

create or replace function app_private.fin_is_especialista(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.fin_perfis_usuario fpu
    where fpu.tenant_id = target_tenant_id
      and fpu.user_id = auth.uid()
      and fpu.perfil = 'especialista'
      and fpu.ativo = true
  ) or exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.ativo = true
      and tm.role::text = 'ESPECIALISTA'
  );
$$;

create or replace function app_private.fin_is_infoproduto_centro(target_centro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.fin_centros_resultado fcr
    where fcr.id = target_centro_id
      and fcr.nome in ('Infoproduto', 'Infoprodutos')
      and fcr.ativo = true
  );
$$;

create or replace function app_private.fin_validate_lancamento()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  centro_nome text;
  cartao_record public.fin_cartoes%rowtype;
  banco_ativo boolean;
  total_value numeric(14,2);
begin
  new.mes_competencia := date_trunc('month', coalesce(new.mes_competencia, new.data_pagamento))::date;
  new.data_vencimento := coalesce(new.data_vencimento, new.data_pagamento);
  new.data_realizacao := case when new.status = 'realizado' then coalesce(new.data_realizacao, new.data_pagamento) else new.data_realizacao end;
  new.created_by := coalesce(new.created_by, auth.uid());

  if new.valor <= 0 then
    raise exception 'O valor do lancamento precisa ser maior que zero.';
  end if;

  if new.natureza_fluxo not in ('operacional', 'nao_operacional') then
    raise exception 'Natureza do fluxo invalida.';
  end if;

  if new.comportamento not in ('fixo', 'variavel', 'nao_aplicavel') then
    raise exception 'Comportamento financeiro invalido.';
  end if;

  if new.forma_pagamento = 'cartao_credito' then
    if new.cartao_id is null then
      raise exception 'cartao_id e obrigatorio para lancamento em cartao de credito.';
    end if;

    select * into cartao_record
    from public.fin_cartoes
    where id = new.cartao_id
      and tenant_id = new.tenant_id
      and ativo = true;

    if not found then
      raise exception 'Cartao inexistente, inativo ou de outro tenant.';
    end if;

    new.banco_id := null;
  else
    if new.banco_id is null then
      raise exception 'banco_id e obrigatorio para esta forma de pagamento.';
    end if;

    select ativo into banco_ativo
    from public.fin_bancos
    where id = new.banco_id
      and tenant_id = new.tenant_id;

    if banco_ativo is distinct from true then
      raise exception 'Banco inexistente, inativo ou de outro tenant.';
    end if;

    new.cartao_id := null;
  end if;

  select nome into centro_nome
  from public.fin_centros_resultado
  where id = new.centro_resultado_id
    and tenant_id = new.tenant_id;

  if centro_nome is null then
    raise exception 'Centro de resultado inexistente ou de outro tenant.';
  end if;

  if new.curso_id is not null and not exists (
    select 1 from public.fin_cursos fc
    where fc.id = new.curso_id
      and fc.tenant_id = new.tenant_id
      and fc.ativo = true
  ) then
    raise exception 'Curso inexistente, inativo ou de outro tenant.';
  end if;

  if not exists (
    select 1 from public.fin_categorias fc
    where fc.id = new.categoria_id
      and fc.tenant_id = new.tenant_id
      and fc.tipo = new.tipo
      and fc.ativo = true
  ) then
    raise exception 'Categoria inexistente, inativa, de outro tenant ou incompativel com o tipo.';
  end if;

  if new.subcategoria_id is not null and not exists (
    select 1 from public.fin_subcategorias fs
    where fs.id = new.subcategoria_id
      and fs.tenant_id = new.tenant_id
      and fs.categoria_id = new.categoria_id
      and fs.ativo = true
  ) then
    raise exception 'Subcategoria inexistente, inativa, de outro tenant ou incompativel com a categoria.';
  end if;

  if tg_op = 'INSERT'
    and new.forma_pagamento = 'cartao_credito'
    and new.qtd_parcelas > 1
    and new.parcela_pai_id is null
    and new.origem in ('manual', 'importacao')
  then
    total_value := new.valor;
    new.valor_total_parcelamento := total_value;
    new.valor := round(total_value / new.qtd_parcelas, 2);
    new.parcela_numero := 1;
    new.data_pagamento := app_private.fin_calcular_primeira_fatura(
      new.data_pagamento,
      cartao_record.dia_fechamento,
      cartao_record.dia_vencimento
    );
    new.data_vencimento := coalesce(new.data_vencimento, new.data_pagamento);
    new.data_realizacao := case when new.status = 'realizado' then coalesce(new.data_realizacao, new.data_pagamento) else new.data_realizacao end;
  end if;

  return new;
end;
$$;

drop policy if exists "fin especialista bancos read" on public.fin_bancos;
create policy "fin especialista bancos read" on public.fin_bancos for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista cartoes read" on public.fin_cartoes;
create policy "fin especialista cartoes read" on public.fin_cartoes for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista centros read" on public.fin_centros_resultado;
create policy "fin especialista centros read" on public.fin_centros_resultado for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista naturezas read" on public.fin_naturezas;
create policy "fin especialista naturezas read" on public.fin_naturezas for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista categorias read" on public.fin_categorias;
create policy "fin especialista categorias read" on public.fin_categorias for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista subcategorias read" on public.fin_subcategorias;
create policy "fin especialista subcategorias read" on public.fin_subcategorias for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista cursos read" on public.fin_cursos;
create policy "fin especialista cursos read" on public.fin_cursos for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista lancamentos read" on public.fin_lancamentos;
create policy "fin especialista lancamentos read" on public.fin_lancamentos for select to authenticated using (app_private.fin_is_especialista(tenant_id));

drop policy if exists "fin especialista recorrencias read" on public.fin_recorrencias;
create policy "fin especialista recorrencias read" on public.fin_recorrencias for select to authenticated using (app_private.fin_is_especialista(tenant_id));

grant execute on function app_private.fin_is_especialista(uuid) to authenticated;

do $$
begin
  update public.fin_perfis_usuario fpu
  set perfil = 'especialista'
  from public.tenant_members tm
  where tm.tenant_id = fpu.tenant_id
    and tm.user_id = fpu.user_id
    and tm.ativo = true
    and tm.role::text = 'ESPECIALISTA'
    and fpu.perfil <> 'especialista';
end $$;

create or replace view public.fin_v2_cash_monthly
with (security_invoker = true)
as
select
  l.tenant_id,
  date_trunc('month', coalesce(l.data_realizacao, l.data_pagamento))::date as mes_caixa,
  l.tipo,
  l.status,
  l.natureza_fluxo,
  l.comportamento,
  cr.nome as centro_resultado,
  cat.nome as categoria,
  sc.nome as subcategoria,
  count(*)::integer as lancamentos,
  sum(l.valor)::numeric(14,2) as valor_total
from public.fin_lancamentos l
join public.fin_centros_resultado cr on cr.id = l.centro_resultado_id
join public.fin_categorias cat on cat.id = l.categoria_id
left join public.fin_subcategorias sc on sc.id = l.subcategoria_id
where l.status <> 'cancelado'
group by 1,2,3,4,5,6,7,8,9;

grant select on public.fin_v2_cash_monthly to authenticated;
