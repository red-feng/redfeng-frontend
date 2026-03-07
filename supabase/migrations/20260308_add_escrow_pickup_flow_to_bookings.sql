alter table public.bookings
add column if not exists escrow_status text not null default 'pending_payment',
add column if not exists merchant_arrived_at timestamptz,
add column if not exists merchant_picked_up_at timestamptz,
add column if not exists customer_picked_up_at timestamptz,
add column if not exists escrow_released_at timestamptz;

create index if not exists bookings_escrow_status_idx
  on public.bookings (escrow_status, created_at desc);

create index if not exists bookings_pickup_flow_idx
  on public.bookings (merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at);
