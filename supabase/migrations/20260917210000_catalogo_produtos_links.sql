do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.module_key'::regtype
      and enumlabel = 'catalogo'
  ) then
    alter type public.module_key add value 'catalogo';
  end if;
end $$;

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  description text,
  status text not null default 'ativo' check (status in ('ativo','pausado','desativado','a_confirmar')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, normalized_name)
);

create table if not exists public.catalog_offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  offer_type text not null default 'outro' check (offer_type in ('produto_individual','combo','upsell','downsell','order_bump','evento','oferta_especial','outro')),
  included_products text[] not null default '{}',
  platform text not null default 'Hotmart',
  current_price numeric(14,2),
  max_installments integer,
  smart_installments text not null default 'A confirmar',
  access_time text not null default 'A confirmar',
  warranty text not null default 'A confirmar',
  has_coparticipation boolean,
  partner text,
  coparticipation_percent numeric(7,2),
  use_type text not null default 'A confirmar',
  commercial_status text not null default 'rascunho' check (commercial_status in ('rascunho','ativo','pausado','desativado','substituido')),
  responsible text,
  activated_at date,
  notes text,
  campaign_name text,
  audience text,
  lead_origin text,
  special_rule text,
  data_quality_status text not null default 'partial' check (data_quality_status in ('trusted','partial','review','insufficient_data')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, product_id, normalized_name)
);

create table if not exists public.catalog_sales_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete restrict,
  offer_id uuid not null references public.catalog_offers(id) on delete cascade,
  checkout_url text not null,
  normalized_url text not null,
  platform text not null default 'Hotmart',
  hotmart_product_id text,
  hotmart_offer_id text,
  technical_health text not null default 'nao_verificado' check (technical_health in ('funcionando','redirecionando','quebrado','indisponivel','nao_verificado')),
  last_checked_at timestamptz,
  presence_asset_id uuid references public.digital_assets(id) on delete set null,
  is_main_link boolean not null default false,
  replaced_link_id uuid references public.catalog_sales_links(id) on delete set null,
  attribution_confidence text not null default 'nao_atribuivel' check (attribution_confidence in ('alta','media','baixa','nao_atribuivel')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, normalized_url)
);

create table if not exists public.catalog_link_performance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sales_link_id uuid not null references public.catalog_sales_links(id) on delete cascade,
  period_start date,
  period_end date,
  confirmed_sales integer,
  revenue_brl numeric(14,2),
  average_ticket_brl numeric(14,2),
  refunds integer,
  clicks integer,
  conversion_rate numeric(9,4),
  attribution_confidence text not null default 'nao_atribuivel' check (attribution_confidence in ('alta','media','baixa','nao_atribuivel')),
  source text not null default 'manual_or_future',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sales_link_id, period_start, period_end, source)
);

create table if not exists public.catalog_link_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.catalog_products(id) on delete set null,
  offer_id uuid references public.catalog_offers(id) on delete set null,
  sales_link_id uuid references public.catalog_sales_links(id) on delete set null,
  event_type text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text,
  created_at timestamptz not null default now()
);

create index if not exists catalog_products_tenant_name_idx on public.catalog_products (tenant_id, normalized_name);
create index if not exists catalog_offers_tenant_product_idx on public.catalog_offers (tenant_id, product_id, commercial_status);
create index if not exists catalog_sales_links_tenant_product_idx on public.catalog_sales_links (tenant_id, product_id, is_main_link, technical_health);
create index if not exists catalog_sales_links_hotmart_product_idx on public.catalog_sales_links (tenant_id, hotmart_product_id, hotmart_offer_id);
create index if not exists catalog_link_history_offer_idx on public.catalog_link_history (tenant_id, offer_id, created_at desc);

create or replace view public.catalog_v_offer_links
with (security_invoker = true)
as
select
  l.tenant_id,
  p.id as product_id,
  p.name as product_name,
  o.id as offer_id,
  o.name as offer_name,
  o.offer_type,
  o.included_products,
  o.current_price,
  o.max_installments,
  o.smart_installments,
  o.access_time,
  o.warranty,
  o.has_coparticipation,
  o.partner,
  o.coparticipation_percent,
  o.use_type,
  o.commercial_status,
  o.responsible,
  o.campaign_name,
  o.audience,
  o.lead_origin,
  o.special_rule,
  o.notes,
  o.data_quality_status,
  l.id as sales_link_id,
  l.checkout_url,
  l.platform,
  l.hotmart_product_id,
  l.hotmart_offer_id,
  l.technical_health,
  l.last_checked_at,
  l.presence_asset_id,
  l.is_main_link,
  l.replaced_link_id,
  l.attribution_confidence,
  l.created_at,
  l.updated_at
from public.catalog_sales_links l
join public.catalog_offers o on o.id = l.offer_id
join public.catalog_products p on p.id = l.product_id;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'catalog_products',
    'catalog_offers',
    'catalog_sales_links',
    'catalog_link_performance'
  ] loop
    if not exists (select 1 from pg_trigger where tgname = table_name || '_set_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()', table_name || '_set_updated_at', table_name);
    end if;
  end loop;
end $$;

alter table public.catalog_products enable row level security;
alter table public.catalog_offers enable row level security;
alter table public.catalog_sales_links enable row level security;
alter table public.catalog_link_performance enable row level security;
alter table public.catalog_link_history enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'catalog_products',
    'catalog_offers',
    'catalog_sales_links',
    'catalog_link_performance',
    'catalog_link_history'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'catalog read ' || table_name, table_name);
    execute format('create policy %I on public.%I for select to authenticated using (app_private.can_access_module(tenant_id, %L::public.module_key, false))', 'catalog read ' || table_name, table_name, 'catalogo');
    execute format('drop policy if exists %I on public.%I', 'catalog write ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (app_private.can_access_module(tenant_id, %L::public.module_key, true)) with check (app_private.can_access_module(tenant_id, %L::public.module_key, true))', 'catalog write ' || table_name, table_name, 'catalogo', 'catalogo');
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', table_name);
  end loop;
end $$;

grant select on public.catalog_v_offer_links to authenticated, service_role;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'catalogo'::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ADMIN', true, true),
    ('ESPECIALISTA', true, true),
    ('OPERACIONAL', true, true),
    ('SUPORTE', true, true)
) as permissions(role, can_read, can_write)
on conflict (tenant_id, role, module)
do update set can_read = excluded.can_read, can_write = excluded.can_write, updated_at = now();
