alter table public.hotel_booking_details
  drop constraint if exists hotel_booking_details_lifecycle_status_check;

alter table public.hotel_booking_details
  add constraint hotel_booking_details_lifecycle_status_check
  check (
    lifecycle_status in (
      'availability_requested',
      'quote_ready',
      'pending_payment',
      'payment_verified',
      'booking_submitted',
      'booking_confirmed',
      'issued',
      'issue_failed',
      'cancelled',
      'refund_required'
    )
  );
