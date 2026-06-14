alter table public.relatorio_agendamentos
drop constraint if exists relatorio_agendamentos_tipo_resumo_check;

alter table public.relatorio_agendamentos
add constraint relatorio_agendamentos_tipo_resumo_check
check (
  tipo_resumo in (
    'resumo_executivo',
    'resumo_suporte',
    'alerta_tecnico',
    'agenda',
    'ocorrencias',
    'financeiro',
    'lembrete_agendamento'
  )
);
