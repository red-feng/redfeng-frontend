// lib/booking/bookingWindow.ts

export function calculateDaysDiff(pickupDateUTC: string) {
  const nowUTC = new Date()

  const pickup = new Date(pickupDateUTC)

  const todayMidnightUTC = new Date(Date.UTC(
    nowUTC.getUTCFullYear(),
    nowUTC.getUTCMonth(),
    nowUTC.getUTCDate()
  ))

  const pickupMidnightUTC = new Date(Date.UTC(
    pickup.getUTCFullYear(),
    pickup.getUTCMonth(),
    pickup.getUTCDate()
  ))

  const diffMs = pickupMidnightUTC.getTime() - todayMidnightUTC.getTime()

  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function validateBookingWindow(pickupDateUTC: string) {
  const daysDiff = calculateDaysDiff(pickupDateUTC)

  if (daysDiff < 3) {
    return {
      allowed: false,
      reason: "Booking minimal 3 hari sebelum penjemputan"
    }
  }

  if (daysDiff >= 3 && daysDiff < 5) {
    return {
      allowed: true,
      paymentMode: "full_only" as const
    }
  }

  return {
    allowed: true,
    paymentMode: "dp_allowed" as const,
    fullDueDate: new Date(
      new Date(pickupDateUTC).getTime() - 3 * 24 * 60 * 60 * 1000
    )
  }
}