create table if not exists public.dharmawisata_hotel_city_search_logs (
  id uuid primary key default gen_random_uuid(),
  country_id text not null,
  city_name_filter text not null,
  status text,
  resp_message text,
  city_count integer not null default 0 check (city_count >= 0),
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dharmawisata_hotel_city_search_logs_created_idx
  on public.dharmawisata_hotel_city_search_logs (created_at desc);

create index if not exists dharmawisata_hotel_city_search_logs_keyword_idx
  on public.dharmawisata_hotel_city_search_logs (country_id, city_name_filter, created_at desc);

alter table public.dharmawisata_hotel_city_search_logs enable row level security;
