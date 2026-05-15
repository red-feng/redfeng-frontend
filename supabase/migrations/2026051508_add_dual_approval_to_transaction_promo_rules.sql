alter table public.transaction_promo_rules
  add column if not exists marketing_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists marketing_approved_at timestamptz,
  add column if not exists finance_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists finance_approved_at timestamptz;
