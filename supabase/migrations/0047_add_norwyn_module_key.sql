do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.module_key'::regtype
      and enumlabel = 'norwyn'
  ) then
    alter type public.module_key add value 'norwyn';
  end if;
end $$;
