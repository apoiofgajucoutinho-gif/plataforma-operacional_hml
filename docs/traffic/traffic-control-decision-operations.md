# Traffic Control & Decision Operations

## Escopo

Esta camada é somente leitura sobre Meta Ads, LP, Pixel, checkout e V9. A única
escrita permitida é a decisão humana registrada em
`norwyn_campaign_learnings.evidence`. Nenhuma ação é executada na Meta.

## Frescor por fonte

Cada fonte mantém seu próprio timestamp:

- Meta Ads: maior `instagram_ads_daily.imported_at/updated_at` do recorte;
- Hotmart: maior `comercial_vendas.imported_at/updated_at/last_event_at`;
- Norwyn Tracking: maior `landing_page_tracking_events.occurred_at` real;
- GA4: não integrado enquanto não existir propriedade/fonte canônica acessível.

O schedule Meta considerado é `08:30, 10:30, 12:30, 14:30, 16:30, 18:30,
20:30, 22:30`, sempre em `America/Sao_Paulo`. Há tolerância operacional de 30
minutos. Uma janela perdida gera `Atrasado`; duas janelas ou mais, ou idade acima
de cinco horas durante a operação, gera `Sem coleta recente`. Entre 22:30 e
08:30, a leitura aponta a última coleta do dia e a próxima janela sem criar um
alerta apenas porque não há execução noturna.

## Tracking Health

`Boa`, `Parcial` e `Fraca` derivam de verificações objetivas:

- campaign registry e landing registry resolvidos;
- Pixel conhecido no snapshot do ad set;
- V9 dentro da janela esperada;
- cobertura real de `campaign_id`, `adset_id`, `ad_id` e `fbclid` por sessão;
- `sck` preservado no checkout;
- retorno Hotmart por `source_sck`;
- divergências Meta/Norwyn/Hotmart.

Tráfego `SIMULATED/test` não entra na cobertura pública. A idade dos dados reduz
a qualidade da mensuração e, por consequência, a confiança das recomendações.

## Jornada e reconciliação

A jornada usa sessões únicas em `session_start/page_view`, `offer_view`,
`cta_click` e `checkout_click`. Compra é apenas Hotmart confirmada. Meta Purchase,
sessão Norwyn, venda Hotmart e venda atribuída por `source_sck + ad_id` continuam
níveis separados.

Dispositivo não está disponível no tracking canônico atual. GA4 permanece como
dependência de integração somente leitura; relatórios manuais do Site Kit não são
tratados como fonte.

## Budget e pacing

O orçamento vem do snapshot canônico da campanha. A tela compara percentual do
período com percentual consumido, usando uma faixa de 10 pontos percentuais:

- dentro do ritmo;
- acima do ritmo;
- abaixo do ritmo;
- orçamento desconhecido.

Ritmo médio e projeção são exibidos junto ao timestamp Meta usado. Se a fonte
estiver atrasada, a interface explicita que a projeção não representa estado em
tempo real.

## Alertas

Alertas cobrem frescor, queda do Tracking Health, campanha ativa sem gasto, gasto
sem sessão, diferença clique/LPV, checkout sem Hotmart, Meta Purchase sem Hotmart,
Hotmart sem atribuição, sessão sem `ad_id` e checkout sem `sck`. Toda ocorrência
tem severidade e condição de revisão, preferindo a próxima janela V9 quando
aplicável.

## Loop de decisão

O fluxo é:

`Detectado → Recomendado → Decisão humana → Resultado → Aprendizado`

ADMIN e ESPECIALISTA podem registrar `Aceitei`, `Ignorei` ou `Fiz diferente`,
ação executada e observação. O registro cria ou atualiza
`norwyn_campaign_learnings`, preservando o histórico.

## Delta intradiário

A V9 atual faz upsert do acumulado diário em `instagram_ads_daily`; não existe
snapshot métrico de cada execução. Por isso, “desde a última coleta” permanece em
estado explícito de aguardando histórico. Implementá-lo corretamente exigiria
persistência adicional no coletor ou outra fonte de snapshots, ambos fora deste
escopo. A Norwyn não usa o dia anterior como substituto silencioso.
