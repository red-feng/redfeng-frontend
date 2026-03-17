alter table public.package_translations
add column if not exists currency text,
add column if not exists price_adult numeric,
add column if not exists price_child numeric;

update public.package_translations as pt
set
  currency = coalesce(pt.currency, p.currency),
  price_adult = coalesce(pt.price_adult, p.price_adult),
  price_child = coalesce(pt.price_child, p.price_child)
from public.packages as p
where p.id = pt.package_id;
