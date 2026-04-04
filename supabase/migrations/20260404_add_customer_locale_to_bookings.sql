alter table public.bookings
add column if not exists customer_locale text;

alter table public.bookings
drop constraint if exists bookings_customer_locale_check;

alter table public.bookings
add constraint bookings_customer_locale_check
check (customer_locale in ('id', 'en', 'zh') or customer_locale is null);

update public.bookings
set customer_locale = case
  when upper(coalesce(display_currency, '')) = 'USD' then 'en'
  when upper(coalesce(display_currency, '')) in ('CNY', 'RMB') then 'zh'
  else 'id'
end
where customer_locale is null;
