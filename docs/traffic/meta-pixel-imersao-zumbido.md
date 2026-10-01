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

## Ativacao publica preparada, nao executada

Para a futura ativacao publica, a unica mudanca funcional necessaria no runtime e substituir o gate exclusivo de `traffic_type=test&meta_pixel_test=1` por uma flag publica server/build-time explicitamente autorizada. O consentimento continua obrigatorio e deve permanecer como condicao para instalar o Pixel. A ativacao deve preservar o Pixel `1421640192678969`, `PageView`, `ViewContent`, `ViewOffer` e `InitiateCheckout`; `Purchase` continua proibido no cliente.

Checklist de liberacao:

1. aprovar juridicamente o texto e a persistencia do consentimento;
2. confirmar o Pixel no Events Manager;
3. habilitar a flag publica somente no projeto da LP;
4. validar consentimento concedido e negado em sessao limpa;
5. confirmar uma unica carga do Pixel e eventos sem duplicidade;
6. confirmar que tracking Norwyn e checkout continuam independentes;
7. confirmar que nenhum `Purchase` parte do navegador;
8. manter rollback pela desativacao da flag.

## Purchase futuro

Fluxo proposto, ainda nao implementado: webhook Hotmart confirma a transacao, a Norwyn reconcilia `source_sck` e identidade anonima, e somente depois um emissor server-side envia Meta CAPI com `event_id` estavel. Se um evento equivalente existir em browser e servidor no futuro, o mesmo `event_id` deve ser usado para deduplicacao. Meta Purchase, venda confirmada Hotmart e atribuicao Norwyn permanecem metricas distintas.
