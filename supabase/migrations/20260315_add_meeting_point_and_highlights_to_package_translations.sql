alter table public.package_translations
add column if not exists meeting_point text,
add column if not exists highlights text;
