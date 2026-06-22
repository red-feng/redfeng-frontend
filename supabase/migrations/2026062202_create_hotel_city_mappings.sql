create table if not exists public.dharmawisata_hotel_city_mappings (
  id uuid primary key default gen_random_uuid(),
  destination_key text not null unique,
  destination_label text not null,
  country_id text not null,
  city_id text not null,
  country_name text,
  city_name text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dharmawisata_hotel_city_mappings_active_idx
  on public.dharmawisata_hotel_city_mappings (is_active, destination_key);

alter table public.dharmawisata_hotel_city_mappings enable row level security;
