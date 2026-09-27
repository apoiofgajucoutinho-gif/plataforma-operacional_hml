-- Relatorios is part of the operational menu for these roles. Keep this seed
-- idempotent so tenant-specific deployments cannot hide the canonical route.
insert into public.tenant_module_permissions (
  tenant_id,
  role,
  module,
  can_read,
  can_write
)
select distinct
  members.tenant_id,
  members.role,
  'relatorios'::public.module_key,
  true,
  false
from public.tenant_members members
where members.ativo = true
  and members.role in ('ESPECIALISTA'::public.app_role, 'SUPORTE'::public.app_role)
on conflict (tenant_id, role, module)
do update set
  can_read = true,
  updated_at = now();
