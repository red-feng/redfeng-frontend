create extension if not exists pgcrypto;

create table if not exists public.package_revisions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source text not null default 'merchant_edit',
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  live_snapshot jsonb not null default '{}'::jsonb,
  changed_fields text[] not null default '{}'::text[],
  summary text,
  submitted_by uuid,
  reviewed_by uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text,
  approved_at timestamptz,
  superseded_at timestamptz,
  base_package_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_revisions_source_check
    check (source in ('merchant_edit', 'admin_edit', 'system_sync')),
  constraint package_revisions_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected', 'superseded', 'cancelled'))
);

create index if not exists package_revisions_package_status_idx
  on public.package_revisions (package_id, status, created_at desc);

create index if not exists package_revisions_merchant_status_idx
  on public.package_revisions (merchant_id, status, created_at desc);

create index if not exists package_revisions_pending_idx
  on public.package_revisions (status, submitted_at desc)
  where status = 'pending';

create unique index if not exists package_revisions_one_open_revision_idx
  on public.package_revisions (package_id)
  where status in ('draft', 'pending');

create or replace function public.touch_package_revisions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_package_revisions_updated_at on public.package_revisions;

create trigger trg_touch_package_revisions_updated_at
before update on public.package_revisions
for each row
execute function public.touch_package_revisions_updated_at();
