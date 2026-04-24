alter table public.suppliers
  add column if not exists internal_display_name text,
  add column if not exists internal_alias text,
  add column if not exists brand_visibility text not null default 'owner_only';

alter table public.suppliers
  drop constraint if exists suppliers_brand_visibility_check;

alter table public.suppliers
  add constraint suppliers_brand_visibility_check
  check (brand_visibility in ('owner_only', 'superadmin_only', 'restricted_internal', 'visible_internal'));

update public.suppliers
set
  internal_display_name = coalesce(
    internal_display_name,
    case
      when supplier_type = 'affiliate' then 'Primary Reservation Partner'
      when supplier_type = 'aggregator' then 'Reservation Aggregator'
      when supplier_type = 'manual_partner' then 'Reservation Support Partner'
      else 'Internal Fulfillment Partner'
    end
  ),
  internal_alias = coalesce(
    internal_alias,
    case
      when supplier_type = 'affiliate' then 'PARTNER-RSV-01'
      when supplier_type = 'aggregator' then 'AGG-01'
      when supplier_type = 'manual_partner' then 'MANUAL-01'
      else 'INTERNAL-01'
    end
  ),
  brand_visibility = coalesce(nullif(brand_visibility, ''), 'owner_only'),
  updated_at = timezone('utc', now())
where internal_display_name is null
   or internal_alias is null
   or brand_visibility is null
   or brand_visibility = '';

update public.suppliers
set
  internal_display_name = 'Primary Reservation Partner',
  internal_alias = 'PARTNER-RSV-01',
  brand_visibility = 'owner_only',
  updated_at = timezone('utc', now())
where supplier_code = 'TRAVELOKA';
