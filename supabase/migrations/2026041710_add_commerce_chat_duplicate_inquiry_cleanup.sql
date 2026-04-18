-- One-time helper to soft-delete duplicate inquiry threads while keeping the newest logical thread visible.

create or replace function public.cleanup_duplicate_commerce_inquiry_threads()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count bigint := 0;
  deleted_at_iso timestamptz := now();
  purge_after_iso timestamptz := now() + interval '30 days';
begin
  with ranked as (
    select
      t.id,
      t.thread_type,
      t.subject_package_id,
      t.subject_booking_id,
      t.customer_user_id,
      t.merchant_id,
      t.merchant_user_id,
      t.deleted_for_all_at,
      row_number() over (
        partition by t.customer_user_id, t.merchant_id, t.subject_package_id
        order by coalesce(t.last_message_at, t.updated_at, t.created_at) desc, t.id desc
      ) as keep_rank
    from public.commerce_chat_threads t
    where t.thread_type = 'inquiry'
      and t.subject_package_id is not null
  ),
  duplicates as (
    select *
    from ranked
    where keep_rank > 1
      and deleted_for_all_at is null
  ),
  marked_threads as (
    update public.commerce_chat_threads t
    set
      deleted_for_all_at = deleted_at_iso,
      deleted_by_role = coalesce(t.deleted_by_role, 'merchant'),
      purge_after_at = coalesce(t.purge_after_at, purge_after_iso),
      updated_at = deleted_at_iso
    from duplicates d
    where t.id = d.id
    returning
      t.id,
      t.thread_type,
      t.subject_package_id,
      t.subject_booking_id,
      t.customer_user_id,
      t.merchant_id,
      t.merchant_user_id
  ),
  inserted_markers as (
    insert into public.commerce_chat_thread_deletions (
      thread_id,
      thread_type,
      subject_package_id,
      subject_booking_id,
      customer_user_id,
      merchant_id,
      merchant_user_id,
      deleted_by_user_id,
      deleted_by_role
    )
    select
      m.id,
      m.thread_type,
      m.subject_package_id,
      m.subject_booking_id,
      m.customer_user_id,
      m.merchant_id,
      m.merchant_user_id,
      null,
      'merchant'
    from marked_threads m
    returning thread_id
  )
  select count(*) into affected_count
  from inserted_markers;

  return coalesce(affected_count, 0);
end;
$$;
