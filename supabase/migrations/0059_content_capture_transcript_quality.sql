alter table if exists public.content_capture
  add column if not exists source_title text,
  add column if not exists source_description text,
  add column if not exists source_chapters jsonb not null default '[]'::jsonb,
  add column if not exists transcript_full_text text,
  add column if not exists transcript_quality jsonb not null default '{}'::jsonb;

comment on column public.content_capture.source_title is
  'Titulo/metadado da midia de origem, separado da fala transcrita.';

comment on column public.content_capture.source_description is
  'Descricao/metadado da midia de origem, separado da fala transcrita.';

comment on column public.content_capture.source_chapters is
  'Capitulos/metadados da midia de origem, quando retornados pelo provider.';

comment on column public.content_capture.transcript_full_text is
  'Texto bruto retornado pelo provider para diagnostico, mesmo quando considerado parcial ou invalido.';

comment on column public.content_capture.transcript_quality is
  'Diagnostico de qualidade da transcricao: tamanho, palavras, segmentos, cobertura e motivo de validade.';
