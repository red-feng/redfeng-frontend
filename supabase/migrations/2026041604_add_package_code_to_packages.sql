-- Add merchant-friendly package code for every package row.
-- This does not replace primary key `id` (UUID), it complements it.

alter table public.packages
  add column if not exists package_code text;

create or replace function public.generate_package_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'PKG-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (
      select 1
      from public.packages
      where package_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_package_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.package_code is null or btrim(new.package_code) = '' then
    new.package_code := public.generate_package_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_packages_ensure_package_code on public.packages;

create trigger trg_packages_ensure_package_code
before insert on public.packages
for each row
execute function public.ensure_package_code();

update public.packages
set package_code = public.generate_package_code()
where package_code is null
   or btrim(package_code) = '';

create unique index if not exists packages_package_code_uidx
  on public.packages (package_code);

alter table public.packages
  alter column package_code set default public.generate_package_code();

alter table public.packages
  alter column package_code set not null;

