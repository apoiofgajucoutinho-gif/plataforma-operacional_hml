# Traffic Intelligence V2

## Objetivo

A V2 transforma os dados coletados pela V9 em uma leitura assistida:

`Dado -> Contexto -> Evidencia -> Interpretacao -> Recomendacao -> Proxima revisao`

Ela nao executa alteracoes na Meta. Todas as recomendacoes exibem periodo, amostra, confianca, limitacao e condicao de revisao.

## Fontes

| Fonte | O que responde | Regra |
| --- | --- | --- |
| Meta Ads | entrega, cliques, LPV, InitiateCheckout e Meta Purchase | Usa aliases canonicos V9 sem soma duplicada. |
| Site / Analytics | sessoes, visitantes, engagement e duracao | So aparece quando houver uma fonte Site Kit/GA4 canonica integrada. Relatorios manuais nao sao copiados. |
| Norwyn Tracking | sessoes reais, oferta vista, checkout click e origem | Considera apenas `source_type=REAL`; trafego de teste fica fora. |
| Hotmart | venda e receita confirmadas | Usa `sale_confirmed` e o bridge para identificar atribuicao. |

As fontes nunca sao somadas nem usadas para preencher lacunas umas das outras.

## Identidade do anuncio

O agrupamento prioriza `ad_id`. Linhas historicas sem ID podem usar o nome como fallback somente quando existe uma correspondencia unica com um anuncio identificado no mesmo recorte. A interface preserva `creative_id`, thumbnail, preview, formato, headline, copy, CTA e destino retornados pela V9.

As UTMs atuais da Imersao Zumbido identificam entradas como `ads`, `bio` e `grupo_whatsapp`, mas nao carregam `ad_id`. Por isso, sessoes e vendas podem ser atribuidas a uma origem/campanha sem determinar AD 01-06. A Norwyn mostra a lacuna em vez de inferir pelo nome.

## Reconciliacao e resposta comercial

Estados executivos:

- `Confirmado`: venda Hotmart e anuncio ligados por evidencia deterministica.
- `Parcialmente confirmado`: venda ligada a Norwyn, mas anuncio ou parte da jornada nao foi determinado.
- `Meta atribuiu, Hotmart confirmou, anuncio nao determinado`: as fontes registram resultado no periodo sem uma chave comum por anuncio.
- `Meta atribuiu, venda nao localizada`: existe Meta Purchase sem transacao reconciliada.
- `Venda confirmada sem atribuicao deterministica`: a Hotmart confirma a transacao, mas a origem nao foi provada.

`Meta Purchase` nunca e promovido automaticamente a venda confirmada.

## Jornada

A jornada apresenta Anuncio -> Clique -> Visita real -> Oferta vista -> Checkout -> Venda. Cada etapa informa fonte, confianca e divergencia. Taxas entre plataformas diferentes nao sao forcadas, porque janelas, consentimento, deduplicacao e semantica podem divergir.

## Recomendacoes

Estados permitidos:

- Evidencia comercial forte
- Sinal promissor
- Precisa de mais dados
- Sinal de atencao
- Divergencia de mensuracao

O bloco executivo mostra no maximo tres itens. CTR alto isolado nao cria vencedor; frequencia alta nao prova saturacao; Meta Purchase nao prova venda Hotmart.

## Memoria

A V2 reutiliza `norwyn_campaign_learnings` e apresenta:

1. Detectado
2. Recomendado
3. Acao tomada
4. Resultado

Na V1 da memoria, acao e resultado sao lidos de `evidence.action_taken` e `evidence.result` quando existem. Nao foi criada tabela paralela nem gravacao automatica.

## Glossario

O catalogo em `modules/ads/data/operational-glossary.ts` e a fonte estruturada para tela e futuros tooltips. Cada termo contem nome, sigla, definicao simples, exemplo, formula de mercado, regra Norwyn, motivo, fonte, limitacoes e termos relacionados.

Regras metodologicas centrais:

- aliases canonicos nao sao somados;
- `complete_registration` nao e Purchase;
- Meta Purchase fica separado de Hotmart;
- alcance diario acumulado nao e alcance unico do periodo;
- frequencia diaria ponderada e identificada como aproximacao;
- atribuicao deterministica tem prioridade;
- ausencia de evidencia nao e inferida.
