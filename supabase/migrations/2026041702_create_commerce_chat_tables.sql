create extension if not exists pgcrypto;

create table if not exists public.commerce_chat_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null default 'inquiry' check (thread_type in ('inquiry', 'booking')),
  source_context text not null default 'public_package' check (source_context in ('public_package', 'checkout', 'booking', 'reorder')),
  subject_package_id uuid references public.packages(id) on delete set null,
  subject_booking_id uuid references public.bookings(id) on delete set null,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  merchant_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'archived', 'blocked', 'resolved')),
  safety_state text not null default 'normal' check (safety_state in ('normal', 'flagged', 'frozen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_sender_role text check (last_message_sender_role in ('customer', 'merchant', 'system')),
  customer_last_read_at timestamptz,
  merchant_last_read_at timestamptz
);

create unique index if not exists commerce_chat_threads_inquiry_unique_idx
  on public.commerce_chat_threads (customer_user_id, merchant_id, subject_package_id)
  where thread_type = 'inquiry' and subject_package_id is not null;

create unique index if not exists commerce_chat_threads_booking_unique_idx
  on public.commerce_chat_threads (subject_booking_id)
  where thread_type = 'booking' and subject_booking_id is not null;

create index if not exists commerce_chat_threads_customer_idx
  on public.commerce_chat_threads (customer_user_id, last_message_at desc nulls last, updated_at desc);

create index if not exists commerce_chat_threads_merchant_idx
  on public.commerce_chat_threads (merchant_user_id, last_message_at desc nulls last, updated_at desc);

create index if not exists commerce_chat_threads_package_idx
  on public.commerce_chat_threads (subject_package_id)
  where subject_package_id is not null;

create table if not exists public.commerce_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.commerce_chat_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('customer', 'merchant', 'system')),
  message_type text not null default 'text' check (message_type in ('text', 'attachment', 'system_event')),
  body text not null,
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  moderation_state text not null default 'clean' check (moderation_state in ('clean', 'flagged', 'blocked')),
  client_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists commerce_chat_messages_thread_created_idx
  on public.commerce_chat_messages (thread_id, created_at asc, id asc);

create unique index if not exists commerce_chat_messages_thread_client_message_uidx
  on public.commerce_chat_messages (thread_id, client_message_id)
  where client_message_id is not null;

create table if not exists public.commerce_chat_events (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.commerce_chat_threads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'flagged', 'frozen', 'reopened', 'reported')),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commerce_chat_events_thread_idx
  on public.commerce_chat_events (thread_id, created_at desc);

alter table public.commerce_chat_threads enable row level security;
alter table public.commerce_chat_messages enable row level security;
alter table public.commerce_chat_events enable row level security;

drop policy if exists "commerce_chat_threads_select_participants" on public.commerce_chat_threads;
create policy "commerce_chat_threads_select_participants"
on public.commerce_chat_threads
for select
to authenticated
using (
  customer_user_id = auth.uid()
  or (
    merchant_user_id = auth.uid()
    and exists (
      select 1
      from public.merchants m
      where m.id = commerce_chat_threads.merchant_id
        and m.user_id = auth.uid()
    )
  )
);

drop policy if exists "commerce_chat_threads_insert_customer_or_merchant" on public.commerce_chat_threads;
create policy "commerce_chat_threads_insert_customer_or_merchant"
on public.commerce_chat_threads
for insert
to authenticated
with check (
  (
    customer_user_id = auth.uid()
    and thread_type = 'inquiry'
    and subject_package_id is not null
    and subject_booking_id is null
    and exists (
      select 1
      from public.packages p
      join public.merchants m on m.id = p.merchant_id
      where p.id = commerce_chat_threads.subject_package_id
        and m.id = commerce_chat_threads.merchant_id
        and m.user_id = commerce_chat_threads.merchant_user_id
    )
  )
  or (
    merchant_user_id = auth.uid()
    and exists (
      select 1
      from public.merchants m
      where m.id = commerce_chat_threads.merchant_id
        and m.user_id = auth.uid()
    )
  )
);

drop policy if exists "commerce_chat_threads_update_participants" on public.commerce_chat_threads;
create policy "commerce_chat_threads_update_participants"
on public.commerce_chat_threads
for update
to authenticated
using (
  customer_user_id = auth.uid()
  or (
    merchant_user_id = auth.uid()
    and exists (
      select 1
      from public.merchants m
      where m.id = commerce_chat_threads.merchant_id
        and m.user_id = auth.uid()
    )
  )
)
with check (
  customer_user_id = auth.uid()
  or (
    merchant_user_id = auth.uid()
    and exists (
      select 1
      from public.merchants m
      where m.id = commerce_chat_threads.merchant_id
        and m.user_id = auth.uid()
    )
  )
);

drop policy if exists "commerce_chat_messages_select_participants" on public.commerce_chat_messages;
create policy "commerce_chat_messages_select_participants"
on public.commerce_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.commerce_chat_threads t
    where t.id = commerce_chat_messages.thread_id
      and (
        t.customer_user_id = auth.uid()
        or (
          t.merchant_user_id = auth.uid()
          and exists (
            select 1
            from public.merchants m
            where m.id = t.merchant_id
              and m.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "commerce_chat_messages_insert_customer" on public.commerce_chat_messages;
create policy "commerce_chat_messages_insert_customer"
on public.commerce_chat_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_role = 'customer'
  and exists (
    select 1
    from public.commerce_chat_threads t
    where t.id = commerce_chat_messages.thread_id
      and t.customer_user_id = auth.uid()
  )
);

drop policy if exists "commerce_chat_messages_insert_merchant" on public.commerce_chat_messages;
create policy "commerce_chat_messages_insert_merchant"
on public.commerce_chat_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and sender_role = 'merchant'
  and exists (
    select 1
    from public.commerce_chat_threads t
    join public.merchants m on m.id = t.merchant_id
    where t.id = commerce_chat_messages.thread_id
      and t.merchant_user_id = auth.uid()
      and m.user_id = auth.uid()
  )
);

drop policy if exists "commerce_chat_events_select_none_for_clients" on public.commerce_chat_events;
create policy "commerce_chat_events_select_none_for_clients"
on public.commerce_chat_events
for select
to authenticated
using (false);

alter table public.commerce_chat_threads replica identity full;
alter table public.commerce_chat_messages replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'commerce_chat_threads'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.commerce_chat_threads;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'commerce_chat_messages'
  ) then
    null;
  else
    alter publication supabase_realtime add table public.commerce_chat_messages;
  end if;
end
$$;
