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

  if centro_nome = 'Infoproduto' then
    new.subcategoria_id := null;
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
  end if;

  return new;
end;
$$;
