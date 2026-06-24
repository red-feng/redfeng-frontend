import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import { dharmawisataReferenceAirports } from "@/lib/flights/dharmawisataSupplierCatalog"
import { createAdminClient } from "@/lib/supabase/admin"

type RecordValue = Record<string, unknown>

const FLIGHT_AIRPORT_UPSERT_BATCH_SIZE = 100
const FLIGHT_ROUTE_UPSERT_BATCH_SIZE = 50
const DEFAULT_ACTIVE_AIRLINES = [
  { code: "QZ", name: "Indonesia AirAsia", isActive: true },
  { code: "QG", name: "Citilink", isActive: true },
  { code: "JT", name: "Lion Air", isActive: true },
]

export type DharmawisataFlightAirportOption = {
  code: string
  city: string
  name: string
  countryCode: string
}

export type DharmawisataFlightRouteSyncResult = {
  ok: boolean
  airportCount: number
  routeCount: number
  totalRouteCount?: number
  routeOffset?: number
  routeLimit?: number
  message: string
}

export type DharmawisataFlightRouteSyncOptions = {
  syncAirports?: boolean
  syncRoutes?: boolean
  airlineCodes?: string[]
  routeOffset?: number
  routeLimit?: number
}

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {}
}

function asString(value: unknown) {
  return String(value || "").trim()
}

function firstArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function firstRecordArray(value: unknown, keys: string[]): RecordValue[] {
  if (Array.isArray(value)) return value.filter((item): item is RecordValue => typeof item === "object" && item !== null && !Array.isArray(item))

  const record = asRecord(value)
  for (const key of keys) {
    const direct = firstArray<RecordValue>(record[key])
    if (direct.length > 0) return direct

    const nested = asRecord(record[key])
    for (const nestedKey of keys) {
      const nestedArray = firstArray<RecordValue>(nested[nestedKey])
      if (nestedArray.length > 0) return nestedArray
    }
  }

  return []
}

function firstValue(record: RecordValue, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && asString(value)) return value
  }
  return ""
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>()
  for (const item of items) {
    const key = getKey(item)
    if (!key || map.has(key)) continue
    map.set(key, item)
  }
  return Array.from(map.values())
}

function getPath(envName: string, fallback: string) {
  return getDharmawisataConfiguredPath(envName) || fallback.replace(/^\/+/, "")
}

function getAirportCode(row: RecordValue) {
  return asString(firstValue(row, ["cityID", "CityID", "airportCode", "AirportCode", "code", "Code", "ID", "id"])).toUpperCase()
}

function getAirportCity(row: RecordValue) {
  return asString(firstValue(row, ["cityName", "CityName", "name", "Name", "airportName", "AirportName"]))
}

function toFallbackAirports(): DharmawisataFlightAirportOption[] {
  return dharmawisataReferenceAirports.map((airport) => ({
    code: airport.code,
    city: airport.city,
    name: airport.name,
    countryCode: airport.countryCode,
  }))
}

export function getFallbackFlightAirportOptions() {
  return toFallbackAirports()
}

export async function loadFlightAirportOptions(limit = 120): Promise<DharmawisataFlightAirportOption[]> {
  try {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from("dharmawisata_flight_airports")
      .select("airport_code, city_name, airport_name, country_id")
      .eq("is_active", true)
      .order("country_id", { ascending: true })
      .order("city_name", { ascending: true })
      .limit(limit)

    if (error) return toFallbackAirports()

    const airports = ((data || []) as Array<{
      airport_code: string | null
      city_name: string | null
      airport_name: string | null
      country_id: string | null
    }>)
      .map((row) => ({
        code: asString(row.airport_code).toUpperCase(),
        city: asString(row.city_name),
        name: asString(row.airport_name) || asString(row.city_name),
        countryCode: asString(row.country_id),
      }))
      .filter((airport) => airport.code && airport.city)

    return airports.length > 0 ? airports : toFallbackAirports()
  } catch {
    return toFallbackAirports()
  }
}

function normalizeAirline(row: RecordValue) {
  return {
    code: asString(firstValue(row, ["airlineID", "AirlineID", "airlineId", "airlineCode", "AirlineCode", "code", "Code", "ID", "id"])).toUpperCase(),
    name: asString(firstValue(row, ["airlineName", "AirlineName", "name", "Name"])),
    isActive: String(row.isActive ?? row.active ?? "true").toLowerCase() !== "false",
  }
}

function normalizeRoute(row: RecordValue, airline: { code: string; name: string }, syncedAt: string) {
  const originCode = asString(firstValue(row, ["origin", "Origin", "originCode", "OriginCode", "departure", "Departure", "from", "From"])).toUpperCase()
  const destinationCode = asString(firstValue(row, ["destination", "Destination", "destinationCode", "DestinationCode", "arrival", "Arrival", "to", "To"])).toUpperCase()
  if (!originCode || !destinationCode) return null

  return {
    airline_code: airline.code,
    airline_name: airline.name,
    origin_code: originCode,
    origin_name: asString(firstValue(row, ["originName", "OriginName", "originCity", "OriginCity", "fromName", "FromName"])),
    destination_code: destinationCode,
    destination_name: asString(firstValue(row, ["destinationName", "DestinationName", "destinationCity", "DestinationCity", "toName", "ToName"])),
    is_active: true,
    raw: row,
    synced_at: syncedAt,
    updated_at: syncedAt,
  }
}

export async function syncDharmawisataFlightRoutes(options?: DharmawisataFlightRouteSyncOptions): Promise<DharmawisataFlightRouteSyncResult> {
  if (!isDharmawisataConfigured()) {
    return { ok: false, airportCount: 0, routeCount: 0, message: "Environment Dharmawisata belum lengkap." }
  }

  const login = await dharmawisataLogin({ language: 1 })
  const accessToken = asString(login.accessToken)
  if (!accessToken) {
    return { ok: false, airportCount: 0, routeCount: 0, message: login.respMessage || "Login Dharmawisata tidak mengembalikan access token." }
  }

  const credentials = getDharmawisataCredentials()
  const syncedAt = new Date().toISOString()
  const adminSupabase = createAdminClient()
  const shouldSyncAirports = options?.syncAirports ?? true
  const shouldSyncRoutes = options?.syncRoutes ?? false
  const routeOffset = Math.max(0, options?.routeOffset ?? 0)
  const routeLimit = Math.max(1, options?.routeLimit ?? 500)

  let airportCount = 0
  if (shouldSyncAirports) {
    const cityBody = asRecord(
      await dharmawisataJsonFetch({
        path: getPath("DHARMAWISATA_H2H_AIRLINE_CITY_PATH", "/Airline/City"),
        timeoutMs: 25000,
        body: {
          userID: credentials.userId,
          accessToken,
        },
      }),
    )

    const airportRows = uniqueBy(firstRecordArray(cityBody, ["cities", "Cities", "city", "City", "airports", "Airports", "data", "Data", "result", "Result"])
      .map((row) => {
        const airportCode = getAirportCode(row)
        const cityName = getAirportCity(row)
        return {
          airport_code: airportCode,
          city_name: cityName,
          airport_name: asString(firstValue(row, ["airportName", "AirportName", "airport", "Airport", "name", "Name"])) || cityName,
          country_id: asString(firstValue(row, ["countryID", "CountryID", "countryCode", "CountryCode"])),
          is_active: Boolean(airportCode && cityName),
          raw: row,
          synced_at: syncedAt,
          updated_at: syncedAt,
        }
      })
      .filter((row) => row.is_active), (row) => row.airport_code)

    for (let index = 0; index < airportRows.length; index += FLIGHT_AIRPORT_UPSERT_BATCH_SIZE) {
      const { error } = await adminSupabase
        .from("dharmawisata_flight_airports")
        .upsert(airportRows.slice(index, index + FLIGHT_AIRPORT_UPSERT_BATCH_SIZE), { onConflict: "airport_code" })

      if (error) {
        return { ok: false, airportCount: index, routeCount: 0, message: error.message }
      }
    }

    airportCount = airportRows.length
  }

  if (!shouldSyncRoutes) {
    return {
      ok: true,
      airportCount,
      routeCount: 0,
      message: "Airport pesawat Dharmawisata berhasil disync. Rute dilewati agar tidak timeout.",
    }
  }

  const airlineBody = asRecord(
    await dharmawisataJsonFetch({
      path: getPath("DHARMAWISATA_H2H_AIRLINE_LIST_PATH", "/Airline/List"),
      timeoutMs: 30000,
      body: {
        userID: credentials.userId,
        accessToken,
      },
    }),
  )
  const parsedAirlines = firstRecordArray(airlineBody, ["airlines", "Airlines", "airline", "Airline", "data", "Data", "result", "Result"])
    .map(normalizeAirline)
    .filter((airline) => airline.code && airline.isActive)
  const allowedAirlineCodes = new Set((options?.airlineCodes || []).map((code) => code.trim().toUpperCase()).filter(Boolean))
  const airlines = (parsedAirlines.length > 0 ? parsedAirlines : DEFAULT_ACTIVE_AIRLINES)
    .filter((airline) => allowedAirlineCodes.size === 0 || allowedAirlineCodes.has(airline.code))

  let routeCount = 0
  let totalRouteCount = 0
  for (const airline of airlines) {
    const routeBody = asRecord(
      await dharmawisataJsonFetch({
        path: getPath("DHARMAWISATA_H2H_AIRLINE_ROUTE_PATH", "/Airline/Route"),
        timeoutMs: 45000,
        body: {
          airlineID: airline.code,
          userID: credentials.userId,
          accessToken,
        },
      }),
    )
    const allRouteRows = uniqueBy(firstRecordArray(routeBody, ["routes", "Routes", "route", "Route", "data", "Data", "result", "Result"])
      .map((row) => normalizeRoute(row, airline, syncedAt))
      .filter((row): row is NonNullable<ReturnType<typeof normalizeRoute>> => Boolean(row)), (row) => `${row.airline_code}:${row.origin_code}:${row.destination_code}`)
    totalRouteCount += allRouteRows.length
    const routeRows = allRouteRows.slice(routeOffset, routeOffset + routeLimit)

    for (let index = 0; index < routeRows.length; index += FLIGHT_ROUTE_UPSERT_BATCH_SIZE) {
      const chunk = routeRows.slice(index, index + FLIGHT_ROUTE_UPSERT_BATCH_SIZE)
      const { error } = await adminSupabase
        .from("dharmawisata_flight_routes")
        .upsert(chunk, { onConflict: "airline_code,origin_code,destination_code" })

      if (error) {
        return {
          ok: false,
          airportCount,
          routeCount,
          totalRouteCount,
          routeOffset,
          routeLimit,
          message: error.message,
        }
      }
      routeCount += chunk.length
    }
  }

  return {
    ok: true,
    airportCount,
    routeCount,
    totalRouteCount,
    routeOffset,
    routeLimit,
    message: "Airport dan rute pesawat Dharmawisata berhasil disync.",
  }
}
