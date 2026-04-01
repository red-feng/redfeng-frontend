const JAKARTA_LOCALE = "id-ID"
const JAKARTA_TIMEZONE = "Asia/Jakarta"

function getDueDateBase(pickupDate: string | null) {
  if (!pickupDate) return null

  const [year, month, day] = String(pickupDate).split("-").map((part) => Number(part))
  if (!year || !month || !day) return null

  const dueDate = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999))
  dueDate.setUTCDate(dueDate.getUTCDate() - 3)
  return dueDate
}

export function getFinalPaymentDueAt(pickupDate: string | null) {
  return getDueDateBase(pickupDate)
}

export function isFinalPaymentOverdue(pickupDate: string | null, now = new Date()) {
  const dueAt = getFinalPaymentDueAt(pickupDate)
  if (!dueAt) return false
  return now.getTime() > dueAt.getTime()
}

export function formatFinalPaymentDueLabel(pickupDate: string | null) {
  const dueAt = getFinalPaymentDueAt(pickupDate)
  if (!dueAt) return "-"

  const dateLabel = dueAt.toLocaleDateString(JAKARTA_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIMEZONE,
  })

  return `${dateLabel} 23.59 WIB`
}
