alter table public.bookings
  add column if not exists redfeng_profit_source text not null default 'unknown',
  add column if not exists redfeng_merchant_commission_amount numeric,
  add column if not exists supplier_net_cost_amount numeric,
  add column if not exists redfeng_spread_amount numeric,
  add column if not exists redfeng_recorded_profit_amount numeric,
  add column if not exists profit_recorded_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_redfeng_profit_source_check'
  ) then
    alter table public.bookings
      add constraint bookings_redfeng_profit_source_check
      check (redfeng_profit_source in ('unknown', 'package_tour', 'non_package_spread', 'mixed'));
  end if;
end $$;

alter table public.supplier_orders
  add column if not exists supplier_cost_amount numeric,
  add column if not exists supplier_cost_currency text not null default 'IDR',
  add column if not exists supplier_cost_recorded_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'supplier_orders_supplier_cost_currency_check'
  ) then
    alter table public.supplier_orders
      add constraint supplier_orders_supplier_cost_currency_check
      check (char_length(trim(supplier_cost_currency)) >= 3);
  end if;
end $$;

create index if not exists bookings_profit_tracking_idx
  on public.bookings (booking_product_type, redfeng_profit_source, created_at desc);

create index if not exists supplier_orders_cost_tracking_idx
  on public.supplier_orders (product_type, supplier_id, created_at desc);

with latest_package_payouts as (
  select distinct on (booking_id)
    booking_id,
    redfeng_commission_amount,
    requested_at
  from public.payout_requests
  where booking_id is not null
  order by booking_id, requested_at desc nulls last
)
update public.bookings as booking
set
  redfeng_profit_source = 'package_tour',
  redfeng_merchant_commission_amount = coalesce(payout.redfeng_commission_amount, 0),
  redfeng_recorded_profit_amount = coalesce(booking.customer_admin_fee_amount, 0) + coalesce(payout.redfeng_commission_amount, 0),
  profit_recorded_at = coalesce(payout.requested_at, booking.created_at)
from latest_package_payouts as payout
where booking.id = payout.booking_id
  and booking.booking_product_type = 'package_tour';
