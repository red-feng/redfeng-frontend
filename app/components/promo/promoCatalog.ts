import { promoCards } from "@/app/components/home/shared/homeContent"

function slugifyPromoTitle(title: string) {
  return title
    .replace(/\n/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function resolvePromoTarget(title: string) {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes("hotel")) return "/hotel"
  if (lowerTitle.includes("kereta")) return "/kereta"
  if (lowerTitle.includes("paket")) return "/packages"
  if (lowerTitle.includes("terbang") || lowerTitle.includes("flight")) return "/pesawat"
  return "/search"
}

export const promoCatalog = promoCards.map((card) => ({
  ...card,
  slug: slugifyPromoTitle(card.title),
  detailHref: `/promo/${slugifyPromoTitle(card.title)}`,
  targetHref: resolvePromoTarget(card.title),
  favoriteKey: `promo:${slugifyPromoTitle(card.title)}`,
}))

export function getPromoBySlug(slug: string) {
  return promoCatalog.find((item) => item.slug === slug) || null
}
