"use server"

import { redirect } from "next/navigation"
import { getOptionalEnv } from "@/lib/env"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type JsonRecord = Record<string, unknown>

type HotelRateCandidate = {
  internalCode: string
  roomId: string
  breakfastId: string
  roomName: string
  rateName: string
  totalPrice: number | null
  currency: string
  cancellationPolicy: string
}

type HotelSearchCandidate = {
  supplierHotelId: string
  supplierInternalCode: string
  hotelName: string
  address: string
  rating: string
  priceStart: number | null
  availabilityStatus: string
  message: string
}

const HOTEL_SCHEMA_REQUIRED_COLUMNS = [
  ["bookings", "booking_product_type"],
  ["bookings", "fulfillment_mode"],
  ["bookings", "supplier_id"],
  ["bookings", "supplier_booking_reference"],
  ["bookings", "supplier_order_status"],
  ["hotel_availability_requests", "booking_id"],
  ["hotel_availability_requests", "quote_expires_at"],
  ["hotel_availability_requests", "quote_sent_at"],
  ["hotel_booking_details", "booking_id"],
  ["hotel_booking_details", "availability_request_id"],
  ["hotel_booking_details", "supplier_order_id"],
  ["hotel_booking_details", "hotel_id"],
  ["hotel_booking_details", "checkin_date"],
  ["hotel_booking_details", "checkout_date"],
  ["hotel_booking_details", "supplier_internal_code"],
  ["hotel_booking_details", "supplier_room_id"],
  ["hotel_booking_details", "supplier_breakfast_id"],
  ["hotel_booking_details", "reservation_no"],
  ["hotel_booking_details", "voucher_no"],
  ["hotel_booking_details", "lifecycle_status"],
  ["hotel_booking_details", "supplier_raw_reference"],
  ["supplier_orders", "booking_id"],
  ["supplier_orders", "product_type"],
  ["supplier_orders", "supplier_status"],
  ["supplier_orders", "request_payload"],
  ["supplier_orders", "response_payload"],
] as const

const HOTEL_DIAGNOSTICS_TIMEOUT_MS = 25000

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function cleanHotelIdentifier(value: unknown) {
  return asString(value).split("~|~")[0]?.trim() || asString(value)
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(asString(value).replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : fallback
}

function asDateTime(value: unknown) {
  const raw = asString(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00`
  return raw
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function firstString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) return value
  }
  return ""
}

function firstNumber(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const parsed = typeof value === "number" ? value : Number(asString(value).replace(/[^\d.-]/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function collectCityCandidates(value: unknown, fallbackCountryID: string) {
  const body = asRecord(value)
  const cities = Array.isArray(body.cities) ? body.cities : []

  return cities
    .slice(0, 12)
    .map((city) => {
      const row = asRecord(city)
      return {
        Name: firstString(row, ["Name", "name"]),
        ID: firstString(row, ["ID", "id"]),
        CountryID: firstString(row, ["CountryID", "countryID", "countryId"]) || fallbackCountryID,
      }
    })
    .filter((city) => city.Name && city.ID && city.CountryID)
}

function diagnosticsRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  const panel = asString(params.panel) || "schema"
  redirect(`/admin/hotel/diagnostics?${searchParams.toString()}#hotel-diagnostics-${panel}`)
}

function rethrowNextRedirect(error: unknown) {
  const digest =
    error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest || "") : ""
  if (digest.startsWith("NEXT_REDIRECT")) throw error
}

function buildResultPayload(value: unknown) {
  return JSON.stringify(value)
}

function buildCoreQueryParams(payload: ReturnType<typeof buildHotelPayload> | null) {
  const params: Record<string, string> = {}
  if (!payload) return params

  const values: Record<string, string> = {
    hotel_id: payload.hotelID,
    country_id: payload.countryID,
    city_id: payload.cityID,
    checkin_date: asString(payload.checkInDate).slice(0, 10),
    checkout_date: asString(payload.checkOutDate).slice(0, 10),
    pax_passport: payload.paxPassport,
    room_count: String(Array.isArray(payload.roomRequest) ? payload.roomRequest.length : 1),
    child_count: asString(asRecord(Array.isArray(payload.roomRequest) ? payload.roomRequest[0] : null).childNum) || "0",
    hotel_name_filter: payload.hotelNameFilter,
  }

  for (const [key, value] of Object.entries(values)) {
    if (value) params[key] = value
  }

  return params
}

function normalizeDestinationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function recordHotelCitySearchLog(input: {
  countryID: string
  cityNameFilter: string
  status?: string
  respMessage?: string
  cityCount?: number
  responsePayload?: unknown
}) {
  try {
    const adminSupabase = createAdminClient()
    await adminSupabase.from("dharmawisata_hotel_city_search_logs").insert({
      country_id: input.countryID,
      city_name_filter: input.cityNameFilter,
      status: input.status || null,
      resp_message: input.respMessage || null,
      city_count: Math.max(Math.floor(input.cityCount || 0), 0),
      response_payload: input.responsePayload || {},
    })
  } catch {
    // Diagnostics must still work before the optional search-log migration is applied.
  }
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

function isDharmawisataStatusError(error: unknown, status: number) {
  return error instanceof Error && error.message.includes(`status ${status}`)
}

async function ensureHotelAdmin() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login?error=no-session")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)

  if (!hasInternalProductAccess(accessibleProducts, "hotel", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20Hotel%20tidak%20diizinkan")
  }
}

function summarizeEnv() {
  const pathNames = [
    "DHARMAWISATA_H2H_LOGIN_PATH",
    "DHARMAWISATA_H2H_HOTEL_CITY_PATH",
    "DHARMAWISATA_H2H_HOTEL_AVAILABLE_ROOMS_PATH",
    "DHARMAWISATA_H2H_HOTEL_PRICE_POLICY_PATH",
    "DHARMAWISATA_H2H_HOTEL_BOOKING_PATH",
    "DHARMAWISATA_H2H_HOTEL_BOOKING_DETAIL_PATH",
  ]

  return {
    configured: isDharmawisataConfigured(),
    baseUrlPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_BASE_URL")),
    userIdPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_USER_ID")),
    passwordPresent: Boolean(getOptionalEnv("DHARMAWISATA_H2H_PASSWORD")),
    tlsRejectUnauthorized: getOptionalEnv("DHARMAWISATA_H2H_TLS_REJECT_UNAUTHORIZED", "true") || "true",
    paths: pathNames.reduce<Record<string, boolean>>((accumulator, name) => {
      accumulator[name] = Boolean(getOptionalEnv(name))
      return accumulator
    }, {}),
  }
}

function buildRoomRequest(roomCount: number, childCount: number) {
  const rooms = Math.max(Math.floor(roomCount), 1)
  const children = Math.max(Math.floor(childCount), 0)
  return Array.from({ length: rooms }, () => ({
    roomType: 0,
    isRequestChildBed: children > 0,
    childNum: children,
    childAges: children > 0 ? Array.from({ length: children }, () => 8) : [],
  }))
}

function buildHotelPayload(formData: FormData, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  const roomCount = Math.max(asNumber(formData.get("room_count"), 1), 1)
  const childCount = Math.max(asNumber(formData.get("child_count"), 0), 0)

  return {
    paxPassport: asString(formData.get("pax_passport")) || "ID",
    countryID: asString(formData.get("country_id")),
    cityID: asString(formData.get("city_id")),
    checkInDate: asDateTime(formData.get("checkin_date")),
    checkOutDate: asDateTime(formData.get("checkout_date")),
    roomRequest: buildRoomRequest(roomCount, childCount),
    internalCode: asString(formData.get("internal_code")),
    hotelID: cleanHotelIdentifier(formData.get("hotel_id")),
    breakfast: asString(formData.get("breakfast_id")),
    roomID: asString(formData.get("room_id")),
    requestDescription: asString(formData.get("request_description")) || "Red Feng hotel diagnostics",
    guestTitle: asString(formData.get("guest_title")) || "MR",
    guestFirstName: asString(formData.get("guest_first_name")) || "Red",
    guestLastName: asString(formData.get("guest_last_name")) || "Feng",
    guestPhone: asString(formData.get("guest_phone")) || "081234567890",
    guestEmail: asString(formData.get("guest_email")) || "ops@redfeng.co",
    hotelNameFilter: asString(formData.get("hotel_name_filter")),
    agentOsRef: "diagnostics-preview",
    contactName: `${asString(formData.get("guest_first_name")) || "Red"} ${asString(formData.get("guest_last_name")) || "Feng"}`,
    contactPhone: asString(formData.get("guest_phone")) || "081234567890",
    userID: credentials.userId,
    accessToken,
  }
}

function payloadMissingFields(payload: ReturnType<typeof buildHotelPayload>, includeGuest: boolean) {
  const required: Array<[string, unknown]> = [
    ["hotelID", payload.hotelID],
    ["countryID", payload.countryID],
    ["cityID", payload.cityID],
    ["checkInDate", payload.checkInDate],
    ["checkOutDate", payload.checkOutDate],
    ["internalCode", payload.internalCode],
    ["breakfast", payload.breakfast],
    ["roomID", payload.roomID],
  ]

  if (includeGuest) {
    required.push(
      ["guestFirstName", payload.guestFirstName],
      ["guestLastName", payload.guestLastName],
      ["guestPhone", payload.guestPhone],
      ["guestEmail", payload.guestEmail],
    )
  }

  return required.filter(([, value]) => !asString(value)).map(([key]) => key)
}

function summarizeHotelResponse(value: unknown) {
  const body = asRecord(value)
  const hotelInfo = asRecord(body.hotelInfo)
  const rooms = Array.isArray(hotelInfo.rooms) ? hotelInfo.rooms : Array.isArray(body.rooms) ? body.rooms : []

  return {
    status: asString(body.status),
    respMessage: asString(body.respMessage),
    availabilityStatus: body.availabilityStatus ?? hotelInfo.availabilityStatus ?? null,
    roomCount: rooms.length,
    totalPrice: body.totalPrice ?? hotelInfo.totalPrice ?? null,
    isEnableBooking: body.isEnableBooking ?? hotelInfo.isEnableBooking ?? null,
    reservationNo: asString(body.reservationNo),
    voucherNo: asString(body.voucherNo),
    bookingStatus: asString(body.bookingStatus),
  }
}

function collectHotelRateCandidates(
  value: unknown,
  inherited: Partial<HotelRateCandidate> = {},
  candidates: HotelRateCandidate[] = [],
  depth = 0,
) {
  if (depth > 6 || candidates.length >= 12) return candidates

  if (Array.isArray(value)) {
    value.forEach((item) => collectHotelRateCandidates(item, inherited, candidates, depth + 1))
    return candidates
  }

  const record = asRecord(value)
  if (Object.keys(record).length === 0) return candidates

  const next: Partial<HotelRateCandidate> = {
    internalCode: firstString(record, ["internalCode", "InternalCode", "internal_code", "rateKey", "RateKey", "rateCode", "RateCode", "roomRateCode", "RoomRateCode"]) || inherited.internalCode || "",
    roomId: firstString(record, ["roomID", "roomId", "RoomID", "room_id", "roomTypeID", "roomTypeId", "RoomTypeID", "RoomTypeId", "id", "ID"]) || inherited.roomId || "",
    breakfastId: firstString(record, ["breakfast", "breakfastID", "breakfastId", "Breakfast", "BreakfastID", "breakfast_id", "mealID", "mealId", "MealID", "MealId", "boardID", "boardId", "BoardID", "BoardId"]) || inherited.breakfastId || "",
    roomName: firstString(record, ["roomName", "RoomName", "roomTypeName", "RoomTypeName", "name", "Name", "description", "Description"]) || inherited.roomName || "",
    rateName: firstString(record, ["rateName", "RateName", "ratePlanName", "RatePlanName", "boardName", "BoardName", "breakfastName", "BreakfastName", "mealName", "MealName"]) || inherited.rateName || "",
    totalPrice: firstNumber(record, ["totalPrice", "TotalPrice", "price", "Price", "sellPrice", "SellPrice", "amount", "Amount", "netPrice", "NetPrice", "totalRoomRate", "TotalRoomRate"]) ?? inherited.totalPrice ?? null,
    currency: firstString(record, ["currency", "Currency"]) || inherited.currency || "IDR",
    cancellationPolicy: firstString(record, ["cancellationPolicy", "CancellationPolicy", "policy", "Policy"]) || inherited.cancellationPolicy || "",
  }

  if (next.internalCode || next.roomId || next.breakfastId) {
    const candidate = {
      internalCode: next.internalCode || "",
      roomId: next.roomId || "",
      breakfastId: next.breakfastId || "",
      roomName: next.roomName || "",
      rateName: next.rateName || "",
      totalPrice: next.totalPrice ?? null,
      currency: next.currency || "IDR",
      cancellationPolicy: next.cancellationPolicy || "",
    }
    const key = `${candidate.internalCode}|${candidate.roomId}|${candidate.breakfastId}`
    if (!candidates.some((item) => `${item.internalCode}|${item.roomId}|${item.breakfastId}` === key)) {
      candidates.push(candidate)
    }
  }

  Object.values(record).forEach((item) => collectHotelRateCandidates(item, next, candidates, depth + 1))
  return candidates
}

function collectHotelSearchCandidates(value: unknown) {
  const body = asRecord(value)
  const hotels = Array.isArray(body.hotels)
    ? body.hotels
    : Array.isArray(body.Hotels)
      ? body.Hotels
      : Array.isArray(body.hotelList)
        ? body.hotelList
        : []

  return hotels
    .map((hotel) => {
      const record = asRecord(hotel)
      const supplierHotelId = cleanHotelIdentifier(firstString(record, ["ID", "id", "hotelID", "hotelId", "HotelID"]))
      const supplierInternalCode = firstString(record, ["internalCode", "InternalCode", "internal_code"]) || supplierHotelId
      return {
        supplierHotelId,
        supplierInternalCode,
        hotelName: firstString(record, ["name", "Name", "hotelName", "HotelName"]),
        address: firstString(record, ["address", "Address", "location", "Location"]),
        rating: firstString(record, ["rating", "Rating", "star", "Star"]),
        priceStart: firstNumber(record, ["priceStart", "PriceStart", "totalPrice", "TotalPrice", "price", "Price"]),
        availabilityStatus: firstString(record, ["availabilityStatus", "AvailabilityStatus", "status", "Status"]),
        message: firstString(record, ["message", "Message", "respMessage"]),
      }
    })
    .filter((candidate): candidate is HotelSearchCandidate => Boolean(candidate.supplierHotelId || candidate.hotelName))
    .slice(0, 12)
}

export async function checkHotelSchemaReadiness() {
  await ensureHotelAdmin()
  const adminSupabase = createAdminClient()
  const startedAt = Date.now()

  const checks = await Promise.all(
    HOTEL_SCHEMA_REQUIRED_COLUMNS.map(async ([tableName, columnName]) => {
      const { error } = await adminSupabase.from(tableName).select(columnName).limit(1)
      return { tableName, columnName, ok: !error, error }
    }),
  )
  const unexpectedError = checks.find((check) => check.error && !isMissingSchemaObjectError(check.error))

  if (unexpectedError) {
    diagnosticsRedirect({
      panel: "schema",
      status: "error",
      result: buildResultPayload({
        title: "Schema hotel gagal dibaca",
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
      title: missingColumns.length > 0 ? "Schema hotel belum lengkap" : "Schema hotel sudah lengkap",
      status: missingColumns.length > 0 ? "MISSING_COLUMNS" : "READY",
      respMessage:
        missingColumns.length > 0
          ? "Jalankan migration 2026062201_add_hotel_booking_lifecycle.sql di Supabase production."
          : "Kolom wajib alur hotel quote, payment, booking, dan voucher sudah tersedia.",
      elapsedMs: Date.now() - startedAt,
      requiredColumnCount: HOTEL_SCHEMA_REQUIRED_COLUMNS.length,
      missingColumnCount: missingColumns.length,
      missingColumns,
    }),
  })
}

export async function testHotelLogin() {
  await ensureHotelAdmin()

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
        title: "Login Dharmawisata hotel selesai",
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
        title: "Login Dharmawisata hotel gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
        env: summarizeEnv(),
      }),
    })
  }
}

export async function testHotelCitySearch(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()
  const countryID = asString(formData.get("country_id")) || "ID"
  const cityNameFilter = asString(formData.get("city_name_filter"))

  if (!cityNameFilter) {
    diagnosticsRedirect({
      panel: "city",
      status: "error",
      result: buildResultPayload({
        title: "Pencarian City ID belum lengkap",
        error: "Nama kota wajib diisi.",
      }),
    })
  }

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) throw new Error("Login berhasil dipanggil tetapi accessToken kosong.")

    const credentials = getDharmawisataCredentials()
    const response = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_CITY_PATH") || "/Hotel/City5",
      method: "POST",
      timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
      body: {
        countryID,
        cityNameFilter,
        userID: credentials.userId,
        accessToken,
      },
    })
    const body = asRecord(response)
    const rawCities = Array.isArray(body.cities) ? body.cities : []
    const cities = collectCityCandidates(response, countryID)
    const responseStatus = asString(body.status)
    const responseMessage = asString(body.respMessage) || (cities.length > 0 ? "Gunakan ID kota ini di Hotel City Mapping." : "Coba keyword kota yang lebih spesifik.")

    await recordHotelCitySearchLog({
      countryID,
      cityNameFilter,
      status: responseStatus,
      respMessage: responseMessage,
      cityCount: rawCities.length,
      responsePayload: body,
    })

    diagnosticsRedirect({
      panel: "city",
      status: cities.length > 0 ? "success" : "warning",
      result: buildResultPayload({
        title: cities.length > 0 ? "City ID Dharmawisata ditemukan" : "City ID belum ditemukan",
        elapsedMs: Date.now() - startedAt,
        status: responseStatus,
        respMessage: responseMessage,
        countryID,
        cityNameFilter,
        cityCount: rawCities.length,
        cities,
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await recordHotelCitySearchLog({
      countryID,
      cityNameFilter,
      status: "ERROR",
      respMessage: errorMessage,
      cityCount: 0,
      responsePayload: {
        error: errorMessage,
      },
    })
    diagnosticsRedirect({
      panel: "city",
      status: "error",
      result: buildResultPayload({
        title: "Pencarian City ID Dharmawisata gagal",
        elapsedMs: Date.now() - startedAt,
        error: errorMessage,
        countryID,
        cityNameFilter,
      }),
    })
  }
}

export async function saveHotelCityMappingFromDiagnostics(formData: FormData) {
  await ensureHotelAdmin()
  const destinationLabel = asString(formData.get("destination_label"))
  const cityId = asString(formData.get("city_id"))
  const countryId = asString(formData.get("country_id"))
  const cityName = asString(formData.get("city_name")) || destinationLabel
  const countryName = asString(formData.get("country_name")) || countryId
  const destinationKey = normalizeDestinationKey(asString(formData.get("destination_key")) || destinationLabel || cityName)

  if (!destinationLabel || !destinationKey || !cityId || !countryId) {
    diagnosticsRedirect({
      panel: "city",
      status: "error",
      result: buildResultPayload({
        title: "Mapping City ID belum bisa disimpan",
        error: "Destination label, countryID, dan cityID wajib tersedia.",
      }),
    })
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from("dharmawisata_hotel_city_mappings")
    .upsert(
      {
        destination_key: destinationKey,
        destination_label: destinationLabel,
        country_id: countryId,
        city_id: cityId,
        country_name: countryName || null,
        city_name: cityName || null,
        is_active: true,
        notes: "Disimpan dari Hotel Diagnostics / Hotel/City5.",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "destination_key" },
    )

  if (error) {
    diagnosticsRedirect({
      panel: "city",
      status: "error",
      result: buildResultPayload({
        title: "Mapping City ID gagal disimpan",
        error: error.message || "Database menolak penyimpanan mapping.",
        destinationLabel,
        countryID: countryId,
        cityID: cityId,
      }),
    })
  }

  diagnosticsRedirect({
    panel: "city",
    status: "success",
    result: buildResultPayload({
      title: "City ID tersimpan ke mapping",
      status: "SAVED",
      respMessage: `${destinationLabel} disimpan sebagai ${countryId}/${cityId}. Katalog hotel akan memakai mapping ini.`,
      destinationLabel,
      destinationKey,
      countryID: countryId,
      cityID: cityId,
      cityName,
    }),
  })
}

export async function testHotelSearch(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()
  const requestId = asString(formData.get("request_id"))

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) throw new Error("Login berhasil dipanggil tetapi accessToken kosong.")

    const payload = buildHotelPayload(formData, accessToken)
    const missingFields = payloadMissingFields(payload, false).filter((field) => !["hotelID", "internalCode", "breakfast", "roomID"].includes(field))
    if (missingFields.length > 0) {
      diagnosticsRedirect({
        panel: "search",
        status: "error",
        ...(requestId ? { request_id: requestId } : {}),
        result: buildResultPayload({
          title: "Payload Hotel/Search5 belum lengkap",
          requestId,
          missingFields,
        }),
      })
    }

    let sourceEndpoint = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_SEARCH_PATH") || "/Hotel/Search5"
    let usedFallback = false
    let response: unknown
    try {
      response = await dharmawisataJsonFetch({
        path: sourceEndpoint,
        method: "POST",
        timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
        body: {
          paxPassport: payload.paxPassport,
          countryID: payload.countryID,
          cityID: payload.cityID,
          checkInDate: payload.checkInDate,
          checkOutDate: payload.checkOutDate,
          roomRequest: payload.roomRequest,
          userID: payload.userID,
          accessToken: payload.accessToken,
        },
      })
    } catch (error) {
      if (!isDharmawisataStatusError(error, 404)) throw error

      usedFallback = true
      sourceEndpoint = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_LIST_PATH") || "/Hotel/HotelList5"
      response = await dharmawisataJsonFetch({
        path: sourceEndpoint,
        method: "POST",
        timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
        body: {
          hotelNameFilter: payload.hotelNameFilter || payload.cityID,
          countryID: payload.countryID,
          cityID: payload.cityID,
          userID: payload.userID,
          accessToken: payload.accessToken,
        },
      })
    }
    const body = asRecord(response)
    const hotelCandidates = collectHotelSearchCandidates(response)
    const responseStatus = asString(body.status)
    const responseMessage =
      asString(body.respMessage) ||
      (hotelCandidates.length > 0
        ? usedFallback
          ? "Hotel/Search5 404, kandidat diambil dari HotelList5. Pilih Hotel ID supplier untuk lanjut ke AvailableRooms."
          : "Pilih salah satu Hotel ID supplier untuk lanjut ke AvailableRooms."
        : usedFallback
          ? "Hotel/Search5 404 dan HotelList5 belum mengembalikan kandidat hotel."
          : "Tidak ada hotel dari Search5 untuk kombinasi kota/tanggal ini.")

    diagnosticsRedirect({
      panel: "search",
      status: hotelCandidates.length > 0 ? "success" : "warning",
      ...(requestId ? { request_id: requestId } : {}),
      result: buildResultPayload({
        title: hotelCandidates.length > 0 ? "Hotel/Search5 menemukan hotel" : "Hotel/Search5 belum menemukan hotel",
        elapsedMs: Date.now() - startedAt,
        requestId,
        status: responseStatus,
        respMessage: responseMessage,
        sourceEndpoint,
        fallbackUsed: usedFallback,
        request: { ...payload, accessToken: "present-redacted" },
        hotelCount: hotelCandidates.length,
        hotelCandidates,
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    diagnosticsRedirect({
      panel: "search",
      status: "error",
      ...(requestId ? { request_id: requestId } : {}),
      result: buildResultPayload({
        title: "Hotel/Search5 gagal",
        elapsedMs: Date.now() - startedAt,
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })
  }
}

export async function testHotelAvailableRooms(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()
  const requestId = asString(formData.get("request_id"))

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) throw new Error("Login berhasil dipanggil tetapi accessToken kosong.")

    const payload = buildHotelPayload(formData, accessToken)
    const missingFields = payloadMissingFields(payload, false).filter((field) => !["internalCode", "breakfast", "roomID"].includes(field))
    if (missingFields.length > 0) {
      diagnosticsRedirect({
        panel: "available",
        status: "error",
        ...(requestId ? { request_id: requestId } : {}),
        result: buildResultPayload({
          title: "Payload AvailableRooms belum lengkap",
          requestId,
          missingFields,
        }),
      })
    }

    const response = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_AVAILABLE_ROOMS_PATH") || "/Hotel/AvailableRooms5",
      method: "POST",
      timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
      body: {
        paxPassport: payload.paxPassport,
        countryID: payload.countryID,
        cityID: payload.cityID,
        hotelID: payload.hotelID,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        roomRequest: payload.roomRequest,
        userID: payload.userID,
        accessToken: payload.accessToken,
      },
    })
    const summary = summarizeHotelResponse(response)
    const rateCandidates = collectHotelRateCandidates(response).slice(0, 8)

    diagnosticsRedirect({
      panel: "available",
      status: String(summary.status).toUpperCase() === "SUCCESS" ? "success" : "warning",
      ...(requestId ? { request_id: requestId } : {}),
      result: buildResultPayload({
        title: "AvailableRooms hotel selesai",
        elapsedMs: Date.now() - startedAt,
        requestId,
        request: { ...payload, accessToken: "present-redacted" },
        rateCandidates,
        ...summary,
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    diagnosticsRedirect({
      panel: "available",
      status: "error",
      ...(requestId ? { request_id: requestId } : {}),
      result: buildResultPayload({
        title: "AvailableRooms hotel gagal",
        elapsedMs: Date.now() - startedAt,
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })
  }
}

export async function testHotelAvailableRoomsThenPricePolicy(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()
  const requestId = asString(formData.get("request_id"))
  let payloadForError: ReturnType<typeof buildHotelPayload> | null = null

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) throw new Error("Login berhasil dipanggil tetapi accessToken kosong.")

    const payload = buildHotelPayload(formData, accessToken)
    payloadForError = payload
    const missingFields = payloadMissingFields(payload, false).filter((field) => !["internalCode", "breakfast", "roomID"].includes(field))
    if (missingFields.length > 0) {
      diagnosticsRedirect({
        panel: "price-policy",
        status: "error",
        ...(requestId ? { request_id: requestId } : {}),
        ...buildCoreQueryParams(payload),
        result: buildResultPayload({
          title: "Payload auto PricePolicy belum lengkap",
          requestId,
          request: { ...payload, accessToken: "present-redacted" },
          missingFields,
        }),
      })
    }

    const availableResponse = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_AVAILABLE_ROOMS_PATH") || "/Hotel/AvailableRooms5",
      method: "POST",
      timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
      body: {
        paxPassport: payload.paxPassport,
        countryID: payload.countryID,
        cityID: payload.cityID,
        hotelID: payload.hotelID,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        roomRequest: payload.roomRequest,
        userID: payload.userID,
        accessToken: payload.accessToken,
      },
    })
    const availableSummary = summarizeHotelResponse(availableResponse)
    const rateCandidates = collectHotelRateCandidates(availableResponse).slice(0, 8)
    const completeRateCandidates = rateCandidates
      .filter((candidate) => candidate.internalCode && candidate.roomId && candidate.breakfastId)
      .slice(0, 4)

    if (String(availableSummary.status).toUpperCase() !== "SUCCESS" || completeRateCandidates.length === 0) {
      diagnosticsRedirect({
        panel: "price-policy",
        status: "warning",
        ...(requestId ? { request_id: requestId } : {}),
        ...buildCoreQueryParams(payload),
        result: buildResultPayload({
          title: completeRateCandidates.length > 0 ? "Auto PricePolicy berhenti di AvailableRooms" : "Auto PricePolicy belum menemukan rate lengkap",
          elapsedMs: Date.now() - startedAt,
          requestId,
          flow: "Login -> AvailableRooms5 -> PriceAndPolicyInfo",
          availableSummary,
          rateCandidates,
          request: { ...payload, accessToken: "present-redacted" },
          status: availableSummary.status,
          respMessage:
            availableSummary.respMessage ||
            "AvailableRooms5 belum menghasilkan internalCode, roomID, dan breakfast lengkap untuk PricePolicy.",
          roomCount: availableSummary.roomCount,
          isEnableBooking: false,
        }),
      })
      return
    }

    const priceAttempts: JsonRecord[] = []
    let selectedRate = completeRateCandidates[0]
    let selectedPricePayload = {
      ...payload,
      internalCode: selectedRate.internalCode,
      roomID: selectedRate.roomId,
      breakfast: selectedRate.breakfastId,
    }
    let selectedPriceSummary = {
      status: "",
      respMessage: "",
      availabilityStatus: null as unknown,
      roomCount: 0,
      totalPrice: null as unknown,
      isEnableBooking: false as unknown,
      reservationNo: "",
      voucherNo: "",
      bookingStatus: "",
    }

    for (const candidate of completeRateCandidates) {
      const candidatePayload = {
        ...payload,
        internalCode: candidate.internalCode,
        roomID: candidate.roomId,
        breakfast: candidate.breakfastId,
      }

      try {
        const priceResponse = await dharmawisataJsonFetch({
          path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_PRICE_POLICY_PATH") || "/Hotel/PriceAndPolicyInfo",
          method: "POST",
          timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
          body: {
            paxPassport: candidatePayload.paxPassport,
            countryID: candidatePayload.countryID,
            cityID: candidatePayload.cityID,
            checkInDate: candidatePayload.checkInDate,
            checkOutDate: candidatePayload.checkOutDate,
            roomRequest: candidatePayload.roomRequest,
            internalCode: candidatePayload.internalCode,
            hotelID: candidatePayload.hotelID,
            breakfast: candidatePayload.breakfast,
            roomID: candidatePayload.roomID,
            userID: candidatePayload.userID,
            accessToken: candidatePayload.accessToken,
          },
        })
        const candidateSummary = summarizeHotelResponse(priceResponse)
        priceAttempts.push({
          rate: candidate,
          status: candidateSummary.status,
          respMessage: candidateSummary.respMessage,
          isEnableBooking: candidateSummary.isEnableBooking,
          roomCount: candidateSummary.roomCount,
          totalPrice: candidateSummary.totalPrice,
        })

        selectedRate = candidate
        selectedPricePayload = candidatePayload
        selectedPriceSummary = candidateSummary

        if (candidateSummary.isEnableBooking === true) break
      } catch (error) {
        priceAttempts.push({
          rate: candidate,
          error: error instanceof Error ? error.message : "Unknown PriceAndPolicy error",
        })
      }
    }

    const priceStatus = String(selectedPriceSummary.status).toUpperCase()
    const enableBooking = selectedPriceSummary.isEnableBooking === true

    diagnosticsRedirect({
      panel: "price-policy",
      status: priceStatus === "SUCCESS" && enableBooking ? "success" : "warning",
      ...(requestId ? { request_id: requestId } : {}),
      ...buildCoreQueryParams(selectedPricePayload),
      result: buildResultPayload({
        title: enableBooking ? "Auto AvailableRooms + PricePolicy menemukan rate bookable" : "Auto AvailableRooms + PricePolicy selesai",
        elapsedMs: Date.now() - startedAt,
        requestId,
        flow: "Login -> AvailableRooms5 -> PriceAndPolicyInfo",
        availableSummary,
        selectedRate,
        priceAttemptCount: priceAttempts.length,
        priceAttempts,
        rateCandidates,
        request: { ...selectedPricePayload, accessToken: "present-redacted" },
        ...selectedPriceSummary,
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    diagnosticsRedirect({
      panel: "price-policy",
      status: "error",
      ...(requestId ? { request_id: requestId } : {}),
      ...buildCoreQueryParams(payloadForError),
      result: buildResultPayload({
        title: "Auto AvailableRooms + PricePolicy gagal",
        elapsedMs: Date.now() - startedAt,
        requestId,
        request: payloadForError ? { ...payloadForError, accessToken: "present-redacted" } : undefined,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })
  }
}

export async function saveHotelSupplierRateFromDiagnostics(formData: FormData) {
  await ensureHotelAdmin()
  const requestId = asString(formData.get("request_id"))
  const supplierHotelId = asString(formData.get("supplier_hotel_id"))
  const supplierInternalCode = asString(formData.get("supplier_internal_code"))
  const supplierRoomId = asString(formData.get("supplier_room_id"))
  const supplierBreakfastId = asString(formData.get("supplier_breakfast_id"))
  const supplierCountryId = asString(formData.get("supplier_country_id"))
  const supplierCityId = asString(formData.get("supplier_city_id"))
  const quotedTotalAmount = asNumber(formData.get("quoted_total_amount"), 0)
  const roomName = asString(formData.get("room_name"))
  const rateName = asString(formData.get("rate_name"))
  const cancellationPolicy = asString(formData.get("cancellation_policy"))

  if (!requestId || !supplierHotelId || !supplierInternalCode || !supplierRoomId || !supplierBreakfastId || !supplierCountryId || !supplierCityId) {
    diagnosticsRedirect({
      panel: "available",
      status: "error",
      ...(requestId ? { request_id: requestId } : {}),
      result: buildResultPayload({
        title: "Rate supplier belum bisa disimpan",
        requestId,
        error: "Request ID, hotel ID, countryID, cityID, internalCode, roomID, dan breakfast wajib tersedia.",
      }),
    })
    return
  }

  const adminSupabase = createAdminClient()
  const { data: request, error: requestError } = await adminSupabase
    .from("hotel_availability_requests")
    .select("quote_payload")
    .eq("id", requestId)
    .maybeSingle<{ quote_payload: JsonRecord | null }>()

  if (requestError || !request) {
    diagnosticsRedirect({
      panel: "available",
      status: "error",
      request_id: requestId,
      result: buildResultPayload({
        title: "Request hotel tidak ditemukan",
        requestId,
        error: requestError?.message || "Request hotel tidak ditemukan.",
      }),
    })
    return
  }

  const existingQuotePayload = asRecord(request.quote_payload)
  const nowIso = new Date().toISOString()
  const nextQuotePayload = {
    ...existingQuotePayload,
    supplier_hotel_id: supplierHotelId,
    supplier_internal_code: supplierInternalCode,
    supplier_room_id: supplierRoomId,
    supplier_breakfast_id: supplierBreakfastId,
    supplier_country_id: supplierCountryId,
    supplier_city_id: supplierCityId,
    room_name: roomName || existingQuotePayload.room_name || null,
    rate_name: rateName || existingQuotePayload.rate_name || null,
    cancellation_policy: cancellationPolicy || existingQuotePayload.cancellation_policy || null,
    quoted_total_amount: quotedTotalAmount > 0 ? quotedTotalAmount : existingQuotePayload.quoted_total_amount || null,
    supplier_rate_saved_at: nowIso,
    supplier_rate_source: "hotel_diagnostics_available_rooms",
    updated_at: nowIso,
  }

  const updatePayload: {
    status: string
    quote_payload: JsonRecord
    updated_at: string
    quoted_total_amount?: number
  } = {
    status: "available",
    quote_payload: nextQuotePayload,
    updated_at: nowIso,
  }

  if (quotedTotalAmount > 0) {
    updatePayload.quoted_total_amount = quotedTotalAmount
  }

  const { error } = await adminSupabase
    .from("hotel_availability_requests")
    .update(updatePayload)
    .eq("id", requestId)

  if (error) {
    diagnosticsRedirect({
      panel: "available",
      status: "error",
      request_id: requestId,
      result: buildResultPayload({
        title: "Rate supplier gagal disimpan",
        requestId,
        error: error.message || "Database menolak update rate supplier.",
      }),
    })
  }

  redirect(`/admin/hotel?success=${encodeURIComponent("Rate supplier hotel disimpan dari AvailableRooms.")}`)
}

export async function testHotelPricePolicy(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()

  try {
    const auth = await dharmawisataLogin({ language: 1 })
    const accessToken = asString(auth.accessToken)
    if (!accessToken) throw new Error("Login berhasil dipanggil tetapi accessToken kosong.")

    const payload = buildHotelPayload(formData, accessToken)
    const missingFields = payloadMissingFields(payload, false)
    if (missingFields.length > 0) {
      diagnosticsRedirect({
        panel: "price-policy",
        status: "error",
        result: buildResultPayload({
          title: "Payload PriceAndPolicy belum lengkap",
          missingFields,
        }),
      })
    }

    const response = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_PRICE_POLICY_PATH") || "/Hotel/PriceAndPolicyInfo",
      method: "POST",
      timeoutMs: HOTEL_DIAGNOSTICS_TIMEOUT_MS,
      body: {
        paxPassport: payload.paxPassport,
        countryID: payload.countryID,
        cityID: payload.cityID,
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        roomRequest: payload.roomRequest,
        internalCode: payload.internalCode,
        hotelID: payload.hotelID,
        breakfast: payload.breakfast,
        roomID: payload.roomID,
        userID: payload.userID,
        accessToken: payload.accessToken,
      },
    })
    const summary = summarizeHotelResponse(response)

    diagnosticsRedirect({
      panel: "price-policy",
      status: String(summary.status).toUpperCase() === "SUCCESS" ? "success" : "warning",
      result: buildResultPayload({
        title: "PriceAndPolicy hotel selesai",
        elapsedMs: Date.now() - startedAt,
        request: { ...payload, accessToken: "present-redacted" },
        ...summary,
      }),
    })
  } catch (error) {
    rethrowNextRedirect(error)
    diagnosticsRedirect({
      panel: "price-policy",
      status: "error",
      result: buildResultPayload({
        title: "PriceAndPolicy hotel gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })
  }
}

export async function previewHotelBookingPayload(formData: FormData) {
  await ensureHotelAdmin()
  const payload = buildHotelPayload(formData, "present-redacted")
  const missingFields = payloadMissingFields(payload, true)

  diagnosticsRedirect({
    panel: "booking-preview",
    status: missingFields.length > 0 ? "warning" : "success",
    result: buildResultPayload({
      title: "Preview payload BookingAllSupplier",
      status: missingFields.length > 0 ? "NOT_READY" : "READY",
      respMessage:
        missingFields.length > 0
          ? `Payload booking belum lengkap: ${missingFields.join(", ")}.`
          : "Payload BookingAllSupplier siap secara struktur. Submit asli hanya dilakukan setelah payment Midtrans sukses.",
        missingFields,
        payload,
        hotelBookingNote: "Hotel Dharmawisata langsung payment/confirm saat BookingAllSupplier. Endpoint ini hanya boleh dipanggil setelah customer paid.",
      }),
    })
  }
