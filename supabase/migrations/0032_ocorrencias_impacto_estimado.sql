alter table public.ocorrencias_chamados
  add column if not exists impacto_financeiro_estimado numeric(14,2),
  add column if not exists impacto_estimativa_criterio text,
  add column if not exists impacto_estimativa_confianca text
    check (impacto_estimativa_confianca is null or impacto_estimativa_confianca in ('baixa', 'media', 'alta'));

comment on column public.ocorrencias_chamados.impacto_financeiro_estimado is
  'Projecao de impacto financeiro quando o valor real/apurado ainda nao esta disponivel.';

comment on column public.ocorrencias_chamados.impacto_estimativa_criterio is
  'Criterio usado para estimar o impacto financeiro.';

comment on column public.ocorrencias_chamados.impacto_estimativa_confianca is
  'Nivel de confianca da estimativa: baixa, media ou alta.';
