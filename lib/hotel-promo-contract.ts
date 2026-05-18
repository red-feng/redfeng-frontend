import type { TransactionPromoContext } from "@/lib/transaction-promos"

export type HotelPromoContractRow = {
  hotel_city_code?: string | null
  hotel_city_name?: string | null
  hotel_country_code?: string | null
  hotel_country_name?: string | null
  hotel_star_rating?: number | string | null
  checkin_at?: string | null
  checkout_at?: string | null
  night_count?: number | string | null
}

export type HotelBookingDetailsPromoRow = HotelPromoContractRow & {
  booking_id?: string | null
  hotel_id?: string | null
  supplier_reference?: string | null
}

export type HotelSearchResultPromoRow = {
  hotel_id?: string | null
  hotel_slug?: string | null
  supplier_id?: string | null
  supplier_reference?: string | null
  hotel_city_code?: string | null
  hotel_city_name?: string | null
  hotel_country_code?: string | null
  hotel_country_name?: string | null
  hotel_star_rating?: number | string | null
  checkin_at?: string | null
  checkout_at?: string | null
  night_count?: number | string | null
  subtotal_amount?: number | string | null
  payment_method?: string | null
  channel?: TransactionPromoContext["channel"] | null
}

export type HotelPromoCheckoutInput = {
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
  hotel: HotelPromoContractRow
}

export type HotelPromoContractStage = "rule_match" | "checkout_live"

export type HotelPromoMissingField =
  | "hotel_city_code"
  | "checkin_at"
  | "checkout_at"
  | "night_count"

export type HotelPromoContractReadiness = {
  stage: HotelPromoContractStage
  ready: boolean
  locationReady: boolean
  stayWindowReady: boolean
  nightCountReady: boolean
  starRatingReady: boolean
  missingFields: HotelPromoMissingField[]
}

export type HotelPromoSearchAdapterOutput = {
  contract: HotelPromoContractRow
  checkoutInput: HotelPromoCheckoutInput
  summary: ReturnType<typeof summarizeHotelPromoContract>
}

function normalizeText(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  return normalized || null
}

function normalizeCode(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized ? normalized.toUpperCase() : null
}

function normalizeStarRating(value: number | string | null | undefined) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const rounded = Math.round(numeric)
  return rounded >= 1 && rounded <= 5 ? rounded : null
}

function normalizeNightCount(value: number | string | null | undefined) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const rounded = Math.round(numeric)
  return rounded > 0 ? rounded : null
}

function inferNightCount(checkinAt: string | null | undefined, checkoutAt: string | null | undefined) {
  if (!checkinAt || !checkoutAt) return null
  const checkinTime = new Date(checkinAt).getTime()
  const checkoutTime = new Date(checkoutAt).getTime()
  if (Number.isNaN(checkinTime) || Number.isNaN(checkoutTime) || checkoutTime <= checkinTime) {
    return null
  }

  const diffDays = Math.round((checkoutTime - checkinTime) / 86400000)
  return diffDays > 0 ? diffDays : null
}

export function normalizeHotelPromoContractRow(input: HotelPromoContractRow | null | undefined): HotelPromoContractRow {
  const checkinAt = normalizeText(input?.checkin_at)
  const checkoutAt = normalizeText(input?.checkout_at)
  const inferredNightCount = inferNightCount(checkinAt, checkoutAt)

  return {
    hotel_city_code: normalizeCode(input?.hotel_city_code),
    hotel_city_name: normalizeText(input?.hotel_city_name),
    hotel_country_code: normalizeCode(input?.hotel_country_code),
    hotel_country_name: normalizeText(input?.hotel_country_name),
    hotel_star_rating: normalizeStarRating(input?.hotel_star_rating),
    checkin_at: checkinAt,
    checkout_at: checkoutAt,
    night_count: normalizeNightCount(input?.night_count) ?? inferredNightCount,
  }
}

export function getHotelPromoMissingFieldLabel(field: HotelPromoMissingField) {
  switch (field) {
    case "hotel_city_code":
      return "Destination city code"
    case "checkin_at":
      return "Check-in schedule"
    case "checkout_at":
      return "Check-out schedule"
    case "night_count":
      return "Night count"
    default:
      return field
  }
}

export function assessHotelPromoContractReadiness(
  input: HotelPromoContractRow | null | undefined,
  stage: HotelPromoContractStage = "rule_match",
): HotelPromoContractReadiness {
  const normalized = normalizeHotelPromoContractRow(input)
  const locationReady = Boolean(normalized.hotel_city_code)
  const stayWindowReady = Boolean(normalized.checkin_at && normalized.checkout_at)
  const nightCountReady = Boolean(normalized.night_count)
  const starRatingReady = Boolean(normalized.hotel_star_rating)

  const missingFields: HotelPromoMissingField[] = []

  if (!normalized.hotel_city_code) missingFields.push("hotel_city_code")
  if (!normalized.checkin_at) missingFields.push("checkin_at")
  if (!normalized.checkout_at) missingFields.push("checkout_at")

  if (stage === "checkout_live" && !normalized.night_count) {
    missingFields.push("night_count")
  }

  return {
    stage,
    ready: missingFields.length === 0,
    locationReady,
    stayWindowReady,
    nightCountReady,
    starRatingReady,
    missingFields,
  }
}

export function buildHotelTransactionPromoContext(input: HotelPromoCheckoutInput): TransactionPromoContext {
  const normalizedHotel = normalizeHotelPromoContractRow(input.hotel)

  return {
    subtotalAmount: Math.max(Number(input.subtotalAmount || 0), 0),
    currency: "IDR",
    productType: "hotel",
    productId: normalizeText(input.productId),
    productReference: normalizeText(input.productReference),
    merchantId: normalizeText(input.merchantId),
    paymentMethod: normalizeText(input.paymentMethod),
    customerLocale: normalizeText(input.customerLocale),
    channel: input.channel || "public_web",
    customerId: normalizeText(input.customerId),
    customerEmail: normalizeText(input.customerEmail),
    promoCode: normalizeText(input.promoCode),
    hotelCityCode: normalizedHotel.hotel_city_code || null,
    hotelCountryCode: normalizedHotel.hotel_country_code || null,
    hotelStarRating: Number(normalizedHotel.hotel_star_rating || 0) || null,
    hotelCheckinAt: normalizedHotel.checkin_at || null,
    hotelCheckoutAt: normalizedHotel.checkout_at || null,
    hotelNightCount: Number(normalizedHotel.night_count || 0) || null,
  }
}

export function summarizeHotelPromoContract(input: HotelPromoContractRow) {
  const normalized = normalizeHotelPromoContractRow(input)

  return {
    destination: normalized.hotel_city_code || normalized.hotel_country_code || "ANY",
    countryCode: normalized.hotel_country_code,
    starRating: normalized.hotel_star_rating,
    checkinAt: normalized.checkin_at,
    checkoutAt: normalized.checkout_at,
    nightCount: normalized.night_count,
    readiness: {
      ruleMatch: assessHotelPromoContractReadiness(normalized, "rule_match"),
      checkoutLive: assessHotelPromoContractReadiness(normalized, "checkout_live"),
    },
  }
}

export function mapHotelBookingDetailsToPromoContract(
  details: HotelBookingDetailsPromoRow | null | undefined,
): HotelPromoContractRow {
  if (!details) {
    return {}
  }

  return normalizeHotelPromoContractRow({
    hotel_city_code: details.hotel_city_code,
    hotel_city_name: details.hotel_city_name,
    hotel_country_code: details.hotel_country_code,
    hotel_country_name: details.hotel_country_name,
    hotel_star_rating: details.hotel_star_rating,
    checkin_at: details.checkin_at,
    checkout_at: details.checkout_at,
    night_count: details.night_count,
  })
}

export function mapHotelSearchResultToPromoContract(
  result: HotelSearchResultPromoRow | null | undefined,
): HotelPromoContractRow {
  if (!result) {
    return {}
  }

  return normalizeHotelPromoContractRow({
    hotel_city_code: result.hotel_city_code,
    hotel_city_name: result.hotel_city_name,
    hotel_country_code: result.hotel_country_code,
    hotel_country_name: result.hotel_country_name,
    hotel_star_rating: result.hotel_star_rating,
    checkin_at: result.checkin_at,
    checkout_at: result.checkout_at,
    night_count: result.night_count,
  })
}

/**
 * Primary adapter for future hotel catalog/search results.
 * Use this when a public hotel result card can build a checkout-ready
 * promo input without depending on a live hotel booking table first.
 */
export function buildHotelPromoCheckoutInputFromSearchResult(
  result: HotelSearchResultPromoRow,
  overrides?: Partial<Omit<HotelPromoCheckoutInput, "hotel" | "subtotalAmount">> & {
    subtotalAmount?: number
  },
): HotelPromoCheckoutInput {
  const contract = mapHotelSearchResultToPromoContract(result)

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
    productId: normalizeText(overrides?.productId ?? result.hotel_id),
    productReference: normalizeText(overrides?.productReference ?? result.hotel_slug ?? result.supplier_reference),
    merchantId: normalizeText(overrides?.merchantId ?? result.supplier_id),
    paymentMethod: normalizeText(overrides?.paymentMethod ?? result.payment_method),
    customerLocale: normalizeText(overrides?.customerLocale),
    channel: overrides?.channel || result.channel || "public_web",
    customerId: normalizeText(overrides?.customerId),
    customerEmail: normalizeText(overrides?.customerEmail),
    promoCode: normalizeText(overrides?.promoCode),
    hotel: contract,
  }
}

/**
 * End-to-end helper for result pages:
 * result row -> normalized contract -> checkout input -> readiness summary.
 */
export function adaptHotelSearchResultForPromo(
  result: HotelSearchResultPromoRow,
  overrides?: Partial<Omit<HotelPromoCheckoutInput, "hotel" | "subtotalAmount">> & {
    subtotalAmount?: number
  },
): HotelPromoSearchAdapterOutput {
  const contract = mapHotelSearchResultToPromoContract(result)
  const checkoutInput = buildHotelPromoCheckoutInputFromSearchResult(result, overrides)

  return {
    contract,
    checkoutInput,
    summary: summarizeHotelPromoContract(contract),
  }
}
