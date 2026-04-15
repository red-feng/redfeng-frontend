-- Performance indexes for booking-linked system message cleanup.
-- Helps large datasets when joining room -> booking and filtering system markers.

create index if not exists package_chat_rooms_booking_id_idx
  on public.package_chat_rooms (booking_id)
  where booking_id is not null;

create index if not exists package_chat_messages_booking_linked_marker_idx
  on public.package_chat_messages (room_id)
  where message like '__RF_SYSTEM__:%'
    and message like '%"type":"booking_linked"%';
