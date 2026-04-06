create extension if not exists pg_trgm;

create index if not exists packages_public_catalog_merchant_idx
  on public.packages (merchant_id)
  where status = 'approved';

create index if not exists packages_public_catalog_country_departure_idx
  on public.packages (destination_country_id, departure_date)
  where status = 'approved';

create index if not exists packages_public_catalog_style_idx
  on public.packages (travel_style)
  where status = 'approved';

create index if not exists package_translations_locale_currency_package_idx
  on public.package_translations (language_code, currency, package_id);

create index if not exists package_translations_locale_currency_price_idx
  on public.package_translations (language_code, currency, price_adult);

create index if not exists package_facilities_facility_package_idx
  on public.package_facilities (facility_id, package_id);

create index if not exists package_facilities_package_idx
  on public.package_facilities (package_id);

create index if not exists countries_name_trgm_idx
  on public.countries using gin (name gin_trgm_ops);
