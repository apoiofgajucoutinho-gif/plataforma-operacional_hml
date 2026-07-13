alter table if exists public.content_capture
  add column if not exists transcript_source text,
  add column if not exists transcript_status text,
  add column if not exists file_id text,
  add column if not exists file_type text,
  add column if not exists file_size bigint,
  add column if not exists duration_seconds integer,
  add column if not exists processing_metadata jsonb not null default '{}'::jsonb,
  add column if not exists result_version integer not null default 1,
  add column if not exists result_versions jsonb not null default '[]'::jsonb,
  add column if not exists primary_product_id uuid references public.products(id) on delete set null,
  add column if not exists manually_selected_product_id uuid references public.products(id) on delete set null,
  add column if not exists confidence integer,
  add column if not exists error_details jsonb not null default '{}'::jsonb;

create index if not exists idx_content_capture_primary_product
  on public.content_capture (tenant_id, primary_product_id);

create index if not exists idx_content_capture_status_updated
  on public.content_capture (tenant_id, status, updated_at desc);
