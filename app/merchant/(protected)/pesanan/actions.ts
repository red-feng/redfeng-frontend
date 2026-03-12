"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function getMerchantOwnedBooking(bookingId: string, userId: string) {
  const adminSupabase = createAdminClient()

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (!merchant) {
    return { error: "Data merchant tidak ditemukan", booking: null as null }
  }

  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, package_id, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", bookingId)
    .single()

  if (!booking?.package_id) {
    return { error: "Booking tidak ditemukan", booking: null as null }
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("merchant_id")
    .eq("id", booking.package_id)
    .single()

  if (!pkg || pkg.merchant_id !== merchant.id) {
    return { error: "Booking bukan milik merchant ini", booking: null as null }
  }

  return { error: null, booking }
}

function redirectBack(message: string, filter: string | null, type: "success" | "error"): never {
  const suffix = filter ? `?filter=${encodeURIComponent(filter)}&${type}=${encodeURIComponent(message)}` : `?${type}=${encodeURIComponent(message)}`
  redirect(`/merchant/pesanan${suffix}`)
}

export async function markMerchantArrived(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")
  const filter = String(formData.get("filter") || "all")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/merchant/login")
  if (!bookingId) redirectBack("Booking tidak valid", filter, "error")

  const { error, booking } = await getMerchantOwnedBooking(bookingId, user.id)
  if (error || !booking) redirectBack(error || "Booking tidak ditemukan", filter, "error")

  const paymentStatus = normalizeStatus(booking.payment_status)
  if (!["paid", "dp_paid"].includes(paymentStatus)) {
    redirectBack("Merchant hanya bisa klik Arrived setelah ada pembayaran customer", filter, "error")
  }

  if (booking.merchant_arrived_at) {
    redirectBack("Status tiba sudah pernah dikirim", filter, "success")
  }

  const adminSupabase = createAdminClient()
  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      merchant_arrived_at: new Date().toISOString(),
      booking_status: "merchant_arrived",
      escrow_status: paymentStatus === "paid" ? "held" : "partial_hold",
    })
    .eq("id", bookingId)

  if (updateError) {
    redirectBack(updateError.message, filter, "error")
  }

  redirectBack("Status Arrived berhasil dikirim ke customer dan admin", filter, "success")
}

export async function markMerchantGo(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")
  const filter = String(formData.get("filter") || "all")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/merchant/login")
  if (!bookingId) redirectBack("Booking tidak valid", filter, "error")

  const { error, booking } = await getMerchantOwnedBooking(bookingId, user.id)
  if (error || !booking) redirectBack(error || "Booking tidak ditemukan", filter, "error")

  if (!booking.merchant_arrived_at) {
    redirectBack("Klik Arrived terlebih dahulu saat merchant sudah sampai meeting point", filter, "error")
  }

  if (!booking.customer_picked_up_at) {
    redirectBack("Customer harus klik Picked up terlebih dahulu sebelum merchant klik Go", filter, "error")
  }

  if (booking.merchant_picked_up_at) {
    redirectBack("Status Go sudah pernah dikirim", filter, "success")
  }

  const paymentStatus = normalizeStatus(booking.payment_status)
  const readyForAdminHandoff = paymentStatus === "paid"
  const adminSupabase = createAdminClient()
  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      merchant_picked_up_at: new Date().toISOString(),
      booking_status: readyForAdminHandoff ? "awaiting_admin_handoff" : "pickup_completed_pending_final_payment",
      escrow_status: readyForAdminHandoff ? "awaiting_admin_handoff" : "partial_hold",
      escrow_released_at: null,
    })
    .eq("id", bookingId)

  if (updateError) {
    redirectBack(updateError.message, filter, "error")
  }

  redirectBack(
    readyForAdminHandoff
      ? "Status Go berhasil dikirim. Booking menunggu handoff admin ke finance."
      : "Status Go berhasil dikirim. Booking masih menunggu pelunasan customer.",
    filter,
    "success",
  )
}
