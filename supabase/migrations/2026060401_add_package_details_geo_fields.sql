alter table public.package_details
  add column if not exists location_label text,
  add column if not exists location_type text,
  add column if not exists primary_lat numeric(9,6),
  add column if not exists primary_lng numeric(9,6),
  add column if not exists viewport_radius_km integer,
  add column if not exists geo_updated_at timestamptz;

alter table public.package_details
  drop constraint if exists package_details_location_type_check;

alter table public.package_details
  add constraint package_details_location_type_check
  check (
    location_type is null
    or location_type in ('country', 'city', 'meeting_point', 'tour_area')
  );

alter table public.package_details
  drop constraint if exists package_details_primary_lat_range_check;

alter table public.package_details
  add constraint package_details_primary_lat_range_check
  check (
    primary_lat is null
    or (primary_lat >= -90 and primary_lat <= 90)
  );

alter table public.package_details
  drop constraint if exists package_details_primary_lng_range_check;

alter table public.package_details
  add constraint package_details_primary_lng_range_check
  check (
    primary_lng is null
    or (primary_lng >= -180 and primary_lng <= 180)
  );

alter table public.package_details
  drop constraint if exists package_details_primary_coords_pair_check;

alter table public.package_details
  add constraint package_details_primary_coords_pair_check
  check (
    (primary_lat is null and primary_lng is null)
    or (primary_lat is not null and primary_lng is not null)
  );

alter table public.package_details
  drop constraint if exists package_details_viewport_radius_km_check;

alter table public.package_details
  add constraint package_details_viewport_radius_km_check
  check (
    viewport_radius_km is null
    or (viewport_radius_km >= 1 and viewport_radius_km <= 5000)
  );

create index if not exists package_details_location_type_idx
  on public.package_details (location_type);

create index if not exists package_details_primary_coords_idx
  on public.package_details (primary_lat, primary_lng)
  where primary_lat is not null and primary_lng is not null;
