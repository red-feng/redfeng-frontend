"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { getHotelPaymentDeadline } from "@/lib/hotels/paymentDeadline"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const HOTEL_REQUEST_STATUSES = new Set([
  "availability_requested",
  "checking_supplier",
  "available",
  "unavailable",
  "quote_sent",
  "converted",
  "cancelled",
])

function normalizeText(value: FormDataEntryValue | null) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function generateBookingCode() {
  const random = Math.floor(1000 + Math.random() * 9000)
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `RF${year}${month}${day}${random}`
}

function toPositiveNumber(value: unknown, fallback = 0) {
  const parsed = Number(value || fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(parsed, 0)
}

function toPositiveInteger(value: unknown, fallback = 0, min = 0) {
  return Math.max(Math.floor(toPositiveNumber(value, fallback)), min)
}

function getMissingSupplierQuoteFields(input: {
  supplierHotelId: string
  supplierInternalCode: string
  supplierRoomId: string
  supplierBreakfastId: string
  supplierCountryId: string
  supplierCityId: string
}) {
  return [
    ["Hotel ID", input.supplierHotelId],
    ["Internal code", input.supplierInternalCode],
    ["Room ID", input.supplierRoomId],
    ["Breakfast ID", input.supplierBreakfastId],
    ["Country ID", input.supplierCountryId],
    ["City ID", input.supplierCityId],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label)
}

function splitCustomerName(value: string) {
  const parts = normalizeText(value as unknown as FormDataEntryValue).split(" ").filter(Boolean)
  return {
    firstName: parts[0] || "Guest",
    lastName: parts.slice(1).join(" ") || parts[0] || "Hotel",
  }
}

async function assertHotelAdminAccess() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login?error=no-session")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)
  if (!hasInternalProductAccess(accessibleProducts, "hotel", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20tidak%20diizinkan")
  }

  return adminSupabase
}

async function getDharmawisataSupplierId(adminSupabase: ReturnType<typeof createAdminClient>) {
  const { data } = await adminSupabase
    .from("suppliers")
    .select("id")
    .eq("supplier_code", "AFFILIATE_PARTNER_01")
    .maybeSingle<{ id: string }>()

  return data?.id || null
}

async function createHotelBookingFromQuote(input: {
  adminSupabase: ReturnType<typeof createAdminClient>
  requestId: string
  quotedTotalAmount: number
}) {
  const { adminSupabase, requestId, quotedTotalAmount } = input
  const { data: request, error: requestError } = await adminSupabase
    .from("hotel_availability_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (requestError || !request) {
    return { ok: false, error: "Request hotel tidak ditemukan." }
  }

  if (request.booking_id) {
    const deadline = getHotelPaymentDeadline()
    const quotePayload =
      request.quote_payload && typeof request.quote_payload === "object" && !Array.isArray(request.quote_payload)
        ? (request.quote_payload as Record<string, unknown>)
        : {}

    await adminSupabase
      .from("bookings")
      .update({
        total_amount: quotedTotalAmount,
        subtotal_amount: quotedTotalAmount,
        display_subtotal_amount: quotedTotalAmount,
        final_payment_amount: quotedTotalAmount,
        expiry_time: deadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.booking_id)

    await adminSupabase
      .from("hotel_booking_details")
      .update({
        hotel_id: String(quotePayload.supplier_hotel_id || request.hotel_id || ""),
        supplier_internal_code: quotePayload.supplier_internal_code || null,
        supplier_room_id: quotePayload.supplier_room_id || null,
        supplier_breakfast_id: quotePayload.supplier_breakfast_id || null,
        supplier_raw_reference: {
          source: "hotel_availability_request",
          requestCode: request.request_code,
          requestPayload: request.request_payload || {},
          quotePayload,
        },
        lifecycle_status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", request.booking_id)

    await adminSupabase
      .from("hotel_availability_requests")
      .update({
        quote_expires_at: deadline,
        quote_sent_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    return { ok: true, bookingId: request.booking_id as string, reused: true }
  }

  const adultCount = toPositiveInteger(request.adult_count, 1, 1)
  const childCount = toPositiveInteger(request.child_count, 0, 0)
  const roomCount = toPositiveInteger(request.room_count, 1, 1)
  const nightCount = toPositiveInteger(request.night_count, 1, 1)
  const deadline = getHotelPaymentDeadline()
  const supplierId = await getDharmawisataSupplierId(adminSupabase)
  const bookingCode = generateBookingCode()
  const quotePayload =
    request.quote_payload && typeof request.quote_payload === "object" && !Array.isArray(request.quote_payload)
      ? (request.quote_payload as Record<string, unknown>)
      : {}

  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .insert({
      package_id: null,
      booking_code: bookingCode,
      booking_product_type: "hotel",
      fulfillment_mode: "affiliate_api",
      supplier_id: supplierId,
      supplier_order_status: "pending_submission",
      adult_count: adultCount,
      child_count: childCount,
      pickup_date: request.checkin_date,
      customer_name: request.customer_name,
      customer_email: request.customer_email,
      customer_phone: request.customer_phone,
      payment_type: "full",
      payment_status: "pending",
      booking_status: "pending",
      escrow_status: "pending_payment",
      payment_method: "bank_transfer",
      subtotal_amount: quotedTotalAmount,
      customer_admin_fee_amount: 0,
      customer_tax_amount: 0,
      customer_admin_fee_percent: 0,
      customer_tax_percent: 0,
      total_amount: quotedTotalAmount,
      final_payment_amount: quotedTotalAmount,
      dp_amount: 0,
      display_currency: request.currency || "IDR",
      display_subtotal_amount: quotedTotalAmount,
      expiry_time: deadline,
    })
    .select("id")
    .single<{ id: string }>()

  if (bookingError || !booking) {
    return { ok: false, error: bookingError?.message || "Booking hotel belum bisa dibuat." }
  }

  const { error: detailError } = await adminSupabase.from("hotel_booking_details").insert({
    booking_id: booking.id,
    availability_request_id: requestId,
    hotel_id: String(quotePayload.supplier_hotel_id || request.hotel_id || ""),
    hotel_name: request.hotel_name,
    hotel_location: request.hotel_location,
    property_type: request.property_type,
    checkin_date: request.checkin_date,
    checkout_date: request.checkout_date,
    night_count: nightCount,
    room_count: roomCount,
    adult_count: adultCount,
    child_count: childCount,
    room_name: request.room_preference,
    meal_plan: request.meal_preference,
    cancellation_policy: request.refund_preference,
    supplier_internal_code: quotePayload.supplier_internal_code || null,
    supplier_room_id: quotePayload.supplier_room_id || null,
    supplier_breakfast_id: quotePayload.supplier_breakfast_id || null,
    lifecycle_status: "pending_payment",
    supplier_raw_reference: {
      source: "hotel_availability_request",
      requestCode: request.request_code,
      requestPayload: request.request_payload || {},
      quotePayload,
    },
  })

  if (detailError) {
    await adminSupabase.from("bookings").delete().eq("id", booking.id)
    return { ok: false, error: detailError.message || "Detail hotel belum bisa dibuat." }
  }

  const { firstName, lastName } = splitCustomerName(String(request.customer_name || "Guest Hotel"))
  const participants = [
    ...Array.from({ length: adultCount }, (_, index) => ({
      booking_id: booking.id,
      participant_type: "adult",
      sequence_no: index + 1,
      full_name: index === 0 ? `${firstName} ${lastName}`.trim() : `Hotel Guest ${index + 1}`,
      identity_number: "-",
      nationality: "Indonesia",
      age: 30,
    })),
    ...Array.from({ length: childCount }, (_, index) => ({
      booking_id: booking.id,
      participant_type: "child",
      sequence_no: index + 1,
      full_name: `Child Guest ${index + 1}`,
      identity_number: "-",
      nationality: "Indonesia",
      age: 8,
    })),
  ]

  if (participants.length > 0) {
    await adminSupabase.from("booking_participants").insert(participants)
  }

  await adminSupabase
    .from("hotel_availability_requests")
    .update({
      booking_id: booking.id,
      quote_expires_at: deadline,
      quote_sent_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  return { ok: true, bookingId: booking.id, reused: false }
}

export async function updateHotelAvailabilityRequestAction(formData: FormData) {
  const requestId = normalizeText(formData.get("request_id"))
  const status = normalizeText(formData.get("status"))
  const adminNote = normalizeText(formData.get("admin_note"))
  const quotedTotalAmountRaw = normalizeText(formData.get("quoted_total_amount"))
  const quotedTotalAmount = quotedTotalAmountRaw ? Number(quotedTotalAmountRaw) : null
  const supplierHotelId = normalizeText(formData.get("supplier_hotel_id"))
  const supplierInternalCode = normalizeText(formData.get("supplier_internal_code"))
  const supplierRoomId = normalizeText(formData.get("supplier_room_id"))
  const supplierBreakfastId = normalizeText(formData.get("supplier_breakfast_id"))
  const supplierCountryId = normalizeText(formData.get("supplier_country_id"))
  const supplierCityId = normalizeText(formData.get("supplier_city_id"))

  if (!requestId || !HOTEL_REQUEST_STATUSES.has(status)) {
    redirect("/admin/hotel?error=Request%20hotel%20tidak%20valid")
  }

  if (quotedTotalAmountRaw && (!Number.isFinite(quotedTotalAmount) || Number(quotedTotalAmount) < 0)) {
    redirect("/admin/hotel?error=Quote%20hotel%20tidak%20valid")
  }

  if (status === "quote_sent") {
    if (!quotedTotalAmount || quotedTotalAmount <= 0) {
      redirect("/admin/hotel?error=Quote%20total%20wajib%20diisi%20sebelum%20payment%20hotel%20dibuka")
    }

    const missingSupplierFields = getMissingSupplierQuoteFields({
      supplierHotelId,
      supplierInternalCode,
      supplierRoomId,
      supplierBreakfastId,
      supplierCountryId,
      supplierCityId,
    })

    if (missingSupplierFields.length > 0) {
      redirect(
        `/admin/hotel?error=${encodeURIComponent(
          `Data supplier wajib lengkap sebelum payment hotel dibuka: ${missingSupplierFields.join(", ")}.`,
        )}`,
      )
    }
  }

  const adminSupabase = await assertHotelAdminAccess()
  const nowIso = new Date().toISOString()
  const { error } = await adminSupabase
    .from("hotel_availability_requests")
    .update({
      status,
      quoted_total_amount: quotedTotalAmount,
      quote_payload: {
        admin_note: adminNote,
        quoted_total_amount: quotedTotalAmount,
        supplier_hotel_id: supplierHotelId,
        supplier_internal_code: supplierInternalCode,
        supplier_room_id: supplierRoomId,
        supplier_breakfast_id: supplierBreakfastId,
        supplier_country_id: supplierCountryId,
        supplier_city_id: supplierCityId,
        updated_at: nowIso,
      },
      updated_at: nowIso,
    })
    .eq("id", requestId)

  if (error) {
    redirect("/admin/hotel?error=Request%20hotel%20belum%20bisa%20diupdate")
  }

  let bookingLink = ""
  if (status === "quote_sent") {
    const finalQuotedTotalAmount = Number(quotedTotalAmount || 0)
    const bookingResult = await createHotelBookingFromQuote({
      adminSupabase,
      requestId,
      quotedTotalAmount: finalQuotedTotalAmount,
    })

    if (!bookingResult.ok || !bookingResult.bookingId) {
      redirect(`/admin/hotel?error=${encodeURIComponent(bookingResult.error || "Booking hotel belum bisa dibuat")}`)
    }

    bookingLink = `%20Link%20payment:%20/booking/${bookingResult.bookingId}`
  }

  revalidatePath("/admin/hotel")
  redirect(`/admin/hotel?success=${encodeURIComponent("Request hotel diupdate.")}${bookingLink}`)
}
