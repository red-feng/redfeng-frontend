update public.bookings
set
  booking_code = coalesce(booking_code, id::text),
  subtotal_amount = coalesce(subtotal_amount, total_amount),
  customer_admin_fee_amount = coalesce(customer_admin_fee_amount, 0),
  customer_tax_amount = coalesce(customer_tax_amount, 0),
  final_payment_amount = coalesce(
    final_payment_amount,
    greatest(coalesce(total_amount, 0) - coalesce(dp_amount, 0), 0)
  )
where
  booking_code is null
  or subtotal_amount is null
  or customer_admin_fee_amount is null
  or customer_tax_amount is null
  or final_payment_amount is null;
