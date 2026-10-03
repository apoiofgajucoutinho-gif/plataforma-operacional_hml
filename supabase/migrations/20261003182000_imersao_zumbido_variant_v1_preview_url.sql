-- Point the HML-only variant registry to the Preview that passed short-link QA.
do $$
declare
  tenant uuid := 'ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0';
  preview_url text := 'https://lp-ju-imersao-zumbido-k9h7bd6zl.vercel.app';
  definition uuid;
  version_id uuid;
begin
  select id, active_version_id
    into definition, version_id
  from public.landing_page_definitions
  where tenant_id = tenant and landing_key = 'imersao-zumbido'
  limit 1;

  if definition is null then
    raise exception 'HML variant definition imersao-zumbido was not found';
  end if;

  update public.landing_page_definitions
  set preview_path = preview_url,
      metadata = metadata || jsonb_build_object('preview_url', preview_url, 'production_blocked', true),
      updated_at = now()
  where id = definition;

  update public.landing_page_versions
  set preview_path = preview_url,
      qa_summary = qa_summary || jsonb_build_object('short_links', 'PASS', 'preview_protected', true),
      updated_at = now()
  where id = version_id;

  update public.norwyn_landing_registry
  set url = preview_url,
      metadata = metadata || jsonb_build_object('preview_url', preview_url, 'preview_protected', true, 'production_blocked', true),
      updated_at = now()
  where tenant_id = tenant
    and campaign_key = 'imersao_zumbido'
    and landing_key = 'imersao-zumbido';
end $$;
