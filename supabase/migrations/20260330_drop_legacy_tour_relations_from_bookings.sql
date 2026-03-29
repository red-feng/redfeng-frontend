do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_tour_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      drop constraint bookings_tour_id_fkey;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_tourist_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      drop constraint bookings_tourist_id_fkey;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'tour_id'
  ) then
    alter table public.bookings
      alter column tour_id drop default,
      alter column tour_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'tourist_id'
  ) then
    alter table public.bookings
      alter column tourist_id drop default,
      alter column tourist_id drop not null;
  end if;
end
$$;
