create or replace view public.commerce_chat_duplicate_inquiry_groups as
with ranked as (
  select
    t.id,
    t.thread_type,
    t.subject_package_id,
    t.customer_user_id,
    t.merchant_id,
    t.deleted_for_all_at,
    t.purge_after_at,
    t.created_at,
    t.updated_at,
    t.last_message_at,
    row_number() over (
      partition by t.customer_user_id, t.merchant_id, t.subject_package_id
      order by coalesce(t.last_message_at, t.updated_at, t.created_at) desc, t.id desc
    ) as keep_rank
  from public.commerce_chat_threads t
  where t.thread_type = 'inquiry'
    and t.subject_package_id is not null
),
grouped as (
  select
    customer_user_id,
    merchant_id,
    subject_package_id,
    count(*) as total_threads,
    count(*) filter (where deleted_for_all_at is null) as visible_threads,
    min(created_at) as oldest_created_at,
    max(coalesce(last_message_at, updated_at, created_at)) as newest_activity_at,
    array_agg(id order by keep_rank asc) as ordered_thread_ids
  from ranked
  group by customer_user_id, merchant_id, subject_package_id
)
select
  customer_user_id,
  merchant_id,
  subject_package_id,
  total_threads,
  visible_threads,
  oldest_created_at,
  newest_activity_at,
  ordered_thread_ids
from grouped
where total_threads > 1;

create or replace view public.commerce_chat_deleted_threads_pending_purge as
select
  t.id,
  t.thread_type,
  t.subject_package_id,
  t.subject_booking_id,
  t.customer_user_id,
  t.merchant_id,
  t.deleted_for_all_at,
  t.purge_after_at,
  t.created_at,
  t.updated_at,
  t.last_message_at
from public.commerce_chat_threads t
where t.deleted_for_all_at is not null
order by t.purge_after_at asc nulls last, t.deleted_for_all_at desc;
