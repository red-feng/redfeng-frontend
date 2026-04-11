export const ADMIN_ACTIVE_BOOKING_BADGE_STATUSES = ["awaiting_admin_handoff", "finance_review"] as const
export const ADMIN_ACTIVE_PACKAGE_BADGE_STATUSES = ["pending"] as const
export const FINANCE_ACTIVE_REFUND_BADGE_STATUSES = [
  "refund_requested",
  "refund_under_review",
  "refund_approved",
  "refund_processing_midtrans",
  "refund_processing_bank",
] as const
export const FINANCE_ACTIVE_PAYOUT_BADGE_STATUSES = ["pending", "approved", "processing"] as const
export const MERCHANT_ACTIVE_PAYOUT_ESCROW_STATUSES = ["awaiting_admin_handoff", "finance_review", "payout_processing", "paid_out"] as const
export const MERCHANT_REVIEWED_PACKAGE_BADGE_STATUSES = ["approved", "rejected"] as const

export function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

export function isStatusInSet(value: string | null | undefined, allowedStatuses: readonly string[]) {
  return allowedStatuses.includes(normalizeStatus(value))
}

export function isNewerThan(timestamp: string | null | undefined, seenAt: string | undefined) {
  if (!timestamp) return false
  if (!seenAt) return true
  return timestamp > seenAt
}

export function latestTimestamp(values: Array<string | null | undefined>) {
  return values.filter(Boolean).sort().at(-1) || null
}

export function countRowsByStatus<T>(
  rows: T[],
  getStatus: (row: T) => string | null | undefined,
  allowedStatuses: readonly string[],
) {
  return rows.filter((row) => isStatusInSet(getStatus(row), allowedStatuses)).length
}
