import type { SupabaseClient } from "@supabase/supabase-js"
import { getFinalPaymentDueAt } from "@/lib/booking/final-payment-deadline"
import { revertReservedTransactionPromoRedemptions } from "@/lib/transaction-promo-redemptions"

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

// Booking retention policy is intentionally centralized here.
// Keep this aligned with product rules:
// 1. Unpaid booking must be hard-deleted after H+1.
// 2. Paid booking must be retained for 15 months, then hard-deleted.
// Do not re-implement these windows in page-level code.
export const BOOKING_UNPAID_GRACE_HOURS = 24
const FIFTEEN_MONTHS = 15
export const BOOKING_PAID_RETENTION_MONTHS = FIFTEEN_MONTHS

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function isDraftBookingDeletable(booking: {
  payment_status?: string | null
  booking_status?: string | null
}) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  const hasFinalPayment =
    paymentStatus === "paid" ||
    paymentStatus === "dp_paid" ||
    bookingStatus === "confirmed" ||
    bookingStatus === "awaiting_final_payment" ||
    bookingStatus === "merchant_arrived" ||
    bookingStatus === "customer_picked_up" ||
    bookingStatus === "awaiting_admin_handoff"

  return !hasFinalPayment
}

export function isBookingExpiredForNonPayment(
  booking: {
    created_at?: string | null
    payment_status?: string | null
    booking_status?: string | null
    payment_type?: string | null
    pickup_date?: string | null
    expiry_time?: string | null
  },
  now = new Date(),
) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const dueAt = getFinalPaymentDueAt(booking.pickup_date || null)
  const createdAt =
    booking.created_at && !Number.isNaN(new Date(booking.created_at).getTime()) ? new Date(booking.created_at) : null

  if (paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "") {
    if (!isDraftBookingDeletable(booking)) {
      return false
    }

    if (createdAt) {
      const hPlusOne = new Date(createdAt)
      hPlusOne.setHours(hPlusOne.getHours() + BOOKING_UNPAID_GRACE_HOURS)
      return now.getTime() > hPlusOne.getTime()
    }

    if (dueAt) {
      return now.getTime() > dueAt.getTime()
    }

    if (booking.expiry_time) {
      const expiryTime = new Date(booking.expiry_time)
      if (!Number.isNaN(expiryTime.getTime())) {
        return now.getTime() > expiryTime.getTime()
      }
    }
  }

  if (paymentStatus === "dp_paid" || bookingStatus === "awaiting_final_payment") {
    if (!dueAt) {
      return false
    }

    return now.getTime() > dueAt.getTime()
  }

  return false
}

export async function deleteDraftBooking(
  supabase: SupabaseClient,
  bookingId: string,
) {
  return deleteBookingWithRelations(supabase, bookingId)
}

export async function deleteBookingWithRelations(
  supabase: SupabaseClient,
  bookingId: string,
) {
  // Hard delete booking and all directly managed relations.
  // This is used for both unpaid H+1 cleanup and paid-booking retention cleanup.
  await revertReservedTransactionPromoRedemptions(supabase, bookingId, "booking_deleted_or_expired")
  await supabase
    .from("package_chat_rooms")
    .update({ booking_id: null })
    .eq("booking_id", bookingId)
  await supabase.from("payments").delete().eq("booking_id", bookingId)
  await supabase.from("booking_participants").delete().eq("booking_id", bookingId)

  return supabase.from("bookings").delete().eq("id", bookingId)
}

export function isBookingPastRetentionWindow(
  booking: {
    created_at?: string | null
    payment_status?: string | null
  },
  now = new Date(),
) {
  const createdAt =
    booking.created_at && !Number.isNaN(new Date(booking.created_at).getTime()) ? new Date(booking.created_at) : null
  if (!createdAt) return false

  const paymentStatus = normalizeStatus(booking.payment_status)
  const hasCustomerPayment =
    paymentStatus === "paid" ||
    paymentStatus === "dp_paid" ||
    paymentStatus === "refund_pending_review" ||
    paymentStatus === "refunded" ||
    paymentStatus === "partial_refund"

  if (!hasCustomerPayment) return false

  return now.getTime() > addMonths(createdAt, BOOKING_PAID_RETENTION_MONTHS).getTime()
}

export async function runExpiredBookingCleanup(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const { data: bookingsToScan, error } = await supabase
    .from("bookings")
    .select(
      "id, package_id, booking_code, customer_name, customer_email, total_amount, dp_amount, final_payment_amount, payment_method, gateway_payment_method, payment_status, booking_status, escrow_status, pickup_date, expiry_time, created_at",
    )

  if (error) {
    return {
      ok: false as const,
      error: error.message || "Gagal membaca draft booking",
      deletedCount: 0,
      retentionDeletedCount: 0,
      expiredByDeadlineCount: 0,
      expiredByDraftExpiryCount: 0,
      routedToRefundReviewCount: 0,
      scannedCount: 0,
    }
  }

  let deletedCount = 0
  let retentionDeletedCount = 0
  let expiredByDeadlineCount = 0
  let expiredByDraftExpiryCount = 0
  let routedToRefundReviewCount = 0

  for (const booking of bookingsToScan || []) {
    const expiredByRetention = isBookingPastRetentionWindow(booking, now)
    const expiryTime = booking.expiry_time ? new Date(booking.expiry_time) : null
    const expiredByDraftExpiry =
      expiryTime instanceof Date && !Number.isNaN(expiryTime.getTime()) && now.getTime() > expiryTime.getTime()
    const expiredByDeadline = isBookingExpiredForNonPayment(booking, now)

    if (!expiredByRetention && !expiredByDraftExpiry && !expiredByDeadline) continue

    if (expiredByRetention) {
      const { error: deleteRetentionError } = await deleteBookingWithRelations(supabase, booking.id)
      if (!deleteRetentionError) {
        deletedCount += 1
        retentionDeletedCount += 1
      }
      continue
    }

    const isOverdueDpBooking =
      ["dp_paid"].includes(String(booking.payment_status || "").trim().toLowerCase()) ||
      ["awaiting_final_payment"].includes(String(booking.booking_status || "").trim().toLowerCase())

    if (isOverdueDpBooking) {
      const result = await moveOverdueDpBookingToRefundQueue(supabase, booking)
      if (!result.error && result.updatedBooking) {
        routedToRefundReviewCount += 1
        if (expiredByDeadline) expiredByDeadlineCount += 1
      }
      continue
    }

    const { error: deleteError } = await deleteDraftBooking(supabase, booking.id)
    if (!deleteError) {
      deletedCount += 1
      if (expiredByDeadline) expiredByDeadlineCount += 1
      if (expiredByDraftExpiry) expiredByDraftExpiryCount += 1
    }
  }

  return {
    ok: true as const,
    deletedCount,
    retentionDeletedCount,
    expiredByDeadlineCount,
    expiredByDraftExpiryCount,
    routedToRefundReviewCount,
    scannedCount: (bookingsToScan || []).length,
    error: null,
  }
}

export async function moveOverdueDpBookingToRefundQueue(
  supabase: SupabaseClient,
  booking: {
    id: string
    package_id?: string | null
    booking_code?: string | null
    customer_name?: string | null
    customer_email?: string | null
    total_amount?: number | null
    dp_amount?: number | null
    final_payment_amount?: number | null
    payment_method?: string | null
    gateway_payment_method?: string | null
    payment_status?: string | null
    booking_status?: string | null
    escrow_status?: string | null
    pickup_date?: string | null
  },
) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)

  if (!(paymentStatus === "dp_paid" || bookingStatus === "awaiting_final_payment")) {
    return { error: null, createdRefundRequest: false, updatedBooking: false }
  }

  if (
    paymentStatus === "refund_pending_review" ||
    bookingStatus === "cancelled_due_overdue_final_payment"
  ) {
    return { error: null, createdRefundRequest: false, updatedBooking: false }
  }

  const { data: existingRefund } = await supabase
    .from("refund_requests")
    .select("id")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: latestPayment } = await supabase
    .from("payments")
    .select("order_id")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let merchantId: string | null = null
  let customerId: string | null = null
  if (booking.package_id) {
    const { data: packageRow } = await supabase
      .from("packages")
      .select("merchant_id")
      .eq("id", booking.package_id)
      .maybeSingle()

    merchantId = packageRow?.merchant_id || null
  }

  const { data: bookingRoom } = await supabase
    .from("package_chat_rooms")
    .select("customer_id")
    .eq("booking_id", booking.id)
    .not("customer_id", "is", null)
    .limit(1)
    .maybeSingle()

  customerId = bookingRoom?.customer_id || null

  const dpAmount = Math.max(
    Number(booking.dp_amount || 0),
    Math.max(Number(booking.total_amount || 0) - Number(booking.final_payment_amount || 0), 0),
  )

  let refundRequestId: string | null = existingRefund?.id || null

  if (!existingRefund?.id) {
    const { data: refundRequest, error: refundError } = await supabase
      .from("refund_requests")
      .insert({
        booking_id: booking.id,
        customer_id: customerId,
        merchant_id: merchantId,
        order_id: latestPayment?.order_id || booking.booking_code || booking.id,
        payment_method: booking.payment_method || null,
        payment_channel: booking.gateway_payment_method || null,
        refund_channel: latestPayment?.order_id ? "midtrans" : "manual_other",
        refund_reason: "DP booking melewati batas pelunasan H-3 dan dibatalkan otomatis untuk review refund finance.",
        refund_reason_code: "final_payment_overdue_auto_review",
        gross_amount: dpAmount,
        deduction_amount: 0,
        net_refund_amount: dpAmount,
        notes:
          "Auto-generated by cleanup cron because the final payment deadline passed at H-3 23.59 WIB.",
        metadata: {
          bookingCode: booking.booking_code || null,
          customerName: booking.customer_name || null,
          customerEmail: booking.customer_email || null,
          bookingGrossAmount: booking.total_amount || null,
          autoGenerated: true,
          source: "cleanup-booking-drafts-cron",
          overduePickupDate: booking.pickup_date || null,
        },
      })
      .select("id")
      .single()

    if (refundError || !refundRequest) {
      return { error: refundError || new Error("Gagal membuat refund request otomatis"), createdRefundRequest: false, updatedBooking: false }
    }

    refundRequestId = refundRequest.id

    await supabase.from("refund_events").insert({
      refund_request_id: refundRequest.id,
      actor_id: null,
      actor_role: "system",
      event_type: "refund_created",
      summary: "Refund request dibuat otomatis karena booking DP melewati batas pelunasan H-3.",
      metadata: {
        bookingId: booking.id,
        source: "cleanup-booking-drafts-cron",
      },
    })
  }

  const { error: bookingUpdateError } = await supabase
    .from("bookings")
    .update({
      payment_status: "refund_pending_review",
      booking_status: "cancelled_due_overdue_final_payment",
      escrow_status: "refund_review",
    })
    .eq("id", booking.id)

  return {
    error: bookingUpdateError,
    createdRefundRequest: Boolean(refundRequestId),
    updatedBooking: !bookingUpdateError,
  }
}
