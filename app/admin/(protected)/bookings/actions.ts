"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatBookingCode } from "@/lib/merchant-code"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"
import { runExpiredBookingCleanup } from "@/lib/bookings/draft-cleanup"

type BookingPortal = "admin" | "superadmin"

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
