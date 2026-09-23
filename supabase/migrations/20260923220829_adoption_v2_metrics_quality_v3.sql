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
  select
    tm.user_id,
    tm.role::text as role,
    coalesce(nullif(p.nome, ''), nullif(identity_event.metadata ->> 'user_name', ''), split_part(identity_event.metadata ->> 'user_email', '@', 1), 'Usuário') as name,
    nullif(identity_event.metadata ->> 'user_email', '') as email
  from public.tenant_members tm
  left join public.profiles p on p.id = tm.user_id
  left join lateral (
    select e.metadata
    from public.adoption_events e
    where e.tenant_id = tm.tenant_id and e.user_id = tm.user_id
    order by e.created_at desc
    limit 1
  ) identity_event on true
  where tm.tenant_id = p_tenant_id
    and tm.ativo = true
    and (p_user_id is null or tm.user_id = p_user_id)
    and (p_role is null or tm.role::text = p_role)
),
raw_period_events as (
  select e.*
  from public.adoption_events e
  join members m on m.user_id = e.user_id
  where e.tenant_id = p_tenant_id
    and e.created_at >= p_from
    and e.created_at <= p_to
),
deduplicated_page_views as (
  select id, tenant_id, user_id, module, page_path, event_name, metadata, created_at
  from (
    select e.*, row_number() over (
      partition by e.user_id, e.module, e.page_path, coalesce(e.metadata ->> 'page_label', ''), date_trunc('second', e.created_at)
      order by e.created_at, e.id
    ) as duplicate_position
    from raw_period_events e
    where e.event_name = 'page_view'
  ) ranked
  where duplicate_position = 1
),
human_events as (
  select * from deduplicated_page_views
  union all
  select id, tenant_id, user_id, module, page_path, event_name, metadata, created_at
  from raw_period_events
  where event_name in ('create', 'update', 'approve', 'delete', 'send', 'run', 'search', 'export')
),
session_marks as (
  select h.*,
    nullif(h.metadata ->> 'session_id', '') as explicit_session_id,
    lag(h.created_at) over (partition by h.user_id order by h.created_at, h.id) as previous_at
  from human_events h
),
sessionized as (
  select s.*,
    case
      when s.explicit_session_id is not null then 'id:' || s.explicit_session_id
      else 'legacy:' || sum(case when s.previous_at is null or s.created_at - s.previous_at > interval '30 minutes' then 1 else 0 end)
        over (partition by s.user_id order by s.created_at, s.id rows unbounded preceding)::text
    end as session_key
  from session_marks s
),
historical_human_events as (
  select e.user_id, e.created_at
  from public.adoption_events e
  join members m on m.user_id = e.user_id
  where e.tenant_id = p_tenant_id
    and e.event_name in ('page_view', 'create', 'update', 'approve', 'delete', 'send', 'run', 'search', 'export')
),
last_access as (
  select user_id, max(created_at) as last_access
  from historical_human_events
  group by user_id
),
person_totals as (
  select
    m.user_id,
    count(distinct (s.created_at at time zone 'America/Sao_Paulo')::date) as active_days,
    count(distinct s.session_key) as sessions,
    count(*) filter (where s.event_name = 'page_view') as page_views,
    count(distinct s.module) filter (where s.event_name = 'page_view') as modules_used
  from members m
  left join sessionized s on s.user_id = m.user_id
  group by m.user_id
),
module_counts as (
  select user_id, module, count(*) as views,
    row_number() over (partition by user_id order by count(*) desc, module) as position
  from deduplicated_page_views
  group by user_id, module
),
page_counts as (
  select
    user_id,
    module,
    coalesce(nullif(metadata ->> 'page_label', ''), page_path) as page,
    count(*) as views,
    row_number() over (partition by user_id order by count(*) desc, module, coalesce(nullif(metadata ->> 'page_label', ''), page_path)) as position
  from deduplicated_page_views
  group by user_id, module, coalesce(nullif(metadata ->> 'page_label', ''), page_path)
),
previous_module_totals as (
  select e.module, count(*) as views
  from public.adoption_events e
  join members m on m.user_id = e.user_id
  where e.tenant_id = p_tenant_id
    and e.event_name = 'page_view'
    and e.created_at >= p_from - (p_to - p_from)
    and e.created_at < p_from
  group by e.module
),
module_totals as (
  select
    p.module,
    count(*) as views,
    count(distinct p.user_id) as users,
    max(p.created_at) as last_used_at,
    case when coalesce(previous.views, 0) = 0 then null
      else round(((count(*) - previous.views)::numeric / previous.views) * 100, 1)
    end as trend_percent
  from deduplicated_page_views p
  left join previous_module_totals previous on previous.module = p.module
  group by p.module, previous.views
),
page_totals as (
  select
    module,
    coalesce(nullif(metadata ->> 'page_label', ''), page_path) as page,
    count(*) as views,
    count(distinct user_id) as users,
    max(created_at) as last_used_at
  from deduplicated_page_views
  group by module, coalesce(nullif(metadata ->> 'page_label', ''), page_path)
),
performance_values as (
  select
    user_id,
    module,
    coalesce(nullif(metadata ->> 'page_label', ''), page_path) as page,
    case when metadata ->> 'page_load_ms' ~ '^[0-9]+([.][0-9]+)?$' then (metadata ->> 'page_load_ms')::numeric
      when metadata ->> 'navigation_ms' ~ '^[0-9]+([.][0-9]+)?$' then (metadata ->> 'navigation_ms')::numeric
      else null end as duration_ms,
    metadata ->> 'navigation_outcome' as navigation_outcome
  from deduplicated_page_views
),
page_performance as (
  select module, page,
    count(duration_ms) as samples,
    percentile_cont(0.5) within group (order by duration_ms) as median_ms,
    percentile_cont(0.95) within group (order by duration_ms) as p95_ms,
    max(duration_ms) as max_ms,
    count(*) filter (where duration_ms >= 3000) as slow_loads
  from performance_values
  where duration_ms is not null
  group by module, page
),
error_candidates as (
  select e.*,
    lower(coalesce(e.metadata ->> 'error_type', '')) as error_type,
    lower(coalesce(e.metadata ->> 'error_message', '')) as error_message,
    case when e.metadata ->> 'status_code' ~ '^[0-9]+$' then (e.metadata ->> 'status_code')::integer end as status_code
  from raw_period_events e
  where e.event_name = 'error' or e.metadata ->> 'outcome' = 'error'
),
classified_errors as (
  select e.*,
    case
      when e.error_type ~ '(abort|cancel)' or e.error_message ~ '(abort|cancel|unmount|navigation)' then 'ignored'
      when e.status_code = 401 or e.error_message ~ '(login redirect|redirect de login)' then 'ignored'
      when e.error_message in ('load failed', 'typeerror: load failed', 'failed to fetch', 'networkerror when attempting to fetch resource.') then 'indeterminate'
      when e.status_code >= 500 then 'real'
      when e.status_code between 400 and 499 and e.status_code <> 401 then 'real'
      when e.error_type in ('referenceerror', 'syntaxerror', 'rangeerror', 'evalerror') then 'real'
      when e.error_type in ('frontend_error', 'module_load_error') and e.error_message <> '' then 'real'
      else 'indeterminate'
    end as classification
  from error_candidates e
),
real_errors as (
  select * from classified_errors where classification = 'real'
),
navigation_coverage as (
  select
    count(*) filter (where navigation_outcome in ('success', 'error')) as measured,
    count(*) filter (where navigation_outcome = 'success') as succeeded
  from performance_values
),
api_coverage as (
  select
    count(*) filter (where metadata ->> 'metric_type' = 'api' and metadata ->> 'outcome' in ('success', 'error')) as measured,
    count(*) filter (where metadata ->> 'metric_type' = 'api' and metadata ->> 'outcome' = 'success') as succeeded
  from raw_period_events
),
daily as (
  select
    (d.day at time zone 'America/Sao_Paulo')::date as day,
    count(s.id) filter (where s.event_name = 'page_view') as page_views,
    count(distinct s.user_id::text || ':' || s.session_key) as sessions,
    count(distinct s.user_id) as users
  from generate_series(
    date_trunc('day', p_from at time zone 'America/Sao_Paulo'),
    date_trunc('day', p_to at time zone 'America/Sao_Paulo'),
    interval '1 day'
  ) d(day)
  left join sessionized s on (s.created_at at time zone 'America/Sao_Paulo')::date = d.day::date
  group by d.day
),
recent_activity as (
  select * from human_events order by created_at desc limit 50
),
recent_actions as (
  select * from human_events where event_name <> 'page_view' order by created_at desc limit 10
),
audit as (
  select count(*) as total_events, min(created_at) as first_event_at, max(created_at) as last_event_at,
    count(distinct user_id) as users
  from public.adoption_events
  where tenant_id = p_tenant_id
),
event_names as (
  select event_name, count(*) as total
  from public.adoption_events
  where tenant_id = p_tenant_id
  group by event_name
)
select jsonb_build_object(
  'people', coalesce((
    select jsonb_agg(jsonb_build_object(
      'userId', m.user_id,
      'name', m.name,
      'email', m.email,
      'role', m.role,
      'lastAccess', la.last_access,
      'activeDays', pt.active_days,
      'sessions', pt.sessions,
      'pageViews', pt.page_views,
      'modulesUsed', pt.modules_used,
      'topModule', (select mc.module from module_counts mc where mc.user_id = m.user_id and mc.position = 1),
      'topModules', coalesce((select jsonb_agg(jsonb_build_object('module', mc.module, 'views', mc.views) order by mc.position) from module_counts mc where mc.user_id = m.user_id and mc.position <= 5), '[]'::jsonb),
      'topPages', coalesce((select jsonb_agg(jsonb_build_object('module', pc.module, 'page', pc.page, 'views', pc.views) order by pc.position) from page_counts pc where pc.user_id = m.user_id and pc.position <= 5), '[]'::jsonb)
    ) order by (la.last_access is null), la.last_access desc, m.user_id)
    from members m
    join person_totals pt on pt.user_id = m.user_id
    left join last_access la on la.user_id = m.user_id
  ), '[]'::jsonb),
  'usersActive', (select count(distinct user_id) from human_events),
  'sessions', (select count(distinct user_id::text || ':' || session_key) from sessionized),
  'activeDays', (select count(distinct (created_at at time zone 'America/Sao_Paulo')::date) from human_events),
  'pageViews', (select count(*) from deduplicated_page_views),
  'modulesUsed', (select count(distinct module) from deduplicated_page_views),
  'actions', (select count(*) from human_events where event_name <> 'page_view'),
  'topModule', (select jsonb_build_object('module', module, 'views', views) from module_totals order by views desc, module limit 1),
  'modules', coalesce((select jsonb_agg(jsonb_build_object('module', mt.module, 'views', mt.views, 'users', mt.users, 'lastUsedAt', mt.last_used_at, 'trendPercent', mt.trend_percent) order by mt.views desc, mt.module) from module_totals mt), '[]'::jsonb),
  'pages', coalesce((select jsonb_agg(jsonb_build_object('module', pt.module, 'page', pt.page, 'views', pt.views, 'users', pt.users, 'lastUsedAt', pt.last_used_at) order by pt.views desc, pt.module, pt.page) from page_totals pt), '[]'::jsonb),
  'daily', coalesce((select jsonb_agg(jsonb_build_object('date', day, 'pageViews', page_views, 'sessions', sessions, 'users', users) order by day) from daily), '[]'::jsonb),
  'recentActivity', coalesce((select jsonb_agg(jsonb_build_object('id', ra.id, 'userId', ra.user_id, 'userName', m.name, 'module', ra.module, 'pagePath', ra.page_path, 'pageLabel', coalesce(nullif(ra.metadata ->> 'page_label', ''), ra.page_path), 'eventName', ra.event_name, 'createdAt', ra.created_at, 'outcome', ra.metadata ->> 'outcome') order by ra.created_at desc) from recent_activity ra left join members m on m.user_id = ra.user_id), '[]'::jsonb),
  'recentActions', coalesce((select jsonb_agg(jsonb_build_object('id', ra.id, 'userId', ra.user_id, 'userName', m.name, 'module', ra.module, 'pagePath', ra.page_path, 'eventName', ra.event_name, 'createdAt', ra.created_at) order by ra.created_at desc) from recent_actions ra left join members m on m.user_id = ra.user_id), '[]'::jsonb),
  'experience', jsonb_build_object(
    'measuredNavigations', (select count(duration_ms) from performance_values),
    'medianMs', (select percentile_cont(0.5) within group (order by duration_ms) from performance_values where duration_ms is not null),
    'p95Ms', (select percentile_cont(0.95) within group (order by duration_ms) from performance_values where duration_ms is not null),
    'slowLoads', (select count(*) from performance_values where duration_ms >= 3000),
    'slowThresholdMs', 3000,
    'realErrors', (select count(*) from real_errors),
    'capturedErrors', (select count(*) from classified_errors),
    'ignoredErrors', (select count(*) from classified_errors where classification = 'ignored'),
    'indeterminateErrors', (select count(*) from classified_errors where classification = 'indeterminate'),
    'navigationMeasured', (select measured from navigation_coverage),
    'navigationSuccessRate', (select case when measured = 0 then null else round(succeeded::numeric / measured * 100, 1) end from navigation_coverage),
    'apiMeasured', (select measured from api_coverage),
    'apiSuccessRate', (select case when measured = 0 then null else round(succeeded::numeric / measured * 100, 1) end from api_coverage),
    'slowestPages', coalesce((select jsonb_agg(jsonb_build_object('module', module, 'page', page, 'medianMs', median_ms, 'p95Ms', p95_ms, 'maxMs', max_ms, 'samples', samples, 'slowLoads', slow_loads) order by slow_loads desc, p95_ms desc) from page_performance where slow_loads > 0), '[]'::jsonb),
    'recentErrors', coalesce((select jsonb_agg(jsonb_build_object('id', re.id, 'userId', re.user_id, 'userName', m.name, 'module', re.module, 'pagePath', re.page_path, 'pageLabel', coalesce(nullif(re.metadata ->> 'page_label', ''), re.page_path), 'eventName', re.event_name, 'createdAt', re.created_at, 'outcome', re.metadata ->> 'outcome', 'errorType', re.metadata ->> 'error_type', 'statusCode', re.status_code, 'message', re.metadata ->> 'error_message') order by re.created_at desc) from (select * from real_errors order by created_at desc limit 10) re left join members m on m.user_id = re.user_id), '[]'::jsonb),
    'errorAudit', coalesce((select jsonb_agg(jsonb_build_object('classification', grouped.classification, 'type', nullif(grouped.error_type, ''), 'module', grouped.module, 'pagePath', grouped.page_path, 'userId', grouped.user_id, 'userName', m.name, 'statusCode', grouped.status_code, 'message', nullif(grouped.error_message, ''), 'total', grouped.total, 'firstAt', grouped.first_at, 'lastAt', grouped.last_at) order by grouped.total desc, grouped.last_at desc) from (select classification, error_type, module, page_path, user_id, status_code, error_message, count(*) total, min(created_at) first_at, max(created_at) last_at from classified_errors group by classification, error_type, module, page_path, user_id, status_code, error_message) grouped left join members m on m.user_id = grouped.user_id), '[]'::jsonb)
  ),
  'audit', (select jsonb_build_object(
    'totalEvents', a.total_events,
    'firstEventAt', a.first_event_at,
    'lastEventAt', a.last_event_at,
    'users', a.users,
    'eventNames', coalesce((select jsonb_agg(jsonb_build_object('label', event_name, 'total', total) order by total desc, event_name) from event_names), '[]'::jsonb),
    'sessionCoverage', (select count(*) from public.adoption_events where tenant_id = p_tenant_id and nullif(metadata ->> 'session_id', '') is not null),
    'performanceCoverage', (select count(*) from public.adoption_events where tenant_id = p_tenant_id and (metadata ->> 'page_load_ms' is not null or metadata ->> 'navigation_ms' is not null)),
    'duplicatePageViews', (select count(*) from raw_period_events where event_name = 'page_view') - (select count(*) from deduplicated_page_views)
  ) from audit a)
);
$$;

revoke all on function public.get_adoption_report_summary(uuid, timestamptz, timestamptz, uuid, text) from public;
grant execute on function public.get_adoption_report_summary(uuid, timestamptz, timestamptz, uuid, text) to authenticated, service_role;
