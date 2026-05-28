insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select id, 'MARKETING_PARTNER'::public.app_role, 'financeiro'::public.module_key, true, false
from public.tenants
on conflict (tenant_id, role, module)
do update set
  can_read = true,
  can_write = false,
  updated_at = now();
