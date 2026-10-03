create table if not exists public.instagram_ads_intraday_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_row_id uuid references public.instagram_ads_daily(id) on delete set null,
  collected_at timestamptz not null,
  data_referencia date not null,
  row_key text not null,
  campaign_id text,
  adset_id text,
  ad_id text,
  campanha text not null,
  conjunto text,
  anuncio text not null,
  valor_gasto numeric(14,2) not null default 0,
  impressoes integer not null default 0,
  alcance integer not null default 0,
  cliques integer not null default 0,
  link_clicks integer not null default 0,
  outbound_clicks integer not null default 0,
  landing_page_views integer not null default 0,
  initiate_checkouts integer not null default 0,
  meta_purchases integer not null default 0,
  meta_purchase_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint instagram_ads_intraday_snapshots_execution_entity_key
    unique (tenant_id, data_referencia, row_key, collected_at)
);

comment on table public.instagram_ads_intraday_snapshots is
  'Estados acumulados intradiários capturados após cada upsert de instagram_ads_daily. Não substitui o consolidado diário da V9.';

create index if not exists instagram_ads_intraday_tenant_date_collected_idx
  on public.instagram_ads_intraday_snapshots (tenant_id, data_referencia desc, collected_at desc);

create index if not exists instagram_ads_intraday_tenant_ad_collected_idx
  on public.instagram_ads_intraday_snapshots (tenant_id, data_referencia, ad_id, collected_at desc);

alter table public.instagram_ads_intraday_snapshots enable row level security;

grant select, insert on public.instagram_ads_intraday_snapshots to authenticated;
grant select, insert, update, delete on public.instagram_ads_intraday_snapshots to service_role;

create policy "ads intraday admin read"
  on public.instagram_ads_intraday_snapshots
  for select
  to authenticated
  using (app_private.current_role(tenant_id) = 'ADMIN');

create policy "ads intraday admin insert"
  on public.instagram_ads_intraday_snapshots
  for insert
  to authenticated
  with check (app_private.current_role(tenant_id) = 'ADMIN');

create or replace function app_private.capture_instagram_ads_intraday_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_collected_at timestamptz;
begin
  if tg_op = 'UPDATE'
    and new.imported_at is not distinct from old.imported_at
    and new.valor_gasto is not distinct from old.valor_gasto
    and new.impressoes is not distinct from old.impressoes
    and new.alcance is not distinct from old.alcance
    and new.cliques is not distinct from old.cliques
    and new.link_clicks is not distinct from old.link_clicks
    and new.outbound_clicks is not distinct from old.outbound_clicks
    and new.landing_page_views is not distinct from old.landing_page_views
    and new.initiate_checkouts is not distinct from old.initiate_checkouts
    and new.meta_purchases is not distinct from old.meta_purchases then
    return new;
  end if;

  v_collected_at := date_trunc('minute', coalesce(new.imported_at, now()));

  insert into public.instagram_ads_intraday_snapshots (
    tenant_id, source_row_id, collected_at, data_referencia, row_key,
    campaign_id, adset_id, ad_id, campanha, conjunto, anuncio,
    valor_gasto, impressoes, alcance, cliques, link_clicks, outbound_clicks,
    landing_page_views, initiate_checkouts, meta_purchases, meta_purchase_value
  ) values (
    new.tenant_id, new.id, v_collected_at, new.data_referencia, new.row_key,
    new.campaign_id, new.adset_id, new.ad_id, new.campanha, new.conjunto, new.anuncio,
    coalesce(new.valor_gasto, 0), coalesce(new.impressoes, 0), coalesce(new.alcance, 0),
    coalesce(new.cliques, 0), coalesce(new.link_clicks, 0), coalesce(new.outbound_clicks, 0),
    coalesce(new.landing_page_views, 0), coalesce(new.initiate_checkouts, 0),
    coalesce(new.meta_purchases, 0), coalesce(new.meta_purchase_value, 0)
  )
  on conflict (tenant_id, data_referencia, row_key, collected_at)
  do update set
    source_row_id = excluded.source_row_id,
    campaign_id = excluded.campaign_id,
    adset_id = excluded.adset_id,
    ad_id = excluded.ad_id,
    campanha = excluded.campanha,
    conjunto = excluded.conjunto,
    anuncio = excluded.anuncio,
    valor_gasto = excluded.valor_gasto,
    impressoes = excluded.impressoes,
    alcance = excluded.alcance,
    cliques = excluded.cliques,
    link_clicks = excluded.link_clicks,
    outbound_clicks = excluded.outbound_clicks,
    landing_page_views = excluded.landing_page_views,
    initiate_checkouts = excluded.initiate_checkouts,
    meta_purchases = excluded.meta_purchases,
    meta_purchase_value = excluded.meta_purchase_value;

  return new;
end;
$$;

drop trigger if exists instagram_ads_daily_capture_intraday_snapshot on public.instagram_ads_daily;
create trigger instagram_ads_daily_capture_intraday_snapshot
  after insert or update on public.instagram_ads_daily
  for each row execute function app_private.capture_instagram_ads_intraday_snapshot();

insert into public.instagram_ads_intraday_snapshots (
  tenant_id, source_row_id, collected_at, data_referencia, row_key,
  campaign_id, adset_id, ad_id, campanha, conjunto, anuncio,
  valor_gasto, impressoes, alcance, cliques, link_clicks, outbound_clicks,
  landing_page_views, initiate_checkouts, meta_purchases, meta_purchase_value
)
select
  tenant_id, id, date_trunc('minute', imported_at), data_referencia, row_key,
  campaign_id, adset_id, ad_id, campanha, conjunto, anuncio,
  coalesce(valor_gasto, 0), coalesce(impressoes, 0), coalesce(alcance, 0),
  coalesce(cliques, 0), coalesce(link_clicks, 0), coalesce(outbound_clicks, 0),
  coalesce(landing_page_views, 0), coalesce(initiate_checkouts, 0),
  coalesce(meta_purchases, 0), coalesce(meta_purchase_value, 0)
from public.instagram_ads_daily
where row_key <> ''
on conflict (tenant_id, data_referencia, row_key, collected_at) do nothing;
