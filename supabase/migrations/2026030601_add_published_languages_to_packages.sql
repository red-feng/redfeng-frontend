alter table public.packages
add column if not exists published_languages text[] not null default array['id']::text[];

update public.packages
set published_languages = array[coalesce(default_language, 'id')]::text[]
where published_languages is null
   or cardinality(published_languages) = 0;
