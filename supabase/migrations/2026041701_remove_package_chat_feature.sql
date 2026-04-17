do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup_package_chat_messages_6_months';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'cleanup_package_chat_messages_older_than_six_months'
      and pg_function_is_visible(oid)
  ) then
    drop function public.cleanup_package_chat_messages_older_than_six_months();
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'package_chat_messages'
  ) then
    alter publication supabase_realtime drop table public.package_chat_messages;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'package_chat_rooms'
  ) then
    alter publication supabase_realtime drop table public.package_chat_rooms;
  end if;
end
$$;

drop table if exists public.package_chat_messages cascade;
drop table if exists public.package_chat_rooms cascade;
