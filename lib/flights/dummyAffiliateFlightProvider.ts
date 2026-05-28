import { getDummyServiceCatalog } from "@/lib/service-dummy-catalog"
import type { DummyCatalogItem } from "@/lib/service-dummy-catalog"
import { getFlightCardMeta } from "@/lib/flights/dummyFlightCatalog"
import type {
  AffiliateFlightOffer,
  AffiliateFlightProvider,
  AffiliateFlightSearchParams,
  AffiliateFlightSearchResult,
} from "@/lib/flights/affiliateTypes"

function parseDisplayPrice(display: string) {
  return Number(display.replace(/[^\d]/g, "")) || 0
}

function mapDummyItemToAffiliateOffer(item: DummyCatalogItem, index: number, locale: string): AffiliateFlightOffer {
  const meta = getFlightCardMeta(item, index, locale)

  return {
    offerId: `dummy-affiliate-${item.id}`,
    providerKey: "dummy-affiliate",
    salesModel: "affiliate",
    tripType: meta.tripSupport.includes("round_trip") ? "round_trip" : meta.tripSupport.includes("multi_city") ? "multi_city" : "one_way",
    routeCode: meta.routeCode,
    originCode: meta.origin,
    destinationCode: meta.destination,
    airlineName: meta.airline,
    cabinClass: meta.cabin,
    segments: [
      {
        originCode: meta.origin,
        destinationCode: meta.destination,
        departureTime: meta.departure,
        arrivalTime: meta.arrival,
        marketingAirline: meta.airline,
      },
    ],
    departureTime: meta.departure,
    arrivalTime: meta.arrival,
    durationLabel: meta.duration,
    transitLabel: meta.transit,
    availableDates: meta.availableDates,
    maxPassengers: meta.maxPassengers,
    price: {
      currency: "IDR",
      total: parseDisplayPrice(meta.price),
      display: meta.price,
    },
    policy: {
      refundable: true,
      reschedulable: true,
      baggageSummary: "Cabin baggage",
    },
    highlights: meta.highlightBadges,
    sourceItemId: item.id,
  }
}

export class DummyAffiliateFlightProvider implements AffiliateFlightProvider {
  readonly providerKey = "dummy-affiliate"
  readonly salesModel = "affiliate" as const

  async searchFlights(params: AffiliateFlightSearchParams): Promise<AffiliateFlightSearchResult> {
    const catalog = getDummyServiceCatalog("pesawat")
    const normalizedOrigin = params.originCode.trim().toLowerCase()
    const normalizedDestination = params.destinationCode.trim().toLowerCase()

    const offers = catalog.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const location = item.location.replace(/\s+/g, "").toLowerCase()
        const matchesOrigin = !normalizedOrigin || location.includes(normalizedOrigin)
        const matchesDestination = !normalizedDestination || location.includes(normalizedDestination)
        return matchesOrigin && matchesDestination
      })
      .map(({ item, index }) => mapDummyItemToAffiliateOffer(item, index, params.locale))

    return {
      providerKey: this.providerKey,
      salesModel: this.salesModel,
      offers,
    }
  }
}

export const dummyAffiliateFlightProvider = new DummyAffiliateFlightProvider()
