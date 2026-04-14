-- Retention policy: remove internal chat messages older than 6 months.

create index if not exists internal_chat_messages_created_at_idx
  on public.internal_chat_messages (created_at);

create or replace function public.cleanup_internal_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.internal_chat_messages
  where created_at < now() - interval '6 months';

  get diagnostics deleted_count = row_count;
  return deleted_count;
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
