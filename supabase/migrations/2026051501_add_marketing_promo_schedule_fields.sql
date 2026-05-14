alter table public.marketing_promos
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'scheduled', 'active', 'paused')),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

update public.marketing_promos
set status = case
  when is_active = true then 'active'
  else 'draft'
end
where status is null
   or status not in ('draft', 'scheduled', 'active', 'paused');

create index if not exists marketing_promos_status_idx
  on public.marketing_promos (status, is_active, sort_order asc, created_at asc);

create index if not exists marketing_promos_schedule_idx
  on public.marketing_promos (starts_at asc, ends_at asc);
