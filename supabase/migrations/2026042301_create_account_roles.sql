create table if not exists public.account_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  source text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  revoked_at timestamptz,
  primary key (user_id, role),
  constraint account_roles_role_check check (
    role in ('customer', 'merchant', 'admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  ),
  constraint account_roles_status_check check (status in ('active', 'revoked', 'suspended'))
);

create index if not exists account_roles_active_lookup_idx
  on public.account_roles (user_id, role)
  where status = 'active';

alter table public.account_roles enable row level security;

drop policy if exists "Users can view own account roles" on public.account_roles;
create policy "Users can view own account roles"
  on public.account_roles
  for select
  using (auth.uid() = user_id);

insert into public.account_roles (user_id, role, status, source)
select id, role, 'active', 'profiles_backfill'
from public.profiles
where role in ('customer', 'merchant', 'admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
on conflict (user_id, role) do update
set
  status = excluded.status,
  source = coalesce(public.account_roles.source, excluded.source),
  updated_at = timezone('utc'::text, now()),
  revoked_at = null;

insert into public.account_roles (user_id, role, status, source)
select id, 'customer', 'active', 'customer_default_for_public_accounts'
from public.profiles
where role in ('customer', 'merchant')
on conflict (user_id, role) do update
set
  status = excluded.status,
  source = coalesce(public.account_roles.source, excluded.source),
  updated_at = timezone('utc'::text, now()),
  revoked_at = null;
