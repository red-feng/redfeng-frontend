const DAY_MS = 24 * 60 * 60 * 1000

function getJakartaTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function toUtcMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, (month || 1) - 1, day || 1)
}

export function addDaysToDateString(value: string, days: number) {
  const timestamp = toUtcMidnight(value)
  return new Date(timestamp + days * DAY_MS).toISOString().slice(0, 10)
}

export function getMinimumBookingDate() {
  return addDaysToDateString(getJakartaTodayDateString(), 3)
}

export function calculateDaysDiff(pickupDateUTC: string) {
  const minimumBookingDate = getMinimumBookingDate()
  const diffMs = toUtcMidnight(pickupDateUTC) - toUtcMidnight(minimumBookingDate)
  return Math.floor(diffMs / DAY_MS) + 3
}

export function validateBookingWindow(pickupDateUTC: string) {
  const minimumBookingDate = getMinimumBookingDate()
  const daysDiff = calculateDaysDiff(pickupDateUTC)

  if (pickupDateUTC < minimumBookingDate) {
    return {
      allowed: false,
      reason: `Booking hanya bisa dilakukan mulai ${minimumBookingDate}.`
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
