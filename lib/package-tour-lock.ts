/**
 * Paket Tour adalah domain inti legacy Red Feng.
 * Saat menambah produk affiliate baru, jangan ubah konstanta di file ini
 * kecuali memang sedang mengerjakan workflow Paket Tour secara khusus.
 */
export const PACKAGE_TOUR_PRODUCT_TYPE = "package_tour" as const
export const PACKAGE_TOUR_LABEL = "Paket Wisata" as const
export const PACKAGE_TOUR_ADMIN_FILTER = "paket-tour" as const
export const PACKAGE_TOUR_ADMIN_HREF = "/admin/paket-tour" as const

export const PACKAGE_TOUR_REVIEW_ROLES = {
  requester: "admin",
  decider: "operations_manager",
} as const

export const PACKAGE_TOUR_DELETION_ROLES = {
  requester: "admin",
  decider: "operations_manager",
  overrideCloser: "superadmin",
} as const

export const PACKAGE_TOUR_LOCKED_ROLE_ACCESS = {
  admin: "manage",
  operations_manager: "manage",
  finance: "execute",
  finance_manager: "manage",
  superadmin: "manage",
} as const

type PackageTourLockedRole = keyof typeof PACKAGE_TOUR_LOCKED_ROLE_ACCESS
type PackageTourLockedAccessLevel = (typeof PACKAGE_TOUR_LOCKED_ROLE_ACCESS)[PackageTourLockedRole]

export function getPackageTourLockedAccessLevel(role: string | null | undefined): PackageTourLockedAccessLevel | null {
  const normalizedRole = String(role || "").trim().toLowerCase() as PackageTourLockedRole
  return normalizedRole in PACKAGE_TOUR_LOCKED_ROLE_ACCESS ? PACKAGE_TOUR_LOCKED_ROLE_ACCESS[normalizedRole] : null
}

export function mergePackageTourLockedAccess<TEntry extends { productType: string; accessLevel: string }>(
  entries: TEntry[],
  role: string | null | undefined,
): Array<TEntry | { productType: typeof PACKAGE_TOUR_PRODUCT_TYPE; accessLevel: PackageTourLockedAccessLevel }> {
  const lockedAccessLevel = getPackageTourLockedAccessLevel(role)
  if (!lockedAccessLevel) return entries

  const priority = {
    view: 1,
    execute: 2,
    manage: 3,
  } as const

  const existingEntry = entries.find((entry) => entry.productType === PACKAGE_TOUR_PRODUCT_TYPE)
  if (!existingEntry) {
    return [...entries, { productType: PACKAGE_TOUR_PRODUCT_TYPE, accessLevel: lockedAccessLevel }]
  }

  if ((priority[existingEntry.accessLevel as keyof typeof priority] || 0) >= priority[lockedAccessLevel]) {
    return entries
  }

  return entries.map((entry) =>
    entry.productType === PACKAGE_TOUR_PRODUCT_TYPE
      ? {
          ...entry,
          accessLevel: lockedAccessLevel,
        }
      : entry,
  )
}
