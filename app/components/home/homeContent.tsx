import type { ComponentType } from "react"

export type IconProps = {
  className?: string
}

export type CardIcon = ComponentType<IconProps>

export const heroTabs = [
  { label: "Pesawat", badge: false, icon: PlaneIcon },
  { label: "Hotel", badge: false, icon: BuildingIcon },
  { label: "Kereta", badge: false, icon: TrainIcon },
  { label: "Bus", badge: false, icon: BusIcon },
  { label: "Kapal", badge: false, icon: ShipIcon },
  { label: "Aktivitas", badge: false, icon: SparklesIcon },
  { label: "Paket Wisata", badge: true, icon: PalmIcon },
]

export const serviceCards: { label: string; desc: string; icon: CardIcon; tone: string }[] = [
  { label: "Pesawat", desc: "Tiket pesawat murah", icon: PlaneIcon, tone: "text-[#ff765d]" },
  { label: "Hotel", desc: "Hotel terbaik di dunia", icon: BuildingIcon, tone: "text-[#5b8dff]" },
  { label: "Kereta", desc: "Kereta cepat & reguler", icon: TrainIcon, tone: "text-[#8b6bff]" },
  { label: "Bus", desc: "Bus antar kota terlengkap", icon: BusIcon, tone: "text-[#67c674]" },
  { label: "Kapal", desc: "Tiket kapal laut resmi", icon: ShipIcon, tone: "text-[#2f80ed]" },
  { label: "Aktivitas", desc: "Tiket atraksi & wisata", icon: TicketIcon, tone: "text-[#f5a623]" },
  { label: "Paket Wisata", desc: "Paket liburan terbaik", icon: PalmIcon, tone: "text-[#f38aac]" },
]

export const promoCards = [
  {
    title: "Terbang Hemat\nke Banyak Destinasi",
    badge: "Promo Terbatas",
    eyebrow: "Diskon hingga",
    price: "Rp 500.000*",
    cta: "Pesan Sekarang",
    image: "/home-assets/promo-flight.png",
    gradient: "from-[#ad718b] via-[#a76681] to-[#f1a38d]",
    imageClass: "bg-[length:162%] bg-[position:82%_65%] opacity-36",
    overlayClass: "bg-[linear-gradient(90deg,rgba(153,92,119,0.9)_0%,rgba(181,119,142,0.78)_48%,rgba(241,163,141,0.58)_100%)]",
  },
  {
    title: "Hotel Pilihan\nHarga Terbaik",
    eyebrow: "Diskon hingga",
    price: "40%*",
    cta: "Booking Sekarang",
    image: "/home-assets/promo-hotel.png",
    gradient: "from-[#2874d8] via-[#327ee1] to-[#175ec3]",
    imageClass: "bg-cover bg-[position:66%_center] opacity-34",
    overlayClass: "bg-[linear-gradient(90deg,rgba(37,103,201,0.86)_0%,rgba(51,125,225,0.62)_44%,rgba(19,71,156,0.56)_100%)]",
  },
  {
    title: "Paket Wisata\nDomestik & Internasional",
    eyebrow: "Mulai dari",
    price: "Rp 1,9 Juta*",
    cta: "Lihat Paket",
    image: "/home-assets/promo-package.png",
    gradient: "from-[#1799aa] via-[#1a96a9] to-[#256f87]",
    imageClass: "bg-cover bg-[position:61%_center] opacity-34",
    overlayClass: "bg-[linear-gradient(90deg,rgba(23,153,170,0.82)_0%,rgba(30,160,151,0.5)_42%,rgba(35,106,119,0.54)_100%)]",
  },
]

export const bookingTabs = ["Semua", "Pesawat", "Hotel", "Paket Wisata", "Kereta"]

export const popularBookings = [
  {
    category: "Pesawat",
    title: "Jakarta -> Bali",
    subtitle: "Sekali Jalan",
    price: "Rp 690.000",
    rating: "4.8",
    image: "/home-assets/card-flight.png",
    tone: "bg-[#ebf4ff] text-[#4a8dff]",
  },
  {
    category: "Hotel",
    title: "The Trans Resort Bali",
    subtitle: "Kuta, Bali",
    price: "Rp 850.000",
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
    subtitle: "Kereta Cepat WHOOSH",
    price: "Rp 150.000",
    rating: "4.8",
    image: "/home-assets/card-train.png",
    tone: "bg-[#f1efff] text-[#8b6bff]",
  },
  {
    category: "Hotel",
    title: "AYANA Resort Bali",
    subtitle: "Jimbaran, Bali",
    price: "Rp 2.350.000",
    suffix: "/malam",
    rating: "4.9",
    image: "/home-assets/card-hotel-2.png",
    tone: "bg-[#f3efff] text-[#9f7aea]",
  },
]

export const destinations = [
  { name: "Bali", country: "Indonesia", teaser: "Mulai dari Rp 1,2 Jt", image: "/home-assets/dest-bali.png" },
  { name: "Jakarta", country: "Indonesia", teaser: "Mulai dari Rp 600 rb", image: "/home-assets/dest-jakarta.png" },
  { name: "Tokyo", country: "Jepang", teaser: "Mulai dari Rp 3,5 Jt", image: "/home-assets/dest-tokyo.png" },
  { name: "Singapore", country: "Singapura", teaser: "Mulai dari Rp 2,1 Jt", image: "/home-assets/dest-singapore.png" },
  { name: "Bangkok", country: "Thailand", teaser: "Mulai dari Rp 1,8 Jt", image: "/home-assets/dest-bangkok.png" },
  { name: "Labuan Bajo", country: "Indonesia", teaser: "Mulai dari Rp 1,3 Jt", image: "/home-assets/dest-labuanbajo.png" },
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

export const payments = ["VISA", "mastercard", "BCA", "mandiri", "BNI", "BRI", "gopay", "OVO", "dana", "ShopeePay"]

export const heroBenefits = [
  { title: "Harga Terbaik", body: "Pilihan terbaik untukmu", icon: PriceTagIcon },
  { title: "Aman & Terpercaya", body: "Transaksi aman terjamin", icon: ShieldIcon },
  { title: "Customer Support 24/7", body: "Siap membantu kapan saja", icon: HeadsetIcon },
]

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
