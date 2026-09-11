-- Financeiro V2 P0.10: canonical taxonomy cleanup and legacy deactivation.
-- HML-only application for this task. Preserves lancamento values and raw operational data.

with tenants_scope as (
  select distinct tenant_id from public.fin_lancamentos
  union
  select id as tenant_id from public.tenants
)
insert into public.fin_centros_resultado (tenant_id, nome, ativo)
select tenant_id, nome, true
from tenants_scope
cross join (values
  ('Infoprodutos'),
  ('Clínica'),
  ('Palestras'),
  ('Administrativo / Corporativo'),
  ('Não operacional')
) as canonical(nome)
where not exists (
  select 1
  from public.fin_centros_resultado existing
  where existing.tenant_id = tenants_scope.tenant_id
    and existing.nome = canonical.nome
);

with tenants_scope as (
  select distinct tenant_id from public.fin_lancamentos
  union
  select id as tenant_id from public.tenants
)
insert into public.fin_categorias (
  tenant_id,
  natureza_id,
  tipo,
  nome,
  dre_grupo,
  natureza_fluxo_padrao,
  comportamento_padrao,
  ativo
)
select tenant_id, null, tipo::public.fin_tipo_lancamento, nome, dre_grupo, natureza_fluxo, comportamento, true
from tenants_scope
cross join (values
  ('entrada', 'Receitas', 'receita_bruta', 'operacional', 'variavel'),
  ('saida', 'Pessoas', 'despesas_pessoal', 'operacional', 'fixo'),
  ('saida', 'Marketing & Aquisição', 'vendas_marketing', 'operacional', 'variavel'),
  ('saida', 'Conteúdo & Crescimento', 'despesas_operacionais', 'operacional', 'variavel'),
  ('saida', 'Tecnologia & Ferramentas', 'despesas_administrativas', 'operacional', 'fixo'),
  ('saida', 'Pedagógico / Entrega', 'custos_diretos', 'operacional', 'variavel'),
  ('saida', 'Operação Clínica', 'custos_diretos', 'operacional', 'variavel'),
  ('saida', 'Administrativo', 'despesas_administrativas', 'operacional', 'fixo'),
  ('saida', 'Tributos & Taxas', 'irpj_csll', 'operacional', 'variavel'),
  ('saida', 'Financeiro / Patrimonial', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
  ('saida', 'Distribuição aos Sócios', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
  ('saida', 'Outros', 'despesas_operacionais', 'operacional', 'variavel')
) as canonical(tipo, nome, dre_grupo, natureza_fluxo, comportamento)
where not exists (
  select 1
  from public.fin_categorias existing
  where existing.tenant_id = tenants_scope.tenant_id
    and existing.tipo = canonical.tipo::public.fin_tipo_lancamento
    and existing.nome = canonical.nome
);

with tenants_scope as (
  select distinct tenant_id from public.fin_lancamentos
  union
  select id as tenant_id from public.tenants
), canonical_subcategories as (
  select * from (values
    ('entrada', 'Receitas', 'Hotmart', 'receita_bruta', 'operacional', 'variavel'),
    ('entrada', 'Receitas', 'Greenn', 'receita_bruta', 'operacional', 'variavel'),
    ('entrada', 'Receitas', 'Clínica', 'receita_bruta', 'operacional', 'variavel'),
    ('entrada', 'Receitas', 'Palestras', 'receita_bruta', 'operacional', 'variavel'),
    ('entrada', 'Receitas', 'Venda manual', 'receita_bruta', 'operacional', 'variavel'),
    ('entrada', 'Receitas', 'Outras receitas', 'receita_bruta', 'operacional', 'variavel'),
    ('saida', 'Pessoas', 'Salários', 'despesas_pessoal', 'operacional', 'fixo'),
    ('saida', 'Pessoas', 'Pró-labore', 'despesas_pessoal', 'operacional', 'fixo'),
    ('saida', 'Pessoas', 'Encargos', 'despesas_pessoal', 'operacional', 'fixo'),
    ('saida', 'Pessoas', 'Comissões', 'despesas_pessoal', 'operacional', 'variavel'),
    ('saida', 'Pessoas', 'Prestadores recorrentes', 'despesas_pessoal', 'operacional', 'fixo'),
    ('saida', 'Marketing & Aquisição', 'Meta Ads', 'vendas_marketing', 'operacional', 'variavel'),
    ('saida', 'Marketing & Aquisição', 'Mídia paga', 'vendas_marketing', 'operacional', 'variavel'),
    ('saida', 'Marketing & Aquisição', 'Agência / tráfego', 'vendas_marketing', 'operacional', 'variavel'),
    ('saida', 'Marketing & Aquisição', 'Aquisição', 'vendas_marketing', 'operacional', 'variavel'),
    ('saida', 'Conteúdo & Crescimento', 'Produção de conteúdo', 'despesas_operacionais', 'operacional', 'variavel'),
    ('saida', 'Conteúdo & Crescimento', 'Edição', 'despesas_operacionais', 'operacional', 'variavel'),
    ('saida', 'Conteúdo & Crescimento', 'Sessão de fotos', 'despesas_operacionais', 'operacional', 'variavel'),
    ('saida', 'Conteúdo & Crescimento', 'Teleprompter', 'despesas_operacionais', 'operacional', 'variavel'),
    ('saida', 'Tecnologia & Ferramentas', 'Automação / CRM', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tecnologia & Ferramentas', 'Ferramentas/SaaS', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tecnologia & Ferramentas', 'Canva', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tecnologia & Ferramentas', 'ChatGPT', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tecnologia & Ferramentas', 'HostGator', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tecnologia & Ferramentas', 'Notion', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Pedagógico / Entrega', 'Professoras convidadas', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Pedagógico / Entrega', 'Certificado MEC', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Pedagógico / Entrega', 'Materiais', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Operação Clínica', 'Repasses', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Operação Clínica', 'Materiais clínicos', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Operação Clínica', 'Despesas da clínica', 'custos_diretos', 'operacional', 'variavel'),
    ('saida', 'Administrativo', 'Contabilidade', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Administrativo', 'Internet', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Administrativo', 'Telefone', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Administrativo', 'Conselho profissional', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Administrativo', 'Administrativo geral', 'despesas_administrativas', 'operacional', 'fixo'),
    ('saida', 'Tributos & Taxas', 'DAS/DASS', 'irpj_csll', 'operacional', 'variavel'),
    ('saida', 'Tributos & Taxas', 'DARF', 'irpj_csll', 'operacional', 'variavel'),
    ('saida', 'Tributos & Taxas', 'IOF', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Tributos & Taxas', 'Taxas bancárias', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Tributos & Taxas', 'Imposto', 'irpj_csll', 'operacional', 'variavel'),
    ('saida', 'Financeiro / Patrimonial', 'Aplicação financeira', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Financeiro / Patrimonial', 'Resgate', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Financeiro / Patrimonial', 'Movimentação financeira', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Distribuição aos Sócios', 'Distribuição de lucros', 'resultado_financeiro', 'nao_operacional', 'nao_aplicavel'),
    ('saida', 'Outros', 'A revisar', 'despesas_operacionais', 'operacional', 'variavel'),
    ('saida', 'Outros', 'Outros', 'despesas_operacionais', 'operacional', 'variavel')
  ) as v(tipo, categoria, subcategoria, dre_grupo, natureza_fluxo, comportamento)
)
insert into public.fin_subcategorias (
  tenant_id,
  categoria_id,
  nome,
  dre_grupo,
  natureza_fluxo_padrao,
  comportamento_padrao,
  ativo
)
select tenants_scope.tenant_id, c.id, cs.subcategoria, cs.dre_grupo, cs.natureza_fluxo, cs.comportamento, true
from tenants_scope
join canonical_subcategories cs on true
join public.fin_categorias c
  on c.tenant_id = tenants_scope.tenant_id
 and c.tipo = cs.tipo::public.fin_tipo_lancamento
 and c.nome = cs.categoria
where not exists (
  select 1
  from public.fin_subcategorias existing
  where existing.tenant_id = tenants_scope.tenant_id
    and existing.categoria_id = c.id
    and existing.nome = cs.subcategoria
);

insert into public.fin_lancamentos_snapshot (tenant_id, snapshot_key, lancamento_id, row_data, created_by)
select l.tenant_id, 'financeiro_p010_taxonomia_cleanup_before', l.id, to_jsonb(l), 'codex-p0.10'
from public.fin_lancamentos l
left join public.fin_centros_resultado old_center on old_center.id = l.centro_resultado_id
left join public.fin_categorias old_category on old_category.id = l.categoria_id
left join public.fin_subcategorias old_subcategory on old_subcategory.id = l.subcategoria_id
where old_center.nome in ('Infoproduto', 'Administrativo fixo', 'Clinica', 'Nao operacional')
   or old_category.nome in ('Entradas', 'Movimentações Financeiras', 'Despesas Pessoal', 'Despesas Administrativas', 'Despesas Clínica', 'Despesas Operacionais')
   or old_subcategory.nome in ('Venda por fora', 'Despesas administrativas', 'Despesas clínicas', 'Comissoes')
on conflict (tenant_id, snapshot_key, lancamento_id) do nothing;

update public.fin_lancamentos l
set centro_resultado_id = canonical.id
from public.fin_centros_resultado old_center
join public.fin_centros_resultado canonical
  on canonical.tenant_id = old_center.tenant_id
 and canonical.nome = case old_center.nome
   when 'Infoproduto' then 'Infoprodutos'
   when 'Administrativo fixo' then 'Administrativo / Corporativo'
   when 'Clinica' then 'Clínica'
   when 'Nao operacional' then 'Não operacional'
   else old_center.nome
 end
where l.centro_resultado_id = old_center.id
  and old_center.nome in ('Infoproduto', 'Administrativo fixo', 'Clinica', 'Nao operacional')
  and l.centro_resultado_id <> canonical.id;

with category_mapping as (
  select old_category.id as old_id, canonical.id as canonical_id
  from public.fin_categorias old_category
  join public.fin_categorias canonical
    on canonical.tenant_id = old_category.tenant_id
   and canonical.tipo = old_category.tipo
   and canonical.nome = case old_category.nome
      when 'Entradas' then 'Receitas'
      when 'Despesas Pessoal' then 'Pessoas'
      when 'Despesas Administrativas' then 'Administrativo'
      when 'Despesas Clínica' then 'Operação Clínica'
      when 'Movimentações Financeiras' then case when old_category.tipo::text = 'entrada' then 'Receitas' else 'Financeiro / Patrimonial' end
      else old_category.nome
    end
  where old_category.nome in ('Entradas', 'Despesas Pessoal', 'Despesas Administrativas', 'Despesas Clínica', 'Movimentações Financeiras')
)
update public.fin_lancamentos l
set categoria_id = category_mapping.canonical_id,
    subcategoria_id = null,
    classificacao_status = case when l.classificacao_status = 'trusted' then 'partial' else l.classificacao_status end
from category_mapping
where l.categoria_id = category_mapping.old_id
  and l.categoria_id <> category_mapping.canonical_id;

with subcategory_mapping as (
  select old_subcategory.id as old_id, canonical_category.id as canonical_category_id, canonical_subcategory.id as canonical_subcategory_id
  from public.fin_subcategorias old_subcategory
  join public.fin_categorias old_category on old_category.id = old_subcategory.categoria_id
  join public.fin_categorias canonical_category
    on canonical_category.tenant_id = old_subcategory.tenant_id
   and canonical_category.tipo = old_category.tipo
   and canonical_category.nome = case
      when old_category.tipo::text = 'entrada' and old_category.nome = 'Receitas' and old_subcategory.nome = 'Venda por fora' then 'Receitas'
      when old_category.nome = 'Administrativo' and old_subcategory.nome = 'Despesas administrativas' then 'Administrativo'
      when old_category.nome = 'Operação Clínica' and old_subcategory.nome = 'Despesas clínicas' then 'Operação Clínica'
      when old_category.nome = 'Pessoas' and old_subcategory.nome = 'Comissoes' then 'Pessoas'
      else old_category.nome
    end
  join public.fin_subcategorias canonical_subcategory
    on canonical_subcategory.tenant_id = old_subcategory.tenant_id
   and canonical_subcategory.categoria_id = canonical_category.id
   and canonical_subcategory.nome = case
      when old_category.tipo::text = 'entrada' and old_category.nome = 'Receitas' and old_subcategory.nome = 'Venda por fora' then 'Venda manual'
      when old_category.nome = 'Administrativo' and old_subcategory.nome = 'Despesas administrativas' then 'Administrativo geral'
      when old_category.nome = 'Operação Clínica' and old_subcategory.nome = 'Despesas clínicas' then 'Despesas da clínica'
      when old_category.nome = 'Pessoas' and old_subcategory.nome = 'Comissoes' then 'Comissões'
      else old_subcategory.nome
    end
  where old_subcategory.nome in ('Venda por fora', 'Despesas administrativas', 'Despesas clínicas', 'Comissoes')
)
update public.fin_lancamentos l
set categoria_id = subcategory_mapping.canonical_category_id,
    subcategoria_id = subcategory_mapping.canonical_subcategory_id
from subcategory_mapping
where l.subcategoria_id = subcategory_mapping.old_id
  and (l.categoria_id <> subcategory_mapping.canonical_category_id or l.subcategoria_id <> subcategory_mapping.canonical_subcategory_id);

update public.fin_centros_resultado
set ativo = false
where nome in ('Infoproduto', 'Administrativo fixo', 'Clinica', 'Nao operacional');

update public.fin_categorias
set ativo = false
where nome in (
  'Entradas',
  'Movimentações Financeiras',
  'Agência de Marketing',
  'Comissões de Afiliados',
  'Custos Diretos',
  'Deduções da Receita',
  'Depreciação',
  'Despesas Administrativas',
  'Despesas Clínica',
  'Despesas Operacionais',
  'Despesas Pessoal',
  'IRPJ/CSLL',
  'Outros Custos Diretos',
  'Taxas de Plataforma'
);

update public.fin_subcategorias s
set ativo = false
from public.fin_categorias c
where c.id = s.categoria_id
  and (
    c.ativo = false
    or s.nome in ('Venda por fora', 'Despesas administrativas', 'Despesas clínicas', 'Comissoes')
  );

update public.fin_categorias
set ativo = true
where nome in (
  'Receitas',
  'Pessoas',
  'Marketing & Aquisição',
  'Conteúdo & Crescimento',
  'Tecnologia & Ferramentas',
  'Pedagógico / Entrega',
  'Operação Clínica',
  'Administrativo',
  'Tributos & Taxas',
  'Financeiro / Patrimonial',
  'Distribuição aos Sócios',
  'Outros'
);

update public.fin_centros_resultado
set ativo = true
where nome in ('Infoprodutos', 'Clínica', 'Palestras', 'Administrativo / Corporativo', 'Não operacional');

analyze public.fin_lancamentos;
analyze public.fin_categorias;
analyze public.fin_subcategorias;
analyze public.fin_centros_resultado;
