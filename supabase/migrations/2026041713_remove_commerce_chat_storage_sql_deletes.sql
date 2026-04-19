-- Finalize commerce chat cleanup architecture:
-- attachment deletion is handled by backend jobs via Storage API,
-- so SQL cleanup functions should only manage relational rows.

create or replace function public.cleanup_commerce_chat_messages_older_than_six_months()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
begin
  create temporary table if not exists _commerce_chat_deleted_rows (
    thread_id uuid not null
  ) on commit drop;

  truncate table _commerce_chat_deleted_rows;

  with deleted as (
    delete from public.commerce_chat_messages
    where created_at < now() - interval '6 months'
    returning thread_id
  )
  insert into _commerce_chat_deleted_rows (thread_id)
  select thread_id
  from deleted;

  select count(*) into deleted_count
  from _commerce_chat_deleted_rows;

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

create or replace function public.purge_deleted_commerce_chat_threads()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint := 0;
begin
  delete from public.commerce_chat_messages m
  where m.thread_id in (
    select t.id
    from public.commerce_chat_threads t
    where t.deleted_for_all_at is not null
      and t.purge_after_at is not null
      and t.purge_after_at <= now()
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
