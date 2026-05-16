alter table public.transaction_promo_rules
  add column if not exists new_user_only boolean not null default false;

create index if not exists transaction_promo_rules_new_user_only_idx
  on public.transaction_promo_rules (new_user_only, status, is_auto_apply, starts_at asc, ends_at asc);
