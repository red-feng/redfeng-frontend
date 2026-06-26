import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataAirlineEndpointKey =
  | "baggageAndMeal"
  | "seat"
  | "list"
  | "route"
  | "nationality"
  | "lowFareRoute"
  | "city"
  | "booking"
  | "bookingList"
  | "bookingDetail"
  | "issued"
  | "preview"
  | "bookingIssued"
  | "price"
  | "priceAllAirline"
  | "schedule"
  | "lowFareSchedule"
  | "scheduleAllAirline"
  | "timerElapsed"

export type DharmawisataAirlineEndpointMode = "read" | "quote" | "add_on" | "mutating" | "utility"

export type DharmawisataAirlineEndpointDefinition = {
  key: DharmawisataAirlineEndpointKey
  label: string
  defaultPath: string
  envName: string
  mode: DharmawisataAirlineEndpointMode
  summary: string
  requiresAuth: boolean
  customerFlow: "active" | "adapter" | "protected"
  timeoutMs?: number
}

export type DharmawisataAirlineCallResult = {
  ok: boolean
  skipped: boolean
  endpoint: DharmawisataAirlineEndpointDefinition
  path: string
  status: string
  message: string
  respTime: string | null
  elapsedMs: number
  raw: JsonRecord
}

export const DHARMAWISATA_AIRLINE_ENDPOINTS: DharmawisataAirlineEndpointDefinition[] = [
  {
    key: "baggageAndMeal",
    label: "Airline/BaggageAndMeal",
    defaultPath: "/Airline/BaggageAndMeal",
    envName: "DHARMAWISATA_H2H_BAGGAGE_AND_MEAL_PATH",
    mode: "add_on",
    summary: "Baca add-on bagasi dan meal untuk segment/fare tertentu.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "seat",
    label: "Airline/Seat",
    defaultPath: "/Airline/Seat",
    envName: "DHARMAWISATA_H2H_SEAT_PATH",
    mode: "add_on",
    summary: "Baca seat map/add-on kursi. Dipakai tombol Cek Kursi.",
    requiresAuth: true,
    customerFlow: "active",
  },
  {
    key: "list",
    label: "Airline/List",
    defaultPath: "/Airline/List",
    envName: "DHARMAWISATA_H2H_AIRLINE_LIST_PATH",
    mode: "read",
    summary: "Baca daftar maskapai aktif.",
    requiresAuth: true,
    customerFlow: "active",
  },
  {
    key: "route",
    label: "Airline/Route",
    defaultPath: "/Airline/Route",
    envName: "DHARMAWISATA_H2H_AIRLINE_ROUTE_PATH",
    mode: "read",
    summary: "Baca route untuk maskapai tertentu.",
    requiresAuth: true,
    customerFlow: "active",
    timeoutMs: 45000,
  },
  {
    key: "nationality",
    label: "Airline/Nationality",
    defaultPath: "/Airline/Nationality",
    envName: "DHARMAWISATA_H2H_AIRLINE_NATIONALITY_PATH",
    mode: "read",
    summary: "Baca daftar nationality/country untuk data penumpang.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "lowFareRoute",
    label: "Airline/LowFareRoute",
    defaultPath: "/Airline/LowFareRoute",
    envName: "DHARMAWISATA_H2H_LOW_FARE_ROUTE_PATH",
    mode: "read",
    summary: "Baca route semua maskapai untuk low-fare schedule.",
    requiresAuth: true,
    customerFlow: "adapter",
    timeoutMs: 45000,
  },
  {
    key: "city",
    label: "Airline/City",
    defaultPath: "/Airline/City",
    envName: "DHARMAWISATA_H2H_AIRLINE_CITY_PATH",
    mode: "read",
    summary: "Baca referensi kota/airport.",
    requiresAuth: true,
    customerFlow: "active",
  },
  {
    key: "booking",
    label: "Airline/Booking",
    defaultPath: "/Airline/Booking",
    envName: "DHARMAWISATA_H2H_BOOKING_PATH",
    mode: "mutating",
    summary: "Membuat hold/booking supplier. Endpoint private, dilindungi di diagnostics.",
    requiresAuth: true,
    customerFlow: "protected",
  },
  {
    key: "bookingList",
    label: "Airline/BookingList",
    defaultPath: "/Airline/BookingList",
    envName: "DHARMAWISATA_H2H_BOOKING_LIST_PATH",
    mode: "read",
    summary: "Baca booking list yang dibuat agent H2H.",
    requiresAuth: true,
    customerFlow: "adapter",
    timeoutMs: 45000,
  },
  {
    key: "bookingDetail",
    label: "Airline/BookingDetail",
    defaultPath: "/Airline/BookingDetail",
    envName: "DHARMAWISATA_H2H_BOOKING_DETAIL_PATH",
    mode: "read",
    summary: "Baca detail booking supplier.",
    requiresAuth: true,
    customerFlow: "active",
  },
  {
    key: "issued",
    label: "Airline/Issued",
    defaultPath: "/Airline/Issued",
    envName: "DHARMAWISATA_H2H_ISSUE_PATH",
    mode: "mutating",
    summary: "Issue tiket supplier. Endpoint private, dilindungi di diagnostics.",
    requiresAuth: true,
    customerFlow: "protected",
  },
  {
    key: "preview",
    label: "Airline/Preview",
    defaultPath: "/Airline/Preview",
    envName: "DHARMAWISATA_H2H_PREVIEW_PATH",
    mode: "quote",
    summary: "Preview/recheck payload supplier sebelum booking.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "bookingIssued",
    label: "Airline/BookingIssued",
    defaultPath: "/Airline/BookingIssued",
    envName: "DHARMAWISATA_H2H_BOOKING_ISSUED_PATH",
    mode: "mutating",
    summary: "Booking request dengan payload penuh. Dilindungi karena bisa berdampak ke supplier.",
    requiresAuth: true,
    customerFlow: "protected",
  },
  {
    key: "price",
    label: "Airline/Price",
    defaultPath: "/Airline/Price",
    envName: "DHARMAWISATA_H2H_PRICE_PATH",
    mode: "quote",
    summary: "Request/recheck harga airline.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "priceAllAirline",
    label: "Airline/PriceAllAirline",
    defaultPath: "/Airline/PriceAllAirline",
    envName: "DHARMAWISATA_H2H_PRICE_ALL_AIRLINE_PATH",
    mode: "quote",
    summary: "Request/recheck harga semua maskapai.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "schedule",
    label: "Airline/Schedule",
    defaultPath: "/Airline/Schedule",
    envName: "DHARMAWISATA_H2H_SCHEDULE_PATH",
    mode: "quote",
    summary: "Request schedule airline.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "lowFareSchedule",
    label: "Airline/LowFareSchedule",
    defaultPath: "/Airline/LowFareSchedule",
    envName: "DHARMAWISATA_H2H_SEARCH_PATH",
    mode: "quote",
    summary: "Request low-fare schedule. Dipakai katalog fare live.",
    requiresAuth: true,
    customerFlow: "active",
  },
  {
    key: "scheduleAllAirline",
    label: "Airline/ScheduleAllAirline",
    defaultPath: "/Airline/ScheduleAllAirline",
    envName: "DHARMAWISATA_H2H_SCHEDULE_ALL_AIRLINE_PATH",
    mode: "quote",
    summary: "Request schedule semua maskapai.",
    requiresAuth: true,
    customerFlow: "adapter",
  },
  {
    key: "timerElapsed",
    label: "Airline/timer_Elapsed",
    defaultPath: "/Airline/timer_Elapsed",
    envName: "DHARMAWISATA_H2H_TIMER_ELAPSED_PATH",
    mode: "utility",
    summary: "Utility supplier tanpa body parameters.",
    requiresAuth: false,
    customerFlow: "adapter",
  },
]

export function getDharmawisataAirlineEndpoint(key: string) {
  return DHARMAWISATA_AIRLINE_ENDPOINTS.find((endpoint) => endpoint.key === key) || null
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : ""
}

function redactValue(key: string, value: unknown): unknown {
  if (/token|password|securitycode/i.test(key)) {
    return normalizeText(value) ? "present-redacted" : ""
  }

  if (Array.isArray(value)) return value.map((item) => redactRecord(item))
  if (value && typeof value === "object") return redactRecord(value)
  return value
}

export function redactRecord(value: unknown): JsonRecord {
  const source = asRecord(value)
  return Object.fromEntries(Object.entries(source).map(([key, entry]) => [key, redactValue(key, entry)]))
}

function compactValue(key: string, value: unknown): unknown {
  if (/token|password|securitycode/i.test(key)) {
    return normalizeText(value) ? "present-redacted" : ""
  }

  if (Array.isArray(value)) {
    const sampleSize = value.length > 20 ? 5 : 20
    return {
      count: value.length,
      sample: value.slice(0, sampleSize).map((item) => (item && typeof item === "object" ? compactRecord(item) : item)),
      truncated: value.length > sampleSize,
    }
  }

  if (value && typeof value === "object") return compactRecord(value)
  return value
}

export function compactRecord(value: unknown): JsonRecord {
  const source = asRecord(value)
  return Object.fromEntries(Object.entries(source).map(([key, entry]) => [key, compactValue(key, entry)]))
}

function resolveEndpointPath(endpoint: DharmawisataAirlineEndpointDefinition) {
  return getDharmawisataConfiguredPath(endpoint.envName) || endpoint.defaultPath
}

export async function callDharmawisataAirlineEndpoint({
  endpointKey,
  payload,
  allowMutating = false,
}: {
  endpointKey: DharmawisataAirlineEndpointKey
  payload?: JsonRecord
  allowMutating?: boolean
}): Promise<DharmawisataAirlineCallResult> {
  const endpoint = getDharmawisataAirlineEndpoint(endpointKey)
  const startedAt = Date.now()

  if (!endpoint) {
    throw new Error(`Endpoint Airline tidak dikenal: ${endpointKey}`)
  }

  if (endpoint.mode === "mutating" && !allowMutating) {
    return {
      ok: false,
      skipped: true,
      endpoint,
      path: resolveEndpointPath(endpoint),
      status: "PROTECTED",
      message: "Endpoint private/mutating tidak dijalankan tanpa konfirmasi eksplisit.",
      respTime: null,
      elapsedMs: Date.now() - startedAt,
      raw: {
        endpoint: endpoint.label,
        mode: endpoint.mode,
        note: "Aktifkan allowMutating hanya saat Ops benar-benar ingin memanggil supplier.",
      },
    }
  }

  if (!isDharmawisataConfigured()) {
    return {
      ok: false,
      skipped: true,
      endpoint,
      path: resolveEndpointPath(endpoint),
      status: "SKIPPED",
      message: "Konfigurasi Dharmawisata belum lengkap.",
      respTime: null,
      elapsedMs: Date.now() - startedAt,
      raw: { configured: false },
    }
  }

  const credentials = getDharmawisataCredentials()
  let accessToken = ""
  let auth: JsonRecord | null = null

  if (endpoint.requiresAuth) {
    const login = await dharmawisataLogin({ language: 1 })
    auth = redactRecord(login)
    accessToken = normalizeText(login.accessToken)
    if (!accessToken) {
      return {
        ok: false,
        skipped: false,
        endpoint,
        path: resolveEndpointPath(endpoint),
        status: normalizeText(login.status) || "FAILED",
        message: normalizeText(login.respMessage) || "Login Dharmawisata tidak mengembalikan accessToken.",
        respTime: normalizeText(login.respTime) || null,
        elapsedMs: Date.now() - startedAt,
        raw: { auth, error: "empty_access_token" },
      }
    }
  }

  const requestPayload = endpoint.requiresAuth
    ? {
        ...(payload || {}),
        userID: credentials.userId,
        accessToken,
      }
    : payload
  const response = await dharmawisataJsonFetch({
    path: resolveEndpointPath(endpoint),
    method: "POST",
    body: endpoint.requiresAuth || requestPayload ? requestPayload || {} : undefined,
    timeoutMs: endpoint.timeoutMs,
  })
  const raw = asRecord(response)
  const status = normalizeText(raw.status)
  const message = normalizeText(raw.respMessage || raw.message)
  const ok = status ? status.toUpperCase() === "SUCCESS" : true

  return {
    ok,
    skipped: false,
    endpoint,
    path: resolveEndpointPath(endpoint),
    status: status || (ok ? "SUCCESS" : "FAILED"),
    message: message || (ok ? "Endpoint Airline berhasil dipanggil." : "Endpoint Airline gagal dipanggil."),
    respTime: normalizeText(raw.respTime) || null,
    elapsedMs: Date.now() - startedAt,
    raw: {
      auth,
      request: {
        path: resolveEndpointPath(endpoint),
        mode: endpoint.mode,
        customerFlow: endpoint.customerFlow,
        payload: redactRecord(requestPayload),
      },
      response: compactRecord(raw),
    },
  }
}
