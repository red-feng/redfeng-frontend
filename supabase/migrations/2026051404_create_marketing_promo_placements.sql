create table if not exists public.marketing_promo_placements (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.marketing_promos(id) on delete cascade,
  placement_key text not null check (
    placement_key in ('homepage_feed', 'packages_featured', 'promo_listing', 'wishlist_suggestions')
  ),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (promo_id, placement_key)
);

create index if not exists marketing_promo_placements_lookup_idx
  on public.marketing_promo_placements (placement_key, is_active, sort_order asc, created_at asc);

alter table public.marketing_promo_placements enable row level security;

insert into public.marketing_promo_placements (promo_id, placement_key, sort_order, is_active)
select promo.id, placement.placement_key, promo.sort_order, promo.is_active
from public.marketing_promos promo
cross join (
  values
    ('homepage_feed'),
    ('packages_featured'),
    ('promo_listing'),
    ('wishlist_suggestions')
) as placement(placement_key)
on conflict (promo_id, placement_key) do update
set
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
