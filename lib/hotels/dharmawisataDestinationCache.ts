import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import { createAdminClient } from "@/lib/supabase/admin"

type RecordValue = Record<string, unknown>

export type DharmawisataHotelDestinationOption = {
  value: string
  sublabel: string
  hint?: string
  countryId?: string
  cityId?: string
}

export type DharmawisataHotelDestinationSyncResult = {
  ok: boolean
  count: number
  totalCount?: number
  offset?: number
  limit?: number
  message: string
}

const FALLBACK_HOTEL_DESTINATIONS: DharmawisataHotelDestinationOption[] = [
  { value: "Bali", sublabel: "Indonesia", hint: "Resort pantai, villa, dan family stay", countryId: "ID" },
  { value: "Jakarta", sublabel: "Indonesia", hint: "Hotel bisnis dan stay kota", countryId: "ID" },
  { value: "Singapore", sublabel: "Singapore", hint: "Orchard, Marina Bay, Sentosa", countryId: "SG" },
  { value: "Bangkok", sublabel: "Thailand", hint: "Shopping, nightlife, dan family hotel", countryId: "TH" },
  { value: "Tokyo", sublabel: "Japan", hint: "Shinjuku, Ginza, dan city hotel", countryId: "JP" },
  { value: "Labuan Bajo", sublabel: "Indonesia", hint: "Resort dekat gerbang Komodo", countryId: "ID" },
]

const HOTEL_DESTINATION_UPSERT_BATCH_SIZE = 50
const HOTEL_DESTINATION_DEFAULT_COUNTRY_LIMIT = 15

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

function buildHint(cityName: string, countryName: string) {
  return countryName ? `${cityName}, ${countryName}` : cityName
}

function toDestinationOption(row: {
  city_name: string | null
  country_name: string | null
  city_id: string | null
  country_id: string | null
}): DharmawisataHotelDestinationOption | null {
  const cityName = asString(row.city_name)
  const countryName = asString(row.country_name)
  if (!cityName) return null

  return {
    value: cityName,
    sublabel: countryName || asString(row.country_id) || "Dharmawisata",
    hint: buildHint(cityName, countryName),
    cityId: asString(row.city_id),
    countryId: asString(row.country_id),
  }
}

export function getFallbackHotelDestinationOptions() {
  return FALLBACK_HOTEL_DESTINATIONS
}

export async function loadHotelDestinationOptions(limit = 80): Promise<DharmawisataHotelDestinationOption[]> {
  try {
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from("dharmawisata_hotel_destinations")
      .select("city_name, country_name, city_id, country_id")
      .eq("is_active", true)
      .order("country_name", { ascending: true })
      .order("city_name", { ascending: true })
      .limit(limit)

    if (error) return FALLBACK_HOTEL_DESTINATIONS

    const options = ((data || []) as Array<{
      city_name: string | null
      country_name: string | null
      city_id: string | null
      country_id: string | null
    }>)
      .map(toDestinationOption)
      .filter((option): option is DharmawisataHotelDestinationOption => Boolean(option))

    return options.length > 0 ? options : FALLBACK_HOTEL_DESTINATIONS
  } catch {
    return FALLBACK_HOTEL_DESTINATIONS
  }
}

export async function syncDharmawisataHotelDestinations(options?: {
  countryOffset?: number
  countryLimit?: number
}): Promise<DharmawisataHotelDestinationSyncResult> {
  if (!isDharmawisataConfigured()) {
    return { ok: false, count: 0, message: "Environment Dharmawisata belum lengkap." }
  }

  const login = await dharmawisataLogin({ language: 1 })
  const accessToken = asString(login.accessToken)
  if (!accessToken) {
    return { ok: false, count: 0, message: login.respMessage || "Login Dharmawisata tidak mengembalikan access token." }
  }

  const credentials = getDharmawisataCredentials()
  const body = asRecord(
    await dharmawisataJsonFetch({
      path: getPath("DHARMAWISATA_H2H_HOTEL_ALL_COUNTRY_CITY_PATH", "/Hotel/AllCountryAllCity5"),
      timeoutMs: 30000,
      body: {
        userID: credentials.userId,
        accessToken,
      },
    }),
  )

  const countries = firstRecordArray(body, ["countries", "Countries", "country", "Country", "data", "Data", "result", "Result"])
  const countryOffset = Math.max(0, options?.countryOffset ?? 0)
  const countryLimit = Math.max(1, options?.countryLimit ?? HOTEL_DESTINATION_DEFAULT_COUNTRY_LIMIT)
  const selectedCountries = countries.slice(countryOffset, countryOffset + countryLimit)
  const syncedAt = new Date().toISOString()
  const rows = uniqueBy(selectedCountries.flatMap((country) => {
    const countryName = asString(country.Name ?? country.name)
    const countryId = asString(country.ID ?? country.id)
    const cities = firstRecordArray(country, ["cities", "Cities", "city", "City"])
    return cities.map((city) => {
      const cityName = asString(city.Name ?? city.name)
      const cityId = asString(city.ID ?? city.id)
      return {
        country_id: countryId,
        country_name: countryName,
        city_id: cityId,
        city_name: cityName,
        search_label: [cityName, countryName, countryId].filter(Boolean).join(" "),
        search_group: countryName || countryId,
        is_active: Boolean(cityName && cityId && countryId),
        raw: {
          country: { ID: countryId, Name: countryName },
          city,
        },
        synced_at: syncedAt,
        updated_at: syncedAt,
      }
    })
  }).filter((row) => row.is_active), (row) => `${row.country_id}:${row.city_id}`)

  if (rows.length === 0) {
    return {
      ok: false,
      count: 0,
      totalCount: countries.length,
      offset: countryOffset,
      limit: countryLimit,
      message: "Dharmawisata belum mengembalikan city hotel pada bagian country ini.",
    }
  }

  const adminSupabase = createAdminClient()
  for (let index = 0; index < rows.length; index += HOTEL_DESTINATION_UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(index, index + HOTEL_DESTINATION_UPSERT_BATCH_SIZE)
    const { error } = await adminSupabase
      .from("dharmawisata_hotel_destinations")
      .upsert(chunk, { onConflict: "country_id,city_id" })

    if (error) {
      return {
        ok: false,
        count: index,
        totalCount: countries.length,
        offset: countryOffset,
        limit: countryLimit,
        message: error.message,
      }
    }
  }

  return {
    ok: true,
    count: rows.length,
    totalCount: countries.length,
    offset: countryOffset,
    limit: countryLimit,
    message: "Destination hotel Dharmawisata berhasil disync.",
  }
}
