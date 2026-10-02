# Imersão Zumbido HML

Static HML build of the approved Imersão Zumbido landing page. It is deployed by the Vercel project `lp_ju` and sends first-party events to the Norwyn HML endpoint.

## Tracking identity

- `page_id`: `imersao_zumbido`
- `product_id`: `dfc00511-b160-42b0-878f-6e5b933b636b`
- `template`: `premium_formation`
- `page_version`: `v1.0-hml-tracking`
- `content_version`: `2026-09-27-r397`
- `environment`: `hml`

`visitor_id` is an anonymous UUID persisted in `localStorage`. No name, email, telephone, CPF, form content, or other PII is collected.

`session_id` is another UUID stored in `localStorage`, which allows tabs on the same origin to share it. Any valid tracking activity refreshes `last_activity_at`; after 30 minutes without activity, the next event creates a new session.

First touch is captured once per visitor and never overwritten. Current touch belongs to the active session and is refreshed when a URL contains a new campaign attribution. Supported parameters are `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_id`, `adset_id`, `ad_id`, `fbclid`, `sck`, and `src`.

## Checkout

The configured checkout is `https://pay.hotmart.com/B47092539B?off=lov69pen`. Supported campaign parameters are appended with `URLSearchParams`, preserving the existing Hotmart `off` parameter.

The optional Attribution Bridge is controlled server-side by `HOTMART_ATTRIBUTION_BRIDGE`. It starts disabled and never blocks checkout: when disabled, unavailable, timed out, or invalid, the original checkout remains usable. Test traffic can use `traffic_type=test&bridge_test=1` for an isolated smoke that is excluded from public metrics. The opaque `nw_<hash>` key contains no PII and maps anonymous visitor/session identifiers in `growth_tracking_keys`.

## Official short links

The campaign entry points are temporary redirects configured in `vercel.json`:

- `/stories` -> Instagram / Organic / Stories
- `/bio` -> Instagram / Organic / Bio
- `/whatsapp` -> WhatsApp / Group / Grupo WhatsApp
- `/site` -> Site / Owned / Site Juliana
- `/ads` -> Meta / Paid / Ads

The redirect runs before the landing page is rendered, so the destination is the only page that initializes tracking. This prevents an extra `page_view` or `session_start` and keeps the full attribution visible for operational inspection.

The canonical Meta URL Parameters template is:

```text
utm_source=meta&utm_medium=paid&utm_campaign=imersao_zumbido&utm_content=ads&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}
```

Meta appends `fbclid` to real clicks. It must not be replaced by a static value. The `/ads` redirect preserves incoming IDs and `fbclid`; the landing stores them in first/current touch, events, and the attribution bridge. At checkout the opaque `sck` is the Hotmart transport key, and Hotmart returns it as `source_sck` for exact reconciliation.

### Future evolution

A future Norwyn tracked-link generator can manage the same mapping as structured data: landing page, campaign, source, medium, content, and short name. It should validate unique paths, reserve application routes, emit auditable redirects, and preserve the current test-traffic convention. This delivery intentionally keeps the five mappings static and does not introduce a generic redirect manager.

## Event policy

Scroll milestones, section views, CTA views, `modules_view`, and `offer_view` are emitted once per page/session. `module_open` and `faq_open` are emitted only after a user opens a closed item; the initially open item is not counted as an interaction.

`journey_step_view` is intentionally not emitted in this version. The journey is presented as one continuous section, so a single `section_view` is more meaningful and avoids four low-signal visibility events.
