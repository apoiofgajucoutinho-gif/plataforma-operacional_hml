-- Register the isolated Imersao Zumbido variant in HML without changing the
-- baseline definition, version, registry entry, assets, or historical events.
do $$
declare
  tenant uuid := 'ff24d2bc-22e2-4a5b-bc8c-f6d25a7fa3b0';
  knowledge_product uuid := '1a7ba875-9c1d-4007-9871-ae2636a722a7';
  catalog_product uuid := 'dfc00511-b160-42b0-878f-6e5b933b636b';
  campaign uuid := '6a0fbc55-c9f4-4113-9bf3-d075dc2a09ef';
  preview_url text := 'https://lp-ju-imersao-zumbido-e5sl2xg0m.vercel.app';
  definition uuid;
  version_id uuid;
begin
  if not exists (select 1 from public.tenants where id = tenant) then
    raise exception 'Expected HML tenant % was not found', tenant;
  end if;

  insert into public.landing_page_definitions (
    tenant_id, landing_key, name, product_id, campaign_id, status,
    current_environment, preview_path, production_locked, metadata
  ) values (
    tenant, 'imersao-zumbido', 'Imersão Zumbido - variant_v1',
    knowledge_product, campaign, 'HML', 'HML', preview_url, true,
    jsonb_build_object(
      'product_key', 'imersao_zumbido',
      'catalog_product_id', catalog_product,
      'variant_family', 'imersao_zumbido',
      'landing_version', 'variant_v1',
      'approved_visual_source', 'imersao_zumbido_html_v9.zip',
      'future_domain', 'https://imersao-zumbido.fgajulianacoutinho.com.br',
      'checkout_url', 'https://pay.hotmart.com/B47092539B?off=lov69pen',
      'production_blocked', true
    )
  )
  on conflict (tenant_id, landing_key) do update set
    name = excluded.name,
    product_id = excluded.product_id,
    campaign_id = excluded.campaign_id,
    status = excluded.status,
    current_environment = excluded.current_environment,
    preview_path = excluded.preview_path,
    production_locked = true,
    metadata = public.landing_page_definitions.metadata || excluded.metadata,
    updated_at = now()
  returning id into definition;

  insert into public.landing_page_versions (
    tenant_id, landing_id, version, status, change_summary, config_snapshot,
    content_snapshot, theme_snapshot, preview_path, qa_summary, immutable
  ) values (
    tenant, definition, 'variant_v1', 'HML',
    'Variante visual aprovada em Preview isolado; produção e domínio público bloqueados.',
    jsonb_build_object(
      'product_id', 'imersao_zumbido',
      'landing_key', 'imersao-zumbido',
      'landing_version', 'variant_v1',
      'checkout', 'https://pay.hotmart.com/B47092539B?off=lov69pen',
      'short_links', jsonb_build_array('/ads', '/bio', '/stories', '/whats'),
      'sections', jsonb_build_array('hero','pain','practice_change','pillars','modules','science','teachers','proof','offer','faq','final_cta')
    ),
    jsonb_build_object('source', 'imersao_zumbido_html_v9.zip', 'content_locked', true),
    jsonb_build_object('source', 'approved_html_v9', 'visual_locked', true),
    preview_url,
    jsonb_build_object(
      'local_browser_qa', 'PASS',
      'viewports', jsonb_build_array('desktop','tablet','mobile'),
      'section_events', 11,
      'pixel_purchase_client_side', false,
      'public_domain_connected', false
    ),
    false
  )
  on conflict (tenant_id, landing_id, version) do update set
    status = excluded.status,
    change_summary = excluded.change_summary,
    config_snapshot = excluded.config_snapshot,
    content_snapshot = excluded.content_snapshot,
    theme_snapshot = excluded.theme_snapshot,
    preview_path = excluded.preview_path,
    qa_summary = excluded.qa_summary,
    updated_at = now()
  returning id into version_id;

  update public.landing_page_definitions
  set active_version_id = version_id, updated_at = now()
  where id = definition;

  insert into public.norwyn_landing_registry (
    tenant_id, campaign_key, landing_key, landing_name, landing_version, url,
    product_id, hotmart_product_id, environment, status, operation_mode,
    external_owner, monitor_frequency_minutes, metadata
  ) values (
    tenant, 'imersao_zumbido', 'imersao-zumbido',
    'Imersão Zumbido - variant_v1', 'variant_v1', preview_url,
    knowledge_product, 'B47092539B', 'hml', 'active', 'NORWYN_OWNED',
    'Norwyn', 1440,
    jsonb_build_object(
      'definition_id', definition,
      'version_id', version_id,
      'catalog_product_id', catalog_product,
      'checkout_offer_id', 'lov69pen',
      'variant_family', 'imersao_zumbido',
      'future_domain', 'https://imersao-zumbido.fgajulianacoutinho.com.br',
      'preview_protected', true,
      'production_blocked', true
    )
  )
  on conflict (tenant_id, campaign_key, landing_key) do update set
    landing_name = excluded.landing_name,
    landing_version = excluded.landing_version,
    url = excluded.url,
    product_id = excluded.product_id,
    hotmart_product_id = excluded.hotmart_product_id,
    environment = excluded.environment,
    status = excluded.status,
    operation_mode = excluded.operation_mode,
    metadata = public.norwyn_landing_registry.metadata || excluded.metadata,
    updated_at = now();
end $$;
