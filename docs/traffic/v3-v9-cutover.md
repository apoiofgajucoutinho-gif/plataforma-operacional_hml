# Cutover V3 para V9

## Row key canônica

Novas escritas usam `md5(data|campaign_id|adset_id|ad_id)` quando os três IDs Meta estão disponíveis. A identidade permanece estável se campanha, conjunto ou anúncio forem renomeados.

Sem os três IDs, o fallback é `md5(data|campanha|conjunto|anuncio)`, exatamente o contrato legado da V3. A migration apenas substitui a função executada pelo trigger em escritas futuras e não reprocessa nem altera linhas históricas.

O upsert continua usando `on_conflict=tenant_id,row_key` com `Prefer: resolution=merge-duplicates`. O índice único `instagram_ads_daily_tenant_row_key_idx` já protege esse par.

Antes de gerar uma chave nova, a trigger procura uma linha do mesmo tenant, data e IDs Meta. Se ela já existir com a chave histórica, essa chave é reutilizada. Em seguida, tenta a chave V3 por data e nomes. Só uma entidade/data inédita recebe a chave canônica por IDs. Assim, o primeiro lookback da V9 atualiza smokes e linhas compatíveis já existentes sem backfill.

V3 e V9 não devem persistir simultaneamente. A camada de compatibilidade evita duplicar linhas já identificáveis por IDs ou pela chave legada, mas não torna segura a concorrência entre dois coletores com semânticas diferentes. O cutover elimina essa sobreposição operacional.

Validação HML em 01/10/2026: `1.571` linhas antes e depois da migration, `1.571` chaves distintas e zero grupos duplicados. Uma prova com tabela temporária confirmou reaproveitamento da chave histórica por IDs, hash canônico determinístico, chave imutável no update e fallback idêntico ao MD5 da V3. Nenhuma linha de negócio foi criada ou alterada pelo teste.

## Smoke de 29/09/2026

- Spend: 18,34 nos dois lados.
- Impressions: 707 nos dois lados.
- Clicks: 13 nos dois lados.
- Link clicks: V3 persistiu 0; a leitura canônica V9 encontrou 12 `link_click`. Diferença semântica explicada.
- Outbound, LPV, checkout e Meta Purchase: `não comparável por ausência na coleta V3`. Não bloqueiam o cutover e o comparador mantém `approved: true` quando não existe divergência inesperada nas métricas comparáveis.

## Checklist manual n8n 1.123.2

- [ ] Registrar ID e nome do workflow V3.
- [ ] Confirmar que a V3 está ativa.
- [ ] Registrar última execução, resultado e horário.
- [ ] Confirmar schedule real da V3.
- [ ] Registrar ID e nome do workflow V9.
- [ ] Confirmar que a V9 está inativa.
- [ ] Confirmar a Credential Meta selecionada nos três nós Graph.
- [ ] Confirmar a Credential Supabase selecionada nos quatro nós Supabase.
- [ ] Confirmar que os dois nós Google Sheets da V3 estão desabilitados.
- [ ] Confirmar que nenhum workflow externo depende da planilha.

## Plano final

1. Registrar a última execução da V3.
2. Desativar a V3.
3. Confirmar ausência de execução pendente ou retry.
4. Ativar a V9.
5. Executar uma coleta manual incremental.
6. Validar `instagram_ads_daily`, `row_key`, origem e ausência de duplicidade.
7. Validar `instagram_ads_config_snapshots`.
8. Validar o dashboard Ads e consumidores relacionados.
9. Acompanhar a primeira execução diária das 20:30 em `America/Sao_Paulo`.
10. Registrar evidências e concluir o cutover.

Rollback: desativar a V9, reativar a V3 e preservar todas as linhas V9 para diagnóstico. Não apagar dados V9.
