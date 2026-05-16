alter table public.marketing_promo_placements
  drop constraint if exists marketing_promo_placements_placement_key_check;

alter table public.marketing_promo_placements
  add constraint marketing_promo_placements_placement_key_check
  check (
    placement_key in (
      'homepage_feed',
      'packages_featured',
      'flights_featured',
      'hotels_featured',
      'trains_featured',
      'buses_featured',
      'ships_featured',
      'cruises_featured',
      'activities_featured',
      'promo_listing',
      'wishlist_suggestions'
    )
  );
