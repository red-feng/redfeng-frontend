create table if not exists public.web_vitals_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  event_type text not null,
  metric_name text not null,
  metric_value double precision not null,
  path text not null,
  metric_id text,
  rating text,
  user_agent text
);

alter table public.web_vitals_events
  drop constraint if exists web_vitals_events_event_type_check;

alter table public.web_vitals_events
  add constraint web_vitals_events_event_type_check
  check (event_type in ('web-vital', 'navigation'));

alter table public.web_vitals_events
  drop constraint if exists web_vitals_events_rating_check;

alter table public.web_vitals_events
  add constraint web_vitals_events_rating_check
  check (rating in ('good', 'needs-improvement', 'poor') or rating is null);

create index if not exists web_vitals_events_created_at_idx
  on public.web_vitals_events (created_at desc);

create index if not exists web_vitals_events_metric_name_idx
  on public.web_vitals_events (metric_name);

create index if not exists web_vitals_events_path_idx
  on public.web_vitals_events (path);
