import { getOptionalEnv } from "@/lib/env"
import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"
import type { HotelAvailabilitySearch } from "@/lib/hotels/hotelAvailability"
import { createAdminClient } from "@/lib/supabase/admin"

type RecordValue = Record<string, unknown>

type DharmawisataHotelListRow = {
  ID?: string
  Name?: string
  cityID?: string
  countryID?: string
}

type DharmawisataHotelSearchRow = {
  ID?: string
  name?: string
  rating?: number
  email?: string
  address?: string
  internalCode?: string
  logo?: string
  availabilityStatus?: boolean
  bookingDaysBefore?: number
  market?: string
  message?: string
  phone?: string
  website?: string
  priceStart?: number
  facilities?: string[]
  ratingAverage?: number
}

export type DharmawisataHotelCatalogItem = {
  id: string
  title: string
  location: string
  countryId: string
  cityId: string
  supplierHotelId: string
  supplierInternalCode: string
  sourceMode: "availability" | "directory"
  rating: number | null
  priceStart: number | null
  isAvailable: boolean | null
  market: string
  message: string
  phone: string
  website: string
  logo: string
  facilities: string[]
  raw: RecordValue
}

export type DharmawisataHotelCatalogResult = {
  source: "dharmawisata" | "fallback"
  mode: "availability" | "directory" | "unavailable"
  status: "ready" | "empty" | "skipped" | "error"
  message: string
  cityId: string
  countryId: string
  items: DharmawisataHotelCatalogItem[]
  raw?: RecordValue
}

type HotelCityHint = {
  cityID?: string
  cityId?: string
  countryID?: string
  countryId?: string
}

type HotelCityMappingRow = {
  destination_key: string
  country_id: string
  city_id: string
}

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {}
}

function asString(value: unknown) {
  return String(value || "").trim()
}

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function normalizeDestinationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function firstArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function parseCityMap() {
  const raw = getOptionalEnv("DHARMAWISATA_H2H_HOTEL_CITY_MAP_JSON").trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, HotelCityHint>
  } catch {
    return {}
  }
}

function getConfiguredHotelCity(destination: string) {
  const normalizedDestination = destination.trim().toLowerCase()
  const destinationKey = normalizeDestinationKey(destination)
  const cityMap = parseCityMap()
  const hint = cityMap[destination] || cityMap[normalizedDestination] || cityMap[destinationKey]
  if (!hint) return { countryId: "", cityId: "" }
  return {
    countryId: asString(hint.countryID || hint.countryId),
    cityId: asString(hint.cityID || hint.cityId),
  }
}

async function getDatabaseHotelCity(destination: string) {
  const destinationKey = normalizeDestinationKey(destination)
  if (!destinationKey) return { countryId: "", cityId: "" }

  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from("dharmawisata_hotel_city_mappings")
      .select("destination_key, country_id, city_id")
      .eq("is_active", true)
      .in("destination_key", [destinationKey, destination.trim().toLowerCase()])
      .limit(1)
      .maybeSingle<HotelCityMappingRow>()

    return {
      countryId: asString(data?.country_id),
      cityId: asString(data?.city_id),
    }
  } catch {
    return { countryId: "", cityId: "" }
  }
}

function getPath(envName: string, fallback: string) {
  return getDharmawisataConfiguredPath(envName) || fallback.replace(/^\/+/, "")
}

function buildRoomRequest(search: HotelAvailabilitySearch) {
  return Array.from({ length: Math.max(search.rooms, 1) }, () => ({
    roomType: 0,
    isRequestChildBed: search.children > 0,
    childNum: Math.max(search.children, 0),
    childAges: Array.from({ length: Math.max(search.children, 0) }, () => 7),
  }))
}

function buildHotelDetailHref(item: DharmawisataHotelCatalogItem, search: HotelAvailabilitySearch) {
  const params = new URLSearchParams()
  params.set("source", "dharmawisata")
  params.set("title", item.title)
  params.set("location", item.location)
  params.set("country_id", item.countryId)
  params.set("city_id", item.cityId)
  params.set("supplier_hotel_id", item.supplierHotelId)
  if (item.supplierInternalCode) params.set("supplier_internal_code", item.supplierInternalCode)
  if (item.rating) params.set("rating", String(item.rating))
  if (item.market) params.set("market", item.market)
  if (item.message) params.set("message", item.message)
  if (item.logo) params.set("logo", item.logo)
  params.set("destination", search.destination)
  params.set("checkin", search.checkin)
  params.set("checkout", search.checkout)
  params.set("adults", String(search.adults))
  params.set("children", String(search.children))
  params.set("rooms", String(search.rooms))
  return `/hotel/catalog/${encodeURIComponent(item.id)}?${params.toString()}`
}

function normalizeSearchHotel(
  row: DharmawisataHotelSearchRow,
  search: HotelAvailabilitySearch,
  cityId: string,
  countryId: string,
): DharmawisataHotelCatalogItem | null {
  const title = asString(row.name)
  const supplierHotelId = asString(row.ID)
  if (!title && !supplierHotelId) return null
  const internalCode = asString(row.internalCode)
  const id = normalizeSlug(`dw-${supplierHotelId || internalCode || title}`)
  return {
    id,
    title: title || `Hotel ${supplierHotelId}`,
    location: asString(row.address) || search.destination || cityId,
    countryId,
    cityId,
    supplierHotelId,
    supplierInternalCode: internalCode,
    sourceMode: "availability",
    rating: asNumber(row.rating),
    priceStart: asNumber(row.priceStart),
    isAvailable: typeof row.availabilityStatus === "boolean" ? row.availabilityStatus : null,
    market: asString(row.market),
    message: asString(row.message),
    phone: asString(row.phone),
    website: asString(row.website),
    logo: asString(row.logo),
    facilities: firstArray<string>(row.facilities).map(asString).filter(Boolean),
    raw: asRecord(row),
  }
}

function normalizeDirectoryHotel(row: DharmawisataHotelListRow, search: HotelAvailabilitySearch): DharmawisataHotelCatalogItem | null {
  const title = asString(row.Name)
  const supplierHotelId = asString(row.ID)
  if (!title && !supplierHotelId) return null
  const cityId = asString(row.cityID)
  const countryId = asString(row.countryID)
  return {
    id: normalizeSlug(`dw-${supplierHotelId || title}`),
    title: title || `Hotel ${supplierHotelId}`,
    location: search.destination || cityId || "Dharmawisata hotel",
    countryId,
    cityId,
    supplierHotelId,
    supplierInternalCode: supplierHotelId,
    sourceMode: "directory",
    rating: null,
    priceStart: null,
    isAvailable: null,
    market: "",
    message: "Data hotel ditemukan di direktori Dharmawisata. Availability dan harga final akan dicek sebelum booking.",
    phone: "",
    website: "",
    logo: "",
    facilities: [],
    raw: asRecord(row),
  }
}

async function loginDharmawisata() {
  const login = await dharmawisataLogin({ language: 1 })
  const accessToken = asString(login.accessToken)
  if (!accessToken) {
    throw new Error(login.respMessage || "Login Dharmawisata tidak mengembalikan access token.")
  }
  return accessToken
}

export function getDharmawisataHotelDetailHref(item: DharmawisataHotelCatalogItem, search: HotelAvailabilitySearch) {
  return buildHotelDetailHref(item, search)
}

export async function loadDharmawisataHotelCatalog(search: HotelAvailabilitySearch): Promise<DharmawisataHotelCatalogResult> {
  const destination = search.destination.trim()
  if (!destination) {
    return {
      source: "fallback",
      mode: "unavailable",
      status: "skipped",
      message: "Isi destinasi untuk mengambil katalog hotel Dharmawisata.",
      cityId: "",
      countryId: "",
      items: [],
    }
  }

  if (!isDharmawisataConfigured()) {
    return {
      source: "fallback",
      mode: "unavailable",
      status: "skipped",
      message: "Environment Dharmawisata belum lengkap.",
      cityId: "",
      countryId: "",
      items: [],
    }
  }

  try {
    const accessToken = await loginDharmawisata()
    const credentials = getDharmawisataCredentials()
    const hotelListResponse = asRecord(
      await dharmawisataJsonFetch({
        path: getPath("DHARMAWISATA_H2H_HOTEL_LIST_PATH", "/Hotel/HotelList5"),
        body: {
          hotelNameFilter: destination,
          userID: credentials.userId,
          accessToken,
        },
      }),
    )
    const directoryItems = firstArray<DharmawisataHotelListRow>(hotelListResponse.hotels)
      .map((row) => normalizeDirectoryHotel(row, search))
      .filter((item): item is DharmawisataHotelCatalogItem => Boolean(item))

    const suppliedCity = {
      cityId: asString(search.cityId),
      countryId: asString(search.countryId),
    }
    const databaseCity = suppliedCity.cityId && suppliedCity.countryId ? suppliedCity : await getDatabaseHotelCity(destination)
    const configuredCity = databaseCity.cityId && databaseCity.countryId ? databaseCity : getConfiguredHotelCity(destination)
    const cityId = configuredCity.cityId || directoryItems.find((item) => item.cityId)?.cityId || ""
    const countryId = configuredCity.countryId || directoryItems.find((item) => item.countryId)?.countryId || ""

    if (cityId && countryId) {
      const searchResponse = asRecord(
        await dharmawisataJsonFetch({
          path: getPath("DHARMAWISATA_H2H_HOTEL_SEARCH_PATH", "/Hotel/Search5"),
          body: {
            paxPassport: "ID",
            countryID: countryId,
            cityID: cityId,
            checkInDate: `${search.checkin}T00:00:00`,
            checkOutDate: `${search.checkout}T00:00:00`,
            roomRequest: buildRoomRequest(search),
            userID: credentials.userId,
            accessToken,
          },
        }),
      )
      const availabilityItems = firstArray<DharmawisataHotelSearchRow>(searchResponse.hotels)
        .map((row) => normalizeSearchHotel(row, search, cityId, countryId))
        .filter((item): item is DharmawisataHotelCatalogItem => Boolean(item))

      if (availabilityItems.length > 0) {
        return {
          source: "dharmawisata",
          mode: "availability",
          status: "ready",
          message: "Availability hotel live dari Dharmawisata berhasil dibaca.",
          cityId,
          countryId,
          items: availabilityItems,
          raw: searchResponse,
        }
      }
    }

    if (directoryItems.length > 0) {
      return {
        source: "dharmawisata",
        mode: "directory",
        status: "ready",
        message: "Direktori hotel Dharmawisata berhasil dibaca. Availability akan dicek di langkah request.",
        cityId,
        countryId,
        items: directoryItems,
        raw: hotelListResponse,
      }
    }

    return {
      source: "dharmawisata",
      mode: "unavailable",
      status: "empty",
      message: "Dharmawisata belum mengembalikan hotel untuk destinasi ini.",
      cityId,
      countryId,
      items: [],
      raw: hotelListResponse,
    }
  } catch (error) {
    return {
      source: "fallback",
      mode: "unavailable",
      status: "error",
      message: error instanceof Error ? error.message : "Katalog hotel Dharmawisata belum bisa dibaca.",
      cityId: "",
      countryId: "",
      items: [],
    }
  }
}
