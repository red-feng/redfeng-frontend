create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  supplier_name text not null,
  supplier_type text not null default 'affiliate'
    check (supplier_type in ('internal', 'affiliate', 'aggregator', 'manual_partner')),
  integration_mode text not null default 'manual'
    check (integration_mode in ('manual', 'api', 'portal', 'email')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists suppliers_status_idx
  on public.suppliers (status, supplier_type, created_at desc);

create table if not exists public.supplier_product_channels (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_type text not null
    check (product_type in ('flight', 'hotel', 'train', 'bus', 'sea', 'cruise')),
  channel_status text not null default 'active'
    check (channel_status in ('active', 'inactive', 'pilot')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (supplier_id, product_type)
);

create index if not exists supplier_product_channels_status_idx
  on public.supplier_product_channels (product_type, channel_status, supplier_id);

alter table public.bookings
  add column if not exists fulfillment_mode text not null default 'internal',
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists supplier_booking_reference text,
  add column if not exists supplier_order_status text not null default 'not_applicable';

alter table public.bookings
  drop constraint if exists bookings_fulfillment_mode_check;

alter table public.bookings
  add constraint bookings_fulfillment_mode_check
  check (fulfillment_mode in ('internal', 'affiliate_api', 'affiliate_manual'));

alter table public.bookings
  drop constraint if exists bookings_supplier_order_status_check;

alter table public.bookings
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
  );

create index if not exists bookings_supplier_lookup_idx
  on public.bookings (supplier_id, booking_product_type, created_at desc);

create index if not exists bookings_fulfillment_mode_idx
  on public.bookings (fulfillment_mode, supplier_order_status, created_at desc);

create table if not exists public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_type text not null
    check (product_type in ('flight', 'hotel', 'train', 'bus', 'sea', 'cruise')),
  supplier_order_id text,
  supplier_reference text,
  supplier_status text not null default 'pending_submission'
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
    ),
  submission_mode text not null default 'manual'
    check (submission_mode in ('manual', 'api', 'portal', 'email')),
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

create index if not exists supplier_orders_booking_idx
  on public.supplier_orders (booking_id, created_at desc);

create index if not exists supplier_orders_supplier_idx
  on public.supplier_orders (supplier_id, supplier_status, created_at desc);

create index if not exists supplier_orders_external_idx
  on public.supplier_orders (supplier_order_id);

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

create index if not exists supplier_order_events_order_idx
  on public.supplier_order_events (supplier_order_id, created_at desc);

alter table public.flight_booking_details
  add column if not exists supplier_order_id uuid references public.supplier_orders(id) on delete set null,
  add column if not exists trip_type text not null default 'one_way',
  add column if not exists airline_code text,
  add column if not exists origin_airport_name text,
  add column if not exists destination_airport_name text,
  add column if not exists return_at timestamptz,
  add column if not exists fare_brand text,
  add column if not exists pnr_code text,
  add column if not exists ticket_number text,
  add column if not exists supplier_confirmation_code text,
  add column if not exists issue_status text not null default 'pending_confirmation',
  add column if not exists latest_schedule_change_at timestamptz,
  add column if not exists baggage_summary text;

alter table public.flight_booking_details
  drop constraint if exists flight_booking_details_trip_type_check;

alter table public.flight_booking_details
  add constraint flight_booking_details_trip_type_check
  check (trip_type in ('one_way', 'round_trip', 'multi_city'));

alter table public.flight_booking_details
  drop constraint if exists flight_booking_details_issue_status_check;

alter table public.flight_booking_details
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
  );

create index if not exists flight_booking_details_route_idx
  on public.flight_booking_details (origin_airport_code, destination_airport_code, departure_at desc);

alter table public.suppliers enable row level security;
alter table public.supplier_product_channels enable row level security;
alter table public.supplier_orders enable row level security;
alter table public.supplier_order_events enable row level security;

drop policy if exists "suppliers_select_internal" on public.suppliers;
create policy "suppliers_select_internal"
on public.suppliers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "suppliers_write_internal" on public.suppliers;
create policy "suppliers_write_internal"
on public.suppliers
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

drop policy if exists "supplier_product_channels_select_internal" on public.supplier_product_channels;
create policy "supplier_product_channels_select_internal"
on public.supplier_product_channels
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "supplier_product_channels_write_internal" on public.supplier_product_channels;
create policy "supplier_product_channels_write_internal"
on public.supplier_product_channels
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

drop policy if exists "supplier_orders_select_internal" on public.supplier_orders;
create policy "supplier_orders_select_internal"
on public.supplier_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "supplier_orders_write_internal" on public.supplier_orders;
create policy "supplier_orders_write_internal"
on public.supplier_orders
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

drop policy if exists "supplier_order_events_select_internal" on public.supplier_order_events;
create policy "supplier_order_events_select_internal"
on public.supplier_order_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "supplier_order_events_write_internal" on public.supplier_order_events;
create policy "supplier_order_events_write_internal"
on public.supplier_order_events
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
