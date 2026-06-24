create table if not exists public.dharmawisata_hotel_destinations (
  id uuid primary key default gen_random_uuid(),
  country_id text not null,
  country_name text not null,
  city_id text not null,
  city_name text not null,
  search_label text not null,
  search_group text,
  is_active boolean not null default true,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (country_id, city_id)
);

create index if not exists dharmawisata_hotel_destinations_search_idx
  on public.dharmawisata_hotel_destinations (is_active, search_label, country_name);

create table if not exists public.dharmawisata_flight_airports (
  id uuid primary key default gen_random_uuid(),
  airport_code text not null unique,
  city_name text not null,
  airport_name text,
  country_id text,
  is_active boolean not null default true,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dharmawisata_flight_airports_search_idx
  on public.dharmawisata_flight_airports (is_active, city_name, airport_code);

create table if not exists public.dharmawisata_flight_routes (
  id uuid primary key default gen_random_uuid(),
  airline_code text not null,
  airline_name text,
  origin_code text not null,
  origin_name text,
  destination_code text not null,
  destination_name text,
  is_active boolean not null default true,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (airline_code, origin_code, destination_code)
);

create index if not exists dharmawisata_flight_routes_origin_idx
  on public.dharmawisata_flight_routes (is_active, origin_code, destination_code);

create index if not exists dharmawisata_flight_routes_destination_idx
  on public.dharmawisata_flight_routes (is_active, destination_code, origin_code);

alter table public.dharmawisata_hotel_destinations enable row level security;
alter table public.dharmawisata_flight_airports enable row level security;
alter table public.dharmawisata_flight_routes enable row level security;
