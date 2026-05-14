create table if not exists public.marketing_newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  preview_text text,
  body_html text not null,
  body_text text,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  audience_count integer not null default 0,
  sent_count integer not null default 0,
  last_sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_newsletter_campaigns_status_idx
  on public.marketing_newsletter_campaigns (status, created_at desc);

alter table public.marketing_newsletter_campaigns enable row level security;
