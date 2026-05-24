create or replace function app_private.parse_ptbr_date(value text)
returns date
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  if value ~ '^\d{4}-\d{2}-\d{2}' then
    return left(value, 10)::date;
  end if;

  return to_date(left(value, 10), 'DD/MM/YYYY');
end;
$$;

create or replace function app_private.parse_ptbr_timestamp(value text)
returns timestamptz
language plpgsql
stable
as $$
begin
  if value is null or btrim(value) = '' then
    return now();
  end if;

  if value ~ '^\d{4}-\d{2}-\d{2}' then
    return value::timestamptz;
  end if;

  return to_timestamp(value, 'DD/MM/YYYY, HH24:MI:SS')::timestamptz;
exception
  when others then
    return now();
end;
$$;

create or replace function app_private.normalize_instagram_post_type(value text)
returns public.instagram_post_type
language plpgsql
immutable
as $$
declare
  normalized text := upper(coalesce(value, ''));
begin
  if normalized in ('VIDEO', 'REEL', 'REELS') then
    return 'Reels';
  end if;

  if normalized in ('CAROUSEL_ALBUM', 'CAROUSEL', 'CARROSSEL') then
    return 'Carrossel';
  end if;

  if normalized in ('IMAGE', 'PHOTO', 'FOTO', 'ESTATICO', 'ESTÁTICO') then
    return 'Estatico';
  end if;

  return 'Outro';
end;
$$;

create or replace function app_private.classify_instagram_engagement(score numeric)
returns public.instagram_engagement_classification
language plpgsql
immutable
as $$
begin
  if score is null then
    return 'N/A';
  end if;

  if score >= 0.05 then
    return 'Bom';
  end if;

  if score >= 0.02 then
    return 'Medio';
  end if;

  return 'Ruim';
end;
$$;

create or replace view public.instagram_n8n_import_rows
with (security_invoker = true)
as
select
  null::text as tenant_name,
  null::text as account_name,
  null::text as username,
  null::text as source,
  null::text as data_coleta,
  null::text as post_id,
  null::text as tipo_postagem,
  null::integer as likes,
  null::integer as comentarios,
  null::text as data_postagem,
  null::text as hora_postagem,
  null::text as legenda,
  null::text as permalink,
  null::integer as reach,
  null::integer as saved,
  null::integer as shares,
  null::jsonb as raw_payload
where false;

create or replace function app_private.instagram_n8n_import_rows_insert()
returns trigger
language plpgsql
as $$
declare
  resolved_tenant_id uuid;
  resolved_account_id uuid;
  resolved_post_id uuid;
  resolved_tenant_name text := coalesce(nullif(btrim(new.tenant_name), ''), 'Juliana Coutinho');
  resolved_account_name text := coalesce(nullif(btrim(new.account_name), ''), resolved_tenant_name);
  resolved_username text := coalesce(nullif(btrim(new.username), ''), 'fga.jucoutinho');
  resolved_source text := coalesce(nullif(btrim(new.source), ''), 'n8n_supabase_node');
  resolved_data_postagem date;
  resolved_hora_postagem time;
  resolved_alcance integer := coalesce(new.reach, 0);
  resolved_score numeric;
  payload jsonb;
begin
  if new.post_id is null or btrim(new.post_id) = '' then
    raise exception 'post_id e obrigatorio para importar metricas do Instagram';
  end if;

  resolved_data_postagem := app_private.parse_ptbr_date(new.data_postagem);
  if resolved_data_postagem is null then
    raise exception 'data_postagem e obrigatoria para importar o post %', new.post_id;
  end if;

  if new.hora_postagem is not null and btrim(new.hora_postagem) <> '' then
    resolved_hora_postagem := left(new.hora_postagem, 8)::time;
  end if;

  payload := jsonb_build_object(
    'data_coleta', new.data_coleta,
    'post_id', new.post_id,
    'tipo_postagem', new.tipo_postagem,
    'likes', coalesce(new.likes, 0),
    'comentarios', coalesce(new.comentarios, 0),
    'data_postagem', new.data_postagem,
    'hora_postagem', new.hora_postagem,
    'legenda', coalesce(new.legenda, ''),
    'permalink', coalesce(new.permalink, ''),
    'reach', coalesce(new.reach, 0),
    'saved', coalesce(new.saved, 0),
    'shares', coalesce(new.shares, 0)
  );

  select id
  into resolved_tenant_id
  from public.tenants
  where nome = resolved_tenant_name
  order by created_at
  limit 1;

  if resolved_tenant_id is null then
    insert into public.tenants (nome, tipo)
    values (resolved_tenant_name, 'cliente')
    returning id into resolved_tenant_id;
  end if;

  insert into public.instagram_accounts (tenant_id, nome, username)
  values (resolved_tenant_id, resolved_account_name, resolved_username)
  on conflict (tenant_id, username)
  do update set
    nome = excluded.nome,
    updated_at = now()
  returning id into resolved_account_id;

  insert into public.instagram_posts (
    tenant_id,
    account_id,
    post_id,
    data_coleta,
    data_postagem,
    hora_postagem,
    tipo_original,
    tipo,
    legenda,
    permalink,
    raw_payload
  )
  values (
    resolved_tenant_id,
    resolved_account_id,
    btrim(new.post_id),
    app_private.parse_ptbr_timestamp(new.data_coleta),
    resolved_data_postagem,
    resolved_hora_postagem,
    new.tipo_postagem,
    app_private.normalize_instagram_post_type(new.tipo_postagem),
    coalesce(new.legenda, ''),
    coalesce(new.permalink, ''),
    coalesce(new.raw_payload, payload)
  )
  on conflict (tenant_id, post_id)
  do update set
    account_id = excluded.account_id,
    data_coleta = excluded.data_coleta,
    data_postagem = excluded.data_postagem,
    hora_postagem = excluded.hora_postagem,
    tipo_original = excluded.tipo_original,
    tipo = excluded.tipo,
    legenda = excluded.legenda,
    permalink = excluded.permalink,
    raw_payload = excluded.raw_payload,
    updated_at = now()
  returning id into resolved_post_id;

  if resolved_alcance > 0 then
    resolved_score := (coalesce(new.likes, 0) + coalesce(new.comentarios, 0) + coalesce(new.saved, 0))::numeric / resolved_alcance;
  end if;

  insert into public.instagram_metrics (
    tenant_id,
    account_id,
    post_id,
    likes,
    comentarios,
    alcance,
    salvos,
    compartilhamentos,
    engajamento_score,
    engajamento_classificacao,
    origem,
    imported_at,
    raw_payload
  )
  values (
    resolved_tenant_id,
    resolved_account_id,
    resolved_post_id,
    coalesce(new.likes, 0),
    coalesce(new.comentarios, 0),
    nullif(resolved_alcance, 0),
    coalesce(new.saved, 0),
    coalesce(new.shares, 0),
    resolved_score,
    app_private.classify_instagram_engagement(resolved_score),
    resolved_source,
    now(),
    coalesce(new.raw_payload, payload)
  )
  on conflict (tenant_id, post_id, origem)
  do update set
    account_id = excluded.account_id,
    likes = excluded.likes,
    comentarios = excluded.comentarios,
    alcance = excluded.alcance,
    salvos = excluded.salvos,
    compartilhamentos = excluded.compartilhamentos,
    engajamento_score = excluded.engajamento_score,
    engajamento_classificacao = excluded.engajamento_classificacao,
    imported_at = now(),
    raw_payload = excluded.raw_payload,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists instagram_n8n_import_rows_insert on public.instagram_n8n_import_rows;

create trigger instagram_n8n_import_rows_insert
instead of insert on public.instagram_n8n_import_rows
for each row
execute function app_private.instagram_n8n_import_rows_insert();

grant insert, select on public.instagram_n8n_import_rows to authenticated;
