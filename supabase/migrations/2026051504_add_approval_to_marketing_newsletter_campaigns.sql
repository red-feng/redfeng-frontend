alter table public.marketing_newsletter_campaigns
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.marketing_newsletter_campaigns
  drop constraint if exists marketing_newsletter_campaigns_status_check;

alter table public.marketing_newsletter_campaigns
  add constraint marketing_newsletter_campaigns_status_check
  check (status in ('draft', 'approved', 'sent'));
