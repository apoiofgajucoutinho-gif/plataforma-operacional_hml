-- P1.1 Student 360: backfill preserved Hotmart Club events into the learning-event layer.
-- The legacy commercial transaction_id stores the Club event UUID here; do not treat it as a sale transaction.

insert into public.norwyn_hotmart_learning_events (
  tenant_id,
  event_id,
  transaction_id,
  buyer_email,
  buyer_name,
  hotmart_product_id,
  hotmart_product_name,
  event_type,
  event_class,
  occurred_at,
  raw_id,
  payload,
  metadata
)
select
  v.tenant_id,
  coalesce(nullif(r.payload #>> '{raw_payload,id}', ''), nullif(r.payload ->> 'event_id', ''), v.transaction_id, v.id::text) as event_id,
  null::text as transaction_id,
  lower(nullif(coalesce(v.comprador_email, r.payload #>> '{raw_payload,data,user,email}', r.payload ->> 'buyer_email'), '')) as buyer_email,
  nullif(coalesce(v.comprador_nome, r.payload #>> '{raw_payload,data,user,name}', r.payload ->> 'buyer_name'), '') as buyer_name,
  nullif(coalesce(v.hotmart_product_id, r.payload #>> '{raw_payload,data,product,id}', r.payload ->> 'product_id'), '') as hotmart_product_id,
  nullif(coalesce(v.produto_nome, r.payload #>> '{raw_payload,data,product,name}', r.payload ->> 'product_name'), '') as hotmart_product_name,
  coalesce(nullif(r.payload #>> '{raw_payload,event}', ''), nullif(r.payload ->> 'event', ''), v.status_original, v.event_class) as event_type,
  v.event_class,
  coalesce(
    case
      when (r.payload #>> '{raw_payload,creation_date}') ~ '^[0-9]+$'
        then to_timestamp(((r.payload #>> '{raw_payload,creation_date}')::numeric / 1000.0))
      else null
    end,
    v.last_event_at,
    v.data_aprovacao,
    v.data_compra,
    r.received_at,
    v.created_at
  ) as occurred_at,
  v.raw_id,
  coalesce(r.payload, v.metadata, '{}'::jsonb) as payload,
  jsonb_build_object(
    'source', 'comercial_vendas_club_backfill',
    'commercial_sale_id', v.id,
    'legacy_transaction_id_was_event_id', true,
    'module_id', r.payload #>> '{raw_payload,data,module,id}',
    'module_name', r.payload #>> '{raw_payload,data,module,name}',
    'match_rule', case
      when nullif(coalesce(v.comprador_email, r.payload #>> '{raw_payload,data,user,email}', r.payload ->> 'buyer_email'), '') is not null then 'raw_payload_user_email'
      else 'unmatched_identity'
    end,
    'confidence', case
      when nullif(coalesce(v.comprador_email, r.payload #>> '{raw_payload,data,user,email}', r.payload ->> 'buyer_email'), '') is not null then 'IDENTIFIED'
      else 'UNRECONCILED'
    end
  ) as metadata
from public.comercial_vendas v
left join public.comercial_hotmart_raw r on r.id = v.raw_id
where v.event_class in ('PRODUCT_ACCESS_EVENT', 'MODULE_EVENT')
  and coalesce(nullif(r.payload #>> '{raw_payload,id}', ''), nullif(r.payload ->> 'event_id', ''), v.transaction_id, v.id::text) is not null
on conflict (tenant_id, event_id) where event_id is not null do update set
  buyer_email = excluded.buyer_email,
  buyer_name = excluded.buyer_name,
  hotmart_product_id = excluded.hotmart_product_id,
  hotmart_product_name = excluded.hotmart_product_name,
  event_type = excluded.event_type,
  event_class = excluded.event_class,
  occurred_at = excluded.occurred_at,
  raw_id = excluded.raw_id,
  payload = excluded.payload,
  metadata = excluded.metadata,
  updated_at = now();