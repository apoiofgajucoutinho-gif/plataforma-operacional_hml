# Traffic Data Foundation V1

## Escopo

Esta fundação relaciona, sem executar decisões automáticas:

`Produto -> Campanha -> Ad Set -> Ad -> Creative -> LP -> Checkout -> Venda`

A fonte Ads é `instagram_ads_daily`. A LP canônica vem de `norwyn_landing_registry`, campanha/produto de `campaigns` e vendas confirmadas de `comercial_vendas`. Nenhum número da Meta substitui a verdade financeira da Hotmart.

## Identidade e evidência

| Ligação | Evidência preferida | Confiança |
| --- | --- | --- |
| Campanha Meta -> campanha Norwyn | `meta_campaign_id` formalizado em `campaigns.plan_json` | high |
| Ad Set / Ad | IDs retornados pela Meta | high |
| Ad -> Creative | `ad.creative.id` consultado na Graph API | high |
| Creative -> LP | `landing_key` explícita, URL/host de destino ou URL tags | high |
| Nome da campanha -> LP | correspondência semântica inequívoca, sem URL | medium |
| LP -> Produto | `norwyn_landing_registry.product_id` | high |
| LP -> Checkout | checkout canônico no metadata/registro da LP | high quando presente |
| Ad -> Venda | `ad_id` exato em `source_sck`, dentro do período observado do anúncio | high |

Ausência de evidência produz `unresolved`; não gera valor aproximado. Ligações por nome nunca recebem confiança alta.

## Métricas Meta

| Métrica | Fórmula/fonte |
| --- | --- |
| Spend, impressions, reach | campos de Insights, nível `ad`, diário |
| Link clicks | action `link_click` |
| Link CTR | `link_clicks / impressions * 100` |
| Link CPC | `spend / link_clicks` |
| CPM | `spend / impressions * 1000` |
| Landing page views | primeiro alias disponível: `landing_page_view`, depois `omni_landing_page_view` |
| Initiate checkout | prioridade: pixel offsite, padrão, omni, onsite |
| Purchases Meta | prioridade: pixel offsite, padrão, omni, onsite |
| Purchase value | mesma prioridade em `action_values`; indisponível quando a API não retornar |
| Vídeo | arrays 3s, 25/50/75/95/100 e thruplay retornados pela API |

Aliases equivalentes **não são somados**. O `raw_payload._norwyn_foundation` registra versão do coletor, action type escolhida, fonte do creative e evidência da LP.

## Auditoria do legado HML

Período disponível: 10/01/2026 a 13/08/2026, 1.558 linhas.

- IDs: campanha/ad set/ad em 1.547 linhas.
- Creative ID/nome, preview, thumbnail, destino, URL tags e landing key: ausentes nas 1.558 linhas legadas.
- `action_values` e métricas de vídeo: ausentes no payload histórico consultado.
- Totais persistidos: 19.706 LPVs, 2.640 checkouts e 1.404 purchases.
- Totais canônicos no payload: 9.950 LPVs, 674 checkouts e 473 purchases.

A divergência é causada principalmente pela soma de aliases equivalentes. O V1 não reescreve o histórico. Consultas da fundação recalculam as actions canônicas a partir do payload e marcam `historical_columns_may_be_overcounted`.

Depois da normalização, 112 linhas ainda têm LPV maior que link click. Isso pode ocorrer por semântica/janela de atribuição e medição cross-device da Meta; não é corrigido automaticamente. Comparações devem manter mesma conta, nível, período e janela.

## Meta reported x Venda confirmada

- **Meta reported**: action atribuída pela Meta; serve para leitura de mídia.
- **Venda confirmada**: transação comercial canônica em `comercial_vendas`, com status confirmado/elegível.
- A reconciliação V1 exige `ad_id` exato em `source_sck` e limita a busca ao primeiro/último dia observado do anúncio.
- Zero reconciliado significa “sem evidência reconciliável”, não “zero vendas”.
- `meta_purchase_value` permanece não disponível quando `action_values` não vier da API.

## Referências históricas de Zumbido

Os materiais `VID_22.06_01`, `IMG_22.06_01`, `JUL_VID_04`, `AD15 | IMG` e `AD12 | IMG` são registrados em `campaign_materials` como `historical_reference`. Nenhum é declarado vencedor. As métricas permanecem em `instagram_ads_daily` e devem ser lidas em sequência de funil: atenção, clique, LPV, checkout, purchase Meta e venda Hotmart reconciliada.

Exemplo auditado, `IMG_22.06_01`:

- campanha Meta `120228561336470421`;
- ad set `120228561336460421`;
- ad `120228956743530421`;
- gasto R$ 1.563,25; 62.126 impressões; 365 link clicks;
- 338 LPVs; 45 checkouts; 15 purchases Meta;
- 10 vendas confirmadas reconciliadas por `ad_id` e período, R$ 1.683,36 brutos no dado atual;
- campanha/LP/produto/checkout: confiança alta após vínculo canônico; creative asset ainda sem ID no legado.

## Coletor V9

O workflow versionado `Instagram Ads Daily Collector_V9_Traffic_Foundation`:

1. coleta Insights no nível ad;
2. consulta o objeto Ad/Creative uma vez por `ad_id`;
3. preserva creative, thumbnail, destination e URL tags apenas quando retornados;
4. resolve LP por evidência explícita;
5. grava action canônica e sua fonte;
6. mantém o workflow inativo no repositório até publicação controlada no n8n.

`preview_url` continua nulo se a Meta não fornecer URL explícita. Nenhum valor é fabricado.

## Consulta

Endpoint autenticado, somente leitura:

`GET /api/ads/traffic-foundation?ad_id=<meta-ad-id>`

Também aceita `ad_name`. A resposta separa métricas, qualidade, resolução com confiança/evidência e reconciliação Hotmart.

## Traffic OS V1 proposto

1. Publicar e observar o coletor V9 por pelo menos um ciclo incremental.
2. Exibir a cadeia e os indicadores por anúncio, sempre com badges de confiança.
3. Separar cards “Meta reported” e “Venda confirmada”.
4. Mostrar o funil por creative sem rótulo automático de vencedor.
5. Criar fila de vínculos `unresolved` para confirmação humana.
6. Só depois discutir regras de decisão; pausa, escala e orçamento continuam fora de escopo.
