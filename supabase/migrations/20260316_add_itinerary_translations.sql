create table if not exists public.package_itinerary_day_translations (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.package_itinerary_days(id) on delete cascade,
  language_code text not null check (language_code in ('id', 'en', 'zh')),
  day_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_day_id, language_code)
);

create index if not exists package_itinerary_day_translations_day_idx
  on public.package_itinerary_day_translations (itinerary_day_id);

create table if not exists public.package_itinerary_route_translations (
  id uuid primary key default gen_random_uuid(),
  itinerary_route_id uuid not null references public.package_itinerary_routes(id) on delete cascade,
  language_code text not null check (language_code in ('id', 'en', 'zh')),
  route text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_route_id, language_code)
);

create index if not exists package_itinerary_route_translations_route_idx
  on public.package_itinerary_route_translations (itinerary_route_id);
