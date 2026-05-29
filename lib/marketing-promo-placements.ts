export const marketingPromoPlacements = [
  {
    key: "homepage_feed",
    label: "Homepage Feed",
    description: "Carousel promo umum di homepage web dan mobile. Cocok untuk campaign lintas produk atau awareness utama.",
  },
  {
    key: "packages_featured",
    label: "Packages Featured",
    description: "Blok promo utama di landing /packages. Isi dengan promo Paket Wisata, bukan campaign produk lain.",
  },
  {
    key: "flights_featured",
    label: "Flights Featured",
    description: "Blok promo utama di landing /pesawat. Isi hanya dengan promo pesawat atau campaign flight-ready.",
  },
  {
    key: "hotels_featured",
    label: "Hotels Featured",
    description: "Blok promo utama di landing /hotel. Isi hanya dengan promo hotel atau stay campaign.",
  },
  {
    key: "trains_featured",
    label: "Trains Featured",
    description: "Blok promo utama di landing /kereta. Isi hanya dengan promo kereta.",
  },
  {
    key: "buses_featured",
    label: "Buses Featured",
    description: "Blok promo utama di landing /bus. Isi hanya dengan promo bus dan travel darat.",
  },
  {
    key: "ships_featured",
    label: "Ships Featured",
    description: "Blok promo utama di landing /kapal. Isi hanya dengan promo kapal laut dan ferry.",
  },
  {
    key: "cruises_featured",
    label: "Cruises Featured",
    description: "Blok promo utama di landing /kapal-pesiar. Isi hanya dengan promo cruise.",
  },
  {
    key: "activities_featured",
    label: "Activities Featured",
    description: "Blok promo utama di landing /aktivitas. Isi hanya dengan promo aktivitas, atraksi, tur, atau event.",
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
