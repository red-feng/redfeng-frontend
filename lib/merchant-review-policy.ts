export const MERCHANT_REVIEW_ROLES = {
  requester: "admin",
  decider: "operations_manager",
} as const

export const MERCHANT_DELETION_ROLES = {
  requester: "admin",
  decider: "operations_manager",
  overrideCloser: "superadmin",
} as const

export const MERCHANT_REVIEW_BUTTONS = {
  submit: "Ajukan",
  approve: "Setujui",
  reject: "Tolak",
  cancel: "Batalkan",
} as const

function normalizeRole(role: string | null | undefined) {
  return String(role || "").trim().toLowerCase()
}

export function canRequestMerchantRegistrationReview(role: string | null | undefined) {
  return normalizeRole(role) === MERCHANT_REVIEW_ROLES.requester
}

export function canDecideMerchantRegistrationReview(role: string | null | undefined) {
  return normalizeRole(role) === MERCHANT_REVIEW_ROLES.decider
}

export function canRequestMerchantDeletionReview(role: string | null | undefined) {
  return normalizeRole(role) === MERCHANT_DELETION_ROLES.requester
}

export function canDecideMerchantDeletionReview(role: string | null | undefined) {
  return normalizeRole(role) === MERCHANT_DELETION_ROLES.decider
}
