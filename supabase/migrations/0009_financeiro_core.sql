create extension if not exists "pgcrypto";

create schema if not exists app_private;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fin_tipo_lancamento') then
    create type public.fin_tipo_lancamento as enum ('entrada', 'saida');
  end if;

  if not exists (select 1 from pg_type where typname = 'fin_status_lancamento') then
    create type public.fin_status_lancamento as enum ('realizado', 'previsto', 'cancelado');
  end if;

  if not exists (select 1 from pg_type where typname = 'fin_forma_pagamento') then
    create type public.fin_forma_pagamento as enum (
      'conta_bancaria',
      'cartao_credito',
      'pix',
      'boleto',
      'dinheiro'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fin_perfil_acesso') then
    create type public.fin_perfil_acesso as enum ('admin', 'marketing');
  end if;

  if not exists (select 1 from pg_type where typname = 'fin_frequencia_recorrencia') then
    create type public.fin_frequencia_recorrencia as enum ('semanal', 'mensal', 'anual');
  end if;

  if not exists (select 1 from pg_type where typname = 'fin_origem_lancamento') then
    create type public.fin_origem_lancamento as enum (
      'manual',
      'importacao',
      'parcelamento',
      'recorrencia',
      'depreciacao',
      'provisao_imposto'
    );
  end if;
end $$;

create or replace function app_private.fin_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.fin_bancos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  apelido text,
  saldo_inicial numeric(14,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.fin_cartoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  banco_id uuid not null references public.fin_bancos(id) on delete restrict,
  nome text not null,
  dia_fechamento integer not null,
  dia_vencimento integer not null,
  limite numeric(14,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_cartoes_fechamento_valido check (dia_fechamento between 1 and 31),
  constraint fin_cartoes_vencimento_valido check (dia_vencimento between 1 and 31),
  unique (tenant_id, nome)
);

create table if not exists public.fin_centros_resultado (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  ordem integer not null default 100,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.fin_naturezas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.fin_categorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo public.fin_tipo_lancamento not null,
  natureza_id uuid references public.fin_naturezas(id) on delete restrict,
  nome text not null,
  dre_grupo text not null default 'despesas_operacionais',
  dre_subgrupo text,
  fluxo_grupo text,
  ordem integer not null default 100,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, tipo, nome)
);

create table if not exists public.fin_subcategorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  categoria_id uuid not null references public.fin_categorias(id) on delete restrict,
  nome text not null,
  dre_grupo text,
  dre_subgrupo text,
  ordem integer not null default 100,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, categoria_id, nome)
);

create table if not exists public.fin_cursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  aliases text[] not null default '{}'::text[],
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.fin_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  chave text not null,
  valor jsonb not null default '{}'::jsonb,
  descricao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, chave)
);

create table if not exists public.fin_perfis_usuario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  perfil public.fin_perfil_acesso not null,
  centros_permitidos uuid[] not null default '{}'::uuid[],
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.fin_recorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo public.fin_tipo_lancamento not null,
  status public.fin_status_lancamento not null default 'previsto',
  centro_resultado_id uuid not null references public.fin_centros_resultado(id) on delete restrict,
  categoria_id uuid not null references public.fin_categorias(id) on delete restrict,
  subcategoria_id uuid references public.fin_subcategorias(id) on delete restrict,
  curso_id uuid references public.fin_cursos(id) on delete restrict,
  forma_pagamento public.fin_forma_pagamento not null,
  banco_id uuid references public.fin_bancos(id) on delete restrict,
  cartao_id uuid references public.fin_cartoes(id) on delete restrict,
  frequencia public.fin_frequencia_recorrencia not null default 'mensal',
  data_inicio date not null,
  data_fim date,
  mes_competencia date,
  descricao text not null,
  valor numeric(14,2) not null,
  observacao text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_recorrencias_valor_positivo check (valor > 0),
  constraint fin_recorrencias_periodo_valido check (data_fim is null or data_fim >= data_inicio)
);

create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_pagamento date not null,
  mes_competencia date not null,
  tipo public.fin_tipo_lancamento not null,
  status public.fin_status_lancamento not null default 'previsto',
  centro_resultado_id uuid not null references public.fin_centros_resultado(id) on delete restrict,
  categoria_id uuid not null references public.fin_categorias(id) on delete restrict,
  subcategoria_id uuid references public.fin_subcategorias(id) on delete restrict,
  forma_pagamento public.fin_forma_pagamento not null,
  banco_id uuid references public.fin_bancos(id) on delete restrict,
  cartao_id uuid references public.fin_cartoes(id) on delete restrict,
  qtd_parcelas integer not null default 1,
  parcela_numero integer not null default 1,
  parcela_pai_id uuid references public.fin_lancamentos(id) on delete cascade,
  valor_total_parcelamento numeric(14,2),
  recorrencia_id uuid references public.fin_recorrencias(id) on delete set null,
  curso_id uuid references public.fin_cursos(id) on delete restrict,
  descricao text not null,
  valor numeric(14,2) not null,
  observacao text,
  status_origem text,
  origem public.fin_origem_lancamento not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_lancamentos_valor_positivo check (valor > 0),
  constraint fin_lancamentos_parcelas_validas check (qtd_parcelas >= 1 and parcela_numero >= 1 and parcela_numero <= qtd_parcelas),
  constraint fin_lancamentos_pagamento_obrigatorio check (
    (forma_pagamento = 'cartao_credito' and cartao_id is not null and banco_id is null)
    or (forma_pagamento <> 'cartao_credito' and banco_id is not null and cartao_id is null)
  )
);

create table if not exists public.fin_capex (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  descricao text not null,
  valor_total numeric(14,2) not null,
  data_aquisicao date not null,
  vida_util_meses integer not null,
  lancamento_origem_id uuid references public.fin_lancamentos(id) on delete set null,
  confirmado boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_capex_valor_positivo check (valor_total > 0),
  constraint fin_capex_vida_util_valida check (vida_util_meses > 0)
);

create index if not exists fin_bancos_tenant_idx on public.fin_bancos (tenant_id, ativo);
create index if not exists fin_cartoes_tenant_idx on public.fin_cartoes (tenant_id, ativo);
create index if not exists fin_lancamentos_tenant_data_idx on public.fin_lancamentos (tenant_id, data_pagamento);
create index if not exists fin_lancamentos_tenant_competencia_idx on public.fin_lancamentos (tenant_id, mes_competencia);
create index if not exists fin_lancamentos_tenant_centro_idx on public.fin_lancamentos (tenant_id, centro_resultado_id);
create index if not exists fin_lancamentos_cartao_data_idx on public.fin_lancamentos (tenant_id, cartao_id, data_pagamento) where cartao_id is not null;
create unique index if not exists fin_lancamentos_recorrencia_data_idx
on public.fin_lancamentos (tenant_id, recorrencia_id, data_pagamento)
where recorrencia_id is not null;
create unique index if not exists fin_capex_lancamento_origem_idx
on public.fin_capex (lancamento_origem_id)
where lancamento_origem_id is not null;

create or replace function app_private.fin_user_profile(target_tenant_id uuid)
returns public.fin_perfil_acesso
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select fpu.perfil
  from public.fin_perfis_usuario fpu
  where fpu.tenant_id = target_tenant_id
    and fpu.user_id = auth.uid()
    and fpu.ativo = true
  limit 1;
$$;

create or replace function app_private.fin_is_admin(target_tenant_id uuid)
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
      and fpu.perfil = 'admin'
      and fpu.ativo = true
  );
$$;

create or replace function app_private.fin_is_marketing(target_tenant_id uuid)
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
      and fpu.perfil = 'marketing'
      and fpu.ativo = true
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
      and fcr.nome = 'Infoproduto'
      and fcr.ativo = true
  );
$$;

create or replace function app_private.fin_last_day(target_month date)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select extract(day from (date_trunc('month', target_month)::date + interval '1 month - 1 day'))::integer;
$$;

create or replace function app_private.fin_due_date(base_month date, due_day integer)
returns date
language sql
immutable
set search_path = public, pg_temp
as $$
  select make_date(
    extract(year from base_month)::integer,
    extract(month from base_month)::integer,
    least(due_day, app_private.fin_last_day(base_month))
  );
$$;

create or replace function app_private.fin_calcular_primeira_fatura(purchase_date date, closing_day integer, due_day integer)
returns date
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  purchase_month date := date_trunc('month', purchase_date)::date;
  due_month date;
begin
  if extract(day from purchase_date)::integer <= closing_day then
    due_month := purchase_month;
  else
    due_month := (purchase_month + interval '1 month')::date;
  end if;

  return app_private.fin_due_date(due_month, due_day);
end;
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
  new.created_by := coalesce(new.created_by, auth.uid());

  if new.valor <= 0 then
    raise exception 'O valor do lancamento precisa ser maior que zero.';
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

  if centro_nome = 'Infoproduto' and new.tipo = 'entrada' and new.curso_id is null then
    raise exception 'curso_id e obrigatorio para entrada de Infoproduto.';
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
    raise exception 'Categoria inexistente, inativa, de outro tenant ou incompatível com o tipo.';
  end if;

  if new.subcategoria_id is not null and not exists (
    select 1 from public.fin_subcategorias fs
    where fs.id = new.subcategoria_id
      and fs.tenant_id = new.tenant_id
      and fs.categoria_id = new.categoria_id
      and fs.ativo = true
  ) then
    raise exception 'Subcategoria inexistente, inativa, de outro tenant ou incompatível com a categoria.';
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
  end if;

  return new;
end;
$$;

create or replace function app_private.fin_after_lancamento_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  parcela integer;
  parcela_valor numeric(14,2);
  total_parcelado numeric(14,2);
  data_base date;
begin
  if new.forma_pagamento = 'cartao_credito'
    and new.qtd_parcelas > 1
    and new.parcela_pai_id is null
    and new.origem in ('manual', 'importacao')
  then
    total_parcelado := coalesce(new.valor_total_parcelamento, new.valor * new.qtd_parcelas);

    for parcela in 2..new.qtd_parcelas loop
      data_base := (date_trunc('month', new.data_pagamento)::date + ((parcela - 1) || ' months')::interval)::date;

      if parcela = new.qtd_parcelas then
        parcela_valor := total_parcelado - (round(total_parcelado / new.qtd_parcelas, 2) * (new.qtd_parcelas - 1));
      else
        parcela_valor := round(total_parcelado / new.qtd_parcelas, 2);
      end if;

      insert into public.fin_lancamentos (
        tenant_id,
        data_pagamento,
        mes_competencia,
        tipo,
        status,
        centro_resultado_id,
        categoria_id,
        subcategoria_id,
        forma_pagamento,
        banco_id,
        cartao_id,
        qtd_parcelas,
        parcela_numero,
        parcela_pai_id,
        valor_total_parcelamento,
        recorrencia_id,
        curso_id,
        descricao,
        valor,
        observacao,
        status_origem,
        origem,
        metadata,
        created_by
      )
      values (
        new.tenant_id,
        app_private.fin_due_date(data_base, (select dia_vencimento from public.fin_cartoes where id = new.cartao_id)),
        new.mes_competencia,
        new.tipo,
        'previsto',
        new.centro_resultado_id,
        new.categoria_id,
        new.subcategoria_id,
        new.forma_pagamento,
        null,
        new.cartao_id,
        new.qtd_parcelas,
        parcela,
        new.id,
        total_parcelado,
        new.recorrencia_id,
        new.curso_id,
        new.descricao || ' (' || parcela || '/' || new.qtd_parcelas || ')',
        parcela_valor,
        new.observacao,
        new.status_origem,
        'parcelamento',
        new.metadata || jsonb_build_object('parcela_gerada_de', new.id),
        new.created_by
      );
    end loop;
  end if;

  return new;
end;
$$;

create or replace function app_private.fin_generate_recorrencia_lancamentos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  step_interval interval;
  occurrence_date date;
  index_count integer := 0;
begin
  if new.ativo is not true then
    return new;
  end if;

  step_interval := case new.frequencia
    when 'semanal' then interval '1 week'
    when 'anual' then interval '1 year'
    else interval '1 month'
  end;

  occurrence_date := new.data_inicio;

  while index_count < 12 loop
    exit when new.data_fim is not null and occurrence_date > new.data_fim;

    insert into public.fin_lancamentos (
      tenant_id,
      data_pagamento,
      mes_competencia,
      tipo,
      status,
      centro_resultado_id,
      categoria_id,
      subcategoria_id,
      curso_id,
      forma_pagamento,
      banco_id,
      cartao_id,
      descricao,
      valor,
      observacao,
      recorrencia_id,
      origem,
      created_by
    )
    values (
      new.tenant_id,
      occurrence_date,
      date_trunc('month', coalesce(new.mes_competencia, occurrence_date))::date,
      new.tipo,
      'previsto',
      new.centro_resultado_id,
      new.categoria_id,
      new.subcategoria_id,
      new.curso_id,
      new.forma_pagamento,
      new.banco_id,
      new.cartao_id,
      new.descricao,
      new.valor,
      new.observacao,
      new.id,
      'recorrencia',
      new.created_by
    )
    on conflict (tenant_id, recorrencia_id, data_pagamento) do nothing;

    occurrence_date := (occurrence_date + step_interval)::date;
    index_count := index_count + 1;
  end loop;

  return new;
end;
$$;

create or replace function app_private.fin_auto_capex()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  capex_limit numeric(14,2) := 5000;
  detected_equipment boolean := false;
  vida_util integer := 60;
  capex_id uuid;
  depreciation_category_id uuid;
  depreciation_subcategory_id uuid;
  depreciation_banco_id uuid;
  idx integer;
begin
  if new.tipo <> 'saida' or new.origem in ('depreciacao', 'provisao_imposto') then
    return new;
  end if;

  select coalesce(
    (
      select (valor->>'limite_capex')::numeric
      from public.fin_config
      where tenant_id = new.tenant_id and chave = 'financeiro'
    ),
    capex_limit
  )
  into capex_limit;

  select exists (
    select 1
    from public.fin_categorias fc
    left join public.fin_subcategorias fs on fs.id = new.subcategoria_id
    where fc.id = new.categoria_id
      and (fc.nome ilike '%equip%' or fs.nome ilike '%equip%')
  ) into detected_equipment;

  if new.valor <= capex_limit or detected_equipment is not true then
    return new;
  end if;

  insert into public.fin_capex (
    tenant_id,
    descricao,
    valor_total,
    data_aquisicao,
    vida_util_meses,
    lancamento_origem_id,
    confirmado
  )
  values (
    new.tenant_id,
    new.descricao,
    new.valor,
    new.data_pagamento,
    vida_util,
    new.id,
    false
  )
  on conflict (lancamento_origem_id) where lancamento_origem_id is not null do nothing
  returning id into capex_id;

  select fs.categoria_id, fs.id
  into depreciation_category_id, depreciation_subcategory_id
  from public.fin_subcategorias fs
  join public.fin_categorias fc on fc.id = fs.categoria_id
  where fs.tenant_id = new.tenant_id
    and (fs.nome ilike '%deprecia%' or fc.nome ilike '%deprecia%')
  limit 1;

  if depreciation_category_id is null then
    depreciation_category_id := new.categoria_id;
    depreciation_subcategory_id := new.subcategoria_id;
  end if;

  depreciation_banco_id := new.banco_id;

  if depreciation_banco_id is null then
    select id into depreciation_banco_id
    from public.fin_bancos
    where tenant_id = new.tenant_id and ativo = true
    order by created_at
    limit 1;
  end if;

  if depreciation_banco_id is null then
    return new;
  end if;

  for idx in 1..vida_util loop
    insert into public.fin_lancamentos (
      tenant_id,
      data_pagamento,
      mes_competencia,
      tipo,
      status,
      centro_resultado_id,
      categoria_id,
      subcategoria_id,
      forma_pagamento,
      banco_id,
      descricao,
      valor,
      observacao,
      origem,
      metadata,
      created_by
    )
    values (
      new.tenant_id,
      (date_trunc('month', new.data_pagamento)::date + (idx || ' months')::interval)::date,
      (date_trunc('month', new.data_pagamento)::date + ((idx - 1) || ' months')::interval)::date,
      'saida',
      'previsto',
      new.centro_resultado_id,
      depreciation_category_id,
      depreciation_subcategory_id,
      'conta_bancaria',
      depreciation_banco_id,
      'Depreciacao - ' || new.descricao,
      round(new.valor / vida_util, 2),
      'Lancamento automatico de depreciacao sugerida por CAPEX.',
      'depreciacao',
      jsonb_build_object('capex_origem_id', coalesce(capex_id, null), 'lancamento_origem_id', new.id),
      new.created_by
    );
  end loop;

  return new;
end;
$$;

create or replace function app_private.fin_auto_provisao_imposto()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  percentual numeric := 0.06;
  imposto_categoria_id uuid;
  imposto_subcategoria_id uuid;
  banco_padrao_id uuid;
  due_date date;
begin
  if new.tipo <> 'entrada'
    or new.status <> 'realizado'
    or new.origem = 'provisao_imposto'
    or not app_private.fin_is_infoproduto_centro(new.centro_resultado_id)
  then
    return new;
  end if;

  select coalesce(
    (
      select (valor->>'percentual_provisao_imposto')::numeric
      from public.fin_config
      where tenant_id = new.tenant_id and chave = 'financeiro'
    ),
    percentual
  )
  into percentual;

  select fs.categoria_id, fs.id
  into imposto_categoria_id, imposto_subcategoria_id
  from public.fin_subcategorias fs
  join public.fin_categorias fc on fc.id = fs.categoria_id
  where fs.tenant_id = new.tenant_id
    and (fs.nome ilike '%imposto%' or fc.nome ilike '%imposto%')
    and fc.tipo = 'saida'
  limit 1;

  if imposto_categoria_id is null then
    return new;
  end if;

  select id into banco_padrao_id
  from public.fin_bancos
  where tenant_id = new.tenant_id and ativo = true
  order by created_at
  limit 1;

  if banco_padrao_id is null then
    return new;
  end if;

  due_date := app_private.fin_due_date((date_trunc('month', new.data_pagamento)::date + interval '1 month')::date, 20);

  insert into public.fin_lancamentos (
    tenant_id,
    data_pagamento,
    mes_competencia,
    tipo,
    status,
    centro_resultado_id,
    categoria_id,
    subcategoria_id,
    forma_pagamento,
    banco_id,
    descricao,
    valor,
    observacao,
    origem,
    metadata,
    created_by
  )
  values (
    new.tenant_id,
    due_date,
    new.mes_competencia,
    'saida',
    'previsto',
    new.centro_resultado_id,
    imposto_categoria_id,
    imposto_subcategoria_id,
    'boleto',
    banco_padrao_id,
    'Provisao de imposto sobre venda - ' || new.descricao,
    round(new.valor * percentual, 2),
    'Provisao automatica de imposto sobre vendas.',
    'provisao_imposto',
    jsonb_build_object('lancamento_origem_id', new.id, 'percentual', percentual),
    new.created_by
  );

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'fin_bancos',
    'fin_cartoes',
    'fin_centros_resultado',
    'fin_naturezas',
    'fin_categorias',
    'fin_subcategorias',
    'fin_cursos',
    'fin_config',
    'fin_perfis_usuario',
    'fin_recorrencias',
    'fin_lancamentos',
    'fin_capex'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function app_private.fin_set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end $$;

drop trigger if exists fin_lancamentos_before_save on public.fin_lancamentos;
create trigger fin_lancamentos_before_save
before insert or update on public.fin_lancamentos
for each row execute function app_private.fin_validate_lancamento();

drop trigger if exists fin_lancamentos_after_insert on public.fin_lancamentos;
create trigger fin_lancamentos_after_insert
after insert on public.fin_lancamentos
for each row execute function app_private.fin_after_lancamento_insert();

drop trigger if exists fin_recorrencias_generate on public.fin_recorrencias;
create trigger fin_recorrencias_generate
after insert or update on public.fin_recorrencias
for each row execute function app_private.fin_generate_recorrencia_lancamentos();

drop trigger if exists fin_lancamentos_auto_capex on public.fin_lancamentos;
create trigger fin_lancamentos_auto_capex
after insert on public.fin_lancamentos
for each row execute function app_private.fin_auto_capex();

drop trigger if exists fin_lancamentos_auto_provisao_imposto on public.fin_lancamentos;
create trigger fin_lancamentos_auto_provisao_imposto
after insert on public.fin_lancamentos
for each row execute function app_private.fin_auto_provisao_imposto();

create or replace view public.fin_v_dre_por_centro
with (security_invoker = true)
as
with base as (
  select
    l.tenant_id,
    l.centro_resultado_id,
    c.nome as centro_resultado,
    date_trunc('month', l.mes_competencia)::date as mes_competencia,
    coalesce(sc.dre_grupo, cat.dre_grupo) as dre_grupo,
    l.tipo,
    l.valor
  from public.fin_lancamentos l
  join public.fin_centros_resultado c on c.id = l.centro_resultado_id
  join public.fin_categorias cat on cat.id = l.categoria_id
  left join public.fin_subcategorias sc on sc.id = l.subcategoria_id
  where l.status <> 'cancelado'
),
agg as (
  select
    tenant_id,
    centro_resultado_id,
    centro_resultado,
    mes_competencia,
    sum(valor) filter (where tipo = 'entrada' and dre_grupo = 'receita_bruta') as receita_bruta,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'deducoes') as deducoes,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'custos_diretos') as custos_diretos,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'vendas_marketing') as vendas_marketing,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'despesas_administrativas') as despesas_administrativas,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'despesas_pessoal') as despesas_pessoal,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'depreciacao') as depreciacao,
    sum(valor) filter (where tipo = 'entrada' and dre_grupo = 'resultado_financeiro') as receitas_financeiras,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'resultado_financeiro') as despesas_financeiras,
    sum(valor) filter (where tipo = 'saida' and dre_grupo = 'irpj_csll') as irpj_csll
  from base
  group by tenant_id, centro_resultado_id, centro_resultado, mes_competencia
)
select
  tenant_id,
  centro_resultado_id,
  centro_resultado,
  mes_competencia,
  coalesce(receita_bruta, 0) as receita_bruta,
  -coalesce(deducoes, 0) as deducoes,
  coalesce(receita_bruta, 0) - coalesce(deducoes, 0) as receita_liquida,
  -coalesce(custos_diretos, 0) as custos_diretos,
  coalesce(receita_bruta, 0) - coalesce(deducoes, 0) - coalesce(custos_diretos, 0) as lucro_bruto,
  -coalesce(vendas_marketing, 0) as vendas_marketing,
  -coalesce(despesas_administrativas, 0) as despesas_administrativas,
  -coalesce(despesas_pessoal, 0) as despesas_pessoal,
  coalesce(receita_bruta, 0) - coalesce(deducoes, 0) - coalesce(custos_diretos, 0)
    - coalesce(vendas_marketing, 0) - coalesce(despesas_administrativas, 0) - coalesce(despesas_pessoal, 0) as ebitda,
  -coalesce(depreciacao, 0) as depreciacao,
  coalesce(receita_bruta, 0) - coalesce(deducoes, 0) - coalesce(custos_diretos, 0)
    - coalesce(vendas_marketing, 0) - coalesce(despesas_administrativas, 0) - coalesce(despesas_pessoal, 0)
    - coalesce(depreciacao, 0) as ebit,
  coalesce(receitas_financeiras, 0) - coalesce(despesas_financeiras, 0) as resultado_financeiro,
  -coalesce(irpj_csll, 0) as irpj_csll,
  coalesce(receita_bruta, 0) - coalesce(deducoes, 0) - coalesce(custos_diretos, 0)
    - coalesce(vendas_marketing, 0) - coalesce(despesas_administrativas, 0) - coalesce(despesas_pessoal, 0)
    - coalesce(depreciacao, 0) + coalesce(receitas_financeiras, 0) - coalesce(despesas_financeiras, 0)
    - coalesce(irpj_csll, 0) as lucro_liquido
from agg;

create or replace view public.fin_v_dre_consolidado
with (security_invoker = true)
as
select
  tenant_id,
  mes_competencia,
  sum(receita_bruta) as receita_bruta,
  sum(deducoes) as deducoes,
  sum(receita_liquida) as receita_liquida,
  sum(custos_diretos) as custos_diretos,
  sum(lucro_bruto) as lucro_bruto,
  sum(vendas_marketing) as vendas_marketing,
  sum(despesas_administrativas) as despesas_administrativas,
  sum(despesas_pessoal) as despesas_pessoal,
  sum(ebitda) as ebitda,
  sum(depreciacao) as depreciacao,
  sum(ebit) as ebit,
  sum(resultado_financeiro) as resultado_financeiro,
  sum(irpj_csll) as irpj_csll,
  sum(lucro_liquido) as lucro_liquido
from public.fin_v_dre_por_centro
group by tenant_id, mes_competencia;

create or replace view public.fin_v_dre_por_curso
with (security_invoker = true)
as
with base as (
  select
    l.tenant_id,
    l.curso_id,
    coalesce(curso.nome, 'Sem curso') as curso_nome,
    coalesce(sc.dre_grupo, cat.dre_grupo) as dre_grupo,
    l.tipo,
    l.valor
  from public.fin_lancamentos l
  join public.fin_centros_resultado centro on centro.id = l.centro_resultado_id and centro.nome = 'Infoproduto'
  join public.fin_categorias cat on cat.id = l.categoria_id
  left join public.fin_subcategorias sc on sc.id = l.subcategoria_id
  left join public.fin_cursos curso on curso.id = l.curso_id
  where l.status <> 'cancelado'
)
select
  tenant_id,
  curso_id,
  curso_nome,
  count(*) filter (where tipo = 'entrada' and dre_grupo = 'receita_bruta')::integer as quantidade_vendas,
  coalesce(sum(valor) filter (where tipo = 'entrada' and dre_grupo = 'receita_bruta'), 0) as receita_bruta,
  -coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'deducoes'), 0) as deducoes,
  coalesce(sum(valor) filter (where tipo = 'entrada' and dre_grupo = 'receita_bruta'), 0)
    - coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'deducoes'), 0) as receita_liquida,
  -coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'taxas_plataforma'), 0) as taxas_plataforma,
  -coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'coproducao'), 0) as coproducao,
  -coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'comissoes_afiliados'), 0) as comissoes_afiliados,
  -coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo = 'outros_custos_diretos'), 0) as outros_custos_diretos,
  coalesce(sum(valor) filter (where tipo = 'entrada' and dre_grupo = 'receita_bruta'), 0)
    - coalesce(sum(valor) filter (where tipo = 'saida' and dre_grupo in ('deducoes', 'taxas_plataforma', 'coproducao', 'comissoes_afiliados', 'outros_custos_diretos', 'custos_diretos')), 0) as margem_contribuicao
from base
group by tenant_id, curso_id, curso_nome;

create or replace view public.fin_v_previsao_caixa
with (security_invoker = true)
as
with tenant_days as (
  select
    tenant_scope.tenant_id,
    generate_series(current_date, current_date + interval '90 days', interval '1 day')::date as data
  from (
    select tenant_id from public.fin_bancos
    union
    select tenant_id from public.fin_lancamentos
  ) tenant_scope
),
daily as (
  select
    tenant_id,
    data_pagamento,
    sum(case when tipo = 'entrada' then valor else -valor end) as movimento
  from public.fin_lancamentos
  where status <> 'cancelado'
  group by tenant_id, data_pagamento
),
saldo_inicial as (
  select tenant_id, sum(saldo_inicial) as saldo
  from public.fin_bancos
  where ativo = true
  group by tenant_id
)
select
  td.tenant_id,
  td.data,
  coalesce(d.movimento, 0) as movimento_dia,
  coalesce(si.saldo, 0)
    + sum(coalesce(d.movimento, 0)) over (partition by td.tenant_id order by td.data rows between unbounded preceding and current row) as saldo_projetado
from tenant_days td
left join daily d on d.tenant_id = td.tenant_id and d.data_pagamento = td.data
left join saldo_inicial si on si.tenant_id = td.tenant_id;

create or replace view public.fin_v_fatura_cartao
with (security_invoker = true)
as
select
  l.tenant_id,
  l.cartao_id,
  c.nome as cartao_nome,
  c.banco_id,
  date_trunc('month', l.data_pagamento)::date as mes_vencimento,
  min(l.data_pagamento) as primeiro_vencimento,
  max(l.data_pagamento) as ultimo_vencimento,
  sum(case when l.tipo = 'saida' then l.valor else -l.valor end) as valor_estimado,
  count(*)::integer as qtd_lancamentos
from public.fin_lancamentos l
join public.fin_cartoes c on c.id = l.cartao_id
where l.forma_pagamento = 'cartao_credito'
  and l.status <> 'cancelado'
group by l.tenant_id, l.cartao_id, c.nome, c.banco_id, date_trunc('month', l.data_pagamento)::date;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'fin_bancos',
    'fin_cartoes',
    'fin_centros_resultado',
    'fin_naturezas',
    'fin_categorias',
    'fin_subcategorias',
    'fin_cursos',
    'fin_config',
    'fin_perfis_usuario',
    'fin_recorrencias',
    'fin_lancamentos',
    'fin_capex'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "fin admin all" on public.%I', table_name);
    execute format(
      'create policy "fin admin all" on public.%I for all to authenticated using (app_private.fin_is_admin(tenant_id)) with check (app_private.fin_is_admin(tenant_id))',
      table_name
    );
  end loop;
end $$;

drop policy if exists "fin marketing lancamentos read infoproduto" on public.fin_lancamentos;
create policy "fin marketing lancamentos read infoproduto"
on public.fin_lancamentos for select
to authenticated
using (
  app_private.fin_is_marketing(tenant_id)
  and app_private.fin_is_infoproduto_centro(centro_resultado_id)
);

drop policy if exists "fin marketing cursos read" on public.fin_cursos;
create policy "fin marketing cursos read"
on public.fin_cursos for select
to authenticated
using (app_private.fin_is_marketing(tenant_id));

drop policy if exists "fin marketing centros read infoproduto" on public.fin_centros_resultado;
create policy "fin marketing centros read infoproduto"
on public.fin_centros_resultado for select
to authenticated
using (app_private.fin_is_marketing(tenant_id) and nome = 'Infoproduto');

drop policy if exists "fin marketing naturezas read" on public.fin_naturezas;
create policy "fin marketing naturezas read"
on public.fin_naturezas for select
to authenticated
using (app_private.fin_is_marketing(tenant_id));

drop policy if exists "fin marketing categorias read" on public.fin_categorias;
create policy "fin marketing categorias read"
on public.fin_categorias for select
to authenticated
using (app_private.fin_is_marketing(tenant_id));

drop policy if exists "fin marketing subcategorias read" on public.fin_subcategorias;
create policy "fin marketing subcategorias read"
on public.fin_subcategorias for select
to authenticated
using (app_private.fin_is_marketing(tenant_id));

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.fin_bancos,
  public.fin_cartoes,
  public.fin_centros_resultado,
  public.fin_naturezas,
  public.fin_categorias,
  public.fin_subcategorias,
  public.fin_cursos,
  public.fin_config,
  public.fin_perfis_usuario,
  public.fin_recorrencias,
  public.fin_lancamentos,
  public.fin_capex
to authenticated;

grant select on
  public.fin_v_dre_consolidado,
  public.fin_v_dre_por_centro,
  public.fin_v_dre_por_curso,
  public.fin_v_previsao_caixa,
  public.fin_v_fatura_cartao
to authenticated;

grant execute on function app_private.fin_user_profile(uuid) to authenticated;
grant execute on function app_private.fin_is_admin(uuid) to authenticated;
grant execute on function app_private.fin_is_marketing(uuid) to authenticated;
grant execute on function app_private.fin_is_infoproduto_centro(uuid) to authenticated;
grant execute on function app_private.fin_calcular_primeira_fatura(date, integer, integer) to authenticated;
