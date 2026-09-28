-- Keep the specialist menu and route authorization backed by the same source.
insert into public.tenant_module_permissions (
  tenant_id,
  role,
  module,
  can_read,
  can_write
)
select distinct
  definitions.tenant_id,
  'ESPECIALISTA'::public.app_role,
  'landing-pages'::public.module_key,
  true,
  false
from public.landing_page_definitions definitions
join public.tenant_members members
  on members.tenant_id = definitions.tenant_id
where members.ativo = true
  and members.role = 'ESPECIALISTA'::public.app_role
on conflict (tenant_id, role, module)
do update set
  can_read = true,
  updated_at = now();
