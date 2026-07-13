create table if not exists public.content_capture (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  capture_type text not null default 'video' check (capture_type in ('video', 'audio')),
  drive_url text not null,
  status text not null default 'aguardando' check (status in ('aguardando', 'processando', 'concluido', 'erro')),
  product_id uuid references public.products(id) on delete set null,
  mission_id text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  objective_id text,
  description text,
  summary text,
  transcript text,
  topics jsonb not null default '[]'::jsonb,
  pain_points jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  cases jsonb not null default '[]'::jsonb,
  quotes jsonb not null default '[]'::jsonb,
  cta jsonb not null default '[]'::jsonb,
  products_detected jsonb not null default '[]'::jsonb,
  related_missions jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  knowledge_generated jsonb not null default '{}'::jsonb,
  similar_content jsonb not null default '[]'::jsonb,
  similar_campaigns jsonb not null default '[]'::jsonb,
  winning_plays jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  duration_ms integer,
  success boolean not null default false,
  error_message text,
  usage_json jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_capture_tenant_created_idx
  on public.content_capture (tenant_id, created_at desc);

create index if not exists content_capture_status_idx
  on public.content_capture (tenant_id, status, updated_at desc);

create index if not exists content_capture_product_idx
  on public.content_capture (tenant_id, product_id, updated_at desc);

create index if not exists content_capture_campaign_idx
  on public.content_capture (tenant_id, campaign_id, updated_at desc);

drop trigger if exists content_capture_set_updated_at on public.content_capture;
create trigger content_capture_set_updated_at
before update on public.content_capture
for each row execute function app_private.set_updated_at();

alter table public.content_capture enable row level security;

drop policy if exists "content capture read by norwyn readers" on public.content_capture;
create policy "content capture read by norwyn readers"
  on public.content_capture
  for select
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "content capture write by norwyn writers" on public.content_capture;
create policy "content capture write by norwyn writers"
  on public.content_capture
  for all
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', true))
  with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.content_capture to authenticated;
