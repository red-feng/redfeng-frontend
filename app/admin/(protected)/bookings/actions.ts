"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { queueBookingToFinance } from "@/lib/payouts/finance-handoff"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !isAdminExecutionRole(profile.role)) {
    redirect("/admin/login")
  }

  return {
    user,
    role: profile.role,
  }
}

function backToBookings(message: string, type: "success" | "error"): never {
  redirect(`/admin/bookings?${type}=${encodeURIComponent(message)}`)
}

export async function handoffBookingToFinance(formData: FormData) {
  const adminActor = await ensureAdmin()

  const bookingId = String(formData.get("booking_id") || "")
  if (!bookingId) {
    backToBookings("Booking tidak valid", "error")
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
    backToBookings("Booking tidak ditemukan", "error")
  }

  if (normalizeStatus(booking.payment_status) !== "paid") {
    backToBookings("Booking belum berstatus Fully Paid sehingga belum bisa dikirim ke finance", "error")
  }

  if (!booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at) {
    backToBookings("Urutan Arrived, Picked up, dan Go belum lengkap", "error")
  }

  if (normalizeStatus(booking.booking_status) === "finance_review") {
    backToBookings("Booking ini sudah berstatus Ready for Finance", "success")
  }

  const queueResult = await queueBookingToFinance({
    adminSupabase,
    bookingId: booking.id,
    source: "admin_handoff",
  })

  if (!queueResult.ok) {
    backToBookings(queueResult.error, "error")
  }

  if (queueResult.alreadyQueued) {
    backToBookings("Booking ini sudah berada di antrean finance", "success")
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: booking.id,
    action: "handoff_to_finance",
    summary: `Booking ${booking.booking_code || booking.id} dikirim ke finance`,
    metadata: {
      bookingCode: booking.booking_code,
      payoutAmount: queueResult.payoutAmount,
      grossAmount: queueResult.grossAmount,
      merchantId: queueResult.merchantId,
      source: "admin_handoff",
    },
  })

  backToBookings("Booking berhasil dikirim ke finance dan sekarang berstatus Ready for Finance", "success")
}
