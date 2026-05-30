create extension if not exists "pgcrypto";

create schema if not exists app_private;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.current_role(target_tenant_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.tenant_members tm
  where tm.tenant_id = target_tenant_id
    and tm.user_id = auth.uid()
    and tm.ativo = true
  limit 1;
$$;

create table if not exists public.instagram_ads_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_referencia date not null,
  campanha text not null,
  conjunto text,
  anuncio text not null,
  status text not null default 'UNKNOWN',
  objetivo text,
  alcance integer not null default 0,
  impressoes integer not null default 0,
  cliques integer not null default 0,
  ctr numeric(12,6) not null default 0,
  cpc numeric(12,6) not null default 0,
  cpm numeric(12,6) not null default 0,
  frequencia numeric(12,6) not null default 0,
  valor_gasto numeric(14,2) not null default 0,
  conversoes integer not null default 0,
  leads integer not null default 0,
  performance_status text not null default 'OK',
  performance_score numeric(12,2) not null default 0,
  origem text not null default 'n8n_meta_ads',
  row_key text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists instagram_ads_daily_tenant_row_key_idx
on public.instagram_ads_daily (tenant_id, row_key);

create index if not exists instagram_ads_daily_tenant_date_idx
on public.instagram_ads_daily (tenant_id, data_referencia desc);

create index if not exists instagram_ads_daily_tenant_campaign_idx
on public.instagram_ads_daily (tenant_id, campanha);

create or replace function app_private.set_instagram_ads_daily_row_key()
returns trigger
language plpgsql
as $$
begin
  new.row_key := md5(
    new.data_referencia::text || '|' ||
    new.campanha || '|' ||
    coalesce(new.conjunto, '') || '|' ||
    new.anuncio
  );
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'instagram_ads_daily_set_row_key'
  ) then
    create trigger instagram_ads_daily_set_row_key
    before insert or update on public.instagram_ads_daily
    for each row execute function app_private.set_instagram_ads_daily_row_key();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'instagram_ads_daily_set_updated_at'
  ) then
    create trigger instagram_ads_daily_set_updated_at
    before update on public.instagram_ads_daily
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.instagram_ads_daily enable row level security;

grant select, insert, update, delete on public.instagram_ads_daily to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'instagram_ads_daily'
      and policyname = 'ads admin read'
  ) then
    create policy "ads admin read"
    on public.instagram_ads_daily for select
    to authenticated
    using (app_private.current_role(tenant_id) = 'ADMIN');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'instagram_ads_daily'
      and policyname = 'ads admin insert'
  ) then
    create policy "ads admin insert"
    on public.instagram_ads_daily for insert
    to authenticated
    with check (app_private.current_role(tenant_id) = 'ADMIN');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'instagram_ads_daily'
      and policyname = 'ads admin update'
  ) then
    create policy "ads admin update"
    on public.instagram_ads_daily for update
    to authenticated
    using (app_private.current_role(tenant_id) = 'ADMIN')
    with check (app_private.current_role(tenant_id) = 'ADMIN');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'instagram_ads_daily'
      and policyname = 'ads admin delete'
  ) then
    create policy "ads admin delete"
    on public.instagram_ads_daily for delete
    to authenticated
    using (app_private.current_role(tenant_id) = 'ADMIN');
  end if;
end $$;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, 'ADMIN'::public.app_role, 'ads'::public.module_key, true, true
from public.tenants
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();
