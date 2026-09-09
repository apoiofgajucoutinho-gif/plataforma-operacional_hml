alter table public.presence_checks
  add column if not exists redirect_chain jsonb,
  add column if not exists error_message text;

comment on column public.presence_checks.redirect_chain is 'Redirect chain captured by the Presence Center read-only checker.';
comment on column public.presence_checks.error_message is 'Network, timeout or runtime error captured during a Presence Center check.';