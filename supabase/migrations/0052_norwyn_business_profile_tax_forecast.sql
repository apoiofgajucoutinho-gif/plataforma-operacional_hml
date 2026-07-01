create table if not exists public.business_profile (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  company_name text not null,
  cnpj text,
  tax_regime text,
  default_coproduction_percent numeric(8,4),
  hotmart_percent_fee numeric(8,4),
  hotmart_fixed_fee numeric(14,2),
  hotmart_withdraw_fee numeric(14,2),
  gateway_percent_fee numeric(8,4),
  observations text,
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'current',
  source text not null default 'manual',
  source_key text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_tax_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  business_profile_id uuid not null references public.business_profile(id) on delete cascade,
  category text not null,
  cnae text,
  tax_percent numeric(8,4) not null,
  description text,
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'current',
  observations text,
  source text not null default 'manual',
  source_key text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  manually_edited_at timestamptz,
  manually_edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists fiscal_category text;
alter table public.products add column if not exists financial_notes text;

create unique index if not exists business_profile_source_uidx
  on public.business_profile (tenant_id, source_key);

create index if not exists business_profile_tenant_status_idx
  on public.business_profile (tenant_id, status, starts_at, ends_at);

create unique index if not exists business_tax_rules_source_uidx
  on public.business_tax_rules (tenant_id, source_key);

create index if not exists business_tax_rules_profile_category_idx
  on public.business_tax_rules (tenant_id, business_profile_id, category, status, starts_at, ends_at);

create index if not exists products_tenant_fiscal_category_idx
  on public.products (tenant_id, fiscal_category);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'business_profile_set_updated_at'
      and tgrelid = 'public.business_profile'::regclass
  ) then
    create trigger business_profile_set_updated_at
    before update on public.business_profile
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'business_tax_rules_set_updated_at'
      and tgrelid = 'public.business_tax_rules'::regclass
  ) then
    create trigger business_tax_rules_set_updated_at
    before update on public.business_tax_rules
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.business_profile enable row level security;
alter table public.business_tax_rules enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profile'
      and policyname = 'business profile read'
  ) then
    create policy "business profile read" on public.business_profile for select to authenticated
    using (app_private.can_access_module(tenant_id, 'norwyn', false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profile'
      and policyname = 'business profile write'
  ) then
    create policy "business profile write" on public.business_profile for all to authenticated
    using (app_private.can_access_module(tenant_id, 'norwyn', true))
    with check (app_private.can_access_module(tenant_id, 'norwyn', true));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_tax_rules'
      and policyname = 'business tax rules read'
  ) then
    create policy "business tax rules read" on public.business_tax_rules for select to authenticated
    using (app_private.can_access_module(tenant_id, 'norwyn', false));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_tax_rules'
      and policyname = 'business tax rules write'
  ) then
    create policy "business tax rules write" on public.business_tax_rules for all to authenticated
    using (app_private.can_access_module(tenant_id, 'norwyn', true))
    with check (app_private.can_access_module(tenant_id, 'norwyn', true));
  end if;
end $$;

grant select, insert, update, delete on public.business_profile to authenticated;
grant select, insert, update, delete on public.business_tax_rules to authenticated;

insert into public.business_profile (
  tenant_id,
  company_name,
  tax_regime,
  default_coproduction_percent,
  hotmart_percent_fee,
  hotmart_fixed_fee,
  hotmart_withdraw_fee,
  gateway_percent_fee,
  observations,
  starts_at,
  status,
  source,
  source_key,
  metadata
)
select
  tenant.id,
  coalesce(nullif(trim(tenant.nome), ''), 'Juliana Coutinho'),
  'Simples Nacional',
  null,
  7.90,
  1.59,
  1.99,
  null,
  'Configuracao inicial editavel. Valores usados apenas como Estimativa Norwyn.',
  date '2026-01-01',
  'current',
  'seed',
  'juliana-default-2026',
  jsonb_build_object('seeded_from', '0052_norwyn_business_profile_tax_forecast')
from public.tenants tenant
on conflict (tenant_id, source_key) do nothing;

insert into public.business_tax_rules (
  tenant_id,
  business_profile_id,
  category,
  cnae,
  tax_percent,
  description,
  starts_at,
  status,
  observations,
  source,
  source_key,
  metadata
)
select
  profile.tenant_id,
  profile.id,
  tax_rule.category,
  tax_rule.cnae,
  tax_rule.tax_percent,
  tax_rule.description,
  date '2026-01-01',
  'current',
  tax_rule.observations,
  'seed',
  tax_rule.source_key,
  jsonb_build_object('seeded_from', '0052_norwyn_business_profile_tax_forecast')
from public.business_profile profile
cross join (
  values
    ('Treinamento', '8599-6/04', 7.04::numeric, 'Treinamento em desenvolvimento profissional e gerencial.', 'Regra inicial editavel.', 'juliana-training-2026'),
    ('Fonoaudiologia', '8650-0/06', 16.00::numeric, 'Atividades de fonoaudiologia.', 'Atividade sujeita ao Fator R. Regra inicial editavel.', 'juliana-fonoaudiologia-2026')
) as tax_rule(category, cnae, tax_percent, description, observations, source_key)
where profile.source_key = 'juliana-default-2026'
on conflict (tenant_id, source_key) do nothing;

update public.products
set
  fiscal_category = case
    when lower(coalesce(produto_base, nome_oficial, '')) like '%aasi%'
      or lower(coalesce(produto_base, nome_oficial, '')) like '%ajuste%'
      or lower(coalesce(produto_base, nome_oficial, '')) like '%rampa%'
      or lower(coalesce(produto_base, nome_oficial, '')) like '%zumbido%'
      then 'Treinamento'
    when lower(coalesce(categoria, '')) like '%clinic%'
      or lower(coalesce(produto_base, nome_oficial, '')) like '%fono%'
      then 'Fonoaudiologia'
    else fiscal_category
  end,
  metadata = metadata || jsonb_build_object('fiscal_category_seeded_at', now())
where fiscal_category is null
  and manually_edited_at is null
  and (
    lower(coalesce(produto_base, nome_oficial, '')) like '%aasi%'
    or lower(coalesce(produto_base, nome_oficial, '')) like '%ajuste%'
    or lower(coalesce(produto_base, nome_oficial, '')) like '%rampa%'
    or lower(coalesce(produto_base, nome_oficial, '')) like '%zumbido%'
    or lower(coalesce(categoria, '')) like '%clinic%'
    or lower(coalesce(produto_base, nome_oficial, '')) like '%fono%'
  );
