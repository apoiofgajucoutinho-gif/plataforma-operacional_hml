-- HML V1: align the Activities expansion RPC with the deployed schema and seed
-- the approved Landing Page playbook/health records. No new tables or columns.

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
  template_duration integer := 1;
  project_duration integer := 1;
begin
  select * into project_row from public.atividades_projetos where id = p_projeto_id;
  if not found or project_row.template_id is null then return 0; end if;

  if auth.uid() is not null and not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = project_row.tenant_id and tm.user_id = auth.uid() and tm.ativo = true
  ) then
    raise exception 'Projeto fora do tenant autorizado';
  end if;

  select greatest(1, duracao_dias) into template_duration
  from public.atividades_templates where id = project_row.template_id;
  project_duration := greatest(1, coalesce(project_row.data_fim, project_row.data_inicio + template_duration) - project_row.data_inicio);

  for template_task in
    select * from public.atividades_template_tarefas
    where tenant_id = project_row.tenant_id and template_id = project_row.template_id and ativo = true
    order by ordem
  loop
    created_task_id := null;
    insert into public.atividades_tarefas (
      tenant_id, projeto_id, template_tarefa_id, titulo, descricao, time_responsavel,
      prioridade, data_inicio, prazo, validacao_obrigatoria, ordem, created_by
    )
    select project_row.tenant_id, project_row.id, template_task.id, template_task.titulo,
      template_task.descricao, template_task.time_responsavel, template_task.prioridade,
      project_row.data_inicio + round(template_task.offset_inicio_dias::numeric * project_duration / template_duration)::integer,
      project_row.data_inicio + round(template_task.offset_prazo_dias::numeric * project_duration / template_duration)::integer,
      template_task.validacao_obrigatoria, template_task.ordem, project_row.created_by
    where not exists (
      select 1 from public.atividades_tarefas existing
      where existing.projeto_id = project_row.id and existing.template_tarefa_id = template_task.id
    )
    returning id into created_task_id;

    if created_task_id is not null then
      inserted_count := inserted_count + 1;
      if template_task.depende_ordem is not null then
        select id into dependency_task_id from public.atividades_tarefas
        where projeto_id = project_row.id and ordem = template_task.depende_ordem limit 1;
        if dependency_task_id is not null then
          insert into public.atividades_dependencias (tenant_id, tarefa_id, depende_de_tarefa_id)
          values (project_row.tenant_id, created_task_id, dependency_task_id) on conflict do nothing;
        end if;
      end if;
    end if;
  end loop;
  return inserted_count;
end;
$$;

do $$
declare
  tenant uuid := 'ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0';
  knowledge_product uuid := '1a7ba875-9c1d-4007-9871-ae2636a722a7';
  catalog_product uuid := 'dfc00511-b160-42b0-878f-6e5b933b636b';
  campaign uuid := '6a0fbc55-c9f4-4113-9bf3-d075dc2a09ef';
  definition uuid;
  version_id uuid;
  registry uuid;
  parent_asset uuid;
  checkout_asset uuid;
  template uuid;
begin
  if not exists (select 1 from public.tenants where id = tenant) then return; end if;

  insert into public.landing_page_definitions (
    tenant_id, landing_key, name, product_id, campaign_id, status, current_environment,
    preview_path, production_locked, metadata
  ) values (
    tenant, 'imersao_zumbido', 'Imersão Zumbido', knowledge_product, campaign, 'HML', 'HML',
    'https://imersaozumbido.fgajulianacoutinho.com.br', true,
    jsonb_build_object('campaign','Imersão Zumbido','catalog_product_id',catalog_product,'canonical_domain','https://imersaozumbido.fgajulianacoutinho.com.br','checkout_url','https://pay.hotmart.com/B47092539B?off=lov69pen','source','landing_health_v1')
  )
  on conflict (tenant_id, landing_key) do update set
    name = excluded.name, product_id = excluded.product_id, campaign_id = excluded.campaign_id,
    current_environment = excluded.current_environment, preview_path = excluded.preview_path,
    metadata = public.landing_page_definitions.metadata || excluded.metadata, updated_at = now()
  returning id into definition;

  insert into public.landing_page_versions (
    tenant_id, landing_id, version, status, change_summary, config_snapshot,
    content_snapshot, theme_snapshot, preview_path, qa_summary, immutable
  ) values (
    tenant, definition, 'hml-2026-09-28', 'HML', 'Versão canônica observada no domínio oficial da Imersão Zumbido.',
    jsonb_build_object('landing_key','imersao_zumbido','domain','https://imersaozumbido.fgajulianacoutinho.com.br','checkout','https://pay.hotmart.com/B47092539B?off=lov69pen','campaign_links',jsonb_build_array('/stories','/bio','/whatsapp','/site','/ads')),
    '{}'::jsonb, '{}'::jsonb, 'https://imersaozumbido.fgajulianacoutinho.com.br', '{}'::jsonb, false
  )
  on conflict (tenant_id, landing_id, version) do update set config_snapshot = excluded.config_snapshot, change_summary = excluded.change_summary, updated_at = now()
  returning id into version_id;

  update public.landing_page_definitions set active_version_id = version_id, updated_at = now() where id = definition;

  insert into public.norwyn_landing_registry (
    tenant_id, campaign_key, landing_key, landing_name, landing_version, url, product_id,
    hotmart_product_id, environment, status, operation_mode, external_owner,
    monitor_frequency_minutes, metadata
  ) values (
    tenant, 'imersao_zumbido', 'imersao_zumbido', 'Imersão Zumbido', 'hml-2026-09-28',
    'https://imersaozumbido.fgajulianacoutinho.com.br', knowledge_product, 'B47092539B',
    'hml', 'active', 'NORWYN_OWNED', 'Norwyn', 1440,
    jsonb_build_object('definition_id',definition,'catalog_product_id',catalog_product,'checkout_offer_id','lov69pen','health_v1',true)
  )
  on conflict (tenant_id, campaign_key, landing_key) do update set
    landing_name = excluded.landing_name, landing_version = excluded.landing_version,
    url = excluded.url, product_id = excluded.product_id, hotmart_product_id = excluded.hotmart_product_id,
    environment = excluded.environment, status = excluded.status,
    metadata = public.norwyn_landing_registry.metadata || excluded.metadata, updated_at = now()
  returning id into registry;

  insert into public.digital_assets (
    tenant_id, name, url, asset_type, environment, owner, is_critical, monitoring_enabled,
    monitor_content, monitor_links, monitor_performance, expected_content, allowed_domains, metadata
  ) values (
    tenant, 'Imersão Zumbido', 'https://imersaozumbido.fgajulianacoutinho.com.br', 'landing_page',
    'hml', 'Norwyn', true, true, true, true, true, array['Imersão Zumbido'],
    array['imersaozumbido.fgajulianacoutinho.com.br','pay.hotmart.com'],
    jsonb_build_object('source','landing_health_v1','landing_key','imersao_zumbido','definition_id',definition,'registry_id',registry,'component','page')
  )
  on conflict (tenant_id, url) do update set
    name = excluded.name, asset_type = excluded.asset_type, environment = excluded.environment,
    monitoring_enabled = true, monitor_content = true, monitor_links = true,
    expected_content = excluded.expected_content, allowed_domains = excluded.allowed_domains,
    metadata = public.digital_assets.metadata || excluded.metadata, updated_at = now()
  returning id into parent_asset;

  select id into checkout_asset from public.digital_assets where tenant_id = tenant and url = 'https://pay.hotmart.com/B47092539B?off=lov69pen';
  if checkout_asset is null then
    insert into public.digital_assets (tenant_id,name,url,asset_type,environment,owner,is_critical,monitoring_enabled,monitor_content,monitor_links,monitor_performance,parent_asset_id,metadata)
    values (tenant,'Checkout Imersão Zumbido','https://pay.hotmart.com/B47092539B?off=lov69pen','checkout','external','Norwyn',true,true,false,false,true,parent_asset,jsonb_build_object('source','landing_health_v1','landing_key','imersao_zumbido','component','checkout'))
    returning id into checkout_asset;
  else
    update public.digital_assets set parent_asset_id = parent_asset, metadata = metadata || jsonb_build_object('landing_key','imersao_zumbido','component','checkout'), updated_at = now() where id = checkout_asset;
  end if;

  insert into public.digital_assets (tenant_id,name,url,asset_type,environment,owner,is_critical,monitoring_enabled,monitor_content,monitor_links,monitor_performance,parent_asset_id,allowed_domains,metadata)
  select tenant, 'Imersão Zumbido · ' || route.label,
    'https://imersaozumbido.fgajulianacoutinho.com.br/' || route.path, 'internal_page', 'hml', 'Norwyn', true,
    false, false, false, true, parent_asset, array['imersaozumbido.fgajulianacoutinho.com.br','pay.hotmart.com'],
    jsonb_build_object('source','landing_health_v1','landing_key','imersao_zumbido','component','campaign_link','route_key',route.path,'display_name',route.label,'expected_source',route.source,'expected_medium',route.medium,'expected_content',route.content,'expected_checkout','https://pay.hotmart.com/B47092539B?off=lov69pen','check_source_type','SIMULATED','traffic_type','test')
  from (values
    ('stories','Stories','instagram','organic','stories'),
    ('bio','Bio','instagram','organic','bio'),
    ('whatsapp','WhatsApp','whatsapp','group','grupo_whatsapp'),
    ('site','Site','site','owned','site_juliana'),
    ('ads','Ads','meta','paid','ads')
  ) as route(path,label,source,medium,content)
  on conflict (tenant_id, url) do update set
    parent_asset_id = excluded.parent_asset_id, monitoring_enabled = false,
    metadata = public.digital_assets.metadata || excluded.metadata, updated_at = now();

  insert into public.atividades_templates (tenant_id,nome,categoria,descricao,duracao_dias,ativo)
  values (tenant,'Publicar nova Landing Page','lancamento','Processo Norwyn de briefing, criação, integração, tracking, domínio, QA, publicação e pós-publicação.',40,true)
  on conflict (tenant_id,nome) do update set descricao=excluded.descricao,duracao_dias=excluded.duracao_dias,ativo=true,updated_at=now()
  returning id into template;

  insert into public.atividades_template_tarefas
    (tenant_id,template_id,titulo,descricao,time_responsavel,prioridade,offset_inicio_dias,offset_prazo_dias,validacao_obrigatoria,depende_ordem,ordem,ativo)
  select tenant, template,
    seed.fase || ' · ' || seed.titulo,
    'Fase: ' || seed.fase || E'\nO que fazer: ' || seed.o_que || E'\nComo fazer: executar no contexto informado do projeto, registrar decisões e anexar os links relacionados.\nPor que fazer: ' || seed.porque || E'\nCritério de aceite: ' || seed.aceite || E'\nEvidência: ' || seed.evidencia,
    seed.time_responsavel, seed.prioridade, seed.inicio, seed.prazo, seed.validacao,
    case when seed.ordem = 1 then null else seed.ordem - 1 end, seed.ordem, true
  from (values
    (1,'1. Briefing e estratégia','Montar briefing da LP','Consolidar produto, objetivo, oferta, público e contexto com os responsáveis.','Alinhar premissas antes da criação.','Briefing registrado e validado.','Documento ou registro do briefing.','especialista','alta',0,1,true),
    (2,'1. Briefing e estratégia','Definir oferta, público e CTA','Registrar oferta, público, CTA principal e campanha associada.','Evitar ambiguidade comercial.','Oferta e CTA confirmados.','Decisão comercial registrada.','especialista','alta',0,2,true),
    (3,'1. Briefing e estratégia','Definir referências e conteúdo obrigatório','Listar referências visuais e seções obrigatórias.','Dar direção objetiva à criação.','Referências e conteúdo aprovados.','Links e lista de conteúdo.','marketing','media',1,2,true),
    (4,'2. Criação visual','Criar primeira versão via prompt','Preparar prompt com o briefing e gerar no v0.app ou ferramenta equivalente.','Acelerar a primeira composição visual.','Primeira versão gerada e acessível.','Link do projeto/preview.','marketing','alta',2,4,true),
    (5,'2. Criação visual','Revisar estrutura e identidade visual','Revisar hierarquia, identidade e composição da primeira versão.','Manter consistência com a referência aprovada.','Estrutura pronta para validação.','Versão revisada.','marketing','alta',3,5,true),
    (6,'3. Validação visual/funcional','Validar desktop','Executar smoke visual em viewport desktop.','Garantir leitura e composição no notebook.','Sem sobreposição, corte ou overflow.','Screenshot desktop.','especialista','alta',4,6,true),
    (7,'3. Validação visual/funcional','Validar mobile','Executar smoke visual em viewport mobile realista.','Garantir a experiência principal de divulgação.','Conteúdo e CTAs utilizáveis no mobile.','Screenshot mobile.','especialista','alta',4,6,true),
    (8,'3. Validação visual/funcional','Validar Hero, oferta e módulos','Revisar Hero, CTA, módulos, oferta, FAQ, imagens e depoimentos.','Garantir clareza comercial e confiança.','Itens aprovados ou pendências registradas.','Checklist e observações.','especialista','alta',5,7,true),
    (9,'3. Validação visual/funcional','Ajustar layout e aprovar conteúdo','Resolver pendências e registrar aprovação da especialista.','Fechar a referência antes da integração.','Visual e conteúdo aprovados.','Aprovação registrada.','marketing','alta',6,8,true),
    (10,'4. Integração técnica','Integrar versão ao projeto','Levar a versão aprovada ao projeto técnico sem alterar o conteúdo validado.','Tornar a publicação reproduzível.','Versão integrada e executando localmente.','Branch ou arquivos integrados.','gestao_dados','alta',8,10,true),
    (11,'4. Integração técnica','Versionar no Git','Criar commit focado e rastreável.','Preservar histórico e rollback.','Commit identificado.','Hash do commit.','gestao_dados','alta',9,10,true),
    (12,'4. Integração técnica','Publicar Preview/HML','Publicar o commit e comparar com a versão aprovada.','Validar em ambiente real antes da distribuição.','Deployment READY e equivalente à referência.','Deployment, URL e screenshots.','gestao_dados','alta',10,12,true),
    (13,'5. Tracking','Definir identidade do tracking','Registrar landing_key, produto e campanha canônicos.','Vincular eventos à LP correta.','Identidade presente em todos os eventos.','Configuração e evento de teste.','gestao_dados','alta',11,13,true),
    (14,'5. Tracking','Configurar visitor, session e page view','Implementar identificadores e eventos de entrada sem duplicação.','Medir usuários e sessões corretamente.','Uma sessão canônica e page view válido.','Eventos registrados.','gestao_dados','alta',12,14,true),
    (15,'5. Tracking','Configurar eventos de comportamento e CTA','Configurar scroll, section views, CTA view/click, offer view e checkout click.','Medir o funil real da página.','Eventos disparados nos pontos corretos.','Smoke de eventos.','gestao_dados','alta',13,15,true),
    (16,'5. Tracking','Validar first/current touch e tráfego de teste','Configurar UTMs e marcar QA como SIMULATED/test.','Preservar atribuição sem contaminar métricas públicas.','Touches corretos e teste excluído.','Sessão de QA e dashboard.','gestao_dados','alta',14,16,true),
    (17,'6. Checkout','Selecionar produto e oferta','Registrar Product ID e Offer ID canônicos.','Evitar checkout incorreto.','Produto e oferta confirmados.','IDs registrados.','especialista','urgente',15,16,true),
    (18,'6. Checkout','Validar checkout e atribuição','Testar URL, acesso e preservação de atribuição sem concluir compra; confirmar preço.','Garantir continuidade até a oferta correta.','Checkout acessível e preço confirmado.','URL e smoke read-only.','gestao_dados','urgente',16,18,true),
    (19,'7. Domínio','Definir subdomínio oficial','Escolher endereço e confirmar que o domínio antigo será preservado.','Evitar substituição acidental.','Subdomínio aprovado.','Decisão registrada.','especialista','alta',17,18,true),
    (20,'7. Domínio','Vincular domínio e obter CNAME','Adicionar o domínio ao projeto Vercel e registrar o DNS solicitado.','Preparar ativação controlada.','Domínio associado e CNAME conhecido.','Configuração Vercel.','gestao_dados','urgente',18,20,true),
    (21,'7. Domínio','Configurar DNS na HostGator','Criar o CNAME aprovado no provedor DNS.','Apontar o domínio oficial ao deployment.','Registro criado sem alterar domínio legado.','Print/configuração DNS.','gestao_dados','urgente',19,21,true),
    (22,'7. Domínio','Validar propagação, HTTPS e certificado','Checar resolução, HTTP 200, TLS e página servida.','Confirmar disponibilidade segura.','Domínio responde com HTTPS válido e LP correta.','URL e resultado técnico.','gestao_dados','urgente',20,22,true),
    (23,'8. Links de entrada','Definir origens e UTMs oficiais','Definir Stories, Bio, WhatsApp, Site e Ads com convenção canônica.','Permitir atribuição estável.','Cinco origens documentadas.','Mapa de UTMs.','marketing','alta',21,23,true),
    (24,'8. Links de entrada','Criar links rastreados por canal','Gerar os cinco links completos para divulgação.','Separar cada origem de aquisição.','Links prontos e distintos.','Lista dos links.','marketing','alta',22,24,true),
    (25,'8. Links de entrada','Validar first e current touch','Abrir cada origem em sessão controlada e conferir atribuição.','Confirmar a leitura da Norwyn.','Origem observada igual à esperada.','Eventos SIMULATED/test.','gestao_dados','alta',23,25,true),
    (26,'9. Links curtos','Criar rotas curtas oficiais','Configurar /stories, /bio, /whatsapp, /site e /ads.','Facilitar uso sem perder UTMs.','Cinco rotas disponíveis.','URLs oficiais.','gestao_dados','alta',24,26,true),
    (27,'9. Links curtos','Validar redirects e mobile','Testar redirect, LP, atribuição, tracking duplicado, mobile e noindex/nofollow quando aplicável.','Evitar perda de origem e indexação indevida.','Todos os smokes passam com uma sessão canônica.','Checks SIMULATED/test.','gestao_dados','alta',25,27,true),
    (28,'10. Saúde e QA','Validar página e infraestrutura','Checar HTTP, HTTPS, domínio, certificado, imagens, SEO, desktop, mobile, overflow e 404.','Detectar falhas antes da distribuição.','Página íntegra e sem bloqueios.','QA run e screenshots.','gestao_dados','urgente',26,28,true),
    (29,'10. Saúde e QA','Validar checkout, tracking e links','Usar Health/Presence para verificar checkout, tracking, redirects e links oficiais.','Centralizar saúde técnica no motor existente.','Componentes essenciais saudáveis.','Checks do Presence.','gestao_dados','urgente',27,29,true),
    (30,'10. Saúde e QA','Registrar integridade da publicação','Comparar versão publicada e referência e documentar divergências.','Detectar drift após deploy.','Integridade confirmada ou alertas descritos.','QA e snapshot.','gestao_dados','alta',28,30,true),
    (31,'11. Métricas','Validar visitantes, sessões e origem','Reconciliar visitantes, sessões, origem e percentual das sessões.','Garantir leitura pública confiável.','Métricas compatíveis com eventos reais.','Comparação no dashboard.','gestao_dados','alta',28,30,true),
    (32,'11. Métricas','Validar checkout e touches','Conferir checkout, first touch e current touch por sessão.','Validar o funil e a atribuição.','Uma origem canônica por sessão.','Eventos e funil.','gestao_dados','alta',29,31,true),
    (33,'11. Métricas','Excluir teste e preservar origens zeradas','Confirmar que SIMULATED/test não entra nas métricas e que canais oficiais com zero permanecem visíveis.','Evitar falsa performance e desaparecimento de canais.','Tabela pública consistente.','Filtros e contagens.','gestao_dados','alta',30,32,true),
    (34,'12. Aprovação final','Aprovar conteúdo, visual e oferta','Confirmar conteúdo, visual, preço e depoimentos com responsáveis.','Fechar decisões comerciais.','Aprovação registrada sem pendência bloqueante.','Aceite dos responsáveis.','especialista','urgente',31,33,true),
    (35,'12. Aprovação final','Aprovar checkout, tracking e saúde','Confirmar checkout, tracking, domínio, links e Health.','Autorizar publicação com base técnica.','Todos os itens essenciais confirmados.','Checklist final.','especialista','urgente',32,34,true),
    (36,'13. Publicação/distribuição','Preparar links e instruções por canal','Organizar links oficiais e orientar qual usar em cada canal.','Evitar divulgação pelo link errado.','Pacote de distribuição entregue.','Mensagem e links oficiais.','marketing','alta',33,35,true),
    (37,'13. Publicação/distribuição','Iniciar distribuição com rollback preservado','Confirmar LP antiga intacta e autorizar a distribuição.','Publicar com retorno simples se necessário.','Distribuição iniciada e rollback disponível.','Autorização registrada.','especialista','urgente',34,36,true),
    (38,'14. Pós-publicação','Revisar primeiras horas','Acompanhar visitas, origens, checkout e Saúde nas primeiras horas.','Detectar problemas rapidamente.','Primeira revisão concluída.','Métricas e checks.','suporte','alta',35,37,true),
    (39,'14. Pós-publicação','Revisar após 24 horas','Repetir validações e comparar comportamento inicial.','Confirmar estabilidade após o lançamento.','Revisão de 24h concluída.','Resumo de 24h.','suporte','alta',36,39,true),
    (40,'14. Pós-publicação','Registrar problemas e aprendizados','Documentar ocorrências, decisões e melhorias para o próximo ciclo.','Transformar a execução em processo reutilizável.','Aprendizados registrados e projeto encerrável.','Observações finais.','gestao_dados','media',38,40,true)
  ) as seed(ordem,fase,titulo,o_que,porque,aceite,evidencia,time_responsavel,prioridade,inicio,prazo,validacao)
  where not exists (
    select 1 from public.atividades_template_tarefas existing
    where existing.tenant_id = tenant
      and existing.template_id = template
      and existing.titulo = seed.fase || ' · ' || seed.titulo
  );
end $$;
