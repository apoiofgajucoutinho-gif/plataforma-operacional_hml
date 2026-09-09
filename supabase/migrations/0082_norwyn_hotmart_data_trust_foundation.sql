-- P0.3 Hotmart data trust foundation: explicit eligibility flags, lifecycle history,
-- non-commercial event routing, and Customer/Student 360 read foundations.

alter table public.comercial_vendas
  add column if not exists commercial_transaction boolean not null default true,
  add column if not exists sale_confirmed boolean not null default false,
  add column if not exists revenue_eligible boolean not null default false,
  add column if not exists student_eligible boolean not null default false,
  add column if not exists sale_comparable boolean not null default true,
  add column if not exists event_class text not null default 'SALE_TRANSACTION',
  add column if not exists eligibility_reason text,
  add column if not exists import_run_id text;

update public.comercial_vendas
set commercial_transaction = true,
    sale_confirmed = grupo_comercial = 'confirmed',
    revenue_eligible = grupo_comercial = 'confirmed' and moeda = 'BRL' and transaction_id !~ '^HP[0-9]+C[0-9]+$',
    student_eligible = grupo_comercial = 'confirmed' and transaction_id !~ '^HP[0-9]+C[0-9]+$',
    sale_comparable = public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id),
    event_class = public.norwyn_hotmart_event_class(coalesce(status_original, status_normalizado, status), transaction_id),
    eligibility_reason = case
      when not public.norwyn_hotmart_sale_comparable(coalesce(status_original, status_normalizado, status), transaction_id) then 'non_comparable_event'
      when grupo_comercial <> 'confirmed' then 'not_confirmed_status'
      when moeda <> 'BRL' then 'non_brl_currency'
      when transaction_id ~ '^HP[0-9]+C[0-9]+$' then 'bundle_item_requires_review'
      else 'brl_confirmed_sale'
    end
where event_class is null or event_class = 'SALE_TRANSACTION' or eligibility_reason is null;

create unique index if not exists comercial_vendas_tenant_transaction_uidx
on public.comercial_vendas (tenant_id, transaction_id);

create index if not exists comercial_vendas_eligibility_idx
on public.comercial_vendas (tenant_id, commercial_transaction, sale_confirmed, revenue_eligible, student_eligible, sale_comparable, event_class);

create table if not exists public.norwyn_hotmart_transaction_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  transaction_id text not null,
  sale_id uuid references public.comercial_vendas(id) on delete set null,
  raw_id uuid references public.comercial_hotmart_raw(id) on delete set null,
  status_original text,
  status_normalizado text not null default 'UNKNOWN',
  grupo_comercial text not null default 'unknown',
  event_class text not null default 'SALE_TRANSACTION',
  commercial_transaction boolean not null default true,
  sale_confirmed boolean not null default false,
  revenue_eligible boolean not null default false,
  student_eligible boolean not null default false,
  occurred_at timestamptz,
  source text not null default 'hotmart',
  import_run_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists norwyn_hotmart_status_history_unique_idx
on public.norwyn_hotmart_transaction_status_history (tenant_id, transaction_id, status_normalizado, coalesce(occurred_at, '1900-01-01'::timestamptz), source);

create index if not exists norwyn_hotmart_status_history_transaction_idx
on public.norwyn_hotmart_transaction_status_history (tenant_id, transaction_id, occurred_at desc);

create table if not exists public.norwyn_hotmart_learning_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id text,
  transaction_id text,
  buyer_email text,
  buyer_name text,
  hotmart_product_id text,
  hotmart_product_name text,
  event_type text not null,
  event_class text not null,
  occurred_at timestamptz,
  raw_id uuid references public.comercial_hotmart_raw(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists norwyn_hotmart_learning_events_event_uidx
on public.norwyn_hotmart_learning_events (tenant_id, event_id)
where event_id is not null;

create index if not exists norwyn_hotmart_learning_events_person_idx
on public.norwyn_hotmart_learning_events (tenant_id, buyer_email, hotmart_product_id, occurred_at desc);

create table if not exists public.norwyn_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary_email text,
  primary_phone text,
  display_name text,
  identity_level text not null default 'IDENTIFIED',
  source text not null default 'hotmart',
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_customers_identity_level_chk check (identity_level in ('IDENTIFIED','PROBABLE_MATCH','UNRECONCILED'))
);

create unique index if not exists norwyn_customers_tenant_email_uidx
on public.norwyn_customers (tenant_id, lower(primary_email))
where primary_email is not null;

create table if not exists public.norwyn_customer_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.norwyn_customers(id) on delete cascade,
  identity_type text not null,
  identity_value text not null,
  normalized_value text not null,
  confidence text not null default 'IDENTIFIED',
  source text not null,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_customer_identities_confidence_chk check (confidence in ('IDENTIFIED','PROBABLE_MATCH','UNRECONCILED'))
);

create unique index if not exists norwyn_customer_identities_unique
on public.norwyn_customer_identities (tenant_id, identity_type, normalized_value);

create table if not exists public.norwyn_customer_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_id uuid not null references public.norwyn_customers(id) on delete cascade,
  canonical_product_id uuid references public.products(id) on delete set null,
  commercial_product_id uuid references public.comercial_produtos(id) on delete set null,
  purchase_transaction_id text,
  purchase_sale_id uuid references public.comercial_vendas(id) on delete set null,
  enrolled_at timestamptz,
  access_started_at timestamptz,
  last_access_at timestamptz,
  completed_at timestamptz,
  status text not null default 'UNKNOWN',
  progress_units_completed integer,
  progress_units_total integer,
  progress_pct numeric,
  source text not null default 'hotmart',
  freshness timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_customer_enrollments_status_chk check (status in ('ACTIVE','INACTIVE','COMPLETED','REFUNDED','CANCELLED','ACCESS_EXPIRED','UNKNOWN'))
);

create unique index if not exists norwyn_customer_enrollments_sale_uidx
on public.norwyn_customer_enrollments (tenant_id, purchase_sale_id)
where purchase_sale_id is not null;

create or replace view public.norwyn_customer_360_metrics
with (security_invoker = true)
as
with eligible_sales as (
  select *
  from public.comercial_vendas
  where commercial_transaction = true
    and sale_confirmed = true
    and revenue_eligible = true
    and student_eligible = true
    and moeda = 'BRL'
    and comprador_email is not null
), buyer_ltv as (
  select tenant_id,
         lower(comprador_email) as email,
         min(coalesce(data_aprovacao, data_compra)) as first_purchase_at,
         max(coalesce(data_aprovacao, data_compra)) as last_purchase_at,
         count(*)::int as purchases,
         count(distinct coalesce(hotmart_product_id, produto_nome, 'UNKNOWN'))::int as products,
         sum(valor_bruto)::numeric(14,2) as ltv_brl
  from eligible_sales
  group by tenant_id, lower(comprador_email)
), ordered as (
  select tenant_id, lower(comprador_email) as email, hotmart_product_id, produto_nome, coalesce(data_aprovacao, data_compra) as purchased_at,
         row_number() over (partition by tenant_id, lower(comprador_email) order by coalesce(data_aprovacao, data_compra), id) as rn
  from eligible_sales
), second_purchase as (
  select first.tenant_id, first.email,
         first.hotmart_product_id as first_product_id,
         first.produto_nome as first_product_name,
         second.hotmart_product_id as second_product_id,
         second.produto_nome as second_product_name,
         extract(epoch from (second.purchased_at - first.purchased_at)) / 86400.0 as days_to_second
  from ordered first
  join ordered second on second.tenant_id = first.tenant_id and second.email = first.email and second.rn = 2
  where first.rn = 1
)
select b.tenant_id,
       count(*)::int as canonical_people,
       count(*) filter (where purchases > 0)::int as buyers,
       count(*) filter (where purchases > 0)::int as students,
       count(*) filter (where purchases >= 2)::int as buyers_2_plus,
       count(*) filter (where purchases >= 3)::int as buyers_3_plus,
       avg(ltv_brl)::numeric(14,2) as ltv_avg_brl,
       percentile_cont(0.25) within group (order by ltv_brl)::numeric(14,2) as ltv_p25_brl,
       percentile_cont(0.5) within group (order by ltv_brl)::numeric(14,2) as ltv_median_brl,
       percentile_cont(0.75) within group (order by ltv_brl)::numeric(14,2) as ltv_p75_brl,
       percentile_cont(0.5) within group (order by sp.days_to_second)::numeric(14,2) as median_days_to_second_purchase
from buyer_ltv b
left join second_purchase sp on sp.tenant_id = b.tenant_id and sp.email = b.email
where b.email is not null
group by b.tenant_id;

alter table public.norwyn_hotmart_transaction_status_history enable row level security;
alter table public.norwyn_hotmart_learning_events enable row level security;
alter table public.norwyn_customers enable row level security;
alter table public.norwyn_customer_identities enable row level security;
alter table public.norwyn_customer_enrollments enable row level security;

drop policy if exists "hotmart status history read" on public.norwyn_hotmart_transaction_status_history;
create policy "hotmart status history read" on public.norwyn_hotmart_transaction_status_history for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "hotmart status history write" on public.norwyn_hotmart_transaction_status_history;
create policy "hotmart status history write" on public.norwyn_hotmart_transaction_status_history for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

drop policy if exists "hotmart learning events read" on public.norwyn_hotmart_learning_events;
create policy "hotmart learning events read" on public.norwyn_hotmart_learning_events for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "hotmart learning events write" on public.norwyn_hotmart_learning_events;
create policy "hotmart learning events write" on public.norwyn_hotmart_learning_events for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'comercial'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['norwyn_customers','norwyn_customer_identities','norwyn_customer_enrollments'] loop
    execute format('drop policy if exists "customer 360 read" on public.%I', table_name);
    execute format('create policy "customer 360 read" on public.%I for select to authenticated using (app_private.can_access_module(tenant_id, ''comercial''::public.module_key, false) or app_private.can_access_module(tenant_id, ''comercial''::public.module_key, false) or app_private.can_access_module(tenant_id, ''norwyn''::public.module_key, false))', table_name);
    execute format('drop policy if exists "customer 360 write" on public.%I', table_name);
    execute format('create policy "customer 360 write" on public.%I for all to authenticated using (app_private.can_access_module(tenant_id, ''comercial''::public.module_key, true) or app_private.can_access_module(tenant_id, ''comercial''::public.module_key, true) or app_private.can_access_module(tenant_id, ''norwyn''::public.module_key, true)) with check (app_private.can_access_module(tenant_id, ''comercial''::public.module_key, true) or app_private.can_access_module(tenant_id, ''comercial''::public.module_key, true) or app_private.can_access_module(tenant_id, ''norwyn''::public.module_key, true))', table_name);
  end loop;
end $$;


