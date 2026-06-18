create table if not exists public.hotel_availability_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  status text not null default 'availability_requested'
    check (
      status in (
        'availability_requested',
        'checking_supplier',
        'available',
        'unavailable',
        'quote_sent',
        'converted',
        'cancelled'
      )
    ),
  hotel_id text not null,
  hotel_name text not null,
  hotel_location text not null,
  hotel_region text not null,
  property_type text not null,
  star_rating text,
  checkin_date date not null,
  checkout_date date not null,
  night_count integer not null default 1 check (night_count > 0),
  adult_count integer not null default 1 check (adult_count > 0),
  child_count integer not null default 0 check (child_count >= 0),
  room_count integer not null default 1 check (room_count > 0),
  room_preference text,
  meal_preference text,
  refund_preference text,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  customer_note text,
  estimated_price_per_night numeric(14,2) not null default 0,
  estimated_total_amount numeric(14,2) not null default 0,
  quoted_total_amount numeric(14,2),
  currency text not null default 'IDR',
  source text not null default 'hotel_catalog_manual_check',
  request_payload jsonb not null default '{}'::jsonb,
  quote_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hotel_availability_requests_status_idx
  on public.hotel_availability_requests (status, created_at desc);

create index if not exists hotel_availability_requests_hotel_idx
  on public.hotel_availability_requests (hotel_id, checkin_date, created_at desc);

create index if not exists hotel_availability_requests_customer_idx
  on public.hotel_availability_requests (customer_phone, created_at desc);

alter table public.hotel_availability_requests enable row level security;
