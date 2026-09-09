do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.growth_funnel_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%event_type%';

  if constraint_name is not null then
    execute format('alter table public.growth_funnel_events drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.growth_funnel_events
  add constraint growth_funnel_events_event_type_check
  check (event_type in (
    'LANDING_VIEW',
    'VSL_PLAY',
    'VSL_PROGRESS_25',
    'VSL_PROGRESS_50',
    'VSL_PROGRESS_75',
    'VSL_PROGRESS_90',
    'CTA',
    'VSL_CTA_VIEW',
    'VSL_CTA_CLICK',
    'CHECKOUT',
    'CHECKOUT_VIEW',
    'PURCHASE',
    'ORDER_BUMP',
    'UPSELL',
    'DOWNSELL',
    'TEST_DESTINATION_VIEW'
  ));

alter table public.growth_funnel_events
  add column if not exists event_key text;

create unique index if not exists growth_funnel_events_tenant_event_key_idx
on public.growth_funnel_events (tenant_id, event_key)
where event_key is not null;
