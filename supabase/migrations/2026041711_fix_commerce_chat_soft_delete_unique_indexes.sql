-- Allow creating a new inquiry/booking thread after the previous one was soft-deleted.

drop index if exists public.commerce_chat_threads_inquiry_unique_idx;

create unique index if not exists commerce_chat_threads_inquiry_unique_idx
  on public.commerce_chat_threads (customer_user_id, merchant_id, subject_package_id)
  where thread_type = 'inquiry'
    and subject_package_id is not null
    and deleted_for_all_at is null;

drop index if exists public.commerce_chat_threads_booking_unique_idx;

create unique index if not exists commerce_chat_threads_booking_unique_idx
  on public.commerce_chat_threads (subject_booking_id)
  where thread_type = 'booking'
    and subject_booking_id is not null
    and deleted_for_all_at is null;
