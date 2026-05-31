create or replace function app_private.fin_is_suporte(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.fin_perfis_usuario fpu
    where fpu.tenant_id = target_tenant_id
      and fpu.user_id = auth.uid()
      and fpu.perfil = 'suporte'
      and fpu.ativo = true
  );
$$;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, permissions.module::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('SUPORTE', 'agenda', true, true),
    ('SUPORTE', 'instagram', true, false),
    ('SUPORTE', 'ads', true, false),
    ('SUPORTE', 'financeiro', true, true),
    ('SUPORTE', 'atividades', true, true),
    ('SUPORTE', 'relatorios', true, true),
    ('MARKETING_PARTNER', 'instagram', true, false),
    ('MARKETING_PARTNER', 'financeiro', true, false)
) as permissions(role, module, can_read, can_write)
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();

drop policy if exists "fin suporte lancamentos all" on public.fin_lancamentos;
create policy "fin suporte lancamentos all"
on public.fin_lancamentos for all
to authenticated
using (app_private.fin_is_suporte(tenant_id))
with check (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte bancos read" on public.fin_bancos;
create policy "fin suporte bancos read"
on public.fin_bancos for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte cartoes read" on public.fin_cartoes;
create policy "fin suporte cartoes read"
on public.fin_cartoes for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte centros read" on public.fin_centros_resultado;
create policy "fin suporte centros read"
on public.fin_centros_resultado for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte naturezas read" on public.fin_naturezas;
create policy "fin suporte naturezas read"
on public.fin_naturezas for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte categorias read" on public.fin_categorias;
create policy "fin suporte categorias read"
on public.fin_categorias for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte subcategorias read" on public.fin_subcategorias;
create policy "fin suporte subcategorias read"
on public.fin_subcategorias for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte cursos read" on public.fin_cursos;
create policy "fin suporte cursos read"
on public.fin_cursos for select
to authenticated
using (app_private.fin_is_suporte(tenant_id));

drop policy if exists "fin suporte recorrencias all" on public.fin_recorrencias;
create policy "fin suporte recorrencias all"
on public.fin_recorrencias for all
to authenticated
using (app_private.fin_is_suporte(tenant_id))
with check (app_private.fin_is_suporte(tenant_id));

grant execute on function app_private.fin_is_suporte(uuid) to authenticated;
