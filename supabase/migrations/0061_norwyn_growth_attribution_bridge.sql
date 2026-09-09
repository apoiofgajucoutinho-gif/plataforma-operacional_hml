create table if not exists public.growth_tracking_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_key text,
  product_key text,
  funnel_key text,
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  ad_id text,
  adset_id text,
  campaign_platform_id text,
  click_id text,
  fbclid text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_tracking_keys_tenant_campaign_idx
on public.growth_tracking_keys (tenant_id, campaign_key, status);

create index if not exists growth_tracking_keys_tenant_product_idx
on public.growth_tracking_keys (tenant_id, product_key, status);

create index if not exists growth_tracking_keys_platform_ids_idx
on public.growth_tracking_keys (tenant_id, campaign_platform_id, adset_id, ad_id);

drop trigger if exists growth_tracking_keys_set_updated_at on public.growth_tracking_keys;
create trigger growth_tracking_keys_set_updated_at
before update on public.growth_tracking_keys
for each row execute function app_private.set_updated_at();

alter table public.growth_tracking_keys enable row level security;

drop policy if exists "growth tracking keys read" on public.growth_tracking_keys;
create policy "growth tracking keys read" on public.growth_tracking_keys for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth tracking keys write" on public.growth_tracking_keys;
create policy "growth tracking keys write" on public.growth_tracking_keys for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.growth_tracking_keys to authenticated;
