"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function canReviewCompletedTrip(booking: {
  booking_status?: string | null
  escrow_status?: string | null
  customer_picked_up_at?: string | null
  merchant_picked_up_at?: string | null
}) {
  const bookingStatus = normalizeStatus(booking.booking_status || null)
  const escrowStatus = normalizeStatus(booking.escrow_status || null)

  if (
    [
      "awaiting_admin_handoff",
      "finance_review",
      "finance_processing",
      "payout_processing",
      "payout_completed",
      "paid_out",
      "completed",
    ].includes(bookingStatus)
  ) {
    return true
  }

  if (["awaiting_admin_handoff", "finance_review", "payout_processing", "paid_out"].includes(escrowStatus)) {
    return true
  }

  return Boolean(booking.customer_picked_up_at && booking.merchant_picked_up_at)
}

async function getOwnedBooking(bookingId: string) {
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, booking: null as null, error: "Silakan login terlebih dahulu" }
  }
  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, package_id, customer_email, user_id, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at, adult_count, child_count")
    .eq("id", bookingId)
    .single()

  const signedInEmail = String(user.email || "").trim().toLowerCase()
  const bookingOwnerEmail = String(booking?.customer_email || "").trim().toLowerCase()
  const isOwnedBooking = Boolean(
    booking &&
      ((booking.user_id && booking.user_id === user.id) ||
        (!booking.user_id && signedInEmail && bookingOwnerEmail === signedInEmail)),
  )

  if (!booking || !isOwnedBooking) {
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

  if (!canReviewCompletedTrip(booking)) {
    redirect(`/booking/${bookingId}?error=Review baru tersedia setelah trip selesai dikonfirmasi customer`)
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
  if (paymentStatus !== "paid") {
    redirect(`/booking/${bookingId}?error=Status Picked up hanya tersedia setelah booking lunas`)
  }

  const { error } = await adminSupabase
    .from("bookings")
    .update({
      customer_picked_up_at: new Date().toISOString(),
      booking_status: "customer_picked_up",
      escrow_status: "held",
      escrow_released_at: null,
    })
    .eq("id", bookingId)

  if (error) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/booking/${bookingId}?success=Status Picked up berhasil dikirim. Merchant dapat melanjutkan ke Go Confirmed.`)
}

export async function cancelDraftBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")

  if (!bookingId) {
    redirect("/customer/dashboard?error=Booking tidak valid")
  }

  const adminSupabase = createAdminClient()
  const { booking, error: bookingError } = await getOwnedBooking(bookingId)
  if (bookingError || !booking) {
    redirect(`/customer/dashboard?error=${encodeURIComponent(bookingError || "Booking tidak ditemukan")}`)
  }

  if (!isDraftBookingDeletable(booking)) {
    redirect(`/booking/${bookingId}?error=Booking ini sudah memiliki pembayaran dan tidak bisa dihapus otomatis`)
  }

  const { error } = await deleteDraftBooking(adminSupabase, bookingId)

  if (error) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/customer/dashboard?success=Draft booking yang belum dibayar sudah dibatalkan dan dihapus")
}

function parseParticipantAge(rawValue: FormDataEntryValue | null) {
  const parsed = Number(String(rawValue || "").trim())
  return Number.isFinite(parsed) ? parsed : NaN
}

export async function saveBookingParticipants(formData: FormData) {
  const bookingId = String(formData.get("booking_id") || "")

  if (!bookingId) {
    redirect("/?error=Booking tidak valid")
  }

  const { booking, error: bookingError } = await getOwnedBooking(bookingId)
  if (bookingError || !booking) {
    redirect(`/booking/${bookingId}?error=${encodeURIComponent(bookingError || "Booking tidak valid")}`)
  }

  const adultCount = Math.max(Number(booking.adult_count || 0), 0)
  const childCount = Math.max(Number(booking.child_count || 0), 0)
  const participants: Array<{
    booking_id: string
    participant_type: "adult" | "child"
    sequence_no: number
    full_name: string
    identity_number: string
    nationality: string
    age: number
  }> = []

  const validationErrors: string[] = []

  for (let index = 1; index <= adultCount; index += 1) {
    const fullName = String(formData.get(`adult_full_name_${index}`) || "").trim()
    const identityNumber = String(formData.get(`adult_identity_number_${index}`) || "").trim()
    const nationality = String(formData.get(`adult_nationality_${index}`) || "").trim()
    const age = parseParticipantAge(formData.get(`adult_age_${index}`))

    if (!fullName || !identityNumber || !nationality || Number.isNaN(age)) {
      validationErrors.push(`Lengkapi data peserta dewasa ${index}.`)
      continue
    }

    if (age < 18) {
      validationErrors.push(`Umur peserta dewasa ${index} minimal 18 tahun.`)
      continue
    }

    participants.push({
      booking_id: bookingId,
      participant_type: "adult",
      sequence_no: index,
      full_name: fullName,
      identity_number: identityNumber,
      nationality,
      age,
    })
  }

  for (let index = 1; index <= childCount; index += 1) {
    const fullName = String(formData.get(`child_full_name_${index}`) || "").trim()
    const identityNumber = String(formData.get(`child_identity_number_${index}`) || "").trim()
    const nationality = String(formData.get(`child_nationality_${index}`) || "").trim()
    const age = parseParticipantAge(formData.get(`child_age_${index}`))

    if (!fullName || !identityNumber || !nationality || Number.isNaN(age)) {
      validationErrors.push(`Lengkapi data peserta anak ${index}.`)
      continue
    }

    if (age >= 18) {
      validationErrors.push(`Umur peserta anak ${index} harus di bawah 18 tahun.`)
      continue
    }

    participants.push({
      booking_id: bookingId,
      participant_type: "child",
      sequence_no: index,
      full_name: fullName,
      identity_number: identityNumber,
      nationality,
      age,
    })
  }

  if (validationErrors.length > 0) {
    redirect(
      `/booking/${bookingId}/participants?error=${encodeURIComponent(validationErrors.join(" "))}`,
    )
  }

  const adminSupabase = createAdminClient()
  const { error: deleteError } = await adminSupabase
    .from("booking_participants")
    .delete()
    .eq("booking_id", bookingId)

  if (deleteError) {
    redirect(`/booking/${bookingId}/participants?error=${encodeURIComponent(deleteError.message)}`)
  }

  if (participants.length > 0) {
    const { error: insertError } = await adminSupabase.from("booking_participants").insert(participants)

    if (insertError) {
      redirect(`/booking/${bookingId}/participants?error=${encodeURIComponent(insertError.message)}`)
    }
  }

  redirect(`/booking/${bookingId}?from_checkout=1&success=${encodeURIComponent("Data peserta berhasil disimpan. Silakan cek konfirmasi booking sebelum lanjut ke pembayaran.")}`)
}
