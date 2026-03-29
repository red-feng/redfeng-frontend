alter table if exists public.bookings
  add column if not exists total_participants integer;

update public.bookings
set total_participants = coalesce(adult_count, 0) + coalesce(child_count, 0)
where total_participants is null;

create or replace function public.sync_booking_total_participants()
returns trigger
language plpgsql
as $$
begin
  new.total_participants := coalesce(new.adult_count, 0) + coalesce(new.child_count, 0);
  return new;
end;
$$;

drop trigger if exists bookings_sync_total_participants on public.bookings;

create trigger bookings_sync_total_participants
before insert or update of adult_count, child_count
on public.bookings
for each row
execute function public.sync_booking_total_participants();
