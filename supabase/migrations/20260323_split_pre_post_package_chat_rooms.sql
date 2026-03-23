alter table public.package_chat_rooms
drop constraint if exists package_chat_unique_room;

alter table public.package_chat_rooms
add column if not exists source_room_id uuid references public.package_chat_rooms(id) on delete set null;

create unique index if not exists package_chat_rooms_pre_unique_idx
  on public.package_chat_rooms (package_id, customer_id, merchant_user_id)
  where booking_id is null;

create unique index if not exists package_chat_rooms_post_unique_idx
  on public.package_chat_rooms (booking_id)
  where booking_id is not null;

create index if not exists package_chat_rooms_source_room_idx
  on public.package_chat_rooms (source_room_id);
