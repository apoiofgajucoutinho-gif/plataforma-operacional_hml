do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'content_capture_status_check'
      and conrelid = 'public.content_capture'::regclass
  ) then
    alter table public.content_capture
      drop constraint content_capture_status_check;
  end if;
end $$;

alter table public.content_capture
  add constraint content_capture_status_check
  check (
    status in (
      'aguardando',
      'acessando_arquivo',
      'transcrevendo',
      'analisando',
      'concluido',
      'concluido_parcialmente',
      'erro',
      'processando'
    )
  );

comment on constraint content_capture_status_check on public.content_capture is
  'Status validos do Content Capture. processando permanece aceito como valor legado.';

