alter table public.presence_checks
  add column if not exists source_type text not null default 'REAL',
  add column if not exists suspicious_evidence jsonb not null default '[]'::jsonb;

alter table public.presence_incidents
  add column if not exists source_type text not null default 'REAL';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'presence_checks_source_type_check'
  ) then
    alter table public.presence_checks
      add constraint presence_checks_source_type_check check (source_type in ('REAL','SIMULATED'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'presence_incidents_source_type_check'
  ) then
    alter table public.presence_incidents
      add constraint presence_incidents_source_type_check check (source_type in ('REAL','SIMULATED'));
  end if;
end $$;

update public.presence_checks pc
set
  source_type = 'SIMULATED',
  suspicious_evidence = case
    when pc.result_json ? 'suspicious_evidence' then pc.result_json->'suspicious_evidence'
    else pc.suspicious_evidence
  end
from public.digital_assets da
where pc.asset_id = da.id
  and pc.source_type <> 'SIMULATED'
  and (
    pc.result_json ? 'simulation'
    or da.environment = 'dev'
    or da.url like 'https://presence-simulated.invalid/%'
    or da.name ilike 'QA Presence Center%'
  );

update public.presence_incidents pi
set source_type = 'SIMULATED'
from public.digital_assets da
left join public.presence_checks pc on pc.id = pi.last_check_id
where pi.asset_id = da.id
  and pi.source_type <> 'SIMULATED'
  and (
    pc.source_type = 'SIMULATED'
    or da.environment = 'dev'
    or da.url like 'https://presence-simulated.invalid/%'
    or da.name ilike 'QA Presence Center%'
    or coalesce(pi.description, '') ilike '%Simulacao%'
  );

create index if not exists presence_checks_tenant_source_checked_idx
  on public.presence_checks(tenant_id, source_type, checked_at desc);

create index if not exists presence_incidents_tenant_source_status_idx
  on public.presence_incidents(tenant_id, source_type, status, detected_at desc);

comment on column public.presence_checks.source_type is 'REAL operational checks are separated from SIMULATED QA checks.';
comment on column public.presence_checks.suspicious_evidence is 'Sanitized evidence for suspicious content findings. Never render as HTML.';
comment on column public.presence_incidents.source_type is 'REAL operational incidents are separated from SIMULATED QA incidents.';
