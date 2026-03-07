"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"

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
