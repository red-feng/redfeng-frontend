import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getRequiredEnv } from "@/lib/env"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json()
    const bookingId = String(booking_id || "").trim()

    if (!bookingId) {
      return NextResponse.json({ error: "Booking tidak valid" }, { status: 400 })
    }

    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_email, payment_status, booking_status")
      .eq("id", bookingId)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ ok: true, deleted: false, missing: true })
    }

    if (String(booking.customer_email || "").trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) {
      return NextResponse.json({ error: "Booking ini bukan milik akun Anda" }, { status: 403 })
    }

    if (!isDraftBookingDeletable(booking)) {
      return NextResponse.json({ ok: true, deleted: false })
    }

    const { error } = await deleteDraftBooking(supabase, booking.id)

    if (error) {
      return NextResponse.json({ error: error.message || "Gagal menghapus draft booking" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    )
  }
}
