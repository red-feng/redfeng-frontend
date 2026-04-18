alter table public.commerce_chat_thread_deletions
  add column if not exists thread_type text check (thread_type in ('inquiry', 'booking'));

alter table public.commerce_chat_thread_deletions
  add column if not exists subject_package_id uuid references public.packages(id) on delete set null;

alter table public.commerce_chat_thread_deletions
  add column if not exists subject_booking_id uuid references public.bookings(id) on delete set null;

create index if not exists commerce_chat_thread_deletions_inquiry_subject_idx
  on public.commerce_chat_thread_deletions (customer_user_id, merchant_id, subject_package_id, created_at desc)
  where thread_type = 'inquiry' and subject_package_id is not null;

create index if not exists commerce_chat_thread_deletions_booking_subject_idx
  on public.commerce_chat_thread_deletions (subject_booking_id, created_at desc)
  where thread_type = 'booking' and subject_booking_id is not null;
