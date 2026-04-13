create extension if not exists pgcrypto;

create table if not exists public.sso_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target text not null,
  token_hash text not null unique,
  redirect_path text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sso_tokens_target_check check (target in ('wordpress'))
);

create index if not exists sso_tokens_target_expires_idx
  on public.sso_tokens (target, expires_at desc);

create index if not exists sso_tokens_user_created_idx
  on public.sso_tokens (user_id, created_at desc);
