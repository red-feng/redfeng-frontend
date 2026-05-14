export const SUPERADMIN_NAV_SEEN_SECTIONS = [
  "ops_accounts",
  "finance_accounts",
  "marketing_accounts",
  "superadmin_accounts",
  "bookings",
  "audit_log",
] as const

export type SuperadminNavSeenSection = (typeof SUPERADMIN_NAV_SEEN_SECTIONS)[number]

export const SUPERADMIN_NAV_SECTION_TO_COLUMN: Record<SuperadminNavSeenSection, string> = {
  ops_accounts: "seen_ops_accounts_at",
  finance_accounts: "seen_finance_accounts_at",
  marketing_accounts: "seen_marketing_accounts_at",
  superadmin_accounts: "seen_superadmin_accounts_at",
  bookings: "seen_bookings_at",
  audit_log: "seen_audit_log_at",
}

export const SUPERADMIN_NAV_ROUTE_SECTION_MAP: Array<{ prefix: string; section: SuperadminNavSeenSection }> = [
  { prefix: "/superadmin/team-accounts", section: "ops_accounts" },
  { prefix: "/superadmin/finance-team-accounts", section: "finance_accounts" },
  { prefix: "/superadmin/marketing-team-accounts", section: "marketing_accounts" },
  { prefix: "/superadmin/superadmin-accounts", section: "superadmin_accounts" },
  { prefix: "/admin/bookings", section: "bookings" },
  { prefix: "/admin/audit-log", section: "audit_log" },
]

export function isSuperadminNavSeenSection(value: string): value is SuperadminNavSeenSection {
  return SUPERADMIN_NAV_SEEN_SECTIONS.includes(value as SuperadminNavSeenSection)
}
