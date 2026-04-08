create table if not exists public.merchant_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid,
  profile_id uuid,
  merchant_email text,
  merchant_name text,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'cancelled')),
  review_note text,
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists merchant_deletion_requests_status_idx
  on public.merchant_deletion_requests (status, requested_at desc);

create index if not exists merchant_deletion_requests_merchant_idx
  on public.merchant_deletion_requests (merchant_id, requested_at desc);

create index if not exists merchant_deletion_requests_profile_idx
  on public.merchant_deletion_requests (profile_id, requested_at desc);

create unique index if not exists merchant_deletion_requests_pending_merchant_idx
  on public.merchant_deletion_requests (merchant_id)
  where status = 'pending' and merchant_id is not null;

create unique index if not exists merchant_deletion_requests_pending_profile_idx
  on public.merchant_deletion_requests (profile_id)
  where status = 'pending' and profile_id is not null;

alter table public.merchant_deletion_requests enable row level security;

drop policy if exists "merchant_deletion_requests_select_internal" on public.merchant_deletion_requests;
create policy "merchant_deletion_requests_select_internal"
on public.merchant_deletion_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
);

drop policy if exists "merchant_deletion_requests_insert_internal" on public.merchant_deletion_requests;
create policy "merchant_deletion_requests_insert_internal"
on public.merchant_deletion_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superadmin')
  )
);

drop policy if exists "merchant_deletion_requests_update_internal" on public.merchant_deletion_requests;
create policy "merchant_deletion_requests_update_internal"
on public.merchant_deletion_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('operations_manager', 'superadmin')
  )
);
