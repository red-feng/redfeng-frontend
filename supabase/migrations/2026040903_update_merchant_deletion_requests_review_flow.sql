alter table public.merchant_deletion_requests
  drop constraint if exists merchant_deletion_requests_status_check;

alter table public.merchant_deletion_requests
  add constraint merchant_deletion_requests_status_check
  check (status in ('pending', 'manager_rejected', 'approved', 'cancelled'));

drop policy if exists "merchant_deletion_requests_update_internal" on public.merchant_deletion_requests;
create policy "merchant_deletion_requests_update_internal"
on public.merchant_deletion_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'operations_manager', 'superadmin')
  )
);
