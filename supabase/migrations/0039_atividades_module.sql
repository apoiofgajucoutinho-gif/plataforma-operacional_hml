create table if not exists public.atividades_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  categoria text not null default 'outro' check (categoria in ('lancamento', 'acao_venda', 'campanha', 'operacao', 'outro')),
  descricao text,
  duracao_dias integer not null default 7 check (duracao_dias >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table if not exists public.atividades_template_tarefas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  template_id uuid not null references public.atividades_templates(id) on delete cascade,
  titulo text not null,
  descricao text,
  time_responsavel text not null default 'gestao_dados' check (time_responsavel in ('marketing', 'suporte', 'especialista', 'gestao_dados')),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  offset_inicio_dias integer not null default 0,
  offset_prazo_dias integer not null default 1,
  validacao_obrigatoria boolean not null default false,
  depende_ordem integer,
  ordem integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades_projetos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  categoria text not null default 'outro' check (categoria in ('lancamento', 'acao_venda', 'campanha', 'operacao', 'outro')),
  descricao text,
  time_responsavel text not null default 'gestao_dados' check (time_responsavel in ('marketing', 'suporte', 'especialista', 'gestao_dados')),
  responsavel_nome text,
  data_inicio date not null default current_date,
  data_fim date,
  status text not null default 'em_andamento' check (status in ('backlog', 'hoje', 'em_andamento', 'aguardando_validacao', 'bloqueada', 'concluida', 'ignorada', 'cancelada')),
  template_id uuid references public.atividades_templates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades_recorrencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  titulo text not null,
  descricao text,
  time_responsavel text not null default 'suporte' check (time_responsavel in ('marketing', 'suporte', 'especialista', 'gestao_dados')),
  responsavel_nome text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  frequencia text not null default 'diaria' check (frequencia in ('diaria', 'semanal', 'mensal')),
  dias_semana integer[] not null default '{}',
  dia_mes integer check (dia_mes between 1 and 31),
  proxima_execucao date not null default current_date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades_tarefas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  projeto_id uuid references public.atividades_projetos(id) on delete cascade,
  parent_id uuid references public.atividades_tarefas(id) on delete cascade,
  titulo text not null,
  descricao text,
  time_responsavel text not null default 'gestao_dados' check (time_responsavel in ('marketing', 'suporte', 'especialista', 'gestao_dados')),
  responsavel_nome text,
  status text not null default 'backlog' check (status in ('backlog', 'hoje', 'em_andamento', 'aguardando_validacao', 'bloqueada', 'concluida', 'ignorada', 'cancelada')),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  data_inicio date,
  prazo date,
  concluida_at timestamptz,
  validacao_obrigatoria boolean not null default false,
  ignorada_motivo text,
  recorrencia_id uuid references public.atividades_recorrencias(id) on delete set null,
  ordem integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atividades_dependencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tarefa_id uuid not null references public.atividades_tarefas(id) on delete cascade,
  depende_de_tarefa_id uuid not null references public.atividades_tarefas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tarefa_id, depende_de_tarefa_id)
);

create table if not exists public.atividades_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  descricao text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists atividades_tarefas_tenant_prazo_idx on public.atividades_tarefas (tenant_id, prazo);
create index if not exists atividades_tarefas_time_status_idx on public.atividades_tarefas (tenant_id, time_responsavel, status);
create index if not exists atividades_projetos_tenant_status_idx on public.atividades_projetos (tenant_id, status);
create index if not exists atividades_recorrencias_tenant_execucao_idx on public.atividades_recorrencias (tenant_id, proxima_execucao);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'atividades_templates',
    'atividades_template_tarefas',
    'atividades_projetos',
    'atividades_recorrencias',
    'atividades_tarefas',
    'atividades_dependencias',
    'atividades_logs'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    if table_name <> 'atividades_logs' and table_name <> 'atividades_dependencias' then
      execute format(
        'create trigger set_updated_at before update on public.%I for each row execute function app_private.set_updated_at()',
        table_name
      );
    end if;
  end loop;
end $$;

create or replace function app_private.atividades_allowed_team(target_tenant_id uuid, team text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenant_members tm
    left join public.tenant_module_permissions p
      on p.tenant_id = tm.tenant_id
      and p.role = tm.role
      and p.module = 'atividades'
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.ativo = true
      and (
        tm.role in ('ADMIN', 'SUPORTE')
        or (tm.role = 'MARKETING_PARTNER' and team = 'marketing')
        or (tm.role = 'CLINICA' and team = 'especialista')
        or (coalesce(p.can_read, false) = true and tm.role = 'USER')
      )
  );
$$;

create or replace function app_private.atividades_can_write(target_tenant_id uuid, team text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenant_members tm
    left join public.tenant_module_permissions p
      on p.tenant_id = tm.tenant_id
      and p.role = tm.role
      and p.module = 'atividades'
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.ativo = true
      and (
        tm.role in ('ADMIN', 'SUPORTE')
        or (tm.role = 'MARKETING_PARTNER' and team = 'marketing' and coalesce(p.can_write, false))
        or (tm.role = 'CLINICA' and team = 'especialista' and coalesce(p.can_write, false))
      )
  );
$$;

create or replace function public.atividades_expandir_template(p_projeto_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  project_row public.atividades_projetos%rowtype;
  template_task record;
  inserted_count integer := 0;
  created_task_id uuid;
  dependency_task_id uuid;
begin
  select * into project_row
  from public.atividades_projetos
  where id = p_projeto_id;

  if not found or project_row.template_id is null then
    return 0;
  end if;

  for template_task in
    select *
    from public.atividades_template_tarefas
    where tenant_id = project_row.tenant_id
      and template_id = project_row.template_id
      and ativo = true
    order by ordem
  loop
    insert into public.atividades_tarefas (
      tenant_id,
      projeto_id,
      titulo,
      descricao,
      time_responsavel,
      prioridade,
      data_inicio,
      prazo,
      validacao_obrigatoria,
      ordem,
      created_by
    )
    select
      project_row.tenant_id,
      project_row.id,
      template_task.titulo,
      template_task.descricao,
      template_task.time_responsavel,
      template_task.prioridade,
      project_row.data_inicio + template_task.offset_inicio_dias,
      project_row.data_inicio + template_task.offset_prazo_dias,
      template_task.validacao_obrigatoria,
      template_task.ordem,
      project_row.created_by
    where not exists (
      select 1
      from public.atividades_tarefas existing
      where existing.projeto_id = project_row.id
        and existing.ordem = template_task.ordem
    )
    returning id into created_task_id;

    if created_task_id is not null then
      inserted_count := inserted_count + 1;
      if template_task.depende_ordem is not null then
        select id into dependency_task_id
        from public.atividades_tarefas
        where projeto_id = project_row.id
          and ordem = template_task.depende_ordem
        limit 1;

        if dependency_task_id is not null then
          insert into public.atividades_dependencias (tenant_id, tarefa_id, depende_de_tarefa_id)
          values (project_row.tenant_id, created_task_id, dependency_task_id)
          on conflict do nothing;
        end if;
      end if;
    end if;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.atividades_gerar_recorrencias(p_tenant_id uuid, p_ate date default current_date + 30)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recurrence record;
  current_day date;
  created_count integer := 0;
begin
  for recurrence in
    select *
    from public.atividades_recorrencias
    where tenant_id = p_tenant_id
      and ativo = true
      and proxima_execucao <= p_ate
  loop
    current_day := recurrence.proxima_execucao;

    while current_day <= p_ate loop
      if (
        recurrence.frequencia = 'diaria'
        or (recurrence.frequencia = 'semanal' and extract(isodow from current_day)::integer = any(recurrence.dias_semana))
        or (recurrence.frequencia = 'mensal' and extract(day from current_day)::integer = recurrence.dia_mes)
      ) then
        insert into public.atividades_tarefas (
          tenant_id,
          recorrencia_id,
          titulo,
          descricao,
          time_responsavel,
          responsavel_nome,
          prioridade,
          data_inicio,
          prazo,
          status
        )
        select
          recurrence.tenant_id,
          recurrence.id,
          recurrence.titulo,
          recurrence.descricao,
          recurrence.time_responsavel,
          recurrence.responsavel_nome,
          recurrence.prioridade,
          current_day,
          current_day,
          case when current_day = current_date then 'hoje' else 'backlog' end
        where not exists (
          select 1
          from public.atividades_tarefas t
          where t.tenant_id = recurrence.tenant_id
            and t.recorrencia_id = recurrence.id
            and t.prazo = current_day
        );

        if found then
          created_count := created_count + 1;
        end if;
      end if;

      current_day := current_day + interval '1 day';
    end loop;

    update public.atividades_recorrencias
    set proxima_execucao = least(p_ate + 1, current_day)::date,
        updated_at = now()
    where id = recurrence.id;
  end loop;

  return created_count;
end;
$$;

alter table public.atividades_templates enable row level security;
alter table public.atividades_template_tarefas enable row level security;
alter table public.atividades_projetos enable row level security;
alter table public.atividades_recorrencias enable row level security;
alter table public.atividades_tarefas enable row level security;
alter table public.atividades_dependencias enable row level security;
alter table public.atividades_logs enable row level security;

drop policy if exists "atividades templates read" on public.atividades_templates;
create policy "atividades templates read" on public.atividades_templates for select to authenticated
using (app_private.can_access_module(tenant_id, 'atividades', false));

drop policy if exists "atividades templates admin" on public.atividades_templates;
create policy "atividades templates admin" on public.atividades_templates for all to authenticated
using (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'))
with check (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'));

drop policy if exists "atividades template tarefas read" on public.atividades_template_tarefas;
create policy "atividades template tarefas read" on public.atividades_template_tarefas for select to authenticated
using (app_private.can_access_module(tenant_id, 'atividades', false));

drop policy if exists "atividades template tarefas admin" on public.atividades_template_tarefas;
create policy "atividades template tarefas admin" on public.atividades_template_tarefas for all to authenticated
using (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'))
with check (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'));

drop policy if exists "atividades projetos read" on public.atividades_projetos;
create policy "atividades projetos read" on public.atividades_projetos for select to authenticated
using (app_private.atividades_allowed_team(tenant_id, time_responsavel));

drop policy if exists "atividades projetos write" on public.atividades_projetos;
create policy "atividades projetos write" on public.atividades_projetos for all to authenticated
using (app_private.atividades_can_write(tenant_id, time_responsavel))
with check (app_private.atividades_can_write(tenant_id, time_responsavel));

drop policy if exists "atividades recorrencias read" on public.atividades_recorrencias;
create policy "atividades recorrencias read" on public.atividades_recorrencias for select to authenticated
using (app_private.atividades_allowed_team(tenant_id, time_responsavel));

drop policy if exists "atividades recorrencias write" on public.atividades_recorrencias;
create policy "atividades recorrencias write" on public.atividades_recorrencias for all to authenticated
using (app_private.atividades_can_write(tenant_id, time_responsavel))
with check (app_private.atividades_can_write(tenant_id, time_responsavel));

drop policy if exists "atividades tarefas read" on public.atividades_tarefas;
create policy "atividades tarefas read" on public.atividades_tarefas for select to authenticated
using (app_private.atividades_allowed_team(tenant_id, time_responsavel));

drop policy if exists "atividades tarefas write" on public.atividades_tarefas;
create policy "atividades tarefas write" on public.atividades_tarefas for all to authenticated
using (app_private.atividades_can_write(tenant_id, time_responsavel))
with check (app_private.atividades_can_write(tenant_id, time_responsavel));

drop policy if exists "atividades dependencias read" on public.atividades_dependencias;
create policy "atividades dependencias read" on public.atividades_dependencias for select to authenticated
using (app_private.can_access_module(tenant_id, 'atividades', false));

drop policy if exists "atividades dependencias admin" on public.atividades_dependencias;
create policy "atividades dependencias admin" on public.atividades_dependencias for all to authenticated
using (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'))
with check (app_private.current_role(tenant_id) in ('ADMIN', 'SUPORTE'));

drop policy if exists "atividades logs read" on public.atividades_logs;
create policy "atividades logs read" on public.atividades_logs for select to authenticated
using (app_private.can_access_module(tenant_id, 'atividades', false));

drop policy if exists "atividades logs insert" on public.atividades_logs;
create policy "atividades logs insert" on public.atividades_logs for insert to authenticated
with check (app_private.can_access_module(tenant_id, 'atividades', true));

grant select, insert, update, delete on
  public.atividades_templates,
  public.atividades_template_tarefas,
  public.atividades_projetos,
  public.atividades_recorrencias,
  public.atividades_tarefas,
  public.atividades_dependencias,
  public.atividades_logs
to authenticated;

grant execute on function public.atividades_expandir_template(uuid) to authenticated;
grant execute on function public.atividades_gerar_recorrencias(uuid, date) to authenticated;
grant execute on function app_private.atividades_allowed_team(uuid, text) to authenticated;
grant execute on function app_private.atividades_can_write(uuid, text) to authenticated;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'atividades'::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (
  values
    ('ADMIN', true, true),
    ('SUPORTE', true, true),
    ('MARKETING_PARTNER', true, true),
    ('CLINICA', true, true)
) as permissions(role, can_read, can_write)
on conflict (tenant_id, role, module)
do update set
  can_read = excluded.can_read,
  can_write = excluded.can_write,
  updated_at = now();

insert into public.atividades_templates (tenant_id, nome, categoria, descricao, duracao_dias)
select t.id, seed.nome, seed.categoria, seed.descricao, seed.duracao_dias
from public.tenants t
cross join (
  values
    ('Lançamento', 'lancamento', 'Modelo base para planejar, validar, executar e revisar um lançamento.', 20),
    ('Ação de Venda', 'acao_venda', 'Modelo enxuto para oferta pontual, campanha, validação de links e monitoramento.', 10),
    ('Campanha / Aquecimento', 'campanha', 'Modelo para ideias táticas, como Copa, lives, sequências e aquecimentos independentes.', 14)
) as seed(nome, categoria, descricao, duracao_dias)
on conflict (tenant_id, nome) do nothing;

insert into public.atividades_template_tarefas (
  tenant_id, template_id, titulo, descricao, time_responsavel, prioridade, offset_inicio_dias, offset_prazo_dias, validacao_obrigatoria, depende_ordem, ordem
)
select tpl.tenant_id, tpl.id, seed.titulo, seed.descricao, seed.time_responsavel, seed.prioridade, seed.offset_inicio_dias, seed.offset_prazo_dias, seed.validacao_obrigatoria, seed.depende_ordem, seed.ordem
from public.atividades_templates tpl
join (
  values
    ('Lançamento', 1, 'Definir oferta e meta do lançamento', 'Registrar produto, objetivo, público e meta de faturamento.', 'gestao_dados', 'alta', 0, 2, true, null),
    ('Lançamento', 2, 'Validar calendário e marcos críticos', 'Definir datas de aquecimento, abertura, fechamento e pós-venda.', 'especialista', 'alta', 1, 3, true, 1),
    ('Lançamento', 3, 'Preparar comunicação e criativos', 'Solicitar ou validar copies, criativos, stories e e-mails.', 'marketing', 'alta', 3, 9, true, 2),
    ('Lançamento', 4, 'Validar links, preços e checkout', 'Checar links, valores, páginas e tracking antes de publicar.', 'gestao_dados', 'urgente', 7, 11, true, 3),
    ('Lançamento', 5, 'Executar checklist final', 'Confirmar materiais, campanhas e suporte antes da virada.', 'suporte', 'alta', 10, 14, true, 4),
    ('Lançamento', 6, 'Acompanhar execução diária', 'Monitorar Ads, Instagram, Directs, ocorrências e vendas.', 'gestao_dados', 'alta', 14, 20, false, 5),
    ('Lançamento', 7, 'Registrar aprendizados e próximos passos', 'Fechar análise de resultado, falhas e plano preventivo.', 'gestao_dados', 'media', 20, 22, true, 6),
    ('Ação de Venda', 1, 'Definir oferta da ação', 'Registrar objetivo, produto, período e público da ação.', 'especialista', 'alta', 0, 1, true, null),
    ('Ação de Venda', 2, 'Validar preços, links e condições', 'Evitar links incorretos, preços antigos e páginas erradas.', 'gestao_dados', 'urgente', 1, 2, true, 1),
    ('Ação de Venda', 3, 'Preparar comunicação de divulgação', 'Organizar stories, posts, disparos e mensagens.', 'marketing', 'alta', 2, 5, true, 2),
    ('Ação de Venda', 4, 'Monitorar resultado da ação', 'Acompanhar cliques, leads, vendas e reclamações.', 'gestao_dados', 'media', 5, 10, false, 3),
    ('Campanha / Aquecimento', 1, 'Registrar hipótese da campanha', 'Descrever ideia, contexto, público e métrica esperada.', 'gestao_dados', 'media', 0, 1, true, null),
    ('Campanha / Aquecimento', 2, 'Criar pauta e sequência de conteúdos', 'Transformar ideia em ações simples de execução.', 'marketing', 'media', 1, 5, true, 1),
    ('Campanha / Aquecimento', 3, 'Validar riscos e limites da campanha', 'Checar alinhamento com marca, agenda e produto.', 'especialista', 'alta', 4, 6, true, 2),
    ('Campanha / Aquecimento', 4, 'Acompanhar engajamento e respostas', 'Monitorar comentários, directs e sinais de oportunidade.', 'gestao_dados', 'media', 6, 14, false, 3)
) as seed(template_nome, ordem, titulo, descricao, time_responsavel, prioridade, offset_inicio_dias, offset_prazo_dias, validacao_obrigatoria, depende_ordem)
  on seed.template_nome = tpl.nome
where not exists (
  select 1
  from public.atividades_template_tarefas existing
  where existing.template_id = tpl.id
    and existing.ordem = seed.ordem
);

insert into public.atividades_recorrencias (tenant_id, titulo, descricao, time_responsavel, responsavel_nome, prioridade, frequencia, dias_semana, dia_mes, proxima_execucao)
select t.id, seed.titulo, seed.descricao, seed.time_responsavel, seed.responsavel_nome, seed.prioridade, seed.frequencia, seed.dias_semana, seed.dia_mes, current_date
from public.tenants t
cross join (
  values
    ('Preencher fluxo de caixa', 'Rotina diaria do suporte para manter financeiro operacional atualizado.', 'suporte', 'Ryan', 'alta', 'diaria', array[1,2,3,4,5]::integer[], null::integer),
    ('Responder suporte de alunos', 'Verificar pendencias e responder alunos nos canais operacionais.', 'suporte', 'Ryan', 'alta', 'diaria', array[1,2,3,4,5]::integer[], null::integer),
    ('Emitir NFs', 'Emitir notas fiscais da semana e registrar quantidade pendente/concluida.', 'suporte', 'Ryan', 'alta', 'semanal', array[5]::integer[], null::integer),
    ('Enviar pedidos de certificado à faculdade', 'Consolidar alunos elegiveis e enviar pedidos para a faculdade.', 'suporte', 'Ryan', 'media', 'semanal', array[5]::integer[], null::integer),
    ('Encaminhar certificados aos alunos', 'Enviar certificados recebidos e atualizar status do suporte.', 'suporte', 'Ryan', 'media', 'semanal', array[5]::integer[], null::integer)
) as seed(titulo, descricao, time_responsavel, responsavel_nome, prioridade, frequencia, dias_semana, dia_mes)
where not exists (
  select 1
  from public.atividades_recorrencias existing
  where existing.tenant_id = t.id
    and existing.titulo = seed.titulo
);
