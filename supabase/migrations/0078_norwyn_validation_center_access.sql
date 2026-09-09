-- Policies and module permissions are separated from 0077 so the enum value
-- added there is committed before it is referenced in casts/inserts.
drop policy if exists "validation read uploads" on public.norwyn_validation_uploads;
create policy "validation read uploads" on public.norwyn_validation_uploads for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write uploads" on public.norwyn_validation_uploads;
create policy "validation write uploads" on public.norwyn_validation_uploads for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

drop policy if exists "validation read hotmart rows" on public.norwyn_hotmart_validation_rows;
create policy "validation read hotmart rows" on public.norwyn_hotmart_validation_rows for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write hotmart rows" on public.norwyn_hotmart_validation_rows;
create policy "validation write hotmart rows" on public.norwyn_hotmart_validation_rows for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

drop policy if exists "validation read comparisons" on public.norwyn_hotmart_validation_comparisons;
create policy "validation read comparisons" on public.norwyn_hotmart_validation_comparisons for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write comparisons" on public.norwyn_hotmart_validation_comparisons;
create policy "validation write comparisons" on public.norwyn_hotmart_validation_comparisons for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

drop policy if exists "validation read status rules" on public.norwyn_status_mapping_rules;
create policy "validation read status rules" on public.norwyn_status_mapping_rules for select to authenticated
using (tenant_id is null or app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write status rules" on public.norwyn_status_mapping_rules;
create policy "validation write status rules" on public.norwyn_status_mapping_rules for all to authenticated
using (tenant_id is not null and app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true))
with check (tenant_id is not null and app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true));

drop policy if exists "validation read decisions" on public.norwyn_validation_decisions;
create policy "validation read decisions" on public.norwyn_validation_decisions for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write decisions" on public.norwyn_validation_decisions;
create policy "validation write decisions" on public.norwyn_validation_decisions for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));

drop policy if exists "validation read knowledge" on public.norwyn_validation_knowledge;
create policy "validation read knowledge" on public.norwyn_validation_knowledge for select to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, false) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, false));

drop policy if exists "validation write knowledge" on public.norwyn_validation_knowledge;
create policy "validation write knowledge" on public.norwyn_validation_knowledge for all to authenticated
using (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'validacao'::public.module_key, true) or app_private.can_access_module(tenant_id, 'norwyn'::public.module_key, true));


insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'validacao'::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ADMIN', true, true),
    ('ESPECIALISTA', true, true),
    ('OPERACIONAL', true, true)
) as permissions(role, can_read, can_write)
on conflict (tenant_id, role, module) do update
set can_read = excluded.can_read,
    can_write = excluded.can_write,
    updated_at = now();
