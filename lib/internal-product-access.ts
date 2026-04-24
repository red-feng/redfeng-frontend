import type { SupabaseClient } from "@supabase/supabase-js"
import type { BookingProductType } from "@/lib/booking-products"

export const INTERNAL_PRODUCT_TYPES = [
  "package_tour",
  "flight",
  "hotel",
  "train",
  "bus",
  "sea",
  "cruise",
] as const

export type InternalProductType = (typeof INTERNAL_PRODUCT_TYPES)[number]
export type InternalProductAccessLevel = "view" | "execute" | "manage"
export type InternalProductAccessStatus = "active" | "revoked" | "suspended"

type InternalRole = "admin" | "operations_manager" | "finance" | "finance_manager" | "superadmin"

type InternalProductAccessRow = {
  user_id: string
  product_type: string
  access_level: InternalProductAccessLevel
  status: InternalProductAccessStatus
}

export function normalizeInternalProductType(value: string | null | undefined): InternalProductType | null {
  const normalized = String(value || "").trim().toLowerCase()
  return INTERNAL_PRODUCT_TYPES.includes(normalized as InternalProductType) ? (normalized as InternalProductType) : null
}

function normalizeInternalRole(value: string | null | undefined): InternalRole | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "admin" ||
    normalized === "operations_manager" ||
    normalized === "finance" ||
    normalized === "finance_manager" ||
    normalized === "superadmin"
  ) {
    return normalized
  }
  return null
}

const ACCESS_LEVEL_WEIGHT: Record<InternalProductAccessLevel, number> = {
  view: 1,
  execute: 2,
  manage: 3,
}

function getDefaultRoleProductAccess(role: InternalRole | null): Array<{ productType: InternalProductType; accessLevel: InternalProductAccessLevel }> {
  if (!role) return []
  if (role === "superadmin" || role === "operations_manager" || role === "finance_manager") {
    return INTERNAL_PRODUCT_TYPES.map((productType) => ({ productType, accessLevel: "manage" }))
  }
  if (role === "finance") {
    return INTERNAL_PRODUCT_TYPES.map((productType) => ({ productType, accessLevel: "execute" }))
  }
  if (role === "admin") {
    return INTERNAL_PRODUCT_TYPES.map((productType) => ({
      productType,
      accessLevel: productType === "package_tour" ? "manage" : "execute",
    }))
  }
  return []
}

export async function ensureInternalProductAccess(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  productType: InternalProductType,
  accessLevel: InternalProductAccessLevel,
  source: string,
  grantedBy?: string | null,
) {
  if (!userId) return

  const { error } = await adminSupabase.from("internal_user_product_access").upsert(
    {
      user_id: userId,
      product_type: productType,
      access_level: accessLevel,
      status: "active",
      source,
      granted_by: grantedBy || null,
      updated_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "user_id,product_type" },
  )

  if (error) {
    throw new Error(`Gagal mengaktifkan akses produk ${productType}: ${error.message}`)
  }
}

export async function revokeInternalProductAccess(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  productType: InternalProductType,
  source: string,
) {
  if (!userId) return

  const now = new Date().toISOString()
  const { error } = await adminSupabase.from("internal_user_product_access").upsert(
    {
      user_id: userId,
      product_type: productType,
      access_level: "view",
      status: "revoked",
      source,
      updated_at: now,
      revoked_at: now,
    },
    { onConflict: "user_id,product_type" },
  )

  if (error) {
    throw new Error(`Gagal mencabut akses produk ${productType}: ${error.message}`)
  }
}

export async function getAccessibleInternalProducts(
  adminSupabase: SupabaseClient,
  userId: string | null | undefined,
  role: string | null | undefined,
) {
  const normalizedRole = normalizeInternalRole(role)
  if (!userId) {
    return getDefaultRoleProductAccess(normalizedRole)
  }

  const { data, error } = await adminSupabase
    .from("internal_user_product_access")
    .select("user_id, product_type, access_level, status")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    console.error("[internal-product-access] failed to load product access", {
      userId,
      role,
      error: error.message,
    })
    return getDefaultRoleProductAccess(normalizedRole)
  }

  const rows = ((data as InternalProductAccessRow[] | null) || [])
    .map((row) => {
      const productType = normalizeInternalProductType(row.product_type)
      if (!productType) return null
      return {
        productType,
        accessLevel: row.access_level,
      }
    })
    .filter(Boolean) as Array<{ productType: InternalProductType; accessLevel: InternalProductAccessLevel }>

  return rows.length > 0 ? rows : getDefaultRoleProductAccess(normalizedRole)
}

export function hasInternalProductAccess(
  entries: Array<{ productType: InternalProductType; accessLevel: InternalProductAccessLevel }>,
  productType: InternalProductType | BookingProductType,
  minimumLevel: InternalProductAccessLevel = "view",
) {
  const requiredWeight = ACCESS_LEVEL_WEIGHT[minimumLevel]
  return entries.some((entry) => entry.productType === productType && ACCESS_LEVEL_WEIGHT[entry.accessLevel] >= requiredWeight)
}

export function getAccessibleInternalProductTypes(
  entries: Array<{ productType: InternalProductType; accessLevel: InternalProductAccessLevel }>,
  minimumLevel: InternalProductAccessLevel = "view",
) {
  const requiredWeight = ACCESS_LEVEL_WEIGHT[minimumLevel]
  return entries
    .filter((entry) => ACCESS_LEVEL_WEIGHT[entry.accessLevel] >= requiredWeight)
    .map((entry) => entry.productType)
}

export function toDashboardOperationsProduct(productType: InternalProductType) {
  return productType
}

export function toAdminProductFilter(productType: InternalProductType) {
  if (productType === "package_tour") return "paket-tour" as const
  if (productType === "flight") return "pesawat" as const
  if (productType === "hotel") return "hotel" as const
  if (productType === "train") return "kereta-api" as const
  if (productType === "bus") return "bus-travel" as const
  if (productType === "sea") return "kapal-laut" as const
  return "kapal-pesiar" as const
}

export function toAdminProductNavHref(productType: InternalProductType) {
  if (productType === "package_tour") return "/admin/paket-tour"
  if (productType === "flight") return "/admin/pesawat"
  if (productType === "hotel") return "/admin/hotel"
  if (productType === "train") return "/admin/kereta-api"
  if (productType === "bus") return "/admin/bus-travel"
  if (productType === "sea") return "/admin/kapal-laut"
  return "/admin/kapal-pesiar"
}
