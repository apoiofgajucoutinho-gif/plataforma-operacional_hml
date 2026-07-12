create table if not exists public.marketing_qa_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  material_id uuid not null references public.campaign_materials(id) on delete cascade,
  material_version_id uuid not null references public.campaign_material_versions(id) on delete cascade,
  reviewer_type text not null default 'hybrid' check (reviewer_type in ('ai', 'human', 'hybrid')),
  provider text not null default 'deterministic',
  model text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'approved', 'approved_with_warnings', 'changes_required', 'blocked', 'failed')),
  overall_score integer check (overall_score is null or (overall_score >= 0 and overall_score <= 100)),
  summary text,
  blocking_reasons jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  suggested_content text,
  input_size integer not null default 0,
  duration_ms integer,
  success boolean not null default false,
  error_message text,
  usage_json jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.marketing_qa_review_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  review_id uuid not null references public.marketing_qa_reviews(id) on delete cascade,
  category text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  status text not null default 'passed' check (status in ('passed', 'failed', 'not_applicable')),
  title text not null,
  description text,
  evidence text,
  suggested_fix text,
  field_reference text,
  resolution_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketing_qa_reviews_tenant_created_idx
  on public.marketing_qa_reviews (tenant_id, created_at desc);

create index if not exists marketing_qa_reviews_version_idx
  on public.marketing_qa_reviews (tenant_id, material_version_id, created_at desc);

create index if not exists marketing_qa_reviews_status_idx
  on public.marketing_qa_reviews (tenant_id, status);

create index if not exists marketing_qa_review_items_review_idx
  on public.marketing_qa_review_items (tenant_id, review_id);

alter table public.marketing_qa_reviews enable row level security;
alter table public.marketing_qa_review_items enable row level security;

drop policy if exists "marketing qa reviews read by norwyn readers" on public.marketing_qa_reviews;
create policy "marketing qa reviews read by norwyn readers"
  on public.marketing_qa_reviews
  for select
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "marketing qa reviews write by norwyn writers" on public.marketing_qa_reviews;
create policy "marketing qa reviews write by norwyn writers"
  on public.marketing_qa_reviews
  for all
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', true))
  with check (app_private.can_access_module(tenant_id, 'norwyn', true));

drop policy if exists "marketing qa review items read by norwyn readers" on public.marketing_qa_review_items;
create policy "marketing qa review items read by norwyn readers"
  on public.marketing_qa_review_items
  for select
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', false));

drop policy if exists "marketing qa review items write by norwyn writers" on public.marketing_qa_review_items;
create policy "marketing qa review items write by norwyn writers"
  on public.marketing_qa_review_items
  for all
  to authenticated
  using (app_private.can_access_module(tenant_id, 'norwyn', true))
  with check (app_private.can_access_module(tenant_id, 'norwyn', true));

grant select, insert, update, delete on public.marketing_qa_reviews to authenticated;
grant select, insert, update, delete on public.marketing_qa_review_items to authenticated;

do $$
declare
  campaign_row record;
  v_material_id uuid;
  v_version_id uuid;
begin
  select id, tenant_id
    into campaign_row
  from public.campaigns
  where name = 'Acao de Downsell - Piloto Norwyn'
  order by created_at desc
  limit 1;

  if campaign_row.id is not null then
    select id
      into v_material_id
    from public.campaign_materials
    where tenant_id = campaign_row.tenant_id
      and campaign_id = campaign_row.id
      and title = 'Briefing F2 - Meteorico Combo Ajustes Finos + Perda em Rampa no grupo'
    limit 1;

    if v_material_id is null then
      insert into public.campaign_materials (
        tenant_id,
        campaign_id,
        material_type,
        title,
        status,
        channel,
        metadata
      )
      values (
        campaign_row.tenant_id,
        campaign_row.id,
        'briefing',
        'Briefing F2 - Meteorico Combo Ajustes Finos + Perda em Rampa no grupo',
        'draft',
        'WhatsApp / grupo',
        jsonb_build_object('source', 'docx_piloto', 'qa_pilot', true)
      )
      returning id into v_material_id;
    end if;

    select id
      into v_version_id
    from public.campaign_material_versions
    where tenant_id = campaign_row.tenant_id
      and material_id = v_material_id
      and source = 'docx_piloto_marketing_qa'
    limit 1;

    if v_version_id is null then
      insert into public.campaign_material_versions (
        tenant_id,
        campaign_id,
        material_id,
        version_number,
        title,
        content,
        change_note,
        source,
        metadata
      )
      values (
        campaign_row.tenant_id,
        campaign_row.id,
        v_material_id,
        coalesce((select max(version_number) + 1 from public.campaign_material_versions where tenant_id = campaign_row.tenant_id and material_id = v_material_id), 1),
        'Briefing F2 - documento piloto para Marketing QA',
        $qa$MOVIMENTO DAS FONOS PREMIUM BRIEFING DE LANÇAMENTO Downsell Meteórico Combo Ajustes Finos + Perda em Rampa Frente F2 — Planejamento de Julho / 2026 Expert: Juliana Coutinho Documento estratégico — versão final para aprovação NATUREZA Downsell interno em formato meteórico. Ação 100% interna: grupo da oferta + comercial 1x1. Sem tráfego pago, sem perfil da Juliana. STATUS Briefing fechado. Mapa de demandas a detalhar em seguida. 1. Contexto Encerramos o lançamento da Formação AASI Premium (evento temático de Copa, “O Time Titular da Fono Premium”). O resultado foram 24 vendas (18 à vista, 6 parceladas), a partir de 210 leads captados. Sobrou uma base de não compradores aquecida, que conhece a Juliana, viveu a narrativa do lançamento e não converteu. Esta ação monetiza essa cauda com uma oferta de ticket baixo, resolvendo a objeção que mais travou o lançamento anterior: valor e juros do parcelamento da Formação. O combo custa uma fração daquele muro, e é por isso que o parcelamento aparece logo na abertura. 2. Público Não compradores do lançamento, aproximadamente 186 pessoas , divididos em dois bolsos: No grupo (~136): os 160 membros atuais menos as 24 compradoras, que são removidas antes do aquecimento. Bolso mais quente, recebe grupo + 1x1. Fora do grupo (~50): leads captados que não entraram no grupo. Trabalhados apenas via 1x1. As 24 compradoras não são alvo: já possuem o combo como bônus fixo da Formação. São removidas do grupo na etapa de produção — sem elas, a copy pode ofertar direto, sem rodeio de segmentação. 3. Oferta Produto Combo Imersão em Ajustes Finos + Masterclass Perda em Rampa Preço R$ 497 à vista ou 12x de R$ 46,54 Garantia 7 dias incondicional Acesso Perpétuo (área de membros) Ancoragem em duas camadas Contra o preço avulso de hoje (R$ 397 + R$ 197 = R$ 594): economia de R$ 97. Contra o preço avulso pós-lançamento (R$ 497 + R$ 297 = R$ 794): economia de R$ 297. Esta é a alavanca principal. Parcelamento exibido na abertura. Exceção consciente à convenção de não expor parcelamento cedo. Como a objeção nº 1 foi valor e juros, o 12x de R$ 46,54 aparece já na abertura, porque é a alavanca que derruba a trava. Escondê-lo aqui seria trabalhar contra a própria oferta. 4. Mecânica de bônus (escada por velocidade) 1ª compradora Upgrade para a Formação AASI Premium completa + combo Primeiras 24h Concorrem ao sorteio de 1 vaga na Formação AASI Premium completa + combo 5 primeiras compradoras Aula ao vivo exclusiva de discussão de casos (hot-seat) com a Juliana A aula hot-seat: as alunas trazem casos reais de ajuste fino e perda em rampa, e a Juliana resolve ao vivo. Função secundária, legítima: superfície para ofertar outro produto, desde que a entrega de valor venha primeiro. Diretrizes de copy sobre os bônus Sempre chamados “bônus das primeiras compradoras” , nunca “bônus de ação rápida”. A duração de acesso dos prêmios de topo não é puxada de forma direta nem contrastada com o acesso de quem comprou a Formação. Apresentar simplesmente como “a Formação completa”. 5. Urgência e escassez Alavanca de urgência dupla, e as duas verdadeiras. O encerramento no grupo é domingo, 23h59. Depois disso: O combo sai de circulação como oferta empacotada. Ele não permanece numa prateleira pública: o comercial só o oferece se a pessoa puxar, e o tráfego e as páginas vendem cada produto separadamente. A única forma de ter os dois passa a ser comprar separado , pelos preços de não lançamento (Ajustes Finos R$ 497 + Perda em Rampa R$ 297 = R$ 794). A frase-âncora combina as duas: a condição encerra domingo; depois, o combo sai de circulação e a única forma de ter os dois é comprando separado, por R$ 794. Sem escassez fabricada, sem falsa urgência — coerente com as linhas vermelhas do dossiê. A condição do lançamento anterior não existe mais, então não há conflito de coerência. Escassez × cauda do 1x1 O encerramento público é real no grupo (domingo). O comercial continua no 1x1 até o domingo seguinte, trabalhando dois bolsos: os ~50 leads de fora do grupo e as levantadas de mão do grupo que não fecharam (recuperação). A moldura honesta é “encerrou no grupo, mas como já vínhamos conversando, mantenho a condição pra você”. O last call de domingo fala em “sai de circulação”, não em “some do mundo”, para não brigar com o que o comercial faz depois. 6. Canais e escopo Ação 100% interna : grupo da oferta + 1x1 do comercial. Não roda no perfil da Juliana. Sem tráfego pago, sem stories públicos, sem feed, sem carrossel. Arquitetura validada: vídeos de revelação Espelhando o que deu certo nos melhores lançamentos: a oferta é revelada em vídeo roteirizado antes da abertura. Dois vídeos, gravados pela Juliana na segunda-feira, edição leve: Vídeo de revelação da oferta — vai ao ar na quarta, um dia antes da abertura. Gera desejo e antecipação sem abrir o carrinho. Vídeo de oferta liberada — vai ao ar na quinta, destrava a compra. É o lugar natural para a Juliana anunciar a escada de bônus com a própria voz. 7. Janelas e calendário Produção Sáb 11 a Qua 15 (roteiros no fim de semana — travam a gravação de segunda) Gravação dos vídeos Segunda 13 (Juliana) Aquecimento no grupo Segunda 13 a Terça 14 (dor / desejo / antecipação, sem oferta) Revelação (vídeo 1) Quarta 15 Abertura (vídeo 2 + oferta) Quinta 16 Reforço e last call Sexta 17, Sábado 18, Domingo 19 Encerramento no grupo Domingo 19, 23h59 Cauda 1x1 do comercial Quinta 16 a Domingo 26 8. Metas À vista, sobre a base de ~186 não compradores. Curva carregada na frente (pico na quinta, puxado pelo sorteio das 24h e pelo bônus da 1ª compradora). Meta alcançável 15 vendas — R$ 7.455 Meta alta 18 vendas — R$ 8.946 Super meta 23 vendas — R$ 11.431 Régua mínima de recuperação (comercial) 5% 9. Eixo de comunicação e tom Gancho. Sempre a dor clínica do “depois da adaptação”, a insegurança técnica nº 1 da persona: a queixa que volta e a fono mexe no automático (Ajustes Finos) e o caso que faz travar ou encaminhar (Perda em Rampa). Por trás do gancho, a oferta resolve a objeção de valor e juros. Tom (fórmula de venda Juliana). Modo 3 acolhe a dor → Modo 2 nomeia o inimigo (ajuste no “achismo”, “só apertar botão”) → Modo 1 apresenta a solução → convite firme com palavra-código. Vocabulário e formatação seguem o dossiê. Regras de WhatsApp. Sem travessão; “aula”, nunca “live”; verbos conjugados por completo; preview com curiosidade nos primeiros termos; o comercial nunca é nomeado (“me chama no privado”). Prova social. Sem depoimento específico do combo. Usa transformação no nível do método (sair do automático, o paciente que para de voltar reclamando) com depoimentos reais do dossiê enquadrados honestamente como alunas do método, mais o lastro de mais de 1.000 fonos formadas. Fim do briefing — Parte 1. Próximo entregável: mapa de demandas detalhado.$qa$,
        'Importado do DOCX piloto para validar Marketing QA. Arquivo original preservado.',
        'docx_piloto_marketing_qa',
        jsonb_build_object('qa_pilot', true, 'original_filename', 'Briefing F2 - Meteorico Combo Ajustes Finos + Perda em Rampa no grupo.docx')
      )
      returning id into v_version_id;

      update public.campaign_materials
      set current_version_id = v_version_id,
          updated_at = now()
      where id = v_material_id
        and tenant_id = campaign_row.tenant_id;
    end if;
  end if;
end $$;
