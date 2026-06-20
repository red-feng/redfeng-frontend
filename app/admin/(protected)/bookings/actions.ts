"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { normalizeFlightIssueStatus, normalizeFlightLifecycleStatus } from "@/lib/affiliate-suppliers"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatBookingCode } from "@/lib/merchant-code"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"
import { runExpiredBookingCleanup } from "@/lib/bookings/draft-cleanup"
import { autoIssueFlightTicketAfterPayment } from "@/lib/flights/autoIssue"
import {
  classifyFlightIssueFailureReason,
  extractFlightSupplierFailureReason,
  normalizeFlightIssueReasonFilter,
} from "@/lib/flights/issueFailureReason"

type BookingPortal = "admin" | "superadmin"

type BulkRetryBookingRow = {
  id: string
  booking_code: string | null
  payment_status: string | null
}

type BulkRetryFlightDetailRow = {
  booking_id: string
  lifecycle_status: string | null
  issue_status: string | null
  ticket_number: string | null
}

type BulkRetrySupplierOrderRow = {
  booking_id: string
  last_error: string | null
  response_payload: Record<string, unknown> | null
  created_at: string | null
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function resolvePortal(formData: FormData): BookingPortal {
  return String(formData.get("portal") || "").trim() === "superadmin" ? "superadmin" : "admin"
}

function resolvePortalPaths(portal: BookingPortal) {
  return {
    loginPath: portal === "superadmin" ? "/superadmin/login" : "/admin/login",
    bookingsPath: portal === "superadmin" ? "/superadmin/bookings" : "/admin/bookings",
    dashboardPath: portal === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard",
  }
}

async function ensureAdmin(portal: BookingPortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { loginPath } = resolvePortalPaths(portal)

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !isAdminExecutionRole(profile.role)) {
    redirect(loginPath)
  }

  return {
    user,
    role: profile.role,
  }
}

function backToBookings(portal: BookingPortal, message: string, type: "success" | "error"): never {
  const { bookingsPath } = resolvePortalPaths(portal)
  redirect(`${bookingsPath}?${type}=${encodeURIComponent(message)}`)
}

function backToFlightIssueFailedQueue(
  portal: BookingPortal,
  message: string,
  type: "success" | "error",
  reason: string,
): never {
  const { bookingsPath } = resolvePortalPaths(portal)
  const params = new URLSearchParams({
    product: "pesawat",
    flight: "issue-failed",
    [type]: message,
  })
  if (reason && reason !== "all") params.set("flightReason", reason)
  redirect(`${bookingsPath}?${params.toString()}`)
}

function canBulkRetryFlight(booking: BulkRetryBookingRow | undefined, detail: BulkRetryFlightDetailRow | undefined) {
  if (!booking || !detail) return false
  const lifecycle = normalizeFlightLifecycleStatus(detail.lifecycle_status)
  const issue = normalizeFlightIssueStatus(detail.issue_status)
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    (lifecycle === "issue_failed" || issue === "issue_failed") &&
    lifecycle !== "issued" &&
    issue !== "issued" &&
    !detail.ticket_number
  )
}

export async function bulkRetryAutoIssueFlights(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const reason = normalizeFlightIssueReasonFilter(String(formData.get("flight_reason") || ""))
  const requestedLimit = Number(formData.get("limit") || 5)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 5, 1), 10)
  const adminSupabase = createAdminClient()

  if (reason === "deposit") {
    backToFlightIssueFailedQueue(
      portal,
      "Bulk retry saldo/deposit diblokir. Cek deposit Dharmawisata dulu agar tidak mengulang kegagalan yang sama.",
      "error",
      reason,
    )
  }

  const { data: detailsData, error: detailsError } = await adminSupabase
    .from("flight_booking_details")
    .select("booking_id, lifecycle_status, issue_status, ticket_number")
    .or("lifecycle_status.eq.issue_failed,issue_status.eq.issue_failed")
    .limit(80)

  if (detailsError) {
    backToFlightIssueFailedQueue(portal, detailsError.message, "error", reason)
  }

  const details = ((detailsData as BulkRetryFlightDetailRow[] | null) || []) as BulkRetryFlightDetailRow[]
  const bookingIds = details.map((detail) => detail.booking_id).filter(Boolean)

  if (bookingIds.length === 0) {
    backToFlightIssueFailedQueue(portal, "Tidak ada booking issue failed yang bisa diretry.", "error", reason)
  }

  const { data: bookingsData, error: bookingsError } = await adminSupabase
    .from("bookings")
    .select("id, booking_code, payment_status")
    .in("id", bookingIds)

  if (bookingsError) {
    backToFlightIssueFailedQueue(portal, bookingsError.message, "error", reason)
  }

  const { data: supplierOrdersData, error: supplierOrdersError } = await adminSupabase
    .from("supplier_orders")
    .select("booking_id, last_error, response_payload, created_at")
    .eq("product_type", "flight")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false })

  if (supplierOrdersError) {
    backToFlightIssueFailedQueue(portal, supplierOrdersError.message, "error", reason)
  }

  const bookingsById = new Map(
    (((bookingsData as BulkRetryBookingRow[] | null) || []) as BulkRetryBookingRow[]).map((booking) => [
      booking.id,
      booking,
    ]),
  )
  const latestSupplierOrderByBookingId = new Map<string, BulkRetrySupplierOrderRow>()
  for (const order of ((supplierOrdersData as BulkRetrySupplierOrderRow[] | null) || []) as BulkRetrySupplierOrderRow[]) {
    if (!latestSupplierOrderByBookingId.has(order.booking_id)) {
      latestSupplierOrderByBookingId.set(order.booking_id, order)
    }
  }

  const candidates = details
    .filter((detail) => canBulkRetryFlight(bookingsById.get(detail.booking_id), detail))
    .filter((detail) => {
      if (reason === "all") return true
      const supplierOrder = latestSupplierOrderByBookingId.get(detail.booking_id)
      const failureReason = extractFlightSupplierFailureReason(supplierOrder)
      return classifyFlightIssueFailureReason(failureReason).value === reason
    })
    .slice(0, limit)

  if (candidates.length === 0) {
    backToFlightIssueFailedQueue(portal, "Tidak ada booking yang cocok dengan guard bulk retry.", "error", reason)
  }

  const results: Array<{ bookingId: string; bookingCode: string; ok: boolean; skipped: boolean; status: string; message: string }> = []

  for (const detail of candidates) {
    const booking = bookingsById.get(detail.booking_id)
    const result = await autoIssueFlightTicketAfterPayment(adminSupabase, detail.booking_id)
    results.push({
      bookingId: detail.booking_id,
      bookingCode: formatBookingCode(booking?.booking_code, detail.booking_id),
      ok: result.ok,
      skipped: result.skipped,
      status: result.status,
      message: result.message,
    })
  }

  const okCount = results.filter((result) => result.ok).length
  const skippedCount = results.filter((result) => result.skipped).length
  const failedCount = results.length - okCount - skippedCount

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: "bulk_flight_auto_issue_retry",
    action: "bulk_flight_auto_issue_retry",
    summary: `Bulk retry auto issue Pesawat dijalankan untuk ${results.length} booking.`,
    metadata: {
      productType: "flight",
      reason,
      limit,
      okCount,
      skippedCount,
      failedCount,
      results,
    },
  })

  const { bookingsPath, dashboardPath } = resolvePortalPaths(portal)
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/dashboard")
  revalidatePath(dashboardPath)
  revalidatePath("/customer/dashboard")

  const message = `Bulk retry selesai: ${okCount} berhasil, ${failedCount} gagal, ${skippedCount} ditahan guard dari ${results.length} booking.`
  backToFlightIssueFailedQueue(portal, message, okCount > 0 ? "success" : "error", reason)
}

export async function handoffBookingToFinance(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)

  const bookingId = String(formData.get("booking_id") || "")
  if (!bookingId) {
    backToBookings(portal, "Booking tidak valid", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, package_id, total_amount, subtotal_amount, payment_method, customer_tax_percent, payment_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at, booking_status",
    )
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    backToBookings(portal, "Booking tidak ditemukan", "error")
  }

  if (normalizeStatus(booking.payment_status) !== "paid") {
    backToBookings(portal, "Booking belum berstatus Fully Paid sehingga belum bisa dikirim ke finance", "error")
  }

  if (!booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at) {
    backToBookings(portal, "Urutan Arrived, Picked up, dan Go belum lengkap", "error")
  }

  if (normalizeStatus(booking.booking_status) === "finance_review") {
    backToBookings(portal, "Booking ini sudah berstatus Ready for Finance", "success")
  }

  const queueResult = await queueBookingToFinance({
    adminSupabase,
    bookingId: booking.id,
    source: "admin_handoff",
  })

  if (!queueResult.ok) {
    backToBookings(portal, queueResult.error, "error")
  }

  if (queueResult.alreadyQueued) {
    backToBookings(portal, "Booking ini sudah berada di antrean finance", "success")
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: booking.id,
    action: "handoff_to_finance",
    summary: `Booking ${formatBookingCode(booking.booking_code, booking.id)} dikirim ke finance`,
    metadata: {
      bookingCode: formatBookingCode(booking.booking_code, booking.id),
      payoutAmount: queueResult.payoutAmount,
      grossAmount: queueResult.grossAmount,
      merchantId: queueResult.merchantId,
      source: "admin_handoff",
    },
  })

  backToBookings(portal, "Booking berhasil dikirim ke finance dan sekarang berstatus Ready for Finance", "success")
}

export async function cleanupExpiredPendingBookings(formData: FormData) {
  const portal = resolvePortal(formData)
  const adminActor = await ensureAdmin(portal)
  const adminSupabase = createAdminClient()
  const result = await runExpiredBookingCleanup(adminSupabase, new Date())

  if (!result.ok) {
    backToBookings(portal, result.error || "Gagal menjalankan cleanup booking pending", "error")
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: "expired_pending_cleanup",
    action: "cleanup_expired_pending_bookings",
    summary: `Cleanup booking pending dijalankan manual. ${result.deletedCount} booking dihapus, ${result.routedToRefundReviewCount} booking DP diarahkan ke refund review.`,
    metadata: {
      deletedCount: result.deletedCount,
      retentionDeletedCount: result.retentionDeletedCount,
      routedToRefundReviewCount: result.routedToRefundReviewCount,
      expiredByDeadlineCount: result.expiredByDeadlineCount,
      expiredByDraftExpiryCount: result.expiredByDraftExpiryCount,
      scannedCount: result.scannedCount,
      source: "admin_booking_center_manual_cleanup",
    },
  })

  const { bookingsPath, dashboardPath } = resolvePortalPaths(portal)
  revalidatePath("/admin/bookings")
  revalidatePath(bookingsPath)
  revalidatePath("/admin/dashboard")
  revalidatePath(dashboardPath)
  revalidatePath("/merchant/pesanan")
  revalidatePath("/customer/dashboard")

  backToBookings(
    portal,
    `Cleanup selesai. ${result.deletedCount} booking dihapus, ${result.retentionDeletedCount} di antaranya karena retensi 15 bulan, ${result.routedToRefundReviewCount} booking DP diarahkan ke refund review, dari ${result.scannedCount} booking yang dipindai.`,
    "success",
  )
}
