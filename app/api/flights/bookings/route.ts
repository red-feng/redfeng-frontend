import { NextResponse } from "next/server"
import { calculateBookingAmounts, getFinanceSettings } from "@/lib/finance/settings"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createServerClient } from "@/lib/supabase/server"

function generateBookingCode() {
  const random = Math.floor(1000 + Math.random() * 9000)
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `RF${year}${month}${day}${random}`
}

function asString(value: unknown) {
  return String(value || "").trim()
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function asMoney(value: unknown) {
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

function normalizeCabinClass(value: unknown) {
  const normalized = asString(value).toLowerCase().replace(/\s+/g, "_")
  if (normalized === "premium_economy" || normalized === "business" || normalized === "first") {
    return normalized
  }
  return "economy"
}

function normalizeTripType(value: unknown) {
  const normalized = asString(value).toLowerCase()
  if (normalized === "round_trip" || normalized === "multi_city") return normalized
  return "one_way"
}

function extractAirportCode(value: unknown) {
  const normalized = asString(value).toUpperCase()
  const match = normalized.match(/\b[A-Z]{3}\b/)
  return match?.[0] || ""
}

function composeDateTime(dateValue: unknown, timeValue: unknown) {
  const date = asString(dateValue)
  const time = asString(timeValue)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})/)
  const hour = String(timeMatch ? Math.min(Number(timeMatch[1]), 23) : 0).padStart(2, "0")
  const minute = String(timeMatch ? Math.min(Number(timeMatch[2]), 59) : 0).padStart(2, "0")
  const parsed = new Date(`${date}T${hour}:${minute}:00+07:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function maybeArrivalDateTime(dateValue: unknown, departureTime: unknown, arrivalTime: unknown) {
  const departure = composeDateTime(dateValue, departureTime)
  const arrival = composeDateTime(dateValue, arrivalTime)
  if (!departure || !arrival) return arrival

  const departureDate = new Date(departure)
  const arrivalDate = new Date(arrival)
  if (arrivalDate < departureDate) {
    arrivalDate.setDate(arrivalDate.getDate() + 1)
  }
  return arrivalDate.toISOString()
}

export async function POST(req: Request) {
  try {
    const authSupabase = await createServerClient("customer")
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk booking pesawat." }, { status: 401 })
    }

    const body = await req.json()
    const customerName = asString(body.customer_name)
    const customerEmail = asString(body.customer_email) || user.email || ""
    const customerPhone = asString(body.customer_phone)
    const passengerManifest = asString(body.passenger_manifest)
    const originAirportCode = extractAirportCode(body.origin || body.route)
    const destinationAirportCode = extractAirportCode(body.destination || String(body.route || "").split("-")[1])
    const departureAt = composeDateTime(body.depart_date, body.departure_time)
    const arrivalAt = maybeArrivalDateTime(body.depart_date, body.departure_time, body.arrival_time)
    const returnAt = asString(body.return_date) ? composeDateTime(body.return_date, body.departure_time) : null
    const passengerCount = asPositiveInteger(body.passengers, 1)
    const fareAmount = asMoney(body.price)

    if (!customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ error: "Nama, email, dan nomor telepon wajib diisi." }, { status: 400 })
    }

    if (!originAirportCode || !destinationAirportCode || !departureAt) {
      return NextResponse.json({ error: "Data rute atau tanggal penerbangan belum lengkap." }, { status: 400 })
    }

    if (fareAmount <= 0) {
      return NextResponse.json({ error: "Harga penerbangan belum valid untuk dibuat booking." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id, supplier_code, supplier_name, integration_mode, status")
      .eq("supplier_code", "DHARMAWISATA_H2H")
      .eq("status", "active")
      .maybeSingle<{ id: string; supplier_code: string; supplier_name: string; integration_mode: string; status: string }>()

    if (!supplier) {
      return NextResponse.json({ error: "Supplier Dharmawisata belum aktif untuk booking pesawat." }, { status: 500 })
    }

    const { data: supplierChannel } = await supabase
      .from("supplier_product_channels")
      .select("supplier_id")
      .eq("supplier_id", supplier.id)
      .eq("product_type", "flight")
      .in("channel_status", ["active", "pilot"])
      .maybeSingle<{ supplier_id: string }>()

    if (!supplierChannel) {
      return NextResponse.json({ error: "Channel pesawat Dharmawisata belum aktif." }, { status: 500 })
    }

    const settings = await getFinanceSettings(supabase as unknown as Parameters<typeof getFinanceSettings>[0])
    const subtotalAmount = fareAmount * passengerCount
    const priceBreakdown = calculateBookingAmounts(subtotalAmount, "bank_transfer", settings)
    const bookingCode = generateBookingCode()
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 30)

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_product_type: "flight",
        fulfillment_mode: supplier.integration_mode === "api" ? "affiliate_api" : "affiliate_manual",
        supplier_id: supplier.id,
        supplier_order_status: "pending_submission",
        booking_code: bookingCode,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_locale: "id",
        pickup_date: asString(body.depart_date),
        expiry_time: expiry.toISOString(),
        payment_type: "full",
        payment_status: "pending",
        booking_status: "pending_payment",
        escrow_status: "pending_payment",
        display_currency: "IDR",
        display_subtotal_amount: priceBreakdown.subtotalAmount,
        subtotal_amount: priceBreakdown.subtotalAmount,
        customer_admin_fee_amount: priceBreakdown.customerAdminFeeAmount,
        customer_tax_amount: priceBreakdown.customerTaxAmount,
        customer_admin_fee_percent: priceBreakdown.customerAdminFeePercent,
        customer_tax_percent: priceBreakdown.customerTaxPercent,
        total_amount: priceBreakdown.totalAmount,
        final_payment_amount: priceBreakdown.totalAmount,
        dp_amount: 0,
        payment_method: priceBreakdown.paymentMethod,
        adult_count: passengerCount,
        child_count: 0,
        user_id: user.id,
      })
      .select("id, booking_code")
      .single<{ id: string; booking_code: string }>()

    if (bookingError || !booking) {
      return NextResponse.json({ error: bookingError?.message || "Gagal menyimpan booking pesawat." }, { status: 500 })
    }

    const requestPayload = {
      flow: "customer_flight_catalog_checkout",
      paymentGate: "fare_recheck_before_payment",
      offerId: asString(body.offer_id),
      fareReferenceId: asString(body.fare_reference_id),
      source: asString(body.source),
      title: asString(body.title),
      route: asString(body.route),
      departureTime: asString(body.departure_time),
      arrivalTime: asString(body.arrival_time),
      duration: asString(body.duration),
      transit: asString(body.transit),
      passengerManifest: passengerManifest || null,
    }

    const { data: supplierOrder, error: supplierOrderError } = await supabase
      .from("supplier_orders")
      .insert({
        booking_id: booking.id,
        supplier_id: supplier.id,
        product_type: "flight",
        supplier_status: "pending_submission",
        submission_mode: supplier.integration_mode,
        supplier_cost_amount: subtotalAmount,
        supplier_cost_currency: "IDR",
        supplier_cost_recorded_at: new Date().toISOString(),
        request_payload: requestPayload,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single<{ id: string }>()

    if (supplierOrderError || !supplierOrder) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json(
        { error: supplierOrderError?.message || "Gagal membuat order supplier pesawat." },
        { status: 500 },
      )
    }

    const { error: detailError } = await supabase.from("flight_booking_details").insert({
      booking_id: booking.id,
      supplier_order_id: supplierOrder.id,
      airline_name: asString(body.airline) || supplier.supplier_name,
      flight_number: asString(body.flight_number) || asString(body.offer_id) || "RECHECK",
      origin_airport_code: originAirportCode,
      destination_airport_code: destinationAirportCode,
      departure_at: departureAt,
      arrival_at: arrivalAt,
      return_at: returnAt,
      cabin_class: normalizeCabinClass(body.cabin),
      trip_type: normalizeTripType(body.trip_type),
      passenger_count: passengerCount,
      issue_status: "pending_confirmation",
      lifecycle_status: "fare_recheck_required",
      fare_reference_id: asString(body.fare_reference_id) || asString(body.offer_id) || null,
      supplier_raw_reference: {
        flow: "customer_catalog_checkout",
        source: asString(body.source),
        offerId: asString(body.offer_id),
        requiresFareRecheck: true,
      },
      notes: "Customer booking request dari katalog pesawat. Recheck fare dan hold supplier sebelum payment dibuka.",
    })

    if (detailError) {
      await supabase.from("supplier_orders").delete().eq("id", supplierOrder.id)
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ error: detailError.message || "Gagal menyimpan detail penerbangan." }, { status: 500 })
    }

    return NextResponse.json({ booking_id: booking.id, booking_code: booking.booking_code })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error saat membuat booking pesawat." }, { status: 500 })
  }
}
