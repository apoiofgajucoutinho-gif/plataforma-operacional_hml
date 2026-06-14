drop index if exists public.relatorio_agendamentos_tenant_dest_tipo_idx;

create unique index if not exists relatorio_agendamentos_tenant_dest_nome_idx
on public.relatorio_agendamentos (tenant_id, destinatario_id, nome);
