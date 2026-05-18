import type { ComponentType } from "react"

export type IconProps = {
  className?: string
}

export type CardIcon = ComponentType<IconProps>
export type HeroTabKey = "flight" | "hotel" | "train" | "bus" | "ship" | "cruise" | "activity" | "package"
export type HeroBenefitItem = {
  title: string
  icon: CardIcon
}

export type PaymentLogo = {
  label: string
  src?: string
  width?: number
  height?: number
  mobileRenderWidth?: number
  desktopRenderWidth?: number
  mobileScale?: number
  desktopScale?: number
  mobileBoxWidth?: number
  desktopBoxWidth?: number
}

export type HomeArticleCard = {
  title: string
  category: string
  readTime: string
  image: string
  href: string
}

export const heroTabs = [
  { key: "flight" as const, label: "Pesawat", badge: false, icon: PlaneIcon },
  { key: "hotel" as const, label: "Hotel", badge: false, icon: BuildingIcon },
  { key: "train" as const, label: "Kereta", badge: false, icon: TrainIcon },
  { key: "bus" as const, label: "Bus", badge: false, icon: BusIcon },
  { key: "ship" as const, label: "Kapal", badge: false, icon: ShipIcon },
  { key: "cruise" as const, label: "Kapal Pesiar", badge: true, icon: CruiseIcon },
  { key: "activity" as const, label: "Aktivitas", badge: false, icon: SparklesIcon },
  { key: "package" as const, label: "Paket Wisata", badge: true, icon: PalmIcon },
]

export const serviceCards: { label: string; desc: string; icon: CardIcon; tone: string }[] = [
  { label: "Pesawat", desc: "Tiket pesawat murah", icon: PlaneIcon, tone: "text-[#ff765d]" },
  { label: "Hotel", desc: "Hotel terbaik di dunia", icon: BuildingIcon, tone: "text-[#5b8dff]" },
  { label: "Kereta", desc: "Kereta cepat & reguler", icon: TrainIcon, tone: "text-[#8b6bff]" },
  { label: "Bus", desc: "Bus antar kota terlengkap", icon: BusIcon, tone: "text-[#67c674]" },
  { label: "Kapal", desc: "Tiket kapal laut resmi", icon: ShipIcon, tone: "text-[#2f80ed]" },
  { label: "Kapal Pesiar", desc: "Pelayaran cruise & itinerary", icon: CruiseIcon, tone: "text-[#f05d8f]" },
  { label: "Aktivitas", desc: "Tiket atraksi & wisata", icon: TicketIcon, tone: "text-[#f5a623]" },
  { label: "Paket Wisata", desc: "Paket liburan terbaik", icon: PalmIcon, tone: "text-[#f38aac]" },
]

export const promoCards = [
  {
    title: "Terbang Hemat\nke Banyak Destinasi",
    badge: "Promo Terbatas",
    eyebrow: "Contoh promo",
    price: "Dummy campaign",
    cta: "Lihat Katalog",
    image: "/home-assets/promo-flight.png",
    gradient: "from-[#ad718b] via-[#a76681] to-[#f1a38d]",
    imageClass: "bg-[length:162%] bg-[position:8%_65%] opacity-36",
    overlayClass: "bg-[linear-gradient(90deg,rgba(133,72,104,0.9)_0%,rgba(167,101,129,0.68)_26%,rgba(208,132,145,0.28)_52%,rgba(239,165,144,0.06)_76%,rgba(239,165,144,0)_100%)]",
    glowClass: "bg-[radial-gradient(circle_at_78%_22%,rgba(255,224,212,0.24)_0%,rgba(255,224,212,0.12)_18%,rgba(255,224,212,0)_42%)]",
  },
  {
    title: "Hotel Pilihan\nHarga Terbaik",
    eyebrow: "Contoh promo",
    price: "Dummy campaign",
    cta: "Lihat Katalog",
    image: "/home-assets/promo-hotel.png",
    gradient: "from-[#2874d8] via-[#327ee1] to-[#175ec3]",
    imageClass: "bg-cover bg-[position:66%_center] opacity-34",
    overlayClass: "bg-[linear-gradient(90deg,rgba(25,88,192,0.88)_0%,rgba(39,108,211,0.66)_26%,rgba(59,133,233,0.26)_52%,rgba(28,92,191,0.06)_76%,rgba(28,92,191,0)_100%)]",
    glowClass: "bg-[radial-gradient(circle_at_24%_18%,rgba(151,202,255,0.22)_0%,rgba(151,202,255,0.11)_16%,rgba(151,202,255,0)_38%)]",
  },
  {
    title: "Paket Wisata\nDomestik & Internasional",
    eyebrow: "Mulai dari",
    price: "Rp 1,9 Juta*",
    cta: "Lihat Paket",
    image: "/home-assets/promo-package.png",
    gradient: "from-[#1799aa] via-[#1a96a9] to-[#256f87]",
    imageClass: "bg-cover bg-[position:61%_center] opacity-34",
    overlayClass: "bg-[linear-gradient(90deg,rgba(18,140,154,0.86)_0%,rgba(25,156,166,0.62)_26%,rgba(82,192,173,0.24)_52%,rgba(28,109,121,0.06)_76%,rgba(28,109,121,0)_100%)]",
    glowClass: "bg-[radial-gradient(circle_at_28%_22%,rgba(191,255,234,0.18)_0%,rgba(191,255,234,0.09)_18%,rgba(191,255,234,0)_40%)]",
  },
  {
    title: "Promo Kereta\nAntarkota Favorit",
    eyebrow: "Contoh katalog",
    price: "Dummy route",
    cta: "Lihat Katalog",
    image: "/home-assets/card-train.png",
    gradient: "from-[#5a63d8] via-[#5d71e6] to-[#8b74f7]",
    imageClass: "bg-cover bg-[position:center_center] opacity-32",
    overlayClass: "bg-[linear-gradient(90deg,rgba(62,74,180,0.9)_0%,rgba(84,97,214,0.68)_26%,rgba(128,120,238,0.24)_54%,rgba(91,98,197,0.06)_76%,rgba(91,98,197,0)_100%)]",
    glowClass: "bg-[radial-gradient(circle_at_24%_18%,rgba(214,220,255,0.18)_0%,rgba(214,220,255,0.09)_18%,rgba(214,220,255,0)_40%)]",
  },
]

export const bookingTabs = ["Semua", "Pesawat", "Hotel", "Paket Wisata", "Kereta"]

export const popularBookings = [
  {
    category: "Pesawat",
    title: "Jakarta -> Bali",
    subtitle: "Contoh rute katalog",
    price: "Dummy fare",
    rating: "4.8",
    image: "/home-assets/card-flight.png",
    tone: "bg-[#ebf4ff] text-[#4a8dff]",
  },
  {
    category: "Hotel",
    title: "The Trans Resort Bali",
    subtitle: "Contoh properti katalog",
    price: "Dummy stay",
    suffix: "/malam",
    rating: "4.7",
    image: "/home-assets/card-hotel-1.png",
    tone: "bg-[#f3efff] text-[#9f7aea]",
  },
  {
    category: "Paket Wisata",
    title: "Bali 3 Hari 2 Malam",
    subtitle: "Termasuk Hotel & Tour",
    price: "Rp 1.990.000",
    rating: "4.9",
    image: "/home-assets/card-package.png",
    tone: "bg-[#ebfff3] text-[#38a169]",
  },
  {
    category: "Kereta",
    title: "Jakarta -> Bandung",
    subtitle: "Contoh rute katalog",
    price: "Dummy fare",
    rating: "4.8",
    image: "/home-assets/card-train.png",
    tone: "bg-[#f1efff] text-[#8b6bff]",
  },
  {
    category: "Hotel",
    title: "AYANA Resort Bali",
    subtitle: "Contoh properti katalog",
    price: "Dummy stay",
    suffix: "/malam",
    rating: "4.9",
    image: "/home-assets/card-hotel-2.png",
    tone: "bg-[#f3efff] text-[#9f7aea]",
  },
]

export const destinations = [
  { name: "Bali", country: "Indonesia", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-bali.png" },
  { name: "Jakarta", country: "Indonesia", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-jakarta.png" },
  { name: "Tokyo", country: "Jepang", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-tokyo.png" },
  { name: "Singapore", country: "Singapura", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-singapore.png" },
  { name: "Bangkok", country: "Thailand", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-bangkok.png" },
  { name: "Labuan Bajo", country: "Indonesia", teaser: "Contoh destinasi katalog", image: "/home-assets/dest-labuanbajo.png" },
]

export const inspirationArticles: HomeArticleCard[] = [
  {
    title: "Panduan Liburan Hemat ke Bali untuk First Timer",
    category: "Travel Guide",
    readTime: "Baca 4 menit",
    image: "/home-assets/dest-bali.png",
    href: "/packages",
  },
  {
    title: "Tips Booking Hotel Saat Musim Liburan Biar Tetap Untung",
    category: "Hotel Insight",
    readTime: "Baca 3 menit",
    image: "/home-assets/card-hotel-1.png",
    href: "/packages",
  },
  {
    title: "Rute Wisata Populer di Labuan Bajo yang Wajib Dicoba",
    category: "Destinasi Favorit",
    readTime: "Baca 5 menit",
    image: "/home-assets/dest-labuanbajo.png",
    href: "/packages",
  },
  {
    title: "Checklist Perjalanan Keluarga Supaya Liburan Makin Nyaman",
    category: "Travel Tips",
    readTime: "Baca 3 menit",
    image: "/home-assets/promo-package.png",
    href: "/packages",
  },
]

export const whyChoose = [
  { title: "Harga Terbaik", body: "Kami menawarkan harga kompetitif setiap hari", icon: PriceTagIcon },
  { title: "Banyak Pilihan", body: "Ribuan pilihan produk dan destinasi favorit", icon: BriefcaseIcon },
  { title: "Aman & Terpercaya", body: "Transaksi aman dengan sistem berstandar internasional", icon: LockIcon },
  { title: "Support 24/7", body: "Tim kami siap membantu kapan pun Anda butuh", icon: HeadsetIcon },
]

export const partnerLogos = [
  { kind: "image", src: "/home-assets/partner-garuda.png", alt: "Garuda Indonesia" },
  { kind: "text", label: "Lion Air" },
  { kind: "text", label: "Citilink" },
  { kind: "text", label: "AirAsia" },
  { kind: "text", label: "Batik Air" },
  { kind: "text", label: "Sriwijaya Air" },
] as const

export const payments: PaymentLogo[] = [
  { label: "VISA", src: "/home-assets/payment-visa.svg", width: 68, height: 22, mobileRenderWidth: 50, desktopRenderWidth: 58 },
  { label: "AMEX", src: "/home-assets/payment-amex.jpg", width: 750, height: 359, mobileRenderWidth: 42, desktopRenderWidth: 48, mobileScale: 1.15, desktopScale: 1.15, mobileBoxWidth: 76, desktopBoxWidth: 88 },
  { label: "BCA", src: "/home-assets/payment-bca.png", width: 1011, height: 325, mobileRenderWidth: 56, desktopRenderWidth: 66 },
  { label: "Mandiri", src: "/home-assets/payment-mandiri.png", width: 66, height: 22, mobileRenderWidth: 54, desktopRenderWidth: 62, mobileScale: 1.625, desktopScale: 1.625, mobileBoxWidth: 88, desktopBoxWidth: 100 },
  { label: "BNI", src: "/home-assets/payment-bni.png", width: 76, height: 22, mobileRenderWidth: 54, desktopRenderWidth: 62 },
  { label: "BRI", src: "/home-assets/payment-bri.jpg", width: 750, height: 185, mobileRenderWidth: 42, desktopRenderWidth: 48, mobileScale: 1.96, desktopScale: 1.96, mobileBoxWidth: 88, desktopBoxWidth: 104 },
  { label: "Midtrans", src: "/home-assets/payment-midtrans.jpg", width: 550, height: 101, mobileRenderWidth: 72, desktopRenderWidth: 86, mobileScale: 1.25, desktopScale: 1.25, mobileBoxWidth: 96, desktopBoxWidth: 112 },
  { label: "OVO", src: "/home-assets/payment-ovo.png", width: 1280, height: 399, mobileRenderWidth: 42, desktopRenderWidth: 46 },
  { label: "DANA", src: "/home-assets/payment-dana.svg", width: 71, height: 22, mobileRenderWidth: 58, desktopRenderWidth: 66, mobileScale: 1.25, desktopScale: 1.25, mobileBoxWidth: 90, desktopBoxWidth: 104 },
  { label: "GoPay", src: "/home-assets/payment-gopay.png", width: 600, height: 140, mobileRenderWidth: 62, desktopRenderWidth: 74, mobileScale: 1.08, desktopScale: 1.08, mobileBoxWidth: 90, desktopBoxWidth: 104 },
  { label: "Alipay", src: "/home-assets/payment-alipay.svg", width: 2500, height: 630, mobileRenderWidth: 78, desktopRenderWidth: 92 },
  { label: "ATM Bersama", src: "/home-assets/payment-atm-bersama.jpg", width: 750, height: 402, mobileRenderWidth: 76, desktopRenderWidth: 92, mobileScale: 1.1, desktopScale: 1.1, mobileBoxWidth: 96, desktopBoxWidth: 112 },
]

export const heroBenefitsByTab: Record<HeroTabKey, HeroBenefitItem[]> = {
  flight: [
    { title: "Harga tiket terbaik", icon: PriceTagIcon },
    { title: "Maskapai terpercaya", icon: ShieldIcon },
    { title: "Support 24/7", icon: HeadsetIcon },
  ],
  hotel: [
    { title: "Properti terkurasi", icon: BuildingIcon },
    { title: "Booking aman", icon: ShieldIcon },
    { title: "Harga promo hotel", icon: PriceTagIcon },
  ],
  train: [
    { title: "Rute populer", icon: TrainIcon },
    { title: "Jadwal akurat", icon: ShieldIcon },
    { title: "Tarif terbaik", icon: PriceTagIcon },
  ],
  bus: [
    { title: "Operator pilihan", icon: BusIcon },
    { title: "Kursi nyaman", icon: ShieldIcon },
    { title: "Harga hemat", icon: PriceTagIcon },
  ],
  ship: [
    { title: "Pelabuhan utama", icon: ShipIcon },
    { title: "Pelayaran aman", icon: ShieldIcon },
    { title: "Tarif fleksibel", icon: PriceTagIcon },
  ],
  cruise: [
    { title: "Itinerary premium", icon: CruiseIcon },
    { title: "Cabin terpercaya", icon: ShieldIcon },
    { title: "Promo cruise aktif", icon: PriceTagIcon },
  ],
  activity: [
    { title: "Atraksi favorit", icon: SparklesIcon },
    { title: "Voucher instan", icon: ShieldIcon },
    { title: "Promo tiket seru", icon: PriceTagIcon },
  ],
  package: [
    { title: "Paket terlengkap", icon: PalmIcon },
    { title: "Partner terpercaya", icon: ShieldIcon },
    { title: "Harga bundling hemat", icon: PriceTagIcon },
  ],
}

export const webHomeConfig = {
  heroTabs,
  serviceCards,
  promoCards,
  popularBookings,
  destinations,
  inspirationArticles,
  whyChoose,
  partnerLogos,
  payments,
  heroBenefitsByTab,
} as const

export const appHomeConfig = {
  quickChips: promoCards.map((card) => card.title.replace(/\n/g, " ")).slice(0, 4),
  featuredPromo: promoCards[0],
  recentFilters: Array.from(new Set(popularBookings.map((item) => item.category))).slice(0, 2),
  featuredActivity: popularBookings[0],
  serviceAccentByLabel: {
    Pesawat: "bg-[#39c6f4]",
    Hotel: "bg-[#225ea8]",
    Kereta: "bg-[#ffb100]",
    Bus: "bg-[#2dc84f]",
    Kapal: "bg-[#2f80ed]",
    "Kapal Pesiar": "bg-[#f05d8f]",
    Aktivitas: "bg-[#ff6b74]",
    "Paket Wisata": "bg-[#a11f44]",
  } as Record<string, string>,
} as const

export function PlaneIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M3 13.5l7-1.7 6.8-7.2 2.2 2.2-5.6 8 4.6 3.1-1.8 1.8-5.8-2-2.2 2.7H5.6l1.9-4.6-4.5-2.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
export function BuildingIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3 20h18M8 9h2M8 12h2M8 15h2M13 9h2M13 12h2M13 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function TrainIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="6" y="4" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M8 18h8M9 9h2M13 9h2M8 13h8M9 18l-2 2M15 18l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function BusIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M7 4h10a2 2 0 0 1 2 2v7.5A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h8M7.5 17 7 20M17 20l-.5-3M8.5 13h.01M15.5 13h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function ShipIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 16h16l-2 3H6l-2-3Zm5-8h6l1 8H8l1-8Zm1-3h4v3h-4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
export function CruiseIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 16h16l-1.8 2.7H5.8L4 16Zm4.5-7.5h7L17 16H7l1.5-7.5Zm1.2-2.8h4.6v2.8H9.7V5.7Zm-3.7 14.6c.8.9 1.8 1.4 3 1.4 1 0 1.8-.3 2.6-.9.8.6 1.7.9 2.6.9 1.2 0 2.2-.5 3-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function TicketIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v2a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 16.5 18h-9A2.5 2.5 0 0 1 5 15.5v-1a2 2 0 1 0 0-4v-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.6 2.6" /></svg>
}
export function PalmIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 20v-6M12 14c0-4 1.7-7 5-9M12 14c0-4-1.7-7-5-9M12 11c2.8 0 5-1.4 6.5-4M12 11c-2.8 0-5-1.4-6.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M9.5 20h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function SparklesIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Zm6 10 1 2.5L21.5 18 19 19l-1 2.5L17 19l-2.5-1 2.5-1.5L18 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
export function PriceTagIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m12 4 7 7-8.5 8.5a2 2 0 0 1-2.8 0L4.5 16.3a2 2 0 0 1 0-2.8L13 5a2 2 0 0 1 1.4-.6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16.5" cy="7.5" r="1" fill="currentColor" /></svg>
}
export function BriefcaseIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="4" y="7" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function LockIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8.5A4 4 0 0 1 12 4.5a4 4 0 0 1 4 4V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function ShieldIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3.5 19 6v5.5c0 4.3-2.6 7.3-7 9-4.4-1.7-7-4.7-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9.5 12 1.7 1.7L14.8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function ShieldCheckIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3.5 19 6v5.5c0 4.3-2.6 7.3-7 9-4.4-1.7-7-4.7-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8.8 12.2 2.1 2.1 4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function HeadsetIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="3.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" /><rect x="16.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M18.5 18a3 3 0 0 1-3 3H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function CardIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function CardIconBadge({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18M7 15h4M16 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function HeartIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
export function StarIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="m12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.1 7.2 18.7l.9-5.4-3.9-3.8 5.4-.8L12 3.8Z" /></svg>
}
export function SwapIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M7 7h10M13.5 3.5 17 7l-3.5 3.5M17 17H7M10.5 20.5 7 17l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function ChevronDownIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function ArrowRightIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
export function BellIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 5a6 6 0 0 0-6 6c0 4.5-2 5.5-2 5.5h16S18 15.5 18 11a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.8" /><path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function MenuIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
export function ArticleIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
