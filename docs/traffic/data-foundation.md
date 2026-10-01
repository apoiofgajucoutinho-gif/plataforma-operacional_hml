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

1. coleta Insights no nível `ad`, com grão diário preservado;
2. enriquece Campaign, Ad Set, Ad, Creative, custom audiences e vídeo por ID;
3. classifica público somente por evidência de `targeting`, custom audience e regra retornada pela Meta;
4. usa cache por entidade: 24h para Campaign/Ad Set/Ad e 168h para Creative/Audience/Video;
5. registra configuração em `instagram_ads_config_snapshots` somente quando o hash muda;
6. preserva raw Insights no registro diário e raw de configuração no snapshot;
7. resolve LP por URL/domínio/UTM explícitos e grava a evidência;
8. grava action canônica e sua fonte sem somar aliases equivalentes;
9. mantém o workflow inativo até smoke e cutover autorizados.

`preview_url`, campos de criativo, targeting e métricas opcionais ficam `null` quando a Meta não os fornece. Nenhum valor é fabricado. O collector não emite mais rótulos como “público ruim” ou “saturado”; `performance_status` passa a indicar apenas `SEM_CLASSIFICACAO_AUTOMATICA`.

### Público e configuração

As classificações possíveis são: Engajamento Instagram, Visitantes do site, Remarketing, Pixel/site, Lookalike, Público por interesse, Público amplo/Advantage, Lista/custom audience, Misto e Não identificado. Nome do Ad Set nunca é evidência. Cada classificação persiste confiança e lista de evidências.

Os snapshots guardam orçamento, estratégia de lance, objetivo, otimização, billing, agenda, atribuição, targeting, status, destino e creative. O hash FNV-1a é apenas detector determinístico de mudança, não mecanismo criptográfico.

### Métricas opcionais

Além das métricas anteriores, a V9 solicita unique clicks/CTR/cost, outbound/unique outbound clicks, purchase ROAS e rankings de qualidade. Custo por LPV e custo por checkout são calculados apenas quando a action canônica existe e o denominador é maior que zero. Ausência continua `null`, não zero falso.

### Breakdown

Age, gender, region, publisher platform, placement e device platform não entram no fluxo diário principal. A Meta pode multiplicar linhas ao combinar breakdowns; a evolução recomendada é uma coleta e tabela próprias, mantendo `instagram_ads_daily` em `ad x dia`.

### Idempotência

O trigger HML calcula `row_key` como MD5 de `data|campaign_id|adset_id|ad_id` quando os três IDs estão disponíveis. Sem IDs, usa o fallback legado MD5 de `data|campaign_name|adset_name|ad_name`. O índice único permanece em `(tenant_id,row_key)` e nenhuma linha histórica é reescrita.

- Chave persistida atual: `date|campaign_name|adset_name|ad_name`.
- Chave candidata futura: `date|campaign_id|adset_id|ad_id`.
- Risco da migração: trocar a regra de conflito sem reconciliar o histórico pode duplicar registros existentes, especialmente após renomeações. Esta etapa não muda a chave, o índice ou dados históricos.

### Validação de respostas Meta

Insights, configuração de anúncio e assets passam por validação explícita antes do próximo estágio. Respostas com `error`, `OAuthException`, token inválido/expirado, permissão negada ou estrutura mínima ausente encerram a execução com etapa, endpoint lógico, code e subcode. Tokens e credenciais são sanitizados da mensagem.

### Destino e Landing Page

`destination_domain` deriva somente de URL HTTP(S) absoluta válida. A resolução de `landing_key` aceita chave explícita em `url_tags`, campanha explícita quando identifica uma única entrada ou correspondência exata de host e path no `norwyn_landing_registry`. Querystring e trailing slash são normalizados; compartilhar apenas o domínio com outra página não cria vínculo automático. Destinos ausentes, inválidos ou não cadastrados permanecem `unresolved`.

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
