export type FlightTripMode = "round_trip" | "one_way" | "multi_city"

export type FlightBaseSearchState = {
  tripMode: FlightTripMode
  from: string
  via: string
  to: string
  depart: string
  returnDate: string
  passengers: string
  cabin: string
}

export function isFlightTripMode(value: string | undefined): value is FlightTripMode {
  return value === "round_trip" || value === "one_way" || value === "multi_city"
}

const FLIGHT_DEFAULT_TIMEZONE = "Asia/Jakarta"
const FLIGHT_LOCALE_TAGS = {
  id: "id-ID",
  en: "en-US",
  zh: "zh-CN",
} as const

type FlightDisplayLocale = keyof typeof FLIGHT_LOCALE_TAGS

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value || ""
}

function getJakartaTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FLIGHT_DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = getDatePart(parts, "year")
  const month = getDatePart(parts, "month")
  const day = getDatePart(parts, "day")
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10)
}

function addDaysToIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) return isoDate

  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function parseJakartaIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) return null

  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return Number.isNaN(date.getTime()) ? null : date
}

export function getDefaultFlightSearchDates() {
  const depart = getJakartaTodayIsoDate()
  return {
    depart,
    returnDate: addDaysToIsoDate(depart, 3),
  }
}

export function formatFlightDateDisplay(isoDate: string, locale: FlightDisplayLocale) {
  const date = parseJakartaIsoDate(isoDate)
  if (!date) return isoDate

  return new Intl.DateTimeFormat(FLIGHT_LOCALE_TAGS[locale], {
    timeZone: FLIGHT_DEFAULT_TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function formatFlightWeekdayDisplay(isoDate: string, locale: FlightDisplayLocale) {
  const date = parseJakartaIsoDate(isoDate)
  if (!date) return ""

  return new Intl.DateTimeFormat(FLIGHT_LOCALE_TAGS[locale], {
    timeZone: FLIGHT_DEFAULT_TIMEZONE,
    weekday: "long",
  }).format(date)
}

export function normalizeFlightLocationLabel(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  const airportCodeMatch = normalized.match(/^([A-Z]{3})\s+(.*)$/)
  if (airportCodeMatch) {
    const [, code, city] = airportCodeMatch
    return `${city.trim()} (${code})`
  }
  return normalized
}

export function buildFlightCatalogQuery(state: FlightBaseSearchState) {
  const params = new URLSearchParams()
  params.set("trip", state.tripMode)
  if (state.from.trim()) params.set("from", normalizeFlightLocationLabel(state.from))
  if (state.tripMode === "multi_city" && state.via.trim()) params.set("via", normalizeFlightLocationLabel(state.via))
  if (state.to.trim()) params.set("to", normalizeFlightLocationLabel(state.to))
  if (state.depart.trim()) params.set("depart", state.depart.trim())
  if (state.tripMode === "round_trip" && state.returnDate.trim()) params.set("return", state.returnDate.trim())
  if (state.passengers.trim()) params.set("passengers", state.passengers.trim())
  if (state.cabin.trim()) params.set("cabin", state.cabin.trim())
  return params
}

export function buildFlightCatalogHref(basePath: string, state: FlightBaseSearchState) {
  const query = buildFlightCatalogQuery(state).toString()
  return query ? `${basePath}?${query}` : basePath
}
