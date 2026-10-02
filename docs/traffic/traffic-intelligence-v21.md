# Traffic Intelligence V2.1

## Regra central

A Norwyn não recomenda com base em uma métrica. O motor combina entrega, interesse, pós-clique, resultado comercial, qualidade da mensuração, amostra, recência e contexto da campanha. Ele nunca executa uma ação na Meta.

## Resolução da campanha

A identidade é resolvida exclusivamente por `campaign_id` Meta exato. O cadastro canônico preserva:

- `120228561336470421` como campanha histórica;
- `120252998912470421` como campanha ativa desde 29/09/2026;
- `imersao_zumbido` como `landing_key` canônica.

Nome, período e semelhança textual não resolvem identidade. A campanha ativa pode receber tracking Norwyn e vendas Hotmart cujo `norwyn_campaign=imersao_zumbido`. Como as UTMs atuais não carregam `ad_id`, a venda é confirmada para a campanha/origem, mas o anúncio permanece indeterminado.

O escopo temporal começa no maior valor entre o período escolhido e `start_time` da campanha Meta. Assim, sessões ou vendas anteriores da mesma LP não entram na leitura da campanha atual.

## Configuração

Os limiares ficam em `campaigns.growth_config.traffic_decision_engine`:

| Campo | Inicial | Uso |
| --- | ---: | --- |
| `min_link_clicks_signal` | 8 | Sinal inicial comparável |
| `min_link_clicks_decision` | 20 | Amostra para decisão assistida |
| `review_link_clicks_increment` | 20 | Próxima revisão por volume |
| `review_hours` | 24 | Revisão por tempo |
| `min_trend_days` | 3 | Tendência temporal mínima |
| `comparable_spend_ratio` | 0,5 | Pares com gasto comparável |
| `meaningful_spend` | `null` | Exige definição comercial |
| `target_cpa` | `null` | Exige definição comercial |

Com `meaningful_spend` e `target_cpa` ausentes, o motor não recomenda pausa por gasto. Valores comerciais não são inferidos.

## Estados e ações

Estados: evidência comercial forte, sinal comercial inicial, bom tráfego sem conversão comprovada, sinal promissor com amostra pequena, sinal de atenção, resultado contraditório, amostra insuficiente e divergência de mensuração.

Ações possíveis são apenas recomendações: manter, ganhar amostra, observar, investigar pós-clique, revisar criativo/público/tracking, considerar reduzir/pausar, priorizar ou testar incremento. Toda saída contém evidência, confiança com motivo, impacto esperado e condição objetiva de revisão.

## Sanidade da campanha atual

- AD04: tráfego relevante sem resultado comercial comprovado. Investigar pós-clique/tracking; não pausar automaticamente.
- AD05: Meta Purchase com topo de funil inferior e sem Hotmart por anúncio. Resultado contraditório; observar até reconciliar.
- AD06: sinal comercial inicial na Meta, ainda sem venda Hotmart determinada por anúncio.
- AD01–AD03: ganhar amostra enquanto estiverem abaixo dos limiares configurados.

## Mensuração

`Boa`, `Parcial` ou `Fraca` deriva de regras objetivas. A ausência de `ad_id` no bridge reduz confiança. Meta Purchase nunca vira venda confirmada Hotmart. O histórico em `norwyn_campaign_learnings` não é sobrescrito; ação humana e resultado posterior continuam em `evidence.action_taken` e `evidence.result`.
