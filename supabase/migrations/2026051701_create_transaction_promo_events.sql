create table if not exists public.transaction_promo_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.transaction_promo_rules(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'quoted',
      'rejected',
      'reserved',
      'applied',
      'reverted'
    )
  ),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transaction_promo_events_rule_idx
  on public.transaction_promo_events (rule_id, event_type, created_at desc);

create index if not exists transaction_promo_events_booking_idx
  on public.transaction_promo_events (booking_id, event_type, created_at desc);

create index if not exists transaction_promo_events_customer_idx
  on public.transaction_promo_events (customer_id, event_type, created_at desc);

create index if not exists transaction_promo_events_created_idx
  on public.transaction_promo_events (created_at desc);

alter table public.transaction_promo_events enable row level security;
