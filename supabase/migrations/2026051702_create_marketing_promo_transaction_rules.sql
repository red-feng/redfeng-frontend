create table if not exists public.marketing_promo_transaction_rules (
  id uuid primary key default gen_random_uuid(),
  marketing_promo_id uuid not null references public.marketing_promos(id) on delete cascade,
  transaction_promo_rule_id uuid not null references public.transaction_promo_rules(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (marketing_promo_id, transaction_promo_rule_id)
);

create index if not exists marketing_promo_transaction_rules_marketing_idx
  on public.marketing_promo_transaction_rules (marketing_promo_id, created_at desc);

create index if not exists marketing_promo_transaction_rules_rule_idx
  on public.marketing_promo_transaction_rules (transaction_promo_rule_id, created_at desc);

alter table public.marketing_promo_transaction_rules enable row level security;
