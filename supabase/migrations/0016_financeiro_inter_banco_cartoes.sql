with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
)
insert into public.fin_bancos (tenant_id, nome, apelido, saldo_inicial, ativo)
select tenant_id, 'Banco Inter', 'Inter', 0, true
from tenant_scope
on conflict (tenant_id, nome) do update
set
  apelido = excluded.apelido,
  ativo = true,
  updated_at = now();

with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
),
bank_scope as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Banco Inter'
),
seed_cartoes(nome, dia_fechamento, dia_vencimento) as (
  values
    ('Inter Fisico', 3, 10),
    ('Inter Online', 3, 10)
)
insert into public.fin_cartoes (
  tenant_id,
  nome,
  banco_id,
  dia_fechamento,
  dia_vencimento,
  limite,
  ativo
)
select
  bank_scope.tenant_id,
  seed_cartoes.nome,
  bank_scope.banco_id,
  seed_cartoes.dia_fechamento,
  seed_cartoes.dia_vencimento,
  null,
  true
from bank_scope
cross join seed_cartoes
on conflict (tenant_id, nome) do update
set
  banco_id = excluded.banco_id,
  dia_fechamento = excluded.dia_fechamento,
  dia_vencimento = excluded.dia_vencimento,
  ativo = true,
  updated_at = now();
