alter table public.admin_action_logs
  drop constraint if exists admin_action_logs_target_type_check;

alter table public.admin_action_logs
  add constraint admin_action_logs_target_type_check
  check (target_type in ('merchant', 'package', 'booking', 'internal_account'));
