alter table public.bookings
  add column if not exists subtotal_amount numeric,
  add column if not exists customer_admin_fee_amount numeric,
  add column if not exists customer_tax_amount numeric,
  add column if not exists customer_admin_fee_percent numeric,
  add column if not exists customer_tax_percent numeric,
  add column if not exists final_payment_amount numeric;

create index if not exists bookings_price_breakdown_idx
  on public.bookings (created_at desc, total_amount);
