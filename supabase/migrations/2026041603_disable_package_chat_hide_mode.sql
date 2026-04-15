-- Disable legacy hide-mode behavior for package chat rooms.
-- We now use permanent delete only.

update public.package_chat_rooms
set
  customer_hidden_at = null,
  merchant_hidden_at = null
where customer_hidden_at is not null
   or merchant_hidden_at is not null;
