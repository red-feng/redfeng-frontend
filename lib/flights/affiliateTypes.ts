import type { FlightTripType } from "@/lib/affiliate-suppliers"

export type AffiliateSalesModel = "affiliate"
export type AffiliateFlightCabinClass = "Economy" | "Premium Economy" | "Business" | "First Class"

export type AffiliateFlightPassengerMix = {
  adults: number
  children: number
  infants: number
}

export type AffiliateFlightSearchParams = {
  tripType: FlightTripType
  originCode: string
  destinationCode: string
  departDate: string
  returnDate?: string
  cabinClass?: AffiliateFlightCabinClass
  passengers: AffiliateFlightPassengerMix
  locale: string
}

export type AffiliateFlightSegment = {
  originCode: string
  destinationCode: string
  departureTime: string
  arrivalTime: string
  marketingAirline: string
  operatingAirline?: string
  flightNumber?: string
}

export type AffiliateFlightFarePolicy = {
  refundable: boolean
  reschedulable: boolean
  baggageSummary: string
}

export type AffiliateFlightSupplierMeta = {
  supplierKey?: string
  airlineId?: string
  airlineCode?: string
  flightNumber?: string
  journeyReference?: string
  fareReferenceId?: string
  airlineAccessCode?: string
  searchKey?: string
  detailSchedule?: string
}

export type AffiliateFlightPrice = {
  currency: string
  total: number
  display: string
}

export type AffiliateFlightOffer = {
  offerId: string
  providerKey: string
  salesModel: AffiliateSalesModel
  tripType: FlightTripType
  routeCode: string
  originCode: string
  destinationCode: string
  airlineName: string
  cabinClass: string
  segments: AffiliateFlightSegment[]
  departureTime: string
  arrivalTime: string
  durationLabel: string
  transitLabel: string
  availableDates: string[]
  maxPassengers: number
  price: AffiliateFlightPrice
  policy: AffiliateFlightFarePolicy
  highlights: string[]
  sourceItemId: string
  supplierMeta?: AffiliateFlightSupplierMeta
}

export type AffiliateFlightSearchResult = {
  providerKey: string
  salesModel: AffiliateSalesModel
  offers: AffiliateFlightOffer[]
}

export interface AffiliateFlightProvider {
  readonly providerKey: string
  readonly salesModel: AffiliateSalesModel
  searchFlights(params: AffiliateFlightSearchParams): Promise<AffiliateFlightSearchResult>
}
