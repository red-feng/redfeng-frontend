alter table public.transaction_promo_rule_targets
  add column if not exists hotel_city_code text,
  add column if not exists hotel_country_code text,
  add column if not exists hotel_star_rating integer,
  add column if not exists hotel_checkin_starts_at timestamptz,
  add column if not exists hotel_checkin_ends_at timestamptz,
  add column if not exists hotel_checkout_starts_at timestamptz,
  add column if not exists hotel_checkout_ends_at timestamptz,
  add column if not exists hotel_min_night_count integer,
  add column if not exists hotel_max_night_count integer;

alter table public.transaction_promo_rule_targets
  drop constraint if exists transaction_promo_rule_targets_hotel_star_rating_check;

alter table public.transaction_promo_rule_targets
  add constraint transaction_promo_rule_targets_hotel_star_rating_check
    check (hotel_star_rating is null or hotel_star_rating between 1 and 5);

alter table public.transaction_promo_rule_targets
  drop constraint if exists transaction_promo_rule_targets_hotel_night_count_check;

alter table public.transaction_promo_rule_targets
  add constraint transaction_promo_rule_targets_hotel_night_count_check
    check (
      (hotel_min_night_count is null or hotel_min_night_count > 0)
      and (hotel_max_night_count is null or hotel_max_night_count > 0)
      and (
        hotel_min_night_count is null
        or hotel_max_night_count is null
        or hotel_max_night_count >= hotel_min_night_count
      )
    );

create index if not exists transaction_promo_rule_targets_hotel_idx
  on public.transaction_promo_rule_targets (
    product_type,
    hotel_city_code,
    hotel_country_code,
    hotel_star_rating
  );
