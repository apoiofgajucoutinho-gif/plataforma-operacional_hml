insert into public.tenant_module_permissions (tenant_id, role, module, can_read, can_write)
select tenants.id, 'SUPORTE'::public.app_role, 'objetivos'::public.module_key, true, false
from public.tenants
on conflict (tenant_id, role, module)
do update set
  can_read = true,
  can_write = false,
  updated_at = now();

with months(mes) as (
  select generate_series(1, 12)
),
instagram_seed as (
  select *
  from (
    values
      ('Alcance mensal', 'Alcance organico mensal para acompanhar tracao e distribuicao.', 'automatica', 'instagram_alcance_total', 'numero', 'maior_melhor', 40000.00, 60000.00, 80000.00, 'Repetir temas vencedores e priorizar Reels com CTA claro.'),
      ('Posts por semana', 'Ritmo minimo de publicacoes por semana.', 'automatica', 'instagram_posts_semana', 'numero', 'maior_melhor', 4.00, 5.00, 6.00, 'Reorganizar calendario editorial e concentrar producao nos quadros fixos.'),
      ('Reels no mes', 'Volume mensal de Reels publicados.', 'automatica', 'instagram_reels', 'numero', 'maior_melhor', 8.00, 10.00, 12.00, 'Transformar conteudos de maior retencao em Reels curtos e praticos.'),
      ('Carrosseis no mes', 'Volume mensal de carrosseis publicados.', 'automatica', 'instagram_carrosseis', 'numero', 'maior_melhor', 6.00, 8.00, 10.00, 'Usar carrosseis para educacao, objecoes e salvamentos.'),
      ('Taxa de bom engajamento', 'Percentual de posts classificados como Bom.', 'automatica', 'instagram_bom_engajamento_pct', 'percentual', 'maior_melhor', 50.00, 60.00, 70.00, 'Revisar gancho, formato e utilidade pratica dos conteudos abaixo da media.'),
      ('Salvamentos', 'Total mensal de salvamentos.', 'automatica', 'instagram_salvos', 'numero', 'maior_melhor', 250.00, 400.00, 600.00, 'Criar conteudos de checklist, roteiro e referencia pratica.'),
      ('Compartilhamentos', 'Total mensal de compartilhamentos.', 'automatica', 'instagram_compartilhamentos', 'numero', 'maior_melhor', 180.00, 300.00, 450.00, 'Reforcar temas com identificacao e utilidade para indicacao entre profissionais.')
  ) as seed(titulo, descricao, tipo_origem, indicador_key, unidade, direcao, meta_alcancavel, meta_alta, meta_super, plano_acao_padrao)
),
ads_seed as (
  select *
  from (
    values
      ('Investimento previsto', 'Investimento mensal planejado em midia paga.', 'automatica', 'ads_investimento', 'moeda', 'maior_melhor', 3000.00, 5000.00, 8000.00, 'Se investimento ficar abaixo, revisar orcamento e priorizar campanha principal.'),
      ('CTR minimo', 'Qualidade minima de clique das campanhas.', 'automatica', 'ads_ctr_medio', 'percentual', 'maior_melhor', 1.20, 1.60, 2.00, 'Trocar criativos, promessa e primeira dobra quando CTR cair.'),
      ('CPC maximo', 'Custo maximo medio por clique.', 'automatica', 'ads_cpc_medio', 'moeda', 'menor_melhor', 4.00, 3.00, 2.00, 'Revisar segmentacao e pausar anuncios com CPC elevado.'),
      ('CPM maximo', 'Custo maximo medio por mil impressoes.', 'automatica', 'ads_cpm_medio', 'moeda', 'menor_melhor', 35.00, 28.00, 22.00, 'Avaliar publico, posicionamento e saturacao de criativo.'),
      ('Frequencia maxima', 'Frequencia media maxima aceitavel.', 'automatica', 'ads_frequencia_media', 'numero', 'menor_melhor', 3.50, 3.00, 2.50, 'Renovar criativos e ampliar publico quando a frequencia subir.'),
      ('Leads', 'Leads gerados por midia paga.', 'automatica', 'ads_leads', 'numero', 'maior_melhor', 120.00, 180.00, 250.00, 'Reforcar campanha de captura e revisar landing page.'),
      ('CPL maximo', 'Custo maximo medio por lead.', 'automatica', 'ads_cpl_medio', 'moeda', 'menor_melhor', 25.00, 18.00, 12.00, 'Pausar criativos caros e revisar oferta de captura.'),
      ('Conversoes', 'Conversoes mensais registradas nas campanhas.', 'automatica', 'ads_conversoes', 'numero', 'maior_melhor', 10.00, 20.00, 30.00, 'Ajustar oferta, pagina e campanha de remarketing.')
  ) as seed(titulo, descricao, tipo_origem, indicador_key, unidade, direcao, meta_alcancavel, meta_alta, meta_super, plano_acao_padrao)
),
faturamento_mes(mes, meta_alcancavel, meta_alta, meta_super) as (
  values
    (1, 7353.64, 8089.01, 10400.00),
    (2, 102613.64, 112875.01, 145105.00),
    (3, 102613.64, 112875.01, 145105.00),
    (4, 102613.64, 112875.01, 145105.00),
    (5, 15213.64, 16735.01, 21505.00),
    (6, 7353.64, 8089.01, 10400.00),
    (7, 92193.64, 101413.01, 130365.00),
    (8, 67613.64, 74375.01, 95605.00),
    (9, 19673.64, 21641.01, 27835.00),
    (10, 263273.64, 289601.01, 372785.00),
    (11, 13913.64, 15305.01, 19685.00),
    (12, 7353.64, 8089.01, 10400.00)
),
faturamento_periodos as (
  select 'quarter'::text as periodo_tipo, null::int as mes, q as quarter, null::int as semestre,
    sum(meta_alcancavel) as meta_alcancavel, sum(meta_alta) as meta_alta, sum(meta_super) as meta_super
  from (
    select *, ceil(mes / 3.0)::int as q
    from faturamento_mes
  ) grouped
  group by q
  union all
  select 'semestral', null, null, s,
    sum(meta_alcancavel), sum(meta_alta), sum(meta_super)
  from (
    select *, case when mes <= 6 then 1 else 2 end as s
    from faturamento_mes
  ) grouped
  group by s
  union all
  select 'anual', null, null, null,
    sum(meta_alcancavel), sum(meta_alta), sum(meta_super)
  from faturamento_mes
)
insert into public.objetivos_metas (
  tenant_id, modulo, titulo, descricao, tipo_origem, indicador_key, unidade, direcao, periodo_tipo, ano, mes, quarter, semestre,
  meta_alcancavel, meta_alta, meta_super, atual_manual, plano_acao_padrao
)
select tenants.id, 'instagram'::text, seed.titulo, seed.descricao, seed.tipo_origem, seed.indicador_key, seed.unidade, seed.direcao,
  'mensal'::text, 2026::int, months.mes::int, null::int, null::int, seed.meta_alcancavel, seed.meta_alta, seed.meta_super, null::numeric, seed.plano_acao_padrao
from public.tenants
cross join months
cross join instagram_seed seed
where not exists (
  select 1 from public.objetivos_metas om
  where om.tenant_id = tenants.id and om.modulo = 'instagram' and om.indicador_key = seed.indicador_key
    and om.periodo_tipo = 'mensal' and om.ano = 2026 and om.mes = months.mes
)
union all
select tenants.id, 'ads'::text, seed.titulo, seed.descricao, seed.tipo_origem, seed.indicador_key, seed.unidade, seed.direcao,
  'mensal'::text, 2026::int, months.mes::int, null::int, null::int, seed.meta_alcancavel, seed.meta_alta, seed.meta_super, null::numeric, seed.plano_acao_padrao
from public.tenants
cross join months
cross join ads_seed seed
where not exists (
  select 1 from public.objetivos_metas om
  where om.tenant_id = tenants.id and om.modulo = 'ads' and om.indicador_key = seed.indicador_key
    and om.periodo_tipo = 'mensal' and om.ano = 2026 and om.mes = months.mes
)
union all
select tenants.id, 'faturamento'::text, 'Faturamento bruto ' || fp.periodo_tipo, 'Meta de faturamento consolidada para acompanhamento ' || fp.periodo_tipo || '.',
  'automatica'::text, 'faturamento_bruto'::text, 'moeda'::text, 'maior_melhor'::text, fp.periodo_tipo, 2026::int, fp.mes, fp.quarter, fp.semestre,
  fp.meta_alcancavel, fp.meta_alta, fp.meta_super, null, 'Acompanhar gap do periodo e concentrar acoes comerciais nos produtos de maior alavanca.'
from public.tenants
cross join faturamento_periodos fp
where not exists (
  select 1 from public.objetivos_metas om
  where om.tenant_id = tenants.id and om.modulo = 'faturamento' and om.indicador_key = 'faturamento_bruto'
    and om.periodo_tipo = fp.periodo_tipo and om.ano = 2026
    and coalesce(om.quarter, 0) = coalesce(fp.quarter, 0)
    and coalesce(om.semestre, 0) = coalesce(fp.semestre, 0)
)
union all
select tenants.id, 'instagram'::text, 'Crescimento de seguidores', 'Meta estrategica para crescimento de seguidores qualificados.',
  'estrategica'::text, 'manual'::text, 'numero'::text, 'maior_melhor'::text, 'anual'::text, 2026::int, null::int, null::int, null::int,
  3000.00, 4500.00, 6000.00, 0.00, 'Acompanhar crescimento liquido e cruzar com temas/campanhas de maior alcance.'
from public.tenants
where not exists (
  select 1 from public.objetivos_metas om
  where om.tenant_id = tenants.id and om.modulo = 'instagram' and om.titulo = 'Crescimento de seguidores' and om.ano = 2026
)
union all
select tenants.id, 'ads'::text, 'ROAS minimo', 'Meta estrategica de retorno sobre investimento em midia paga.',
  'estrategica'::text, 'manual'::text, 'numero'::text, 'maior_melhor'::text, 'anual'::text, 2026::int, null::int, null::int, null::int,
  2.00, 3.00, 4.00, 0.00, 'Quando houver integracao de vendas por campanha, comparar ROAS por oferta e redistribuir verba.'
from public.tenants
where not exists (
  select 1 from public.objetivos_metas om
  where om.tenant_id = tenants.id and om.modulo = 'ads' and om.titulo = 'ROAS minimo' and om.ano = 2026
);
