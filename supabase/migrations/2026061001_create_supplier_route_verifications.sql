create table if not exists public.supplier_route_verifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_type text not null
    check (product_type in ('flight', 'hotel', 'train', 'bus', 'sea', 'cruise')),
  origin_code text not null,
  destination_code text not null,
  airline_codes text[] not null default '{}',
  verified_dates date[] not null default '{}',
  lowest_observed_fare_idr bigint,
  availability_status text not null default 'reference_available'
    check (availability_status in ('reference_available', 'uat_live_verified', 'production_live_verified')),
  verification_environment text not null default 'reference'
    check (verification_environment in ('reference', 'uat', 'production')),
  verification_notes text,
  metadata jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (supplier_id, product_type, origin_code, destination_code, verification_environment)
);

create index if not exists supplier_route_verifications_supplier_idx
  on public.supplier_route_verifications (supplier_id, product_type, verification_environment, availability_status);

create index if not exists supplier_route_verifications_route_idx
  on public.supplier_route_verifications (product_type, origin_code, destination_code, last_verified_at desc);

alter table public.supplier_route_verifications enable row level security;

drop policy if exists "supplier_route_verifications_select_internal" on public.supplier_route_verifications;
create policy "supplier_route_verifications_select_internal"
on public.supplier_route_verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);

drop policy if exists "supplier_route_verifications_write_internal" on public.supplier_route_verifications;
create policy "supplier_route_verifications_write_internal"
on public.supplier_route_verifications
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
);

insert into public.suppliers (
  supplier_code,
  supplier_name,
  supplier_type,
  integration_mode,
  status,
  notes,
  metadata
)
values (
  'DHARMAWISATA_H2H',
  'Dharmawisata H2H',
  'affiliate',
  'api',
  'active',
  'Supplier H2H Dharmawisata untuk integrasi flight RedFeng. Status live saat ini masih diverifikasi lewat environment UAT/development.',
  jsonb_build_object(
    'seed_source', '2026061001_create_supplier_route_verifications',
    'provider_key', 'dharmawisata-h2h',
    'environments', jsonb_build_array('uat')
  )
)
on conflict (supplier_code) do update
set
  supplier_name = excluded.supplier_name,
  supplier_type = excluded.supplier_type,
  integration_mode = excluded.integration_mode,
  status = excluded.status,
  notes = excluded.notes,
  metadata = public.suppliers.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

with dharmawisata_supplier as (
  select id
  from public.suppliers
  where supplier_code = 'DHARMAWISATA_H2H'
)
insert into public.supplier_product_channels (
  supplier_id,
  product_type,
  channel_status,
  config
)
select
  dharmawisata_supplier.id,
  'flight',
  'active',
  jsonb_build_object(
    'launch_mode', 'uat_live_verification',
    'booking_flow', 'affiliate_api',
    'provider_key', 'dharmawisata-h2h'
  )
from dharmawisata_supplier
on conflict (supplier_id, product_type) do update
set
  channel_status = excluded.channel_status,
  config = public.supplier_product_channels.config || excluded.config,
  updated_at = timezone('utc', now());

with dharmawisata_supplier as (
  select id
  from public.suppliers
  where supplier_code = 'DHARMAWISATA_H2H'
)
insert into public.supplier_route_verifications (
  supplier_id,
  product_type,
  origin_code,
  destination_code,
  airline_codes,
  verified_dates,
  lowest_observed_fare_idr,
  availability_status,
  verification_environment,
  verification_notes,
  metadata,
  last_verified_at
)
select
  dharmawisata_supplier.id,
  seeded.product_type,
  seeded.origin_code,
  seeded.destination_code,
  seeded.airline_codes,
  seeded.verified_dates,
  seeded.lowest_observed_fare_idr,
  seeded.availability_status,
  seeded.verification_environment,
  seeded.verification_notes,
  seeded.metadata,
  seeded.last_verified_at
from dharmawisata_supplier
cross join (
  values
    (
      'flight',
      'CGK',
      'SUB',
      array['QG']::text[],
      array['2026-06-24'::date, '2026-06-26'::date],
      351000::bigint,
      'uat_live_verified',
      'uat',
      'Observed from Dharmawisata UAT low-fare schedule during RedFeng integration verification.',
      jsonb_build_object('seed_source', '2026061001_create_supplier_route_verifications'),
      '2026-06-10T09:00:00+07'::timestamptz
    ),
    (
      'flight',
      'SUB',
      'CGK',
      array['QG', 'QZ']::text[],
      array['2026-06-24'::date],
      351000::bigint,
      'uat_live_verified',
      'uat',
      'Observed from Dharmawisata UAT low-fare schedule during RedFeng integration verification.',
      jsonb_build_object('seed_source', '2026061001_create_supplier_route_verifications'),
      '2026-06-10T09:00:00+07'::timestamptz
    ),
    (
      'flight',
      'CGK',
      'KNO',
      array['QG']::text[],
      array['2026-06-24'::date],
      538000::bigint,
      'uat_live_verified',
      'uat',
      'Observed from Dharmawisata UAT low-fare schedule during RedFeng integration verification.',
      jsonb_build_object('seed_source', '2026061001_create_supplier_route_verifications'),
      '2026-06-10T09:00:00+07'::timestamptz
    )
) as seeded(
  product_type,
  origin_code,
  destination_code,
  airline_codes,
  verified_dates,
  lowest_observed_fare_idr,
  availability_status,
  verification_environment,
  verification_notes,
  metadata,
  last_verified_at
)
on conflict (supplier_id, product_type, origin_code, destination_code, verification_environment) do update
set
  airline_codes = excluded.airline_codes,
  verified_dates = excluded.verified_dates,
  lowest_observed_fare_idr = excluded.lowest_observed_fare_idr,
  availability_status = excluded.availability_status,
  verification_notes = excluded.verification_notes,
  metadata = public.supplier_route_verifications.metadata || excluded.metadata,
  last_verified_at = excluded.last_verified_at,
  updated_at = timezone('utc', now());
