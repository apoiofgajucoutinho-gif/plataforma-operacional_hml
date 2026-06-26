-- Reset seguro da tabela de Ads antes da carga cheia de 2026.
-- Execute no Supabase SQL Editor apenas quando quiser substituir a base atual.
-- O backup preserva os dados atuais para conferencia ou rollback manual.

create table if not exists public.instagram_ads_daily_backup_before_2026_reload
as
select *
from public.instagram_ads_daily;

truncate table public.instagram_ads_daily;

-- Conferencia esperada apos o truncate: total_rows = 0.
select count(*) as total_rows
from public.instagram_ads_daily;
