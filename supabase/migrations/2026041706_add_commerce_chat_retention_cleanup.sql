-- Commerce chat retention cleanup:
-- 1) remove message rows older than 6 months
-- 2) remove matching attachment objects from storage
-- 3) recompute thread summaries after message cleanup
-- 4) prune deletion markers older than 45 days

create or replace function public.cleanup_commerce_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  url_marker text := '/storage/v1/object/public/commerce-chat-attachments/';
begin
  create temporary table if not exists _commerce_chat_deleted_rows (
    thread_id uuid not null,
    attachment_url text null
  ) on commit drop;

  truncate table _commerce_chat_deleted_rows;

  with deleted as (
    delete from public.commerce_chat_messages
    where created_at < now() - interval '6 months'
    returning thread_id, attachment_url
  )
  insert into _commerce_chat_deleted_rows (thread_id, attachment_url)
  select thread_id, attachment_url
  from deleted;

  select count(*) into deleted_count
  from _commerce_chat_deleted_rows;

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
      from _commerce_chat_deleted_rows d
      where d.attachment_url is not null
        and position(url_marker in d.attachment_url) > 0
    );

  with affected as (
    select distinct thread_id
    from _commerce_chat_deleted_rows
  ),
  latest as (
    select distinct on (m.thread_id)
      m.thread_id,
      m.created_at,
      m.sender_role
    from public.commerce_chat_messages m
    join affected a on a.thread_id = m.thread_id
    order by m.thread_id, m.created_at desc, m.id desc
  )
  update public.commerce_chat_threads t
  set
    updated_at = greatest(coalesce(t.updated_at, l.created_at), l.created_at),
    last_message_at = l.created_at,
    last_message_sender_role = l.sender_role
  from latest l
  where t.id = l.thread_id;

  update public.commerce_chat_threads t
  set
    last_message_at = null,
    last_message_sender_role = null
  where t.id in (
    select distinct thread_id
    from _commerce_chat_deleted_rows
  )
  and not exists (
    select 1
    from public.commerce_chat_messages m
    where m.thread_id = t.id
  );

  return coalesce(deleted_count, 0);
end;
$$;

create or replace function public.cleanup_commerce_chat_thread_deletions_older_than_forty_five_days()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
begin
  with deleted as (
    delete from public.commerce_chat_thread_deletions
    where created_at < now() - interval '45 days'
    returning id
  )
  select count(*) into deleted_count
  from deleted;

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
    where jobname = 'cleanup_commerce_chat_messages_6_months';

    perform cron.schedule(
      'cleanup_commerce_chat_messages_6_months',
      '30 3 * * *',
      'select public.cleanup_commerce_chat_messages_older_than_six_months();'
    );

    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup_commerce_chat_thread_deletions_45_days';

    perform cron.schedule(
      'cleanup_commerce_chat_thread_deletions_45_days',
      '45 3 * * *',
      'select public.cleanup_commerce_chat_thread_deletions_older_than_forty_five_days();'
    );
  end if;
end
$$;
