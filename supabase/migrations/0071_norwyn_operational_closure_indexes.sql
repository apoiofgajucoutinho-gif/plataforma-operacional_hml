create unique index if not exists norwyn_financial_settlements_finance_unique_idx
on public.norwyn_financial_settlements (tenant_id, finance_lancamento_id)
where finance_lancamento_id is not null;
