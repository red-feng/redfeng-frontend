insert into public.suppliers (
  supplier_code,
  supplier_name,
  internal_display_name,
  internal_alias,
  brand_visibility,
  supplier_type,
  integration_mode,
  status,
  notes,
  metadata
)
values (
  'TRAVELOKA',
  'Traveloka',
  'Primary Reservation Partner',
  'PARTNER-RSV-01',
  'owner_only',
  'affiliate',
  'portal',
  'active',
  'Seed supplier utama untuk channel affiliate Red Feng. Ubah integration_mode ke api jika integrasi langsung sudah siap.',
  jsonb_build_object(
    'seed_source', '2026042405_seed_traveloka_supplier',
    'recommended_products', jsonb_build_array('flight', 'hotel', 'train', 'sea')
  )
)
on conflict (supplier_code) do update
set
  supplier_name = excluded.supplier_name,
  internal_display_name = excluded.internal_display_name,
  internal_alias = excluded.internal_alias,
  brand_visibility = excluded.brand_visibility,
  supplier_type = excluded.supplier_type,
  integration_mode = excluded.integration_mode,
  status = excluded.status,
  notes = excluded.notes,
  metadata = public.suppliers.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

with seeded_supplier as (
  select id
  from public.suppliers
  where supplier_code = 'TRAVELOKA'
)
insert into public.supplier_product_channels (
  supplier_id,
  product_type,
  channel_status,
  config
)
select
  seeded_supplier.id,
  channel.product_type,
  channel.channel_status,
  channel.config
from seeded_supplier
cross join (
  values
    ('flight', 'active', jsonb_build_object('launch_mode', 'phase_1', 'booking_flow', 'manual_affiliate')),
    ('hotel', 'pilot', jsonb_build_object('launch_mode', 'phase_2', 'booking_flow', 'manual_affiliate')),
    ('train', 'pilot', jsonb_build_object('launch_mode', 'phase_2', 'booking_flow', 'manual_affiliate')),
    ('sea', 'pilot', jsonb_build_object('launch_mode', 'phase_3', 'booking_flow', 'manual_affiliate'))
) as channel(product_type, channel_status, config)
on conflict (supplier_id, product_type) do update
set
  channel_status = excluded.channel_status,
  config = public.supplier_product_channels.config || excluded.config,
  updated_at = timezone('utc', now());
