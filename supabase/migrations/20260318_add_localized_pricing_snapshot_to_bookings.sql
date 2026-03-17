alter table public.bookings
add column if not exists display_currency text,
add column if not exists display_subtotal_amount numeric,
add column if not exists display_price_adult numeric,
add column if not exists display_price_child numeric,
add column if not exists exchange_rate_date date;
