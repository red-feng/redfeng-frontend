export type SupplierType = "internal" | "affiliate" | "aggregator" | "manual_partner"
export type SupplierIntegrationMode = "manual" | "api" | "portal" | "email"
export type SupplierChannelStatus = "active" | "inactive" | "pilot"
export type SupplierBrandVisibility = "owner_only" | "superadmin_only" | "restricted_internal" | "visible_internal"

export type BookingFulfillmentMode = "internal" | "affiliate_api" | "affiliate_manual"
export type SupplierOrderStatus =
  | "not_applicable"
  | "draft"
  | "pending_submission"
  | "submitted"
  | "confirmed"
  | "issued"
  | "failed"
  | "cancel_requested"
  | "cancelled"
  | "refund_requested"
  | "refunded"

export type FlightTripType = "one_way" | "round_trip" | "multi_city"
export type FlightIssueStatus =
  | "pending_confirmation"
  | "confirmed"
  | "ticketing"
  | "issued"
  | "issue_failed"
  | "reschedule_requested"
  | "cancel_requested"
  | "cancelled"
  | "refunded"

export type FlightLifecycleStatus =
  | "fare_recheck_required"
  | "fare_rechecked"
  | "booking_hold_created"
  | "pending_payment"
  | "payment_uploaded"
  | "payment_verified"
  | "ticketing"
  | "issued"
  | "issue_failed"
  | "cancelled"
  | "refund_required"

type SupplierVisibilityShape = {
  internal_display_name?: string | null
  internal_alias?: string | null
  supplier_name?: string | null
}

export function normalizeSupplierOrderStatus(value: string | null | undefined): SupplierOrderStatus | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "not_applicable" ||
    normalized === "draft" ||
    normalized === "pending_submission" ||
    normalized === "submitted" ||
    normalized === "confirmed" ||
    normalized === "issued" ||
    normalized === "failed" ||
    normalized === "cancel_requested" ||
    normalized === "cancelled" ||
    normalized === "refund_requested" ||
    normalized === "refunded"
  ) {
    return normalized
  }
  return null
}

export function normalizeSupplierBrandVisibility(value: string | null | undefined): SupplierBrandVisibility | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "owner_only" ||
    normalized === "superadmin_only" ||
    normalized === "restricted_internal" ||
    normalized === "visible_internal"
  ) {
    return normalized
  }
  return null
}

export function normalizeFlightIssueStatus(value: string | null | undefined): FlightIssueStatus | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "pending_confirmation" ||
    normalized === "confirmed" ||
    normalized === "ticketing" ||
    normalized === "issued" ||
    normalized === "issue_failed" ||
    normalized === "reschedule_requested" ||
    normalized === "cancel_requested" ||
    normalized === "cancelled" ||
    normalized === "refunded"
  ) {
    return normalized
  }
  return null
}

export function normalizeFlightLifecycleStatus(value: string | null | undefined): FlightLifecycleStatus | null {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "fare_recheck_required" ||
    normalized === "fare_rechecked" ||
    normalized === "booking_hold_created" ||
    normalized === "pending_payment" ||
    normalized === "payment_uploaded" ||
    normalized === "payment_verified" ||
    normalized === "ticketing" ||
    normalized === "issued" ||
    normalized === "issue_failed" ||
    normalized === "cancelled" ||
    normalized === "refund_required"
  ) {
    return normalized
  }
  return null
}

export function getSupplierOrderStatusLabel(status: SupplierOrderStatus) {
  if (status === "not_applicable") return "Tidak berlaku"
  if (status === "pending_submission") return "Menunggu submit"
  if (status === "cancel_requested") return "Cancel diminta"
  if (status === "refund_requested") return "Refund diminta"
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getVisibleSupplierLabel(supplier: SupplierVisibilityShape) {
  return (
    String(supplier.internal_display_name || "").trim() ||
    String(supplier.internal_alias || "").trim() ||
    String(supplier.supplier_name || "").trim() ||
    "Reservation Partner"
  )
}

export function getVisibleSupplierReference(supplier: SupplierVisibilityShape) {
  return String(supplier.internal_alias || "").trim() || "PARTNER"
}

export function getFlightIssueStatusLabel(status: FlightIssueStatus) {
  if (status === "pending_confirmation") return "Menunggu konfirmasi"
  if (status === "issue_failed") return "Issue gagal"
  if (status === "reschedule_requested") return "Reschedule diminta"
  if (status === "cancel_requested") return "Cancel diminta"
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getFlightLifecycleStatusLabel(status: FlightLifecycleStatus) {
  if (status === "fare_recheck_required") return "Perlu recheck fare"
  if (status === "fare_rechecked") return "Fare sudah direcheck"
  if (status === "booking_hold_created") return "Booking/hold dibuat"
  if (status === "pending_payment") return "Menunggu pembayaran"
  if (status === "payment_uploaded") return "Bukti transfer diupload"
  if (status === "payment_verified") return "Pembayaran terverifikasi"
  if (status === "ticketing") return "Proses issue tiket"
  if (status === "issued") return "Tiket issued"
  if (status === "issue_failed") return "Issue gagal"
  if (status === "refund_required") return "Perlu refund/follow up"
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
