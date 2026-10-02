# Meta attribution hardening

## Current gap

The first real sessions on the new landing carried `utm_source=meta`, `utm_medium=paid`, `utm_campaign=imersao_zumbido`, `utm_content=ads`, and `fbclid`, but did not carry `campaign_id`, `adset_id`, or `ad_id`. The latest V9 snapshot also had `url_tags=null`. This proves channel attribution but not ad attribution.

## Canonical Meta URL Parameters

Configure the ad URL Parameters field, not the destination URL, with:

```text
utm_source=meta&utm_medium=paid&utm_campaign=imersao_zumbido&utm_content=ads&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}
```

The destination remains `https://imersaozumbido.fgajulianacoutinho.com.br/ads`. Meta adds `fbclid` on a real click. Names are deliberately excluded from identity.

## Evidence chain

1. Meta expands the three ID macros and appends `fbclid`.
2. Vercel redirects `/ads` to the landing while preserving incoming query parameters.
3. The landing stores IDs, UTMs, and `fbclid` in first touch and current touch with anonymous visitor/session IDs.
4. Every landing event persists the same identifiers in dedicated columns and in its sanitized payload.
5. On checkout click, the bridge validates the Meta campaign ID against the canonical campaign registry, creates deterministic `sck`, and writes the complete mapping to `growth_tracking_keys`.
6. The checkout URL preserves `off=lov69pen`, UTMs, Meta IDs, `fbclid`, and `sck`.
7. Hotmart returns `sck` as `source_sck`; Norwyn joins it exactly to `growth_tracking_keys`. No date or name inference is accepted.

## Confidence

- `HIGH`: campaign ID is registered and campaign/ad set/ad IDs are present.
- `MEDIUM`: channel/UTM exists but one or more Meta IDs are absent.
- `LOW`: neither deterministic Meta identity nor a reliable source is present.

Test traffic uses `traffic_type=test&bridge_test=1` and remains excluded from public metrics.
