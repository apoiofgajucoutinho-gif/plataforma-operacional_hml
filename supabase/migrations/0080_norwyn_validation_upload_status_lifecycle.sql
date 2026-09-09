-- Hotfix P0: validation upload lifecycle states.

alter table public.norwyn_validation_uploads
  drop constraint if exists norwyn_validation_uploads_status_chk;

alter table public.norwyn_validation_uploads
  add constraint norwyn_validation_uploads_status_chk check (status in ('parsed', 'uploaded', 'staged', 'processing', 'normalized', 'compared', 'failed', 'error'));
