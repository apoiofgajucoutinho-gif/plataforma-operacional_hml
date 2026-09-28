-- Preserve legacy landing history while removing POCs from the operational selector.
update public.landing_page_definitions
set metadata = coalesce(metadata, '{}'::jsonb) || '{"operational_visibility":"archived"}'::jsonb,
    updated_at = now()
where landing_key = 'aasi-premium-v2';

update public.norwyn_landing_registry
set metadata = coalesce(metadata, '{}'::jsonb) || '{"operational_visibility":"archived"}'::jsonb,
    updated_at = now()
where landing_key in ('mrc_lp_v1', 'mrc_lp_v5');
