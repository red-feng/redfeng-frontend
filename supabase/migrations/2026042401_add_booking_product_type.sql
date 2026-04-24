alter table public.bookings
add column if not exists booking_product_type text;

update public.bookings
set booking_product_type = case
  when package_id is not null then 'package_tour'
  else 'flight'
end
where booking_product_type is null;

alter table public.bookings
alter column booking_product_type set default 'package_tour';

alter table public.bookings
alter column booking_product_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_booking_product_type_check'
  ) then
    alter table public.bookings
    add constraint bookings_booking_product_type_check
    check (booking_product_type in ('package_tour', 'flight', 'hotel', 'train', 'bus', 'sea', 'cruise'));
  end if;
end $$;

create index if not exists bookings_booking_product_type_idx
  on public.bookings (booking_product_type, created_at desc);
