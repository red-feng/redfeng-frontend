create table if not exists public.customer_experience_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  favorite_items jsonb not null default '[]'::jsonb,
  notification_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (profile_id)
);

create index if not exists customer_experience_preferences_profile_idx
  on public.customer_experience_preferences (profile_id);

alter table public.customer_experience_preferences enable row level security;

drop policy if exists "customer_experience_preferences_select_own" on public.customer_experience_preferences;
create policy "customer_experience_preferences_select_own"
on public.customer_experience_preferences
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "customer_experience_preferences_insert_own" on public.customer_experience_preferences;
create policy "customer_experience_preferences_insert_own"
on public.customer_experience_preferences
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "customer_experience_preferences_update_own" on public.customer_experience_preferences;
create policy "customer_experience_preferences_update_own"
on public.customer_experience_preferences
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "customer_experience_preferences_delete_own" on public.customer_experience_preferences;
create policy "customer_experience_preferences_delete_own"
on public.customer_experience_preferences
for delete
to authenticated
using (profile_id = auth.uid());
