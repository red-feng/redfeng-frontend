export const FLIGHT_PAYMENT_WINDOW_MINUTES = 5

function parseDateTime(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getFlightPaymentDeadline(
  supplierHoldExpiresAt: string | null | undefined,
  openedAt = new Date(),
) {
  const redFengDeadline = new Date(openedAt)
  redFengDeadline.setMinutes(redFengDeadline.getMinutes() + FLIGHT_PAYMENT_WINDOW_MINUTES)

  const supplierDeadline = parseDateTime(supplierHoldExpiresAt)
  if (supplierDeadline && supplierDeadline.getTime() < redFengDeadline.getTime()) {
    return supplierDeadline
  }

  return redFengDeadline
}

export function isFlightPaymentDeadlineExpired(value: string | null | undefined, now = new Date()) {
  const deadline = parseDateTime(value)
  return Boolean(deadline && deadline.getTime() <= now.getTime())
}
