import { NextResponse } from "next/server"
import { calculateBookingAmounts, getFinanceSettings } from "@/lib/finance/settings"
import { getFlightAutomationPolicy } from "@/lib/flights/automationPolicy"
import { createDharmawisataFlightBooking, type DharmawisataPassenger } from "@/lib/flights/dharmawisataFlightBooking"
import {
  findDharmawisataLowFareScheduleForBooking,
  type DharmawisataFlightScheduleLookupResult,
} from "@/lib/flights/dharmawisataFlightScheduleLookup"
import { getFlightPaymentDeadline } from "@/lib/flights/paymentDeadline"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createServerClient } from "@/lib/supabase/server"

type AdminSupabaseClient = ReturnType<typeof createAdminClient>

const AIRLINE_NAME_CODES: Record<string, string> = {
  citilink: "QG",
  "lion air": "JT",
  "batik air": "ID",
  airasia: "QZ",
  "air asia": "QZ",
  "garuda indonesia": "GA",
}

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

function summarizeScheduleLookup(result: DharmawisataFlightScheduleLookupResult | null) {
  if (!result) return null

  return {
    ok: result.ok,
    message: result.message,
    hasDetailSchedule: Boolean(result.detailSchedule),
    hasSearchKey: Boolean(result.searchKey),
    hasAirlineAccessCode: Boolean(result.airlineAccessCode),
    flightClass: result.flightClass,
    flightNumber: result.flightNumber,
    departureAt: result.departureAt,
    arrivalAt: result.arrivalAt,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function splitPersonName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return {
      firstName: parts[0] || "Passenger",
      lastName: parts[0] || "Passenger",
    }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

function splitIndonesianPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  const local = digits.startsWith("62") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits
  const areaLength = local.length >= 10 ? 3 : 2

  return {
    countryCode: "62",
    areaCode: local.slice(0, areaLength),
    remainingPhoneNo: local.slice(areaLength),
  }
}

function normalizeAirlineCode(value: unknown, fallbackAirlineName: unknown) {
  const direct = asString(value).toUpperCase()
  const directMatch = direct.match(/\b[A-Z0-9]{2,3}\b/)
  if (directMatch) return directMatch[0] || ""

  const normalizedAirline = asString(fallbackAirlineName).toLowerCase()
  return AIRLINE_NAME_CODES[normalizedAirline] || ""
}

function normalizeFlightNumber(value: unknown) {
  const normalized = asString(value).toUpperCase().replace(/\s+/g, "")
  return /^(?:[A-Z0-9]{2,3}-?)?\d{1,4}[A-Z]?$/.test(normalized) ? normalized : ""
}

function extractSupplierFlightClass(value: unknown) {
  const normalized = asString(value).replace(/^live-/, "")
  if (!normalized.includes("~") || !normalized.includes("|")) return ""

  return normalized
    .split("~")
    .map((part) => part.trim())
    .find((part) => /^[A-Z]{1,2}$/.test(part)) || ""
}

function normalizePassengerTitle(value: unknown) {
  const normalized = asString(value).toUpperCase()
  return ["MR", "MRS", "MS", "MSTR", "MISS"].includes(normalized) ? normalized : "MR"
}

function normalizePassengerGender(value: unknown, title: string) {
  const normalized = asString(value).toLowerCase()
  if (["m", "male", "l", "laki-laki", "pria"].includes(normalized)) return "M"
  if (["f", "female", "p", "perempuan", "wanita"].includes(normalized)) return "F"

  const normalizedTitle = normalizePassengerTitle(title)
  if (["MRS", "MS", "MISS"].includes(normalizedTitle)) return "F"
  if (["MR", "MSTR"].includes(normalizedTitle)) return "M"
  return ""
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function extractPassengerCount(value: string, pattern: RegExp) {
  const match = value.match(pattern)
  return match ? Number.parseInt(match[1] || "0", 10) || 0 : 0
}

function parsePassengerMix(value: unknown) {
  const normalized = asString(value).toLowerCase()
  const fallbackAdultCount = asPositiveInteger(normalized.match(/\d+/)?.[0] || "", 1)
  const adults = extractPassengerCount(normalized, /(\d+)\s*(?:dewasa|adult|adults)/i)
  const children = extractPassengerCount(normalized, /(\d+)\s*(?:anak|child|children)/i)
  const infants = extractPassengerCount(normalized, /(\d+)\s*(?:bayi|infant|infants)/i)

  return {
    adults: Math.max(1, adults || fallbackAdultCount),
    children: Math.max(0, children + infants),
  }
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

function isMissingSchemaColumnError(error: { message?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("schema cache") && message.includes("column")
}

async function insertFlightBookingDetail(
  supabase: AdminSupabaseClient,
  fullPayload: Record<string, unknown>,
  fallbackPayload: Record<string, unknown>,
) {
  const result = await supabase.from("flight_booking_details").insert(fullPayload)
  if (!result.error || !isMissingSchemaColumnError(result.error)) {
    return result
  }

  return supabase.from("flight_booking_details").insert(fallbackPayload)
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

function normalizeDateTimeForDb(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function calculateAgeFromBirthDate(value: unknown) {
  const birthDate = asString(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null

  const parsed = new Date(`${birthDate}T00:00:00+07:00`)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) return null

  const today = new Date()
  let age = today.getFullYear() - parsed.getFullYear()
  const monthDiff = today.getMonth() - parsed.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1
  }

  return Math.max(age, 0)
}

function parsePassengerDetails(value: unknown, expectedAdults: number) {
  if (!Array.isArray(value)) return []

  return value.slice(0, expectedAdults).map((item, index) => {
    const passenger = asRecord(item) || {}
    const title = normalizePassengerTitle(passenger.title)
    const firstName = asString(passenger.first_name ?? passenger.firstName)
    const noLastName = passenger.no_last_name === true || passenger.noLastName === true
    const lastName = noLastName ? "" : asString(passenger.last_name ?? passenger.lastName)
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
    const identityNumber = asString(passenger.identity_number ?? passenger.identityNumber)
    const identityType = asString(passenger.identity_type ?? passenger.identityType)
    const nationality = asString(passenger.nationality) || "Indonesia"
    const birthDate = asString(passenger.birth_date ?? passenger.birthDate)
    const gender = normalizePassengerGender(passenger.gender, title)
    const age = calculateAgeFromBirthDate(birthDate)

    return {
      participant_type: "adult" as const,
      sequence_no: index + 1,
      title,
      first_name: firstName,
      last_name: lastName,
      no_last_name: noLastName,
      full_name: fullName,
      birth_date: birthDate,
      gender,
      identity_type: identityType,
      identity_number: identityNumber,
      nationality,
      age,
    }
  })
}

function buildDharmawisataPassengers(
  passengerDetails: ReturnType<typeof parsePassengerDetails>,
  fallbackName: string,
  fallbackEmail: string,
  seatAddOns: Record<number, { aoOrigin: string; aoDestination: string; seat: string; compartment: string }[]> = {},
): DharmawisataPassenger[] {
  const fallbackNameParts = splitPersonName(fallbackName)
  const source: Array<{
    title: string
    first_name: string
    last_name: string
    full_name?: string
    birth_date?: string
    gender?: string
  }> = passengerDetails.length > 0
    ? passengerDetails
    : [
        {
          title: "MR",
          first_name: fallbackNameParts.firstName,
          last_name: fallbackNameParts.lastName,
          full_name: fallbackName,
          birth_date: "",
          gender: "M",
        },
      ]

  return source.map((passenger, index) => ({
    title: normalizePassengerTitle(passenger.title),
    firstName: passenger.first_name || splitPersonName(passenger.full_name || fallbackName).firstName,
    lastName: passenger.last_name || splitPersonName(passenger.full_name || fallbackName).lastName,
    birthDate: passenger.birth_date || null,
    gender: passenger.gender || null,
    email: fallbackEmail,
    type: "Adult",
    addOns: seatAddOns[index] || [],
  }))
}

function parseSeatAddOns(value: unknown, passengerDetails: ReturnType<typeof parsePassengerDetails>, fallbackOrigin: string, fallbackDestination: string) {
  if (!Array.isArray(value)) return {}

  return value.reduce<Record<number, { aoOrigin: string; aoDestination: string; baggageString: string; meals: string[]; seat: string; compartment: string }[]>>(
    (accumulator, item) => {
      const record = asRecord(item)
      if (!record) return accumulator

      const passengerId = asString(record.passenger_id ?? record.passengerId)
      const seat = asString(record.seat ?? record.seatDesignator)
      if (!passengerId || !seat) return accumulator

      const index = passengerDetails.findIndex((passenger) => {
        const expectedId = `passenger-${passenger.sequence_no}`
        return expectedId === passengerId
      })
      if (index < 0) return accumulator

      accumulator[index] = [
        {
          aoOrigin: extractAirportCode(record.origin) || fallbackOrigin,
          aoDestination: extractAirportCode(record.destination) || fallbackDestination,
          baggageString: "",
          meals: [],
          seat,
          compartment: asString(record.compartment),
        },
      ]
      return accumulator
    },
    {},
  )
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
    const contactTitle = normalizePassengerTitle(body.contact_title)
    const passengerManifest = asString(body.passenger_manifest)
    const originAirportCode = extractAirportCode(body.origin || body.route)
    const destinationAirportCode = extractAirportCode(body.destination || String(body.route || "").split("-")[1])
    const departureAt = composeDateTime(body.depart_date, body.departure_time)
    const arrivalAt = maybeArrivalDateTime(body.depart_date, body.departure_time, body.arrival_time)
    const returnAt = asString(body.return_date) ? composeDateTime(body.return_date, body.departure_time) : null
    const passengerMix = parsePassengerMix(body.passengers)
    const passengerCount = passengerMix.adults + passengerMix.children
    const fareAmount = asMoney(body.price)
    const passengerDetails = parsePassengerDetails(body.passenger_details, passengerMix.adults)
    const seatAddOns = parseSeatAddOns(body.selected_seats, passengerDetails, originAirportCode, destinationAirportCode)
    const selectedSeatDetails = Object.entries(seatAddOns).flatMap(([passengerIndex, addOns]) =>
      addOns.map((addOn) => ({
        passengerSequenceNo: Number(passengerIndex) + 1,
        origin: addOn.aoOrigin,
        destination: addOn.aoDestination,
        seat: addOn.seat,
        compartment: addOn.compartment,
      })),
    )
    const airlineCode = normalizeAirlineCode(body.airline_code || body.flight_number, body.airline)
    const flightNumber = normalizeFlightNumber(body.flight_number)
    const airlineAccessCode = asString(body.airline_access_code || body.fare_reference_id || body.offer_id)
    const searchKey = asString(body.search_key)
    const detailSchedule = asString(body.detail_schedule)
    const supplierFlightClass = asString(body.supplier_flight_class) || extractSupplierFlightClass(detailSchedule || body.fare_reference_id || body.offer_id)

    if (!customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ error: "Nama, email, dan nomor telepon wajib diisi." }, { status: 400 })
    }

    if (!originAirportCode || !destinationAirportCode || !departureAt) {
      return NextResponse.json({ error: "Data rute atau tanggal penerbangan belum lengkap." }, { status: 400 })
    }

    if (fareAmount <= 0) {
      return NextResponse.json({ error: "Harga penerbangan belum valid untuk dibuat booking." }, { status: 400 })
    }

    if (Array.isArray(body.passenger_details)) {
      const incompletePassenger = passengerDetails.find(
        (passenger) => !passenger.full_name || !passenger.gender || !passenger.identity_number || !passenger.nationality,
      )
      const invalidBirthDatePassenger = passengerDetails.find((passenger) => passenger.age === null)
      const underageAdultPassenger = passengerDetails.find((passenger) => typeof passenger.age === "number" && passenger.age < 12)

      if (passengerDetails.length !== passengerMix.adults || incompletePassenger) {
        return NextResponse.json({ error: "Data penumpang belum lengkap untuk checkout pesawat." }, { status: 400 })
      }

      if (invalidBirthDatePassenger) {
        return NextResponse.json({ error: "Tanggal lahir penumpang harus valid dan tidak boleh di masa depan." }, { status: 400 })
      }

      if (underageAdultPassenger) {
        return NextResponse.json({ error: "Penumpang dewasa harus berusia minimal 12 tahun." }, { status: 400 })
      }
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
        adult_count: passengerMix.adults,
        child_count: passengerMix.children,
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
      departDate: asString(body.depart_date),
      returnDate: asString(body.return_date),
      departureTime: asString(body.departure_time),
      arrivalTime: asString(body.arrival_time),
      duration: asString(body.duration),
      transit: asString(body.transit),
      airlineCode: airlineCode || null,
      flightNumber: flightNumber || asString(body.flight_number) || null,
      airlineAccessCode: airlineAccessCode || null,
      searchKey: searchKey || null,
      detailSchedule: detailSchedule || null,
      supplierFlightClass: supplierFlightClass || null,
      supplierCostAmount: subtotalAmount,
      supplierCostCurrency: "IDR",
      passengerManifest: passengerManifest || null,
      passengerDetails: passengerDetails.map((passenger) => ({
        sequenceNo: passenger.sequence_no,
        title: passenger.title,
        fullName: passenger.full_name,
        firstName: passenger.first_name,
        lastName: passenger.last_name,
        noLastName: passenger.no_last_name,
        birthDate: passenger.birth_date,
        gender: passenger.gender,
        identityType: passenger.identity_type,
        identityNumber: passenger.identity_number,
        nationality: passenger.nationality,
        age: passenger.age,
      })),
      selectedSeats: selectedSeatDetails,
      passengerMix,
    }

    const { data: supplierOrder, error: supplierOrderError } = await supabase
      .from("supplier_orders")
      .insert({
        booking_id: booking.id,
        supplier_id: supplier.id,
        product_type: "flight",
        supplier_status: "pending_submission",
        submission_mode: supplier.integration_mode,
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

    const detailPayload = {
      booking_id: booking.id,
      supplier_order_id: supplierOrder.id,
      airline_code: airlineCode || null,
      airline_name: asString(body.airline) || supplier.supplier_name,
      flight_number: flightNumber || asString(body.flight_number) || asString(body.offer_id) || "RECHECK",
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
        airlineCode: airlineCode || null,
        airlineAccessCode: airlineAccessCode || null,
        requiresFareRecheck: true,
      },
      notes: "Customer booking request dari katalog pesawat. Recheck fare dan hold supplier sebelum payment dibuka.",
    }
    const detailFallbackPayload = {
      booking_id: booking.id,
      airline_name: detailPayload.airline_name,
      flight_number: detailPayload.flight_number,
      origin_airport_code: originAirportCode,
      destination_airport_code: destinationAirportCode,
      departure_at: departureAt,
      cabin_class: detailPayload.cabin_class,
      passenger_count: passengerCount,
      notes: [
        "Customer booking request dari katalog pesawat. Recheck fare dan hold supplier sebelum payment dibuka.",
        arrivalAt ? `Arrival: ${arrivalAt}.` : "",
        returnAt ? `Return: ${returnAt}.` : "",
        `Lifecycle: ${detailPayload.lifecycle_status}.`,
      ]
        .filter(Boolean)
        .join(" "),
    }

    const { error: detailError } = await insertFlightBookingDetail(supabase, detailPayload, detailFallbackPayload)

    if (detailError) {
      await supabase.from("supplier_orders").delete().eq("id", supplierOrder.id)
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ error: detailError.message || "Gagal menyimpan detail penerbangan." }, { status: 500 })
    }

    if (passengerDetails.length > 0) {
      const { error: participantError } = await supabase.from("booking_participants").insert(
        passengerDetails.map((passenger) => ({
          booking_id: booking.id,
          participant_type: passenger.participant_type,
          sequence_no: passenger.sequence_no,
          full_name: passenger.full_name,
          identity_number: passenger.identity_number,
          nationality: passenger.nationality,
          age: passenger.age ?? 0,
        })),
      )

      if (participantError) {
        await supabase.from("supplier_orders").delete().eq("id", supplierOrder.id)
        await supabase.from("bookings").delete().eq("id", booking.id)
        return NextResponse.json(
          { error: participantError.message || "Gagal menyimpan data penumpang pesawat." },
          { status: 500 },
        )
      }
    }

    const contactNameParts = splitPersonName(customerName)
    const contactPhone = splitIndonesianPhone(customerPhone)
    const dharmawisataPassengers = buildDharmawisataPassengers(passengerDetails, customerName, customerEmail, seatAddOns)
    const automationPolicy = getFlightAutomationPolicy({
      airlineCode,
      airlineName: asString(body.airline),
      supplierCode: supplier.supplier_code,
      integrationMode: supplier.integration_mode,
    })
    const shouldAutoBookDharmawisata = supplier.supplier_code === "DHARMAWISATA_H2H" && automationPolicy.autoHold
    const scheduleLookup = shouldAutoBookDharmawisata
      ? await findDharmawisataLowFareScheduleForBooking({
          airlineCode,
          flightNumber,
          originAirportCode,
          destinationAirportCode,
          tripType: normalizeTripType(body.trip_type),
          departureAt,
          returnAt,
          paxAdult: passengerMix.adults,
          paxChild: passengerMix.children,
          paxInfant: 0,
        }).catch<DharmawisataFlightScheduleLookupResult>((error) => ({
          ok: false,
          message: error instanceof Error ? error.message : "Schedule lookup gagal sebelum hold.",
          detailSchedule: null,
          searchKey: null,
          airlineAccessCode: null,
          flightClass: null,
          flightNumber: null,
          departureAt: null,
          arrivalAt: null,
        }))
      : null
    const resolvedDetailSchedule = scheduleLookup?.ok && scheduleLookup.detailSchedule ? scheduleLookup.detailSchedule : detailSchedule
    const resolvedSearchKey = scheduleLookup?.ok && scheduleLookup.searchKey ? scheduleLookup.searchKey : searchKey
    const resolvedAirlineAccessCode = scheduleLookup?.ok && scheduleLookup.airlineAccessCode
      ? scheduleLookup.airlineAccessCode
      : airlineAccessCode
    const resolvedSupplierFlightClass = scheduleLookup?.ok && scheduleLookup.flightClass
      ? scheduleLookup.flightClass
      : supplierFlightClass
    const resolvedFlightNumber = scheduleLookup?.ok && scheduleLookup.flightNumber ? scheduleLookup.flightNumber : flightNumber
    const resolvedDepartureAt = scheduleLookup?.ok && scheduleLookup.departureAt ? scheduleLookup.departureAt : departureAt
    const resolvedArrivalAt = scheduleLookup?.ok && scheduleLookup.arrivalAt ? scheduleLookup.arrivalAt : arrivalAt

    const bookingApiResult = shouldAutoBookDharmawisata
      ? await createDharmawisataFlightBooking({
          bookingId: booking.id,
          airlineId: airlineCode,
          airlineCode,
          flightNumber: resolvedFlightNumber,
          originAirportCode,
          destinationAirportCode,
          tripType: normalizeTripType(body.trip_type),
          departureAt: resolvedDepartureAt,
          arrivalAt: resolvedArrivalAt,
          returnAt,
          flightClass: resolvedSupplierFlightClass || normalizeCabinClass(body.cabin),
          detailSchedule: resolvedDetailSchedule,
          searchKey: resolvedSearchKey,
          airlineAccessCode: resolvedAirlineAccessCode,
          contactTitle,
          contactFirstName: contactNameParts.firstName,
          contactLastName: contactNameParts.lastName,
          contactCountryCodePhone: contactPhone.countryCode,
          contactAreaCodePhone: contactPhone.areaCode,
          contactRemainingPhoneNo: contactPhone.remainingPhoneNo,
          contactEmail: customerEmail,
          paxAdult: passengerMix.adults,
          paxChild: passengerMix.children,
          paxInfant: 0,
          passengers: dharmawisataPassengers,
        })
      : {
          ok: false,
          skipped: true,
          mode: supplier.integration_mode === "api" ? "manual_incomplete_data" as const : "manual_unconfigured" as const,
          message: automationPolicy.reason,
          bookingCode: null,
          bookingDate: null,
          timeLimit: null,
          referenceNo: null,
          bookingCodeAirline: null,
          airlineAccessCode: null,
          raw: {
            bookingMode: automationPolicy.manualReviewRequired ? "manual_policy_review" : "manual_non_api_supplier",
            supplierCode: supplier.supplier_code,
            integrationMode: supplier.integration_mode,
            automationPolicy,
            scheduleLookup: summarizeScheduleLookup(scheduleLookup),
          },
        }

    if (bookingApiResult.ok) {
      const now = new Date().toISOString()
      const holdExpiresAt = normalizeDateTimeForDb(bookingApiResult.timeLimit)
      const paymentDeadline = getFlightPaymentDeadline(holdExpiresAt, new Date(now)).toISOString()
      const apiSupplierReference = bookingApiResult.referenceNo || bookingApiResult.bookingCodeAirline || null
      const apiBookingCode = bookingApiResult.bookingCode || null

      await supabase
        .from("supplier_orders")
        .update({
          supplier_order_id: apiBookingCode,
          supplier_reference: apiSupplierReference,
          supplier_status: "confirmed",
          response_payload: bookingApiResult.raw,
          last_error: null,
          submitted_at: now,
          confirmed_at: now,
          synced_at: now,
          updated_by: user.id,
        })
        .eq("id", supplierOrder.id)

      await supabase
        .from("bookings")
        .update({
          supplier_booking_reference: apiSupplierReference,
          supplier_order_status: "confirmed",
          expiry_time: paymentDeadline,
        })
        .eq("id", booking.id)

      await supabase
        .from("flight_booking_details")
        .update({
          lifecycle_status: "booking_hold_created",
          pnr_code: bookingApiResult.bookingCodeAirline || null,
          supplier_confirmation_code: bookingApiResult.referenceNo || bookingApiResult.bookingCode || null,
          fare_reference_id: bookingApiResult.airlineAccessCode || airlineAccessCode || asString(body.fare_reference_id) || null,
          fare_rechecked_at: now,
          booking_hold_expires_at: holdExpiresAt,
          supplier_raw_reference: bookingApiResult.raw,
          updated_at: now,
        })
        .eq("booking_id", booking.id)

      await supabase.from("supplier_order_events").insert({
        supplier_order_id: supplierOrder.id,
        actor_id: user.id,
        actor_role: "customer",
        event_type: "flight_booking_hold_created_via_dharmawisata",
        summary: "Booking/hold Pesawat berhasil dibuat lewat API Dharmawisata dari checkout customer.",
        metadata: {
          productType: "flight",
          lifecycleStatus: "booking_hold_created",
          bookingCode: bookingApiResult.bookingCode,
          bookingDate: bookingApiResult.bookingDate,
          referenceNo: bookingApiResult.referenceNo,
          bookingCodeAirline: bookingApiResult.bookingCodeAirline,
          timeLimit: bookingApiResult.timeLimit,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
        },
      })
    } else if (!bookingApiResult.skipped) {
      await supabase
        .from("supplier_orders")
        .update({
          supplier_status: "failed",
          response_payload: bookingApiResult.raw,
          last_error: bookingApiResult.message,
          synced_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", supplierOrder.id)

      await supabase.from("supplier_order_events").insert({
        supplier_order_id: supplierOrder.id,
        actor_id: user.id,
        actor_role: "customer",
        event_type: "flight_booking_hold_failed",
        summary: "Booking/hold Pesawat lewat API Dharmawisata gagal dari checkout customer.",
        metadata: {
          productType: "flight",
          lifecycleStatus: "fare_recheck_required",
          message: bookingApiResult.message,
          scheduleLookup: summarizeScheduleLookup(scheduleLookup),
        },
      })
    } else {
      await supabase.from("supplier_order_events").insert({
        supplier_order_id: supplierOrder.id,
        actor_id: user.id,
        actor_role: "customer",
        event_type: "flight_booking_hold_manual_required",
        summary: "Checkout customer tersimpan dan membutuhkan hold manual/admin.",
        metadata: {
          productType: "flight",
          lifecycleStatus: "fare_recheck_required",
          mode: bookingApiResult.mode,
          message: bookingApiResult.message,
          automationPolicy,
          raw: bookingApiResult.raw,
        },
      })
    }

    return NextResponse.json({ booking_id: booking.id, booking_code: booking.booking_code })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error saat membuat booking pesawat." }, { status: 500 })
  }
}
