alter table public.booking_admin_notes
  add column if not exists is_resolved boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by_id uuid references auth.users(id) on delete set null;

create index if not exists booking_admin_notes_booking_resolved_created_idx
  on public.booking_admin_notes (booking_id, is_resolved, is_pinned desc, created_at desc);
