import {
  PACKAGE_TOUR_ADMIN_FILTER,
  PACKAGE_TOUR_LABEL,
  PACKAGE_TOUR_PRODUCT_TYPE,
} from "@/lib/package-tour-lock"

export type BookingProductType =
  | typeof PACKAGE_TOUR_PRODUCT_TYPE
  | "flight"
  | "hotel"
  | "train"
  | "bus"
  | "sea"
  | "cruise"

export function normalizeBookingProductType(value: string | null | undefined): BookingProductType | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === PACKAGE_TOUR_PRODUCT_TYPE ||
    normalized === "flight" ||
    normalized === "hotel" ||
    normalized === "train" ||
    normalized === "bus" ||
    normalized === "sea" ||
    normalized === "cruise"
  ) {
    return normalized
  }
  return null
}

export function resolveBookingProductType(params: {
  bookingProductType?: string | null
  packageId?: string | null
}): BookingProductType {
  const explicitType = normalizeBookingProductType(params.bookingProductType)
  if (explicitType) return explicitType
  if (params.packageId) return PACKAGE_TOUR_PRODUCT_TYPE
  return "flight"
}

export function toDashboardProductFilter(productType: BookingProductType): "package_tour" | "flight" | "hotel" | "train" | "bus" | "sea" | "cruise" {
  return productType
}

export function toAdminBookingFilter(productType: BookingProductType): "paket-tour" | "pesawat" | "hotel" | "kereta-api" | "bus-travel" | "kapal-laut" | "kapal-pesiar" {
  if (productType === PACKAGE_TOUR_PRODUCT_TYPE) return PACKAGE_TOUR_ADMIN_FILTER
  if (productType === "flight") return "pesawat"
  if (productType === "hotel") return "hotel"
  if (productType === "train") return "kereta-api"
  if (productType === "bus") return "bus-travel"
  if (productType === "sea") return "kapal-laut"
  return "kapal-pesiar"
}

export function getBookingProductLabel(productType: BookingProductType): string {
  if (productType === PACKAGE_TOUR_PRODUCT_TYPE) return PACKAGE_TOUR_LABEL
  if (productType === "flight") return "Pesawat"
  if (productType === "hotel") return "Hotel"
  if (productType === "train") return "Kereta Api"
  if (productType === "bus") return "Bus & Travel"
  if (productType === "sea") return "Kapal Laut"
  return "Kapal Pesiar"
}
