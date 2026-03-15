alter table public.merchants
  add column if not exists npwp_company text,
  add column if not exists nib text,
  add column if not exists bank_branch text,
  add column if not exists ktp_file_url text,
  add column if not exists npwp_file_url text,
  add column if not exists nib_file_url text;
