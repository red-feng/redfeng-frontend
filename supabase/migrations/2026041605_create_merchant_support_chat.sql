create extension if not exists pgcrypto;

create table if not exists public.merchant_support_rooms (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  merchant_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_sender_role text check (last_message_sender_role in ('merchant', 'admin', 'system')),
  merchant_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  constraint merchant_support_rooms_unique_merchant unique (merchant_id)
);

create index if not exists merchant_support_rooms_user_idx
  on public.merchant_support_rooms (merchant_user_id, updated_at desc);

create index if not exists merchant_support_rooms_last_message_idx
  on public.merchant_support_rooms (last_message_at desc nulls last);

create table if not exists public.merchant_support_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.merchant_support_rooms(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('merchant', 'admin', 'system')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists merchant_support_messages_room_idx
  on public.merchant_support_messages (room_id, created_at asc);

alter table public.merchant_support_rooms enable row level security;
alter table public.merchant_support_messages enable row level security;

drop policy if exists "merchant_support_rooms_select_participants" on public.merchant_support_rooms;
create policy "merchant_support_rooms_select_participants"
on public.merchant_support_rooms
for select
to authenticated
using (
  auth.uid() = merchant_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "merchant_support_rooms_insert_merchant" on public.merchant_support_rooms;
create policy "merchant_support_rooms_insert_merchant"
on public.merchant_support_rooms
for insert
to authenticated
with check (
  auth.uid() = merchant_user_id
  and exists (
    select 1
    from public.merchants m
    where m.id = merchant_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "merchant_support_rooms_update_participants" on public.merchant_support_rooms;
create policy "merchant_support_rooms_update_participants"
on public.merchant_support_rooms
for update
to authenticated
using (
  auth.uid() = merchant_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
)
with check (
  auth.uid() = merchant_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "merchant_support_messages_select_participants" on public.merchant_support_messages;
create policy "merchant_support_messages_select_participants"
on public.merchant_support_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.merchant_support_rooms r
    where r.id = merchant_support_messages.room_id
      and (
        r.merchant_user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
        )
      )
  )
);

drop policy if exists "merchant_support_messages_insert_merchant" on public.merchant_support_messages;
create policy "merchant_support_messages_insert_merchant"
on public.merchant_support_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_role = 'merchant'
  and exists (
    select 1
    from public.merchant_support_rooms r
    where r.id = merchant_support_messages.room_id
      and r.merchant_user_id = auth.uid()
  )
);

drop policy if exists "merchant_support_messages_insert_admin" on public.merchant_support_messages;
create policy "merchant_support_messages_insert_admin"
on public.merchant_support_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_role = 'admin'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

alter table public.merchant_support_rooms replica identity full;
alter table public.merchant_support_messages replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'merchant_support_rooms'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.merchant_support_rooms;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'merchant_support_messages'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.merchant_support_messages;
  end if;
end
$$;
