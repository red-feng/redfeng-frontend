export const ADMIN_NAV_SEEN_SECTIONS = ["merchants", "packages", "bookings"] as const

export type AdminNavSeenSection = (typeof ADMIN_NAV_SEEN_SECTIONS)[number]

export const ADMIN_NAV_SECTION_TO_COLUMN: Record<AdminNavSeenSection, string> = {
  merchants: "seen_merchants_at",
  packages: "seen_packages_at",
  bookings: "seen_bookings_at",
}

export const ADMIN_NAV_ROUTE_SECTION_MAP: Array<{ prefix: string; section: AdminNavSeenSection }> = [
  { prefix: "/admin/merchants", section: "merchants" },
  { prefix: "/admin/packages", section: "packages" },
  { prefix: "/admin/bookings", section: "bookings" },
]

export function isAdminNavSeenSection(value: string): value is AdminNavSeenSection {
  return ADMIN_NAV_SEEN_SECTIONS.includes(value as AdminNavSeenSection)
}
