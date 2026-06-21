export const HOTEL_PAYMENT_WINDOW_MINUTES = 5

export function getHotelPaymentDeadline(now = new Date()) {
  return new Date(now.getTime() + HOTEL_PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString()
}

export function isHotelPaymentDeadlineExpired(value: string | null | undefined, now = new Date()) {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime()
}
