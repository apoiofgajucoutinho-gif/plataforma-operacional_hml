create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text not null default 'Campanha',
  objective_id uuid,
  mission_external_key text,
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'draft',
  starts_at date,
  ends_at date,
  target_sales integer,
  target_revenue numeric(14,2),
  plan_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  material_type text not null,
  title text not null,
  status text not null default 'draft',
  channel text,
  current_version_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_material_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  material_id uuid not null references public.campaign_materials(id) on delete cascade,
  version_number integer not null default 1,
  title text not null,
  content text not null default '',
  change_note text,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (material_id, version_number)
);

create table if not exists public.campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  material_id uuid not null references public.campaign_materials(id) on delete cascade,
  version_id uuid not null references public.campaign_material_versions(id) on delete cascade,
  approver_id uuid references auth.users(id) on delete set null,
  approver_name text,
  status text not null default 'requested',
  decided_at timestamptz,
  observation text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.atividades_tarefas
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists campaigns_tenant_status_idx on public.campaigns (tenant_id, status, starts_at, ends_at);
create index if not exists campaigns_tenant_product_idx on public.campaigns (tenant_id, product_id);
create unique index if not exists campaigns_tenant_name_uidx on public.campaigns (tenant_id, lower(name));
create index if not exists campaign_materials_campaign_idx on public.campaign_materials (tenant_id, campaign_id, material_type);
create unique index if not exists campaign_materials_seed_uidx
  on public.campaign_materials (tenant_id, campaign_id, (metadata ->> 'seed_key'))
  where metadata ? 'seed_key';
create index if not exists campaign_material_versions_material_idx on public.campaign_material_versions (tenant_id, material_id, version_number desc);
create index if not exists campaign_approvals_campaign_idx on public.campaign_approvals (tenant_id, campaign_id, status);
create index if not exists atividades_tarefas_campaign_idx on public.atividades_tarefas (tenant_id, campaign_id);

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function app_private.set_updated_at();

drop trigger if exists campaign_materials_set_updated_at on public.campaign_materials;
create trigger campaign_materials_set_updated_at
before update on public.campaign_materials
for each row execute function app_private.set_updated_at();

drop trigger if exists campaign_approvals_set_updated_at on public.campaign_approvals;
create trigger campaign_approvals_set_updated_at
before update on public.campaign_approvals
for each row execute function app_private.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.campaign_materials enable row level security;
alter table public.campaign_material_versions enable row level security;
alter table public.campaign_approvals enable row level security;

drop policy if exists "campaigns read" on public.campaigns;
create policy "campaigns read" on public.campaigns for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "campaigns write" on public.campaigns;
create policy "campaigns write" on public.campaigns for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "campaign materials read" on public.campaign_materials;
create policy "campaign materials read" on public.campaign_materials for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "campaign materials write" on public.campaign_materials;
create policy "campaign materials write" on public.campaign_materials for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "campaign material versions read" on public.campaign_material_versions;
create policy "campaign material versions read" on public.campaign_material_versions for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "campaign material versions write" on public.campaign_material_versions;
create policy "campaign material versions write" on public.campaign_material_versions for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "campaign approvals read" on public.campaign_approvals;
create policy "campaign approvals read" on public.campaign_approvals for select to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "campaign approvals write" on public.campaign_approvals;
create policy "campaign approvals write" on public.campaign_approvals for all to authenticated
using (app_private.can_access_module(tenant_id, 'norwyn', true))
with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaign_materials to authenticated;
grant select, insert, update, delete on public.campaign_material_versions to authenticated;
grant select, insert, update, delete on public.campaign_approvals to authenticated;

do $$
declare
  target_tenant uuid;
  v_campaign_id uuid;
  product_ref uuid;
  objective_ref uuid;
  briefing_id uuid;
  whatsapp_id uuid;
  email_id uuid;
  briefing_v1 uuid;
  briefing_v2 uuid;
  whatsapp_v1 uuid;
  email_v1 uuid;
begin
  select id into target_tenant
  from public.tenants
  order by created_at asc
  limit 1;

  if target_tenant is null then
    return;
  end if;

  select id into product_ref
  from public.products
  where tenant_id = target_tenant
    and (
      lower(coalesce(produto_base, '')) like '%aasi%'
      or lower(coalesce(nome_oficial, '')) like '%aasi%'
    )
  order by ativo desc, updated_at desc
  limit 1;

  select id into objective_ref
  from public.objetivos_metas
  where tenant_id = target_tenant
  order by updated_at desc
  limit 1;

  insert into public.campaigns (
    tenant_id,
    name,
    type,
    objective_id,
    mission_external_key,
    product_id,
    status,
    starts_at,
    ends_at,
    target_sales,
    target_revenue,
    plan_json
  )
  values (
    target_tenant,
    'Acao de Downsell - Piloto Norwyn',
    'downsell',
    objective_ref,
    'mission:downsell-piloto',
    product_ref,
    'draft',
    current_date,
    current_date + interval '14 days',
    20,
    20000,
    jsonb_build_object(
      'contexto', 'Campanha piloto para estruturar recuperacao/downsell sem envio externo.',
      'publico', 'Leads ou compradores que nao avancaram para a oferta principal.',
      'oferta', 'Oferta alternativa de menor friccao para recuperacao comercial.',
      'objecao', 'Preco, timing de decisao e duvidas sobre adequacao do produto.',
      'mensagem', 'Reforcar clareza, proximo passo e seguranca da decisao.',
      'canais', jsonb_build_array('Instagram', 'WhatsApp', 'E-mail'),
      'fases', jsonb_build_array('Diagnostico', 'Briefing', 'Revisao', 'Aprovacao'),
      'riscos', jsonb_build_array('Link incorreto', 'Preco antigo', 'Mensagem desalinhada'),
      'metas', jsonb_build_object('vendas', 20, 'receita', 20000)
    )
  )
  on conflict do nothing;

  select id into v_campaign_id
  from public.campaigns
  where tenant_id = target_tenant
    and name = 'Acao de Downsell - Piloto Norwyn'
  limit 1;

  if v_campaign_id is null then
    return;
  end if;

  insert into public.campaign_materials (tenant_id, campaign_id, material_type, title, status, channel, metadata)
  values
    (target_tenant, v_campaign_id, 'briefing', 'Briefing - Downsell Piloto', 'draft', 'Norwyn', '{"seed_key":"downsell_piloto_briefing"}'::jsonb),
    (target_tenant, v_campaign_id, 'WhatsApp', 'Mensagem WhatsApp - Downsell Piloto', 'draft', 'WhatsApp', '{"seed_key":"downsell_piloto_whatsapp"}'::jsonb),
    (target_tenant, v_campaign_id, 'e-mail', 'E-mail - Downsell Piloto', 'draft', 'E-mail', '{"seed_key":"downsell_piloto_email"}'::jsonb)
  on conflict do nothing;

  select id into briefing_id from public.campaign_materials where campaign_id = v_campaign_id and metadata ->> 'seed_key' = 'downsell_piloto_briefing' limit 1;
  select id into whatsapp_id from public.campaign_materials where campaign_id = v_campaign_id and metadata ->> 'seed_key' = 'downsell_piloto_whatsapp' limit 1;
  select id into email_id from public.campaign_materials where campaign_id = v_campaign_id and metadata ->> 'seed_key' = 'downsell_piloto_email' limit 1;

  if briefing_id is not null then
    insert into public.campaign_material_versions (tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata)
    values
      (target_tenant, v_campaign_id, briefing_id, 1, 'Briefing - Downsell Piloto v1', 'Contexto: acao de downsell para validacao interna. Objetivo: recuperar interessados com oferta de menor friccao. Validar link, preco e promessa antes de qualquer uso.', 'Versao inicial piloto.', 'seed', '{"seed_key":"downsell_piloto_briefing_v1"}'::jsonb),
      (target_tenant, v_campaign_id, briefing_id, 2, 'Briefing - Downsell Piloto v2', 'Contexto: acao de downsell para validacao interna. Publico: leads ou compradores que nao avancaram. Mensagem: decisao segura, clareza de acesso e proximo passo. QA obrigatorio: link, preco, prazo e publico.', 'Segunda versao com checklist de QA.', 'seed', '{"seed_key":"downsell_piloto_briefing_v2"}'::jsonb)
    on conflict (material_id, version_number) do nothing;
  end if;

  if whatsapp_id is not null then
    insert into public.campaign_material_versions (tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata)
    values (target_tenant, v_campaign_id, whatsapp_id, 1, 'WhatsApp - Downsell Piloto v1', 'Ola! Passando para organizar o proximo passo com clareza. Antes de enviar qualquer oferta, vamos confirmar se o link, preco e prazo estao corretos.', 'Material piloto sem envio externo.', 'seed', '{"seed_key":"downsell_piloto_whatsapp_v1"}'::jsonb)
    on conflict (material_id, version_number) do nothing;
  end if;

  if email_id is not null then
    insert into public.campaign_material_versions (tenant_id, campaign_id, material_id, version_number, title, content, change_note, source, metadata)
    values (target_tenant, v_campaign_id, email_id, 1, 'E-mail - Downsell Piloto v1', 'Assunto: proximo passo com seguranca. Corpo: reforcar contexto, oferta alternativa, prazo e revisao de dados comerciais antes de envio.', 'Material piloto sem envio externo.', 'seed', '{"seed_key":"downsell_piloto_email_v1"}'::jsonb)
    on conflict (material_id, version_number) do nothing;
  end if;

  select id into briefing_v2
  from public.campaign_material_versions
  where material_id = briefing_id
    and version_number = 2
  limit 1;

  if briefing_v2 is not null and not exists (
    select 1 from public.campaign_approvals where version_id = briefing_v2
  ) then
    insert into public.campaign_approvals (
      tenant_id,
      campaign_id,
      material_id,
      version_id,
      approver_name,
      status,
      decided_at,
      observation
    )
    values (
      target_tenant,
      v_campaign_id,
      briefing_id,
      briefing_v2,
      'Juliana Coutinho',
      'approved',
      now(),
      'Aprovacao piloto registrada para validacao da estrutura Campaign Foundation Lite.'
    );
  end if;
end $$;
