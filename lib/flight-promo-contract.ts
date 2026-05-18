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

export type FlightSearchResultPromoRow = {
  flight_id?: string | null
  supplier_id?: string | null
  supplier_reference?: string | null
  airline_code?: string | null
  airline_name?: string | null
  origin_airport_code?: string | null
  origin_airport_name?: string | null
  destination_airport_code?: string | null
  destination_airport_name?: string | null
  departure_at?: string | null
  arrival_at?: string | null
  return_at?: string | null
  cabin_class?: string | null
  trip_type?: string | null
  fare_brand?: string | null
  subtotal_amount?: number | string | null
  payment_method?: string | null
  channel?: TransactionPromoContext["channel"] | null
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

export type FlightPromoContractStage = "rule_match" | "checkout_live"

export type FlightPromoMissingField =
  | "origin_airport_code"
  | "destination_airport_code"
  | "departure_at"
  | "trip_type"
  | "cabin_class"

export type FlightPromoContractReadiness = {
  stage: FlightPromoContractStage
  ready: boolean
  routeReady: boolean
  airlineReady: boolean
  scheduleReady: boolean
  returnReady: boolean
  cabinReady: boolean
  tripTypeReady: boolean
  missingFields: FlightPromoMissingField[]
}

export type FlightPromoSearchAdapterOutput = {
  contract: FlightPromoContractRow
  checkoutInput: FlightPromoCheckoutInput
  summary: ReturnType<typeof summarizeFlightPromoContract>
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

export function normalizeFlightPromoContractRow(input: FlightPromoContractRow | null | undefined): FlightPromoContractRow {
  return {
    airline_code: normalizeAirportCode(input?.airline_code),
    airline_name: normalizeText(input?.airline_name),
    origin_airport_code: normalizeAirportCode(input?.origin_airport_code),
    destination_airport_code: normalizeAirportCode(input?.destination_airport_code),
    departure_at: normalizeText(input?.departure_at),
    return_at: normalizeText(input?.return_at),
    cabin_class: normalizeCabinClass(input?.cabin_class),
    trip_type: normalizeFlightTripType(input?.trip_type),
  }
}

export function getFlightPromoMissingFieldLabel(field: FlightPromoMissingField) {
  switch (field) {
    case "origin_airport_code":
      return "Origin airport code"
    case "destination_airport_code":
      return "Destination airport code"
    case "departure_at":
      return "Departure schedule"
    case "trip_type":
      return "Trip type"
    case "cabin_class":
      return "Cabin class"
    default:
      return field
  }
}

export function assessFlightPromoContractReadiness(
  input: FlightPromoContractRow | null | undefined,
  stage: FlightPromoContractStage = "rule_match",
): FlightPromoContractReadiness {
  const normalized = normalizeFlightPromoContractRow(input)
  const routeReady = Boolean(normalized.origin_airport_code && normalized.destination_airport_code)
  const airlineReady = Boolean(normalized.airline_code)
  const scheduleReady = Boolean(normalized.departure_at)
  const returnReady =
    normalized.trip_type === "round_trip" || normalized.trip_type === "multi_city"
      ? Boolean(normalized.return_at)
      : true
  const cabinReady = Boolean(normalized.cabin_class)
  const tripTypeReady = Boolean(normalized.trip_type)

  const missingFields: FlightPromoMissingField[] = []

  if (!normalized.origin_airport_code) missingFields.push("origin_airport_code")
  if (!normalized.destination_airport_code) missingFields.push("destination_airport_code")
  if (!normalized.departure_at) missingFields.push("departure_at")

  if (stage === "checkout_live") {
    if (!normalized.trip_type) missingFields.push("trip_type")
    if (!normalized.cabin_class) missingFields.push("cabin_class")
  }

  return {
    stage,
    ready: missingFields.length === 0 && returnReady,
    routeReady,
    airlineReady,
    scheduleReady,
    returnReady,
    cabinReady,
    tripTypeReady,
    missingFields,
  }
}

export function buildFlightTransactionPromoContext(input: FlightPromoCheckoutInput): TransactionPromoContext {
  const normalizedFlight = normalizeFlightPromoContractRow(input.flight)

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
    flightOriginCode: normalizedFlight.origin_airport_code || null,
    flightDestinationCode: normalizedFlight.destination_airport_code || null,
    flightAirlineCode: normalizedFlight.airline_code || null,
    flightCabinClass: normalizedFlight.cabin_class || null,
    flightTripType: normalizedFlight.trip_type || null,
    flightDepartureAt: normalizedFlight.departure_at || null,
    flightReturnAt: normalizedFlight.return_at || null,
  }
}

export function summarizeFlightPromoContract(input: FlightPromoContractRow) {
  const normalized = normalizeFlightPromoContractRow(input)
  const route =
    normalized.origin_airport_code || normalized.destination_airport_code
      ? `${normalized.origin_airport_code || "ANY"}-${normalized.destination_airport_code || "ANY"}`
      : "ANY-ANY"

  return {
    route,
    airlineCode: normalized.airline_code,
    cabinClass: normalized.cabin_class,
    tripType: normalized.trip_type,
    departureAt: normalized.departure_at,
    returnAt: normalized.return_at,
    readiness: {
      ruleMatch: assessFlightPromoContractReadiness(normalized, "rule_match"),
      checkoutLive: assessFlightPromoContractReadiness(normalized, "checkout_live"),
    },
  }
}

export function mapFlightBookingDetailsToPromoContract(
  details: FlightBookingDetailsPromoRow | null | undefined,
): FlightPromoContractRow {
  if (!details) {
    return {}
  }

  return normalizeFlightPromoContractRow({
    airline_code: details.airline_code,
    airline_name: details.airline_name,
    origin_airport_code: details.origin_airport_code,
    destination_airport_code: details.destination_airport_code,
    departure_at: details.departure_at,
    return_at: details.return_at,
    cabin_class: details.cabin_class,
    trip_type: normalizeFlightTripType(details.trip_type) || (normalizeText(details.return_at) ? "round_trip" : "one_way"),
  })
}

export function mapFlightSearchResultToPromoContract(
  result: FlightSearchResultPromoRow | null | undefined,
): FlightPromoContractRow {
  if (!result) {
    return {}
  }

  return normalizeFlightPromoContractRow({
    airline_code: result.airline_code,
    airline_name: result.airline_name,
    origin_airport_code: result.origin_airport_code,
    destination_airport_code: result.destination_airport_code,
    departure_at: result.departure_at,
    return_at: result.return_at,
    cabin_class: result.cabin_class,
    trip_type: normalizeFlightTripType(result.trip_type) || (normalizeText(result.return_at) ? "round_trip" : "one_way"),
  })
}

/**
 * Primary adapter for future flight catalog/search results.
 * Use this when a public flight result card has enough data to build
 * a checkout-ready promo input without depending on admin booking tables.
 */
export function buildFlightPromoCheckoutInputFromSearchResult(
  result: FlightSearchResultPromoRow,
  overrides?: Partial<Omit<FlightPromoCheckoutInput, "flight" | "subtotalAmount">> & {
    subtotalAmount?: number
  },
): FlightPromoCheckoutInput {
  const contract = mapFlightSearchResultToPromoContract(result)

  return {
    subtotalAmount: Math.max(
      Number(
        overrides?.subtotalAmount ??
          (typeof result.subtotal_amount === "number"
            ? result.subtotal_amount
            : Number(result.subtotal_amount || 0)),
      ),
      0,
    ),
    productId: normalizeText(overrides?.productId ?? result.flight_id),
    productReference: normalizeText(overrides?.productReference ?? result.supplier_reference),
    merchantId: normalizeText(overrides?.merchantId ?? result.supplier_id),
    paymentMethod: normalizeText(overrides?.paymentMethod ?? result.payment_method),
    customerLocale: normalizeText(overrides?.customerLocale),
    channel: overrides?.channel || result.channel || "public_web",
    customerId: normalizeText(overrides?.customerId),
    customerEmail: normalizeText(overrides?.customerEmail),
    promoCode: normalizeText(overrides?.promoCode),
    flight: contract,
  }
}

/**
 * End-to-end helper for result pages:
 * result row -> normalized contract -> checkout input -> readiness summary.
 */
export function adaptFlightSearchResultForPromo(
  result: FlightSearchResultPromoRow,
  overrides?: Partial<Omit<FlightPromoCheckoutInput, "flight" | "subtotalAmount">> & {
    subtotalAmount?: number
  },
): FlightPromoSearchAdapterOutput {
  const contract = mapFlightSearchResultToPromoContract(result)
  const checkoutInput = buildFlightPromoCheckoutInputFromSearchResult(result, overrides)

  return {
    contract,
    checkoutInput,
    summary: summarizeFlightPromoContract(contract),
  }
}
