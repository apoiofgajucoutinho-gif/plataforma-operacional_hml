do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'ESPECIALISTA'
  ) then
    alter type public.app_role add value 'ESPECIALISTA';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'OPERACIONAL'
  ) then
    alter type public.app_role add value 'OPERACIONAL';
  end if;
end $$;

create or replace function app_private.can_access_norwyn_feature(target_tenant_id uuid, feature_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with role_scope as (
    select app_private.current_role(target_tenant_id)::text as role
  )
  select case
    when role = 'ADMIN' then true
    when role = 'ESPECIALISTA' then feature_key not in ('technical_config', 'technical_lifecycle', 'lab_advanced')
    when role = 'OPERACIONAL' then feature_key in ('home', 'marketing', 'results', 'instagram', 'ads', 'activities', 'finance_operational', 'products', 'students', 'support')
    when role = 'SUPORTE' then feature_key in ('home', 'marketing', 'results', 'instagram', 'ads', 'activities', 'finance_operational', 'products', 'students', 'support')
    else false
  end
  from role_scope;
$$;

grant execute on function app_private.can_access_norwyn_feature(uuid, text) to authenticated;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, permissions.module::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ESPECIALISTA', 'norwyn', true, true),
    ('ESPECIALISTA', 'agenda', true, true),
    ('ESPECIALISTA', 'instagram', true, false),
    ('ESPECIALISTA', 'ads', true, false),
    ('ESPECIALISTA', 'objetivos', true, false),
    ('ESPECIALISTA', 'financeiro', true, false),
    ('ESPECIALISTA', 'comercial', true, false),
    ('ESPECIALISTA', 'atividades', true, false),
    ('OPERACIONAL', 'norwyn', true, true),
    ('OPERACIONAL', 'agenda', true, true),
    ('OPERACIONAL', 'instagram', true, false),
    ('OPERACIONAL', 'ads', true, false),
    ('OPERACIONAL', 'financeiro', true, true),
    ('OPERACIONAL', 'comercial', true, false),
    ('OPERACIONAL', 'atividades', true, true),
    ('OPERACIONAL', 'relatorios', true, false)
) as permissions(role, module, can_read, can_write)
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();

insert into public.fin_perfis_usuario (tenant_id, user_id, perfil, centros_permitidos, ativo)
select tenant_id, user_id, 'marketing'::public.fin_perfil_acesso, array[]::uuid[], true
from public.tenant_members
where role::text = 'ESPECIALISTA'
on conflict (tenant_id, user_id) do update
set perfil = excluded.perfil,
    ativo = true,
    updated_at = now();

insert into public.fin_perfis_usuario (tenant_id, user_id, perfil, centros_permitidos, ativo)
select tenant_id, user_id, 'suporte'::public.fin_perfil_acesso, array[]::uuid[], true
from public.tenant_members
where role::text = 'OPERACIONAL'
on conflict (tenant_id, user_id) do update
set perfil = excluded.perfil,
    ativo = true,
    updated_at = now();

alter table public.norwyn_certificate_requests
  drop constraint if exists norwyn_certificate_requests_status_chk;

alter table public.norwyn_certificate_requests
  add constraint norwyn_certificate_requests_status_chk check (status in ('REQUEST_RECEIVED', 'TASK_RYAN_CREATED', 'TASK_OPERATIONAL_CREATED', 'WAITING_UNIVERSITY', 'READY_TO_SEND', 'SENT', 'CLOSED'));

drop policy if exists "norwyn lifecycle read eligibility rules" on public.norwyn_lifecycle_eligibility_rules;
create policy "norwyn lifecycle read eligibility rules" on public.norwyn_lifecycle_eligibility_rules for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write eligibility rules" on public.norwyn_lifecycle_eligibility_rules;
create policy "norwyn lifecycle write eligibility rules" on public.norwyn_lifecycle_eligibility_rules for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read runs" on public.norwyn_lifecycle_eligibility_runs;
create policy "norwyn lifecycle read runs" on public.norwyn_lifecycle_eligibility_runs for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write runs" on public.norwyn_lifecycle_eligibility_runs;
create policy "norwyn lifecycle write runs" on public.norwyn_lifecycle_eligibility_runs for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read members" on public.norwyn_lifecycle_eligibility_members;
create policy "norwyn lifecycle read members" on public.norwyn_lifecycle_eligibility_members for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write members" on public.norwyn_lifecycle_eligibility_members;
create policy "norwyn lifecycle write members" on public.norwyn_lifecycle_eligibility_members for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read customer events" on public.norwyn_customer_offer_events;
create policy "norwyn lifecycle read customer events" on public.norwyn_customer_offer_events for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write customer events" on public.norwyn_customer_offer_events;
create policy "norwyn lifecycle write customer events" on public.norwyn_customer_offer_events for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read experiments" on public.norwyn_lifecycle_experiments;
create policy "norwyn lifecycle read experiments" on public.norwyn_lifecycle_experiments for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write experiments" on public.norwyn_lifecycle_experiments;
create policy "norwyn lifecycle write experiments" on public.norwyn_lifecycle_experiments for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read channel statuses" on public.norwyn_customer_channel_statuses;
create policy "norwyn lifecycle read channel statuses" on public.norwyn_customer_channel_statuses for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write channel statuses" on public.norwyn_customer_channel_statuses;
create policy "norwyn lifecycle write channel statuses" on public.norwyn_customer_channel_statuses for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read exposure rules" on public.norwyn_lifecycle_exposure_rules;
create policy "norwyn lifecycle read exposure rules" on public.norwyn_lifecycle_exposure_rules for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write exposure rules" on public.norwyn_lifecycle_exposure_rules;
create policy "norwyn lifecycle write exposure rules" on public.norwyn_lifecycle_exposure_rules for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read execution approvals" on public.norwyn_lifecycle_execution_approvals;
create policy "norwyn lifecycle read execution approvals" on public.norwyn_lifecycle_execution_approvals for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write execution approvals" on public.norwyn_lifecycle_execution_approvals;
create policy "norwyn lifecycle write execution approvals" on public.norwyn_lifecycle_execution_approvals for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read channel policies" on public.norwyn_channel_contact_policies;
create policy "norwyn lifecycle read channel policies" on public.norwyn_channel_contact_policies for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write channel policies" on public.norwyn_channel_contact_policies;
create policy "norwyn lifecycle write channel policies" on public.norwyn_channel_contact_policies for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read message drafts" on public.norwyn_lifecycle_message_drafts;
create policy "norwyn lifecycle read message drafts" on public.norwyn_lifecycle_message_drafts for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write message drafts" on public.norwyn_lifecycle_message_drafts;
create policy "norwyn lifecycle write message drafts" on public.norwyn_lifecycle_message_drafts for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));

drop policy if exists "norwyn lifecycle read internal test contacts" on public.norwyn_lifecycle_internal_test_contacts;
create policy "norwyn lifecycle read internal test contacts" on public.norwyn_lifecycle_internal_test_contacts for select to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
drop policy if exists "norwyn lifecycle write internal test contacts" on public.norwyn_lifecycle_internal_test_contacts;
create policy "norwyn lifecycle write internal test contacts" on public.norwyn_lifecycle_internal_test_contacts for all to authenticated
using (app_private.can_access_norwyn_feature(tenant_id, 'missions'))
with check (app_private.can_access_norwyn_feature(tenant_id, 'missions'));
