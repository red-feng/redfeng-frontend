alter table public.package_chat_rooms
add column if not exists booking_id uuid references public.bookings(id) on delete set null;

create index if not exists package_chat_rooms_booking_idx
  on public.package_chat_rooms (booking_id);

create index if not exists package_chat_rooms_merchant_booking_idx
  on public.package_chat_rooms (merchant_user_id, booking_id, updated_at desc);
