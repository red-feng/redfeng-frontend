insert into public.marketing_promo_placements (promo_id, placement_key, sort_order, is_active)
select
  promo.id,
  mapped.placement_key,
  promo.sort_order,
  promo.is_active
from public.marketing_promos promo
join lateral (
  select case
    when promo.target_href like '/packages%' then 'packages_featured'
    when promo.target_href like '/pesawat%' then 'flights_featured'
    when promo.target_href like '/hotel%' then 'hotels_featured'
    when promo.target_href like '/kereta%' then 'trains_featured'
    when promo.target_href like '/bus%' then 'buses_featured'
    when promo.target_href like '/kapal-pesiar%' then 'cruises_featured'
    when promo.target_href like '/kapal%' then 'ships_featured'
    when promo.target_href like '/aktivitas%' then 'activities_featured'
    when promo.target_href like '/promo%' then 'promo_listing'
    else 'homepage_feed'
  end as placement_key
) as mapped on true
on conflict (promo_id, placement_key) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
