-- P1.2.1 Student 360 closure: canonical enrollment product mapping and Club match helpers.
-- Raw Hotmart/comercial payloads are not changed. Only derived enrollment canonical ids and audit views are affected.

create or replace view public.norwyn_student_360_commercial_product_map
with (security_invoker = true)
as
with mapped as (
  select cp.id as commercial_product_id, cp.tenant_id, cp.hotmart_product_id, cp.nome as commercial_product_name,
         p.id as canonical_product_id, p.nome_oficial as canonical_product_name, p.produto_base,
         'PRODUCT_NAME'::text as product_matched_by, 90::integer as product_match_confidence
  from public.comercial_produtos cp
  join public.products p
    on p.tenant_id = cp.tenant_id
   and regexp_replace(lower(coalesce(p.nome_oficial, '')), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(cp.nome, '')), '[^a-z0-9]+', '', 'g')
  union all
  select cp.id, cp.tenant_id, cp.hotmart_product_id, cp.nome,
         p.id, p.nome_oficial, coalesce(pa.produto_base, p.produto_base),
         'PRODUCT_ALIAS'::text, coalesce(pa.confianca, 80)::integer
  from public.comercial_produtos cp
  join public.product_aliases pa
    on pa.tenant_id = cp.tenant_id
   and coalesce(pa.ativo, true) = true
   and regexp_replace(lower(coalesce(pa.alias, '')), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(cp.nome, '')), '[^a-z0-9]+', '', 'g')
  join public.products p on p.id = pa.product_id
)
select distinct on (commercial_product_id) *
from mapped
order by commercial_product_id, product_match_confidence desc, product_matched_by;

grant select on public.norwyn_student_360_commercial_product_map to authenticated;

update public.norwyn_customer_enrollments e
set canonical_product_id = m.canonical_product_id,
    updated_at = now()
from public.norwyn_student_360_commercial_product_map m
where e.commercial_product_id = m.commercial_product_id
  and m.canonical_product_id is not null
  and e.canonical_product_id is distinct from m.canonical_product_id;

create or replace view public.norwyn_student_360_club_match_candidates
with (security_invoker = true)
as
select le.tenant_id, le.event_id, c.id as customer_id, pm.canonical_product_id, e.id as enrollment_id
from public.norwyn_hotmart_learning_events le
left join public.norwyn_customers c
  on c.tenant_id = le.tenant_id and lower(c.primary_email) = lower(le.buyer_email)
left join public.comercial_produtos cp
  on cp.tenant_id = le.tenant_id and cp.hotmart_product_id = le.hotmart_product_id
left join public.norwyn_student_360_commercial_product_map pm
  on pm.commercial_product_id = cp.id
left join public.norwyn_customer_enrollments e
  on e.tenant_id = le.tenant_id and e.customer_id = c.id and e.canonical_product_id = pm.canonical_product_id;

grant select on public.norwyn_student_360_club_match_candidates to authenticated;

create or replace view public.norwyn_student_360_club_base_candidates
with (security_invoker = true)
as
select le.event_id, c.id as customer_id, pm.produto_base as event_base, e.id as enrollment_id
from public.norwyn_hotmart_learning_events le
join public.norwyn_customers c
  on c.tenant_id = le.tenant_id and lower(c.primary_email) = lower(le.buyer_email)
join public.comercial_produtos cp
  on cp.tenant_id = le.tenant_id and cp.hotmart_product_id = le.hotmart_product_id
join public.norwyn_student_360_commercial_product_map pm
  on pm.commercial_product_id = cp.id
join public.norwyn_customer_enrollments e
  on e.tenant_id = le.tenant_id and e.customer_id = c.id
join public.norwyn_student_360_commercial_product_map epm
  on epm.commercial_product_id = e.commercial_product_id and epm.produto_base = pm.produto_base
where e.commercial_product_id is distinct from cp.id;

grant select on public.norwyn_student_360_club_base_candidates to authenticated;
