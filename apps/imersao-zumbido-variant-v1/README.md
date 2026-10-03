# Imersão Zumbido — variant_v1

Aplicação estática isolada da landing page baseline. O visual e o conteúdo vêm de `imersao_zumbido_html_v9.zip`; os runtimes de tracking, Pixel e checkout foram copiados da implementação validada em `apps/imersao-zumbido-hml`.

## Identidade

- `product_id`: `imersao_zumbido` (chave lógica enviada no evento)
- `landing_key`: `imersao-zumbido`
- `landing_version`: `variant_v1`
- produto de catálogo: `dfc00511-b160-42b0-878f-6e5b933b636b`
- produto de conhecimento: `1a7ba875-9c1d-4007-9871-ae2636a722a7`
- ambiente inicial: `hml`

## Tracking

`lp_section_view` ocorre uma vez por sessão e seção quando pelo menos metade da área útil da seção permanece visível por 1 segundo. Seções mais altas que o viewport usam o viewport como área de referência. `lp_cta_click` registra somente comandos de CTA. `offer_view` e `checkout_click` permanecem separados para compatibilidade com a jornada e o Meta Pixel.

`lp_section_engaged` não faz parte da V1: ainda não existe uma regra de tempo ativo validada que justifique o volume adicional de eventos.

## GA4

GA4 é opcional. O build lê `NEXT_PUBLIC_GA4_MEASUREMENT_ID`; sem um ID `G-*` válido nenhum script Google é carregado. Quando configurado, ele só inicializa após consentimento explícito e não envia `purchase`.

## Segurança

Esta app deve ser ligada somente ao projeto Vercel `lp-ju-imersao-zumbido`. Não executar deploy a partir de `apps/imersao-zumbido-hml` e não vincular o domínio público antes da aprovação de QA.
