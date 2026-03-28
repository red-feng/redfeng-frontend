drop policy if exists "admin_action_logs_select_internal" on public.admin_action_logs;

create policy "admin_action_logs_select_internal"
on public.admin_action_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin', 'finance')
  )
);
