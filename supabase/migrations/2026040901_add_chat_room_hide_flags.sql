alter table public.package_chat_rooms
add column if not exists merchant_hidden_at timestamptz,
add column if not exists customer_hidden_at timestamptz;

create index if not exists package_chat_rooms_merchant_hidden_idx
  on public.package_chat_rooms (merchant_user_id, merchant_hidden_at, updated_at desc);

create index if not exists package_chat_rooms_customer_hidden_idx
  on public.package_chat_rooms (customer_id, customer_hidden_at, updated_at desc);
