-- Harden Comercial/Hotmart imports for launch tracking and reconciliation.
-- Idempotent migration: no historical rows are deleted.

alter table if exists public.comercial_vendas
  add column if not exists status_original text,
  add column if not exists status_normalizado text,
  add column if not exists grupo_comercial text not null default 'unknown',
  add column if not exists expected_payment_date date,
  add column if not exists last_event_at timestamptz,
  add column if not exists imported_at timestamptz,
  add column if not exists data_lacunas jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comercial_vendas_grupo_comercial_check'
      and conrelid = 'public.comercial_vendas'::regclass
  ) then
    alter table public.comercial_vendas
      add constraint comercial_vendas_grupo_comercial_check
      check (grupo_comercial in ('confirmed', 'pending', 'lost', 'refunded', 'chargeback', 'unknown'));
  end if;
end $$;

update public.comercial_vendas
set
  status_original = coalesce(status_original, status),
  status_normalizado = coalesce(status_normalizado, upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g'))),
  grupo_comercial = case
    when upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g')) in ('APPROVED', 'COMPLETE') then 'confirmed'
    when upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g')) in ('STARTED', 'WAITING_PAYMENT', 'PRINTED_BILLET', 'PROCESSING_TRANSACTION', 'UNDER_ANALISYS', 'UNDER_ANALYSIS', 'PRE_ORDER', 'OVERDUE') then 'pending'
    when upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g')) in ('REFUNDED', 'PARTIALLY_REFUNDED') then 'refunded'
    when upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g')) = 'CHARGEBACK' then 'chargeback'
    when upper(regexp_replace(coalesce(status, 'unknown'), '[[:space:]-]+', '_', 'g')) in ('CANCELLED', 'CANCELED', 'EXPIRED', 'NO_FUNDS', 'BLOCKED', 'PROTESTED') then 'lost'
    else coalesce(nullif(grupo_comercial, ''), 'unknown')
  end,
  data_lacunas = coalesce(data_lacunas, '[]'::jsonb)
where status_original is null
   or status_normalizado is null
   or grupo_comercial = 'unknown'
   or data_lacunas is null;

create or replace view public.comercial_v_duplicidades
with (security_invoker = true) as
select
  tenant_id,
  transaction_id,
  count(*) as quantidade,
  array_agg(id order by updated_at desc) as venda_ids,
  array_agg(distinct status_original) as status_originais,
  max(updated_at) as ultima_atualizacao
from public.comercial_vendas
where transaction_id is not null
  and transaction_id <> ''
group by tenant_id, transaction_id
having count(*) > 1;

create or replace view public.comercial_v_lacunas
with (security_invoker = true) as
select
  v.tenant_id,
  v.id as venda_id,
  v.transaction_id,
  v.produto_nome,
  v.comprador_email,
  v.status_original,
  v.grupo_comercial,
  lacuna.value::text as lacuna,
  v.created_at,
  v.updated_at
from public.comercial_vendas v
cross join lateral jsonb_array_elements_text(coalesce(v.data_lacunas, '[]'::jsonb)) as lacuna(value);

create or replace view public.comercial_v_lancamento
with (security_invoker = true) as
select
  v.tenant_id,
  v.id,
  v.transaction_id,
  coalesce(v.data_compra, v.data_aprovacao) as data_referencia,
  v.comprador_nome,
  v.comprador_email,
  v.produto_nome,
  v.status_original,
  v.status_normalizado,
  v.grupo_comercial,
  v.forma_pagamento,
  v.parcelas,
  v.valor_bruto,
  v.valor_liquido,
  v.taxas,
  v.expected_payment_date,
  v.source_sck,
  v.origem,
  v.data_lacunas,
  count(r.id) filter (where r.fonte_previsao = 'hotmart') as recebiveis_hotmart,
  sum(r.valor_liquido) filter (where r.fonte_previsao = 'hotmart' and r.status in ('previsto', 'disponivel', 'recebido')) as valor_liquido_recebiveis,
  min(r.data_prevista) filter (where r.fonte_previsao = 'hotmart') as primeira_previsao_recebimento
from public.comercial_vendas v
left join public.comercial_recebiveis r
  on r.tenant_id = v.tenant_id
 and r.transaction_id = v.transaction_id
group by v.id;

grant select on public.comercial_v_duplicidades to authenticated, service_role;
grant select on public.comercial_v_lacunas to authenticated, service_role;
grant select on public.comercial_v_lancamento to authenticated, service_role;
