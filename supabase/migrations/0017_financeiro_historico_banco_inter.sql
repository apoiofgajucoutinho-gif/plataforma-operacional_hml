with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
),
inter_bank as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Banco Inter'
),
historic_bank as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Histórico (a reclassificar)'
)
update public.fin_lancamentos l
set
  banco_id = inter_bank.banco_id,
  updated_at = now()
from inter_bank
left join historic_bank on historic_bank.tenant_id = inter_bank.tenant_id
where l.tenant_id = inter_bank.tenant_id
  and l.forma_pagamento <> 'cartao_credito'
  and (
    l.banco_id is null
    or l.banco_id = historic_bank.banco_id
    or l.origem = 'importacao'
  );

with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
),
inter_bank as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Banco Inter'
),
historic_bank as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Histórico (a reclassificar)'
)
update public.fin_recorrencias r
set
  banco_id = inter_bank.banco_id,
  updated_at = now()
from inter_bank
left join historic_bank on historic_bank.tenant_id = inter_bank.tenant_id
where r.tenant_id = inter_bank.tenant_id
  and r.forma_pagamento <> 'cartao_credito'
  and (
    r.banco_id is null
    or r.banco_id = historic_bank.banco_id
  );

with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
),
inter_bank as (
  select b.id as banco_id, b.tenant_id
  from public.fin_bancos b
  join tenant_scope t on t.tenant_id = b.tenant_id
  where b.nome = 'Banco Inter'
)
update public.fin_cartoes c
set
  banco_id = inter_bank.banco_id,
  ativo = false,
  updated_at = now()
from inter_bank
where c.tenant_id = inter_bank.tenant_id
  and c.nome = 'Histórico (a reclassificar)';

with tenant_scope as (
  select id as tenant_id
  from public.tenants
  where lower(nome) like '%juliana coutinho%'
  order by created_at
  limit 1
)
update public.fin_bancos b
set
  ativo = false,
  updated_at = now()
from tenant_scope
where b.tenant_id = tenant_scope.tenant_id
  and b.nome = 'Histórico (a reclassificar)';
