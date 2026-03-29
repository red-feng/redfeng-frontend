do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_tourist_id_key'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      drop constraint bookings_tourist_id_key;
  end if;
end
$$;

drop index if exists public.bookings_tourist_id_key;
