import Image from "next/image"
import Link from "next/link"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"

type IconProps = {
  className?: string
}

const heroTabs = [
  { label: "Pesawat", badge: false },
  { label: "Hotel", badge: false },
  { label: "Kereta", badge: false },
  { label: "Bus", badge: false },
  { label: "Kapal", badge: false },
  { label: "Aktivitas", badge: false },
  { label: "Paket Wisata", badge: true },
]

const serviceCards = [
  {
    label: "Pesawat",
    desc: "Tiket pesawat murah",
    tone: "from-[#f2f7ff] to-[#ffffff]",
    iconTone: "text-[#5b9dff]",
    icon: PlaneIcon,
  },
  {
    label: "Hotel",
    desc: "Hotel terbaik di dunia",
    tone: "from-[#f5f7ff] to-[#ffffff]",
    iconTone: "text-[#6f86ff]",
    icon: BuildingIcon,
  },
  {
    label: "Kereta",
    desc: "Kereta cepat & reguler",
    tone: "from-[#f8f4ff] to-[#ffffff]",
    iconTone: "text-[#8b5cf6]",
    icon: TrainIcon,
  },
  {
    label: "Bus",
    desc: "Bus antar kota terlengkap",
    tone: "from-[#effdf4] to-[#ffffff]",
    iconTone: "text-[#22c55e]",
    icon: BusIcon,
  },
  {
    label: "Kapal",
    desc: "Tiket kapal laut resmi",
    tone: "from-[#eff8ff] to-[#ffffff]",
    iconTone: "text-[#2f80ed]",
    icon: CruiseIcon,
  },
  {
    label: "Aktivitas",
    desc: "Tiket atraksi & wisata",
    tone: "from-[#fff8ee] to-[#ffffff]",
    iconTone: "text-[#f59e0b]",
    icon: TicketIcon,
  },
  {
    label: "Paket Wisata",
    desc: "Paket liburan terbaik",
    tone: "from-[#fff3f7] to-[#ffffff]",
    iconTone: "text-[#ec4899]",
    icon: PalmIcon,
  },
]

const promoCards = [
  {
    title: "Terbang Hemat\nke Banyak Destinasi",
    price: "Rp 500.000",
    cta: "Pesan Sekarang",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-[#d51d13] via-[#e4571f] to-[#ff9f43]",
  },
  {
    title: "Hotel Pilihan\nHarga Terbaik",
    price: "40%",
    cta: "Booking Sekarang",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-[#143b91] via-[#1e5bb9] to-[#38bdf8]",
  },
  {
    title: "Paket Wisata\nDomestik & Internasional",
    price: "Rp 1,9 Juta",
    cta: "Lihat Paket",
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
    gradient: "from-[#0d7b66] via-[#1e9c88] to-[#8de2d1]",
  },
]

const popularBookings = [
  {
    category: "Pesawat",
    title: "Jakarta -> Bali",
    subtitle: "Sekali Jalan",
    price: "Rp 690.000",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
  },
  {
    category: "Hotel",
    title: "The Trans Resort Bali",
    subtitle: "Kuta, Bali",
    price: "Rp 850.000 /malam",
    rating: "4.7",
    image:
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
  },
  {
    category: "Paket Wisata",
    title: "Bali 3 Hari 2 Malam",
    subtitle: "Termasuk Hotel & Tour",
    price: "Rp 1.990.000",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
  },
  {
    category: "Kereta",
    title: "Jakarta -> Bandung",
    subtitle: "Kereta Cepat WHOOSH",
    price: "Rp 150.000",
    rating: "4.8",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=80",
  },
  {
    category: "Hotel",
    title: "AYANA Resort Bali",
    subtitle: "Jimbaran, Bali",
    price: "Rp 2.350.000 /malam",
    rating: "4.9",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80",
  },
]

const destinations = [
  {
    name: "Bali",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Jakarta",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Tokyo",
    country: "Jepang",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Singapore",
    country: "Singapura",
    image:
      "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Bangkok",
    country: "Thailand",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Yogyakarta",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Labuan Bajo",
    country: "Indonesia",
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=80",
  },
]

const advantages = [
  {
    title: "Harga Terbaik",
    body: "Kami menawarkan harga kompetitif setiap hari",
    tone: "bg-[#fff2f1] text-[#ef4444]",
    icon: PriceTagIcon,
  },
  {
    title: "Banyak Pilihan",
    body: "Ribuan pilihan produk dan destinasi favorit",
    tone: "bg-[#edf4ff] text-[#3b82f6]",
    icon: BriefcaseIcon,
  },
  {
    title: "Aman & Terpercaya",
    body: "Transaksi aman dengan sistem berstandar internasional",
    tone: "bg-[#ecfdf3] text-[#22c55e]",
    icon: ShieldIcon,
  },
  {
    title: "Support 24/7",
    body: "Tim kami siap membantu kapan pun Anda butuh",
    tone: "bg-[#fff6eb] text-[#f59e0b]",
    icon: HeadsetIcon,
  },
  {
    title: "Pembayaran Fleksibel",
    body: "Berbagai metode pembayaran mudah dan aman",
    tone: "bg-[#f4f0ff] text-[#8b5cf6]",
    icon: CardIcon,
  },
]

const testimonials = [
  {
    name: "Andi Pratama",
    city: "Jakarta",
    body: "Pesan tiket dan hotel di RedFeng sangat mudah, harga terbaik dan pelayanan cepat!",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Siti Aisyah",
    city: "Surabaya",
    body: "Paket tournya menarik dan itinerary lengkap. Liburan jadi lebih praktis dan menyenangkan.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Dewi Lestari",
    city: "Bandung",
    body: "Customer service responsif 24 jam, recommended banget!",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
]

const partnerLogos = ["Garuda Indonesia", "Lion Air", "Batik Air", "Citilink", "AirAsia", "Sriwijaya Air", "traveloka", "Wonderful Indonesia"]

const paymentBadges = ["VISA", "mastercard", "BCA", "mandiri", "BNI", "BRI", "gopay", "OVO", "qris", "ShopeePay"]

export default async function HomePage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf4ff_0%,#ffffff_26%,#ffffff_100%)] text-slate-900">
      <main className="pb-28 md:pb-0">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(230,240,255,0.96)_0%,rgba(255,255,255,0.92)_30%,rgba(255,255,255,1)_100%)]" />
          <div
            className="absolute inset-x-0 top-0 h-[470px] bg-cover bg-center md:h-[620px]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.70) 34%, rgba(255,255,255,0.10) 62%, rgba(255,255,255,0.14) 100%), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1800&q=80')",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-[470px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_36%)] md:h-[620px]" />

          <div className="relative mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
            <header className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src="/logo-redfeng.png" alt="RedFeng" width={150} height={52} priority className="h-9 w-auto md:h-10" />
              </Link>

              <nav className="hidden items-center gap-8 text-[14px] font-medium text-slate-900 lg:flex">
                <a href="https://redfeng.co/pesawat/" className="transition hover:text-red-500">
                  Pesawat
                </a>
                <a href="https://redfeng.co/hotel/" className="transition hover:text-red-500">
                  Hotel
                </a>
                <a href="https://redfeng.co/kereta_api/" className="transition hover:text-red-500">
                  Kereta
                </a>
                <a href="https://redfeng.co/bus-travel/" className="transition hover:text-red-500">
                  Bus
                </a>
                <a href="https://redfeng.co/kapal_laut/" className="transition hover:text-red-500">
                  Kapal
                </a>
                <a href="https://redfeng.co/aktivitas/" className="transition hover:text-red-500">
                  Aktivitas
                </a>
                <Link href="/packages" className="transition hover:text-red-500">
                  Paket Wisata
                </Link>
              </nav>

              <div className="hidden items-center gap-5 lg:flex">
                <a href="https://redfeng.co/promo/" className="text-sm font-medium text-slate-700 transition hover:text-red-500">
                  Promo
                </a>
                <a href="https://redfeng.co/bantuan/" className="text-sm font-medium text-slate-700 transition hover:text-red-500">
                  Bantuan
                </a>
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 shadow-sm">
                  <CartIcon className="h-4 w-4" />
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </div>
                <Link
                  href="/login"
                  className="rounded-xl bg-[#ef3b2d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(239,59,45,0.9)] transition hover:bg-[#dd2f21]"
                >
                  Login / Daftar
                </Link>
              </div>

                <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm lg:hidden">
                  <MenuIcon className="h-5 w-5" />
                </button>
            </header>

            <div className="grid gap-8 pt-10 md:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
              <div className="max-w-[560px] pt-2 md:pt-6">
                <h1 className="text-[34px] font-black leading-[0.98] tracking-[-0.045em] text-slate-900 sm:text-[48px] lg:text-[60px]">
                  Semua kebutuhan perjalanan Anda,
                  <span className="mt-1 block text-[#ef2f2c]">dalam satu platform</span>
                </h1>
                <p className="mt-5 max-w-[500px] text-[15px] leading-7 text-slate-700 sm:text-[16px]">
                  Pesawat, hotel, kereta, bus, kapal, aktivitas, dan paket wisata terbaik untuk Anda.
                </p>
              </div>

              <div className="hidden min-h-[240px] lg:block" />
            </div>

            <div className="relative z-10 mt-8 md:mt-12">
              <div className="overflow-hidden rounded-[24px] border border-[#e7e8ee] bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.24)] backdrop-blur">
                <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-4 py-3 text-sm font-semibold text-slate-700 md:px-5">
                  {heroTabs.map((tab, index) => {
                    const Icon = serviceCards[index]?.icon ?? PlaneIcon

                    return (
                      <button
                        key={tab.label}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 transition ${
                          index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent hover:text-slate-900"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.badge ? <span className="rounded-full bg-[#ff4d4f] px-1.5 py-0.5 text-[10px] text-white">New</span> : null}
                      </button>
                    )
                  })}
                </div>

                <div className="grid gap-0 px-4 py-4 md:grid-cols-[1fr_1fr_1fr_1fr_1.15fr_auto] md:px-5 md:py-4">
                  <SearchField label="Dari" value="Jakarta (CGK)" sublabel="Soekarno Hatta Intl." withSwap />
                  <SearchField label="Ke" value="Bali / Denpasar (DPS)" sublabel="Ngurah Rai Intl." />
                  <SearchField label="Tanggal Berangkat" value="25 Mei 2026" sublabel="Senin" />
                  <SearchField label="Tanggal Pulang" value="28 Mei 2026" sublabel="Kamis" />
                  <SearchField label="Penumpang & Kelas" value="1 Dewasa, Ekonomi" sublabel="" withChevron />
                  <Link
                    href="/packages"
                    className="m-2 inline-flex min-h-[72px] items-center justify-center rounded-xl bg-[#ef3b2d] px-8 text-base font-semibold text-white shadow-[0_20px_45px_-25px_rgba(239,59,45,0.95)] transition hover:bg-[#dd2f21]"
                  >
                    Cari Tiket
                  </Link>
                </div>

                <div className="grid gap-3 border-t border-slate-200/80 px-4 py-4 text-sm text-slate-600 md:grid-cols-4 md:px-5">
                  <BenefitItem icon={PriceTagIcon} text="Harga terbaik setiap hari" />
                  <BenefitItem icon={ShieldIcon} text="Transaksi aman & terpercaya" />
                  <BenefitItem icon={HeadsetIcon} text="Customer support 24/7" />
                  <BenefitItem icon={CardIcon} text="Pembayaran fleksibel" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-5 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
            {serviceCards.map((card) => {
              const Icon = card.icon

              return (
                <div
                  key={card.label}
                  className={`rounded-[18px] border border-slate-200 bg-gradient-to-b ${card.tone} px-4 py-5 text-center shadow-[0_12px_28px_-24px_rgba(15,23,42,0.22)]`}
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-white ${card.iconTone} shadow-sm`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-bold text-slate-900">{card.label}</h3>
                  <p className="mt-2 text-[13px] leading-5 text-slate-500">{card.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {promoCards.map((card) => (
              <article
                key={card.title}
                className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${card.gradient} px-5 py-5 text-white shadow-[0_22px_48px_-30px_rgba(15,23,42,0.28)]`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{ backgroundImage: `url('${card.image}')` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0)_45%,rgba(255,255,255,0.08)_100%)]" />
                <div className="relative z-10 max-w-[240px]">
                  <h3 className="whitespace-pre-line text-[22px] font-bold leading-[1.08] tracking-[-0.03em]">{card.title}</h3>
                  <p className="mt-5 text-sm text-white/90">{card.title.includes("Hotel") ? "Diskon hingga" : card.title.includes("Paket") ? "Mulai dari" : "Diskon hingga"}</p>
                  <p className="mt-1 text-[24px] font-black leading-none">{card.price}</p>
                  <button className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm">
                    {card.cta}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ef3b2d]" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-300" />
          </div>
        </section>

        <SectionHeading title="Paling Banyak Dipesan" showTabs />
        <section className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {popularBookings.map((item) => (
                <article key={item.title} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.24)]">
                <div className="relative h-[160px] overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center transition duration-500 hover:scale-105" style={{ backgroundImage: `url('${item.image}')` }} />
                  <button className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-slate-700 shadow-sm">
                    <HeartIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-[#4492ff]">{item.category}</p>
                  <h3 className="mt-2 text-[16px] font-bold leading-6 tracking-[-0.03em] text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                  <p className="mt-4 text-xs text-slate-400">Mulai dari</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-[15px] font-black tracking-[-0.03em] text-slate-900">{item.price}</p>
                    <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
                      <StarIcon className="h-4 w-4 text-[#f59e0b]" />
                      {item.rating}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <SectionHeading title="Destinasi Populer" />
        <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {destinations.map((destination) => (
              <article key={destination.name} className="group relative h-[140px] overflow-hidden rounded-[14px]">
                <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${destination.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.7)_100%)]" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <h3 className="text-[18px] font-bold leading-none tracking-[-0.03em]">{destination.name}</h3>
                  <p className="mt-1 text-sm text-white/90">{destination.country}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-3 sm:px-6 lg:px-8">
          <h2 className="text-[30px] font-black tracking-[-0.04em] text-slate-900">Keunggulan RedFeng</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {advantages.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="flex gap-4 rounded-[22px] bg-white px-1 py-1">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 lg:px-8">
          <h2 className="text-[30px] font-black tracking-[-0.04em] text-slate-900">Partner Resmi Kami</h2>
          <div className="mt-5 grid gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-[0_22px_55px_-36px_rgba(15,23,42,0.28)] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {partnerLogos.map((logo) => (
              <div key={logo} className="flex items-center justify-center text-center text-xl font-black italic text-slate-600">
                {logo}
              </div>
            ))}
          </div>
        </section>

        <SectionHeading title="Apa Kata Mereka?" />
        <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.25)]">
                <div className="flex items-center gap-4">
                  <div
                    className="h-14 w-14 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${item.avatar}')` }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-500">{item.city}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.body}</p>
                <div className="mt-4 flex gap-1 text-[#f59e0b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarIcon key={index} className="h-4 w-4" />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 pt-2 sm:px-6 lg:px-8">
          <div
            className="overflow-hidden rounded-t-[30px] bg-cover bg-center px-5 py-8 text-white md:px-10 md:py-10"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(102,16,24,0.92) 0%, rgba(139,29,36,0.88) 40%, rgba(62,16,84,0.86) 100%), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80')",
            }}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-[32px] font-black leading-none tracking-[-0.04em]">Dapatkan promo terbaru dari RedFeng!</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
                  Berlangganan newsletter kami dan nikmati penawaran eksklusif untuk perjalanan Anda.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[360px_auto]">
                <input
                  type="email"
                  placeholder="Masukkan email Anda"
                  className="h-12 rounded-xl border border-white/20 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                />
                <button className="h-12 rounded-xl bg-[#ef3b2d] px-6 text-sm font-semibold text-white shadow-[0_20px_40px_-20px_rgba(239,59,45,0.9)]">
                  Langganan
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-[#0e1a2b] text-white">
          <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-10 sm:px-6 lg:px-8">
            <div className="grid gap-10 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_1fr]">
              <div>
                <Link href="/" className="flex items-center gap-2.5">
                  <Image src="/logo-redfeng2.png" alt="RedFeng" width={146} height={54} className="h-10 w-auto" />
                </Link>
                <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
                  Platform perjalanan terlengkap untuk semua kebutuhan Anda. Booking mudah, cepat, dan aman.
                </p>
                <div className="mt-5 flex gap-3 text-slate-300">
                  <SocialCircle label="ig" />
                  <SocialCircle label="fb" />
                  <SocialCircle label="yt" />
                  <SocialCircle label="tt" />
                </div>
              </div>

              <FooterColumn
                title="Perusahaan"
                items={["Tentang Kami", "Karir", "Blog", "Kontak Kami"]}
              />
              <FooterColumn title="Bantuan" items={["Pusat Bantuan", "Cara Pemesanan", "Pembayaran", "Kebijakan & Privasi"]} />
              <FooterColumn title="Partner" items={["Jadi Partner", "Affiliate", "Kerja Sama Korporat"]} />

              <div>
                <h3 className="text-lg font-bold">Metode Pembayaran</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-2">
                  {paymentBadges.map((badge) => (
                    <div
                      key={badge}
                      className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white px-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700"
                    >
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
              <p>© 2026 RedFeng. All rights reserved.</p>
              <div className="flex gap-5">
                <a href="/terms" className="transition hover:text-white">
                  Syarat & Ketentuan
                </a>
                <a href="/privacy" className="transition hover:text-white">
                  Kebijakan Privasi
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}

function SectionHeading({ title, showTabs = false }: { title: string; showTabs?: boolean }) {
  const tabs = ["Semua", "Pesawat", "Hotel", "Paket Wisata", "Kereta"]

  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-4 pt-7 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <h2 className="text-[30px] font-black tracking-[-0.04em] text-slate-900">{title}</h2>
          {showTabs ? (
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    index === 0 ? "bg-[#fff1ef] text-[#ef3b2d]" : "text-slate-500 hover:bg-slate-100"
                  }`}
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
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-[15px] font-bold text-slate-900">{value}</p>
      {sublabel ? <p className="mt-1 text-xs text-slate-400">{sublabel}</p> : <p className="mt-1 text-xs text-transparent">.</p>}
      {withSwap ? (
        <span className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
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

function BenefitItem({ icon: Icon, text }: { icon: React.ComponentType<IconProps>; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  )
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="transition hover:text-white">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialCircle({ label }: { label: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase">
      {label}
    </div>
  )
}

function PlaneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 13.5l7-1.7 6.8-7.2 2.2 2.2-5.6 8 4.6 3.1-1.8 1.8-5.8-2-2.2 2.7H5.6l1.9-4.6-4.5-2.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function BuildingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 20h18M8 9h2M8 12h2M8 15h2M13 9h2M13 12h2M13 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function TrainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="4" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 18h8M9 9h2M13 9h2M8 13h8M9 18l-2 2M15 18l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4h10a2 2 0 0 1 2 2v7.5A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8h8M7.5 17 7 20M17 20l-.5-3M8.5 13h.01M15.5 13h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CruiseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 16h16l-2 3H6l-2-3Zm5-8h6l1 8H8l1-8Zm1-3h4v3h-4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function TicketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v2a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 16.5 18h-9A2.5 2.5 0 0 1 5 15.5v-1a2 2 0 1 0 0-4v-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.6 2.6" />
    </svg>
  )
}

function PalmIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 20v-6M12 14c0-4 1.7-7 5-9M12 14c0-4-1.7-7-5-9M12 11c2.8 0 5-1.4 6.5-4M12 11c-2.8 0-5-1.4-6.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 20h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PriceTagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m12 4 7 7-8.5 8.5a2 2 0 0 1-2.8 0L4.5 16.3a2 2 0 0 1 0-2.8L13 5a2 2 0 0 1 1.4-.6H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16.5" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3.5 19 6v5.5c0 4.3-2.6 7.3-7 9-4.4-1.7-7-4.7-7-9V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9.5 12 1.7 1.7L14.8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HeadsetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="16.5" y="11" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18.5 18a3 3 0 0 1-3 3H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="7" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="m12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.1 7.2 18.7l.9-5.4-3.9-3.8 5.4-.8L12 3.8Z" />
    </svg>
  )
}

function SwapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 7h10M13.5 3.5 17 7l-3.5 3.5M17 17H7M10.5 20.5 7 17l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 6h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L21 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.3" fill="currentColor" />
      <circle cx="18" cy="19" r="1.3" fill="currentColor" />
    </svg>
  )
}

function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
