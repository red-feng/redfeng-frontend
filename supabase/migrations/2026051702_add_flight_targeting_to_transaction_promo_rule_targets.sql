alter table public.transaction_promo_rule_targets
  add column if not exists origin_airport_code text,
  add column if not exists destination_airport_code text,
  add column if not exists airline_code text,
  add column if not exists cabin_class text,
  add column if not exists trip_type text,
  add column if not exists departure_starts_at timestamptz,
  add column if not exists departure_ends_at timestamptz,
  add column if not exists return_starts_at timestamptz,
  add column if not exists return_ends_at timestamptz;

create index if not exists transaction_promo_rule_targets_flight_idx
  on public.transaction_promo_rule_targets (
    product_type,
    origin_airport_code,
    destination_airport_code,
    airline_code,
    cabin_class,
    trip_type
  );
