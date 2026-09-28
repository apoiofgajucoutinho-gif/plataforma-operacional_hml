# Landing Pages: Insights, Jornada e Critérios

## Fonte de dados

A leitura reutiliza `landing_page_tracking_events`, `landing_page_definitions`,
`landing_page_versions`, `growth_tracking_keys`, `hotmart_attribution_bridge_v` e
`landing_page_events`. Não existe tracking paralelo.

Eventos medidos atualmente na Imersão Zumbido:

- `session_start`, `page_view`;
- `scroll_25`, `scroll_50`, `scroll_75`, `scroll_90`;
- `section_view`, `offer_view`, `cta_view`, `cta_click`, `checkout_click`;
- `modules_view`, `module_open`, `faq_open`.

Tráfego `SIMULATED`, `traffic_type=test`, smokes conhecidos e hosts técnicos são
excluídos por padrão. Apenas ADMIN pode incluí-los para diagnóstico.

## Jornada

Todas as etapas comportamentais contam sessões distintas, não volume bruto de
eventos. A jornada detalhada é:

`Sessão -> 25% -> Oferta -> CTA visto -> CTA clicado -> Checkout -> Compra confirmada`

Fórmulas:

- avanço da etapa = sessões da etapa / sessões da etapa anterior;
- participação = sessões da etapa / total de sessões;
- perda = sessões da etapa anterior - sessões da etapa.

Se uma etapa tiver mais sessões que a anterior, a transição não é tratada como
funil monotônico. Isso pode ocorrer quando eventos acontecem fora da ordem visual
ou quando uma sessão começou antes da janela analisada. Nesse caso, taxa e perda
da transição ficam indisponíveis e a limitação é mostrada.

Compra só é exibida quando há venda confirmada reconciliada por uma chave de
tracking ligada à campanha. Checkout nunca é interpretado como compra.

## Critérios iniciais

- Queda relevante entre etapas: perda mínima de 40%, 100 sessões, 7 dias.
- Baixa exposição ao CTA: CTA visto por sessão abaixo de 45%, 100 sessões, 7 dias.
- Baixo avanço do clique ao checkout: checkout por CTA clicado abaixo de 50%, 30 cliques, 7 dias.
- Pouca amostra: menos de 100 sessões, 7 dias.

Cada critério é configurável por LP em
`landing_page_definitions.metadata.insight_criteria`. A alteração registra autor,
data, valor anterior e valor novo em `landing_page_events` com o tipo
`insight_criterion_updated`.

## Confiança

- Baixa: amostra abaixo do patamar médio configurado.
- Média: patamar médio atingido.
- Alta: patamar alto atingido e a mesma regra acionada na janela anterior.

A confiança é determinística. Não há classificação subjetiva por IA.

## Limitações atuais

- dispositivo não é enviado pelo tracking atual;
- a Imersão Zumbido ainda não possui compra reconciliada por `source_sck`;
- comportamento de comprador versus não comprador depende dessa reconciliação;
- a versão da LP existe nos eventos, mas eventos antigos podem não ter versão.
