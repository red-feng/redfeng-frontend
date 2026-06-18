import { getDummyServiceCatalog, type DummyCatalogItem } from "@/lib/service-dummy-catalog"

export const HOTEL_DEFAULT_CHECKIN = "2026-06-24"
export const HOTEL_DEFAULT_CHECKOUT = "2026-06-27"

const HOTEL_STARTING_PRICE_BY_ID: Record<string, number> = {
  "hotel-bali-resort": 1248000,
  "hotel-jakarta-business": 930000,
  "hotel-singapore-city": 2360000,
  "hotel-tokyo-compact": 1680000,
}

export type HotelAvailabilitySearch = {
  destination: string
  checkin: string
  checkout: string
  adults: number
  children: number
  rooms: number
}

export function getHotelCatalogItems() {
  return getDummyServiceCatalog("hotel").items
}

export function getHotelCatalogItem(id: string) {
  return getHotelCatalogItems().find((item) => item.id === id) || null
}

export function getHotelFactValue(item: DummyCatalogItem, label: string) {
  return item.facts.find((fact) => fact.label.toLowerCase() === label.toLowerCase())?.value || ""
}

export function getHotelStartingPrice(item: DummyCatalogItem) {
  return HOTEL_STARTING_PRICE_BY_ID[item.id] || (item.region === "Asia" ? 1880000 : 980000)
}

export function getHotelStayNights(checkin: string, checkout: string) {
  const start = new Date(`${checkin}T00:00:00`)
  const end = new Date(`${checkout}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}

export function parsePositiveInteger(value: unknown, fallback: number, min = 0) {
  const parsed = Number(value || fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(Math.floor(parsed), min)
}

export function normalizeHotelSearchParams(params: Record<string, string | string[] | undefined>): HotelAvailabilitySearch {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] || "" : value || "")
  return {
    destination: first(params.destination) || first(params.q),
    checkin: first(params.checkin) || first(params.depart) || HOTEL_DEFAULT_CHECKIN,
    checkout: first(params.checkout) || first(params.return) || HOTEL_DEFAULT_CHECKOUT,
    adults: parsePositiveInteger(first(params.adults), 2, 1),
    children: parsePositiveInteger(first(params.children), 0, 0),
    rooms: parsePositiveInteger(first(params.rooms), 1, 1),
  }
}

export function buildHotelCatalogQuery(search: HotelAvailabilitySearch) {
  const params = new URLSearchParams()
  if (search.destination.trim()) params.set("destination", search.destination.trim())
  params.set("checkin", search.checkin || HOTEL_DEFAULT_CHECKIN)
  params.set("checkout", search.checkout || HOTEL_DEFAULT_CHECKOUT)
  params.set("adults", String(Math.max(search.adults, 1)))
  if (search.children > 0) params.set("children", String(search.children))
  params.set("rooms", String(Math.max(search.rooms, 1)))
  return params.toString()
}

export function buildHotelDetailHref(itemId: string, search: HotelAvailabilitySearch) {
  const query = buildHotelCatalogQuery(search)
  return query ? `/hotel/catalog/${itemId}?${query}` : `/hotel/catalog/${itemId}`
}

export function buildHotelEstimatedStayTotal(item: DummyCatalogItem, search: HotelAvailabilitySearch) {
  const nights = Math.max(1, getHotelStayNights(search.checkin, search.checkout) || 1)
  return {
    nights,
    pricePerNight: getHotelStartingPrice(item),
    totalAmount: getHotelStartingPrice(item) * nights * Math.max(search.rooms, 1),
  }
}
