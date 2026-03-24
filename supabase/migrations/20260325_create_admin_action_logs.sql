create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_role text,
  target_type text not null check (target_type in ('merchant', 'package', 'booking')),
  target_id uuid not null,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_action_logs_created_at_idx
  on public.admin_action_logs (created_at desc);

create index if not exists admin_action_logs_target_idx
  on public.admin_action_logs (target_type, target_id, created_at desc);

alter table public.admin_action_logs enable row level security;

drop policy if exists "admin_action_logs_select_internal" on public.admin_action_logs;
create policy "admin_action_logs_select_internal"
on public.admin_action_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin', 'finance')
  )
);

drop policy if exists "admin_action_logs_insert_internal" on public.admin_action_logs;
create policy "admin_action_logs_insert_internal"
on public.admin_action_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
  )
);
