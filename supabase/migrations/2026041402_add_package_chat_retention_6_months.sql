-- Retention policy: remove package chat messages older than 6 months.
-- Keep room metadata consistent after cleanup.

create index if not exists package_chat_messages_created_at_idx
  on public.package_chat_messages (created_at);

create or replace function public.cleanup_package_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
begin
  create temporary table if not exists _package_chat_deleted_rooms (
    room_id uuid not null
  ) on commit drop;

  truncate table _package_chat_deleted_rooms;

  with deleted as (
    delete from public.package_chat_messages
    where created_at < now() - interval '6 months'
    returning room_id
  )
  insert into _package_chat_deleted_rooms (room_id)
  select room_id from deleted;

  select count(*) into deleted_count
  from _package_chat_deleted_rooms;

  with affected as (
    select distinct room_id
    from _package_chat_deleted_rooms
  ),
  latest as (
    select distinct on (m.room_id)
      m.room_id,
      m.created_at,
      m.sender_id
    from public.package_chat_messages m
    join affected a on a.room_id = m.room_id
    order by m.room_id, m.created_at desc, m.id desc
  )
  update public.package_chat_rooms r
  set
    last_message_at = l.created_at,
    last_message_sender_id = l.sender_id
  from latest l
  where r.id = l.room_id;

  update public.package_chat_rooms r
  set
    last_message_at = null,
    last_message_sender_id = null
  where r.id in (
    select distinct room_id
    from _package_chat_deleted_rooms
  )
  and not exists (
    select 1
    from public.package_chat_messages m
    where m.room_id = r.id
  );

  return coalesce(deleted_count, 0);
end;
$$;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      null;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup_package_chat_messages_6_months';

    perform cron.schedule(
      'cleanup_package_chat_messages_6_months',
      '15 3 * * *',
      'select public.cleanup_package_chat_messages_older_than_six_months();'
    );
  end if;
end
$$;
