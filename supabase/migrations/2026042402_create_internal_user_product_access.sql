create table if not exists public.internal_user_product_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null,
  access_level text not null default 'view',
  status text not null default 'active',
  source text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  revoked_at timestamptz,
  primary key (user_id, product_type),
  constraint internal_user_product_access_product_type_check check (
    product_type in ('package_tour', 'flight', 'hotel', 'train', 'bus', 'sea', 'cruise')
  ),
  constraint internal_user_product_access_access_level_check check (
    access_level in ('view', 'execute', 'manage')
  ),
  constraint internal_user_product_access_status_check check (
    status in ('active', 'revoked', 'suspended')
  )
);

create index if not exists internal_user_product_access_active_lookup_idx
  on public.internal_user_product_access (user_id, product_type, access_level)
  where status = 'active';

alter table public.internal_user_product_access enable row level security;

drop policy if exists "Users can view own internal product access" on public.internal_user_product_access;
create policy "Users can view own internal product access"
  on public.internal_user_product_access
  for select
  using (auth.uid() = user_id);
