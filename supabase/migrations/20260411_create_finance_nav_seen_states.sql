create table if not exists public.finance_nav_seen_states (
  finance_user_id uuid primary key references auth.users(id) on delete cascade,
  seen_refunds_at timestamptz null,
  seen_payouts_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.finance_nav_seen_states enable row level security;

drop policy if exists "finance_nav_seen_states_select_own" on public.finance_nav_seen_states;
create policy "finance_nav_seen_states_select_own"
  on public.finance_nav_seen_states
  for select
  to authenticated
  using (auth.uid() = finance_user_id);

drop policy if exists "finance_nav_seen_states_insert_own" on public.finance_nav_seen_states;
create policy "finance_nav_seen_states_insert_own"
  on public.finance_nav_seen_states
  for insert
  to authenticated
  with check (auth.uid() = finance_user_id);

drop policy if exists "finance_nav_seen_states_update_own" on public.finance_nav_seen_states;
create policy "finance_nav_seen_states_update_own"
  on public.finance_nav_seen_states
  for update
  to authenticated
  using (auth.uid() = finance_user_id)
  with check (auth.uid() = finance_user_id);
