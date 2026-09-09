alter table public.presence_checks
  add column if not exists content_change_score numeric;

comment on column public.presence_checks.content_change_score is 'Heuristic percentage used by Presence Center to classify relevant or critical content changes.';