create table if not exists public.superadmin_nav_seen_states (
  superadmin_user_id uuid primary key references public.profiles (id) on delete cascade,
  seen_ops_accounts_at timestamptz,
  seen_finance_accounts_at timestamptz,
  seen_superadmin_accounts_at timestamptz,
  seen_bookings_at timestamptz,
  seen_audit_log_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.superadmin_nav_seen_states enable row level security;

drop policy if exists "superadmin_nav_seen_states_select_own" on public.superadmin_nav_seen_states;
create policy "superadmin_nav_seen_states_select_own"
on public.superadmin_nav_seen_states
for select
to authenticated
using (auth.uid() = superadmin_user_id);

drop policy if exists "superadmin_nav_seen_states_upsert_own" on public.superadmin_nav_seen_states;
create policy "superadmin_nav_seen_states_upsert_own"
on public.superadmin_nav_seen_states
for insert
to authenticated
with check (auth.uid() = superadmin_user_id);

drop policy if exists "superadmin_nav_seen_states_update_own" on public.superadmin_nav_seen_states;
create policy "superadmin_nav_seen_states_update_own"
on public.superadmin_nav_seen_states
for update
to authenticated
using (auth.uid() = superadmin_user_id)
with check (auth.uid() = superadmin_user_id);
