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

const FLIGHT_DIAGNOSTICS_TIMEOUT_MS = 25000

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
  const panel = asString(params.panel) || "login"
  redirect(`/admin/pesawat/diagnostics?${searchParams.toString()}#flight-diagnostics-${panel}`)
}

function isFlightDiagnosticsRole(role: string | null | undefined) {
  return role === "operations_manager" || role === "superadmin"
}

function rethrowNextRedirect(error: unknown) {
  const digest =
    error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest || "") : ""
  if (digest.startsWith("NEXT_REDIRECT")) throw error
}

async function ensureFlightDiagnosticsAccess() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?error=no-session")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!isFlightDiagnosticsRole(profile?.role)) {
    redirect("/admin/dashboard?error=Akses%20diagnostics%20Pesawat%20hanya%20untuk%20Operations%20Manager")
  }

  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)

  if (!hasInternalProductAccess(accessibleProducts, "flight", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20Pesawat%20tidak%20diizinkan")
  }

  return user
}

function buildResultPayload(value: unknown) {
  return JSON.stringify(value)
}

function isMissingSchemaObjectError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = String(error?.message || "").toLowerCase()
  const code = String(error?.code || "").toLowerCase()
  return (
    code === "pgrst200" ||
    code === "pgrst204" ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist")
  )
}

export async function checkFlightSchemaReadiness() {
  await ensureFlightDiagnosticsAccess()
  const adminSupabase = createAdminClient()
  const startedAt = Date.now()

  const checks = await Promise.all(
    FLIGHT_SCHEMA_REQUIRED_COLUMNS.map(async ([tableName, columnName]) => {
      const { error } = await adminSupabase.from(tableName).select(columnName).limit(1)
      return {
        tableName,
        columnName,
        ok: !error,
        error,
      }
    }),
  )
  const unexpectedError = checks.find((check) => check.error && !isMissingSchemaObjectError(check.error))

  if (unexpectedError) {
    diagnosticsRedirect({
      panel: "schema",
      status: "error",
      result: buildResultPayload({
        title: "Schema readiness gagal dibaca",
        elapsedMs: Date.now() - startedAt,
        error: unexpectedError.error?.message || "Unknown schema check error",
        tableName: unexpectedError.tableName,
        columnName: unexpectedError.columnName,
      }),
    })
  }

  const missingColumns = checks
    .filter((check) => !check.ok)
    .map((check) => ({
      tableName: check.tableName,
      columnName: check.columnName,
      error: check.error?.message || "",
    }))

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
    "DHARMAWISATA_H2H_AGENT_BALANCE_PATH",
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
  await ensureFlightDiagnosticsAccess()

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
    rethrowNextRedirect(error)
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
  const airlineID = asString(journey.airlineID)
  const airlineCode = asString(flightDetail.airlineCode || airlineID)
  const flightNumber = asString(flightDetail.flightNumber)
  const origin = asString(journey.jiOrigin || flightDetail.fdOrigin)
  const destination = asString(journey.jiDestination || flightDetail.fdDestination)
  const departTime = asString(journey.jiDepartTime || flightDetail.fdDepartTime)
  const arrivalTime = asString(journey.jiArrivalTime || flightDetail.fdArrivalTime)
  const flightClass = asString(availableDetail.flightClass || availableDetail.cabin)
  const journeyReference = asString(journey.journeyReference)

  return {
    airlineID,
    airlineCode,
    flightNumber,
    origin,
    destination,
    departTime,
    arrivalTime,
    class: flightClass,
    price: asNumber(journey.sumPrice || availableDetail.price),
    journeyReference,
    journeyReferenceShort: shortRef(journeyReference),
    holdPreviewHint: {
      airlineID,
      airlineCode,
      flightNumber,
      origin,
      destination,
      departureAt: departTime,
      arrivalAt: arrivalTime,
      flightClass: flightClass || "Economy",
      searchKey: journeyReference,
      detailSchedule: flightNumber || journeyReference,
      airlineAccessCode: asString(journey.airlineAccessCode) || journeyReference,
    },
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

function buildDefaultPassengers(paxAdult: number, paxChild: number, paxInfant: number, fallbackEmail: string) {
  const passengers: DharmawisataPassenger[] = []
  const passengerCount = Math.max(1, paxAdult + paxChild + paxInfant)

  for (let index = 0; index < passengerCount; index += 1) {
    const type: DharmawisataPassenger["type"] =
      index < paxAdult ? "Adult" : index < paxAdult + paxChild ? "Child" : "Infant"
    passengers.push({
      title: type === "Adult" ? "MR" : "MSTR",
      firstName: index === 0 ? "Red" : `Passenger${index + 1}`,
      lastName: index === 0 ? "Feng" : "Test",
      email: fallbackEmail,
      birthDate: type === "Adult" ? "1990-01-01" : type === "Child" ? "2018-01-01" : "2025-01-01",
      gender: "Male",
      type,
    })
  }

  return passengers
}

function normalizePassengerType(value: unknown): DharmawisataPassenger["type"] {
  const normalized = asString(value).toLowerCase()
  if (["child", "anak"].includes(normalized)) return "Child"
  if (["infant", "bayi"].includes(normalized)) return "Infant"
  return "Adult"
}

function normalizeFlightDateTime(value: unknown, fallbackDate: string, fallbackTime: string) {
  const raw = asString(value)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)) return raw.replace(" ", "T")
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  const hour = String(Number(timeMatch?.[1] || fallbackTime.split(":")[0] || "0")).padStart(2, "0")
  const minute = String(Number(timeMatch?.[2] || fallbackTime.split(":")[1] || "0")).padStart(2, "0")
  return `${fallbackDate}T${hour}:${minute}:00`
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
    const birthDate = hasExplicitTitle ? columns[3] : columns[2]
    const gender = hasExplicitTitle ? columns[4] : columns[3]
    const type = hasExplicitTitle ? columns[5] : columns[4]
    const name = splitPersonName(fullName)

    return {
      title: hasExplicitTitle ? titleCandidate : "MR",
      firstName: name.firstName,
      lastName: name.lastName,
      email,
      birthDate,
      gender,
      type: normalizePassengerType(type),
    }
  })
}

async function collectLowFareDiagnostics(input: {
  searchPath: string
  tripType: string
  origin: string
  destination: string
  departDate: string
  returnDate: string
  paxAdult: number
  paxChild: number
  paxInfant: number
  userID: string
  accessToken: string
}) {
  const journeys: unknown[] = []
  const seenReferences = new Set<string>()
  const seenStates = new Set<string>()
  const attempts: JsonRecord[] = []
  let airlineAccessCode = ""
  let lastBody: JsonRecord = {}

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const response = await dharmawisataFormFetch({
      path: input.searchPath,
      method: "POST",
      timeoutMs: FLIGHT_DIAGNOSTICS_TIMEOUT_MS,
      body: {
        tripType: input.tripType,
        origin: input.origin,
        destination: input.destination,
        departDate: `${input.departDate}T00:00:00`,
        returnDate: input.tripType === "RoundTrip" && input.returnDate ? `${input.returnDate}T00:00:00` : "0001-01-01T00:00:00",
        paxAdult: input.paxAdult,
        paxChild: input.paxChild,
        paxInfant: input.paxInfant,
        promoCode: "",
        airlineAccessCode,
        cacheType: 2,
        isShowEachAirline: true,
        userID: input.userID,
        accessToken: input.accessToken,
      },
    })
    const body = asRecord(response)
    lastBody = body
    const currentJourneys = Array.isArray(body.journeyDepart) ? body.journeyDepart : []
    const status = asString(body.status)
    const respMessage = asString(body.respMessage)
    const airlineIndex = asNumber(body.airlineIndex)
    const totalAirline = asNumber(body.totalAirline)
    const nextAirlineAccessCode = asString(body.airlineAccessCode)
    const stateKey = `${status}:${respMessage}:${airlineIndex}:${totalAirline}:${nextAirlineAccessCode}`

    attempts.push({
      iteration: iteration + 1,
      status,
      respMessage,
      airlineIndex,
      totalAirline,
      journeyDepartCount: currentJourneys.length,
      airlineAccessCode: nextAirlineAccessCode ? "present-redacted" : "",
    })

    for (const journey of currentJourneys) {
      const record = asRecord(journey)
      const reference = asString(record.journeyReference) || JSON.stringify(journey)
      if (seenReferences.has(reference)) continue
      seenReferences.add(reference)
      journeys.push(journey)
    }

    if (seenStates.has(stateKey)) break
    seenStates.add(stateKey)
    if (status.toUpperCase() === "SUCCESS" && totalAirline > 0 && airlineIndex >= totalAirline) break
    if (totalAirline === 0 || !nextAirlineAccessCode) break

    airlineAccessCode = nextAirlineAccessCode
  }

  return { attempts, journeys, lastBody }
}

export async function testDharmawisataSearch(formData: FormData) {
  await ensureFlightDiagnosticsAccess()

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
    const searchResult = await collectLowFareDiagnostics({
      searchPath,
      tripType,
      origin,
      destination,
      departDate,
      returnDate,
      paxAdult,
      paxChild,
      paxInfant,
      userID: credentials.userId,
      accessToken,
    })
    const body = searchResult.lastBody
    const journeys = searchResult.journeys

    diagnosticsRedirect({
      panel: "search",
      status: journeys.length > 0 ? "success" : "warning",
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
        searchAttemptCount: searchResult.attempts.length,
        searchAttempts: searchResult.attempts,
        journeyDepartCount: journeys.length,
        firstJourneys: journeys.slice(0, 5).map(summarizeJourney),
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
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

export async function autoDharmawisataSearchAndPreviewHold(formData: FormData) {
  await ensureFlightDiagnosticsAccess()

  if (!isDharmawisataConfigured()) {
    diagnosticsRedirect({
      panel: "auto",
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
      panel: "auto",
      status: "error",
      result: buildResultPayload({
        title: "Auto preview pesawat belum lengkap",
        error: "Origin, destination, dan tanggal berangkat wajib diisi.",
      }),
    })
  }

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) {
      diagnosticsRedirect({
        panel: "auto",
        status: "error",
        result: buildResultPayload({
          title: "Auto preview dibatalkan",
          error: "Login berhasil dipanggil tetapi accessToken kosong.",
          authStatus: auth.status || "",
          authMessage: auth.respMessage || "",
        }),
      })
    }

    const credentials = getDharmawisataCredentials()
    const searchPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEARCH_PATH") || "/Airline/LowFareSchedule"
    const searchResult = await collectLowFareDiagnostics({
      searchPath,
      tripType,
      origin,
      destination,
      departDate,
      returnDate,
      paxAdult,
      paxChild,
      paxInfant,
      userID: credentials.userId,
      accessToken,
    })
    const body = searchResult.lastBody
    const journeys = searchResult.journeys.map(summarizeJourney)
    const selectedJourney = journeys.find((journey) => {
      const hint = asRecord(journey.holdPreviewHint)
      return asString(hint.airlineID) && asString(hint.origin) && asString(hint.destination) && asString(hint.flightNumber)
    }) || journeys[0]

    if (!selectedJourney) {
      diagnosticsRedirect({
        panel: "auto",
        status: "warning",
        result: buildResultPayload({
          title: "Auto Search + Preview Hold belum menemukan fare",
          elapsedMs: Date.now() - startedAt,
          flow: "Login -> LowFareSchedule",
          status: asString(body.status),
          respMessage: asString(body.respMessage) || "Dharmawisata belum mengembalikan journey untuk rute ini.",
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
          searchAttemptCount: searchResult.attempts.length,
          searchAttempts: searchResult.attempts,
          journeyDepartCount: 0,
        }),
      })
    }

    const hint = asRecord(selectedJourney.holdPreviewHint)
    const contactEmail = "ops@redfeng.co"
    const preview = buildDharmawisataFlightBookingPayloadPreview({
      bookingId: "diagnostics-auto-preview",
      airlineId: asString(hint.airlineID),
      airlineCode: asString(hint.airlineCode),
      flightNumber: asString(hint.flightNumber),
      originAirportCode: asString(hint.origin) || origin,
      destinationAirportCode: asString(hint.destination) || destination,
      tripType: tripType === "RoundTrip" ? "round_trip" : "one_way",
      departureAt: normalizeFlightDateTime(hint.departureAt || selectedJourney.departTime, departDate, "08:00"),
      arrivalAt: normalizeFlightDateTime(hint.arrivalAt || selectedJourney.arrivalTime, departDate, "10:00"),
      returnAt: tripType === "RoundTrip" && returnDate ? `${returnDate}T00:00:00` : "",
      flightClass: asString(hint.flightClass) || asString(selectedJourney.class) || "Economy",
      detailSchedule: asString(hint.detailSchedule) || asString(selectedJourney.journeyReference),
      searchKey: asString(hint.searchKey) || asString(selectedJourney.journeyReference),
      airlineAccessCode: asString(hint.airlineAccessCode),
      contactTitle: "MR",
      contactFirstName: "Red",
      contactLastName: "Feng",
      contactCountryCodePhone: "62",
      contactAreaCodePhone: "812",
      contactRemainingPhoneNo: "34567890",
      contactEmail,
      paxAdult,
      paxChild,
      paxInfant,
      passengers: buildDefaultPassengers(paxAdult, paxChild, paxInfant, contactEmail),
    })

    diagnosticsRedirect({
      panel: "auto",
      status: preview.readyToSubmit ? "success" : "warning",
      result: buildResultPayload({
        title: "Auto Search + Preview Hold selesai",
        elapsedMs: Date.now() - startedAt,
        flow: "Login -> LowFareSchedule -> Preview /Airline/Booking",
        status: preview.readyToSubmit ? "READY" : "NOT_READY",
        respMessage: preview.message,
        configured: preview.configured,
        bookingPathConfigured: preview.bookingPathConfigured,
        missingFields: preview.missingFields,
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
        searchStatus: asString(body.status),
        searchMessage: asString(body.respMessage),
        searchAttemptCount: searchResult.attempts.length,
        searchAttempts: searchResult.attempts,
        journeyDepartCount: journeys.length,
        selectedJourney,
        summary: preview.summary,
        payload: preview.payload,
        note: "Diagnostics hanya preview payload hold. Request /Airline/Booking asli tetap lewat alur booking/admin, bukan dari tombol ini.",
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    diagnosticsRedirect({
      panel: "auto",
      status: "error",
      result: buildResultPayload({
        title: "Auto Search + Preview Hold gagal",
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
  await ensureFlightDiagnosticsAccess()

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
