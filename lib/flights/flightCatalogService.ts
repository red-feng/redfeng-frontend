import type { DummyCatalogItem } from "@/lib/service-dummy-catalog"
import type { FlightTripMode } from "@/app/components/flights/flightSearchParams"
import { dharmawisataAffiliateFlightProvider } from "@/lib/flights/dharmawisataAffiliateFlightProvider"
import { getFlightCardMeta, type FlightCatalogCardMeta } from "@/lib/flights/dummyFlightCatalog"
import type { AffiliateFlightOffer } from "@/lib/flights/affiliateTypes"

export type FlightCatalogBuildParams = {
  items: DummyCatalogItem[]
  locale: string
  trip: string
  rawFrom: string
  rawTo: string
  depart: string
  returnDate: string
  cabin: string
  sort: string
  airlines: string[]
  departWindows: string[]
  transitTypes: string[]
  priceBands: string[]
  isFlightTripMode: (value: string) => value is FlightTripMode
}

export type FlightCatalogResultItem = {
  item: DummyCatalogItem
  meta: FlightCatalogCardMeta
}

export type FlightCatalogDataSource = "live" | "fallback"

export type FlightCatalogBuildResult = {
  items: FlightCatalogResultItem[]
  source: FlightCatalogDataSource
}

function parseFlightPrice(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return Number(digits || "0")
}

function parseFlightTime(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part || "0"))
  return hour * 60 + minute
}

function matchFlightWindow(minutes: number, window: string) {
  if (!window) return true
  if (window === "morning") return minutes >= 0 && minutes < 720
  if (window === "afternoon") return minutes >= 720 && minutes < 1080
  if (window === "evening") return minutes >= 1080
  return true
}

function matchFlightPriceBand(price: number, band: string) {
  if (!band) return true
  if (band === "budget") return price < 1500000
  if (band === "mid") return price >= 1500000 && price < 3000000
  if (band === "premium") return price >= 3000000
  return true
}

function getItemRouteCode(item: DummyCatalogItem) {
  return (
    item.facts.find((fact) => fact.label.toLowerCase() === "route code")?.value ||
    item.location.replace(/\s+/g, "")
  )
}

function findAffiliateOfferForItem(
  item: DummyCatalogItem,
  offers: AffiliateFlightOffer[],
) {
  const itemRouteCode = getItemRouteCode(item).toUpperCase()

  return (
    offers.find((offer) => offer.sourceItemId === item.id) ||
    offers.find((offer) => offer.routeCode.toUpperCase() === itemRouteCode) ||
    offers.find(
      (offer) =>
        `${offer.originCode}-${offer.destinationCode}`.toUpperCase() === itemRouteCode,
    ) ||
    null
  )
}

function findTemplateItemForOffer(
  offer: AffiliateFlightOffer,
  items: DummyCatalogItem[],
) {
  return (
    items.find((item) => findAffiliateOfferForItem(item, [offer])) ||
    items.find((item) => {
      const itemRouteCode = getItemRouteCode(item).toUpperCase()
      return itemRouteCode.includes(offer.originCode.toUpperCase()) || itemRouteCode.includes(offer.destinationCode.toUpperCase())
    }) ||
    items[0] ||
    null
  )
}

function buildItemFromAffiliateOffer(
  offer: AffiliateFlightOffer,
  templateItem: DummyCatalogItem | null,
): DummyCatalogItem {
  const routeCode = `${offer.originCode}-${offer.destinationCode}`

  return {
    id: `live-${offer.offerId}`,
    title: templateItem?.title || `${offer.airlineName} ${routeCode}`,
    location: `${offer.originCode} - ${offer.destinationCode}`,
    region: templateItem?.region || "Live route",
    group: templateItem?.group || (offer.tripType === "round_trip" ? "Pulang pergi" : offer.tripType === "multi_city" ? "Multi kota" : "Sekali jalan"),
    image: templateItem?.image || "/home-assets/card-flight.png",
    availabilityNote: templateItem?.availabilityNote || "Data jadwal live dari supplier affiliate.",
    statusNote: templateItem?.statusNote || `Offer live ${offer.airlineName} untuk koridor ${routeCode}.`,
    highlights: templateItem?.highlights?.length ? templateItem.highlights : offer.highlights,
    facts: [
      { label: "Route code", value: routeCode },
      { label: "Cabin", value: offer.cabinClass },
      { label: "Flight", value: offer.segments.map((segment) => segment.flightNumber).filter(Boolean).join(", ") || offer.airlineName },
    ],
  }
}

function mapAffiliateOfferToFlightCardMeta(offer: AffiliateFlightOffer, item: DummyCatalogItem): FlightCatalogCardMeta {
  return {
    airline: offer.airlineName,
    departure: offer.departureTime,
    arrival: offer.arrivalTime,
    duration: offer.durationLabel,
    transit: offer.transitLabel,
    price: offer.price.display,
    seatNote: item.statusNote,
    origin: offer.originCode,
    destination: offer.destinationCode,
    routeCode: offer.routeCode,
    cabin: offer.cabinClass,
    tripLabel: item.group,
    highlightBadges: offer.highlights,
    maxPassengers: offer.maxPassengers,
    tripSupport:
      offer.tripType === "round_trip"
        ? ["one_way", "round_trip"]
        : offer.tripType === "multi_city"
          ? ["one_way", "multi_city"]
          : ["one_way"],
    availableDates: offer.availableDates,
  }
}

export async function buildFlightCatalogItems({
  items,
  locale,
  trip,
  rawFrom,
  rawTo,
  depart,
  returnDate,
  cabin,
  sort,
  airlines,
  departWindows,
  transitTypes,
  priceBands,
  isFlightTripMode,
}: FlightCatalogBuildParams): Promise<FlightCatalogBuildResult> {
  const affiliateFlightSearchResult = await dharmawisataAffiliateFlightProvider.searchFlights({
    tripType: isFlightTripMode(trip) ? trip : "round_trip",
    originCode: rawFrom.trim().split(/\s+/)[0] || "",
    destinationCode: rawTo.trim().split(/\s+/)[0] || "",
    departDate: depart,
    returnDate: trip === "round_trip" ? returnDate : undefined,
    cabinClass: cabin as "Economy" | "Premium Economy" | "Business" | "First Class",
    passengers: { adults: 1, children: 0, infants: 0 },
    locale,
  })

  const source: FlightCatalogDataSource =
    affiliateFlightSearchResult.providerKey === "dharmawisata-h2h" &&
    affiliateFlightSearchResult.offers.length > 0
      ? "live"
      : "fallback"

  const baseResults =
    affiliateFlightSearchResult.offers.length > 0
      ? affiliateFlightSearchResult.offers.map((offer) => {
          const templateItem = findTemplateItemForOffer(offer, items)
          const item = buildItemFromAffiliateOffer(offer, templateItem)

          return {
            item,
            meta: mapAffiliateOfferToFlightCardMeta(offer, item),
          }
        })
      : items.map((item, index) => ({
          item,
          meta: getFlightCardMeta(item, index, locale),
        }))

  const itemsResult = baseResults
    .filter(({ meta }) => {
      const departureMinutes = parseFlightTime(meta.departure)
      const priceValue = parseFlightPrice(meta.price)
      const isDirect = String(meta.transit).toLowerCase().includes("direct") || String(meta.transit).toLowerCase().includes("langsung") || String(meta.transit).includes("ç›´é£ž")
      const matchesAirline = airlines.length === 0 || airlines.includes(meta.airline)
      const matchesDepartWindow = departWindows.length === 0 || departWindows.some((window) => matchFlightWindow(departureMinutes, window))
      const matchesTransit = transitTypes.length === 0 || transitTypes.some((type) => (type === "direct" ? isDirect : !isDirect))
      const matchesPriceBand = priceBands.length === 0 || priceBands.some((band) => matchFlightPriceBand(priceValue, band))
      return matchesAirline && matchesDepartWindow && matchesTransit && matchesPriceBand
    })
    .sort((left, right) => {
      if (sort === "price") {
        return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price)
      }
      if (sort === "early") {
        return parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
      }
      return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price) || parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
    })

  return {
    items: itemsResult,
    source,
  }
}
