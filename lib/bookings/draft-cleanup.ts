import type { SupabaseClient } from "@supabase/supabase-js"
import { getFinalPaymentDueAt } from "@/lib/booking/final-payment-deadline"

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

export function isDraftBookingDeletable(booking: {
  payment_status?: string | null
  booking_status?: string | null
}) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  const hasFinalPayment =
    paymentStatus === "paid" ||
    paymentStatus === "dp_paid" ||
    bookingStatus === "confirmed" ||
    bookingStatus === "awaiting_final_payment" ||
    bookingStatus === "merchant_arrived" ||
    bookingStatus === "customer_picked_up" ||
    bookingStatus === "awaiting_admin_handoff"

  return !hasFinalPayment
}

export function isBookingExpiredForNonPayment(
  booking: {
    payment_status?: string | null
    booking_status?: string | null
    payment_type?: string | null
    pickup_date?: string | null
    expiry_time?: string | null
  },
  now = new Date(),
) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const dueAt = getFinalPaymentDueAt(booking.pickup_date || null)

  if (paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "") {
    if (!isDraftBookingDeletable(booking)) {
      return false
    }

    if (dueAt) {
      return now.getTime() > dueAt.getTime()
    }

    if (booking.expiry_time) {
      const expiryTime = new Date(booking.expiry_time)
      if (!Number.isNaN(expiryTime.getTime())) {
        return now.getTime() > expiryTime.getTime()
      }
    }
  }

  if (paymentStatus === "dp_paid" || bookingStatus === "awaiting_final_payment") {
    if (!dueAt) {
      return false
    }

    return now.getTime() > dueAt.getTime()
  }

  return false
}

export async function deleteDraftBooking(
  supabase: SupabaseClient,
  bookingId: string,
) {
  await supabase.from("package_chat_rooms").delete().eq("booking_id", bookingId)
  await supabase.from("payments").delete().eq("booking_id", bookingId)
  await supabase.from("booking_participants").delete().eq("booking_id", bookingId)

  return supabase.from("bookings").delete().eq("id", bookingId)
}
