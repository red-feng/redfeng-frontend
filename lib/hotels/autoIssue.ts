import type { SupabaseClient } from "@supabase/supabase-js"
import { createAndIssueDharmawisataHotelBooking } from "@/lib/hotels/dharmawisataHotelBooking"

type JsonRecord = Record<string, unknown>

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function splitName(value: string | null | undefined) {
  const parts = normalizeText(value).split(" ").filter(Boolean)
  return {
    firstName: parts[0] || "Guest",
    lastName: parts.slice(1).join(" ") || parts[0] || "Hotel",
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

async function getDharmawisataSupplierId(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("suppliers")
    .select("id")
    .eq("supplier_code", "AFFILIATE_PARTNER_01")
    .maybeSingle<{ id: string }>()

  return data?.id || null
}

async function writeHotelFailure(input: {
  supabase: SupabaseClient
  bookingId: string
  supplierOrderId?: string | null
  message: string
  raw?: JsonRecord
}) {
  const nowIso = new Date().toISOString()

  await input.supabase
    .from("hotel_booking_details")
    .update({
      lifecycle_status: "issue_failed",
      supplier_raw_reference: input.raw || { error: input.message },
      updated_at: nowIso,
    })
    .eq("booking_id", input.bookingId)

  await input.supabase
    .from("bookings")
    .update({
      supplier_order_status: "failed",
      updated_at: nowIso,
    })
    .eq("id", input.bookingId)

  if (input.supplierOrderId) {
    await input.supabase
      .from("supplier_orders")
      .update({
        supplier_status: "failed",
        last_error: input.message,
        response_payload: input.raw || { error: input.message },
        updated_at: nowIso,
      })
      .eq("id", input.supplierOrderId)
  }
}

export async function autoIssueHotelAfterPayment(supabase: SupabaseClient, bookingId: string) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_code, booking_product_type, payment_status, supplier_id, customer_name, customer_email, customer_phone")
    .eq("id", bookingId)
    .maybeSingle<{
      id: string
      booking_code: string | null
      booking_product_type: string | null
      payment_status: string | null
      supplier_id: string | null
      customer_name: string | null
      customer_email: string | null
      customer_phone: string | null
    }>()

  if (!booking || normalizeText(booking.booking_product_type).toLowerCase() !== "hotel") {
    return { ok: false, skipped: true, message: "Bukan booking hotel." }
  }

  if (normalizeText(booking.payment_status).toLowerCase() !== "paid") {
    return { ok: false, skipped: true, message: "Payment hotel belum paid." }
  }

  const { data: hotelDetail } = await supabase
    .from("hotel_booking_details")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle()

  if (!hotelDetail) {
    return { ok: false, skipped: true, message: "Detail hotel tidak ditemukan." }
  }

  const lifecycle = normalizeText(hotelDetail.lifecycle_status).toLowerCase()
  if (["booking_submitted", "issued"].includes(lifecycle)) {
    return { ok: true, skipped: true, message: "Hotel sudah diproses supplier." }
  }

  const supplierId = booking.supplier_id || (await getDharmawisataSupplierId(supabase))
  if (!supplierId) {
    await writeHotelFailure({
      supabase,
      bookingId,
      message: "Supplier Dharmawisata belum tersedia di database.",
    })
    return { ok: false, skipped: false, message: "Supplier Dharmawisata belum tersedia di database." }
  }

  const rawReference = asRecord(hotelDetail.supplier_raw_reference)
  const quotePayload = asRecord(rawReference.quotePayload)
  const nowIso = new Date().toISOString()
  const { data: supplierOrder } = await supabase
    .from("supplier_orders")
    .upsert(
      {
        booking_id: bookingId,
        supplier_id: supplierId,
        product_type: "hotel",
        supplier_status: "submitted",
        submission_mode: "api",
        request_payload: {
          bookingId,
          hotelId: hotelDetail.hotel_id,
          hotelName: hotelDetail.hotel_name,
          checkinDate: hotelDetail.checkin_date,
          checkoutDate: hotelDetail.checkout_date,
          quotePayload,
        },
        submitted_at: nowIso,
        synced_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "booking_id,supplier_id" },
    )
    .select("id")
    .single<{ id: string }>()

  await supabase
    .from("hotel_booking_details")
    .update({
      lifecycle_status: "booking_submitted",
      supplier_order_id: supplierOrder?.id || null,
      updated_at: nowIso,
    })
    .eq("booking_id", bookingId)

  const guest = splitName(booking.customer_name)
  const result = await createAndIssueDharmawisataHotelBooking({
    bookingCode: booking.booking_code || booking.id,
    hotelId: hotelDetail.hotel_id,
    countryId: normalizeText(quotePayload.supplier_country_id),
    cityId: normalizeText(quotePayload.supplier_city_id),
    checkinDate: hotelDetail.checkin_date,
    checkoutDate: hotelDetail.checkout_date,
    roomCount: Number(hotelDetail.room_count || 1),
    childCount: Number(hotelDetail.child_count || 0),
    internalCode: hotelDetail.supplier_internal_code,
    breakfastId: hotelDetail.supplier_breakfast_id,
    roomId: hotelDetail.supplier_room_id,
    guestTitle: "MR",
    guestFirstName: guest.firstName,
    guestLastName: guest.lastName,
    guestPhone: booking.customer_phone,
    guestEmail: booking.customer_email,
    requestDescription: `Red Feng booking ${booking.booking_code || booking.id}`,
  })

  if (!result.ok) {
    await writeHotelFailure({
      supabase,
      bookingId,
      supplierOrderId: supplierOrder?.id || null,
      message: result.message,
      raw: result.raw,
    })
    return result
  }

  await supabase
    .from("hotel_booking_details")
    .update({
      lifecycle_status: "issued",
      reservation_no: result.reservationNo,
      voucher_no: result.voucherNo,
      supplier_booking_status: result.bookingStatus,
      supplier_total_price: result.totalPrice,
      issue_time_limit: result.issuedTimeLimit,
      supplier_raw_reference: result.raw,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)

  await supabase
    .from("bookings")
    .update({
      supplier_id: supplierId,
      supplier_booking_reference: result.reservationNo || result.voucherNo,
      supplier_order_status: "issued",
      booking_status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (supplierOrder?.id) {
    await supabase
      .from("supplier_orders")
      .update({
        supplier_order_id: result.reservationNo,
        supplier_reference: result.voucherNo || result.reservationNo,
        supplier_status: "issued",
        response_payload: result.raw,
        confirmed_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplierOrder.id)
  }

  return result
}
