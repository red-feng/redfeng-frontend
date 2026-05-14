create table if not exists public.marketing_promo_events (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid references public.marketing_promos(id) on delete set null,
  promo_slug text not null,
  event_type text not null check (event_type in ('impression', 'click')),
  placement_key text,
  source_path text,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_promo_events_occurred_idx
  on public.marketing_promo_events (occurred_at desc);

create index if not exists marketing_promo_events_type_idx
  on public.marketing_promo_events (event_type, occurred_at desc);

create index if not exists marketing_promo_events_placement_idx
  on public.marketing_promo_events (placement_key, event_type, occurred_at desc);

create index if not exists marketing_promo_events_promo_idx
  on public.marketing_promo_events (promo_id, promo_slug, event_type, occurred_at desc);

alter table public.marketing_promo_events enable row level security;
