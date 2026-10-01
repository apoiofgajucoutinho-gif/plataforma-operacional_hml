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
- `row_key`: MD5 de `data|campaign_id|adset_id|ad_id`; fallback compatível com V3 por `data|nome da campanha|nome do conjunto|nome do anúncio`

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
| Creative/destino | ausente | enriquecimento por Ad/Creative/Video com cache | preencher quando a Meta fornecer |
| Público | ausente | targeting e custom audiences do Ad Set, com evidência | responder quem recebeu a entrega sem inferir pelo nome |
| Configuração | ausente | Campaign/Ad Set/Ad em snapshot por hash | relacionar mudança operacional com resultado posterior |
| LP | ausente | registry + URL/host/UTM, com confiança | não forçar vínculo |
| Deduplicação | `Map` por row key | preservada | compatibilidade operacional |
| Row key | nomes | nomes, preservada | mudar durante lookback criaria duplicatas |
| Chave candidata | ausente | IDs no raw metadata | preparar migração futura controlada |
| Batch | 50 configurável | 50 configurável | preservar estabilidade |
| Retry | upsert | Meta e upserts, 3 tentativas | resiliência |
| Segredos | valores embutidos/mascarados | Credentials nativas do n8n Cloud | segurança e portabilidade sem Variables pagas |

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

## Configuracao e credenciais

A V9 não depende de `$env` nem do recurso pago Variables. Meta e Supabase usam Credentials nativas selecionadas após a importação. Conta de anúncios, tenant, URL Supabase, janelas, limites, lotes e TTLs ficam no único node `Configuracao V9`, que não aceita secrets.

O procedimento completo está em `docs/traffic/n8n-cloud-v9-credentials.md`.

## Segurança do V3 fornecido

A auditoria por estrutura, sem imprimir valores, encontrou no export ativo:

- token Meta literal nos nós de Backfill e Incremental;
- `tenant_id` literal no normalizador;
- URL Supabase literal no upsert;
- `apikey` literal no upsert.

O token Meta e a chave Supabase presentes nesse artefato devem ser rotacionados manualmente depois de confirmar quais credenciais o V3 ativo usa. A URL e o tenant não são segredos, mas devem sair do workflow para evitar apontamento acidental. Nenhum valor foi copiado para a V9 e nenhuma rotação foi executada.

## Snapshot e cache

`instagram_ads_config_snapshots` usa `(tenant_id, entity_type, entity_id, config_hash)` como chave única. Payload inalterado não cria cópia diária; uma mudança em orçamento, targeting, status, estratégia, destino ou creative gera novo hash. O registro diário conserva o hash combinado para ligação futura.

TTL padrão:

| Entidade | TTL | Motivo |
| --- | ---: | --- |
| Campaign, Ad Set e Ad | 24h | configuração operacional pode mudar diariamente |
| Creative, Audience e Video | 168h | ativos relativamente estáveis e caros de enriquecer |

O cache é lido do Supabase e reforçado por `Map` durante a execução, evitando consultar o mesmo ID por linha diária.

## Por que cada grupo foi priorizado

| Dado | Pergunta operacional atendida |
| --- | --- |
| Targeting, inclusões, exclusões e Advantage | melhora decisão e reduz tempo de auditoria de público |
| Objetivo, otimização, billing, lance e orçamento | melhora decisão e ajuda a localizar custo causado por configuração |
| IDs, formato, texto, CTA, mídia e destino do creative | melhora decisão e liga criativo a LP/checkout/receita |
| Unique/outbound clicks, LPV e custos derivados | ajuda a reduzir custo distinguindo clique interno de tráfego entregue |
| Checkout, purchase/value/ROAS Meta | melhora decisão de mídia sem substituir receita confirmada |
| Rankings da Meta | sinal contextual para investigação; nunca decisão automática |
| Vídeo 3s, quartis e thruplay | ajuda a reduzir custo identificando perda de atenção |
| Snapshot/hash | libera tempo e reduz chamadas, mantendo histórico de mudanças |
| Raw payload, versão, origem e evidência | reduz tempo de diagnóstico e evita conclusões sem rastreabilidade |

Campos da API sem vínculo com custo, receita, decisão ou economia de tempo não foram adicionados.

## Breakdown

Não foi adicionado ao fluxo principal. A arquitetura indicada é `instagram_ads_breakdown_daily`, com dimensão e valor explícitos e coleta separada. Isso evita explodir o grão atual e impede soma acidental de linhas incompatíveis.

## Critério de substituição

Ainda não cumprido: falta o smoke ao vivo no n8n. Antes do corte, confirmar três anúncios, enriquecimento, ausência de duplicidade e upsert do período curto.

## Ativação controlada

1. Importar `Instagram Ads Daily Collector_V9_Traffic_Foundation.json`.
2. Confirmar que está inativo, preencher `Configuracao V9` e selecionar as Credentials nativas.
3. Aplicar primeiro a migration `20260929143000_meta_ads_v9_configuration_foundation.sql` no HML.
4. Executar somente `Executar Smoke Manual` com um dia; ele não persiste métricas nem snapshots por padrão.
5. Comparar um Ad Set de engajamento, um de remarketing/site/pixel e um frio/amplo, quando existirem.
6. Em cada caso comparar spend, delivery, clique, LPV, checkout, purchase Meta/value, creative, destino, targeting, classificação e configuração com V3 e payload Meta.
7. Depois da comparação e com autorização específica, alterar conscientemente `smoke_persist` no node central para validar os upserts de um período corrente.
8. Desativar V3 somente em janela autorizada.
9. Ativar V9 somente depois da validação.
10. Acompanhar o primeiro ciclo das 20:30.

Rollback: desativar V9 e reativar V3. Não executar ambos automaticamente.
