create table if not exists public.booking_admin_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists booking_admin_notes_booking_created_idx
  on public.booking_admin_notes (booking_id, created_at desc);

alter table public.booking_admin_notes enable row level security;

drop policy if exists "booking_admin_notes_select_privileged" on public.booking_admin_notes;
create policy "booking_admin_notes_select_privileged"
on public.booking_admin_notes
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin', 'finance')
  )
);

drop policy if exists "booking_admin_notes_insert_admin" on public.booking_admin_notes;
create policy "booking_admin_notes_insert_admin"
on public.booking_admin_notes
for insert
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
  )
);
