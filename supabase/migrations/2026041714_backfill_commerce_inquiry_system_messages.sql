-- Backfill legacy inquiry system messages so older commerce inquiry threads
-- render the same structured inquiry card as newly created threads.

update public.commerce_chat_messages m
set body = '__RF_SYSTEM__:' || json_build_object(
  'type', 'package_inquiry',
  'packageId', t.subject_package_id
)::text
from public.commerce_chat_threads t
where t.id = m.thread_id
  and t.thread_type = 'inquiry'
  and t.subject_package_id is not null
  and m.sender_role = 'system'
  and m.message_type = 'system_event'
  and m.body not like '__RF_SYSTEM__:%'
  and m.body like 'Thread inquiry dibuat untuk paket "%".';
