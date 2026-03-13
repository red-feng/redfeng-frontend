alter table public.merchants
  add column if not exists email text;

update public.merchants m
set email = u.email
from auth.users u
where u.id = m.user_id
  and (m.email is null or btrim(m.email) = '');

create index if not exists merchants_email_idx
  on public.merchants (email);
