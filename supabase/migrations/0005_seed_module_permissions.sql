insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, permissions.module::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ADMIN', 'agenda', true, true),
    ('ADMIN', 'instagram', true, true),
    ('ADMIN', 'financeiro', true, true),
    ('ADMIN', 'atividades', true, true),
    ('ADMIN', 'relatorios', true, true),
    ('ADMIN', 'admin', true, true),
    ('MARKETING_PARTNER', 'instagram', true, true),
    ('CLINICA', 'agenda', true, true)
) as permissions(role, module, can_read, can_write)
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();
