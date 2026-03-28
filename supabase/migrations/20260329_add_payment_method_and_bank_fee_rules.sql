alter table if exists public.finance_settings
  add column if not exists customer_admin_fee_rules jsonb not null default
    '{"bank_transfer": 3, "qris": 1.5, "credit_card": 3.5}'::jsonb,
  add column if not exists merchant_transfer_fee_rules jsonb not null default
    '{"default": 6500, "bca": 6500, "bni": 6500, "bri": 6500, "mandiri": 6500, "permata": 6500, "cimb": 6500, "bsi": 6500}'::jsonb;

update public.finance_settings
set
  customer_admin_fee_rules = coalesce(customer_admin_fee_rules, '{"bank_transfer": 3, "qris": 1.5, "credit_card": 3.5}'::jsonb),
  merchant_transfer_fee_rules = coalesce(merchant_transfer_fee_rules, jsonb_build_object(
    'default', coalesce(merchant_transfer_fee, 6500),
    'bca', coalesce(merchant_transfer_fee, 6500),
    'bni', coalesce(merchant_transfer_fee, 6500),
    'bri', coalesce(merchant_transfer_fee, 6500),
    'mandiri', coalesce(merchant_transfer_fee, 6500),
    'permata', coalesce(merchant_transfer_fee, 6500),
    'cimb', coalesce(merchant_transfer_fee, 6500),
    'bsi', coalesce(merchant_transfer_fee, 6500)
  ))
where id = 'default';

alter table if exists public.bookings
  add column if not exists payment_method text,
  add column if not exists gateway_payment_method text;

alter table if exists public.payments
  add column if not exists finance_payment_method text,
  add column if not exists gateway_payment_method text;

create index if not exists bookings_payment_method_idx
  on public.bookings (payment_method, created_at desc);
