do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'SUPORTE'
  ) then
    alter type public.app_role add value 'SUPORTE';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.fin_perfil_acesso'::regtype
      and enumlabel = 'suporte'
  ) then
    alter type public.fin_perfil_acesso add value 'suporte';
  end if;
end $$;
