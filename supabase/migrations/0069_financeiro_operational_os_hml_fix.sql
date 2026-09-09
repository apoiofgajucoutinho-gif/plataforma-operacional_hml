alter table public.fin_lancamentos
  add column if not exists lancamento_origem_id uuid references public.fin_lancamentos(id) on delete set null;

create index if not exists fin_lancamentos_origem_idx
on public.fin_lancamentos (tenant_id, lancamento_origem_id)
where lancamento_origem_id is not null;

create or replace function app_private.fin_due_date(base_month timestamp without time zone, due_day integer)
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select app_private.fin_due_date(base_month::date, due_day);
$$;
