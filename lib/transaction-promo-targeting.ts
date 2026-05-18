import type { TransactionPromoRuleTargetRecord } from "@/lib/transaction-promos"

export type TransactionPromoTargetBadge = {
  key: string
  label: string
  tone: "slate" | "sky" | "amber" | "teal" | "cyan" | "emerald"
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim()
}

export function getTransactionPromoTargetBadges(
  target: Pick<
    TransactionPromoRuleTargetRecord,
    | "payment_method"
    | "origin_airport_code"
    | "destination_airport_code"
    | "airline_code"
    | "cabin_class"
    | "trip_type"
    | "hotel_city_code"
    | "hotel_country_code"
    | "hotel_star_rating"
    | "hotel_min_night_count"
    | "hotel_max_night_count"
    | "merchant_id"
    | "customer_locale"
    | "channel"
  > | null | undefined,
  options?: {
    includePaymentMethod?: boolean
    includeMerchant?: boolean
    includeLocale?: boolean
    includeChannel?: boolean
  },
): TransactionPromoTargetBadge[] {
  if (!target) {
    return []
  }

  const badges: TransactionPromoTargetBadge[] = []

  if (options?.includeChannel && normalizeText(target.channel)) {
    badges.push({
      key: "channel",
      label: normalizeText(target.channel),
      tone: "sky",
    })
  }

  if (options?.includePaymentMethod && normalizeText(target.payment_method)) {
    badges.push({
      key: "payment_method",
      label: `Bayar ${normalizeText(target.payment_method)}`,
      tone: "slate",
    })
  }

  if (normalizeText(target.origin_airport_code) || normalizeText(target.destination_airport_code)) {
    badges.push({
      key: "flight_route",
      label: `Route ${(normalizeText(target.origin_airport_code) || "ANY").toUpperCase()}-${(normalizeText(target.destination_airport_code) || "ANY").toUpperCase()}`,
      tone: "cyan",
    })
  }

  if (normalizeText(target.airline_code)) {
    badges.push({
      key: "flight_airline",
      label: `Airline ${normalizeText(target.airline_code)}`,
      tone: "cyan",
    })
  }

  if (normalizeText(target.cabin_class)) {
    badges.push({
      key: "flight_cabin",
      label: `Cabin ${normalizeText(target.cabin_class)}`,
      tone: "cyan",
    })
  }

  if (normalizeText(target.trip_type)) {
    badges.push({
      key: "flight_trip_type",
      label: `Trip ${normalizeText(target.trip_type)}`,
      tone: "cyan",
    })
  }

  if (normalizeText(target.hotel_city_code)) {
    badges.push({
      key: "hotel_city",
      label: `City ${normalizeText(target.hotel_city_code).toUpperCase()}`,
      tone: "emerald",
    })
  }

  if (normalizeText(target.hotel_country_code)) {
    badges.push({
      key: "hotel_country",
      label: `Country ${normalizeText(target.hotel_country_code).toUpperCase()}`,
      tone: "emerald",
    })
  }

  if (target.hotel_star_rating) {
    badges.push({
      key: "hotel_star_rating",
      label: `Star ${normalizeText(String(target.hotel_star_rating))}`,
      tone: "emerald",
    })
  }

  if (target.hotel_min_night_count || target.hotel_max_night_count) {
    badges.push({
      key: "hotel_night_count",
      label: `Night ${normalizeText(String(target.hotel_min_night_count || 1))}-${normalizeText(String(target.hotel_max_night_count || "ANY"))}`,
      tone: "emerald",
    })
  }

  if (options?.includeMerchant && normalizeText(String(target.merchant_id))) {
    const merchantId = normalizeText(String(target.merchant_id))
    badges.push({
      key: "merchant",
      label: `Merchant ${merchantId.slice(0, 8)}`,
      tone: "slate",
    })
  }

  if (options?.includeLocale && normalizeText(target.customer_locale)) {
    badges.push({
      key: "locale",
      label: `Locale ${normalizeText(target.customer_locale)}`,
      tone: "slate",
    })
  }

  return badges
}

export function getTransactionPromoTargetBadgeClass(tone: TransactionPromoTargetBadge["tone"]) {
  if (tone === "sky") return "bg-sky-50 text-sky-700"
  if (tone === "amber") return "bg-amber-50 text-amber-700"
  if (tone === "teal") return "bg-teal-50 text-teal-700"
  if (tone === "cyan") return "bg-cyan-50 text-cyan-700"
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700"
  return "bg-slate-100 text-slate-700"
}
