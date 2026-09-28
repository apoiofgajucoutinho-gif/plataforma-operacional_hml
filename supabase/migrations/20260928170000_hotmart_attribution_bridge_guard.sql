create unique index if not exists growth_tracking_keys_norwyn_sck_uidx
on public.growth_tracking_keys (tenant_id, source_sck)
where source_sck like 'nw_%';

comment on index public.growth_tracking_keys_norwyn_sck_uidx is
  'Idempotency guard for anonymous Norwyn checkout attribution keys. Legacy source_sck values are intentionally untouched.';

create or replace view public.hotmart_attribution_bridge_v
with (security_invoker = true)
as
select
  sale.tenant_id,
  sale.id as sale_id,
  sale.transaction_id,
  sale.status_normalizado,
  sale.sale_confirmed,
  sale.data_compra,
  sale.valor_bruto,
  sale.origem as hotmart_origin,
  sale.source_sck as hotmart_source_sck,
  tracking.id as tracking_key_id,
  tracking.source as norwyn_source,
  tracking.medium as norwyn_channel,
  tracking.campaign as norwyn_campaign,
  tracking.content as norwyn_entry,
  tracking.tracking_confidence as norwyn_confidence,
  tracking.tracking_source as norwyn_evidence_source,
  tracking.landing_url,
  tracking.checkout_url,
  tracking.metadata as norwyn_evidence
from public.comercial_vendas sale
left join public.growth_tracking_keys tracking
  on tracking.tenant_id = sale.tenant_id
 and tracking.source_sck = sale.source_sck;

grant select on public.hotmart_attribution_bridge_v to authenticated;
