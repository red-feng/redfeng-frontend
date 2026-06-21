alter table public.hotel_availability_requests
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists quote_sent_at timestamptz;

create index if not exists hotel_availability_requests_booking_idx
  on public.hotel_availability_requests (booking_id, created_at desc);

create table if not exists public.hotel_booking_details (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  availability_request_id uuid references public.hotel_availability_requests(id) on delete set null,
  supplier_order_id uuid references public.supplier_orders(id) on delete set null,
  hotel_id text,
  hotel_name text not null,
  hotel_location text,
  property_type text,
  checkin_date date not null,
  checkout_date date not null,
  night_count integer not null default 1,
  room_count integer not null default 1,
  adult_count integer not null default 1,
  child_count integer not null default 0,
  room_name text,
  meal_plan text,
  cancellation_policy text,
  supplier_internal_code text,
  supplier_room_id text,
  supplier_breakfast_id text,
  reservation_no text,
  voucher_no text,
  supplier_booking_status text,
  supplier_total_price numeric(14,2),
  issue_time_limit timestamptz,
  lifecycle_status text not null default 'quote_ready',
  supplier_raw_reference jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hotel_booking_details_lifecycle_status_check
    check (
      lifecycle_status in (
        'availability_requested',
        'quote_ready',
        'pending_payment',
        'payment_verified',
        'booking_submitted',
        'issued',
        'issue_failed',
        'cancelled',
        'refund_required'
      )
    ),
  constraint hotel_booking_details_guest_count_check
    check (adult_count >= 1 and child_count >= 0 and room_count >= 1 and night_count >= 1)
);

create index if not exists hotel_booking_details_lifecycle_idx
  on public.hotel_booking_details (lifecycle_status, checkin_date desc);

create index if not exists hotel_booking_details_stay_idx
  on public.hotel_booking_details (hotel_id, checkin_date, checkout_date);

alter table public.hotel_booking_details enable row level security;

drop policy if exists "hotel_booking_details_select_owner_or_internal" on public.hotel_booking_details;
create policy "hotel_booking_details_select_owner_or_internal"
on public.hotel_booking_details
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = hotel_booking_details.booking_id
      and (
        bookings.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
        )
      )
  )
);

drop policy if exists "hotel_booking_details_write_internal" on public.hotel_booking_details;
create policy "hotel_booking_details_write_internal"
on public.hotel_booking_details
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
);
