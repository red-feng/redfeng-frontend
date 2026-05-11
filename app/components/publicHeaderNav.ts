import type { Locale } from "@/lib/i18n"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

type HeaderNavItem = {
  key: string
  href: string
  external?: boolean
}

export const publicHeaderTopNavItems: HeaderNavItem[] = [
  { key: "promo", href: "/promo" },
  { key: "orders", href: "/customer/bookings" },
  { key: "partnerTour", href: "https://redfeng.co/kemitraan_tour/", external: true },
  { key: "verifyInvoice", href: "/verifikasi-invoice" },
  { key: "help", href: "/contact" },
]

export const publicHeaderProductNavItems: HeaderNavItem[] = [
  { key: "flight", href: servicePageConfigByLabel["Pesawat"].href },
  { key: "hotel", href: servicePageConfigByLabel["Hotel"].href },
  { key: "train", href: servicePageConfigByLabel["Kereta"].href },
  { key: "busTravel", href: servicePageConfigByLabel["Bus"].href },
  { key: "seaShip", href: servicePageConfigByLabel["Kapal"].href },
  { key: "cruise", href: servicePageConfigByLabel["Kapal Pesiar"].href },
  { key: "activity", href: servicePageConfigByLabel["Aktivitas"].href },
  { key: "packageTour", href: "/packages" },
]

export function getPublicHeaderActivityLabel(locale: Locale) {
  if (locale === "en") return "Activities"
  if (locale === "zh") return "\u6d3b\u52a8"
  return "Aktivitas"
}
