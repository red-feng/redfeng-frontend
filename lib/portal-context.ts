export const ACTIVE_PORTAL_COOKIE = "rf_active_portal"
export const ACTIVE_PORTAL_MAX_AGE = 60 * 60 * 24 * 30

export const PORTAL_SESSION_NAMESPACES = ["customer", "merchant", "admin", "finance", "superadmin"] as const

export type ActivePortal = (typeof PORTAL_SESSION_NAMESPACES)[number]

export const CUSTOMER_PORTAL_DEFAULT_REDIRECT = "/customer/dashboard"
export const MERCHANT_PORTAL_DEFAULT_REDIRECT = "/merchant/dashboard"

export function normalizeActivePortal(value: string | null | undefined): ActivePortal | "" {
  const normalized = String(value || "").trim().toLowerCase()
  if (PORTAL_SESSION_NAMESPACES.includes(normalized as ActivePortal)) {
    return normalized as ActivePortal
  }
  return ""
}

export function getPortalSessionCookieName(portal: ActivePortal) {
  return `rf-sb-${portal}-auth`
}

export function resolvePortalFromPathname(pathname: string | null | undefined): ActivePortal {
  const normalizedPathname = String(pathname || "").trim().toLowerCase()

  if (normalizedPathname.startsWith("/merchant")) return "merchant"
  if (normalizedPathname.startsWith("/admin")) return "admin"
  if (normalizedPathname.startsWith("/finance")) return "finance"
  if (normalizedPathname.startsWith("/superadmin")) return "superadmin"

  return "customer"
}
