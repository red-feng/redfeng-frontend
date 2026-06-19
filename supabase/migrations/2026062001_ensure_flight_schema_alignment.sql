create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  supplier_name text not null,
  supplier_type text not null default 'affiliate',
  integration_mode text not null default 'manual',
  status text not null default 'active',
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.suppliers
  add column if not exists supplier_code text,
  add column if not exists supplier_name text,
  add column if not exists supplier_type text not null default 'affiliate',
  add column if not exists integration_mode text not null default 'manual',
  add column if not exists status text not null default 'active',
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.supplier_product_channels (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_type text not null,
  channel_status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (supplier_id, product_type)
);

alter table public.supplier_product_channels
  add column if not exists product_type text,
  add column if not exists channel_status text not null default 'active',
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.bookings
  add column if not exists fulfillment_mode text not null default 'internal',
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists supplier_booking_reference text,
  add column if not exists supplier_order_status text not null default 'not_applicable',
  add column if not exists redfeng_profit_source text not null default 'unknown',
  add column if not exists redfeng_merchant_commission_amount numeric,
  add column if not exists supplier_net_cost_amount numeric,
  add column if not exists redfeng_spread_amount numeric,
  add column if not exists redfeng_recorded_profit_amount numeric,
  add column if not exists profit_recorded_at timestamptz;

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_type text not null,
  supplier_order_id text,
  supplier_reference text,
  supplier_status text not null default 'pending_submission',
  submission_mode text not null default 'manual',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  last_error text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  synced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (booking_id, supplier_id)
);

alter table public.supplier_orders
  add column if not exists supplier_order_id text,
  add column if not exists supplier_reference text,
  add column if not exists supplier_status text not null default 'pending_submission',
  add column if not exists submission_mode text not null default 'manual',
  add column if not exists request_payload jsonb not null default '{}'::jsonb,
  add column if not exists response_payload jsonb not null default '{}'::jsonb,
  add column if not exists last_error text,
  add column if not exists submitted_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists synced_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists supplier_cost_amount numeric,
  add column if not exists supplier_cost_currency text not null default 'IDR',
  add column if not exists supplier_cost_recorded_at timestamptz;

create table if not exists public.supplier_order_events (
  id uuid primary key default gen_random_uuid(),
  supplier_order_id uuid not null references public.supplier_orders(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.flight_booking_details (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  airline_name text not null,
  flight_number text not null,
  origin_airport_code text not null,
  destination_airport_code text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz,
  cabin_class text not null default 'economy',
  passenger_count integer not null default 1,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.flight_booking_details
  add column if not exists supplier_order_id uuid references public.supplier_orders(id) on delete set null,
  add column if not exists airline_code text,
  add column if not exists airline_name text,
  add column if not exists flight_number text,
  add column if not exists origin_airport_code text,
  add column if not exists origin_airport_name text,
  add column if not exists destination_airport_code text,
  add column if not exists destination_airport_name text,
  add column if not exists departure_at timestamptz,
  add column if not exists arrival_at timestamptz,
  add column if not exists return_at timestamptz,
  add column if not exists cabin_class text not null default 'economy',
  add column if not exists trip_type text not null default 'one_way',
  add column if not exists passenger_count integer not null default 1,
  add column if not exists fare_brand text,
  add column if not exists pnr_code text,
  add column if not exists ticket_number text,
  add column if not exists supplier_confirmation_code text,
  add column if not exists issue_status text not null default 'pending_confirmation',
  add column if not exists latest_schedule_change_at timestamptz,
  add column if not exists baggage_summary text,
  add column if not exists lifecycle_status text not null default 'pending_payment',
  add column if not exists fare_reference_id text,
  add column if not exists fare_rechecked_at timestamptz,
  add column if not exists booking_hold_expires_at timestamptz,
  add column if not exists issue_requested_at timestamptz,
  add column if not exists issued_at timestamptz,
  add column if not exists issue_failed_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists supplier_raw_reference jsonb not null default '{}'::jsonb,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.supplier_orders
set
  supplier_status = coalesce(supplier_status, 'pending_submission'),
  submission_mode = coalesce(submission_mode, 'manual'),
  request_payload = coalesce(request_payload, '{}'::jsonb),
  response_payload = coalesce(response_payload, '{}'::jsonb),
  supplier_cost_currency = coalesce(nullif(trim(supplier_cost_currency), ''), 'IDR');

update public.flight_booking_details
set
  cabin_class = coalesce(cabin_class, 'economy'),
  trip_type = coalesce(trip_type, 'one_way'),
  passenger_count = coalesce(nullif(passenger_count, 0), 1),
  issue_status = coalesce(issue_status, 'pending_confirmation'),
  lifecycle_status = coalesce(lifecycle_status, 'pending_payment'),
  supplier_raw_reference = coalesce(supplier_raw_reference, '{}'::jsonb);

alter table public.suppliers
  drop constraint if exists suppliers_supplier_type_check,
  drop constraint if exists suppliers_integration_mode_check,
  drop constraint if exists suppliers_status_check;

alter table public.suppliers
  add constraint suppliers_supplier_type_check
  check (supplier_type in ('internal', 'affiliate', 'aggregator', 'manual_partner')) not valid,
  add constraint suppliers_integration_mode_check
  check (integration_mode in ('manual', 'api', 'portal', 'email')) not valid,
  add constraint suppliers_status_check
  check (status in ('active', 'inactive', 'suspended')) not valid;

alter table public.supplier_product_channels
  drop constraint if exists supplier_product_channels_product_type_check,
  drop constraint if exists supplier_product_channels_channel_status_check;

alter table public.supplier_product_channels
  add constraint supplier_product_channels_product_type_check
  check (product_type in ('flight', 'hotel', 'train', 'bus', 'sea', 'cruise')) not valid,
  add constraint supplier_product_channels_channel_status_check
  check (channel_status in ('active', 'inactive', 'pilot')) not valid;

alter table public.bookings
  drop constraint if exists bookings_fulfillment_mode_check,
  drop constraint if exists bookings_supplier_order_status_check,
  drop constraint if exists bookings_redfeng_profit_source_check;

alter table public.bookings
  add constraint bookings_fulfillment_mode_check
  check (fulfillment_mode in ('internal', 'affiliate_api', 'affiliate_manual')) not valid,
  add constraint bookings_supplier_order_status_check
  check (
    supplier_order_status in (
      'not_applicable',
      'draft',
      'pending_submission',
      'submitted',
      'confirmed',
      'issued',
      'failed',
      'cancel_requested',
      'cancelled',
      'refund_requested',
      'refunded'
    )
  ) not valid,
  add constraint bookings_redfeng_profit_source_check
  check (redfeng_profit_source in ('unknown', 'package_tour', 'non_package_spread', 'mixed')) not valid;

alter table public.supplier_orders
  drop constraint if exists supplier_orders_product_type_check,
  drop constraint if exists supplier_orders_supplier_status_check,
  drop constraint if exists supplier_orders_submission_mode_check,
  drop constraint if exists supplier_orders_supplier_cost_currency_check;

alter table public.supplier_orders
  add constraint supplier_orders_product_type_check
  check (product_type in ('flight', 'hotel', 'train', 'bus', 'sea', 'cruise')) not valid,
  add constraint supplier_orders_supplier_status_check
  check (
    supplier_status in (
      'draft',
      'pending_submission',
      'submitted',
      'confirmed',
      'issued',
      'failed',
      'cancel_requested',
      'cancelled',
      'refund_requested',
      'refunded'
    )
  ) not valid,
  add constraint supplier_orders_submission_mode_check
  check (submission_mode in ('manual', 'api', 'portal', 'email')) not valid,
  add constraint supplier_orders_supplier_cost_currency_check
  check (char_length(trim(supplier_cost_currency)) >= 3) not valid;

alter table public.flight_booking_details
  drop constraint if exists flight_booking_details_cabin_class_check,
  drop constraint if exists flight_booking_details_passenger_count_check,
  drop constraint if exists flight_booking_details_trip_type_check,
  drop constraint if exists flight_booking_details_issue_status_check,
  drop constraint if exists flight_booking_details_lifecycle_status_check;

alter table public.flight_booking_details
  add constraint flight_booking_details_cabin_class_check
  check (cabin_class in ('economy', 'premium_economy', 'business', 'first')) not valid,
  add constraint flight_booking_details_passenger_count_check
  check (passenger_count > 0) not valid,
  add constraint flight_booking_details_trip_type_check
  check (trip_type in ('one_way', 'round_trip', 'multi_city')) not valid,
  add constraint flight_booking_details_issue_status_check
  check (
    issue_status in (
      'pending_confirmation',
      'confirmed',
      'ticketing',
      'issued',
      'issue_failed',
      'reschedule_requested',
      'cancel_requested',
      'cancelled',
      'refunded'
    )
  ) not valid,
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
  ) not valid;

create index if not exists suppliers_status_idx
  on public.suppliers (status, supplier_type, created_at desc);

create index if not exists supplier_product_channels_status_idx
  on public.supplier_product_channels (product_type, channel_status, supplier_id);

create index if not exists bookings_supplier_lookup_idx
  on public.bookings (supplier_id, booking_product_type, created_at desc);

create index if not exists bookings_fulfillment_mode_idx
  on public.bookings (fulfillment_mode, supplier_order_status, created_at desc);

create index if not exists bookings_profit_tracking_idx
  on public.bookings (booking_product_type, redfeng_profit_source, created_at desc);

create index if not exists supplier_orders_booking_idx
  on public.supplier_orders (booking_id, created_at desc);

create index if not exists supplier_orders_supplier_idx
  on public.supplier_orders (supplier_id, supplier_status, created_at desc);

create index if not exists supplier_orders_external_idx
  on public.supplier_orders (supplier_order_id);

create index if not exists supplier_orders_cost_tracking_idx
  on public.supplier_orders (product_type, supplier_id, created_at desc);

create index if not exists supplier_order_events_order_idx
  on public.supplier_order_events (supplier_order_id, created_at desc);

create index if not exists flight_booking_details_departure_idx
  on public.flight_booking_details (departure_at desc);

create index if not exists flight_booking_details_route_idx
  on public.flight_booking_details (origin_airport_code, destination_airport_code, departure_at desc);

create index if not exists flight_booking_details_lifecycle_idx
  on public.flight_booking_details (lifecycle_status, departure_at desc);

create index if not exists flight_booking_details_fare_reference_idx
  on public.flight_booking_details (fare_reference_id);

alter table public.suppliers enable row level security;
alter table public.supplier_product_channels enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_events enable row level security;
alter table public.flight_booking_details enable row level security;
