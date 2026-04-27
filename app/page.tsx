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
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-[#ff7f73] via-[#ff6958] to-[#ff8f80]",
  },
  {
    title: "Hotel Pilihan\nHarga Terbaik",
    eyebrow: "Diskon hingga",
    price: "40%*",
    cta: "Booking Sekarang",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-[#1f6fd3] via-[#2079de] to-[#55a6f4]",
  },
  {
    title: "Paket Wisata\nDomestik & Internasional",
    eyebrow: "Mulai dari",
    price: "Rp 1,9 Juta*",
    cta: "Lihat Paket",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
    tone: "bg-[#ebf4ff] text-[#4a8dff]",
  },
  {
    category: "Hotel",
    title: "The Trans Resort Bali",
    subtitle: "Kuta, Bali",
    price: "Rp 850.000",
    suffix: "/malam",
    rating: "4.7",
    image:
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
    tone: "bg-[#f3efff] text-[#9f7aea]",
  },
  {
    category: "Paket Wisata",
    title: "Bali 3 Hari 2 Malam",
    subtitle: "Termasuk Hotel & Tour",
    price: "Rp 1.990.000",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
    tone: "bg-[#ebfff3] text-[#38a169]",
  },
  {
    category: "Kereta",
    title: "Jakarta -> Bandung",
    subtitle: "Kereta Cepat WHOOSH",
    price: "Rp 150.000",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=80",
    tone: "bg-[#f1efff] text-[#8b6bff]",
  },
  {
    category: "Hotel",
    title: "AYANA Resort Bali",
    subtitle: "Jimbaran, Bali",
    price: "Rp 2.350.000",
    suffix: "/malam",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80",
    tone: "bg-[#f3efff] text-[#9f7aea]",
  },
]

const destinations = [
  { name: "Bali", country: "Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80" },
  { name: "Jakarta", country: "Indonesia", image: "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=900&q=80" },
  { name: "Tokyo", country: "Jepang", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80" },
  { name: "Singapore", country: "Singapura", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80" },
  { name: "Bangkok", country: "Thailand", image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80" },
  { name: "Labuan Bajo", country: "Indonesia", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=80" },
]

const whyChoose = [
  { title: "Harga Terbaik", body: "Kami menawarkan harga kompetitif setiap hari", icon: PriceTagIcon },
  { title: "Banyak Pilihan", body: "Ribuan pilihan produk dan destinasi favorit", icon: BriefcaseIcon },
  { title: "Aman & Terpercaya", body: "Transaksi aman dengan sistem berstandar internasional", icon: LockIcon },
  { title: "Support 24/7", body: "Tim kami siap membantu kapan pun Anda butuh", icon: HeadsetIcon },
]

const partnerLogos = ["Garuda Indonesia", "Lion Air", "Citilink", "AirAsia", "Batik Air", "Sriwijaya Air"]
const payments = ["VISA", "mastercard", "BCA", "mandiri", "BNI", "BRI", "gopay", "OVO", "dana", "ShopeePay"]

export default async function HomePage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_25%,#fffefc_100%)] text-slate-900">
      <main className="pb-28 md:pb-0">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(238,245,255,0.98)_0%,rgba(255,255,255,0.96)_32%,rgba(255,255,255,1)_100%)]" />
          <div
            className="absolute inset-x-0 top-0 h-[460px] bg-cover bg-center md:h-[600px]"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.84)_24%,rgba(255,255,255,0.28)_52%,rgba(255,255,255,0.06)_100%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=80')",
            }}
          />
          <div className="relative mx-auto max-w-[1240px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo-redfeng.png" alt="RedFeng" width={150} height={52} priority className="h-9 w-auto" />
              </Link>

              <nav className="hidden items-center gap-8 text-[14px] font-medium text-slate-800 lg:flex">
                <a href="https://redfeng.co/pesawat/" className="hover:text-[#ef3b2d]">Pesawat</a>
                <a href="https://redfeng.co/hotel/" className="hover:text-[#ef3b2d]">Hotel</a>
                <a href="https://redfeng.co/kereta_api/" className="hover:text-[#ef3b2d]">Kereta</a>
                <a href="https://redfeng.co/bus-travel/" className="hover:text-[#ef3b2d]">Bus</a>
                <a href="https://redfeng.co/kapal_laut/" className="hover:text-[#ef3b2d]">Kapal</a>
                <a href="https://redfeng.co/aktivitas/" className="hover:text-[#ef3b2d]">Aktivitas</a>
                <Link href="/packages" className="hover:text-[#ef3b2d]">Paket Wisata</Link>
              </nav>

              <div className="hidden items-center gap-5 lg:flex">
                <a href="https://redfeng.co/promo/" className="text-sm text-slate-700 hover:text-[#ef3b2d]">Promo</a>
                <a href="https://redfeng.co/bantuan/" className="text-sm text-slate-700 hover:text-[#ef3b2d]">Bantuan</a>
                <button className="flex items-center gap-1 text-sm text-slate-700">
                  <GlobeIcon className="h-4 w-4" />
                  IDR
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <button className="text-slate-700">
                  <BellIcon className="h-5 w-5" />
                </button>
                <Link href="/login" className="rounded-xl bg-[#ef3b2d] px-5 py-2.5 text-sm font-semibold text-white">
                  Login / Daftar
                </Link>
              </div>

              <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm lg:hidden">
                <MenuIcon className="h-5 w-5" />
              </button>
            </header>

            <div className="pt-10 md:pt-12">
              <div className="max-w-[420px]">
                <h1 className="text-[36px] font-black leading-[1.02] tracking-[-0.04em] text-slate-900 sm:text-[48px] lg:text-[58px]">
                  Semua kebutuhan perjalanan Anda,
                  <span className="mt-1 block text-[#ef3b2d]">dalam satu platform</span>
                </h1>
                <p className="mt-5 max-w-[340px] text-[15px] leading-7 text-slate-600 sm:text-base">
                  Pesawat, hotel, kereta, bus, kapal, aktivitas, dan paket wisata terbaik untuk Anda.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6 md:mt-8">
              <div className="overflow-hidden rounded-[24px] border border-[#eceff6] bg-white/96 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.22)]">
                <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-5 py-3.5 text-sm font-semibold text-slate-700">
                  {heroTabs.map((tab, index) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.label}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                        {tab.badge ? <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] text-white">Baru</span> : null}
                      </button>
                    )
                  })}
                </div>

                <div className="grid gap-0 px-4 py-4 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] md:px-5">
                  <SearchField label="Dari" value="Jakarta (CGK)" sublabel="Soekarno Hatta Int." withSwap />
                  <SearchField label="Ke" value="Bali / Denpasar (DPS)" sublabel="Ngurah Rai Int." />
                  <SearchField label="Tanggal Berangkat" value="25 Mei 2026" sublabel="Minggu" />
                  <SearchField label="Tanggal Pulang" value="28 Mei 2026" sublabel="Rabu" />
                  <SearchField label="Penumpang & Kelas" value="1 Dewasa, Ekonomi" sublabel="" withChevron />
                  <Link href="/packages" className="m-2 inline-flex min-h-[66px] items-center justify-center rounded-xl bg-[#ef3b2d] px-8 text-base font-semibold text-white">
                    Cari Tiket
                  </Link>
                </div>

                <div className="grid gap-3 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-600 md:grid-cols-4">
                  <BenefitItem icon={ClockIcon} text="Harga terbaik setiap hari" />
                  <BenefitItem icon={ShieldIcon} text="Transaksi aman & terpercaya" />
                  <BenefitItem icon={HeadsetIcon} text="Customer support 24/7" />
                  <BenefitItem icon={CardIcon} text="Pembayaran fleksibel" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {serviceCards.map((card) => {
              const Icon = card.icon
              return (
                <article
                  key={card.label}
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-5 text-center shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]"
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#f8fafc] ${card.tone}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold">{card.label}</h3>
                  <p className="mt-2 text-[13px] leading-5 text-slate-500">{card.desc}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {promoCards.map((card) => (
              <article
                key={card.title}
                className={`relative min-h-[154px] overflow-hidden rounded-[16px] bg-gradient-to-br ${card.gradient} px-5 py-4 text-white`}
              >
                <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url('${card.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_42%,rgba(15,23,42,0.16)_100%)]" />
                <div className="relative z-10 max-w-[220px]">
                  <h3 className="whitespace-pre-line text-[18px] font-bold leading-[1.15]">{card.title}</h3>
                  <p className="mt-4 text-[11px] text-white/85">{card.eyebrow}</p>
                  <p className="mt-1 text-[18px] font-black">{card.price}</p>
                  <button className="mt-4 rounded-md bg-white px-3 py-2 text-[11px] font-semibold text-slate-900">{card.cta}</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SectionHeader title="Paling Banyak Dipesan" showTabs />
        <section className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {popularBookings.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)]">
                <div className="relative h-[128px] overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                  <button className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-700">
                    <HeartIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3.5">
                  <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.category}</span>
                  <h3 className="mt-2 text-[13px] font-bold leading-5">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{item.subtitle}</p>
                  <p className="mt-3 text-[10px] text-slate-400">Mulai dari</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-[14px] font-black">
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
              <article key={destination.name} className="group relative h-[150px] overflow-hidden rounded-[14px]">
                <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${destination.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.72)_100%)]" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <h3 className="text-[18px] font-bold leading-none">{destination.name}</h3>
                  <p className="mt-1 text-[11px] text-white/90">{destination.country}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 rounded-[22px] border border-[#f1e8dd] bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_52%,#fff9f2_100%)] px-6 py-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.2)] lg:grid-cols-[0.95fr_1.4fr_1fr]">
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
                {partnerLogos.map((logo, index) => (
                  <span
                    key={logo}
                    className={`text-[22px] italic tracking-[-0.04em] ${
                      index === 0
                        ? "text-slate-500"
                        : index === 1 || index === 4
                          ? "font-black text-[#ef3b2d]"
                          : index === 2
                            ? "font-black text-[#38a169]"
                            : index === 3
                              ? "font-black text-[#ef3b2d]"
                              : "font-medium text-[#4c51bf]"
                    }`}
                  >
                    {logo}
                  </span>
                ))}
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
          <h2 className="text-[34px] font-black tracking-[-0.04em] text-slate-900">Mengapa memilih RedFeng?</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {whyChoose.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="flex gap-4">
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
            className="overflow-hidden rounded-[18px] border border-[#f4ddd5] px-6 py-6"
            style={{
              backgroundImage:
                "linear-gradient(90deg,rgba(255,245,242,0.98)_0%,rgba(255,250,248,0.94)_42%,rgba(255,239,233,0.88)_100%), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80')",
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.2fr] lg:items-center">
              <div>
                <h2 className="text-[18px] font-black leading-7 tracking-[-0.03em]">Dapatkan promo & info terbaru dari RedFeng!</h2>
                <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-600">
                  Berlangganan newsletter kami dan dapatkan penawaran menarik setiap minggunya.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="email"
                  placeholder="Masukkan email Anda"
                  className="h-12 rounded-xl border border-white bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button className="h-12 rounded-xl bg-[#ef3b2d] px-8 text-sm font-semibold text-white">Langganan</button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1240px] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_1fr]">
              <div>
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/logo-redfeng.png" alt="RedFeng" width={150} height={52} className="h-9 w-auto" />
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
                  {payments.slice(0, 5).map((payment) => (
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
          <h2 className="text-[34px] font-black tracking-[-0.04em] text-slate-900">{title}</h2>
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
    <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 md:rounded-none md:border-b-0 md:border-l-0 md:border-r md:border-t-0 md:first:rounded-l-2xl md:first:border-l md:last:rounded-r-2xl md:last:border-r">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-[15px] font-bold text-slate-900">{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {withSwap ? (
        <span className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
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

function BenefitItem({ icon: Icon, text }: { icon: CardIcon; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[13px] font-medium">{text}</span>
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
function ClockIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
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
function GlobeIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}
function BellIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M12 5a6 6 0 0 0-6 6c0 4.5-2 5.5-2 5.5h16S18 15.5 18 11a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.8" /><path d="M10 19a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
function MenuIcon({ className }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" className={className}><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
