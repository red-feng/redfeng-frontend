import type { TransactionPromoContext } from "@/lib/transaction-promos"

export type FlightPromoContractRow = {
  airline_code?: string | null
  airline_name?: string | null
  origin_airport_code?: string | null
  destination_airport_code?: string | null
  departure_at?: string | null
  return_at?: string | null
  cabin_class?: string | null
  trip_type?: string | null
}

export type FlightBookingDetailsPromoRow = FlightPromoContractRow & {
  booking_id?: string | null
  flight_number?: string | null
}

export type FlightPromoCheckoutInput = {
  subtotalAmount: number
  productId?: string | null
  productReference?: string | null
  merchantId?: string | null
  paymentMethod?: string | null
  customerLocale?: string | null
  channel?: TransactionPromoContext["channel"]
  customerId?: string | null
  customerEmail?: string | null
  promoCode?: string | null
  flight: FlightPromoContractRow
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  return normalized || null
}

function normalizeAirportCode(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized ? normalized.toUpperCase() : null
}

function normalizeFlightTripType(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "round_trip" || normalized === "multi_city") return normalized
  return normalized === "one_way" ? "one_way" : null
}

function normalizeCabinClass(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "premium_economy" || normalized === "business" || normalized === "first") {
    return normalized
  }
  return normalized === "economy" ? "economy" : null
}

export function buildFlightTransactionPromoContext(input: FlightPromoCheckoutInput): TransactionPromoContext {
  return {
    subtotalAmount: Math.max(Number(input.subtotalAmount || 0), 0),
    currency: "IDR",
    productType: "flight",
    productId: normalizeText(input.productId),
    productReference: normalizeText(input.productReference),
    merchantId: normalizeText(input.merchantId),
    paymentMethod: normalizeText(input.paymentMethod),
    customerLocale: normalizeText(input.customerLocale),
    channel: input.channel || "public_web",
    customerId: normalizeText(input.customerId),
    customerEmail: normalizeText(input.customerEmail),
    promoCode: normalizeText(input.promoCode),
    flightOriginCode: normalizeAirportCode(input.flight.origin_airport_code),
    flightDestinationCode: normalizeAirportCode(input.flight.destination_airport_code),
    flightAirlineCode: normalizeAirportCode(input.flight.airline_code),
    flightCabinClass: normalizeCabinClass(input.flight.cabin_class),
    flightTripType: normalizeFlightTripType(input.flight.trip_type),
    flightDepartureAt: normalizeText(input.flight.departure_at),
    flightReturnAt: normalizeText(input.flight.return_at),
  }
}

export function summarizeFlightPromoContract(input: FlightPromoContractRow) {
  const route =
    normalizeAirportCode(input.origin_airport_code) || normalizeAirportCode(input.destination_airport_code)
      ? `${normalizeAirportCode(input.origin_airport_code) || "ANY"}-${normalizeAirportCode(input.destination_airport_code) || "ANY"}`
      : "ANY-ANY"

  return {
    route,
    airlineCode: normalizeAirportCode(input.airline_code),
    cabinClass: normalizeCabinClass(input.cabin_class),
    tripType: normalizeFlightTripType(input.trip_type),
    departureAt: normalizeText(input.departure_at),
    returnAt: normalizeText(input.return_at),
  }
}

export function mapFlightBookingDetailsToPromoContract(
  details: FlightBookingDetailsPromoRow | null | undefined,
): FlightPromoContractRow {
  if (!details) {
    return {}
  }

  return {
    airline_code: normalizeAirportCode(details.airline_code),
    airline_name: normalizeText(details.airline_name),
    origin_airport_code: normalizeAirportCode(details.origin_airport_code),
    destination_airport_code: normalizeAirportCode(details.destination_airport_code),
    departure_at: normalizeText(details.departure_at),
    return_at: normalizeText(details.return_at),
    cabin_class: normalizeCabinClass(details.cabin_class),
    trip_type: normalizeFlightTripType(details.trip_type) || (normalizeText(details.return_at) ? "round_trip" : "one_way"),
  }
}
