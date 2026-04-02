alter table public.merchants
add column if not exists default_locale text not null default 'id'
check (default_locale in ('id', 'en', 'zh'));
