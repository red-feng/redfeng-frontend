import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import {
  deleteDraftBooking,
  isBookingExpiredForNonPayment,
  moveOverdueDpBookingToRefundQueue,
} from "@/lib/bookings/draft-cleanup"

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const now = new Date()
    const { data: bookingsToScan, error } = await supabase
      .from("bookings")
      .select("id, user_id, package_id, booking_code, customer_name, customer_email, total_amount, dp_amount, final_payment_amount, payment_method, gateway_payment_method, payment_status, booking_status, escrow_status, pickup_date, expiry_time, created_at")

    if (error) {
      return NextResponse.json({ error: error.message || "Gagal membaca draft booking" }, { status: 500 })
    }

    let deletedCount = 0
    let expiredByDeadlineCount = 0
    let expiredByDraftExpiryCount = 0
    let routedToRefundReviewCount = 0

    for (const booking of bookingsToScan || []) {
      const expiryTime = booking.expiry_time ? new Date(booking.expiry_time) : null
      const expiredByDraftExpiry =
        expiryTime instanceof Date && !Number.isNaN(expiryTime.getTime()) && now.getTime() > expiryTime.getTime()
      const expiredByDeadline = isBookingExpiredForNonPayment(booking, now)

      if (!expiredByDraftExpiry && !expiredByDeadline) continue

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

    return NextResponse.json({
      ok: true,
      deleted_count: deletedCount,
      routed_to_refund_review_count: routedToRefundReviewCount,
      deleted_by_h3_deadline_count: expiredByDeadlineCount,
      deleted_by_draft_expiry_count: expiredByDraftExpiryCount,
      scanned_count: (bookingsToScan || []).length,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
