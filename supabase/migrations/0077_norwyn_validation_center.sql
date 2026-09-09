do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.module_key'::regtype
      and enumlabel = 'validacao'
  ) then
    alter type public.module_key add value 'validacao';
  end if;
end $$;

create table if not exists public.norwyn_validation_uploads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  validation_type text not null,
  source text not null,
  original_filename text not null,
  file_hash text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  detected_period_start date,
  detected_period_end date,
  row_count integer not null default 0,
  unique_transaction_count integer not null default 0,
  duplicate_count integer not null default 0,
  status text not null default 'uploaded',
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_validation_uploads_type_chk check (validation_type in ('HOTMART', 'PRODUCTS', 'CONTENT', 'GENERAL')),
  constraint norwyn_validation_uploads_status_chk check (status in ('uploaded', 'normalized', 'compared', 'error'))
);

create table if not exists public.norwyn_hotmart_validation_rows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  upload_id uuid not null references public.norwyn_validation_uploads(id) on delete cascade,
  source_file text not null,
  source_row integer not null,
  transaction_id text,
  buyer_name text,
  buyer_email text,
  hotmart_product_id text,
  hotmart_product_name text,
  offer_id text,
  offer_name text,
  raw_status text,
  canonical_status text,
  raw_value text,
  normalized_value numeric,
  currency text,
  purchase_date timestamptz,
  approved_date timestamptz,
  refund_date timestamptz,
  payment_method text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_hotmart_validation_rows_unique unique (tenant_id, upload_id, source_file, source_row)
);

create index if not exists norwyn_hotmart_validation_rows_transaction_idx
on public.norwyn_hotmart_validation_rows (tenant_id, transaction_id);

create table if not exists public.norwyn_hotmart_validation_comparisons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  upload_id uuid not null references public.norwyn_validation_uploads(id) on delete cascade,
  validation_row_id uuid references public.norwyn_hotmart_validation_rows(id) on delete cascade,
  norwyn_sale_id uuid references public.comercial_vendas(id) on delete set null,
  transaction_id text,
  match_status text not null,
  difference_types text[] not null default array[]::text[],
  official_snapshot jsonb not null default '{}'::jsonb,
  norwyn_snapshot jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_hotmart_validation_match_chk check (match_status in ('MATCH_EXACT', 'MATCH_DIVERGENT', 'ONLY_HOTMART', 'ONLY_NORWYN', 'REVIEW_REQUIRED', 'UNKNOWN_MATCH')),
  constraint norwyn_hotmart_validation_review_chk check (review_status in ('pending', 'validated', 'ignored', 'conflict'))
);

create index if not exists norwyn_hotmart_validation_comparisons_upload_idx
on public.norwyn_hotmart_validation_comparisons (tenant_id, upload_id, match_status, review_status);

create table if not exists public.norwyn_status_mapping_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  domain text not null default 'HOTMART',
  raw_status text not null,
  canonical_status text not null,
  source text not null default 'SYSTEM',
  mapping_version text not null default 'hotmart_status_v2',
  confidence text not null default 'HIGH',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  active boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_status_mapping_rules_canonical_chk check (canonical_status in ('APPROVED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'OVERDUE', 'REFUNDED', 'CHARGEBACK', 'STARTED', 'PENDING_PAYMENT', 'UNKNOWN')),
  constraint norwyn_status_mapping_rules_confidence_chk check (confidence in ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'))
);

create unique index if not exists norwyn_status_mapping_rules_unique_idx
on public.norwyn_status_mapping_rules (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), domain, lower(raw_status), mapping_version)
where active;

create table if not exists public.norwyn_validation_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  validation_type text not null,
  entity_type text not null,
  entity_id text,
  upload_id uuid references public.norwyn_validation_uploads(id) on delete set null,
  decision_type text not null,
  previous_value jsonb,
  new_value jsonb,
  comment text,
  learn_scope text not null default 'single_case',
  status text not null default 'active',
  decided_by uuid references auth.users(id) on delete set null,
  decided_role text,
  decided_at timestamptz not null default now(),
  source text not null default 'validation_center',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint norwyn_validation_decisions_type_chk check (validation_type in ('HOTMART', 'PRODUCT', 'CONTENT', 'GENERAL')),
  constraint norwyn_validation_decisions_learn_scope_chk check (learn_scope in ('single_case', 'reusable_learning', 'suggested_rule')),
  constraint norwyn_validation_decisions_status_chk check (status in ('active', 'superseded', 'conflict', 'ignored'))
);

create index if not exists norwyn_validation_decisions_entity_idx
on public.norwyn_validation_decisions (tenant_id, validation_type, entity_type, entity_id, decided_at desc);

create table if not exists public.norwyn_validation_knowledge (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  knowledge_type text not null,
  subject_type text not null,
  subject_key text not null,
  predicate text not null,
  object_type text,
  object_key text,
  confidence numeric not null default 0.5,
  status text not null default 'suggested',
  source_decision_id uuid references public.norwyn_validation_decisions(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint norwyn_validation_knowledge_type_chk check (knowledge_type in ('record_correction', 'reusable_learning', 'suggested_rule')),
  constraint norwyn_validation_knowledge_status_chk check (status in ('suggested', 'approved', 'rejected', 'conflict', 'archived'))
);

create index if not exists norwyn_validation_knowledge_subject_idx
on public.norwyn_validation_knowledge (tenant_id, subject_type, subject_key, status);

alter table public.norwyn_validation_uploads enable row level security;
alter table public.norwyn_hotmart_validation_rows enable row level security;
alter table public.norwyn_hotmart_validation_comparisons enable row level security;
alter table public.norwyn_status_mapping_rules enable row level security;
alter table public.norwyn_validation_decisions enable row level security;
alter table public.norwyn_validation_knowledge enable row level security;

grant select, insert, update, delete on
  public.norwyn_validation_uploads,
  public.norwyn_hotmart_validation_rows,
  public.norwyn_hotmart_validation_comparisons,
  public.norwyn_status_mapping_rules,
  public.norwyn_validation_decisions,
  public.norwyn_validation_knowledge
to authenticated;



insert into public.norwyn_status_mapping_rules (tenant_id, domain, raw_status, canonical_status, source, mapping_version, confidence, active, evidence)
select null, 'HOTMART', raw_status, canonical_status, 'SYSTEM', 'hotmart_status_v2', 'HIGH', true, jsonb_build_object('seeded_by', '0077_norwyn_validation_center')
from (
  values
    ('Completo', 'COMPLETED'),
    ('Complete', 'COMPLETED'),
    ('COMPLETE', 'COMPLETED'),
    ('Aprovado', 'APPROVED'),
    ('Approved', 'APPROVED'),
    ('APPROVED', 'APPROVED'),
    ('Atrasado', 'OVERDUE'),
    ('Overdue', 'OVERDUE'),
    ('OVERDUE', 'OVERDUE'),
    ('Cancelado', 'CANCELLED'),
    ('Cancelada', 'CANCELLED'),
    ('Canceled', 'CANCELLED'),
    ('Cancelled', 'CANCELLED'),
    ('CANCELED', 'CANCELLED'),
    ('CANCELLED', 'CANCELLED'),
    ('Expirado', 'EXPIRED'),
    ('Expired', 'EXPIRED'),
    ('EXPIRED', 'EXPIRED'),
    ('Reembolsado', 'REFUNDED'),
    ('Reembolsada', 'REFUNDED'),
    ('Refunded', 'REFUNDED'),
    ('REFUNDED', 'REFUNDED'),
    ('Chargeback', 'CHARGEBACK'),
    ('CHARGEBACK', 'CHARGEBACK'),
    ('Iniciada', 'STARTED'),
    ('Iniciado', 'STARTED'),
    ('Started', 'STARTED'),
    ('STARTED', 'STARTED'),
    ('Aguardando Pagto', 'PENDING_PAYMENT'),
    ('Aguardando Pagamento', 'PENDING_PAYMENT'),
    ('Waiting Payment', 'PENDING_PAYMENT'),
    ('WAITING_PAYMENT', 'PENDING_PAYMENT'),
    ('Printed Billet', 'PENDING_PAYMENT'),
    ('PRINTED_BILLET', 'PENDING_PAYMENT'),
    ('Processing Transaction', 'PENDING_PAYMENT'),
    ('PROCESSING_TRANSACTION', 'PENDING_PAYMENT'),
    ('Under Analysis', 'PENDING_PAYMENT'),
    ('UNDER_ANALYSIS', 'PENDING_PAYMENT'),
    ('UNDER_ANALISYS', 'PENDING_PAYMENT')
) as seed(raw_status, canonical_status)
on conflict do nothing;

