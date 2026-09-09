alter table public.campaigns
  add column if not exists funnel_type text not null default 'outro'
  check (funnel_type in ('venda_direta', 'perpetuo', 'vsl', 'lancamento', 'captacao', 'webinar_aula', 'remarketing', 'outro'));

alter table public.campaigns
  add column if not exists growth_config jsonb not null default '{}'::jsonb;

create table if not exists public.growth_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  concept text not null,
  category text not null check (category in ('VSL', 'perpetuo', 'lancamento', 'Meta Ads', 'criativos', 'oferta', 'funil', 'copy', 'remarketing', 'orcamento', 'atribuicao')),
  rule text,
  source text not null default 'manual',
  applicability text,
  evidence jsonb not null default '[]'::jsonb,
  version text not null default 'v1',
  status text not null default 'draft' check (status in ('draft', 'active', 'deprecated', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_diagnostic_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rule_key text not null,
  name text not null,
  funnel_type text not null default 'outro',
  metric_key text not null,
  condition_json jsonb not null default '{}'::jsonb,
  diagnosis text not null,
  hypothesis text not null,
  next_action text not null,
  source text not null,
  source_type text not null default 'regra configurada' check (source_type in ('historico interno', 'produto', 'tipo de campanha', 'meta', 'regra configurada', 'referencia externa', 'inferencia IA')),
  confidence integer not null default 50 check (confidence between 0 and 100),
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, rule_key)
);

create table if not exists public.growth_experiments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  mission_external_key text,
  title text not null,
  hypothesis text not null,
  test_design text not null,
  primary_metric text not null,
  safety_metric text,
  starts_at date,
  ends_at date,
  status text not null default 'planned' check (status in ('planned', 'running', 'completed', 'cancelled')),
  decision text not null default 'inconclusive' check (decision in ('won', 'lost', 'inconclusive')),
  result_json jsonb not null default '{}'::jsonb,
  learning text,
  approval_required boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_ai_model_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_key text not null,
  provider text not null default 'gemini',
  model_env_key text not null,
  fallback_env_key text not null default 'GEMINI_MODEL',
  temperature numeric(4,2),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, task_key)
);

create index if not exists campaigns_tenant_funnel_idx on public.campaigns (tenant_id, funnel_type, status);
create index if not exists growth_knowledge_tenant_category_idx on public.growth_knowledge_base (tenant_id, category, status);
create index if not exists growth_rules_tenant_funnel_idx on public.growth_diagnostic_rules (tenant_id, funnel_type, status);
create index if not exists growth_experiments_campaign_idx on public.growth_experiments (tenant_id, campaign_id, status);
create index if not exists growth_ai_policies_tenant_task_idx on public.growth_ai_model_policies (tenant_id, task_key, status);

drop trigger if exists growth_knowledge_base_set_updated_at on public.growth_knowledge_base;
create trigger growth_knowledge_base_set_updated_at
before update on public.growth_knowledge_base
for each row execute function app_private.set_updated_at();

drop trigger if exists growth_diagnostic_rules_set_updated_at on public.growth_diagnostic_rules;
create trigger growth_diagnostic_rules_set_updated_at
before update on public.growth_diagnostic_rules
for each row execute function app_private.set_updated_at();

drop trigger if exists growth_experiments_set_updated_at on public.growth_experiments;
create trigger growth_experiments_set_updated_at
before update on public.growth_experiments
for each row execute function app_private.set_updated_at();

drop trigger if exists growth_ai_model_policies_set_updated_at on public.growth_ai_model_policies;
create trigger growth_ai_model_policies_set_updated_at
before update on public.growth_ai_model_policies
for each row execute function app_private.set_updated_at();

alter table public.growth_knowledge_base enable row level security;
alter table public.growth_diagnostic_rules enable row level security;
alter table public.growth_experiments enable row level security;
alter table public.growth_ai_model_policies enable row level security;

drop policy if exists "growth knowledge read" on public.growth_knowledge_base;
create policy "growth knowledge read" on public.growth_knowledge_base for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth knowledge write" on public.growth_knowledge_base;
create policy "growth knowledge write" on public.growth_knowledge_base for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "growth diagnostic rules read" on public.growth_diagnostic_rules;
create policy "growth diagnostic rules read" on public.growth_diagnostic_rules for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth diagnostic rules write" on public.growth_diagnostic_rules;
create policy "growth diagnostic rules write" on public.growth_diagnostic_rules for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "growth experiments read" on public.growth_experiments;
create policy "growth experiments read" on public.growth_experiments for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth experiments write" on public.growth_experiments;
create policy "growth experiments write" on public.growth_experiments for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "growth ai policies read" on public.growth_ai_model_policies;
create policy "growth ai policies read" on public.growth_ai_model_policies for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "growth ai policies write" on public.growth_ai_model_policies;
create policy "growth ai policies write" on public.growth_ai_model_policies for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.growth_knowledge_base to authenticated;
grant select, insert, update, delete on public.growth_diagnostic_rules to authenticated;
grant select, insert, update, delete on public.growth_experiments to authenticated;
grant select, insert, update, delete on public.growth_ai_model_policies to authenticated;

insert into public.growth_diagnostic_rules (
  tenant_id,
  rule_key,
  name,
  funnel_type,
  metric_key,
  condition_json,
  diagnosis,
  hypothesis,
  next_action,
  source,
  source_type,
  confidence,
  status
)
select
  tenants.id,
  seed.rule_key,
  seed.name,
  seed.funnel_type,
  seed.metric_key,
  seed.condition_json::jsonb,
  seed.diagnosis,
  seed.hypothesis,
  seed.next_action,
  seed.source,
  'regra configurada',
  seed.confidence,
  'active'
from public.tenants
cross join (
  values
    ('growth_default_ctr_delivery_v1', 'Entrega sem clique', 'outro', 'ctr', '{"operator":"equals","value":0,"requires":["spend","impressions"]}', 'A campanha teve entrega, mas nao registrou cliques.', 'Pode haver problema de criativo, hook, publico, objetivo ou tracking.', 'Revisar criativos e configuracao de evento antes de aumentar investimento.', 'Norwyn Growth Diagnostic default rules v1', 70),
    ('growth_default_clicks_without_sales_v1', 'Clique sem venda', 'outro', 'sales', '{"operator":"equals","value":0,"requires":["clicks"]}', 'Ha cliques, mas nenhuma compra confirmada associada.', 'O gargalo pode estar na landing, oferta, checkout, preco, tracking ou atraso Hotmart.', 'Investigar landing/oferta/tracking antes de pausar criativos.', 'Norwyn Growth Diagnostic default rules v1', 62),
    ('growth_default_frequency_watch_v1', 'Frequencia em observacao', 'outro', 'frequency', '{"operator":"gte","value":3,"requires":["spend"]}', 'A frequencia media exige acompanhamento de saturacao.', 'Pode haver inicio de saturacao, mas ROAS e CPA precisam ser avaliados juntos.', 'Preparar variacao de hook e acompanhar CPA/ROAS antes de redistribuir verba.', 'Norwyn Growth Diagnostic default rules v1', 54),
    ('growth_default_commercial_signal_v1', 'Sinal comercial mensuravel', 'outro', 'roas', '{"operator":"exists","requires":["spend","sales","revenue"]}', 'Gasto, vendas e receita existem no mesmo recorte.', 'A campanha pode ser analisada por CPA e ROAS, sem concluir causalidade sem atribuicao.', 'Preservar o que funciona e testar apenas uma variavel por vez.', 'Norwyn Growth Diagnostic default rules v1', 74)
) as seed(rule_key, name, funnel_type, metric_key, condition_json, diagnosis, hypothesis, next_action, source, confidence)
on conflict (tenant_id, rule_key) do nothing;

insert into public.growth_ai_model_policies (
  tenant_id,
  task_key,
  provider,
  model_env_key,
  fallback_env_key,
  temperature,
  metadata
)
select
  tenants.id,
  seed.task_key,
  'gemini',
  seed.model_env_key,
  'GEMINI_MODEL',
  seed.temperature,
  jsonb_build_object('created_by', 'migration_0060', 'note', seed.note)
from public.tenants
cross join (
  values
    ('classification_simple', 'NORWYN_AI_SIMPLE_MODEL', 0.1, 'Modelo economico para classificacao simples.'),
    ('extraction', 'NORWYN_AI_EXTRACTION_MODEL', 0.1, 'Modelo economico para extracao estruturada.'),
    ('growth_strategist', 'NORWYN_GROWTH_STRATEGIST_MODEL', 0.2, 'Modelo mais forte para diagnostico estrategico.'),
    ('complex_analysis', 'NORWYN_AI_STRONG_MODEL', 0.2, 'Modelo forte para analises complexas.')
) as seed(task_key, model_env_key, temperature, note)
on conflict (tenant_id, task_key) do nothing;
