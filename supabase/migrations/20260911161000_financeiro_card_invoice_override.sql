-- Financeiro V2: permite escolher explicitamente a primeira fatura de cartão.
-- Escopo: reaproveita fin_lancamentos, fin_cartoes, trigger de parcelamento e fin_v_fatura_cartao.

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
  primeira_fatura_text text;
  primeira_fatura_mes date;
begin
  new.mes_competencia := date_trunc('month', coalesce(new.mes_competencia, new.data_pagamento))::date;
  new.data_vencimento := coalesce(new.data_vencimento, new.data_pagamento);
  new.data_realizacao := case when new.status = 'realizado' then coalesce(new.data_realizacao, new.data_pagamento) else new.data_realizacao end;
  new.created_by := coalesce(new.created_by, auth.uid());
  new.metadata := coalesce(new.metadata, '{}'::jsonb);

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

    primeira_fatura_text := nullif(new.metadata ->> 'primeira_fatura_mes', '');
    if primeira_fatura_text is not null then
      primeira_fatura_mes := date_trunc('month', (primeira_fatura_text || '-01')::date)::date;
    end if;

    if primeira_fatura_mes is not null
      and new.parcela_pai_id is null
      and new.origem in ('manual', 'importacao')
    then
      new.data_pagamento := app_private.fin_due_date(primeira_fatura_mes, cartao_record.dia_vencimento);
      new.data_vencimento := new.data_pagamento;
      new.data_realizacao := case when new.status = 'realizado' then coalesce(new.data_realizacao, new.data_pagamento) else null end;
      new.metadata := new.metadata || jsonb_build_object(
        'data_financeira_cartao', new.data_pagamento,
        'vencimento_primeira_fatura', new.data_vencimento
      );
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

    if primeira_fatura_mes is not null then
      new.data_pagamento := app_private.fin_due_date(primeira_fatura_mes, cartao_record.dia_vencimento);
    else
      new.data_pagamento := app_private.fin_calcular_primeira_fatura(
        new.data_pagamento,
        cartao_record.dia_fechamento,
        cartao_record.dia_vencimento
      );
    end if;

    new.data_vencimento := new.data_pagamento;
    new.data_realizacao := case when new.status = 'realizado' then coalesce(new.data_realizacao, new.data_pagamento) else new.data_realizacao end;
    new.metadata := new.metadata || jsonb_build_object(
      'data_financeira_cartao', new.data_pagamento,
      'vencimento_primeira_fatura', new.data_vencimento
    );
  end if;

  return new;
end;
$$;