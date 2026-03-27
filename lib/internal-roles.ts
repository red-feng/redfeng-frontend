export const ADMIN_PORTAL_ROLES = ["admin", "operations_manager", "superadmin"] as const
export const FINANCE_PORTAL_ROLES = ["finance", "finance_manager", "superadmin"] as const
export const INTERNAL_ROLES = [...ADMIN_PORTAL_ROLES, "finance", "finance_manager"] as const

export type AdminPortalRole = (typeof ADMIN_PORTAL_ROLES)[number]
export type FinancePortalRole = (typeof FINANCE_PORTAL_ROLES)[number]
export type InternalRole = (typeof INTERNAL_ROLES)[number]
export type AdminManagedRole = "admin" | "operations_manager"
export type FinanceManagedRole = "finance" | "finance_manager"
export type AdminExecutionRole = "admin" | "superadmin"
export type FinanceExecutionRole = "finance" | "superadmin"
export type FinanceApprovalRole = "finance" | "finance_manager" | "superadmin"

export function isAdminPortalRole(role: string | null | undefined): role is AdminPortalRole {
  return ADMIN_PORTAL_ROLES.includes(String(role || "").trim().toLowerCase() as AdminPortalRole)
}

export function isFinancePortalRole(role: string | null | undefined): role is FinancePortalRole {
  return FINANCE_PORTAL_ROLES.includes(String(role || "").trim().toLowerCase() as FinancePortalRole)
}

export function isInternalRole(role: string | null | undefined): role is InternalRole {
  return INTERNAL_ROLES.includes(String(role || "").trim().toLowerCase() as InternalRole)
}

export function isAdminManagedRole(role: string | null | undefined): role is AdminManagedRole {
  return ["admin", "operations_manager"].includes(String(role || "").trim().toLowerCase())
}

export function isFinanceManagedRole(role: string | null | undefined): role is FinanceManagedRole {
  return ["finance", "finance_manager"].includes(String(role || "").trim().toLowerCase())
}

export function isAdminExecutionRole(role: string | null | undefined): role is AdminExecutionRole {
  return ["admin", "superadmin"].includes(String(role || "").trim().toLowerCase())
}

export function isFinanceExecutionRole(role: string | null | undefined): role is FinanceExecutionRole {
  return ["finance", "superadmin"].includes(String(role || "").trim().toLowerCase())
}

export function isFinanceApprovalRole(role: string | null | undefined): role is FinanceApprovalRole {
  return ["finance", "finance_manager", "superadmin"].includes(String(role || "").trim().toLowerCase())
}

export function getRoleLabel(role: string | null | undefined) {
  switch (String(role || "").trim().toLowerCase()) {
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
