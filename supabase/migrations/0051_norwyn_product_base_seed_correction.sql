create or replace function public.norwyn_product_base_from_name(product_name text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(product_name, '')) like '%aasi%'
      and lower(coalesce(product_name, '')) like '%ajuste%'
      and lower(coalesce(product_name, '')) like '%rampa%'
    then 'Formação AASI'
    when lower(coalesce(product_name, '')) like '%aasi%' then 'Formação AASI'
    when lower(coalesce(product_name, '')) like '%ajuste%' then 'Ajustes Finos'
    when lower(coalesce(product_name, '')) like '%rampa%' then 'Perda em Rampa'
    when lower(coalesce(product_name, '')) like '%zumbido%' then 'Imersão Zumbido'
    else nullif(trim(coalesce(product_name, '')), '')
  end
$$;

update public.products
set
  produto_base = public.norwyn_product_base_from_name(nome_oficial),
  metadata = metadata || jsonb_build_object('seed_base_corrected_at', now())
where source = 'seed'
  and manually_edited_at is null
  and public.norwyn_product_base_from_name(nome_oficial) is not null
  and produto_base is distinct from public.norwyn_product_base_from_name(nome_oficial);

update public.product_aliases alias
set
  produto_base = product.produto_base,
  metadata = alias.metadata || jsonb_build_object('seed_base_corrected_at', now())
from public.products product
where alias.product_id = product.id
  and alias.source = 'seed'
  and alias.manually_edited_at is null
  and alias.produto_base is distinct from product.produto_base;
