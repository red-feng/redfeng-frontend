alter table public.bookings
  add column if not exists promo_rule_id uuid references public.transaction_promo_rules(id) on delete set null,
  add column if not exists promo_code text,
  add column if not exists promo_discount_amount numeric not null default 0,
  add column if not exists promo_snapshot jsonb not null default '{}'::jsonb;

create index if not exists bookings_promo_rule_idx
  on public.bookings (promo_rule_id, created_at desc);
