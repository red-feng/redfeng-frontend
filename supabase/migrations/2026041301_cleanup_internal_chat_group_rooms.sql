-- Cleanup migration for environments that previously created internal group rooms.
-- After this migration, internal chat is DM-only.

do $$
declare
  scope_constraint_name text;
begin
  -- Remove all group-room related data first.
  delete from public.internal_chat_messages
  where room_id in (
    select id
    from public.internal_chat_rooms
    where room_scope = 'group'
       or group_code is not null
  );

  delete from public.internal_chat_room_members
  where room_id in (
    select id
    from public.internal_chat_rooms
    where room_scope = 'group'
       or group_code is not null
  );

  delete from public.internal_chat_rooms
  where room_scope = 'group'
     or group_code is not null;

  -- Force DM-only default.
  alter table public.internal_chat_rooms
    alter column room_scope set default 'dm';

  -- Remove old group index if it exists.
  drop index if exists public.internal_chat_rooms_group_code_idx;

  -- Drop any existing room_scope check constraint so we can replace it.
  select con.conname
  into scope_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'internal_chat_rooms'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%room_scope%';

  if scope_constraint_name is not null then
    execute format('alter table public.internal_chat_rooms drop constraint %I', scope_constraint_name);
  end if;

  -- Enforce DM-only scope.
  alter table public.internal_chat_rooms
    add constraint internal_chat_rooms_room_scope_check
    check (room_scope in ('dm'));
end
$$;
