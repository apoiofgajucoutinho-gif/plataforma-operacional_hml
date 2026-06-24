insert into public.tenant_module_permissions (
  tenant_id,
  role,
  module,
  can_read,
  can_write
)
select
  tenants.id,
  'MARKETING_PARTNER'::public.app_role,
  disabled_modules.module::public.module_key,
  false,
  false
from public.tenants
cross join (
  values
    ('financeiro'),
    ('atividades')
) as disabled_modules(module)
on conflict (tenant_id, role, module)
do update set
  can_read = false,
  can_write = false,
  updated_at = now();
