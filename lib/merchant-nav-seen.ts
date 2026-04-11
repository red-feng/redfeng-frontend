export const MERCHANT_NAV_SEEN_SECTIONS = ["packages", "orders", "calendar", "payout", "review"] as const

export type MerchantNavSeenSection = (typeof MERCHANT_NAV_SEEN_SECTIONS)[number]

export const MERCHANT_NAV_SECTION_TO_COLUMN: Record<MerchantNavSeenSection, string> = {
  packages: "seen_packages_at",
  orders: "seen_orders_at",
  calendar: "seen_calendar_at",
  payout: "seen_payout_at",
  review: "seen_review_at",
}

export const MERCHANT_NAV_ROUTE_SECTION_MAP: Array<{ prefix: string; section: MerchantNavSeenSection }> = [
  { prefix: "/merchant/paket", section: "packages" },
  { prefix: "/merchant/pesanan", section: "orders" },
  { prefix: "/merchant/kalender-booking", section: "calendar" },
  { prefix: "/merchant/saldo-payout", section: "payout" },
  { prefix: "/merchant/review", section: "review" },
]

export function isMerchantNavSeenSection(value: string): value is MerchantNavSeenSection {
  return MERCHANT_NAV_SEEN_SECTIONS.includes(value as MerchantNavSeenSection)
}
