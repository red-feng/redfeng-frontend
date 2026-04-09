export const ACTIVE_PORTAL_COOKIE = "rf_active_portal"
export const ACTIVE_PORTAL_MAX_AGE = 60 * 60 * 24 * 30

export type ActivePortal = "customer" | "merchant"

export const CUSTOMER_PORTAL_DEFAULT_REDIRECT = "/customer/dashboard"
export const MERCHANT_PORTAL_DEFAULT_REDIRECT = "/merchant/dashboard"

export function normalizeActivePortal(value: string | null | undefined): ActivePortal | "" {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "customer" || normalized === "merchant") {
    return normalized
  }
  return ""
}
