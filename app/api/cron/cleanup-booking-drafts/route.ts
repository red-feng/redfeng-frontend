import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"

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

    const nowIso = new Date().toISOString()
    const { data: staleDrafts, error } = await supabase
      .from("bookings")
      .select("id, payment_status, booking_status, expiry_time")
      .lt("expiry_time", nowIso)

    if (error) {
      return NextResponse.json({ error: error.message || "Gagal membaca draft booking" }, { status: 500 })
    }

    let deletedCount = 0

    for (const booking of staleDrafts || []) {
      if (!isDraftBookingDeletable(booking)) continue
      const { error: deleteError } = await deleteDraftBooking(supabase, booking.id)
      if (!deleteError) deletedCount += 1
    }

    return NextResponse.json({
      ok: true,
      deleted_count: deletedCount,
      scanned_count: (staleDrafts || []).length,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
