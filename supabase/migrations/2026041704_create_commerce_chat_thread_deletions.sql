create table if not exists public.commerce_chat_thread_deletions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  merchant_user_id uuid not null references auth.users(id) on delete cascade,
  deleted_by_user_id uuid references auth.users(id) on delete set null,
  deleted_by_role text not null check (deleted_by_role in ('customer', 'merchant')),
  created_at timestamptz not null default now()
);

create index if not exists commerce_chat_thread_deletions_customer_idx
  on public.commerce_chat_thread_deletions (customer_user_id, created_at desc);

create index if not exists commerce_chat_thread_deletions_merchant_idx
  on public.commerce_chat_thread_deletions (merchant_user_id, created_at desc);

alter table public.commerce_chat_thread_deletions enable row level security;

drop policy if exists "commerce_chat_thread_deletions_select_participants" on public.commerce_chat_thread_deletions;
create policy "commerce_chat_thread_deletions_select_participants"
on public.commerce_chat_thread_deletions
for select
to authenticated
using (
  customer_user_id = auth.uid()
  or merchant_user_id = auth.uid()
);
