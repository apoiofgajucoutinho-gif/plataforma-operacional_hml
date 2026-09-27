alter table public.relatorio_envios
  add column if not exists idempotency_key text;

alter table public.relatorio_envios
  drop constraint if exists relatorio_envios_status_check;

alter table public.relatorio_envios
  add constraint relatorio_envios_status_check
  check (status in ('preparado', 'enviado', 'erro', 'ignorado', 'sem_conteudo'));

create unique index if not exists relatorio_envios_idempotency_key_uidx
  on public.relatorio_envios (idempotency_key)
  where idempotency_key is not null;

with normalized as (
  select
    id,
    filtros,
    coalesce(filtros->'blocos', '{}'::jsonb) as old_blocks
  from public.relatorio_agendamentos
  where ativo = true
), mapped as (
  select
    id,
    jsonb_set(
      filtros,
      '{blocos}',
      (old_blocks - 'instagram' - 'ads' - 'ocorrencias' - 'objetivos')
      || case when old_blocks ? 'instagram' and not old_blocks ? 'marketing_instagram'
        then jsonb_build_object('marketing_instagram', old_blocks->'instagram') else '{}'::jsonb end
      || case when old_blocks ? 'ads' and not old_blocks ? 'marketing_ads'
        then jsonb_build_object('marketing_ads', old_blocks->'ads') else '{}'::jsonb end
      || case when old_blocks ? 'ocorrencias' and not old_blocks ? 'interacoes'
        then jsonb_build_object('interacoes', old_blocks->'ocorrencias') else '{}'::jsonb end,
      true
    ) || jsonb_build_object('renderer_version', 'telegram_v3') as filtros_v3
  from normalized
)
update public.relatorio_agendamentos as schedules
set filtros = mapped.filtros_v3,
    incluir_modulos = coalesce((
      select array_agg(distinct canonical order by canonical)
      from (
        select case module
          when 'instagram' then 'marketing_instagram'
          when 'ads' then 'marketing_ads'
          when 'ocorrencias' then 'interacoes'
          when 'objetivos' then null
          else module
        end as canonical
        from unnest(schedules.incluir_modulos) as modules(module)
      ) normalized_modules
      where canonical is not null
    ), '{}'::text[]),
    updated_at = now()
from mapped
where schedules.id = mapped.id;

update public.relatorio_agendamentos
set filtros = jsonb_set(
      filtros,
      '{blocos}',
      coalesce(filtros->'blocos', '{}'::jsonb)
        || jsonb_build_object(
          'presence', jsonb_build_object('enabled', true, 'periodo', 'hoje', 'empty_behavior', 'omit'),
          'recomendacoes', jsonb_build_object('enabled', true, 'periodo', 'hoje', 'empty_behavior', 'omit')
        ),
      true
    ),
    incluir_modulos = array['presence', 'recomendacoes']::text[],
    updated_at = now()
where ativo = true
  and tipo_resumo = 'alerta_tecnico'
  and not exists (
    select 1
    from jsonb_each(coalesce(filtros->'blocos', '{}'::jsonb)) block
    where coalesce((block.value->>'enabled')::boolean, false)
  );
