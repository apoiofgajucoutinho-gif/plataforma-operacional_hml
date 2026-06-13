create table if not exists public.instagram_interactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  source text not null check (source in ('story_reply', 'post_comment', 'new_follower')),
  marketing_type text not null default 'interacao_marketing',
  external_id text,
  dedupe_key text not null,
  profile_username text,
  profile_name text,
  message_text text,
  media_id text,
  post_id text,
  post_permalink text,
  interaction_at timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo', 'analisado', 'respondido', 'arquivado')),
  potential text not null default 'nao_classificado' check (potential in ('alto', 'medio', 'baixo', 'nao_classificado')),
  product_topic text,
  next_action text,
  origem text not null default 'n8n_instagram_directs',
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);

create index if not exists instagram_interactions_tenant_date_idx
  on public.instagram_interactions (tenant_id, interaction_at desc);

create index if not exists instagram_interactions_account_source_idx
  on public.instagram_interactions (account_id, source, interaction_at desc);

create or replace function app_private.normalize_instagram_interaction_source(input_source text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := lower(coalesce(nullif(btrim(input_source), ''), 'story_reply'));
begin
  if normalized in ('story_reply', 'story', 'stories', 'direct', 'dm', 'message', 'mensagem') then
    return 'story_reply';
  end if;

  if normalized in ('post_comment', 'comment', 'comentario', 'comentario_post', 'comments') then
    return 'post_comment';
  end if;

  if normalized in ('new_follower', 'follower', 'seguidor', 'novo_seguidor', 'follow') then
    return 'new_follower';
  end if;

  return 'story_reply';
end;
$$;

create or replace function app_private.classify_instagram_interaction_potential(
  input_potential text,
  message_text text
)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := lower(coalesce(nullif(btrim(input_potential), ''), ''));
  content text := lower(coalesce(message_text, ''));
begin
  if normalized in ('alto', 'high') then
    return 'alto';
  end if;

  if normalized in ('medio', 'medium') then
    return 'medio';
  end if;

  if normalized in ('baixo', 'low') then
    return 'baixo';
  end if;

  if content ~ '(valor|preco|matricula|inscricao|link|comprar|agenda|consulta|palestra|orcamento)' then
    return 'alto';
  end if;

  if content ~ '(curso|formacao|aasi|aura|imersao|zumbido|interesse|quero|como funciona)' then
    return 'medio';
  end if;

  if length(btrim(content)) > 0 then
    return 'baixo';
  end if;

  return 'nao_classificado';
end;
$$;

create or replace function app_private.normalize_instagram_interaction_status(input_status text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := lower(coalesce(nullif(btrim(input_status), ''), 'novo'));
begin
  if normalized in ('novo', 'new') then
    return 'novo';
  end if;

  if normalized in ('analisado', 'analyzed', 'reviewed') then
    return 'analisado';
  end if;

  if normalized in ('respondido', 'replied', 'answered') then
    return 'respondido';
  end if;

  if normalized in ('arquivado', 'archived') then
    return 'arquivado';
  end if;

  return 'novo';
end;
$$;

create or replace view public.instagram_interactions_import_rows
with (security_invoker = true)
as
select
  null::text as tenant_name,
  null::text as account_name,
  null::text as username,
  null::text as source,
  null::text as marketing_type,
  null::text as external_id,
  null::text as profile_username,
  null::text as profile_name,
  null::text as message_text,
  null::text as media_id,
  null::text as post_id,
  null::text as post_permalink,
  null::text as interaction_at,
  null::text as status,
  null::text as potential,
  null::text as product_topic,
  null::text as next_action,
  null::text as origem,
  null::jsonb as raw_payload
where false;

create or replace function app_private.instagram_interactions_import_rows_insert()
returns trigger
language plpgsql
as $$
declare
  resolved_tenant_id uuid;
  resolved_account_id uuid;
  resolved_tenant_name text := coalesce(nullif(btrim(new.tenant_name), ''), 'Juliana Coutinho');
  resolved_account_name text := coalesce(nullif(btrim(new.account_name), ''), resolved_tenant_name);
  resolved_username text := coalesce(nullif(btrim(new.username), ''), 'fga.jucoutinho');
  resolved_source text := app_private.normalize_instagram_interaction_source(new.source);
  resolved_status text := app_private.normalize_instagram_interaction_status(new.status);
  resolved_potential text := app_private.classify_instagram_interaction_potential(new.potential, new.message_text);
  resolved_interaction_at timestamptz := coalesce(nullif(btrim(new.interaction_at), '')::timestamptz, now());
  resolved_dedupe_key text;
  payload jsonb;
begin
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

  payload := coalesce(
    new.raw_payload,
    jsonb_build_object(
      'source', new.source,
      'external_id', new.external_id,
      'profile_username', new.profile_username,
      'profile_name', new.profile_name,
      'message_text', new.message_text,
      'media_id', new.media_id,
      'post_id', new.post_id,
      'post_permalink', new.post_permalink,
      'interaction_at', new.interaction_at
    )
  );

  resolved_dedupe_key := coalesce(
    nullif(btrim(new.external_id), ''),
    md5(
      resolved_source || '|' ||
      coalesce(new.profile_username, '') || '|' ||
      coalesce(new.profile_name, '') || '|' ||
      coalesce(new.message_text, '') || '|' ||
      resolved_interaction_at::text
    )
  );

  insert into public.instagram_interactions (
    tenant_id,
    account_id,
    source,
    marketing_type,
    external_id,
    dedupe_key,
    profile_username,
    profile_name,
    message_text,
    media_id,
    post_id,
    post_permalink,
    interaction_at,
    status,
    potential,
    product_topic,
    next_action,
    origem,
    raw_payload,
    imported_at
  )
  values (
    resolved_tenant_id,
    resolved_account_id,
    resolved_source,
    coalesce(nullif(btrim(new.marketing_type), ''), 'interacao_marketing'),
    nullif(btrim(new.external_id), ''),
    resolved_dedupe_key,
    nullif(btrim(new.profile_username), ''),
    nullif(btrim(new.profile_name), ''),
    nullif(btrim(new.message_text), ''),
    nullif(btrim(new.media_id), ''),
    nullif(btrim(new.post_id), ''),
    nullif(btrim(new.post_permalink), ''),
    resolved_interaction_at,
    resolved_status,
    resolved_potential,
    nullif(btrim(new.product_topic), ''),
    nullif(btrim(new.next_action), ''),
    coalesce(nullif(btrim(new.origem), ''), 'n8n_instagram_directs'),
    payload,
    now()
  )
  on conflict (tenant_id, dedupe_key)
  do update set
    account_id = excluded.account_id,
    source = excluded.source,
    marketing_type = excluded.marketing_type,
    external_id = excluded.external_id,
    profile_username = excluded.profile_username,
    profile_name = excluded.profile_name,
    message_text = excluded.message_text,
    media_id = excluded.media_id,
    post_id = excluded.post_id,
    post_permalink = excluded.post_permalink,
    interaction_at = excluded.interaction_at,
    potential = excluded.potential,
    product_topic = excluded.product_topic,
    next_action = excluded.next_action,
    origem = excluded.origem,
    raw_payload = excluded.raw_payload,
    imported_at = now(),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists instagram_interactions_import_rows_insert on public.instagram_interactions_import_rows;

create trigger instagram_interactions_import_rows_insert
instead of insert on public.instagram_interactions_import_rows
for each row
execute function app_private.instagram_interactions_import_rows_insert();

drop trigger if exists instagram_interactions_set_updated_at on public.instagram_interactions;

create trigger instagram_interactions_set_updated_at
before update on public.instagram_interactions
for each row
execute function app_private.set_updated_at();

alter table public.instagram_interactions enable row level security;

drop policy if exists "instagram_interactions_select" on public.instagram_interactions;
create policy "instagram_interactions_select"
on public.instagram_interactions
for select
to authenticated
using (app_private.can_access_module(tenant_id, 'instagram'::public.module_key, false));

drop policy if exists "instagram_interactions_write" on public.instagram_interactions;
create policy "instagram_interactions_write"
on public.instagram_interactions
for all
to authenticated
using (app_private.can_access_module(tenant_id, 'instagram'::public.module_key, true))
with check (app_private.can_access_module(tenant_id, 'instagram'::public.module_key, true));

grant select, insert, update, delete on public.instagram_interactions to authenticated;
grant select, insert, update, delete on public.instagram_interactions to service_role;
grant insert, select on public.instagram_interactions_import_rows to authenticated, service_role;
