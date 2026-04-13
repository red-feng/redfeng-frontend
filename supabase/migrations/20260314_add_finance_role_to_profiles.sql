do $$
declare
  role_data_type text;
  role_udt_name text;
  check_constraint record;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    raise notice 'Table public.profiles not found. Skipping finance role migration.';
    return;
  end if;

  select data_type, udt_name
  into role_data_type, role_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'role';

  if role_data_type is null then
    raise notice 'Column public.profiles.role not found. Skipping finance role migration.';
    return;
  end if;

  if role_data_type = 'USER-DEFINED' then
    execute format('alter type public.%I add value if not exists ''finance''', role_udt_name);
    return;
  end if;

  for check_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', check_constraint.conname);
  end loop;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('customer', 'merchant', 'admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin'));
end $$;
