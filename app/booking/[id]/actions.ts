"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function getOwnedBooking(bookingId: string) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, booking: null as null, error: "Silakan login terlebih dahulu" }
  }
  if (!user.email) {
    return { user, booking: null as null, error: "Akun Anda belum memiliki email" }
  }

  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, package_id, customer_email, payment_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", bookingId)
    .single()

  if (!booking || booking.customer_email !== user.email) {
    return { user, booking: null as null, error: "Booking ini bukan milik akun Anda" }
  }

  return { user, booking, error: null }
}

export async function submitPackageReview(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")
  const packageId = String(formData.get("package_id") || "")
  const customerName = String(formData.get("customer_name") || "").trim()
  const rating = Number(formData.get("rating") || 0)
  const comment = String(formData.get("comment") || "").trim()

  if (!bookingId || !packageId) {
    redirect(`/booking/${bookingId}?error=Booking tidak valid`)
  }

  if (!rating || rating < 1 || rating > 5) {
    redirect(`/booking/${bookingId}?error=Rating harus 1 sampai 5`)
  }

  const { booking, error: bookingError } = await getOwnedBooking(bookingId)
  if (bookingError || !booking) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(bookingError || "Booking tidak valid")}`)
  }

  if (booking.package_id !== packageId) {
    redirect(`/booking/${bookingId}?error=Package review tidak valid`)
  }

  const adminSupabase = createAdminClient()

  const { data: existingReview } = await adminSupabase
    .from("package_reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle()

  if (existingReview?.id) {
    redirect(`/booking/${bookingId}?success=Review sudah pernah dikirim`)
  }

  const { error } = await adminSupabase.from("package_reviews").insert({
    booking_id: bookingId,
    package_id: packageId,
    customer_name: customerName || null,
    rating,
    comment: comment || null,
  })

  if (error) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/booking/${bookingId}?success=Terima kasih, review berhasil dikirim`)
}

export async function confirmCustomerPickedUp(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")

  if (!bookingId) {
    redirect("/")
  }

  const adminSupabase = createAdminClient()
  const { booking, error: bookingError } = await getOwnedBooking(bookingId)
  if (bookingError || !booking) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(bookingError || "Booking tidak ditemukan")}`)
  }

  if (!booking.merchant_arrived_at) {
    redirect(`/booking/${bookingId}?error=Merchant belum menekan status Arrived`)
  }

  if (booking.customer_picked_up_at) {
    redirect(`/booking/${bookingId}?success=Status Picked up sudah pernah dikirim`)
  }

  const paymentStatus = normalizeStatus(booking.payment_status)
  const { error } = await adminSupabase
    .from("bookings")
    .update({
      customer_picked_up_at: new Date().toISOString(),
      booking_status: paymentStatus === "paid" ? "customer_picked_up" : "customer_picked_up_pending_final_payment",
      escrow_status: paymentStatus === "paid" ? "held" : "partial_hold",
      escrow_released_at: null,
    })
    .eq("id", bookingId)

  if (error) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/booking/${bookingId}?success=Status Picked up berhasil dikirim. Merchant dapat melanjutkan ke Go Confirmed.`)
}
