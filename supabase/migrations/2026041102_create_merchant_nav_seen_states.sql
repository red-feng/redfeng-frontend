create table if not exists public.merchant_nav_seen_states (
  merchant_user_id uuid primary key references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  seen_packages_at timestamptz null,
  seen_orders_at timestamptz null,
  seen_calendar_at timestamptz null,
  seen_payout_at timestamptz null,
  seen_review_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists merchant_nav_seen_states_merchant_id_idx
  on public.merchant_nav_seen_states (merchant_id);

alter table public.merchant_nav_seen_states enable row level security;

drop policy if exists "merchant_nav_seen_states_select_own" on public.merchant_nav_seen_states;
create policy "merchant_nav_seen_states_select_own"
  on public.merchant_nav_seen_states
  for select
  to authenticated
  using (auth.uid() = merchant_user_id);

drop policy if exists "merchant_nav_seen_states_insert_own" on public.merchant_nav_seen_states;
create policy "merchant_nav_seen_states_insert_own"
  on public.merchant_nav_seen_states
  for insert
  to authenticated
  with check (auth.uid() = merchant_user_id);

drop policy if exists "merchant_nav_seen_states_update_own" on public.merchant_nav_seen_states;
create policy "merchant_nav_seen_states_update_own"
  on public.merchant_nav_seen_states
  for update
  to authenticated
  using (auth.uid() = merchant_user_id)
  with check (auth.uid() = merchant_user_id);
