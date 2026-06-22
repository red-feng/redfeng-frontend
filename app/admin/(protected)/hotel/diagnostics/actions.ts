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

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
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

function diagnosticsRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params)
  redirect(`/admin/hotel/diagnostics?${searchParams.toString()}`)
}

function buildResultPayload(value: unknown) {
  return JSON.stringify(value)
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
    "DHARMAWISATA_H2H_HOTEL_ISSUE_PATH",
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
    hotelID: asString(formData.get("hotel_id")),
    breakfast: asString(formData.get("breakfast_id")),
    roomID: asString(formData.get("room_id")),
    requestDescription: asString(formData.get("request_description")) || "Red Feng hotel diagnostics",
    guestTitle: asString(formData.get("guest_title")) || "MR",
    guestFirstName: asString(formData.get("guest_first_name")) || "Red",
    guestLastName: asString(formData.get("guest_last_name")) || "Feng",
    guestPhone: asString(formData.get("guest_phone")) || "081234567890",
    guestEmail: asString(formData.get("guest_email")) || "ops@redfeng.co",
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
      body: {
        countryID,
        cityNameFilter,
        userID: credentials.userId,
        accessToken,
      },
    })
    const body = asRecord(response)
    const cities = Array.isArray(body.cities) ? body.cities : []
    const responseStatus = asString(body.status)
    const responseMessage = asString(body.respMessage) || (cities.length > 0 ? "Gunakan ID kota ini di Hotel City Mapping." : "Coba keyword kota yang lebih spesifik.")

    await recordHotelCitySearchLog({
      countryID,
      cityNameFilter,
      status: responseStatus,
      respMessage: responseMessage,
      cityCount: cities.length,
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
        cityCount: cities.length,
        cities,
      }),
    })
  } catch (error) {
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

export async function testHotelAvailableRooms(formData: FormData) {
  await ensureHotelAdmin()
  const startedAt = Date.now()

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
        result: buildResultPayload({
          title: "Payload AvailableRooms belum lengkap",
          missingFields,
        }),
      })
    }

    const response = await dharmawisataJsonFetch({
      path: getDharmawisataConfiguredPath("DHARMAWISATA_H2H_HOTEL_AVAILABLE_ROOMS_PATH") || "/Hotel/AvailableRooms",
      method: "POST",
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

    diagnosticsRedirect({
      panel: "available",
      status: String(summary.status).toUpperCase() === "SUCCESS" ? "success" : "warning",
      result: buildResultPayload({
        title: "AvailableRooms hotel selesai",
        elapsedMs: Date.now() - startedAt,
        request: { ...payload, accessToken: "present-redacted" },
        ...summary,
      }),
    })
  } catch (error) {
    diagnosticsRedirect({
      panel: "available",
      status: "error",
      result: buildResultPayload({
        title: "AvailableRooms hotel gagal",
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    })
  }
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
      title: "Preview payload Hotel/Booking",
      status: missingFields.length > 0 ? "NOT_READY" : "READY",
      respMessage:
        missingFields.length > 0
          ? `Payload booking belum lengkap: ${missingFields.join(", ")}.`
          : "Payload booking hotel siap secara struktur. Submit asli hanya dilakukan setelah payment Midtrans sukses.",
      missingFields,
      payload,
    }),
  })
}
