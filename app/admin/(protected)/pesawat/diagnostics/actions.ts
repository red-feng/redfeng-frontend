"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getOptionalEnv } from "@/lib/env"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import {
  dharmawisataFormFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import {
  buildDharmawisataFlightBookingPayloadPreview,
  type DharmawisataPassenger,
} from "@/lib/flights/dharmawisataFlightBooking"

type JsonRecord = Record<string, unknown>

const FLIGHT_SCHEMA_REQUIRED_COLUMNS = [
  ["bookings", "fulfillment_mode"],
  ["bookings", "supplier_id"],
  ["bookings", "supplier_booking_reference"],
  ["bookings", "supplier_order_status"],
  ["bookings", "redfeng_profit_source"],
  ["bookings", "supplier_net_cost_amount"],
  ["bookings", "redfeng_spread_amount"],
  ["bookings", "redfeng_recorded_profit_amount"],
  ["supplier_orders", "booking_id"],
  ["supplier_orders", "supplier_id"],
  ["supplier_orders", "product_type"],
  ["supplier_orders", "supplier_order_id"],
  ["supplier_orders", "supplier_reference"],
  ["supplier_orders", "supplier_status"],
  ["supplier_orders", "submission_mode"],
  ["supplier_orders", "request_payload"],
  ["supplier_orders", "response_payload"],
  ["supplier_orders", "supplier_cost_amount"],
  ["supplier_orders", "supplier_cost_currency"],
  ["supplier_orders", "supplier_cost_recorded_at"],
  ["flight_booking_details", "booking_id"],
  ["flight_booking_details", "supplier_order_id"],
  ["flight_booking_details", "airline_code"],
  ["flight_booking_details", "airline_name"],
  ["flight_booking_details", "flight_number"],
  ["flight_booking_details", "origin_airport_code"],
  ["flight_booking_details", "origin_airport_name"],
  ["flight_booking_details", "destination_airport_code"],
  ["flight_booking_details", "destination_airport_name"],
  ["flight_booking_details", "departure_at"],
  ["flight_booking_details", "arrival_at"],
  ["flight_booking_details", "return_at"],
  ["flight_booking_details", "cabin_class"],
  ["flight_booking_details", "trip_type"],
  ["flight_booking_details", "passenger_count"],
  ["flight_booking_details", "pnr_code"],
  ["flight_booking_details", "ticket_number"],
  ["flight_booking_details", "issue_status"],
  ["flight_booking_details", "lifecycle_status"],
  ["flight_booking_details", "fare_reference_id"],
  ["flight_booking_details", "fare_rechecked_at"],
  ["flight_booking_details", "booking_hold_expires_at"],
  ["flight_booking_details", "issue_requested_at"],
  ["flight_booking_details", "issued_at"],
  ["flight_booking_details", "issue_failed_at"],
  ["flight_booking_details", "customer_notified_at"],
  ["flight_booking_details", "supplier_raw_reference"],
] as const

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(asString(value).replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function shortRef(value: unknown) {
  const normalized = asString(value)
  if (!normalized) return ""
  if (normalized.length <= 28) return normalized
  return `${normalized.slice(0, 18)}...${normalized.slice(-8)}`
}

function diagnosticsRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  redirect(`/admin/pesawat/diagnostics?${searchParams.toString()}`)
}

async function ensureFlightAdmin() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?error=no-session")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)

  if (!hasInternalProductAccess(accessibleProducts, "flight", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20Pesawat%20tidak%20diizinkan")
  }

  return user
}

function buildResultPayload(value: unknown) {
  return JSON.stringify(value)
}

export async function checkFlightSchemaReadiness() {
  await ensureFlightAdmin()
  const adminSupabase = createAdminClient()
  const startedAt = Date.now()
  const tableNames = Array.from(new Set(FLIGHT_SCHEMA_REQUIRED_COLUMNS.map(([tableName]) => tableName)))

  const { data, error } = await adminSupabase
    .schema("information_schema")
    .from("columns")
    .select("table_name, column_name")
    .eq("table_schema", "public")
    .in("table_name", tableNames)

  if (error) {
    diagnosticsRedirect({
      panel: "schema",
      status: "error",
      result: buildResultPayload({
        title: "Schema readiness gagal dibaca",
        elapsedMs: Date.now() - startedAt,
        error: error.message,
      }),
    })
  }

  const available = new Set(
    ((data as Array<{ table_name?: string | null; column_name?: string | null }> | null) || [])
      .map((column) => `${column.table_name || ""}.${column.column_name || ""}`),
  )
  const missingColumns = FLIGHT_SCHEMA_REQUIRED_COLUMNS
    .filter(([tableName, columnName]) => !available.has(`${tableName}.${columnName}`))
    .map(([tableName, columnName]) => ({ tableName, columnName }))

  diagnosticsRedirect({
    panel: "schema",
    status: missingColumns.length > 0 ? "warning" : "success",
    result: buildResultPayload({
      title: missingColumns.length > 0 ? "Schema pesawat belum lengkap" : "Schema pesawat sudah lengkap",
      status: missingColumns.length > 0 ? "MISSING_COLUMNS" : "READY",
      respMessage:
        missingColumns.length > 0
          ? "Jalankan migration 2026062001_ensure_flight_schema_alignment.sql di Supabase production."
          : "Kolom wajib alur checkout pesawat sudah tersedia.",
      elapsedMs: Date.now() - startedAt,
      requiredColumnCount: FLIGHT_SCHEMA_REQUIRED_COLUMNS.length,
      missingColumnCount: missingColumns.length,
      missingColumns,
    }),
  })
}

function summarizeEnv() {
  const configuredPathNames = [
    "DHARMAWISATA_H2H_LOGIN_PATH",
    "DHARMAWISATA_H2H_SEARCH_PATH",
    "DHARMAWISATA_H2H_BOOKING_PATH",
    "DHARMAWISATA_H2H_BOOKING_DETAIL_PATH",
    "DHARMAWISATA_H2H_ISSUE_PATH",
  ]

  return {
    configured: isDharmawisataConfigured(),
    baseUrlPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_BASE_URL")),
    userIdPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_USER_ID")),
    passwordPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_PASSWORD")),
    tlsRejectUnauthorized: getOptionalEnv("DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED", "true") || "true",
    paths: configuredPathNames.reduce<Record<string, boolean>>((accumulator, name) => {
      accumulator[name] = Boolean(getOptionalEnv(name))
      return accumulator
    }, {}),
  }
}

export async function testDharmawisataLogin() {
  await ensureFlightAdmin()

  if (!isDharmawisataConfigured()) {
    diagnosticsRedirect({
      panel: "login",
      status: "error",
      result: buildResultPayload({
        title: "Konfigurasi Dharmawisata belum lengkap",
        env: summarizeEnv(),
      }),
    })
  }

  const startedAt = Date.now()

  try {
    const response = await dharmawisataLogin({ language: 1 })
    diagnosticsRedirect({
      panel: "login",
      status: String(response.status).toUpperCase() === "SUCCESS" && response.accessToken ? "success" : "warning",
      result: buildResultPayload({
        title: "Login Dharmawisata selesai",
        elapsedMs: Date.now() - startedAt,
        status: response.status || "",
        respMessage: response.respMessage || "",
        respTime: response.respTime || "",
        userID: response.userID || getDharmawisataCredentials().userId,
        accessToken: response.accessToken ? "present-redacted" : "empty",
        env: summarizeEnv(),
      }),
    })
  } catch (error) {
    diagnosticsRedirect({
      panel: "login",
      status: "error",
      result: buildResultPayload({
        title: "Login Dharmawisata gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
        env: summarizeEnv(),
      }),
    })
  }
}

function summarizeJourney(value: unknown) {
  const journey = asRecord(value)
  const segment = Array.isArray(journey.segment) ? asRecord(journey.segment[0]) : {}
  const flightDetail = Array.isArray(segment.flightDetail) ? asRecord(segment.flightDetail[0]) : {}
  const availableDetail = Array.isArray(segment.availableDetail) ? asRecord(segment.availableDetail[0]) : {}

  return {
    airlineID: asString(journey.airlineID),
    flightNumber: asString(flightDetail.flightNumber),
    origin: asString(journey.jiOrigin || flightDetail.fdOrigin),
    destination: asString(journey.jiDestination || flightDetail.fdDestination),
    departTime: asString(journey.jiDepartTime || flightDetail.fdDepartTime),
    arrivalTime: asString(journey.jiArrivalTime || flightDetail.fdArrivalTime),
    class: asString(availableDetail.flightClass || availableDetail.cabin),
    price: asNumber(journey.sumPrice || availableDetail.price),
    journeyReference: shortRef(journey.journeyReference),
  }
}

function normalizePassengerTitle(value: unknown) {
  const normalized = asString(value).toUpperCase()
  return ["MR", "MRS", "MS", "MSTR", "MISS"].includes(normalized) ? normalized : "MR"
}

function normalizeTripType(value: unknown) {
  const normalized = asString(value).toLowerCase()
  return normalized === "round_trip" || normalized === "RoundTrip".toLowerCase() ? "round_trip" : "one_way"
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

function parsePreviewPassengers(formData: FormData, fallbackName: string, fallbackEmail: string): DharmawisataPassenger[] {
  const manifest = asString(formData.get("passenger_manifest"))
  const lines = manifest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const sourceLines = lines.length > 0 ? lines : [fallbackName]

  return sourceLines.map((line) => {
    const columns = line.split("|").map((item) => item.trim()).filter(Boolean)
    const titleCandidate = normalizePassengerTitle(columns[0])
    const hasExplicitTitle = columns.length > 1 && titleCandidate === String(columns[0] || "").trim().toUpperCase()
    const fullName = hasExplicitTitle ? columns[1] || fallbackName : columns[0] || fallbackName
    const email = hasExplicitTitle ? columns[2] || fallbackEmail : columns[1] || fallbackEmail
    const name = splitPersonName(fullName)

    return {
      title: hasExplicitTitle ? titleCandidate : "MR",
      firstName: name.firstName,
      lastName: name.lastName,
      email,
      type: "Adult",
    }
  })
}

export async function testDharmawisataSearch(formData: FormData) {
  await ensureFlightAdmin()

  if (!isDharmawisataConfigured()) {
    diagnosticsRedirect({
      panel: "search",
      status: "error",
      result: buildResultPayload({
        title: "Konfigurasi Dharmawisata belum lengkap",
        env: summarizeEnv(),
      }),
    })
  }

  const origin = asString(formData.get("origin") || "CGK").toUpperCase()
  const destination = asString(formData.get("destination") || "SUB").toUpperCase()
  const departDate = asString(formData.get("depart_date"))
  const returnDate = asString(formData.get("return_date"))
  const tripType = asString(formData.get("trip_type")) === "round_trip" ? "RoundTrip" : "OneWay"
  const paxAdult = Math.max(Number(formData.get("pax_adult") || 1), 1)
  const paxChild = Math.max(Number(formData.get("pax_child") || 0), 0)
  const paxInfant = Math.max(Number(formData.get("pax_infant") || 0), 0)
  const startedAt = Date.now()

  if (!origin || !destination || !departDate) {
    diagnosticsRedirect({
      panel: "search",
      status: "error",
      result: buildResultPayload({
        title: "Parameter search belum lengkap",
        error: "Origin, destination, dan tanggal berangkat wajib diisi.",
      }),
    })
  }

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)

    if (!accessToken) {
      diagnosticsRedirect({
        panel: "search",
        status: "error",
        result: buildResultPayload({
          title: "Search dibatalkan",
          error: "Login berhasil dipanggil tetapi accessToken kosong.",
          authStatus: auth.status || "",
          authMessage: auth.respMessage || "",
        }),
      })
    }

    const credentials = getDharmawisataCredentials()
    const searchPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEARCH_PATH") || "/Airline/LowFareSchedule"
    const response = await dharmawisataFormFetch({
      path: searchPath,
      method: "POST",
      body: {
        tripType,
        origin,
        destination,
        departDate: `${departDate}T00:00:00`,
        returnDate: tripType === "RoundTrip" && returnDate ? `${returnDate}T00:00:00` : "0001-01-01T00:00:00",
        paxAdult,
        paxChild,
        paxInfant,
        promoCode: "",
        airlineAccessCode: "",
        cacheType: 2,
        isShowEachAirline: true,
        userID: credentials.userId,
        accessToken,
      },
    })
    const body = asRecord(response)
    const journeys = Array.isArray(body.journeyDepart) ? body.journeyDepart : []

    diagnosticsRedirect({
      panel: "search",
      status: asString(body.status).toUpperCase() === "SUCCESS" ? "success" : "warning",
      result: buildResultPayload({
        title: "Search Dharmawisata selesai",
        elapsedMs: Date.now() - startedAt,
        request: {
          tripType,
          origin,
          destination,
          departDate,
          returnDate: tripType === "RoundTrip" ? returnDate : "",
          paxAdult,
          paxChild,
          paxInfant,
        },
        status: asString(body.status),
        respMessage: asString(body.respMessage),
        totalAirline: asNumber(body.totalAirline),
        airlineIndex: asNumber(body.airlineIndex),
        airlineAccessCode: asString(body.airlineAccessCode) ? "present-redacted" : "",
        journeyDepartCount: journeys.length,
        firstJourneys: journeys.slice(0, 5).map(summarizeJourney),
      }),
    })
  } catch (error) {
    diagnosticsRedirect({
      panel: "search",
      status: "error",
      result: buildResultPayload({
        title: "Search Dharmawisata gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
        request: {
          tripType,
          origin,
          destination,
          departDate,
          returnDate: tripType === "RoundTrip" ? returnDate : "",
          paxAdult,
          paxChild,
          paxInfant,
        },
      }),
    })
  }
}

export async function previewDharmawisataHoldPayload(formData: FormData) {
  await ensureFlightAdmin()

  const contactName = asString(formData.get("contact_name")) || "Red Feng Test"
  const contactEmail = asString(formData.get("contact_email")) || "ops@redfeng.co"
  const contactTitle = normalizePassengerTitle(formData.get("contact_title"))
  const phone = splitIndonesianPhone(asString(formData.get("contact_phone")) || "081234567890")
  const name = splitPersonName(contactName)
  const paxAdult = Math.max(Number(formData.get("pax_adult") || 1), 1)
  const paxChild = Math.max(Number(formData.get("pax_child") || 0), 0)
  const paxInfant = Math.max(Number(formData.get("pax_infant") || 0), 0)
  const passengers = parsePreviewPassengers(formData, contactName, contactEmail)

  const preview = buildDharmawisataFlightBookingPayloadPreview({
    bookingId: "diagnostics-preview",
    airlineId: asString(formData.get("airline_id")).toUpperCase(),
    airlineCode: asString(formData.get("airline_code")).toUpperCase(),
    flightNumber: asString(formData.get("flight_number")).toUpperCase(),
    originAirportCode: asString(formData.get("origin")).toUpperCase(),
    destinationAirportCode: asString(formData.get("destination")).toUpperCase(),
    tripType: normalizeTripType(formData.get("trip_type")),
    departureAt: asString(formData.get("departure_at")),
    arrivalAt: asString(formData.get("arrival_at")),
    returnAt: asString(formData.get("return_at")),
    flightClass: asString(formData.get("flight_class")) || "Economy",
    detailSchedule: asString(formData.get("detail_schedule")),
    searchKey: asString(formData.get("search_key")),
    airlineAccessCode: asString(formData.get("airline_access_code")),
    contactTitle,
    contactFirstName: name.firstName,
    contactLastName: name.lastName,
    contactCountryCodePhone: phone.countryCode,
    contactAreaCodePhone: phone.areaCode,
    contactRemainingPhoneNo: phone.remainingPhoneNo,
    contactEmail,
    paxAdult,
    paxChild,
    paxInfant,
    passengers,
  })

  diagnosticsRedirect({
    panel: "hold-preview",
    status: preview.readyToSubmit ? "success" : "warning",
    result: buildResultPayload({
      title: "Preview payload hold Dharmawisata",
      status: preview.readyToSubmit ? "READY" : "NOT_READY",
      respMessage: preview.message,
      configured: preview.configured,
      bookingPathConfigured: preview.bookingPathConfigured,
      missingFields: preview.missingFields,
      summary: preview.summary,
      payload: preview.payload,
    }),
  })
}
