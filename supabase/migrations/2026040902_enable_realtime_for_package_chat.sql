alter table public.package_chat_rooms replica identity full;
alter table public.package_chat_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'package_chat_rooms'
  ) then
    alter publication supabase_realtime add table public.package_chat_rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'package_chat_messages'
  ) then
    alter publication supabase_realtime add table public.package_chat_messages;
  end if;
end
$$;
