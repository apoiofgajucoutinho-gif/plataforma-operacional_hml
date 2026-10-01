# Traffic Intelligence V1

## Semântica operacional

- Purchase Meta é uma atribuição da Meta. Não substitui venda confirmada da Hotmart.
- `complete_registration` não é Purchase.
- Aliases equivalentes usam prioridade canônica; nunca são somados.
- Alcance exibido em períodos com grão diário é `alcance diário acumulado`. Pode repetir pessoas entre dias.
- Frequência é a média das frequências diárias ponderada por impressões. Não é a frequência única do período.
- `effective_status` descreve o estado Meta; gasto nos últimos três dias descreve atividade recente. São sinais separados.
- Entrega, clique, LPV, checkout e Purchase são sinais de fontes/janelas diferentes. A UI não força monotonicidade.

Períodos anteriores à V9 continuam disponíveis pelo contrato legado. Público, criativo, destino e configuração ausentes aparecem como `Não disponível para este período`; não há backfill inferido por nome.

## Recomendações V1

As regras são somente leitura: gasto sem checkout, clique sem LPV, divergência Meta/Norwyn/Hotmart, frequência crescente e destino sem landing reconhecida. Cada card mostra fato, evidência, relevância, recomendação, prazo de revisão e confiança. Nenhuma regra pausa campanha ou altera orçamento.

## Paginação

`/ads` consulta somente o período selecionado e pagina no servidor. Marketing, Resultados, Home, Objetivos, Relatórios, Traffic Foundation e Landing Readiness deixaram de depender dos limites locais de 500/1.000/1.400/5.000 para Ads. Agregações permanecem server-side; a tabela de detalhe continua paginada no cliente dentro do recorte já carregado.

## Google Sheets

Os dois nós `Append Google Sheets` da V3 estão desativados e documentados como opcionais. A fonte principal é Supabase. Não foi encontrado consumidor no repositório, importador reverso ou automação que leia essa planilha. O espelho aparenta ser legado/backup operacional e não precisa bloquear a V9. Antes de aposentá-lo, confirmar no n8n Cloud e com o time se existe consumidor externo não versionado.

## Schedule

- V3 exportada: intervalo de 20 horas no minuto 30; não equivale a 20:30 diário.
- V9 versionada: diariamente às 20:30, timezone `America/Sao_Paulo`.
- Nenhum workflow foi ativado ou desativado nesta entrega.

## Comparativo V3 x V9

Execute `node scripts/norwyn-ads-v3-v9-compare.cjs`. A rotina é somente leitura e compara gasto, impressões, cliques, link clicks, outbound clicks, LPV, checkout e Purchase Meta nas datas presentes nas duas origens. Se não houver interseção, informa que o comparativo válido deve usar dry-run V9 contra a última coleta V3, pois ambas compartilham `tenant_id,row_key`.

## Cutover controlado

1. Confirmar no n8n Cloud qual V3 está ativa, credenciais e schedule real.
2. Registrar execução, horário, contagem e data máxima da última coleta V3.
3. Confirmar que não há execução pendente ou retry.
4. Desativar V3.
5. Selecionar as credenciais nativas Meta e Supabase na V9.
6. Ativar V9 e executar uma coleta manual incremental.
7. Validar `instagram_ads_daily`, aliases canônicos e ausência de duplicidade.
8. Validar snapshots, criativos, público, destino e configuração.
9. Validar Ads, Marketing, Home, Resultados, Relatórios, Objetivos, Growth e Landing Readiness.
10. Acompanhar a primeira execução agendada das 20:30.
11. Registrar evidências e concluir o cutover.

Rollback: desativar V9, reativar V3, preservar as linhas V9 e nunca apagar o histórico. Não executar os dois coletores simultaneamente.
