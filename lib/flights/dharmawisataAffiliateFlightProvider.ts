import type {
  AffiliateFlightOffer,
  AffiliateFlightProvider,
  AffiliateFlightSearchParams,
  AffiliateFlightSearchResult,
  AffiliateFlightSegment,
} from "@/lib/flights/affiliateTypes"
import { dummyAffiliateFlightProvider } from "@/lib/flights/dummyAffiliateFlightProvider"
import {
  dharmawisataLogin,
  dharmawisataJsonFetch,
  getDharmawisataAccessTokenOverride,
  getDharmawisataCredentials,
  getDharmawisataConfiguredPath,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(asString(value, String(fallback)).replace(/[^\d.-]/g, "")) || fallback
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asString(item)).filter(Boolean) : []
}

function formatTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(11, 16)
}

function buildDurationLabel(startValue: string, endValue: string) {
  const start = new Date(startValue)
  const end = new Date(endValue)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-"

  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}j ${minutes}m`
}

function mapSegment(segment: unknown, offer: UnknownRecord): AffiliateFlightSegment {
  const source = isRecord(segment) ? segment : {}
  const detailSource = Array.isArray(source.flightDetail) && source.flightDetail.length > 0 && isRecord(source.flightDetail[0])
    ? source.flightDetail[0]
    : {}

  return {
    originCode: asString(detailSource.fdOrigin ?? source.originCode ?? source.origin ?? offer.originCode),
    destinationCode: asString(detailSource.fdDestination ?? source.destinationCode ?? source.destination ?? offer.destinationCode),
    departureTime: formatTime(asString(detailSource.fdDepartTime ?? source.departureTime ?? source.departure ?? offer.departureTime)),
    arrivalTime: formatTime(asString(detailSource.fdArrivalTime ?? source.arrivalTime ?? source.arrival ?? offer.arrivalTime)),
    marketingAirline: asString(detailSource.airlineCode ?? source.marketingAirline ?? source.airlineName ?? offer.airlineName),
    operatingAirline: asString(source.operatingAirline),
    flightNumber: asString(detailSource.flightNumber ?? source.flightNumber),
  }
}

function buildHighlights(segment: UnknownRecord) {
  const availableDetail = Array.isArray(segment.availableDetail) && segment.availableDetail.length > 0 && isRecord(segment.availableDetail[0])
    ? segment.availableDetail[0]
    : {}
  const highlights = [
    asString(availableDetail.flightClass),
    asString(availableDetail.cabin),
    asString(availableDetail.availabityStatus),
  ].filter(Boolean)

  return highlights
}

function mapJourneyToOffer(
  journey: unknown,
  index: number,
  params: AffiliateFlightSearchParams,
): AffiliateFlightOffer | null {
  if (!isRecord(journey)) return null

  const originCode = asString(journey.jiOrigin, params.originCode)
  const destinationCode = asString(journey.jiDestination, params.destinationCode)
  const rawDepartureTime = asString(journey.jiDepartTime)
  const rawArrivalTime = asString(journey.jiArrivalTime, rawDepartureTime)
  const segmentsSource = Array.isArray(journey.segment) ? journey.segment : []
  const segments = segmentsSource.length > 0
    ? segmentsSource.map((segment) => mapSegment(segment, journey))
    : [
        {
          originCode,
          destinationCode,
          departureTime: formatTime(rawDepartureTime),
          arrivalTime: formatTime(rawArrivalTime),
          marketingAirline: asString(journey.airlineID, "Dharmawisata Partner"),
        },
      ]
  const primarySegment = Array.isArray(journey.segment) && journey.segment.length > 0 && isRecord(journey.segment[0])
    ? journey.segment[0]
    : {}
  const availableDetail = Array.isArray(primarySegment.availableDetail) && primarySegment.availableDetail.length > 0 && isRecord(primarySegment.availableDetail[0])
    ? primarySegment.availableDetail[0]
    : {}
  const totalPrice = asNumber(journey.sumPrice ?? availableDetail.price)
  const airlineName = asString(journey.airlineID || segments[0]?.marketingAirline, "Dharmawisata Partner")

  return {
    offerId: asString(journey.journeyReference, `dharmawisata-journey-${index + 1}`),
    providerKey: "dharmawisata-h2h",
    salesModel: "affiliate",
    tripType: params.tripType,
    routeCode: `${originCode}-${destinationCode}`,
    originCode,
    destinationCode,
    airlineName,
    cabinClass: asString(availableDetail.cabin || availableDetail.flightClass, params.cabinClass || "Economy"),
    segments,
    departureTime: formatTime(rawDepartureTime),
    arrivalTime: formatTime(rawArrivalTime),
    durationLabel: buildDurationLabel(rawDepartureTime, rawArrivalTime),
    transitLabel: segments.length > 1 ? asString(journey.category, "Transit") : "Direct",
    availableDates: [params.departDate],
    maxPassengers: Math.max(1, params.passengers.adults + params.passengers.children + params.passengers.infants),
    price: {
      currency: "IDR",
      total: totalPrice,
      display: `IDR ${new Intl.NumberFormat("id-ID").format(totalPrice)}`,
    },
    policy: {
      refundable: false,
      reschedulable: false,
      baggageSummary: "Follow supplier rules",
    },
    highlights: buildHighlights(primarySegment),
    sourceItemId: `${originCode}-${destinationCode}-${index + 1}`.toLowerCase(),
  }
}

function mapOffer(offer: unknown, index: number, params: AffiliateFlightSearchParams): AffiliateFlightOffer | null {
  if (!isRecord(offer)) return null

  const originCode = asString(offer.originCode ?? offer.origin, params.originCode)
  const destinationCode = asString(offer.destinationCode ?? offer.destination, params.destinationCode)
  const departureTime = asString(offer.departureTime ?? offer.departure, "00:00")
  const arrivalTime = asString(offer.arrivalTime ?? offer.arrival, departureTime)
  const airlineName = asString(offer.airlineName ?? offer.airline, "Dharmawisata Partner")
  const segmentsSource = Array.isArray(offer.segments) ? offer.segments : []
  const segments = segmentsSource.length > 0 ? segmentsSource.map((segment) => mapSegment(segment, offer)) : [{
    originCode,
    destinationCode,
    departureTime,
    arrivalTime,
    marketingAirline: airlineName,
  }]

  const totalPrice = asNumber(
    offer.totalPrice ??
      offer.priceTotal ??
      (isRecord(offer.price) ? offer.price.total ?? offer.price.amount : offer.price),
  )
  const currency = isRecord(offer.price) ? asString(offer.price.currency, "IDR") : asString(offer.currency, "IDR")
  const displayPrice =
    (isRecord(offer.price) && asString(offer.price.display)) ||
    asString(offer.displayPrice) ||
    `${currency} ${new Intl.NumberFormat("id-ID").format(totalPrice)}`

  return {
    offerId: asString(offer.offerId ?? offer.id, `dharmawisata-offer-${index + 1}`),
    providerKey: "dharmawisata-h2h",
    salesModel: "affiliate",
    tripType: params.tripType,
    routeCode: asString(offer.routeCode, `${originCode}-${destinationCode}`),
    originCode,
    destinationCode,
    airlineName,
    cabinClass: asString(offer.cabinClass ?? offer.cabin, params.cabinClass || "Economy"),
    segments,
    departureTime,
    arrivalTime,
    durationLabel: asString(offer.durationLabel ?? offer.duration, "-"),
    transitLabel: asString(offer.transitLabel ?? offer.transit, segments.length > 1 ? "Transit" : "Direct"),
    availableDates: asStringArray(offer.availableDates).length > 0 ? asStringArray(offer.availableDates) : [params.departDate],
    maxPassengers: asNumber(offer.maxPassengers, Math.max(1, params.passengers.adults + params.passengers.children + params.passengers.infants)),
    price: {
      currency,
      total: totalPrice,
      display: displayPrice,
    },
    policy: {
      refundable: Boolean(offer.refundable ?? (isRecord(offer.policy) ? offer.policy.refundable : false)),
      reschedulable: Boolean(offer.reschedulable ?? (isRecord(offer.policy) ? offer.policy.reschedulable : false)),
      baggageSummary: asString(
        offer.baggageSummary ?? (isRecord(offer.policy) ? offer.policy.baggageSummary : ""),
        "Baggage policy follows supplier rules",
      ),
    },
    highlights: asStringArray(offer.highlights),
    sourceItemId: asString(offer.sourceItemId, `${originCode}-${destinationCode}-${index + 1}`.toLowerCase()),
  }
}

function extractOffers(payload: unknown) {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []
  if (Array.isArray(payload.journeyDepart)) return payload.journeyDepart
  if (Array.isArray(payload.offers)) return payload.offers
  if (Array.isArray(payload.data)) return payload.data
  if (isRecord(payload.data) && Array.isArray(payload.data.offers)) return payload.data.offers
  if (Array.isArray(payload.results)) return payload.results
  return []
}

export class DharmawisataAffiliateFlightProvider implements AffiliateFlightProvider {
  readonly providerKey = "dharmawisata-h2h"
  readonly salesModel = "affiliate" as const

  private accessTokenCache: string | null = null

  private async resolveAccessToken() {
    const envToken = getDharmawisataAccessTokenOverride()
    if (envToken) return envToken
    if (this.accessTokenCache) return this.accessTokenCache

    const loginResponse = await dharmawisataLogin()
    if (String(loginResponse.status).toUpperCase() !== "SUCCESS" || !loginResponse.accessToken) {
      throw new Error(loginResponse.respMessage || "Dharmawisata login failed")
    }

    this.accessTokenCache = loginResponse.accessToken
    return this.accessTokenCache
  }

  async searchFlights(params: AffiliateFlightSearchParams): Promise<AffiliateFlightSearchResult> {
    const searchPath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_SEARCH_PATH")

    if (!isDharmawisataConfigured() || !searchPath) {
      return dummyAffiliateFlightProvider.searchFlights(params)
    }

    try {
      const credentials = getDharmawisataCredentials()
      const accessToken = await this.resolveAccessToken()
      const payload = await dharmawisataJsonFetch({
        path: searchPath,
        method: "POST",
        body: {
          tripType: params.tripType === "round_trip" ? "RoundTrip" : "OneWay",
          origin: params.originCode,
          destination: params.destinationCode,
          departDate: params.departDate,
          returnDate: params.tripType === "round_trip" ? params.returnDate : undefined,
          paxAdult: params.passengers.adults,
          paxChild: params.passengers.children,
          paxInfant: params.passengers.infants,
          cacheType: 2,
          isShowEachAirline: false,
          userID: credentials.userId,
          accessToken,
        },
      })
      const offers = extractOffers(payload)
        .map((offer, index) =>
          isRecord(offer) && ("jiOrigin" in offer || "journeyReference" in offer)
            ? mapJourneyToOffer(offer, index, params)
            : mapOffer(offer, index, params),
        )
        .filter((offer): offer is AffiliateFlightOffer => Boolean(offer))

      if (offers.length === 0) {
        return dummyAffiliateFlightProvider.searchFlights(params)
      }

      return {
        providerKey: this.providerKey,
        salesModel: this.salesModel,
        offers,
      }
    } catch {
      return dummyAffiliateFlightProvider.searchFlights(params)
    }
  }
}

export const dharmawisataAffiliateFlightProvider = new DharmawisataAffiliateFlightProvider()
