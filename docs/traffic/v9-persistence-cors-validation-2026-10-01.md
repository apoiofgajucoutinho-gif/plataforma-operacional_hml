# V9 persistence and LP CORS validation - 2026-10-01

Environment: Supabase HML `oerdsmgiebquecqwcbox`, tenant `ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0`. Database work in this validation was read-only.

## Persistence smoke

- `instagram_ads_daily`: 7 rows with `origem = n8n_meta_ads_v9`, covering 2026-09-30 and 2026-10-01.
- Duplicate `row_key`: 0.
- Duplicate logical keys (`date|campaign|adset|ad`): 0.
- All 7 rows contain `row_key`, Meta campaign/adset/ad/creative IDs, destination URL/domain, targeting summary, audience type/confidence, snapshot hash and raw payload.
- Aggregated smoke values: spend 42.66, impressions 1,375, daily reach sum 996, clicks 33, link clicks 25, LPV 2, initiate checkout 1 and Meta purchases 3.
- Every raw payload identifies collector `v9` and action semantics `canonical_alias_priority`.

The unique index on `(tenant_id,row_key)` prevented duplicate rows. This observation validates the persisted result, not a second write: no persistence was executed in this delivery.

## Configuration snapshots

`instagram_ads_config_snapshots` contains 15 V9 snapshots:

- campaign: 1;
- adset: 1;
- ad: 6;
- creative: 6;
- video: 1;
- audience: 0 (no applicable fetched audience in this smoke).

All 15 contain entity type/id, hash, config JSON, parent IDs, source, Graph version, collector version and last-seen timestamp. Duplicate `(entity_type,entity_id,config_hash)` entries: 0. No entity has more than one hash in the current sample, so configuration-change versioning remains structurally validated but has no changed-config example yet.

## V3 and V9 coexistence risk

V3 and V9 use the same unique key `(tenant_id,row_key)`. Therefore they do not create parallel rows for the same ad/day: the last writer replaces the logical row. In the smoke period, all 7 matching rows currently show V9 as origin, so a direct persisted V3-versus-V9 row comparison for that exact period is no longer available.

Delivery metrics keep the same Meta fields for spend, impressions, reach and clicks. V9 adds canonical alias selection for link click, LPV, checkout and Meta Purchase, and explicitly excludes `complete_registration` from Purchase. Hotmart confirmed sales are not part of this comparison.

Before cutover, prevent concurrent schedules. Recommended sequence: disable V3, confirm no V3 execution remains in flight, activate only one V9 schedule, observe one cycle, compare totals to the last V3 baseline and keep rollback ready. This document does not authorize or execute that sequence.

## CORS policy

The two public LP endpoints share one allowlist. Exact origins are the official LP, `lp-ju.vercel.app`, HML and the preserved v0 origin. Vercel Preview is accepted only by the anchored project/team pattern:

`https://lp-<deployment-hash>-apoio-fga-ju-coutinho-s-projects.vercel.app`

Generic `*.vercel.app`, other projects and other teams remain rejected. Allowed responses include origin, methods, `Content-Type` and `Vary: Origin`. Credentials are not enabled. CORS is transport policy, not authentication; payload validation, tenant lookup and server-only Supabase credentials remain unchanged.

## Cutover checklist

1. Confirm V3 workflow ID, credentials and active schedule in n8n Cloud.
2. Confirm V9 remains inactive and uses the intended Meta and Supabase HML credentials.
3. Run one final V9 dry-run and compare canonical metrics.
4. Confirm snapshots and daily upserts remain idempotent.
5. Choose a cutover time with no execution in flight.
6. Disable V3 schedule.
7. Activate one V9 schedule only.
8. Observe the first execution, row origin, counts and errors.
9. Roll back by disabling V9 and re-enabling the unchanged V3 if validation fails.
