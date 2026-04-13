create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  order_id text,
  payment_method text,
  payment_channel text,
  refund_channel text not null default 'manual_other'
    check (refund_channel in ('midtrans', 'kopra_manual', 'void_cancel', 'manual_other')),
  midtrans_transaction_id text,
  midtrans_refund_id text,
  kopra_reference_no text,
  refund_reason text not null,
  refund_reason_code text,
  gross_amount numeric(15, 2) not null default 0,
  deduction_amount numeric(15, 2) not null default 0,
  net_refund_amount numeric(15, 2) not null default 0,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  status text not null default 'refund_requested'
    check (
      status in (
        'refund_requested',
        'refund_under_review',
        'refund_approved',
        'refund_rejected',
        'refund_processing_midtrans',
        'refund_processing_bank',
        'refund_paid',
        'refund_failed',
        'refund_reconciled',
        'refund_closed'
      )
    ),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  executed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  approved_at timestamptz,
  executed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists refund_requests_booking_idx
  on public.refund_requests (booking_id, created_at desc);

create index if not exists refund_requests_status_idx
  on public.refund_requests (status, created_at desc);

create index if not exists refund_requests_channel_idx
  on public.refund_requests (refund_channel, created_at desc);

create index if not exists refund_requests_midtrans_tx_idx
  on public.refund_requests (midtrans_transaction_id);

create index if not exists refund_requests_kopra_ref_idx
  on public.refund_requests (kopra_reference_no);

create table if not exists public.refund_events (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.refund_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists refund_events_request_idx
  on public.refund_events (refund_request_id, created_at desc);

alter table public.refund_requests enable row level security;
alter table public.refund_events enable row level security;

drop policy if exists "refund_requests_select_internal" on public.refund_requests;
create policy "refund_requests_select_internal"
on public.refund_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "refund_requests_insert_internal" on public.refund_requests;
create policy "refund_requests_insert_internal"
on public.refund_requests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "refund_requests_update_internal" on public.refund_requests;
create policy "refund_requests_update_internal"
on public.refund_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "refund_events_select_internal" on public.refund_events;
create policy "refund_events_select_internal"
on public.refund_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "refund_events_insert_internal" on public.refund_events;
create policy "refund_events_insert_internal"
on public.refund_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

alter table public.admin_action_logs
  drop constraint if exists admin_action_logs_target_type_check;

alter table public.admin_action_logs
  add constraint admin_action_logs_target_type_check
  check (target_type in ('merchant', 'package', 'booking', 'internal_account', 'refund'));
