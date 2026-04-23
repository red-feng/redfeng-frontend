create table if not exists public.dashboard_widget_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_scope text not null,
  widget_key text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (profile_id, dashboard_scope, widget_key),
  constraint dashboard_widget_preferences_scope_check check (
    dashboard_scope in ('operations_manager')
  )
);

create index if not exists dashboard_widget_preferences_profile_scope_idx
  on public.dashboard_widget_preferences (profile_id, dashboard_scope, sort_order);

alter table public.dashboard_widget_preferences enable row level security;

drop policy if exists "dashboard_widget_preferences_select_own_or_superadmin" on public.dashboard_widget_preferences;
create policy "dashboard_widget_preferences_select_own_or_superadmin"
on public.dashboard_widget_preferences
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'superadmin'
  )
);

drop policy if exists "dashboard_widget_preferences_insert_own_operations_manager" on public.dashboard_widget_preferences;
create policy "dashboard_widget_preferences_insert_own_operations_manager"
on public.dashboard_widget_preferences
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
);

drop policy if exists "dashboard_widget_preferences_update_own_operations_manager" on public.dashboard_widget_preferences;
create policy "dashboard_widget_preferences_update_own_operations_manager"
on public.dashboard_widget_preferences
for update
to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
)
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
);

drop policy if exists "dashboard_widget_preferences_delete_own_operations_manager" on public.dashboard_widget_preferences;
create policy "dashboard_widget_preferences_delete_own_operations_manager"
on public.dashboard_widget_preferences
for delete
to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
);
