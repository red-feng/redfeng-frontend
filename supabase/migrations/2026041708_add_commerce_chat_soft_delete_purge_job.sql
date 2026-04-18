-- Purge commerce chat threads that were globally soft-deleted and passed purge_after_at.

create or replace function public.purge_deleted_commerce_chat_threads()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  url_marker text := '/storage/v1/object/public/commerce-chat-attachments/';
begin
  create temporary table if not exists _commerce_chat_purged_threads (
    thread_id uuid not null,
    attachment_url text null
  ) on commit drop;

  truncate table _commerce_chat_purged_threads;

  with targets as (
    select t.id
    from public.commerce_chat_threads t
    where t.deleted_for_all_at is not null
      and t.purge_after_at is not null
      and t.purge_after_at <= now()
  ),
  deleted_messages as (
    delete from public.commerce_chat_messages m
    where m.thread_id in (select id from targets)
    returning m.thread_id, m.attachment_url
  )
  insert into _commerce_chat_purged_threads (thread_id, attachment_url)
  select thread_id, attachment_url
  from deleted_messages;

  delete from storage.objects o
  where o.bucket_id = 'commerce-chat-attachments'
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
      from _commerce_chat_purged_threads d
      where d.attachment_url is not null
        and position(url_marker in d.attachment_url) > 0
    );

  with deleted_threads as (
    delete from public.commerce_chat_threads t
    where t.deleted_for_all_at is not null
      and t.purge_after_at is not null
      and t.purge_after_at <= now()
    returning t.id
  )
  select count(*) into deleted_count
  from deleted_threads;

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
    where jobname = 'purge_deleted_commerce_chat_threads';

    perform cron.schedule(
      'purge_deleted_commerce_chat_threads',
      '0 4 * * *',
      'select public.purge_deleted_commerce_chat_threads();'
    );
  end if;
end
$$;
