create unique index if not exists relatorio_destinatarios_tenant_perfil_nome_idx
on public.relatorio_destinatarios (tenant_id, perfil_alvo, nome);

create unique index if not exists relatorio_agendamentos_tenant_dest_tipo_idx
on public.relatorio_agendamentos (tenant_id, destinatario_id, tipo_resumo);
