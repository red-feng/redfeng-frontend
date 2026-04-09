type ChatBookingLike = {
  bookingId?: string | null
  bookingStatus?: string | null
  paymentStatus?: string | null
}

export function normalizeChatBookingStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

export function isCompletedChatBooking(room: ChatBookingLike) {
  const bookingStatus = normalizeChatBookingStatus(room.bookingStatus)
  return bookingStatus === "completed" || bookingStatus === "done"
}

export function isVisiblePaidChatBooking(room: ChatBookingLike) {
  const paymentStatus = normalizeChatBookingStatus(room.paymentStatus)
  return paymentStatus === "paid" || paymentStatus === "dp_paid"
}

// Keep chat badges/counts aligned with the merchant order pipeline:
// booking aktif only means a booking that is paid/relevant and still in-trip.
export function isActiveChatBooking(room: ChatBookingLike) {
  if (!room.bookingId) return false

  const bookingStatus = normalizeChatBookingStatus(room.bookingStatus)
  const paymentStatus = normalizeChatBookingStatus(room.paymentStatus)

  if (!isVisiblePaidChatBooking(room)) return false
  if (isCompletedChatBooking(room)) return false
  if (bookingStatus === "payout_completed") return false
  if (bookingStatus === "cancelled" || paymentStatus === "cancelled") return false
  if (bookingStatus === "refund" || paymentStatus === "refund" || paymentStatus === "refunded") return false

  return true
}
