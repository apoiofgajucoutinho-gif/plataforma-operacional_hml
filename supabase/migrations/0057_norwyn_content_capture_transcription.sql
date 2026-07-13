alter table if exists public.content_capture
  add column if not exists file_name text,
  add column if not exists transcript_segments jsonb not null default '[]'::jsonb,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz;

comment on column public.content_capture.file_name is
  'Nome do arquivo de origem quando a captura utiliza transcricao automatica a partir do Google Drive.';

comment on column public.content_capture.transcript_segments is
  'Segmentos estruturados da transcricao. Pode conter inicio, fim, speaker e texto quando disponivel.';

comment on column public.content_capture.processing_started_at is
  'Inicio do ultimo processamento/transcricao da captura.';

comment on column public.content_capture.processing_completed_at is
  'Conclusao do ultimo processamento/transcricao da captura.';
