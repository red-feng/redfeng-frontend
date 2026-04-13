create extension if not exists pgcrypto;

create table if not exists public.internal_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_scope text not null check (room_scope in ('group', 'dm')),
  group_code text,
  room_key text,
  name text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_sender_id uuid references auth.users(id) on delete set null
);

create unique index if not exists internal_chat_rooms_group_code_idx
  on public.internal_chat_rooms (group_code)
  where room_scope = 'group' and group_code is not null;

create unique index if not exists internal_chat_rooms_room_key_idx
  on public.internal_chat_rooms (room_key)
  where room_scope = 'dm' and room_key is not null;

create index if not exists internal_chat_rooms_updated_at_idx
  on public.internal_chat_rooms (updated_at desc);

create table if not exists public.internal_chat_room_members (
  room_id uuid not null references public.internal_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (room_id, user_id)
);

create index if not exists internal_chat_room_members_user_idx
  on public.internal_chat_room_members (user_id, room_id);

create table if not exists public.internal_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.internal_chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists internal_chat_messages_room_created_idx
  on public.internal_chat_messages (room_id, created_at asc);

insert into public.internal_chat_rooms (room_scope, group_code, name, description)
values
  ('group', 'all_internal', 'All Internal', 'Room semua akun internal Red Feng'),
  ('group', 'ops_managers', 'Ops Managers', 'Room khusus operations manager'),
  ('group', 'finance_managers', 'Finance Managers', 'Room khusus finance manager'),
  ('group', 'superadmins', 'Superadmins', 'Room khusus antar superadmin'),
  ('group', 'superadmin_managers', 'Superadmin + Managers', 'Room superadmin dengan semua manager')
on conflict do nothing;

alter table public.internal_chat_rooms enable row level security;
alter table public.internal_chat_room_members enable row level security;
alter table public.internal_chat_messages enable row level security;

drop policy if exists "internal_chat_rooms_select_member" on public.internal_chat_rooms;
create policy "internal_chat_rooms_select_member"
on public.internal_chat_rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.internal_chat_room_members m
    join public.profiles p on p.id = auth.uid()
    where m.room_id = internal_chat_rooms.id
      and m.user_id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "internal_chat_room_members_select_own" on public.internal_chat_room_members;
create policy "internal_chat_room_members_select_own"
on public.internal_chat_room_members
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "internal_chat_room_members_update_own" on public.internal_chat_room_members;
create policy "internal_chat_room_members_update_own"
on public.internal_chat_room_members
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "internal_chat_messages_select_member" on public.internal_chat_messages;
create policy "internal_chat_messages_select_member"
on public.internal_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.internal_chat_room_members m
    join public.profiles p on p.id = auth.uid()
    where m.room_id = internal_chat_messages.room_id
      and m.user_id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "internal_chat_messages_insert_member_sender" on public.internal_chat_messages;
create policy "internal_chat_messages_insert_member_sender"
on public.internal_chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.internal_chat_room_members m
    join public.profiles p on p.id = auth.uid()
    where m.room_id = internal_chat_messages.room_id
      and m.user_id = auth.uid()
      and p.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

alter table public.internal_chat_rooms replica identity full;
alter table public.internal_chat_room_members replica identity full;
alter table public.internal_chat_messages replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'internal_chat_rooms'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.internal_chat_rooms;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'internal_chat_messages'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.internal_chat_messages;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'internal_chat_room_members'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.internal_chat_room_members;
  end if;
end
$$;
