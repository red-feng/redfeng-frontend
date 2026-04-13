alter table public.packages
  add column if not exists departure_date date;
