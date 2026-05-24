do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.module_key'::regtype
      and enumlabel = 'adocao'
  ) then
    alter type public.module_key add value 'adocao';
  end if;
end $$;
