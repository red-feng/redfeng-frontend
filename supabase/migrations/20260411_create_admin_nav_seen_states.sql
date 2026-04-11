create table if not exists public.admin_nav_seen_states (
  admin_user_id uuid primary key references auth.users(id) on delete cascade,
  seen_merchants_at timestamptz null,
  seen_packages_at timestamptz null,
  seen_bookings_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_nav_seen_states enable row level security;

drop policy if exists "admin_nav_seen_states_select_own" on public.admin_nav_seen_states;
create policy "admin_nav_seen_states_select_own"
  on public.admin_nav_seen_states
  for select
  to authenticated
  using (auth.uid() = admin_user_id);

drop policy if exists "admin_nav_seen_states_insert_own" on public.admin_nav_seen_states;
create policy "admin_nav_seen_states_insert_own"
  on public.admin_nav_seen_states
  for insert
  to authenticated
  with check (auth.uid() = admin_user_id);

drop policy if exists "admin_nav_seen_states_update_own" on public.admin_nav_seen_states;
create policy "admin_nav_seen_states_update_own"
  on public.admin_nav_seen_states
  for update
  to authenticated
  using (auth.uid() = admin_user_id)
  with check (auth.uid() = admin_user_id);
