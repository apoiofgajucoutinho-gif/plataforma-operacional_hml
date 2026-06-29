create table if not exists public.norwyn_signals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'manual' check (
    provider in ('manual', 'calendar', 'instagram', 'hotmart', 'ads', 'shadow', 'news', 'google_trends', 'youtube', 'tiktok', 'system')
  ),
  category text not null check (
    category in ('calendar', 'trend', 'event', 'opportunity', 'alert', 'market', 'platform_update', 'commercial', 'editorial', 'audience', 'product', 'ads', 'learning')
  ),
  subcategory text check (
    subcategory is null or subcategory in (
      'national_event',
      'commercial_date',
      'health_date',
      'education_event',
      'market_event',
      'platform_event',
      'product_event',
      'seasonal_campaign',
      'sports_event',
      'institutional_date'
    )
  ),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  impact_score integer not null default 50 check (impact_score between 0 and 100),
  compatibility_score integer not null default 50 check (compatibility_score between 0 and 100),
  urgency_score integer not null default 50 check (urgency_score between 0 and 100),
  confidence_score integer not null default 50 check (confidence_score between 0 and 100),
  final_score integer generated always as (
    round((impact_score * 0.30) + (compatibility_score * 0.30) + (urgency_score * 0.25) + (confidence_score * 0.15))::integer
  ) stored,
  status text not null default 'active' check (status in ('draft', 'active', 'upcoming', 'expired', 'ignored', 'used', 'archived')),
  suggested_angle text,
  suggested_action text,
  recommended_tone text,
  avoid_tone text,
  mission_tags text[] not null default '{}',
  product_tags text[] not null default '{}',
  audience_tags text[] not null default '{}',
  content_format_suggestions text[] not null default '{}',
  source_name text,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists norwyn_signals_tenant_status_idx on public.norwyn_signals (tenant_id, status);
create index if not exists norwyn_signals_tenant_provider_idx on public.norwyn_signals (tenant_id, provider);
create index if not exists norwyn_signals_tenant_category_idx on public.norwyn_signals (tenant_id, category, subcategory);
create index if not exists norwyn_signals_tenant_dates_idx on public.norwyn_signals (tenant_id, starts_at, ends_at);
create index if not exists norwyn_signals_tenant_score_idx on public.norwyn_signals (tenant_id, final_score desc);
create unique index if not exists norwyn_signals_seed_key_idx
  on public.norwyn_signals (tenant_id, (metadata ->> 'seed_key'))
  where metadata ? 'seed_key';

drop trigger if exists norwyn_signals_set_updated_at on public.norwyn_signals;
create trigger norwyn_signals_set_updated_at
before update on public.norwyn_signals
for each row
execute function app_private.set_updated_at();

alter table public.norwyn_signals enable row level security;

drop policy if exists "norwyn signals read" on public.norwyn_signals;
create policy "norwyn signals read"
on public.norwyn_signals for select
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "norwyn signals insert" on public.norwyn_signals;
create policy "norwyn signals insert"
on public.norwyn_signals for insert
to authenticated
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn signals update" on public.norwyn_signals;
create policy "norwyn signals update"
on public.norwyn_signals for update
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "norwyn signals delete" on public.norwyn_signals;
create policy "norwyn signals delete"
on public.norwyn_signals for delete
to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.norwyn_signals to authenticated;

insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, roles.role::public.app_role, 'norwyn'::public.module_key, true, roles.can_write
from public.tenants
cross join (
  values
    ('ADMIN', true),
    ('SUPORTE', true)
) as roles(role, can_write)
where exists (
  select 1 from pg_enum
  where enumtypid = 'public.app_role'::regtype
    and enumlabel = roles.role
)
on conflict (tenant_id, role, module) do update
set can_read = excluded.can_read,
    can_write = excluded.can_write;

with seed(seed_key, subcategory, title, description, starts_at, ends_at, priority, impact_score, compatibility_score, urgency_score, confidence_score, suggested_angle, suggested_action, recommended_tone, avoid_tone, mission_tags, product_tags, audience_tags, content_format_suggestions, source_name) as (
  values
    ('calendar_world_cup_brazil', 'sports_event', 'Copa do Mundo - Brasil em campo', 'Janelas de atencao nacional ligadas aos jogos do Brasil.', '2026-06-11 00:00:00-03'::timestamptz, '2026-07-19 23:59:59-03'::timestamptz, 'high', 82, 68, 80, 65, 'Conectar o clima de mobilizacao nacional com preparacao, escuta e tomada de decisao.', 'Planejar conteudos leves de aquecimento, enquetes e stories de bastidor sem depender do time de marketing.', 'Leve, oportuno, humano e educativo.', 'Tom oportunista, sensacionalista ou promessa comercial agressiva.', array['aquecimento', 'relacionamento'], array[]::text[], array['seguidores', 'alunos'], array['stories', 'enquete', 'reels curto'], 'Calendario estrategico'),
    ('calendar_olympics', 'sports_event', 'Olimpiadas', 'Evento esportivo global com temas de disciplina, performance e constancia.', null, null, 'medium', 60, 55, 35, 45, 'Usar analogias de treino, consistencia e evolucao profissional.', 'Criar pauta editorial quando houver proximidade do evento.', 'Inspirador e educativo.', 'Comparacoes forçadas ou distantes da fonoaudiologia.', array['editorial', 'autoridade'], array[]::text[], array['seguidores'], array['carrossel', 'stories'], 'Calendario estrategico'),
    ('calendar_fathers_day', 'commercial_date', 'Dia dos Pais', 'Data comercial com possibilidade de abordagem familiar e cuidado auditivo.', '2026-08-09 00:00:00-03'::timestamptz, '2026-08-09 23:59:59-03'::timestamptz, 'medium', 65, 70, 62, 70, 'Falar de familia, escuta e qualidade de vida sem apelo excessivo.', 'Preparar conteudo de consciencia e relacionamento uma semana antes.', 'Acolhedor, familiar e respeitoso.', 'Culpa, medo ou promessa de venda direta.', array['relacionamento', 'familia'], array[]::text[], array['familia', 'pacientes'], array['stories', 'post estatico'], 'Calendario estrategico'),
    ('calendar_black_friday', 'commercial_date', 'Black Friday', 'Periodo de alta disputa comercial e sensibilidade a preco.', '2026-11-27 00:00:00-03'::timestamptz, '2026-11-27 23:59:59-03'::timestamptz, 'high', 85, 60, 75, 70, 'Tratar decisao de compra com criterio, evitando guerra de preco.', 'Revisar ofertas, links, promessas e precos antes de qualquer campanha.', 'Direto, criterioso e seguro.', 'Pressao exagerada, desconto sem contexto ou urgencia artificial.', array['venda', 'lancamento'], array[]::text[], array['leads', 'alunos'], array['landing page', 'stories', 'faq'], 'Calendario estrategico'),
    ('calendar_consumer_day', 'commercial_date', 'Dia do Consumidor', 'Data comercial util para reforcar direitos, decisao segura e confianca.', '2026-03-15 00:00:00-03'::timestamptz, '2026-03-15 23:59:59-03'::timestamptz, 'medium', 68, 62, 55, 65, 'Educar sobre compra consciente, suporte e criterios de escolha.', 'Criar FAQ com duvidas de compra, acesso e garantias.', 'Transparente e orientador.', 'Tom defensivo ou promocional demais.', array['confianca', 'venda'], array[]::text[], array['leads'], array['faq', 'carrossel'], 'Calendario estrategico'),
    ('calendar_mothers_day', 'commercial_date', 'Dia das Maes', 'Data com forte componente emocional e familiar.', '2026-05-10 00:00:00-03'::timestamptz, '2026-05-10 23:59:59-03'::timestamptz, 'medium', 62, 72, 60, 65, 'Relacionar cuidado, comunicacao e escuta no ambiente familiar.', 'Planejar stories de relacionamento e conteudo de consciencia.', 'Sensivel, humano e respeitoso.', 'Explorar medo ou sentimentalismo excessivo.', array['familia', 'relacionamento'], array[]::text[], array['familia', 'seguidores'], array['stories', 'reels curto'], 'Calendario estrategico'),
    ('calendar_hearing_week', 'health_date', 'Semana Mundial da Audicao', 'Semana com alta aderencia a autoridade tecnica em saude auditiva.', '2026-03-03 00:00:00-03'::timestamptz, '2026-03-09 23:59:59-03'::timestamptz, 'critical', 90, 90, 78, 75, 'Transformar a data em agenda editorial educativa sobre escuta, diagnostico e cuidado.', 'Criar serie de conteudos educativos e caixa de perguntas.', 'Tecnico acessivel, seguro e acolhedor.', 'Alarmismo ou excesso de jargao.', array['autoridade', 'saude auditiva'], array[]::text[], array['fonoaudiologos', 'pacientes'], array['serie de stories', 'carrossel', 'live'], 'Calendario estrategico'),
    ('calendar_world_hearing_day', 'health_date', 'Dia Mundial da Audicao', 'Data institucional forte para posicionamento de autoridade.', '2026-03-03 00:00:00-03'::timestamptz, '2026-03-03 23:59:59-03'::timestamptz, 'critical', 88, 92, 82, 78, 'Reforcar autoridade da especialista com orientacao clara ao publico.', 'Publicar conteudo principal e abrir caixa de perguntas.', 'Autoridade acessivel.', 'Promessa clinica simplista ou diagnostico por rede social.', array['autoridade', 'audicao'], array[]::text[], array['seguidores', 'pacientes'], array['carrossel', 'reels', 'stories'], 'Calendario estrategico'),
    ('calendar_pink_october', 'health_date', 'Outubro Rosa', 'Campanha de saude amplamente reconhecida, util para cuidado preventivo.', '2026-10-01 00:00:00-03'::timestamptz, '2026-10-31 23:59:59-03'::timestamptz, 'low', 45, 35, 55, 55, 'Usar apenas se houver ponte real com cuidado integral e comunicacao em saude.', 'Avaliar pertinencia antes de inserir no calendario editorial.', 'Respeitoso e institucional.', 'Apropriacao de tema sem conexao clara.', array['saude', 'institucional'], array[]::text[], array['seguidores'], array['post institucional'], 'Calendario estrategico'),
    ('calendar_blue_november', 'health_date', 'Novembro Azul', 'Campanha de saude com oportunidade institucional moderada.', '2026-11-01 00:00:00-03'::timestamptz, '2026-11-30 23:59:59-03'::timestamptz, 'low', 42, 32, 55, 50, 'Usar apenas com conexao real a cuidado preventivo e comunicacao em saude.', 'Manter como sinal de calendario, sem prioridade automatica.', 'Institucional e respeitoso.', 'Forcar associacao com produto.', array['saude', 'institucional'], array[]::text[], array['seguidores'], array['post institucional'], 'Calendario estrategico'),
    ('calendar_speech_therapist_day', 'institutional_date', 'Dia do Fonoaudiologo', 'Data diretamente ligada a profissao e autoridade da especialista.', '2026-12-09 00:00:00-03'::timestamptz, '2026-12-09 23:59:59-03'::timestamptz, 'high', 82, 88, 70, 80, 'Valorizar a profissao e a trajetoria de formacao em audiologia.', 'Preparar conteudo de autoridade e reconhecimento profissional.', 'Orgulhoso, educativo e profissional.', 'Autopromocao vazia.', array['autoridade', 'institucional'], array[]::text[], array['fonoaudiologos', 'alunos'], array['carrossel', 'reels', 'stories'], 'Calendario estrategico'),
    ('calendar_speech_congress', 'education_event', 'Congresso de Fonoaudiologia', 'Evento educacional/profissional relevante para autoridade e networking.', null, null, 'medium', 70, 80, 45, 55, 'Usar congressos como gatilho de atualizacao, bastidor e autoridade.', 'Cadastrar datas reais quando confirmadas e preparar cobertura editorial.', 'Tecnico, atualizado e profissional.', 'Parecer cobertura sem presenca ou evidencia.', array['autoridade', 'educacao'], array[]::text[], array['fonoaudiologos'], array['stories', 'resumo executivo', 'carrossel'], 'Calendario estrategico'),
    ('calendar_professional_immersion', 'education_event', 'Jornada / Imersao Profissional', 'Formato de evento educacional que pode virar campanha ou aquecimento.', null, null, 'medium', 72, 78, 48, 55, 'Converter evento profissional em narrativa de aprendizado e decisao.', 'Quando houver data real, criar plano antes/durante/depois.', 'Pratico e orientado a aprendizado.', 'Prometer resultado sem base.', array['educacao', 'produto'], array[]::text[], array['alunos', 'leads'], array['live', 'stories', 'checklist'], 'Calendario estrategico'),
    ('calendar_instagram_update', 'platform_event', 'Atualizacao do Instagram', 'Mudancas de plataforma podem afetar conteudo, alcance e formato.', null, null, 'medium', 65, 75, 55, 40, 'Traduzir mudancas da plataforma em decisao editorial simples.', 'Registrar mudanca concreta antes de recomendar acao.', 'Analitico e claro.', 'Alarmismo sobre algoritmo sem evidencia.', array['plataforma', 'editorial'], array[]::text[], array['gestao', 'marketing'], array['nota interna', 'stories', 'checklist'], 'Calendario estrategico'),
    ('calendar_meta_ads_update', 'platform_event', 'Atualizacao Meta Ads', 'Mudancas de Meta Ads podem afetar performance, custo e criativos.', null, null, 'medium', 70, 72, 55, 40, 'Monitorar impactos em CTR, CPC, frequencia e criativos.', 'Registrar a mudanca e comparar com dados de Ads antes de acionar o time.', 'Tecnico, objetivo e prudente.', 'Atribuir queda de performance sem evidencia.', array['ads', 'plataforma'], array[]::text[], array['gestao', 'marketing'], array['alerta', 'checklist'], 'Calendario estrategico'),
    ('calendar_launch_live', 'product_event', 'Live de lancamento', 'Evento central de produto, autoridade e conversao.', null, null, 'critical', 92, 85, 90, 75, 'Concentrar duvidas, prova, objeccoes e proximo passo da oferta.', 'Definir antes/durante/depois e preparar recuperacao pos-live.', 'Claro, seguro e orientado a decisao.', 'Improviso sem checklist ou promessa exagerada.', array['lancamento', 'produto'], array[]::text[], array['leads', 'alunos'], array['live', 'stories', 'email', 'faq'], 'Calendario estrategico'),
    ('calendar_cart_close', 'product_event', 'Encerramento de carrinho', 'Momento critico de decisao e recuperacao comercial.', null, null, 'critical', 95, 82, 95, 75, 'Responder objeccoes finais e reduzir friccao de compra.', 'Preparar mensagens, FAQ, alerta de suporte e revisao de links/precos.', 'Direto, responsavel e claro.', 'Pressao excessiva ou urgencia artificial.', array['lancamento', 'recuperacao'], array[]::text[], array['leads'], array['stories', 'whatsapp', 'faq'], 'Calendario estrategico'),
    ('calendar_post_live_recovery', 'product_event', 'Pos-live / recuperacao', 'Janela para transformar duvidas e ausencias em recuperacao comercial.', null, null, 'high', 82, 82, 80, 70, 'Usar sinais da live para responder duvidas e recuperar leads.', 'Criar sequencia de follow-up, resumo e resposta publica.', 'Acolhedor, util e direto.', 'Insistir sem entregar valor.', array['recuperacao', 'relacionamento'], array[]::text[], array['leads', 'alunos'], array['email', 'stories', 'mensagem'], 'Calendario estrategico')
)
insert into public.norwyn_signals (
  tenant_id,
  provider,
  category,
  subcategory,
  title,
  description,
  starts_at,
  ends_at,
  priority,
  impact_score,
  compatibility_score,
  urgency_score,
  confidence_score,
  status,
  suggested_angle,
  suggested_action,
  recommended_tone,
  avoid_tone,
  mission_tags,
  product_tags,
  audience_tags,
  content_format_suggestions,
  source_name,
  metadata
)
select
  tenants.id,
  'calendar',
  'calendar',
  seed.subcategory,
  seed.title,
  seed.description,
  seed.starts_at,
  seed.ends_at,
  seed.priority,
  seed.impact_score,
  seed.compatibility_score,
  seed.urgency_score,
  seed.confidence_score,
  'active',
  seed.suggested_angle,
  seed.suggested_action,
  seed.recommended_tone,
  seed.avoid_tone,
  seed.mission_tags,
  seed.product_tags,
  seed.audience_tags,
  seed.content_format_suggestions,
  seed.source_name,
  jsonb_build_object('seed_key', seed.seed_key, 'editable_example', true)
from public.tenants
cross join seed
where not exists (
  select 1
  from public.norwyn_signals existing
  where existing.tenant_id = tenants.id
    and existing.metadata ->> 'seed_key' = seed.seed_key
);
