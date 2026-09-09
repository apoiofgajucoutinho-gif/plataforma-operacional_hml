create table if not exists public.norwyn_relationship_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source text not null,
  external_id text,
  external_value text not null,
  suggested_product_id uuid references public.products(id) on delete set null,
  confidence text not null default 'UNKNOWN',
  evidence jsonb not null default '{}'::jsonb,
  cause text not null default 'UNKNOWN',
  recoverable boolean not null default false,
  status text not null default 'pending',
  resolved_product_id uuid references public.products(id) on delete set null,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_relationship_reviews_source_chk check (source in ('hotmart', 'ads', 'directs', 'content', 'support')),
  constraint norwyn_relationship_reviews_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint norwyn_relationship_reviews_status_chk check (status in ('pending', 'confirmed', 'changed', 'kept_unknown', 'auto_resolved'))
);

create unique index if not exists norwyn_relationship_reviews_unique
on public.norwyn_relationship_reviews (tenant_id, source, coalesce(external_id, ''), external_value);

create table if not exists public.norwyn_support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_key text,
  student_email text,
  student_id uuid references public.comercial_alunos(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  topic text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  assigned_to text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text,
  activity_id uuid references public.atividades_tarefas(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_support_tickets_status_chk check (status in ('open', 'waiting_student', 'waiting_third_party', 'resolved', 'closed')),
  constraint norwyn_support_tickets_priority_chk check (priority in ('critical', 'high', 'medium', 'low'))
);

create table if not exists public.norwyn_certificate_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_key text,
  student_email text,
  student_id uuid references public.comercial_alunos(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  request_date date not null default current_date,
  evidence_reference text,
  status text not null default 'REQUEST_RECEIVED',
  activity_id uuid references public.atividades_tarefas(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_certificate_requests_status_chk check (status in ('REQUEST_RECEIVED', 'TASK_RYAN_CREATED', 'WAITING_UNIVERSITY', 'READY_TO_SEND', 'SENT', 'CLOSED'))
);

create table if not exists public.norwyn_partner_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  partner text not null,
  scope_type text not null,
  product_id uuid references public.products(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  valid_from date not null,
  valid_to date,
  calculation_type text not null,
  percentage numeric,
  fixed_amount numeric,
  calculation_basis text not null,
  status text not null default 'draft',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_partner_rules_scope_chk check (scope_type in ('product', 'campaign', 'global')),
  constraint norwyn_partner_rules_calculation_type_chk check (calculation_type in ('percentage', 'fixed_amount', 'manual')),
  constraint norwyn_partner_rules_status_chk check (status in ('draft', 'active', 'inactive', 'expired'))
);

create table if not exists public.norwyn_financial_settlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  finance_lancamento_id uuid references public.fin_lancamentos(id) on delete cascade,
  provider text not null,
  period_start date,
  period_end date,
  settlement_reference text,
  value numeric not null default 0,
  status text not null default 'UNRECONCILED',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_financial_settlements_status_chk check (status in ('RECONCILED', 'PARTIAL', 'UNRECONCILED'))
);

create table if not exists public.norwyn_student_journeys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  person_key text not null,
  student_email text,
  student_id uuid references public.comercial_alunos(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  first_purchase_id uuid references public.comercial_vendas(id) on delete set null,
  purchase_status text not null default 'OK',
  access_status text not null default 'UNKNOWN',
  onboarding_status text not null default 'NOT_TRACKED',
  progress_status text not null default 'NOT_INSTRUMENTED',
  support_status text not null default 'NO_DATA',
  nps_status text not null default 'NOT_INSTRUMENTED',
  certificate_status text not null default 'NO_DATA',
  next_purchase_status text not null default 'NO_DATA',
  ltv_commercial numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_student_journeys_unique unique (tenant_id, person_key, product_id)
);

create index if not exists norwyn_relationship_reviews_status_idx on public.norwyn_relationship_reviews (tenant_id, status, source);
create index if not exists norwyn_support_tickets_student_idx on public.norwyn_support_tickets (tenant_id, student_email, product_id, status);
create index if not exists norwyn_certificate_requests_status_idx on public.norwyn_certificate_requests (tenant_id, status, product_id);
create index if not exists norwyn_partner_rules_scope_idx on public.norwyn_partner_rules (tenant_id, scope_type, product_id, campaign_id, status);
create index if not exists norwyn_financial_settlements_status_idx on public.norwyn_financial_settlements (tenant_id, provider, status);
create index if not exists norwyn_student_journeys_person_idx on public.norwyn_student_journeys (tenant_id, person_key, product_id);

alter table public.norwyn_relationship_reviews enable row level security;
alter table public.norwyn_support_tickets enable row level security;
alter table public.norwyn_certificate_requests enable row level security;
alter table public.norwyn_partner_rules enable row level security;
alter table public.norwyn_financial_settlements enable row level security;
alter table public.norwyn_student_journeys enable row level security;

drop policy if exists "norwyn relationship reviews read" on public.norwyn_relationship_reviews;
create policy "norwyn relationship reviews read" on public.norwyn_relationship_reviews for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn relationship reviews write" on public.norwyn_relationship_reviews;
create policy "norwyn relationship reviews write" on public.norwyn_relationship_reviews for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn support tickets read" on public.norwyn_support_tickets;
create policy "norwyn support tickets read" on public.norwyn_support_tickets for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn support tickets write" on public.norwyn_support_tickets;
create policy "norwyn support tickets write" on public.norwyn_support_tickets for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn certificate requests read" on public.norwyn_certificate_requests;
create policy "norwyn certificate requests read" on public.norwyn_certificate_requests for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn certificate requests write" on public.norwyn_certificate_requests;
create policy "norwyn certificate requests write" on public.norwyn_certificate_requests for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn partner rules read" on public.norwyn_partner_rules;
create policy "norwyn partner rules read" on public.norwyn_partner_rules for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn partner rules write" on public.norwyn_partner_rules;
create policy "norwyn partner rules write" on public.norwyn_partner_rules for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn financial settlements read" on public.norwyn_financial_settlements;
create policy "norwyn financial settlements read" on public.norwyn_financial_settlements for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn financial settlements write" on public.norwyn_financial_settlements;
create policy "norwyn financial settlements write" on public.norwyn_financial_settlements for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn student journeys read" on public.norwyn_student_journeys;
create policy "norwyn student journeys read" on public.norwyn_student_journeys for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));
drop policy if exists "norwyn student journeys write" on public.norwyn_student_journeys;
create policy "norwyn student journeys write" on public.norwyn_student_journeys for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on
  public.norwyn_relationship_reviews,
  public.norwyn_support_tickets,
  public.norwyn_certificate_requests,
  public.norwyn_partner_rules,
  public.norwyn_financial_settlements,
  public.norwyn_student_journeys
to authenticated;
