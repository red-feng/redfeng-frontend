export type PublicAccountRole = "guest" | "customer" | "admin" | "finance" | "superadmin"

const PUBLIC_ACCOUNT_HOME_PATH: Record<PublicAccountRole, string> = {
  guest: "/login?next=%2Fcustomer%2Fdashboard",
  customer: "/customer/dashboard",
  admin: "/admin/dashboard",
  finance: "/finance/dashboard",
  superadmin: "/superadmin/dashboard",
}

export function resolvePublicAccountRole(role: string | null | undefined): PublicAccountRole {
  const normalized = String(role || "").trim().toLowerCase()
  if (normalized === "superadmin") return "superadmin"
  if (normalized === "admin" || normalized === "operations_manager") return "admin"
  if (normalized === "finance" || normalized === "finance_manager") return "finance"
  if (normalized === "customer" || normalized === "merchant") return "customer"
  return "guest"
}

export function getPublicAccountHomePath(role: PublicAccountRole) {
  return PUBLIC_ACCOUNT_HOME_PATH[role]
}
