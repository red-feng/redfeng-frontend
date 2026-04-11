create table if not exists public.merchant_review_requests (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  request_type text not null
    check (request_type in ('approve', 'reject')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'superseded', 'expired')),
  admin_note text,
  manager_reason text,
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists merchant_review_requests_merchant_idx
  on public.merchant_review_requests (merchant_id, requested_at desc);

create index if not exists merchant_review_requests_status_idx
  on public.merchant_review_requests (status, requested_at desc);

create unique index if not exists merchant_review_requests_pending_merchant_idx
  on public.merchant_review_requests (merchant_id)
  where status = 'pending';

alter table public.merchant_review_requests enable row level security;

drop policy if exists "merchant_review_requests_select_internal" on public.merchant_review_requests;
create policy "merchant_review_requests_select_internal"
on public.merchant_review_requests
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

drop policy if exists "merchant_review_requests_insert_internal" on public.merchant_review_requests;
create policy "merchant_review_requests_insert_internal"
on public.merchant_review_requests
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

drop policy if exists "merchant_review_requests_update_internal" on public.merchant_review_requests;
create policy "merchant_review_requests_update_internal"
on public.merchant_review_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
);

alter table public.merchants
  add column if not exists submitted_at timestamptz,
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists manager_review_requested_at timestamptz,
  add column if not exists manager_review_request_id uuid references public.merchant_review_requests(id) on delete set null,
  add column if not exists manager_decision text
    check (manager_decision in ('approved', 'rejected')),
  add column if not exists manager_decided_at timestamptz,
  add column if not exists manager_decided_by uuid references auth.users(id) on delete set null,
  add column if not exists manager_rejection_reason text,
  add column if not exists revision_requested_at timestamptz,
  add column if not exists revision_deadline_at timestamptz,
  add column if not exists last_resubmitted_at timestamptz,
  add column if not exists expired_at timestamptz,
  add column if not exists purge_scheduled_at timestamptz,
  add column if not exists purged_at timestamptz;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'merchants'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%verification_status%'
  loop
    execute format('alter table public.merchants drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.merchants
  add constraint merchants_verification_status_check
  check (
    verification_status in (
      'draft',
      'pending',
      'pending_admin_review',
      'awaiting_manager_approval',
      'awaiting_manager_rejection',
      'revision_requested',
      'rejected',
      'approved',
      'inactive',
      'deleted',
      'expired'
    )
  );

update public.merchants
set submitted_at = coalesce(submitted_at, created_at)
where submitted_at is null
  and coalesce(onboarding_completed, false) = true
  and coalesce(verification_status, 'draft') <> 'draft';

update public.merchants
set manager_rejection_reason = rejection_reason
where manager_rejection_reason is null
  and nullif(btrim(coalesce(rejection_reason, '')), '') is not null;
