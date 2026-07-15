import type { ReactNode } from "react"
import type { Locale } from "@/lib/i18n"

export type ServiceAvailability = "live_booking" | "landing_foundation"

export type ServicePageConfig = {
  slug: string
  label: string
  shortLabel: string
  href: string
  catalogHref: string
  eyebrow: string
  title: string
  body: string
  highlights: string[]
  primaryCta: {
    label: string
    href: string
  }
  secondaryCta: {
    label: string
    href: string
  }
  availability: ServiceAvailability
  status: string
  accent: string
  cardTone: string
  icon: ReactNode
}

export const servicePageConfigs: ServicePageConfig[] = [
  {
    slug: "pesawat",
    label: "Pesawat",
    shortLabel: "Pesawat",
    href: "/pesawat",
    catalogHref: "/pesawat/catalog",
    eyebrow: "Flight Booking",
    title: "Cari tiket pesawat favorit Anda dalam satu landing page yang konsisten di app dan website.",
    body: "Halaman Pesawat sudah terhubung ke katalog live untuk pencarian rute, checkout, dan gate pembayaran yang dibuka setelah fare serta kursi divalidasi.",
    highlights: ["Rute domestik live", "Harga tiket sudah termasuk pajak", "Pembayaran dibuka setelah validasi"],
    primaryCta: { label: "Buka katalog pesawat", href: "/pesawat/catalog" },
    secondaryCta: { label: "Lihat promo pesawat", href: "/promo" },
    availability: "live_booking",
    status: "Katalog pesawat live aktif. Pembayaran dibuka setelah harga dan kursi divalidasi.",
    accent: "from-sky-500 via-cyan-400 to-blue-600",
    cardTone: "border-sky-100 bg-sky-50/70 text-sky-900",
    icon: <PlaneServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "hotel",
    label: "Hotel",
    shortLabel: "Hotel",
    href: "/hotel",
    catalogHref: "/hotel/catalog",
    eyebrow: "Hotel Booking",
    title: "Temukan landing page hotel yang rapi untuk app dan website, sebelum sistem booking hotel live siap penuh.",
    body: "Halaman ini menjadi tujuan resmi untuk semua menu Hotel. Layout dan data pengantar sudah konsisten, lalu nantinya bisa diisi inventory hotel, filter kota, dan harga real-time.",
    highlights: ["Properti pilihan di destinasi favorit", "Bisa ditingkatkan ke availability live", "Satu route yang dipakai app dan website"],
    primaryCta: { label: "Buka katalog hotel", href: "/hotel/catalog" },
    secondaryCta: { label: "Lihat promo hotel", href: "/promo" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, inventory hotel live menyusul.",
    accent: "from-indigo-500 via-blue-500 to-sky-500",
    cardTone: "border-indigo-100 bg-indigo-50/70 text-indigo-900",
    icon: <HotelServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "kereta",
    label: "Kereta",
    shortLabel: "Kereta",
    href: "/kereta",
    catalogHref: "/kereta/catalog",
    eyebrow: "Train Booking",
    title: "Halaman Kereta sekarang punya tujuan lokal sendiri agar pengalaman app dan web tetap satu kesatuan.",
    body: "Landing page ini menyiapkan ruang untuk jadwal, rute, dan promo kereta. Untuk tahap sekarang, halaman ini fokus memberi arah yang jelas sambil menunggu integrasi data real-time.",
    highlights: ["Rute antarkota populer", "Cocok untuk promo WHOOSH dan reguler", "Siap diperluas ke jadwal langsung"],
    primaryCta: { label: "Buka katalog kereta", href: "/kereta/catalog" },
    secondaryCta: { label: "Lihat promo kereta", href: "/promo" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, jadwal live dan seat availability menyusul.",
    accent: "from-violet-500 via-indigo-500 to-blue-500",
    cardTone: "border-violet-100 bg-violet-50/70 text-violet-900",
    icon: <TrainServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "bus",
    label: "Bus",
    shortLabel: "Bus",
    href: "/bus",
    catalogHref: "/bus/catalog",
    eyebrow: "Bus Travel",
    title: "Layanan Bus sekarang punya landing page lokal yang sama-sama bisa dipakai dari homepage app maupun website.",
    body: "Ini menjadi fondasi untuk operator bus, jadwal keberangkatan, dan promo lintas kota. Tahap ini dibuat ringan dulu supaya user tidak menemukan tombol yang buntu.",
    highlights: ["Bus antar kota & travel pilihan", "Template siap untuk jadwal dan operator", "CTA sudah terhubung ke alur internal"],
    primaryCta: { label: "Buka katalog bus", href: "/bus/catalog" },
    secondaryCta: { label: "Butuh bantuan?", href: "/bantuan" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, data operator live menyusul.",
    accent: "from-emerald-500 via-green-500 to-lime-500",
    cardTone: "border-emerald-100 bg-emerald-50/70 text-emerald-900",
    icon: <BusServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "kapal",
    label: "Kapal",
    shortLabel: "Kapal",
    href: "/kapal",
    catalogHref: "/kapal/catalog",
    eyebrow: "Sea Ship",
    title: "Route Kapal sudah kami siapkan agar pengalaman antar layanan terasa lengkap, walau backend kapal belum diaktifkan penuh.",
    body: "Halaman ini menjadi tempat yang pas untuk menampung pelayaran reguler, jadwal pelabuhan, dan promo kapal resmi. Untuk sekarang, tujuannya adalah memberi tujuan lokal yang rapi.",
    highlights: ["Tiket kapal laut resmi", "Siap untuk jadwal dan pelabuhan utama", "Route tunggal untuk app dan website"],
    primaryCta: { label: "Buka katalog kapal", href: "/kapal/catalog" },
    secondaryCta: { label: "Butuh bantuan?", href: "/bantuan" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, jadwal pelayaran live menyusul.",
    accent: "from-blue-600 via-sky-500 to-cyan-400",
    cardTone: "border-blue-100 bg-blue-50/70 text-blue-900",
    icon: <ShipServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "kapal-pesiar",
    label: "Kapal Pesiar",
    shortLabel: "Kapal Pesiar",
    href: "/kapal-pesiar",
    catalogHref: "/kapal-pesiar/catalog",
    eyebrow: "Cruise Journey",
    title: "Kapal Pesiar sekarang punya landing page premium sendiri, tetap satu sumber tujuan untuk app dan website.",
    body: "Halaman ini cocok untuk itinerary cruise, cabin highlights, dan promo musim tertentu. Di tahap awal, kita pakai sebagai landing page presentasi sambil menunggu backend cruise.",
    highlights: ["Itinerary premium & seasonal offer", "Bisa ditingkatkan ke detail cabin dan deck", "Tetap sinkron antara app dan website"],
    primaryCta: { label: "Buka katalog cruise", href: "/kapal-pesiar/catalog" },
    secondaryCta: { label: "Konsultasi perjalanan", href: "/bantuan" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, katalog cruise detail menyusul.",
    accent: "from-pink-500 via-rose-500 to-fuchsia-500",
    cardTone: "border-pink-100 bg-pink-50/70 text-pink-900",
    icon: <CruiseServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "aktivitas",
    label: "Aktivitas",
    shortLabel: "Aktivitas",
    href: "/aktivitas",
    catalogHref: "/aktivitas/catalog",
    eyebrow: "Activities",
    title: "Aktivitas sekarang mengarah ke landing page internal supaya user bisa lanjut eksplor tanpa keluar dari ekosistem RedFeng.",
    body: "Halaman ini disiapkan untuk tiket atraksi, tur pendek, dan aktivitas lokal. Untuk tahap sekarang, kita pakai data pengantar dan CTA yang menyatu dengan promo serta pencarian.",
    highlights: ["Atraksi dan tiket wisata lokal", "Cocok untuk expand ke voucher instan", "Satu tujuan yang sama untuk web dan app"],
    primaryCta: { label: "Buka katalog aktivitas", href: "/aktivitas/catalog" },
    secondaryCta: { label: "Lihat promo aktivitas", href: "/promo" },
    availability: "landing_foundation",
    status: "Landing marketing dan katalog dummy aktif, katalog aktivitas live menyusul.",
    accent: "from-orange-500 via-amber-500 to-yellow-400",
    cardTone: "border-orange-100 bg-orange-50/70 text-orange-900",
    icon: <ActivityServiceIcon className="h-7 w-7" />,
  },
  {
    slug: "packages",
    label: "Paket Wisata",
    shortLabel: "Paket Wisata",
    href: "/packages",
    catalogHref: "/packages/catalog",
    eyebrow: "Package Tours",
    title: "Paket Wisata sekarang punya landing marketing sendiri, sementara katalog lengkap tetap dipisahkan untuk compare dan filter.",
    body: "Route ini sekarang menjadi pintu discovery utama untuk Paket Wisata. User bisa masuk lewat landing marketing lebih dulu, lalu pindah ke katalog penuh saat sudah siap membandingkan paket secara detail.",
    highlights: ["Landing marketing aktif", "Katalog penuh tetap tersedia", "Detail paket dan checkout tetap memakai data live yang sama"],
    primaryCta: { label: "Buka landing paket", href: "/packages" },
    secondaryCta: { label: "Masuk ke katalog penuh", href: "/packages/catalog" },
    availability: "live_booking",
    status: "Landing marketing dan katalog live sama-sama aktif.",
    accent: "from-rose-500 via-orange-500 to-amber-400",
    cardTone: "border-rose-100 bg-rose-50/70 text-rose-900",
    icon: <PackageServiceIcon className="h-7 w-7" />,
  },
]

export const servicePageConfigByLabel = Object.fromEntries(
  servicePageConfigs.map((item) => [item.label, item]),
) as Record<string, ServicePageConfig>

export const servicePageConfigBySlug = Object.fromEntries(
  servicePageConfigs.map((item) => [item.slug, item]),
) as Record<string, ServicePageConfig>

export const lightweightServicePageConfigs = servicePageConfigs.filter((item) => item.slug !== "packages")

export function getServiceAvailabilityLabel(availability: ServiceAvailability, locale: Locale) {
  if (availability === "live_booking") {
    if (locale === "en") return "Live booking"
    if (locale === "zh") return "可直接预订"
    return "Live booking"
  }

  if (locale === "en") return "Landing / foundation"
  if (locale === "zh") return "展示页 / 基础阶段"
  return "Landing / foundation"
}

export function getServiceAvailabilityTone(availability: ServiceAvailability) {
  return availability === "live_booking"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200"
}

function PlaneServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M3 13.5l7-1.7 6.8-7.2 2.2 2.2-5.6 8 4.6 3.1-1.8 1.8-5.8-2-2.2 2.7H5.6l1.9-4.6-4.5-2.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}

function HotelServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3 20h18M8 9h2M8 12h2M8 15h2M13 9h2M13 12h2M13 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function TrainServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="6" y="4" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M8 18h8M9 9h2M13 9h2M8 13h8M9 18l-2 2M15 18l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function BusServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M7 4h10a2 2 0 0 1 2 2v7.5A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h8M7.5 17 7 20M17 20l-.5-3M8.5 13h.01M15.5 13h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function ShipServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 16h16l-2 3H6l-2-3Zm5-8h6l1 8H8l1-8Zm1-3h4v3h-4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}

function CruiseServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 16h16l-1.8 2.7H5.8L4 16Zm4.5-7.5h7L17 16H7l1.5-7.5Zm1.2-2.8h4.6v2.8H9.7V5.7Zm-3.7 14.6c.8.9 1.8 1.4 3 1.4 1 0 1.8-.3 2.6-.9.8.6 1.7.9 2.6.9 1.2 0 2.2-.5 3-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ActivityServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v2a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 16.5 18h-9A2.5 2.5 0 0 1 5 15.5v-1a2 2 0 1 0 0-4v-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.6 2.6" /></svg>
}

function PackageServiceIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 20v-6M12 14c0-4 1.7-7 5-9M12 14c0-4-1.7-7-5-9M12 11c2.8 0 5-1.4 6.5-4M12 11c-2.8 0-5-1.4-6.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M9.5 20h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
