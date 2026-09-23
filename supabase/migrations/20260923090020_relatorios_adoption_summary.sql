create or replace function public.get_adoption_report_summary(
  p_tenant_id uuid,
  p_from timestamptz,
  p_to timestamptz default now(),
  p_user_id uuid default null,
  p_role text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with members as (
  select tm.user_id, tm.role::text, coalesce(nullif(p.nome, ''), 'Usuario') as name
  from public.tenant_members tm
  left join public.profiles p on p.id = tm.user_id
  where tm.tenant_id = p_tenant_id
    and tm.ativo = true
    and (p_user_id is null or tm.user_id = p_user_id)
    and (p_role is null or tm.role::text = p_role)
),
period_events as (
  select
    e.id,
    e.user_id,
    e.module,
    e.page_path,
    e.event_name,
    e.metadata,
    e.created_at,
    nullif(e.metadata ->> 'session_id', '') as explicit_session_id,
    lag(e.created_at) over (partition by e.user_id order by e.created_at, e.id) as previous_at
  from public.adoption_events e
  join members m on m.user_id = e.user_id
  where e.tenant_id = p_tenant_id
    and e.created_at >= p_from
    and e.created_at <= p_to
),
session_marks as (
  select *,
    case
      when explicit_session_id is not null then 0
      when previous_at is null or created_at - previous_at > interval '30 minutes' then 1
      else 0
    end as starts_legacy_session
  from period_events
),
sessionized as (
  select *,
    case
      when explicit_session_id is not null then 'id:' || explicit_session_id
      else 'legacy:' || sum(starts_legacy_session) over (
        partition by user_id order by created_at, id rows unbounded preceding
      )::text
    end as session_key
  from session_marks
),
last_access as (
  select e.user_id, max(e.created_at) as last_access
  from public.adoption_events e
  join members m on m.user_id = e.user_id
  where e.tenant_id = p_tenant_id
  group by e.user_id
),
person_totals as (
  select
    m.user_id,
    count(distinct (s.created_at at time zone 'America/Sao_Paulo')::date) as active_days,
    count(distinct s.session_key) as sessions,
    count(*) filter (where s.event_name = 'page_view') as page_views
  from members m
  left join sessionized s on s.user_id = m.user_id
  group by m.user_id
),
module_counts as (
  select user_id, module, count(*) as views,
    row_number() over (partition by user_id order by count(*) desc, module) as position
  from period_events
  where event_name = 'page_view'
  group by user_id, module
),
module_totals as (
  select module, sum(views) as views
  from module_counts
  group by module
  order by views desc, module
),
performance_values as (
  select
    case
      when coalesce(metadata ->> 'page_load_ms', metadata ->> 'navigation_ms') ~ '^[0-9]+([.][0-9]+)?$'
      then coalesce(metadata ->> 'page_load_ms', metadata ->> 'navigation_ms')::numeric
      else null
    end as duration_ms
  from period_events
),
experience as (
  select
    count(duration_ms) as measured_navigations,
    percentile_cont(0.5) within group (order by duration_ms) filter (where duration_ms is not null) as median_ms,
    count(*) filter (where duration_ms >= 3000) as slow_loads
  from performance_values
),
error_total as (
  select count(*) as errors
  from period_events
  where event_name = 'error' or metadata ->> 'outcome' = 'error'
),
recent_actions as (
  select id, user_id, module, page_path, event_name, created_at
  from period_events
  where event_name not in ('page_view', 'error', 'performance')
  order by created_at desc
  limit 5
),
recent_errors as (
  select id, user_id, module, page_path, event_name, created_at
  from period_events
  where event_name = 'error' or metadata ->> 'outcome' = 'error'
  order by created_at desc
  limit 5
)
select jsonb_build_object(
  'people', coalesce((
    select jsonb_agg(jsonb_build_object(
      'userId', m.user_id,
      'name', m.name,
      'role', m.role,
      'lastAccess', la.last_access,
      'activeDays', pt.active_days,
      'sessions', pt.sessions,
      'pageViews', pt.page_views,
      'topModules', coalesce((
        select jsonb_agg(jsonb_build_object('module', mc.module, 'views', mc.views) order by mc.views desc, mc.module)
        from module_counts mc
        where mc.user_id = m.user_id and mc.position <= 5
      ), '[]'::jsonb)
    ) order by pt.page_views desc, m.name)
    from members m
    join person_totals pt on pt.user_id = m.user_id
    left join last_access la on la.user_id = m.user_id
  ), '[]'::jsonb),
  'topModule', (select jsonb_build_object('module', mt.module, 'views', mt.views) from module_totals mt limit 1),
  'experience', (
    select jsonb_build_object(
      'measuredNavigations', x.measured_navigations,
      'medianMs', x.median_ms,
      'slowLoads', x.slow_loads,
      'errors', et.errors,
      'successRate', case
        when x.measured_navigations + et.errors = 0 then null
        else round((x.measured_navigations::numeric / (x.measured_navigations + et.errors)) * 100, 1)
      end
    )
    from experience x cross join error_total et
  ),
  'recentActions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', ra.id,
      'userId', ra.user_id,
      'userName', m.name,
      'module', ra.module,
      'pagePath', ra.page_path,
      'eventName', ra.event_name,
      'createdAt', ra.created_at
    ) order by ra.created_at desc)
    from recent_actions ra
    left join members m on m.user_id = ra.user_id
  ), '[]'::jsonb),
  'recentErrors', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', re.id,
      'userId', re.user_id,
      'userName', m.name,
      'module', re.module,
      'pagePath', re.page_path,
      'eventName', re.event_name,
      'createdAt', re.created_at
    ) order by re.created_at desc)
    from recent_errors re
    left join members m on m.user_id = re.user_id
  ), '[]'::jsonb)
);
$$;

revoke all on function public.get_adoption_report_summary(uuid, timestamptz, timestamptz, uuid, text) from public;
grant execute on function public.get_adoption_report_summary(uuid, timestamptz, timestamptz, uuid, text) to authenticated, service_role;
