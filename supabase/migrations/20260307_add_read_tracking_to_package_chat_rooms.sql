alter table public.package_chat_rooms
add column if not exists last_message_at timestamptz,
add column if not exists last_message_sender_id uuid references auth.users(id) on delete set null,
add column if not exists merchant_last_read_at timestamptz,
add column if not exists customer_last_read_at timestamptz;

create index if not exists package_chat_rooms_last_message_idx
  on public.package_chat_rooms (merchant_user_id, last_message_at desc);
