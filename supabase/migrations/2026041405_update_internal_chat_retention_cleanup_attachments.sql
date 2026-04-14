-- Ensure internal chat retention also removes attachment objects from storage.

create or replace function public.cleanup_internal_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
  url_marker text := '/storage/v1/object/public/internal-chat-attachments/';
begin
  create temporary table if not exists _internal_chat_deleted_rows (
    attachment_url text null
  ) on commit drop;

  truncate table _internal_chat_deleted_rows;

  with deleted as (
    delete from public.internal_chat_messages
    where created_at < now() - interval '6 months'
    returning attachment_url
  )
  insert into _internal_chat_deleted_rows (attachment_url)
  select attachment_url
  from deleted;

  select count(*) into deleted_count
  from _internal_chat_deleted_rows;

  delete from storage.objects o
  where o.bucket_id = 'internal-chat-attachments'
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
      from _internal_chat_deleted_rows d
      where d.attachment_url is not null
        and position(url_marker in d.attachment_url) > 0
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
    where jobname = 'cleanup_internal_chat_messages_6_months';

    perform cron.schedule(
      'cleanup_internal_chat_messages_6_months',
      '0 3 * * *',
      'select public.cleanup_internal_chat_messages_older_than_six_months();'
    );
  end if;
end
$$;
