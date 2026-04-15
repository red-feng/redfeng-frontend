-- Cleanup legacy booking_linked system cards that were created
-- before payment reached a valid paid stage.
-- Valid payment stages for showing booking-linked confirmation:
-- - paid
-- - dp_paid

delete from public.package_chat_messages m
using public.package_chat_rooms r
left join public.bookings b on b.id = r.booking_id
where m.room_id = r.id
  and m.message like '__RF_SYSTEM__:%'
  and m.message like '%"type":"booking_linked"%'
  and (
    b.id is null
    or lower(coalesce(b.payment_status::text, '')) not in ('paid', 'dp_paid')
  );
