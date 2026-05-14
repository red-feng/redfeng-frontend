alter table if exists public.superadmin_nav_seen_states
  add column if not exists seen_marketing_accounts_at timestamptz;
