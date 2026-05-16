alter table public.transaction_promo_rules
  add column if not exists priority integer not null default 0;

create index if not exists transaction_promo_rules_priority_idx
  on public.transaction_promo_rules (status, priority desc, is_auto_apply, starts_at asc, ends_at asc, created_at desc);
