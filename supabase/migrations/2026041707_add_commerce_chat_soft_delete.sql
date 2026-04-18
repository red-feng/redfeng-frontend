alter table public.commerce_chat_threads
  add column if not exists deleted_for_all_at timestamptz,
  add column if not exists deleted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted_by_role text check (deleted_by_role in ('customer', 'merchant')),
  add column if not exists purge_after_at timestamptz;

create index if not exists commerce_chat_threads_deleted_for_all_idx
  on public.commerce_chat_threads (deleted_for_all_at, purge_after_at);

create index if not exists commerce_chat_threads_customer_visible_idx
  on public.commerce_chat_threads (customer_user_id, deleted_for_all_at, last_message_at desc nulls last, updated_at desc);

create index if not exists commerce_chat_threads_merchant_visible_idx
  on public.commerce_chat_threads (merchant_user_id, deleted_for_all_at, last_message_at desc nulls last, updated_at desc);
