-- Run this in Supabase SQL Editor to verify the required merchant feature migrations.

-- 1. Check required columns on package_chat_rooms.
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'package_chat_rooms'
  and column_name in (
    'booking_id',
    'last_message_at',
    'last_message_sender_id',
    'merchant_last_read_at',
    'customer_last_read_at'
  )
order by column_name;

-- 2. Check required tables exist.
select
  tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'package_reviews',
    'package_views',
    'payout_requests'
  )
order by tablename;

-- 3. Check indexes exist.
select
  tablename,
  indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'package_chat_rooms_booking_idx',
    'package_chat_rooms_merchant_booking_idx',
    'package_chat_rooms_last_message_idx',
    'package_reviews_package_idx',
    'package_views_package_idx',
    'package_views_package_session_day_idx',
    'payout_requests_merchant_idx'
  )
order by indexname;

-- 4. Check row counts for feature tables.
select 'package_chat_rooms' as table_name, count(*) as total_rows from public.package_chat_rooms
union all
select 'package_reviews' as table_name, count(*) as total_rows from public.package_reviews
union all
select 'package_views' as table_name, count(*) as total_rows from public.package_views
union all
select 'payout_requests' as table_name, count(*) as total_rows from public.payout_requests;

-- 5. Optional: inspect latest feature rows.
select id, booking_id, last_message_at, merchant_last_read_at, customer_last_read_at
from public.package_chat_rooms
order by updated_at desc
limit 10;

select id, booking_id, package_id, rating, created_at
from public.package_reviews
order by created_at desc
limit 10;

select id, package_id, session_id, viewed_at
from public.package_views
order by viewed_at desc
limit 10;

select id, merchant_id, amount, status, requested_at, processed_at
from public.payout_requests
order by requested_at desc
limit 10;
