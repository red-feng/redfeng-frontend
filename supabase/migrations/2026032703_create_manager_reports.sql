create table if not exists public.manager_reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null check (author_role in ('operations_manager', 'finance_manager')),
  report_type text not null check (report_type in ('operations', 'finance')),
  title text not null,
  summary text not null,
  blockers text,
  next_steps text,
  metric_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists manager_reports_created_idx
  on public.manager_reports (created_at desc);

create index if not exists manager_reports_type_created_idx
  on public.manager_reports (report_type, created_at desc);

alter table public.manager_reports enable row level security;

drop policy if exists "manager_reports_select_internal" on public.manager_reports;
create policy "manager_reports_select_internal"
on public.manager_reports
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "manager_reports_insert_manager" on public.manager_reports;
create policy "manager_reports_insert_manager"
on public.manager_reports
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (
        (profiles.role = 'operations_manager' and report_type = 'operations' and author_role = 'operations_manager')
        or
        (profiles.role = 'finance_manager' and report_type = 'finance' and author_role = 'finance_manager')
        or
        (profiles.role = 'superadmin')
      )
  )
);
