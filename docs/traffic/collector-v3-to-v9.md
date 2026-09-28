# Instagram Ads Collector: V3 para V9

## Baseline auditada

- Arquivo: `Instagram Ads Daily Collector_V3_Codex.json`
- SHA-256: `3812097495F5932F21BB56444B57D657C9E20D500F970252F4BC8A791254A63D`
- Estado no arquivo: ativo
- Graph API: `v23.0`
- Nível: `ad`, incremento diário
- Agendamento: 20:30
- Incremental: lookback configurável, padrão 7 dias
- Backfill: mensal desde 01/01/2026, mas os nós estavam desabilitados e o HTTP de backfill estava desconectado da paginação
- Paginação: até 100 páginas, espera de 300 ms
- Filtro: campanha/anúncio preenchidos e gasto maior que zero
- Lotes: padrão 50
- Deduplicação: `Map` por `row_key`
- Upsert: conflito em `tenant_id,row_key`, timeout 120 s, retry ativo
- `row_key`: `data|nome da campanha|nome do conjunto|nome do anúncio`

O arquivo V3 fornecido contém valores mascarados/embutidos para tenant, endpoint Supabase, API key e token Meta. Ele é apenas referência de auditoria e não foi copiado para o repositório.

## Matriz de evolução

| Aspecto | V3 atual | V9 importável | Motivo |
| --- | --- | --- | --- |
| Estado | ativo | inativo | impedir execução paralela antes do corte |
| Agenda | 20:30 | 20:30 | preservar operação |
| Lookback | 7 dias | 7 dias | preservar incremental |
| Smoke | não existe | manual, 1 dia; máximo 2; dry-run padrão | validação sem reescrever legado |
| Backfill | nós desabilitados/desconectados | caminho manual conectado | capacidade controlada; não executar no smoke |
| Graph API | v23.0 | v23.0 | evitar mudança sem necessidade |
| Campos Insights | básicos + actions | básicos, status, action values e vídeo | fundação de funil |
| Actions | soma aliases; `complete_registration` como compra | escolhe um alias por prioridade | eliminar dupla contagem |
| IDs | presentes no raw, não persistidos | campaign/adset/ad/creative explícitos | resolução confiável |
| Creative/destino | ausente | enriquecimento único por `ad_id` | preencher quando a Meta fornecer |
| LP | ausente | registry + URL/host/UTM, com confiança | não forçar vínculo |
| Deduplicação | `Map` por row key | preservada | compatibilidade operacional |
| Row key | nomes | nomes, preservada | mudar durante lookback criaria duplicatas |
| Chave candidata | ausente | IDs no raw metadata | preparar migração futura controlada |
| Batch | 50 configurável | 50 configurável | preservar estabilidade |
| Retry | upsert | Meta e upsert, 3 tentativas | resiliência |
| Segredos | valores embutidos/mascarados | somente env vars | segurança e portabilidade |

## Actions canônicas

O primeiro alias disponível na ordem indicada é usado. Aliases equivalentes nunca são somados.

| Métrica | Prioridade |
| --- | --- |
| Link click | `link_click` |
| LPV | `landing_page_view`, `omni_landing_page_view` |
| Lead | `offsite_conversion.fb_pixel_lead`, `lead`, `omni_lead`, `onsite_conversion.lead_grouped` |
| Checkout | `offsite_conversion.fb_pixel_initiate_checkout`, `initiate_checkout`, `omni_initiated_checkout`, `onsite_web_initiate_checkout` |
| Purchase | `offsite_conversion.fb_pixel_purchase`, `purchase`, `omni_purchase`, `onsite_web_purchase`, `onsite_conversion.purchase` |
| Purchase value | mesma prioridade em `action_values` |

`complete_registration` não é compra no V9.

Vídeo usa os arrays retornados pela Meta para 25/50/75/95/100 e thruplay. O evento `video_view` representa a fonte disponível para play/3s neste contrato. Quando um array/campo não vier, a métrica fica sem evidência no payload e o valor numérico permanece zero; essa ausência fica auditável no `raw_payload`.

## Replay comparativo do histórico

Comparação feita contra os actions brutos preservados no HML. Base monetária e de entrega não muda entre V3 e V9. O alcance abaixo é soma diária, não alcance único do intervalo.

| Identidade | Linhas | Spend | Impressions | Clicks | Link clicks | LPV V9 | Checkout V9 | Purchase V3 | Purchase V9 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| IMG_22.06.01 / `120228956743530421` | 25 | R$ 1.563,25 | 62.126 | 579 | 365 | 338 | 45 | 30 | 15 |
| JUL_VID_04 / `120229541847870421` | 14 | R$ 55,49 | 1.503 | 17 | 12 | 13 | 1 | 0 | 0 |
| VID_22.06_01 / `120228561336480421` | 17 | R$ 689,45 | 18.055 | 295 | 177 | 166 | 15 | 4 | 2 |

O V3 duplica purchases nos exemplos com conversão porque soma `purchase` e `offsite_conversion.fb_pixel_purchase`. LPV e checkout não eram persistidos pelo normalizador V3. IDs de campanha/ad set/ad conferem com o payload bruto. Creative, destino e UTMs não podem ser comparados no legado porque não foram coletados.

`VID_22.06_01` aparece com três `ad_id` distintos no histórico. O nome do anúncio não é identidade canônica; a consulta e o enriquecimento usam `ad_id`.

Este replay não é um smoke ao vivo da Graph API. Um smoke real requer importar o V9 inativo no n8n com credenciais válidas e executar o trigger manual. Nenhum token foi usado e nenhum dado Meta foi alterado nesta entrega.

## Variáveis e credenciais

- `META_AD_ACCOUNT_ID`
- `META_ADS_ACCESS_TOKEN`
- `META_ADS_LOOKBACK_DAYS` (opcional, padrão 7)
- `META_ADS_SMOKE_DAYS` (opcional, limitado a 1–2)
- `META_ADS_SMOKE_PERSIST` (opcional; padrão `false`)
- `META_ADS_MAX_PAGES` (opcional, padrão 100)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLATAFORMA_TENANT_ID`
- `SUPABASE_UPSERT_BATCH_SIZE` (opcional, padrão 50)

Nenhuma variável sensível está no JSON final.

## Critério de substituição

Ainda não cumprido: falta o smoke ao vivo no n8n. Antes do corte, confirmar três anúncios, enriquecimento, ausência de duplicidade e upsert do período curto.

## Ativação controlada

1. Importar `Instagram Ads Daily Collector_V9_Traffic_Foundation.json`.
2. Confirmar que está inativo e configurar credenciais/env vars.
3. Executar somente `Executar Smoke Manual` com um dia; ele não persiste por padrão.
4. Comparar ao menos IMG, VID e um terceiro anúncio com a resposta bruta.
5. Depois da comparação, se necessário, repetir conscientemente com `META_ADS_SMOKE_PERSIST=true` para validar o upsert de um período corrente.
6. Desativar V3.
7. Ativar V9.
8. Acompanhar o primeiro ciclo das 20:30.

Rollback: desativar V9 e reativar V3. Não executar ambos automaticamente.
