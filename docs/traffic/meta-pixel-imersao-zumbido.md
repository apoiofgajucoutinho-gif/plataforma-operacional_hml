# Meta Pixel - Imersao Zumbido

## Escopo atual

Esta implementacao prepara o Pixel Meta `1421640192678969` apenas para validacao em HML/preview. O runtime so e habilitado quando a URL contem simultaneamente:

- `traffic_type=test`
- `meta_pixel_test=1`

Sem esses parametros, nenhum script da Meta e carregado e nenhum evento Meta e enviado. Isso evita ativacao acidental no dominio publico antes da aprovacao.

## Consentimento

O Pixel nao e carregado antes do consentimento explicito. A escolha fica registrada em `localStorage` pela chave `norwyn_meta_consent_v1`. O tracking operacional Norwyn permanece independente.

## Eventos Meta

| Evento | Disparo | Uso |
| --- | --- | --- |
| `PageView` | Uma vez, depois do consentimento | Visita a pagina |
| `ViewContent` | Uma vez, depois do consentimento | Visualizacao da LP Imersao Zumbido |
| `ViewOffer` | Uma vez, quando o evento Norwyn `offer_view` ocorre | Evento customizado para exposicao da oferta |
| `InitiateCheckout` | Uma vez, no clique real do CTA de checkout | Intencao de iniciar checkout |

`Purchase` nao e disparado pela Landing Page. Uma compra so pode alimentar Meta quando houver confirmacao confiavel, idealmente pelo webhook Hotmart e com deduplicacao server-side.

## Tres fontes, tres semanticas

- **Meta:** eventos de midia e atribuicao reportados pelo Pixel; nao representam a verdade financeira isoladamente.
- **Norwyn:** comportamento da LP, sessao, UTMs, first/current touch, `sck` e jornada operacional.
- **Hotmart:** transacao confirmada, cancelada ou reembolsada; e a fonte canonica de venda.

## Preservacao do tracking existente

O runtime Meta apenas escuta eventos do navegador. Ele nao altera `visitor_id`, `session_id`, UTMs, first/current touch, `sck`, Attribution Bridge ou `landing_page_tracking_events`.

## Checklist antes de apontar a campanha para a LP nova

1. Validar o Pixel correto no Business Manager e no Ad Set.
2. Validar consentimento e politica de privacidade com o responsavel legal.
3. Testar `PageView`, `ViewContent`, `ViewOffer` e `InitiateCheckout` no Events Manager.
4. Confirmar ausencia de eventos duplicados em desktop e mobile.
5. Confirmar que `Purchase` nao e gerado por clique ou retorno de pagina.
6. Definir confirmacao de compra via Hotmart antes de ativar `Purchase`.
7. Validar checkout, `off=lov69pen`, UTMs e `sck` com o Attribution Bridge.
8. Remover a trava de teste somente em uma entrega de producao autorizada.
9. Alterar URL da campanha apenas depois da publicacao e da validacao final.
