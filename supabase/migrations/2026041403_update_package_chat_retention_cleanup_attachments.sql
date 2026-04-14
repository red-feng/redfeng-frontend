-- Ensure package chat retention also removes attachment objects from storage.

create or replace function public.cleanup_package_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  url_marker text := '/storage/v1/object/public/package-chat-attachments/';
begin
  create temporary table if not exists _package_chat_deleted_rows (
    room_id uuid not null,
    attachment_url text null
  ) on commit drop;

  truncate table _package_chat_deleted_rows;

  with deleted as (
    delete from public.package_chat_messages
    where created_at < now() - interval '6 months'
    returning room_id, attachment_url
  )
  insert into _package_chat_deleted_rows (room_id, attachment_url)
  select room_id, attachment_url
  from deleted;

  select count(*) into deleted_count
  from _package_chat_deleted_rows;

  delete from storage.objects o
  where o.bucket_id = 'package-chat-attachments'
    and o.name in (
      select distinct
        nullif(
          split_part(
            split_part(d.attachment_url, url_marker, 2),
            '?',
            1
          ),
          ''
        )
      from _package_chat_deleted_rows d
      where d.attachment_url is not null
        and position(url_marker in d.attachment_url) > 0
    );

  with affected as (
    select distinct room_id
    from _package_chat_deleted_rows
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
    from _package_chat_deleted_rows
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
