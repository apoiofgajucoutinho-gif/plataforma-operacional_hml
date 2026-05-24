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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'instagram_post_type') then
    create type public.instagram_post_type as enum ('Reels', 'Carrossel', 'Estatico', 'Outro');
  end if;

  if not exists (select 1 from pg_type where typname = 'instagram_engagement_classification') then
    create type public.instagram_engagement_classification as enum ('Bom', 'Medio', 'Ruim', 'N/A');
  end if;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'cliente',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  username text,
  instagram_user_id text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, username)
);

create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  post_id text,
  data_coleta timestamptz,
  data_postagem date not null,
  hora_postagem time,
  tipo_original text,
  tipo public.instagram_post_type not null default 'Outro',
  legenda text,
  permalink text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, post_id)
);

create unique index if not exists instagram_posts_tenant_permalink_date_idx
on public.instagram_posts (tenant_id, data_postagem, permalink)
where post_id is null and permalink is not null;

create table if not exists public.instagram_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  post_id uuid not null references public.instagram_posts(id) on delete cascade,
  likes integer not null default 0,
  comentarios integer not null default 0,
  alcance integer,
  salvos integer,
  compartilhamentos integer,
  engajamento_score numeric,
  engajamento_classificacao public.instagram_engagement_classification not null default 'N/A',
  origem text not null default 'xlsx_import',
  imported_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, post_id, origem)
);

create table if not exists public.instagram_import_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid references public.instagram_accounts(id) on delete set null,
  source text not null,
  status text not null,
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_posts_tenant_date_idx
on public.instagram_posts (tenant_id, data_postagem desc);

create index if not exists instagram_metrics_tenant_post_idx
on public.instagram_metrics (tenant_id, post_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tenants',
    'instagram_accounts',
    'instagram_posts',
    'instagram_metrics',
    'instagram_import_runs'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgname = table_name || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

alter table public.instagram_accounts enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.instagram_metrics enable row level security;
alter table public.instagram_import_runs enable row level security;

grant select, insert, update, delete on public.instagram_accounts to authenticated;
grant select, insert, update, delete on public.instagram_posts to authenticated;
grant select, insert, update, delete on public.instagram_metrics to authenticated;
grant select, insert, update, delete on public.instagram_import_runs to authenticated;
