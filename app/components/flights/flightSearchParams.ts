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
