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
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint flight_booking_details_cabin_class_check
    check (cabin_class in ('economy', 'premium_economy', 'business', 'first')),
  constraint flight_booking_details_passenger_count_check
    check (passenger_count > 0)
);

create index if not exists flight_booking_details_departure_idx
  on public.flight_booking_details (departure_at desc);

alter table public.flight_booking_details enable row level security;
