import { getDummyServiceCatalog } from "@/lib/service-dummy-catalog"
import type { DummyCatalogItem } from "@/lib/service-dummy-catalog"
import { getFlightCardMeta } from "@/lib/flights/dummyFlightCatalog"
import type {
  AffiliateFlightOffer,
  AffiliateFlightProvider,
  AffiliateFlightSearchParams,
  AffiliateFlightSearchResult,
} from "@/lib/flights/affiliateTypes"
import {
  calculateFlightFareForCustomer,
  defaultFinanceSettings,
  getFinanceSettings,
  type FinanceSettings,
} from "@/lib/finance/settings"
import { createAdminClient } from "@/lib/supabase/admin"

function parseDisplayPrice(display: string) {
  return Number(display.replace(/[^\d]/g, "")) || 0
}

async function resolveFinanceSettingsForFallbackPricing() {
  try {
    return await getFinanceSettings(
      createAdminClient() as unknown as Parameters<typeof getFinanceSettings>[0],
    )
  } catch {
    return defaultFinanceSettings
  }
}

function formatIdr(value: number) {
  return `IDR ${new Intl.NumberFormat("id-ID").format(value)}`
}

function mapDummyItemToAffiliateOffer(
  item: DummyCatalogItem,
  index: number,
  locale: string,
  financeSettings: FinanceSettings,
): AffiliateFlightOffer {
  const meta = getFlightCardMeta(item, index, locale)
  const flightPricing = calculateFlightFareForCustomer(parseDisplayPrice(meta.price), financeSettings)

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
      total: flightPricing.customerFareAmount,
      display: formatIdr(flightPricing.customerFareAmount),
    },
    policy: {
      refundable: true,
      reschedulable: true,
      baggageSummary: "Cabin baggage",
    },
    highlights: meta.highlightBadges,
    sourceItemId: item.id,
    supplierMeta: {
      supplierKey: "fallback",
      airlineId: "",
      airlineCode: "",
      flightNumber: "",
      journeyReference: "",
      fareReferenceId: "",
      airlineAccessCode: "",
      searchKey: "",
      detailSchedule: "",
      supplierFareAmount: flightPricing.supplierFareAmount,
      redfengMarkupAmount: flightPricing.markupAmount,
      customerFareAmount: flightPricing.customerFareAmount,
    },
  }
}

function buildRequestedRouteFallbackOffer(
  params: AffiliateFlightSearchParams,
  financeSettings: FinanceSettings,
): AffiliateFlightOffer | null {
  const originCode = params.originCode.trim().toUpperCase()
  const destinationCode = params.destinationCode.trim().toUpperCase()
  if (!originCode || !destinationCode) return null

  const passengerCount = Math.max(1, params.passengers.adults + params.passengers.children + params.passengers.infants)
  const routeCode = `${originCode}-${destinationCode}`
  const supplierEstimateAmount = Math.max(850000, 980000 + passengerCount * 125000)
  const flightPricing = calculateFlightFareForCustomer(supplierEstimateAmount, financeSettings)

  return {
    offerId: `fallback-${routeCode.toLowerCase()}-${params.departDate}`,
    providerKey: "dummy-affiliate",
    salesModel: "affiliate",
    tripType: params.tripType,
    routeCode,
    originCode,
    destinationCode,
    airlineName: "Mitra Maskapai",
    cabinClass: params.cabinClass || "Economy",
    segments: [
      {
        originCode,
        destinationCode,
        departureTime: "09:00",
        arrivalTime: "11:00",
        marketingAirline: "Mitra Maskapai",
      },
    ],
    departureTime: "09:00",
    arrivalTime: "11:00",
    durationLabel: "2j 0m",
    transitLabel: "Direct",
    availableDates: [params.departDate, params.returnDate].filter(Boolean) as string[],
    maxPassengers: passengerCount,
    price: {
      currency: "IDR",
      total: flightPricing.customerFareAmount,
      display: formatIdr(flightPricing.customerFareAmount),
    },
    policy: {
      refundable: true,
      reschedulable: true,
      baggageSummary: "Mengikuti ketentuan maskapai",
    },
    highlights: ["Fallback estimate", "Route requested"],
    sourceItemId: `fallback-${routeCode.toLowerCase()}`,
    supplierMeta: {
      supplierKey: "fallback",
      airlineId: "",
      airlineCode: "",
      flightNumber: "",
      journeyReference: "",
      fareReferenceId: "",
      airlineAccessCode: "",
      searchKey: "",
      detailSchedule: "",
      supplierFareAmount: flightPricing.supplierFareAmount,
      redfengMarkupAmount: flightPricing.markupAmount,
      customerFareAmount: flightPricing.customerFareAmount,
    },
  }
}

export class DummyAffiliateFlightProvider implements AffiliateFlightProvider {
  readonly providerKey = "dummy-affiliate"
  readonly salesModel = "affiliate" as const

  async searchFlights(params: AffiliateFlightSearchParams): Promise<AffiliateFlightSearchResult> {
    const catalog = getDummyServiceCatalog("pesawat")
    const normalizedOrigin = params.originCode.trim().toLowerCase()
    const normalizedDestination = params.destinationCode.trim().toLowerCase()
    const financeSettings = await resolveFinanceSettingsForFallbackPricing()

    const offers = catalog.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const location = item.location.replace(/\s+/g, "").toLowerCase()
        const matchesOrigin = !normalizedOrigin || location.includes(normalizedOrigin)
        const matchesDestination = !normalizedDestination || location.includes(normalizedDestination)
        return matchesOrigin && matchesDestination
      })
      .map(({ item, index }) => mapDummyItemToAffiliateOffer(item, index, params.locale, financeSettings))
    const fallbackOffer = offers.length === 0 ? buildRequestedRouteFallbackOffer(params, financeSettings) : null

    return {
      providerKey: this.providerKey,
      salesModel: this.salesModel,
      offers: fallbackOffer ? [fallbackOffer] : offers,
    }
  }
}

export const dummyAffiliateFlightProvider = new DummyAffiliateFlightProvider()
