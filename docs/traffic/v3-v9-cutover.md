# Cutover V3 para V9

## Estado operacional em 01/10/2026

O estado abaixo foi confirmado manualmente no n8n self-hosted `1.123.2` e prevalece sobre o campo `active` dos JSONs versionados:

- V3 `Instagram Ads Daily Collector_V3`: desativada.
- V9 `Instagram Ads Daily Collector_V9`: ativa.
- Schedule V9: diário às 20:30, timezone `America/Sao_Paulo`.
- Configuração operacional de smoke: `smoke_days=3` e `smoke_persist=false`.
- Cutover operacional: realizado, sem necessidade de rollback.
- Primeira coleta V9 persistente após o cutover: pendente de execução e confirmação.

O export versionado permanece deliberadamente com `active=false`, `smoke_days=1` e `smoke_persist=false` como padrão seguro para importação. Esses valores não descrevem o estado vivo do n8n e não devem ser usados para inferi-lo.

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

## Checklist manual n8n 1.123.2 concluído

- [x] V3 identificada e desativada após a última execução conhecida de 30/09/2026 23:39.
- [x] V9 identificada, validada e ativada.
- [x] Schedule V9 confirmado às 20:30 em `America/Sao_Paulo`.
- [x] Credentials Meta e Supabase selecionadas no n8n, sem secrets no export.
- [x] Nós Google Sheets da V3 desabilitados.
- [x] Nenhuma dependência externa conhecida da planilha.
- [ ] Executar e validar a primeira coleta V9 persistente pós-cutover.

## Fechamento após a primeira persistência

1. Executar a primeira coleta V9 com persistência no n8n.
2. Em modo somente leitura, identificar as novas linhas e `row_key` inseridas ou atualizadas.
3. Confirmar zero duplicidades em `(tenant_id,row_key)`.
4. Validar snapshots e `last_seen_at`.
5. Validar `/ads`, aba Inteligência e consumidores downstream prioritários.
6. Registrar as evidências e marcar a persistência pós-cutover como concluída.

Rollback: desativar a V9, reativar a V3 e preservar todas as linhas V9 para diagnóstico. Não apagar dados V9.
