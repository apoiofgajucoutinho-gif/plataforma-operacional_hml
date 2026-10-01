-- Future writes use stable Meta IDs when available. Existing rows are untouched.
create or replace function app_private.set_instagram_ads_daily_row_key()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  has_meta_ids boolean;
  identity_value text;
  legacy_row_key text;
  existing_row_key text;
begin
  -- A row keeps its identity during an upsert update. Identity changes are
  -- represented by a new row and are never rewritten silently.
  if tg_op = 'UPDATE' then
    new.row_key := old.row_key;
    return new;
  end if;

  has_meta_ids :=
    nullif(btrim(new.campaign_id), '') is not null and
    nullif(btrim(new.adset_id), '') is not null and
    nullif(btrim(new.ad_id), '') is not null;

  legacy_row_key := md5(concat_ws('|',
    new.data_referencia::text,
    new.campanha,
    coalesce(new.conjunto, ''),
    new.anuncio
  ));

  -- Preserve the identity of rows already written by V3 or early V9 smokes.
  -- This makes the first V9 lookback an upsert without rewriting history.
  if has_meta_ids then
    select existing.row_key
      into existing_row_key
      from public.instagram_ads_daily as existing
     where existing.tenant_id = new.tenant_id
       and existing.data_referencia = new.data_referencia
       and existing.campaign_id = btrim(new.campaign_id)
       and existing.adset_id = btrim(new.adset_id)
       and existing.ad_id = btrim(new.ad_id)
     order by existing.updated_at desc nulls last, existing.id
     limit 1;
  end if;

  if existing_row_key is null then
    select existing.row_key
      into existing_row_key
      from public.instagram_ads_daily as existing
     where existing.tenant_id = new.tenant_id
       and existing.row_key = legacy_row_key
     limit 1;
  end if;

  identity_value := concat_ws('|',
    new.data_referencia::text,
    btrim(new.campaign_id),
    btrim(new.adset_id),
    btrim(new.ad_id)
  );

  new.row_key := coalesce(
    existing_row_key,
    case when has_meta_ids then md5(identity_value) else legacy_row_key end
  );
  return new;
end;
$$;

comment on function app_private.set_instagram_ads_daily_row_key() is
  'Canonical Ads identity: reuse an existing entity/date key, otherwise date plus Meta IDs, with the legacy V3 date plus names identity as fallback.';
