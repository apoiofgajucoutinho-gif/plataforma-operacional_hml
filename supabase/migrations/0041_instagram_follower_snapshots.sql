create table if not exists public.instagram_follower_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  snapshot_date date not null,
  followers_total integer not null check (followers_total >= 0),
  source text not null default 'google_sheets',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, account_id, snapshot_date)
);

create index if not exists instagram_follower_snapshots_tenant_date_idx
  on public.instagram_follower_snapshots (tenant_id, snapshot_date desc);

drop trigger if exists instagram_follower_snapshots_set_updated_at
  on public.instagram_follower_snapshots;

create trigger instagram_follower_snapshots_set_updated_at
before update on public.instagram_follower_snapshots
for each row execute function app_private.set_updated_at();

alter table public.instagram_follower_snapshots enable row level security;

drop policy if exists "instagram follower snapshots tenant read"
  on public.instagram_follower_snapshots;

create policy "instagram follower snapshots tenant read"
on public.instagram_follower_snapshots for select
to authenticated
using (app_private.current_role(tenant_id) is not null);

grant select on public.instagram_follower_snapshots to authenticated;

insert into public.instagram_follower_snapshots (
  tenant_id,
  account_id,
  snapshot_date,
  followers_total,
  source,
  source_url
)
select
  accounts.tenant_id,
  accounts.id,
  snapshots.snapshot_date,
  snapshots.followers_total,
  'google_sheets',
  'https://docs.google.com/spreadsheets/d/1Q0JMK6eEvk4SsoWvKGw8gnwmCN9eqbuZZE_k9KQnvC8/edit?gid=0#gid=0'
from public.instagram_accounts accounts
cross join (
  values
    ('2026-04-24'::date, 16570),
    ('2026-04-25'::date, 16573),
    ('2026-04-26'::date, 16574),
    ('2026-04-30'::date, 16620),
    ('2026-05-23'::date, 16662),
    ('2026-05-24'::date, 16671),
    ('2026-05-25'::date, 16676),
    ('2026-05-26'::date, 16677),
    ('2026-05-27'::date, 16680),
    ('2026-05-28'::date, 16711),
    ('2026-05-29'::date, 16758),
    ('2026-05-30'::date, 16769),
    ('2026-05-31'::date, 16813),
    ('2026-06-01'::date, 16853),
    ('2026-06-02'::date, 16868),
    ('2026-06-03'::date, 16890),
    ('2026-06-04'::date, 16906),
    ('2026-06-05'::date, 16927),
    ('2026-06-06'::date, 16935),
    ('2026-06-07'::date, 16941),
    ('2026-06-08'::date, 16957),
    ('2026-06-09'::date, 16963),
    ('2026-06-10'::date, 16990),
    ('2026-06-11'::date, 17010),
    ('2026-06-12'::date, 17054),
    ('2026-06-13'::date, 17056),
    ('2026-06-14'::date, 17056),
    ('2026-06-15'::date, 17060),
    ('2026-06-16'::date, 17069),
    ('2026-06-17'::date, 17065),
    ('2026-06-18'::date, 17077),
    ('2026-06-19'::date, 17081),
    ('2026-06-20'::date, 17083),
    ('2026-06-21'::date, 17099),
    ('2026-06-22'::date, 17127),
    ('2026-06-23'::date, 17137)
) as snapshots(snapshot_date, followers_total)
where accounts.ativo = true
on conflict (tenant_id, account_id, snapshot_date)
do update set
  followers_total = excluded.followers_total,
  source = excluded.source,
  source_url = excluded.source_url,
  updated_at = now();
