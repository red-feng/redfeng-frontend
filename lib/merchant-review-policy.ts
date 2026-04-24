import { PACKAGE_TOUR_DELETION_ROLES, PACKAGE_TOUR_REVIEW_ROLES } from "@/lib/package-tour-lock"

export const MERCHANT_REVIEW_ROLES = {
  requester: PACKAGE_TOUR_REVIEW_ROLES.requester,
  decider: PACKAGE_TOUR_REVIEW_ROLES.decider,
} as const

export const MERCHANT_DELETION_ROLES = {
  requester: PACKAGE_TOUR_DELETION_ROLES.requester,
  decider: PACKAGE_TOUR_DELETION_ROLES.decider,
  overrideCloser: PACKAGE_TOUR_DELETION_ROLES.overrideCloser,
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
