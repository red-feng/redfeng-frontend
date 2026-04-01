import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import {
  deleteDraftBooking,
  isBookingExpiredForNonPayment,
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
      .select("id, payment_status, booking_status, payment_type, pickup_date, expiry_time")

    if (error) {
      return NextResponse.json({ error: error.message || "Gagal membaca draft booking" }, { status: 500 })
    }

    let deletedCount = 0
    let expiredByDeadlineCount = 0
    let expiredByDraftExpiryCount = 0

    for (const booking of bookingsToScan || []) {
      const expiryTime = booking.expiry_time ? new Date(booking.expiry_time) : null
      const expiredByDraftExpiry =
        expiryTime instanceof Date && !Number.isNaN(expiryTime.getTime()) && now.getTime() > expiryTime.getTime()
      const expiredByDeadline = isBookingExpiredForNonPayment(booking, now)

      if (!expiredByDraftExpiry && !expiredByDeadline) continue

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
