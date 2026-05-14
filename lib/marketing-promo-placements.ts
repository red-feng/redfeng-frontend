export const marketingPromoPlacements = [
  {
    key: "homepage_feed",
    label: "Homepage Feed",
    description: "Carousel promo di homepage web dan mobile.",
  },
  {
    key: "packages_featured",
    label: "Packages Featured",
    description: "Blok promo utama di landing /packages.",
  },
  {
    key: "promo_listing",
    label: "Promo Listing",
    description: "Halaman /promo yang menampilkan semua campaign publik.",
  },
  {
    key: "wishlist_suggestions",
    label: "Wishlist Suggestions",
    description: "Saran promo di halaman wishlist/favorite.",
  },
] as const

export type MarketingPromoPlacementKey = (typeof marketingPromoPlacements)[number]["key"]

export const marketingPromoPlacementKeys = marketingPromoPlacements.map((placement) => placement.key)

export function isMarketingPromoPlacementKey(value: string): value is MarketingPromoPlacementKey {
  return marketingPromoPlacementKeys.includes(value as MarketingPromoPlacementKey)
}

export function getMarketingPromoPlacementLabel(value: string) {
  return marketingPromoPlacements.find((placement) => placement.key === value)?.label || value
}
