create table if not exists public.finance_settings (
  id text primary key,
  redfeng_commission_percent numeric not null default 12,
  customer_admin_fee_percent numeric not null default 3,
  customer_tax_percent numeric not null default 11,
  merchant_transfer_fee numeric not null default 6500,
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (
  id,
  redfeng_commission_percent,
  customer_admin_fee_percent,
  customer_tax_percent,
  merchant_transfer_fee
)
values ('default', 12, 3, 11, 6500)
on conflict (id) do nothing;

alter table public.payout_requests
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists gross_booking_amount numeric,
  add column if not exists redfeng_commission_percent numeric,
  add column if not exists redfeng_commission_amount numeric,
  add column if not exists customer_admin_fee_percent numeric,
  add column if not exists customer_tax_percent numeric,
  add column if not exists merchant_transfer_fee numeric,
  add column if not exists source text not null default 'manual';

create index if not exists payout_requests_booking_idx
  on public.payout_requests (booking_id, requested_at desc);
