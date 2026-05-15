create table if not exists public.transaction_promo_rules (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value numeric not null check (discount_value > 0),
  max_discount_amount numeric check (max_discount_amount is null or max_discount_amount > 0),
  minimum_order_amount numeric not null default 0 check (minimum_order_amount >= 0),
  quota_total integer check (quota_total is null or quota_total > 0),
  quota_per_user integer check (quota_per_user is null or quota_per_user > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'approved', 'active', 'paused', 'expired')),
  is_auto_apply boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists transaction_promo_rules_status_idx
  on public.transaction_promo_rules (status, is_auto_apply, starts_at asc, ends_at asc, created_at desc);

create index if not exists transaction_promo_rules_code_idx
  on public.transaction_promo_rules (code);

alter table public.transaction_promo_rules enable row level security;

create table if not exists public.transaction_promo_rule_targets (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.transaction_promo_rules(id) on delete cascade,
  product_type text not null check (product_type in ('package_tour', 'flight', 'hotel', 'train', 'bus', 'sea', 'cruise')),
  product_id uuid,
  product_reference text,
  merchant_id uuid,
  payment_method text,
  customer_locale text,
  channel text not null default 'public_web' check (channel in ('public_web', 'mobile_web', 'mobile_app', 'internal')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (product_id is not null or product_reference is not null or merchant_id is not null or payment_method is not null or customer_locale is not null or channel is not null)
);

create index if not exists transaction_promo_rule_targets_lookup_idx
  on public.transaction_promo_rule_targets (rule_id, product_type, channel, created_at desc);

create index if not exists transaction_promo_rule_targets_product_idx
  on public.transaction_promo_rule_targets (product_type, product_id, merchant_id, payment_method);

alter table public.transaction_promo_rule_targets enable row level security;

create table if not exists public.transaction_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.transaction_promo_rules(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  product_type text not null check (product_type in ('package_tour', 'flight', 'hotel', 'train', 'bus', 'sea', 'cruise')),
  product_id uuid,
  product_reference text,
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  currency text not null default 'IDR',
  status text not null default 'reserved' check (status in ('reserved', 'applied', 'cancelled', 'reverted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists transaction_promo_redemptions_rule_idx
  on public.transaction_promo_redemptions (rule_id, status, created_at desc);

create index if not exists transaction_promo_redemptions_user_idx
  on public.transaction_promo_redemptions (rule_id, user_id, email, status, created_at desc);

create index if not exists transaction_promo_redemptions_booking_idx
  on public.transaction_promo_redemptions (booking_id, status, created_at desc);

alter table public.transaction_promo_redemptions enable row level security;
