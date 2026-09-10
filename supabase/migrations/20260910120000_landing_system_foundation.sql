-- Norwyn Landing System foundation. HML-only seed for AASI Premium V2.

create table if not exists public.landing_page_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_key text not null,
  name text not null,
  product_id uuid null,
  campaign_id uuid null,
  status text not null default 'DRAFT' check (status in ('DRAFT','DEV','QA','HML','AWAITING_APPROVAL','APPROVED','REJECTED','READY_FOR_PROD','PROD')),
  active_version_id uuid null,
  current_environment text not null default 'DEV' check (current_environment in ('DEV','QA','HML','PROD')),
  preview_path text not null,
  production_locked boolean not null default true,
  digital_asset_id uuid null,
  activity_id uuid null references public.atividades_tarefas(id),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists landing_page_definitions_tenant_key_idx on public.landing_page_definitions(tenant_id, landing_key);
create index if not exists landing_page_definitions_tenant_status_idx on public.landing_page_definitions(tenant_id, status);

create table if not exists public.landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.landing_page_definitions(id) on delete cascade,
  version text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','DEV','QA','HML','AWAITING_APPROVAL','APPROVED','REJECTED','READY_FOR_PROD','PROD')),
  created_by uuid null,
  change_summary text not null default '',
  config_snapshot jsonb not null default '{}'::jsonb,
  content_snapshot jsonb not null default '{}'::jsonb,
  theme_snapshot jsonb not null default '{}'::jsonb,
  preview_path text not null default '/hml/lp/aasi-premium-v2',
  qa_summary jsonb not null default '{}'::jsonb,
  approved_at timestamptz null,
  rejected_at timestamptz null,
  immutable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists landing_page_versions_unique_idx on public.landing_page_versions(tenant_id, landing_id, version);
create index if not exists landing_page_versions_landing_status_idx on public.landing_page_versions(landing_id, status);

create table if not exists public.landing_page_qa_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.landing_page_definitions(id) on delete cascade,
  version_id uuid not null references public.landing_page_versions(id) on delete cascade,
  environment text not null check (environment in ('DEV','QA','HML','PROD')),
  status text not null check (status in ('PASS','WARNING','BLOCKER')),
  total_tests integer not null default 0,
  passed_tests integer not null default 0,
  warning_tests integer not null default 0,
  blocker_tests integer not null default 0,
  technical_results jsonb not null default '{}'::jsonb,
  specialist_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists landing_page_qa_runs_version_idx on public.landing_page_qa_runs(version_id, completed_at desc);

create table if not exists public.landing_page_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.landing_page_definitions(id) on delete cascade,
  version_id uuid not null references public.landing_page_versions(id) on delete cascade,
  approval_type text not null check (approval_type in ('CONTENT','OFFER','SPECIALIST_FINAL','TECHNICAL')),
  requested_by uuid null,
  requested_at timestamptz not null default now(),
  decided_by uuid null,
  decided_at timestamptz null,
  decision text not null default 'PENDING' check (decision in ('PENDING','APPROVED','REJECTED')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_page_approvals_version_idx on public.landing_page_approvals(version_id, decision);

create table if not exists public.landing_page_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landing_id uuid not null references public.landing_page_definitions(id) on delete cascade,
  version_id uuid null references public.landing_page_versions(id) on delete set null,
  activity_id uuid null references public.atividades_tarefas(id) on delete set null,
  event_type text not null,
  actor_id uuid null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists landing_page_events_landing_idx on public.landing_page_events(landing_id, occurred_at desc);

create table if not exists public.landing_page_tracking_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete set null,
  landing_id uuid null references public.landing_page_definitions(id) on delete set null,
  version_id uuid null references public.landing_page_versions(id) on delete set null,
  landing_key text null,
  landing_version text null,
  environment text not null check (environment in ('dev','qa','hml')),
  event_name text not null,
  campaign_key text null,
  product_key text null,
  block_id text null,
  block_type text null,
  cta_id text null,
  session_id text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,
  sck text null,
  page_url text null,
  source_type text not null default 'REAL' check (source_type in ('REAL','SIMULATED')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists landing_page_tracking_events_scope_idx on public.landing_page_tracking_events(landing_key, landing_version, environment, source_type, occurred_at desc);

alter table public.landing_page_definitions enable row level security;
alter table public.landing_page_versions enable row level security;
alter table public.landing_page_qa_runs enable row level security;
alter table public.landing_page_approvals enable row level security;
alter table public.landing_page_events enable row level security;
alter table public.landing_page_tracking_events enable row level security;

drop policy if exists landing_page_definitions_read on public.landing_page_definitions;
create policy landing_page_definitions_read on public.landing_page_definitions for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_definitions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_definitions_admin_write on public.landing_page_definitions;
create policy landing_page_definitions_admin_write on public.landing_page_definitions for all to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_definitions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
) with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_definitions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
);

drop policy if exists landing_page_versions_read on public.landing_page_versions;
create policy landing_page_versions_read on public.landing_page_versions for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_versions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_versions_admin_write on public.landing_page_versions;
create policy landing_page_versions_admin_write on public.landing_page_versions for all to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_versions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
) with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_versions.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
);

drop policy if exists landing_page_qa_runs_read on public.landing_page_qa_runs;
create policy landing_page_qa_runs_read on public.landing_page_qa_runs for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_qa_runs.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_qa_runs_admin_write on public.landing_page_qa_runs;
create policy landing_page_qa_runs_admin_write on public.landing_page_qa_runs for all to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_qa_runs.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
) with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_qa_runs.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
);

drop policy if exists landing_page_approvals_read on public.landing_page_approvals;
create policy landing_page_approvals_read on public.landing_page_approvals for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_approvals.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_approvals_decide on public.landing_page_approvals;
create policy landing_page_approvals_decide on public.landing_page_approvals for update to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_approvals.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
) with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_approvals.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_approvals_admin_insert on public.landing_page_approvals;
create policy landing_page_approvals_admin_insert on public.landing_page_approvals for insert to authenticated with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_approvals.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
);

drop policy if exists landing_page_events_read on public.landing_page_events;
create policy landing_page_events_read on public.landing_page_events for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_events.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_events_admin_insert on public.landing_page_events;
create policy landing_page_events_admin_insert on public.landing_page_events for insert to authenticated with check (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_events.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role in ('ADMIN','ESPECIALISTA'))
);

drop policy if exists landing_page_tracking_events_admin_read on public.landing_page_tracking_events;
create policy landing_page_tracking_events_admin_read on public.landing_page_tracking_events for select to authenticated using (
  exists (select 1 from public.tenant_members tm where tm.tenant_id = landing_page_tracking_events.tenant_id and tm.user_id = auth.uid() and tm.ativo = true and tm.role = 'ADMIN')
);

grant select, insert, update, delete on public.landing_page_definitions to authenticated;
grant select, insert, update, delete on public.landing_page_versions to authenticated;
grant select, insert, update, delete on public.landing_page_qa_runs to authenticated;
grant select, insert, update on public.landing_page_approvals to authenticated;
grant select, insert on public.landing_page_events to authenticated;
grant select on public.landing_page_tracking_events to authenticated;

with seeded_landing as (
  insert into public.landing_page_definitions (tenant_id, landing_key, name, status, current_environment, preview_path, production_locked, metadata)
  select t.id, 'aasi-premium-v2', 'Formação AASI Premium V2', 'AWAITING_APPROVAL', 'HML', '/hml/lp/aasi-premium-v2', true,
    '{"change_summary":"Nova estrutura visual, novo Hero e ajustes de oferta para homologação.","production_locked_reason":"PROD real bloqueado nesta fase."}'::jsonb
  from public.tenants t
  where t.nome = 'Juliana Coutinho'
  on conflict (tenant_id, landing_key) do update set
    name = excluded.name,
    preview_path = excluded.preview_path,
    production_locked = true,
    updated_at = now()
  returning id, tenant_id, landing_key
), seeded_version as (
  insert into public.landing_page_versions (tenant_id, landing_id, version, status, change_summary, config_snapshot, content_snapshot, theme_snapshot, preview_path, qa_summary)
  select tenant_id, id, 'v0.2', 'AWAITING_APPROVAL', 'Nova estrutura visual, novo Hero e ajustes de oferta para homologação.',
    '{"themeKey":"juliana-default"}'::jsonb,
    '{"hero":{"title":"Domine a adaptação de AASI com método, segurança clínica e condução prática.","imageSrc":"/brand/logo-horizontal-fundo-escuro.png"}}'::jsonb,
    '{"key":"juliana-default"}'::jsonb,
    '/hml/lp/aasi-premium-v2',
    '{"total":19,"passed":18,"warnings":1,"blockers":0}'::jsonb
  from seeded_landing
  on conflict (tenant_id, landing_id, version) do update set
    status = excluded.status,
    change_summary = excluded.change_summary,
    preview_path = excluded.preview_path,
    updated_at = now()
  returning id, tenant_id, landing_id, version
), existing_activity as (
  select at.id
  from public.atividades_tarefas at
  join seeded_landing sl on sl.tenant_id = at.tenant_id
  where at.source_module = 'landing-pages' and at.source_event = 'aasi-premium-v2'
  limit 1
), inserted_activity as (
  insert into public.atividades_tarefas (tenant_id, titulo, descricao, time_responsavel, responsavel_nome, prioridade, status, prazo, validacao_obrigatoria, ordem, source_module, source_event, approval_required, metadata)
  select sl.tenant_id,
    'Construção da Landing - Formação AASI Premium V2',
    'Atividade principal do ciclo Landing System: construção, DEV, QA, HML, aprovação e ready for PROD futuro.',
    'gestao_dados',
    'Admin',
    'alta',
    'aguardando_validacao',
    current_date + 7,
    true,
    0,
    'landing-pages',
    'aasi-premium-v2',
    true,
    '{"landing_key":"aasi-premium-v2","landing_version":"v0.2","pipeline_status":"AWAITING_APPROVAL","preview_path":"/hml/lp/aasi-premium-v2"}'::jsonb
  from seeded_landing sl
  where not exists (select 1 from existing_activity)
  returning id
), selected_activity as (
  select id from inserted_activity
  union all
  select id from existing_activity
  limit 1
)
update public.landing_page_definitions l
set active_version_id = (select id from seeded_version),
    activity_id = (select id from selected_activity),
    updated_at = now()
from seeded_landing sl
where l.id = sl.id;

insert into public.landing_page_qa_runs (tenant_id, landing_id, version_id, environment, status, total_tests, passed_tests, warning_tests, blocker_tests, technical_results, specialist_summary, completed_at)
select v.tenant_id, v.landing_id, v.id, 'HML', 'WARNING', 19, 18, 1, 0,
  '{"production_contamination":false,"prod_blocked":true,"tests":["desktop render","mobile render","hero","cta","tracking endpoint","utm","sck","noindex/nofollow","placeholders"]}'::jsonb,
  '{"items":["Página abre corretamente","Mobile validado","Botões funcionando","Tracking funcionando","Links validados","Imagem principal marcada para substituição"]}'::jsonb,
  now()
from public.landing_page_versions v
join public.landing_page_definitions l on l.id = v.landing_id
where l.landing_key = 'aasi-premium-v2' and v.version = 'v0.2'
  and not exists (select 1 from public.landing_page_qa_runs q where q.version_id = v.id and q.environment = 'HML');

insert into public.landing_page_approvals (tenant_id, landing_id, version_id, approval_type, decision)
select v.tenant_id, v.landing_id, v.id, 'SPECIALIST_FINAL', 'PENDING'
from public.landing_page_versions v
join public.landing_page_definitions l on l.id = v.landing_id
where l.landing_key = 'aasi-premium-v2' and v.version = 'v0.2'
  and not exists (select 1 from public.landing_page_approvals a where a.version_id = v.id and a.approval_type = 'SPECIALIST_FINAL' and a.decision = 'PENDING');

insert into public.landing_page_events (tenant_id, landing_id, version_id, activity_id, event_type, summary, metadata)
select l.tenant_id, l.id, l.active_version_id, l.activity_id, 'foundation_seeded', 'Landing AASI V2 preparada para aprovação em HML.', '{"prod_blocked":true,"hml_only":true}'::jsonb
from public.landing_page_definitions l
where l.landing_key = 'aasi-premium-v2'
  and not exists (select 1 from public.landing_page_events e where e.landing_id = l.id and e.event_type = 'foundation_seeded');





