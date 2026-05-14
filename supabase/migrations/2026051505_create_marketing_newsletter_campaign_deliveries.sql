create table if not exists public.marketing_newsletter_campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_newsletter_campaigns(id) on delete cascade,
  email text not null,
  locale text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketing_newsletter_campaign_deliveries_campaign_email_key unique (campaign_id, email)
);

create index if not exists marketing_newsletter_campaign_deliveries_campaign_status_idx
  on public.marketing_newsletter_campaign_deliveries (campaign_id, status, updated_at desc);

alter table public.marketing_newsletter_campaign_deliveries enable row level security;
