alter table public.package_chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'package-chat-attachments',
  'package-chat-attachments',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]::text[]
where not exists (
  select 1 from storage.buckets where id = 'package-chat-attachments'
);
