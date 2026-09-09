alter table public.atividades_tarefas
  add column if not exists source_module text,
  add column if not exists source_event text,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists person_id uuid,
  add column if not exists student_id uuid references public.comercial_alunos(id) on delete set null,
  add column if not exists content_id uuid,
  add column if not exists incident_id uuid references public.norwyn_growth_incidents(id) on delete set null,
  add column if not exists due_at timestamptz,
  add column if not exists sla text,
  add column if not exists approval_required boolean not null default false,
  add column if not exists blocked_reason text,
  add column if not exists waiting_on text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists atividades_tarefas_product_idx
on public.atividades_tarefas (tenant_id, product_id);

create index if not exists atividades_tarefas_student_idx
on public.atividades_tarefas (tenant_id, student_id);

create index if not exists atividades_tarefas_source_idx
on public.atividades_tarefas (tenant_id, source_module, source_event);

create table if not exists public.norwyn_product_external_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  product_key text not null,
  source text not null,
  external_id text,
  external_name text,
  relationship text not null default 'MAIN_PRODUCT',
  revenue_scope text not null default 'REVENUE_DIRECT',
  confidence text not null default 'UNKNOWN',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_product_external_identities_relationship_chk check (relationship in ('MAIN_PRODUCT', 'BUNDLE', 'ORDER_BUMP', 'UPSELL', 'DOWNSELL', 'RELATED_PRODUCT', 'LEGACY_PRODUCT')),
  constraint norwyn_product_external_identities_revenue_scope_chk check (revenue_scope in ('REVENUE_DIRECT', 'REVENUE_RELATED', 'EXCLUDED')),
  constraint norwyn_product_external_identities_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'))
);

create unique index if not exists norwyn_product_external_identities_unique_idx
on public.norwyn_product_external_identities (tenant_id, source, coalesce(external_id, ''), product_key);

create index if not exists norwyn_product_external_identities_product_idx
on public.norwyn_product_external_identities (tenant_id, product_id, relationship);

create table if not exists public.norwyn_timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  title text not null,
  occurred_at timestamptz,
  source_module text not null,
  source_id text,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  person_id uuid,
  student_id uuid references public.comercial_alunos(id) on delete set null,
  activity_id uuid references public.atividades_tarefas(id) on delete set null,
  content_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists norwyn_timeline_events_entity_idx
on public.norwyn_timeline_events (tenant_id, product_id, campaign_id, student_id, occurred_at desc);

create index if not exists norwyn_timeline_events_source_idx
on public.norwyn_timeline_events (tenant_id, source_module, source_id);

create table if not exists public.norwyn_campaign_learnings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  content_id uuid,
  learning_type text not null,
  title text not null,
  detail text,
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'UNKNOWN',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_campaign_learnings_type_chk check (learning_type in ('WHAT_WORKED', 'WHAT_DID_NOT', 'WHAT_TO_REPEAT', 'WHAT_TO_TEST')),
  constraint norwyn_campaign_learnings_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'))
);

create index if not exists norwyn_campaign_learnings_campaign_idx
on public.norwyn_campaign_learnings (tenant_id, campaign_id, learning_type);

alter table public.norwyn_product_external_identities enable row level security;
alter table public.norwyn_timeline_events enable row level security;
alter table public.norwyn_campaign_learnings enable row level security;

drop policy if exists "norwyn product identities read" on public.norwyn_product_external_identities;
create policy "norwyn product identities read"
on public.norwyn_product_external_identities for select
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "norwyn product identities write" on public.norwyn_product_external_identities;
create policy "norwyn product identities write"
on public.norwyn_product_external_identities for all
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn timeline read" on public.norwyn_timeline_events;
create policy "norwyn timeline read"
on public.norwyn_timeline_events for select
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "norwyn timeline write" on public.norwyn_timeline_events;
create policy "norwyn timeline write"
on public.norwyn_timeline_events for all
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn campaign learnings read" on public.norwyn_campaign_learnings;
create policy "norwyn campaign learnings read"
on public.norwyn_campaign_learnings for select
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "norwyn campaign learnings write" on public.norwyn_campaign_learnings;
create policy "norwyn campaign learnings write"
on public.norwyn_campaign_learnings for all
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on
  public.norwyn_product_external_identities,
  public.norwyn_timeline_events,
  public.norwyn_campaign_learnings
to authenticated;
