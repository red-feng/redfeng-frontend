drop policy if exists "admin_action_logs_insert_internal" on public.admin_action_logs;

create policy "admin_action_logs_insert_internal"
on public.admin_action_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'finance', 'finance_manager', 'superadmin')
  )
);
