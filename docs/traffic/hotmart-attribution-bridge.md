# Hotmart Attribution Bridge

## Scope

The bridge enriches the existing Imersao Zumbido checkout click without changing
the five public entry links, their 307 redirects, the landing page domain, or the
Hotmart product and offer.

Canonical checkout:

`https://pay.hotmart.com/B47092539B?off=lov69pen`

The `off=lov69pen` parameter is mandatory. Both client and server validate it
before accepting an enriched URL.

## Flow

1. The landing page keeps its anonymous visitor and 30-minute session IDs.
2. On a checkout click, the browser asks the HML bridge for an opaque `nw_*` key.
3. The server maps the key to the anonymous session and attribution in
   `growth_tracking_keys`.
4. The browser opens Hotmart with the original parameters plus `sck=nw_*`.
5. A future Hotmart transaction can be joined through `source_sck` without
   replacing Hotmart's own origin data.

The bridge stores no email, phone, name, document, or other direct PII.

## Safety and rollback

`HOTMART_ATTRIBUTION_BRIDGE` controls public traffic. It is disabled unless its
value is `1`, `true`, `on`, or `enabled`. With the flag disabled, unavailable, or
timed out, checkout continues through the original validated URL. Client bridge
requests time out after 1.2 seconds and tracking persistence never gates navigation.

Controlled HML smoke traffic may use
`traffic_type=test&bridge_test=1`. Its LP events are stored as `SIMULATED` and do
not enter public landing metrics.

Rollback is setting `HOTMART_ATTRIBUTION_BRIDGE=false` (or removing it). The
landing page remains usable even before the configuration deployment completes
because every error path falls back to the canonical checkout.

## Reconciliation

`hotmart_attribution_bridge_v` keeps the two origins separate:

- `hotmart_origin` and `hotmart_source_sck`: values received from Hotmart;
- `norwyn_source`, `norwyn_channel`, `norwyn_campaign`, `norwyn_entry`,
  `norwyn_confidence`, and `norwyn_evidence`: the internal mapping.

The partial unique index on `growth_tracking_keys` applies only to `nw_%` keys,
so legacy duplicate `source_sck` values remain untouched.
