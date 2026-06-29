create table if not exists public.norwyn_content_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null default 'instagram',
  source_id text not null,
  event_type text not null default 'post',
  subtype text,
  title text,
  caption text,
  published_at timestamptz not null,
  influence_hours integer not null default 24,
  mission_id text,
  campaign_id text,
  product_tags text[] not null default '{}',
  theme_tags text[] not null default '{}',
  objective text,
  funnel_stage text,
  cta text,
  performance_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_content_events_source_check check (source in ('instagram', 'ads', 'hotmart', 'manual', 'calendar')),
  constraint norwyn_content_events_event_type_check check (event_type in ('post', 'story', 'live', 'ad', 'sale_event', 'manual'))
);

create unique index if not exists norwyn_content_events_source_uidx
  on public.norwyn_content_events (tenant_id, source, source_id);

create index if not exists norwyn_content_events_tenant_published_idx
  on public.norwyn_content_events (tenant_id, published_at desc);

create index if not exists norwyn_content_events_subtype_idx
  on public.norwyn_content_events (tenant_id, subtype);

create index if not exists norwyn_content_events_product_tags_idx
  on public.norwyn_content_events using gin (product_tags);

create index if not exists norwyn_content_events_theme_tags_idx
  on public.norwyn_content_events using gin (theme_tags);

drop trigger if exists norwyn_content_events_set_updated_at on public.norwyn_content_events;
create trigger norwyn_content_events_set_updated_at
before update on public.norwyn_content_events
for each row execute function app_private.set_updated_at();

alter table public.norwyn_content_events enable row level security;

drop policy if exists "norwyn content events read" on public.norwyn_content_events;
create policy "norwyn content events read"
on public.norwyn_content_events
for select
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "norwyn content events write" on public.norwyn_content_events;
create policy "norwyn content events write"
on public.norwyn_content_events
for all
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.norwyn_content_events to authenticated;

create or replace function public.norwyn_influence_hours(content_subtype text)
returns integer
language sql
immutable
as $$
  select case
    when lower(coalesce(content_subtype, '')) like '%story%' then 12
    when lower(coalesce(content_subtype, '')) like '%live%' then 72
    when lower(coalesce(content_subtype, '')) like '%reel%' then 48
    when lower(coalesce(content_subtype, '')) like '%carrossel%' then 24
    when lower(coalesce(content_subtype, '')) like '%carousel%' then 24
    else 24
  end
$$;

create or replace function public.norwyn_sync_instagram_content_events(target_tenant_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  synced_count integer := 0;
begin
  insert into public.norwyn_content_events (
    tenant_id,
    source,
    source_id,
    event_type,
    subtype,
    title,
    caption,
    published_at,
    influence_hours,
    performance_snapshot,
    metadata
  )
  select
    p.tenant_id,
    'instagram',
    coalesce(nullif(p.post_id, ''), p.id::text),
    'post',
    nullif(p.tipo::text, ''),
    left(coalesce(nullif(p.legenda, ''), nullif(p.tipo::text, ''), 'Conteudo Instagram'), 160),
    p.legenda,
    coalesce(p.data_postagem::timestamptz, now()),
    public.norwyn_influence_hours(p.tipo::text),
    jsonb_build_object(
      'likes', coalesce(m.likes, 0),
      'comentarios', coalesce(m.comentarios, 0),
      'alcance', m.alcance,
      'salvos', m.salvos,
      'compartilhamentos', m.compartilhamentos,
      'engajamento_score', m.engajamento_score,
      'engajamento_classificacao', m.engajamento_classificacao,
      'permalink', p.permalink
    ),
    jsonb_build_object(
      'source_table', 'instagram_posts',
      'post_id', p.post_id,
      'instagram_post_uuid', p.id,
      'permalink', p.permalink,
      'sync_strategy', 'source_post_upsert'
    )
  from public.instagram_posts p
  left join lateral (
    select metrics.*
    from public.instagram_metrics metrics
    where metrics.post_id = p.id
    order by metrics.updated_at desc nulls last, metrics.imported_at desc nulls last, metrics.created_at desc nulls last
    limit 1
  ) m on true
  where p.tenant_id = target_tenant_id
    and p.data_postagem is not null
  on conflict (tenant_id, source, source_id) do update
  set
    subtype = excluded.subtype,
    title = excluded.title,
    caption = excluded.caption,
    published_at = excluded.published_at,
    influence_hours = excluded.influence_hours,
    performance_snapshot = excluded.performance_snapshot,
    metadata = public.norwyn_content_events.metadata || excluded.metadata,
    updated_at = now();

  get diagnostics synced_count = row_count;
  return synced_count;
end;
$$;

grant execute on function public.norwyn_influence_hours(text) to authenticated;
grant execute on function public.norwyn_sync_instagram_content_events(uuid) to authenticated;

create or replace function public.norwyn_sync_instagram_content_events_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_tenant uuid;
begin
  if tg_table_name = 'instagram_posts' then
    target_tenant := coalesce(new.tenant_id, old.tenant_id);
  elsif tg_table_name = 'instagram_metrics' then
    select p.tenant_id into target_tenant
    from public.instagram_posts p
    where p.id = coalesce(new.post_id, old.post_id)
    limit 1;
  end if;

  if target_tenant is not null then
    perform public.norwyn_sync_instagram_content_events(target_tenant);
  end if;

  return new;
end;
$$;

drop trigger if exists norwyn_sync_instagram_posts_to_content_events on public.instagram_posts;
create trigger norwyn_sync_instagram_posts_to_content_events
after insert or update on public.instagram_posts
for each row execute function public.norwyn_sync_instagram_content_events_trigger();

drop trigger if exists norwyn_sync_instagram_metrics_to_content_events on public.instagram_metrics;
create trigger norwyn_sync_instagram_metrics_to_content_events
after insert or update on public.instagram_metrics
for each row execute function public.norwyn_sync_instagram_content_events_trigger();

do $$
declare
  tenant_row record;
begin
  for tenant_row in select id from public.tenants loop
    perform public.norwyn_sync_instagram_content_events(tenant_row.id);
  end loop;
end $$;
