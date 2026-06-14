alter table public.flight_booking_details
  add column if not exists lifecycle_status text not null default 'pending_payment',
  add column if not exists fare_reference_id text,
  add column if not exists fare_rechecked_at timestamptz,
  add column if not exists booking_hold_expires_at timestamptz,
  add column if not exists issue_requested_at timestamptz,
  add column if not exists issued_at timestamptz,
  add column if not exists issue_failed_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists supplier_raw_reference jsonb not null default '{}'::jsonb;

alter table public.flight_booking_details
  drop constraint if exists flight_booking_details_lifecycle_status_check;

alter table public.flight_booking_details
  add constraint flight_booking_details_lifecycle_status_check
  check (
    lifecycle_status in (
      'fare_recheck_required',
      'fare_rechecked',
      'booking_hold_created',
      'pending_payment',
      'payment_uploaded',
      'payment_verified',
      'ticketing',
      'issued',
      'issue_failed',
      'cancelled',
      'refund_required'
    )
  );

create index if not exists flight_booking_details_lifecycle_idx
  on public.flight_booking_details (lifecycle_status, departure_at desc);

create index if not exists flight_booking_details_fare_reference_idx
  on public.flight_booking_details (fare_reference_id);
