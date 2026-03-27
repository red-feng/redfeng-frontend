alter table public.booking_admin_notes
  add column if not exists note_type text not null default 'general',
  add column if not exists is_pinned boolean not null default false;

alter table public.booking_admin_notes
  drop constraint if exists booking_admin_notes_note_type_check;

alter table public.booking_admin_notes
  add constraint booking_admin_notes_note_type_check
  check (note_type in ('general', 'urgent', 'follow_up_merchant', 'follow_up_payment', 'finance_issue'));

create index if not exists booking_admin_notes_booking_pinned_created_idx
  on public.booking_admin_notes (booking_id, is_pinned desc, created_at desc);
