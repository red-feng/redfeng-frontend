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
  message: string
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

function getPath(envName: string, fallback: string) {
  return getDharmawisataConfiguredPath(envName) || fallback.replace(/^\/+/, "")
}

function getAirportCode(row: RecordValue) {
  return asString(row.cityID ?? row.airportCode ?? row.code ?? row.ID).toUpperCase()
}

function getAirportCity(row: RecordValue) {
  return asString(row.cityName ?? row.name ?? row.Name ?? row.airportName)
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
    code: asString(row.airlineID ?? row.airlineCode ?? row.code ?? row.ID).toUpperCase(),
    name: asString(row.airlineName ?? row.name ?? row.Name),
    isActive: String(row.isActive ?? row.active ?? "true").toLowerCase() !== "false",
  }
}

function normalizeRoute(row: RecordValue, airline: { code: string; name: string }, syncedAt: string) {
  const originCode = asString(row.origin ?? row.originCode ?? row.departure ?? row.from).toUpperCase()
  const destinationCode = asString(row.destination ?? row.destinationCode ?? row.arrival ?? row.to).toUpperCase()
  if (!originCode || !destinationCode) return null

  return {
    airline_code: airline.code,
    airline_name: airline.name,
    origin_code: originCode,
    origin_name: asString(row.originName ?? row.originCity ?? row.fromName),
    destination_code: destinationCode,
    destination_name: asString(row.destinationName ?? row.destinationCity ?? row.toName),
    is_active: true,
    raw: row,
    synced_at: syncedAt,
    updated_at: syncedAt,
  }
}

export async function syncDharmawisataFlightRoutes(): Promise<DharmawisataFlightRouteSyncResult> {
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

  const cityBody = asRecord(
    await dharmawisataJsonFetch({
      path: getPath("DHARMAWISATA_H2H_AIRLINE_CITY_PATH", "/Airline/City"),
      timeoutMs: 30000,
      body: {
        userID: credentials.userId,
        accessToken,
      },
    }),
  )

  const airportRows = firstArray<RecordValue>(cityBody.cities)
    .map((row) => {
      const airportCode = getAirportCode(row)
      const cityName = getAirportCity(row)
      return {
        airport_code: airportCode,
        city_name: cityName,
        airport_name: asString(row.airportName ?? row.airport ?? row.name) || cityName,
        country_id: asString(row.countryID ?? row.countryCode),
        is_active: Boolean(airportCode && cityName),
        raw: row,
        synced_at: syncedAt,
        updated_at: syncedAt,
      }
    })
    .filter((row) => row.is_active)

  for (let index = 0; index < airportRows.length; index += 500) {
    const { error } = await adminSupabase
      .from("dharmawisata_flight_airports")
      .upsert(airportRows.slice(index, index + 500), { onConflict: "airport_code" })

    if (error) {
      return { ok: false, airportCount: index, routeCount: 0, message: error.message }
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
  const airlines = firstArray<RecordValue>(airlineBody.airlines).map(normalizeAirline).filter((airline) => airline.code && airline.isActive)

  let routeCount = 0
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
    const routeRows = firstArray<RecordValue>(routeBody.routes)
      .map((row) => normalizeRoute(row, airline, syncedAt))
      .filter((row): row is NonNullable<ReturnType<typeof normalizeRoute>> => Boolean(row))

    for (let index = 0; index < routeRows.length; index += 500) {
      const chunk = routeRows.slice(index, index + 500)
      const { error } = await adminSupabase
        .from("dharmawisata_flight_routes")
        .upsert(chunk, { onConflict: "airline_code,origin_code,destination_code" })

      if (error) {
        return { ok: false, airportCount: airportRows.length, routeCount, message: error.message }
      }
      routeCount += chunk.length
    }
  }

  return {
    ok: true,
    airportCount: airportRows.length,
    routeCount,
    message: "Airport dan rute pesawat Dharmawisata berhasil disync.",
  }
}
