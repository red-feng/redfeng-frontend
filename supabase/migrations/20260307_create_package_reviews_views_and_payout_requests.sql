create extension if not exists pgcrypto;

create table if not exists public.package_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  customer_name text,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists package_reviews_package_idx
  on public.package_reviews (package_id, created_at desc);

create table if not exists public.package_views (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  session_id text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists package_views_package_idx
  on public.package_views (package_id, viewed_at desc);

create unique index if not exists package_views_package_session_day_idx
  on public.package_views (package_id, session_id, ((viewed_at at time zone 'utc')::date));

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  amount numeric not null check (amount > 0),
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  status text not null default 'pending',
  note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payout_requests_merchant_idx
  on public.payout_requests (merchant_id, requested_at desc);
