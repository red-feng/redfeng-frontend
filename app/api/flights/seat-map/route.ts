import { NextResponse } from "next/server"
import { getDharmawisataFlightSeatMap } from "@/lib/flights/dharmawisataFlightSeatMap"
import type { DharmawisataPassenger } from "@/lib/flights/dharmawisataFlightBooking"
import { createClient as createServerClient } from "@/lib/supabase/server"

const AIRLINE_NAME_CODES: Record<string, string> = {
  citilink: "QG",
  "lion air": "JT",
  "batik air": "ID",
  airasia: "QZ",
  "air asia": "QZ",
  "garuda indonesia": "GA",
}

function asString(value: unknown) {
  return String(value || "").trim()
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

function extractPassengerCount(value: string, pattern: RegExp) {
  const match = value.match(pattern)
  return match ? Number.parseInt(match[1] || "0", 10) || 0 : 0
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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

  return value.slice(0, expectedAdults).map((item) => {
    const passenger = asRecord(item) || {}
    const title = normalizePassengerTitle(passenger.title)
    const firstName = asString(passenger.first_name ?? passenger.firstName)
    const noLastName = passenger.no_last_name === true || passenger.noLastName === true
    const lastName = noLastName ? "" : asString(passenger.last_name ?? passenger.lastName)
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
    const birthDate = asString(passenger.birth_date ?? passenger.birthDate)
    const identityNumber = asString(passenger.identity_number ?? passenger.identityNumber)
    const identityType = asString(passenger.identity_type ?? passenger.identityType)

    return {
      title,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      birth_date: birthDate,
      gender: normalizePassengerGender(passenger.gender, title),
      identity_number: identityNumber,
      identity_type: identityType,
      age: calculateAgeFromBirthDate(birthDate),
    }
  })
}

function buildDharmawisataPassengers(
  passengerDetails: ReturnType<typeof parsePassengerDetails>,
  fallbackName: string,
  fallbackEmail: string,
): DharmawisataPassenger[] {
  const fallbackNameParts = splitPersonName(fallbackName)
  const source = passengerDetails.length > 0
    ? passengerDetails
    : [
        {
          title: "MR",
          first_name: fallbackNameParts.firstName,
          last_name: fallbackNameParts.lastName,
          full_name: fallbackName,
          birth_date: "",
          gender: "M",
          identity_number: "",
          identity_type: "",
        },
      ]

  return source.map((passenger) => ({
    title: normalizePassengerTitle(passenger.title),
    firstName: passenger.first_name || splitPersonName(passenger.full_name || fallbackName).firstName,
    lastName: passenger.last_name || splitPersonName(passenger.full_name || fallbackName).lastName,
    identityNumber: passenger.identity_number || null,
    identityType: passenger.identity_type || null,
    birthDate: passenger.birth_date || null,
    gender: passenger.gender || null,
    email: fallbackEmail,
    type: "Adult",
  }))
}

export async function POST(req: Request) {
  try {
    const authSupabase = await createServerClient("customer")
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk cek kursi pesawat." }, { status: 401 })
    }

    const body = await req.json()
    const customerName = asString(body.customer_name)
    const customerEmail = asString(body.customer_email) || user.email || ""
    const customerPhone = asString(body.customer_phone)
    const originAirportCode = extractAirportCode(body.origin || body.route)
    const destinationAirportCode = extractAirportCode(body.destination || String(body.route || "").split("-")[1])
    const departureAt = composeDateTime(body.depart_date, body.departure_time)
    const returnAt = asString(body.return_date) ? composeDateTime(body.return_date, body.departure_time) : null
    const passengerMix = parsePassengerMix(body.passengers)
    const passengerDetails = parsePassengerDetails(body.passenger_details, passengerMix.adults)
    const airlineCode = normalizeAirlineCode(body.airline_code || body.flight_number, body.airline)

    if (!customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ error: "Lengkapi data kontak sebelum cek kursi." }, { status: 400 })
    }

    if (!originAirportCode || !destinationAirportCode || !departureAt) {
      return NextResponse.json({ error: "Data rute atau tanggal penerbangan belum lengkap untuk cek kursi." }, { status: 400 })
    }

    const incompletePassenger = passengerDetails.find((passenger) => !passenger.full_name || !passenger.gender || !passenger.identity_number)
    const invalidBirthDatePassenger = passengerDetails.find((passenger) => passenger.age === null)
    if (passengerDetails.length !== passengerMix.adults || incompletePassenger || invalidBirthDatePassenger) {
      return NextResponse.json({ error: "Lengkapi nama, gender, tanggal lahir, dan nomor identitas penumpang sebelum cek kursi." }, { status: 400 })
    }

    const contactNameParts = splitPersonName(customerName)
    const contactPhone = splitIndonesianPhone(customerPhone)
    const result = await getDharmawisataFlightSeatMap({
      airlineId: airlineCode,
      airlineCode,
      flightNumber: asString(body.flight_number),
      originAirportCode,
      destinationAirportCode,
      tripType: asString(body.trip_type),
      departureAt,
      returnAt,
      flightClass: asString(body.supplier_flight_class) || extractSupplierFlightClass(body.detail_schedule || body.fare_reference_id || body.offer_id) || asString(body.cabin) || "Economy",
      detailSchedule: asString(body.detail_schedule),
      searchKey: asString(body.search_key),
      airlineAccessCode: asString(body.airline_access_code || body.fare_reference_id || body.offer_id),
      contactTitle: normalizePassengerTitle(body.contact_title),
      contactFirstName: contactNameParts.firstName,
      contactLastName: contactNameParts.lastName,
      contactCountryCodePhone: contactPhone.countryCode,
      contactAreaCodePhone: contactPhone.areaCode,
      contactRemainingPhoneNo: contactPhone.remainingPhoneNo,
      contactEmail: customerEmail,
      paxAdult: passengerMix.adults,
      paxChild: passengerMix.children,
      paxInfant: 0,
      passengers: buildDharmawisataPassengers(passengerDetails, customerName, customerEmail),
    })

    return NextResponse.json({
      ok: result.ok,
      message: result.message,
      segments: result.segments,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seat map belum bisa dicek."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
