create extension if not exists pgcrypto;

create table if not exists public.package_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  merchant_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_chat_unique_room unique (package_id, customer_id, merchant_user_id)
);

create table if not exists public.package_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.package_chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists package_chat_rooms_merchant_idx
  on public.package_chat_rooms (merchant_user_id, updated_at desc);

create index if not exists package_chat_rooms_customer_idx
  on public.package_chat_rooms (customer_id, updated_at desc);

create index if not exists package_chat_messages_room_idx
  on public.package_chat_messages (room_id, created_at asc);

alter table public.package_chat_rooms enable row level security;
alter table public.package_chat_messages enable row level security;

drop policy if exists "chat rooms participant select" on public.package_chat_rooms;
create policy "chat rooms participant select"
on public.package_chat_rooms
for select
to authenticated
using (auth.uid() = customer_id or auth.uid() = merchant_user_id);

drop policy if exists "chat rooms participant insert" on public.package_chat_rooms;
create policy "chat rooms participant insert"
on public.package_chat_rooms
for insert
to authenticated
with check (auth.uid() = customer_id or auth.uid() = merchant_user_id);

drop policy if exists "chat rooms participant update" on public.package_chat_rooms;
create policy "chat rooms participant update"
on public.package_chat_rooms
for update
to authenticated
using (auth.uid() = customer_id or auth.uid() = merchant_user_id)
with check (auth.uid() = customer_id or auth.uid() = merchant_user_id);

drop policy if exists "chat messages participant select" on public.package_chat_messages;
create policy "chat messages participant select"
on public.package_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.package_chat_rooms r
    where r.id = room_id
      and (r.customer_id = auth.uid() or r.merchant_user_id = auth.uid())
  )
);

drop policy if exists "chat messages participant insert" on public.package_chat_messages;
create policy "chat messages participant insert"
on public.package_chat_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.package_chat_rooms r
    where r.id = room_id
      and (r.customer_id = auth.uid() or r.merchant_user_id = auth.uid())
  )
);
