alter table public.transaction_promo_rules
  add column if not exists funding_source text not null default 'platform'
    check (funding_source in ('platform', 'merchant', 'bank', 'e_wallet', 'partner')),
  add column if not exists partner_name text,
  add column if not exists cost_owner text not null default 'redfeng'
    check (cost_owner in ('redfeng', 'merchant', 'partner', 'shared'));

create index if not exists transaction_promo_rules_funding_idx
  on public.transaction_promo_rules (funding_source, cost_owner, status, created_at desc);
