import Image from "next/image"
import Link from "next/link"
import type { ComponentType } from "react"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"

type IconProps = {
  className?: string
}

type CardIcon = ComponentType<IconProps>

const heroTabs = [
  { label: "Pesawat", badge: false, icon: PlaneIcon },
  { label: "Hotel", badge: false, icon: BuildingIcon },
  { label: "Kereta", badge: false, icon: TrainIcon },
  { label: "Bus", badge: false, icon: BusIcon },
  { label: "Kapal", badge: false, icon: ShipIcon },
  { label: "Aktivitas", badge: false, icon: SparklesIcon },
  { label: "Paket Wisata", badge: true, icon: PalmIcon },
]

const serviceCards: { label: string; desc: string; icon: CardIcon; tone: string }[] = [
  { label: "Pesawat", desc: "Tiket pesawat murah", icon: PlaneIcon, tone: "text-[#ff765d]" },
  { label: "Hotel", desc: "Hotel terbaik di dunia", icon: BuildingIcon, tone: "text-[#5b8dff]" },
  { label: "Kereta", desc: "Kereta cepat & reguler", icon: TrainIcon, tone: "text-[#8b6bff]" },
  { label: "Bus", desc: "Bus antar kota terlengkap", icon: BusIcon, tone: "text-[#67c674]" },
  { label: "Kapal", desc: "Tiket kapal laut resmi", icon: ShipIcon, tone: "text-[#2f80ed]" },
  { label: "Aktivitas", desc: "Tiket atraksi & wisata", icon: TicketIcon, tone: "text-[#f5a623]" },
  { label: "Paket Wisata", desc: "Paket liburan terbaik", icon: PalmIcon, tone: "text-[#f38aac]" },
]

const promoCards = [
  {
    title: "Terbang Hemat\nke Banyak Destinasi",
    eyebrow: "Diskon hingga",
    price: "Rp 500.000*",
    cta: "Pesan Sekarang",
    image: "/home-assets/promo-flight.png",
    gradient: "from-[#ff7f73] via-[#ff6958] to-[#ff8f80]",
  },
  {
    title: "Hotel Pilihan\nHarga Terbaik",
    eyebrow: "Diskon hingga",
    price: "40%*",
    cta: "Booking Sekarang",
    image: "/home-assets/promo-hotel.png",
    gradient: "from-[#1f6fd3] via-[#2079de] to-[#55a6f4]",
  },
  {
    title: "Paket Wisata\nDomestik & Internasional",
    eyebrow: "Mulai dari",
    price: "Rp 1,9 Juta*",
    cta: "Lihat Paket",
    image: "/home-assets/promo-package.png",
    gradient: "from-[#1b8a72] via-[#1e9b83] to-[#38b8a1]",
  },
]

const bookingTabs = ["Semua", "Pesawat", "Hotel", "Paket Wisata", "Kereta"]

const popularBookings = [
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

const destinations = [
  { name: "Bali", country: "Indonesia", teaser: "Mulai dari Rp 1,2 Jt", image: "/home-assets/dest-bali.png" },
  { name: "Jakarta", country: "Indonesia", teaser: "Mulai dari Rp 600 rb", image: "/home-assets/dest-jakarta.png" },
  { name: "Tokyo", country: "Jepang", teaser: "Mulai dari Rp 3,5 Jt", image: "/home-assets/dest-tokyo.png" },
  { name: "Singapore", country: "Singapura", teaser: "Mulai dari Rp 2,1 Jt", image: "/home-assets/dest-singapore.png" },
  { name: "Bangkok", country: "Thailand", teaser: "Mulai dari Rp 1,8 Jt", image: "/home-assets/dest-bangkok.png" },
  { name: "Labuan Bajo", country: "Indonesia", teaser: "Mulai dari Rp 1,3 Jt", image: "/home-assets/dest-labuanbajo.png" },
]

const whyChoose = [
  { title: "Harga Terbaik", body: "Kami menawarkan harga kompetitif setiap hari", icon: PriceTagIcon },
  { title: "Banyak Pilihan", body: "Ribuan pilihan produk dan destinasi favorit", icon: BriefcaseIcon },
  { title: "Aman & Terpercaya", body: "Transaksi aman dengan sistem berstandar internasional", icon: LockIcon },
  { title: "Support 24/7", body: "Tim kami siap membantu kapan pun Anda butuh", icon: HeadsetIcon },
]

const partnerLogos = [
  { kind: "image", src: "/home-assets/partner-garuda.png", alt: "Garuda Indonesia" },
  { kind: "text", label: "Lion Air" },
  { kind: "text", label: "Citilink" },
  { kind: "text", label: "AirAsia" },
  { kind: "text", label: "Batik Air" },
  { kind: "text", label: "Sriwijaya Air" },
] as const
const payments = ["VISA", "mastercard", "BCA", "mandiri", "BNI", "BRI", "gopay", "OVO", "dana", "ShopeePay"]
const heroBenefits = [
  { title: "Harga Terbaik", body: "Pilihan terbaik untukmu", icon: PriceTagIcon },
  { title: "Aman & Terpercaya", body: "Transaksi aman terjamin", icon: ShieldIcon },
  { title: "Customer Support 24/7", body: "Siap membantu kapan saja", icon: HeadsetIcon },
]

export default async function HomePage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="pb-28 md:pb-0">
        <section>
          <div className="overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,194,155,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(148,197,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
              <div className="absolute inset-0 hidden lg:block">
                <Image
                  src="/home-assets/hero-bg.png"
                  alt="Hero RedFeng"
                  fill
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,245,0.96)_0%,rgba(255,250,245,0.88)_16%,rgba(255,250,245,0.56)_30%,rgba(255,250,245,0.18)_46%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_100%)]" />
              </div>

              <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-5 sm:px-6 lg:px-8">
                <header className="relative z-10 flex items-center justify-between gap-4">
                  <Link href="/" className="flex items-center gap-2">
                    <Image src="/home-assets/logo-redfeng-header.png" alt="RedFeng" width={240} height={80} priority className="h-10 w-auto" />
                  </Link>

                  <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-800 lg:flex">
                    <a href="https://redfeng.co/pesawat/" className="pb-3 hover:text-[#ef3b2d]">Pesawat</a>
                    <a href="https://redfeng.co/hotel/" className="pb-3 hover:text-[#ef3b2d]">Hotel</a>
                    <a href="https://redfeng.co/kereta_api/" className="pb-3 hover:text-[#ef3b2d]">Kereta</a>
                    <a href="https://redfeng.co/bus-travel/" className="pb-3 hover:text-[#ef3b2d]">Bus</a>
                    <a href="https://redfeng.co/kapal_laut/" className="pb-3 hover:text-[#ef3b2d]">Kapal</a>
                    <a href="https://redfeng.co/aktivitas/" className="pb-3 hover:text-[#ef3b2d]">Aktivitas</a>
                    <Link href="/packages" className="pb-3 hover:text-[#ef3b2d]">Paket Wisata</Link>
                    <a href="https://redfeng.co/promo/" className="pb-3 hover:text-[#ef3b2d]">Promo</a>
                  </nav>

                  <div className="hidden items-center gap-5 lg:flex">
                    <a href="https://redfeng.co/bantuan/" className="text-sm text-slate-700 hover:text-[#ef3b2d]">Bantuan</a>
                    <button className="flex items-center gap-1 text-sm text-slate-700">
                      IDR
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                    <button className="text-slate-700">
                      <BellIcon className="h-5 w-5" />
                    </button>
                    <Link href="/login" className="rounded-xl bg-[#ff5a43] px-5 py-2.5 text-sm font-semibold text-white">
                      Login / Daftar
                    </Link>
                  </div>

                  <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm lg:hidden">
                    <MenuIcon className="h-5 w-5" />
                  </button>
                </header>

                <div className="relative z-10 pt-8 lg:pt-12">
                  <div className="max-w-[520px] pb-4 lg:min-h-[430px] lg:pb-0">
                    <h1 className="text-[36px] font-black leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-[48px] lg:text-[60px]">
                      Semua kebutuhan
                      <span className="block">perjalanan Anda,</span>
                      <span className="mt-1 block text-[#ff5a43]">dalam satu platform</span>
                    </h1>
                    <p className="mt-5 max-w-[400px] text-[15px] leading-8 text-slate-600 sm:text-[16px] sm:leading-8">
                      Pesawat, hotel, kereta, bus, kapal, aktivitas, dan paket wisata terbaik untuk Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 mx-auto -mt-36 max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_16px_30px_-28px_rgba(15,23,42,0.08)]">
                <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-5 py-4 text-sm font-semibold text-slate-700">
                  {heroTabs.map((tab, index) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.label}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-slate-500"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                        {tab.badge ? <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] text-white">Baru</span> : null}
                      </button>
                    )
                  })}
                </div>

                <div className="px-5 py-5 lg:px-6 lg:py-6">
                  <div className="flex flex-wrap gap-6 text-[13px] text-slate-600">
                    <label className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5a43]" />
                      Sekali Jalan
                    </label>
                    <label className="inline-flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                      Pulang - Pergi
                    </label>
                    <label className="inline-flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />
                      Multi Kota
                    </label>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-[1.22fr_44px_1.22fr_0.86fr_0.86fr_1fr_auto] lg:items-center">
                    <SearchField label="Dari" value="CGK   Jakarta (Semua Bandara)" sublabel="" withSwap />
                    <button className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)] lg:flex">
                      <SwapIcon className="h-4 w-4" />
                    </button>
                    <SearchField label="Ke" value="DPS   Denpasar (Bali)" sublabel="" />
                    <SearchField label="Tanggal Berangkat" value="25 Mei 2026" sublabel="" />
                    <SearchField label="Tanggal Pulang" value="28 Mei 2026" sublabel="" />
                    <SearchField label="Penumpang & Kelas" value="1 Dewasa, Ekonomi" sublabel="" withChevron />
                    <Link href="/packages" className="inline-flex min-h-[76px] items-center justify-center rounded-2xl bg-[#ff5a43] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
                      Cari Tiket
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-200/80 pt-4 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-4">
                    {heroBenefits.map((item) => {
                      const Icon = item.icon
                      return (
                        <div key={item.title} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[13px] font-medium text-slate-600">{item.title}</span>
                        </div>
                      )
                    })}
                    <div className="hidden items-center gap-3 lg:flex">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                        <CardIcon className="h-4 w-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-600">Pembayaran fleksibel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto -mt-1 max-w-[1240px] px-4 pb-4 pt-1 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {serviceCards.map((card, index) => {
              const Icon = card.icon
              return (
                <article
                  key={card.label}
                  className={`rounded-[24px] px-4 py-5 text-center ${
                    index === 0
                      ? "border border-[#ffc9bd] bg-[#fff8f5] shadow-[0_24px_40px_-28px_rgba(255,90,67,0.24)]"
                      : "border border-[#e7edf5] bg-white shadow-[0_8px_18px_-24px_rgba(15,23,42,0.06)]"
                  }`}
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-white ${card.tone}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold">{card.label}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-400">{card.desc}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
            {promoCards.map((card, index) => (
              <article
                key={card.title}
                className={`relative overflow-hidden rounded-[20px] px-6 py-5 text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] ${
                  index === 0
                    ? `min-h-[190px] bg-gradient-to-br ${card.gradient} lg:col-span-1`
                    : `min-h-[190px] bg-gradient-to-br ${card.gradient}`
                }`}
              >
                <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url('${card.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_42%,rgba(15,23,42,0.16)_100%)]" />
                <div className="relative z-10 max-w-[240px]">
                  {index === 0 ? <span className="inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#ff5a43]">Promo Terbatas</span> : null}
                  <h3 className={`whitespace-pre-line font-bold leading-[1.15] ${index === 0 ? "mt-4 text-[34px] tracking-[-0.05em]" : "text-[26px] tracking-[-0.04em]"}`}>{card.title}</h3>
                  <p className="mt-4 text-[12px] text-white/85">{card.eyebrow}</p>
                  <p className={`mt-1 font-black ${index === 0 ? "text-[24px]" : "text-[22px]"}`}>{card.price}</p>
                  <button className="mt-4 rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-slate-900">{card.cta}</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SectionHeader title="Paling Banyak Dipesan" showTabs />
        <section className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {popularBookings.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)]">
                <div className="relative h-[152px] overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                  <button className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-700">
                    <HeartIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.category}</span>
                  <h3 className="mt-3 text-[18px] font-bold tracking-[-0.03em] text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-[12px] text-slate-500">{item.subtitle}</p>
                  <p className="mt-3 text-[10px] text-slate-400">Mulai dari</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-[18px] font-black text-slate-900">
                      {item.price}
                      {item.suffix ? <span className="ml-1 text-[11px] font-medium text-slate-500">{item.suffix}</span> : null}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                      <StarIcon className="h-3.5 w-3.5 text-[#f5a623]" />
                      {item.rating}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SectionHeader title="Destinasi Populer" />
        <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {destinations.map((destination) => (
              <article key={destination.name} className="group relative h-[160px] overflow-hidden rounded-[18px] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.3)]">
                <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${destination.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.82)_100%)]" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <h3 className="text-[24px] font-bold leading-none tracking-[-0.04em]">{destination.name}</h3>
                  <p className="mt-1 text-[12px] font-medium text-white/95">{destination.country}</p>
                  <p className="mt-1 text-[11px] text-white/80">{destination.teaser}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 rounded-[24px] border border-[#f3e8de] bg-[linear-gradient(135deg,#fffaf6_0%,#fffefc_52%,#fff8f2_100%)] px-6 py-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)] lg:grid-cols-[0.95fr_1.4fr_1fr]">
            <div className="border-b border-[#f0e5d6] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1ea] text-[#ff8b5b]">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold leading-5">Dipercaya lebih dari 50.000+ Traveler</h3>
                  <div className="mt-4 flex gap-1 text-[#f5a623]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <StarIcon key={index} className="h-4 w-4" />
                    ))}
                  </div>
                  <p className="mt-3 text-[26px] font-black text-slate-900">
                    4.9/5 <span className="text-[12px] font-medium text-slate-500">dari 20.000+ ulasan</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#f0e5d6] pb-5 lg:border-b-0 lg:border-r lg:px-6 lg:pb-0">
              <h3 className="text-[15px] font-bold">Partner Resmi Kami</h3>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 text-center">
                {partnerLogos.map((logo, index) =>
                  logo.kind === "image" ? (
                    <Image
                      key={logo.alt}
                      src={logo.src}
                      alt={logo.alt}
                      width={220}
                      height={60}
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <span
                      key={logo.label}
                      className={`text-[22px] italic tracking-[-0.04em] ${
                        index === 1 || index === 4
                          ? "font-black text-[#ef3b2d]"
                          : index === 2
                            ? "font-black text-[#38a169]"
                            : index === 3
                              ? "font-black text-[#ef3b2d]"
                              : "font-medium text-[#4c51bf]"
                      }`}
                    >
                      {logo.label}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="lg:pl-6">
              <h3 className="flex items-center gap-2 text-[15px] font-bold">
                <CardIconBadge className="h-5 w-5 text-[#ff8b5b]" />
                Pembayaran Aman & Terpercaya
              </h3>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {payments.map((payment) => (
                  <span
                    key={payment}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 ring-1 ring-slate-200"
                  >
                    {payment}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
          <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-900">Mengapa memilih RedFeng?</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {whyChoose.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="flex gap-4 rounded-[18px] bg-white/70 p-2">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#ffe2d6] bg-[#fff8f4] text-[#ff8b5b]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-6 text-slate-500">{item.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
          <div
            className="overflow-hidden rounded-[22px] border border-[#f4ddd5] px-6 py-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.2)]"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(255,245,242,0.98)_0%,rgba(255,250,248,0.94)_42%,rgba(255,239,233,0.88)_100%), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80')",
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <h2 className="text-[28px] font-black leading-8 tracking-[-0.04em] text-slate-900">Dapatkan promo & info terbaru dari RedFeng!</h2>
                <p className="mt-3 max-w-sm text-[13px] leading-6 text-slate-600">
                  Berlangganan newsletter kami dan dapatkan penawaran menarik setiap minggunya.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="email"
                  placeholder="Masukkan email Anda"
                  className="h-12 rounded-xl border border-white bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.25)]"
                />
                <button className="h-12 rounded-xl bg-[#ef3b2d] px-8 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(239,59,45,0.7)]">Langganan</button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.25fr_0.72fr_0.72fr_0.72fr_1fr]">
              <div>
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/home-assets/logo-redfeng-header.png" alt="RedFeng" width={240} height={80} className="h-10 w-auto" />
                </Link>
                <p className="mt-4 max-w-sm text-[13px] leading-6 text-slate-500">
                  Platform perjalanan terlengkap untuk semua kebutuhan Anda. Booking mudah, cepat, dan aman.
                </p>
                <div className="mt-4 flex gap-3 text-slate-500">
                  <SocialCircle label="ig" />
                  <SocialCircle label="fb" />
                  <SocialCircle label="yt" />
                  <SocialCircle label="tt" />
                </div>
              </div>

              <FooterColumn title="Perusahaan" items={["Tentang Kami", "Karir", "Blog", "Kontak Kami"]} />
              <FooterColumn title="Bantuan" items={["Pusat Bantuan", "Cara Pemesanan", "Pembayaran", "Kebijakan & Privasi"]} />
              <FooterColumn title="Partner" items={["Jadi Partner", "Affiliate", "Kerja Sama Korporat"]} />

              <div>
                <h3 className="text-[15px] font-bold">Metode Pembayaran</h3>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {payments.slice(0, 10).map((payment) => (
                    <span
                      key={payment}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-white px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700 ring-1 ring-slate-200"
                    >
                      {payment}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-[12px] text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>&copy; 2026 RedFeng. All rights reserved.</p>
              <div className="flex gap-5">
                <a href="/terms" className="hover:text-slate-700">Syarat & Ketentuan</a>
                <a href="/privacy" className="hover:text-slate-700">Kebijakan Privasi</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}

function SectionHeader({ title, showTabs = false }: { title: string; showTabs?: boolean }) {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-4 pt-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-900">{title}</h2>
          {showTabs ? (
            <div className="flex flex-wrap gap-2">
              {bookingTabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-[#fff2ef] text-[#ef3b2d]" : "text-slate-500"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Link href="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3b82f6]">
          Lihat semua
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function SearchField({
  label,
  value,
  sublabel,
  withSwap = false,
  withChevron = false,
}: {
  label: string
  value: string
  sublabel: string
  withSwap?: boolean
  withChevron?: boolean
}) {
  return (
    <div className="relative rounded-[20px] border border-slate-200 bg-[#fdfefe] px-4 py-3.5 shadow-[0_8px_20px_-24px_rgba(15,23,42,0.18)]">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 pr-8 text-[15px] font-bold text-slate-900">{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {withSwap ? (
        <span className="absolute -right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] lg:hidden">
          <SwapIcon className="h-4 w-4" />
        </span>
      ) : null}
      {withChevron ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  )
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[13px] text-slate-500">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="hover:text-slate-800">{item}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialCircle({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-[10px] font-bold uppercase">
      {label}
    </span>
  )
}

function PlaneIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M3 13.5l7-1.7 6.8-7.2 2.2 2.2-5.6 8 4.6 3.1-1.8 1.8-5.8-2-2.2 2.7H5.6l1.9-4.6-4.5-2.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
function BuildingIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3 20h18M8 9h2M8 12h2M8 15h2M13 9h2M13 12h2M13 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function TrainIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="6" y="4" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M8 18h8M9 9h2M13 9h2M8 13h8M9 18l-2 2M15 18l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function BusIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M7 4h10a2 2 0 0 1 2 2v7.5A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h8M7.5 17 7 20M17 20l-.5-3M8.5 13h.01M15.5 13h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function ShipIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 16h16l-2 3H6l-2-3Zm5-8h6l1 8H8l1-8Zm1-3h4v3h-4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
function TicketIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v2a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 16.5 18h-9A2.5 2.5 0 0 1 5 15.5v-1a2 2 0 1 0 0-4v-2Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.6 2.6" /></svg>
}
function PalmIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 20v-6M12 14c0-4 1.7-7 5-9M12 14c0-4-1.7-7-5-9M12 11c2.8 0 5-1.4 6.5-4M12 11c-2.8 0-5-1.4-6.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M9.5 20h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function SparklesIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Zm6 10 1 2.5L21.5 18 19 19l-1 2.5L17 19l-2.5-1 2.5-1.5L18 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
function PriceTagIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m12 4 7 7-8.5 8.5a2 2 0 0 1-2.8 0L4.5 16.3a2 2 0 0 1 0-2.8L13 5a2 2 0 0 1 1.4-.6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16.5" cy="7.5" r="1" fill="currentColor" /></svg>
}
function BriefcaseIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="4" y="7" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function LockIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8.5A4 4 0 0 1 12 4.5a4 4 0 0 1 4 4V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function ShieldIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3.5 19 6v5.5c0 4.3-2.6 7.3-7 9-4.4-1.7-7-4.7-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9.5 12 1.7 1.7L14.8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ShieldCheckIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3.5 19 6v5.5c0 4.3-2.6 7.3-7 9-4.4-1.7-7-4.7-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8.8 12.2 2.1 2.1 4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function HeadsetIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="3.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" /><rect x="16.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M18.5 18a3 3 0 0 1-3 3H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function CardIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function CardIconBadge({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M3 10h18M7 15h4M16 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function HeartIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}
function StarIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="m12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.1 7.2 18.7l.9-5.4-3.9-3.8 5.4-.8L12 3.8Z" /></svg>
}
function SwapIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M7 7h10M13.5 3.5 17 7l-3.5 3.5M17 17H7M10.5 20.5 7 17l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ChevronDownIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function ArrowRightIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function BellIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 5a6 6 0 0 0-6 6c0 4.5-2 5.5-2 5.5h16S18 15.5 18 11a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.8" /><path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function MenuIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
