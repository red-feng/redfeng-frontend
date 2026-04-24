export type BookingProductType =
  | "package_tour"
  | "flight"
  | "hotel"
  | "train"
  | "bus"
  | "sea"
  | "cruise"

export function normalizeBookingProductType(value: string | null | undefined): BookingProductType | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "package_tour" ||
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
  if (params.packageId) return "package_tour"
  return "flight"
}

export function toDashboardProductFilter(productType: BookingProductType): "package_tour" | "flight" | "hotel" | "train" | "bus" | "sea" | "cruise" {
  return productType
}

export function toAdminBookingFilter(productType: BookingProductType): "paket-tour" | "pesawat" | "hotel" | "kereta-api" | "bus-travel" | "kapal-laut" | "kapal-pesiar" {
  if (productType === "package_tour") return "paket-tour"
  if (productType === "flight") return "pesawat"
  if (productType === "hotel") return "hotel"
  if (productType === "train") return "kereta-api"
  if (productType === "bus") return "bus-travel"
  if (productType === "sea") return "kapal-laut"
  return "kapal-pesiar"
}

export function getBookingProductLabel(productType: BookingProductType): string {
  if (productType === "package_tour") return "Paket Wisata"
  if (productType === "flight") return "Pesawat"
  if (productType === "hotel") return "Hotel"
  if (productType === "train") return "Kereta Api"
  if (productType === "bus") return "Bus & Travel"
  if (productType === "sea") return "Kapal Laut"
  return "Kapal Pesiar"
}
