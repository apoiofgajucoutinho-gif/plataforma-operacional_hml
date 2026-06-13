alter table public.instagram_interactions
  drop constraint if exists instagram_interactions_source_check;

alter table public.instagram_interactions
  add constraint instagram_interactions_source_check
  check (source in ('story_reply', 'post_comment', 'new_follower', 'direct_message'));

create or replace function app_private.normalize_instagram_interaction_source(input_source text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := lower(coalesce(nullif(btrim(input_source), ''), 'story_reply'));
begin
  if normalized in ('direct_message', 'direct', 'dm', 'message', 'mensagem', 'inbox') then
    return 'direct_message';
  end if;

  if normalized in ('story_reply', 'story', 'stories') then
    return 'story_reply';
  end if;

  if normalized in ('post_comment', 'comment', 'comentario', 'comentario_post', 'comments') then
    return 'post_comment';
  end if;

  if normalized in ('new_follower', 'follower', 'seguidor', 'novo_seguidor', 'follow') then
    return 'new_follower';
  end if;

  return 'story_reply';
end;
$$;

create table if not exists public.ocorrencias_cadastros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null check (tipo in ('categoria', 'tipo_falha', 'plataforma', 'responsavel', 'canal', 'produto')),
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, tipo, nome)
);

create table if not exists public.ocorrencias_chamados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome_cliente text,
  email_cliente text,
  telefone text,
  instagram text,
  data_chamado date not null default current_date,
  canal text not null default 'Instagram',
  categoria text not null default 'Reclamacao',
  erro_motivo text not null,
  plataforma_erro text,
  solucao_realizada text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  tempo_solucao_minutos integer check (tempo_solucao_minutos is null or tempo_solucao_minutos >= 0),
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido', 'reaberto', 'cancelado', 'ignorado')),
  avaliacao integer check (avaliacao between 1 and 5),
  responsavel text,
  observacao text,
  origem_falha text not null default 'indefinido' check (origem_falha in ('marketing', 'operacao_interna', 'plataforma_externa', 'financeiro', 'cliente', 'indefinido')),
  responsavel_falha text,
  tipo_falha text,
  produto_curso text,
  campanha_nome text,
  conjunto_anuncio text,
  criativo_nome text,
  link_relacionado text,
  impacto_financeiro_tipo text not null default 'sem_impacto' check (impacto_financeiro_tipo in ('sem_impacto', 'venda_perdida', 'reembolso', 'chargeback', 'desconto_concedido', 'custo_extra')),
  impacto_financeiro_valor numeric(14,2) not null default 0,
  impacto_cliente text not null default 'medio' check (impacto_cliente in ('baixo', 'medio', 'alto', 'critico')),
  primeira_resposta_at timestamptz,
  resolvido_at timestamptz,
  sla_prazo_at timestamptz,
  sla_cumprido boolean,
  evidencia_url text,
  recorrencia text not null default 'primeira_ocorrencia' check (recorrencia in ('primeira_ocorrencia', 'recorrente', 'ja_reportado')),
  acao_preventiva text,
  cobrar_marketing boolean not null default false,
  motivo_cobranca text,
  enviado_marketing_at timestamptz,
  resposta_marketing text,
  status_cobranca text not null default 'nao_aplicavel' check (status_cobranca in ('nao_aplicavel', 'em_analise', 'enviado', 'respondido', 'resolvido')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ocorrencias_planos_acao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  chamado_id uuid references public.ocorrencias_chamados(id) on delete set null,
  titulo text not null,
  descricao text,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'feito', 'cancelado')),
  responsavel text,
  prazo date,
  origem text not null default 'manual' check (origem in ('manual', 'sugerido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ocorrencias_chamados_tenant_data_idx on public.ocorrencias_chamados (tenant_id, data_chamado desc);
create index if not exists ocorrencias_chamados_tenant_status_idx on public.ocorrencias_chamados (tenant_id, status, prioridade);
create index if not exists ocorrencias_chamados_marketing_idx on public.ocorrencias_chamados (tenant_id, cobrar_marketing, status_cobranca);
create index if not exists ocorrencias_cadastros_tenant_tipo_idx on public.ocorrencias_cadastros (tenant_id, tipo, ativo);
create index if not exists ocorrencias_planos_tenant_status_idx on public.ocorrencias_planos_acao (tenant_id, status, prioridade);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['ocorrencias_cadastros', 'ocorrencias_chamados', 'ocorrencias_planos_acao']
  loop
    if not exists (select 1 from pg_trigger where tgname = table_name || '_set_updated_at') then
      execute format(
        'create trigger %I before update on public.%I for each row execute function app_private.set_updated_at()',
        table_name || '_set_updated_at',
        table_name
      );
    end if;
  end loop;
end $$;

alter table public.ocorrencias_cadastros enable row level security;
alter table public.ocorrencias_chamados enable row level security;
alter table public.ocorrencias_planos_acao enable row level security;

drop policy if exists "ocorrencias cadastros read" on public.ocorrencias_cadastros;
create policy "ocorrencias cadastros read" on public.ocorrencias_cadastros for select to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, false));

drop policy if exists "ocorrencias cadastros write" on public.ocorrencias_cadastros;
create policy "ocorrencias cadastros write" on public.ocorrencias_cadastros for all to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true));

drop policy if exists "ocorrencias chamados read" on public.ocorrencias_chamados;
create policy "ocorrencias chamados read" on public.ocorrencias_chamados for select to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, false));

drop policy if exists "ocorrencias chamados write" on public.ocorrencias_chamados;
create policy "ocorrencias chamados write" on public.ocorrencias_chamados for all to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true));

drop policy if exists "ocorrencias planos read" on public.ocorrencias_planos_acao;
create policy "ocorrencias planos read" on public.ocorrencias_planos_acao for select to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, false));

drop policy if exists "ocorrencias planos write" on public.ocorrencias_planos_acao;
create policy "ocorrencias planos write" on public.ocorrencias_planos_acao for all to authenticated
using (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'ocorrencias'::public.module_key, true));

grant select, insert, update, delete on public.ocorrencias_cadastros to authenticated, service_role;
grant select, insert, update, delete on public.ocorrencias_chamados to authenticated, service_role;
grant select, insert, update, delete on public.ocorrencias_planos_acao to authenticated, service_role;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, permissions.role::public.app_role, 'ocorrencias'::public.module_key, permissions.can_read, permissions.can_write
from public.tenants
cross join (values ('ADMIN', true, true), ('SUPORTE', true, true)) as permissions(role, can_read, can_write)
on conflict (tenant_id, role, module)
do update set can_read = excluded.can_read, can_write = excluded.can_write, updated_at = now();

insert into public.ocorrencias_cadastros (tenant_id, tipo, nome, descricao)
select tenants.id, seed.tipo, seed.nome, seed.descricao
from public.tenants
cross join (
  values
    ('categoria', 'Duvida', 'Solicitacao de orientacao ou esclarecimento.'),
    ('categoria', 'Reclamacao', 'Insatisfacao, falha percebida ou problema que exige retorno.'),
    ('categoria', 'Bug', 'Falha tecnica em plataforma, checkout, acesso ou automacao.'),
    ('categoria', 'Financeiro', 'Pagamento, reembolso, cobranca ou valor divergente.'),
    ('categoria', 'Solicitacao', 'Pedido operacional sem reclamacao direta.'),
    ('tipo_falha', 'Link incorreto', 'URL errada, quebrada ou direcionando para destino indevido.'),
    ('tipo_falha', 'Preco incorreto', 'Valor divergente em anuncio, pagina, checkout ou comunicacao.'),
    ('tipo_falha', 'Anuncio antigo reativado', 'Campanha antiga reativada com informacao desatualizada.'),
    ('tipo_falha', 'Aula incompleta', 'Conteudo entregue incompleto ou indisponivel.'),
    ('tipo_falha', 'Produto errado', 'Produto, curso ou oferta diferente do esperado.'),
    ('tipo_falha', 'Promessa divergente', 'Oferta ou comunicacao com expectativa diferente da entrega.'),
    ('tipo_falha', 'Erro de checkout', 'Problema na compra, pagamento ou finalizacao.'),
    ('tipo_falha', 'Criativo incorreto', 'Imagem, texto ou chamada fora da estrategia aprovada.'),
    ('tipo_falha', 'Comunicacao confusa', 'Mensagem que gerou duvida recorrente ou interpretacao incorreta.'),
    ('plataforma', 'Cademi', 'Ambiente de aulas e area de membros.'),
    ('plataforma', 'Hotmart', 'Plataforma de venda/entrega.'),
    ('plataforma', 'TMB', 'Plataforma de venda/checkout.'),
    ('plataforma', 'Greenn', 'Plataforma de venda/checkout.'),
    ('plataforma', 'Instagram', 'Canal organico/social.'),
    ('plataforma', 'Meta Ads', 'Anuncios pagos.'),
    ('canal', 'WhatsApp', null),
    ('canal', 'Instagram', null),
    ('canal', 'E-mail', null),
    ('canal', 'Formulario', null),
    ('produto', 'Curso AASI', null),
    ('produto', 'Formacao', null),
    ('produto', 'Mentoria', null),
    ('produto', 'Clinica Aura', null),
    ('produto', 'Palestra', null),
    ('responsavel', 'Suporte', null),
    ('responsavel', 'Marketing', null),
    ('responsavel', 'Juliana', null)
) as seed(tipo, nome, descricao)
on conflict (tenant_id, tipo, nome)
do update set descricao = coalesce(excluded.descricao, public.ocorrencias_cadastros.descricao), ativo = true, updated_at = now();
