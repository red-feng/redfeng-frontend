export const ADMIN_PORTAL_ROLES = ["admin", "operations_manager"] as const
export const FINANCE_PORTAL_ROLES = ["finance", "finance_manager"] as const
export const INTERNAL_ROLES = [...ADMIN_PORTAL_ROLES, ...FINANCE_PORTAL_ROLES, "superadmin"] as const
export const INTERNAL_PORTALS = ["admin", "finance", "superadmin"] as const

export type AdminPortalRole = (typeof ADMIN_PORTAL_ROLES)[number]
export type FinancePortalRole = (typeof FINANCE_PORTAL_ROLES)[number]
export type InternalRole = (typeof INTERNAL_ROLES)[number]
export type InternalPortal = (typeof INTERNAL_PORTALS)[number]
export type AdminManagedRole = "admin" | "operations_manager"
export type FinanceManagedRole = "finance" | "finance_manager"
export type AdminExecutionRole = "admin" | "superadmin"
export type FinanceExecutionRole = "finance" | "superadmin"
export type FinanceApprovalRole = "finance_manager" | "superadmin"

const INTERNAL_PORTAL_ALLOWED_ROLES: Record<InternalPortal, readonly string[]> = {
  admin: ADMIN_PORTAL_ROLES,
  finance: FINANCE_PORTAL_ROLES,
  superadmin: ["superadmin"],
}

const INTERNAL_PORTAL_HOME_PATH: Record<InternalPortal, string> = {
  admin: "/admin/dashboard",
  finance: "/finance/dashboard",
  superadmin: "/superadmin/dashboard",
}

export function normalizeRole(role: string | null | undefined) {
  return String(role || "").trim().toLowerCase()
}

export function isAdminPortalRole(role: string | null | undefined): role is AdminPortalRole {
  return ADMIN_PORTAL_ROLES.includes(normalizeRole(role) as AdminPortalRole)
}

export function isFinancePortalRole(role: string | null | undefined): role is FinancePortalRole {
  return FINANCE_PORTAL_ROLES.includes(normalizeRole(role) as FinancePortalRole)
}

export function isInternalRole(role: string | null | undefined): role is InternalRole {
  return INTERNAL_ROLES.includes(normalizeRole(role) as InternalRole)
}

export function isAdminManagedRole(role: string | null | undefined): role is AdminManagedRole {
  return ["admin", "operations_manager"].includes(normalizeRole(role))
}

export function isFinanceManagedRole(role: string | null | undefined): role is FinanceManagedRole {
  return ["finance", "finance_manager"].includes(normalizeRole(role))
}

export function isAdminExecutionRole(role: string | null | undefined): role is AdminExecutionRole {
  return ["admin", "superadmin"].includes(normalizeRole(role))
}

export function isFinanceExecutionRole(role: string | null | undefined): role is FinanceExecutionRole {
  return ["finance", "superadmin"].includes(normalizeRole(role))
}

export function isFinanceApprovalRole(role: string | null | undefined): role is FinanceApprovalRole {
  return ["finance_manager", "superadmin"].includes(normalizeRole(role))
}

export function canAccessInternalPortal(portal: InternalPortal, role: string | null | undefined) {
  return INTERNAL_PORTAL_ALLOWED_ROLES[portal].includes(normalizeRole(role))
}

export function getInternalPortalHomePath(portal: InternalPortal) {
  return INTERNAL_PORTAL_HOME_PATH[portal]
}

export function getRoleLabel(role: string | null | undefined) {
  switch (normalizeRole(role)) {
    case "operations_manager":
      return "Operations Manager"
    case "finance_manager":
      return "Finance Manager"
    case "superadmin":
      return "Superadmin"
    case "finance":
      return "Finance"
    case "admin":
      return "Admin"
    case "merchant":
      return "Merchant"
    case "customer":
      return "Customer"
    default:
      return "Unknown Role"
  }
}
