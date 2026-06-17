alter table public.bookings
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists bookings_user_id_idx
  on public.bookings (user_id, created_at desc);

update public.bookings
set user_id = users.id
from auth.users
where public.bookings.user_id is null
  and lower(public.bookings.customer_email) = lower(users.email);
