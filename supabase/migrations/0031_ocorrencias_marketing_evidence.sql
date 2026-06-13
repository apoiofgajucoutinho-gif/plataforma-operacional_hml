alter table public.ocorrencias_chamados
  add column if not exists valor_informado_marketing numeric(14,2),
  add column if not exists valor_apurado_ads numeric(14,2),
  add column if not exists impressoes_impactadas integer,
  add column if not exists alcance_impactado integer,
  add column if not exists resultados_impactados integer;

comment on column public.ocorrencias_chamados.valor_informado_marketing is
  'Valor informado pelo time externo/marketing no relato da falha.';

comment on column public.ocorrencias_chamados.valor_apurado_ads is
  'Valor apurado em Ads/relatorio operacional para confrontar divergencias.';

comment on column public.ocorrencias_chamados.impressoes_impactadas is
  'Quantidade estimada de impressoes impactadas pela falha.';

comment on column public.ocorrencias_chamados.alcance_impactado is
  'Quantidade estimada de pessoas alcancadas pela falha.';

comment on column public.ocorrencias_chamados.resultados_impactados is
  'Quantidade de resultados/conversoes impactadas pela falha.';
