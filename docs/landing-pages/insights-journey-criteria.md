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

Todas as etapas contam sessões distintas, não volume bruto de eventos. A jornada
principal usa somente eventos que representam avanço sequencial defensável:

`Sessão -> Checkout -> Compra confirmada`

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

### Coerência dos eventos

| Evento | Origem na LP | Repetição | Uso analítico |
| --- | --- | --- | --- |
| `offer_view` | Seção `offer`, ao atingir cerca de 35% de visibilidade | Uma vez por sessão/página (`once`) | Comportamento auxiliar; o observer pode não registrar a oferta antes do checkout |
| `cta_view` | Cinco CTAs: cabeçalho, hero, público, oferta e final | Uma vez por CTA e sessão; até cinco por sessão | Comportamento auxiliar; pode ocorrer antes ou depois da oferta |
| `cta_click` | Os mesmos CTAs, incluindo âncoras internas e checkout | Pode repetir e ocorrer em elementos diferentes | Comportamento auxiliar; não é uma etapa única do funil |
| `checkout_click` | CTA `offer_primary`, depois da tentativa do bridge e antes da navegação | Pode repetir; a Jornada deduplica por sessão | Intenção de checkout; não comprova carregamento nem compra |

A área Comportamento preserva duas medidas: sessões únicas e disparos brutos.
Todas as medidas usam a mesma coorte de `session_id` iniciada ou visualizada no
período. Assim, uma interação de sessão iniciada antes do recorte não pode gerar
"73 de 71 sessões". Eventos ausentes ou fora de ordem não fabricam etapas da
Jornada.

Na auditoria real de 7 dias em 29/09/2026, 5 das 8 sessões com
`checkout_click` não tinham `offer_view` registrado, 11 sessões viram algum CTA
antes da oferta e 6 clicaram em CTA antes da oferta. Portanto, `offer_view`,
`cta_view` e `cta_click` não são usados como predecessores obrigatórios do
checkout.

## Critérios iniciais

- Queda relevante entre etapas: perda mínima de 40%, 100 sessões, 7 dias.
- Baixa exposição ao CTA: CTA visto por sessão abaixo de 45%, 100 sessões, 7 dias.
- Baixa intenção de checkout: checkout por sessão abaixo de 10%, 100 sessões, 7 dias.
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

## Maturidade dos Insights

Os níveis ficam em `landing_page_definitions.metadata.insight_maturity`, sem
tabela paralela:

- **Prévia**: padrão inicial de 20 sessões. Permite acompanhar ou verificar, sem recomendar alteração na LP.
- **Em observação**: padrão inicial de 50 sessões. Permite investigar e comparar, ainda sem recomendação forte.
- **Insight**: padrão inicial de 100 sessões. Permite hipótese, confiança e sugestão de próximo teste.

ADMIN e ESPECIALISTA podem editar os três limiares. A API exige ordem crescente
e registra a mudança em `landing_page_events` como
`insight_maturity_updated`. A maturidade usa a base relevante de cada leitura:
sessões da página para exposição ao CTA e sessões que viram a oferta para avanço
ao checkout.

Maturidade e confiança são separadas. Antes de `Insight`, a confiança não é
exibida. A partir de `Insight`, ela continua objetiva: tamanho da amostra e
repetição no período anterior.

## Limitações atuais

- dispositivo não é enviado pelo tracking atual;
- a Imersão Zumbido ainda não possui compra reconciliada por `source_sck`;
- comportamento de comprador versus não comprador depende dessa reconciliação;
- a versão da LP existe nos eventos, mas eventos antigos podem não ter versão.
