# Convenção de UTMs da Norwyn

Os links oficiais usam valores em lowercase, sem acentos e separados por underscore quando necessário.

- `utm_source`: quem trouxe a visita, por exemplo `instagram`, `whatsapp`, `site` ou `meta`.
- `utm_medium`: tipo de canal, por exemplo `organic`, `group`, `owned` ou `paid`.
- `utm_campaign`: campanha canônica. Para esta divulgação: `imersao_zumbido`.
- `utm_content`: posição, criativo ou origem específica, por exemplo `stories`, `bio`, `grupo_whatsapp`, `site_juliana` ou `ads`.

## Imersão Zumbido

- Stories: `instagram / organic / imersao_zumbido / stories`
- Link da bio: `instagram / organic / imersao_zumbido / bio`
- Grupo WhatsApp: `whatsapp / group / imersao_zumbido / grupo_whatsapp`
- Site Juliana: `site / owned / imersao_zumbido / site_juliana`
- Meta Ads: `meta / paid / imersao_zumbido / ads`

No Meta Ads, `utm_content=ads` é a base de lançamento. A evolução pode usar macros da plataforma para campanha, conjunto, anúncio e criativo, mantendo `utm_campaign=imersao_zumbido` como identidade comercial estável.

## Tráfego interno

Smokes e verificações técnicas devem acrescentar `traffic_type=test`. A Norwyn persiste esses eventos como `SIMULATED`, preserva o histórico e os exclui das métricas públicas por padrão.
