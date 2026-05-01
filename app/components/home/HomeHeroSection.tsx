import Image from "next/image"
import Link from "next/link"
import {
  BellIcon,
  CardIcon,
  ChevronDownIcon,
  heroBenefits,
  heroTabs,
  MenuIcon,
  SwapIcon,
} from "@/app/components/home/homeContent"

export default function HomeHeroSection() {
  return (
    <section>
      <div className="overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,194,155,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(148,197,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
          <div className="absolute inset-0 hidden lg:block">
            <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,245,0.96)_0%,rgba(255,250,245,0.88)_16%,rgba(255,250,245,0.56)_30%,rgba(255,250,245,0.18)_46%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_100%)]" />
          </div>

          <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-5 sm:px-6 lg:px-8">
            <header className="relative z-10 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/home-assets/logo-redfeng-header.png" alt="RedFeng" width={240} height={80} priority className="h-10 w-auto sm:h-11" />
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

              <div className="flex items-center gap-2 lg:hidden">
                <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm">
                  <BellIcon className="h-5 w-5" />
                </button>
                <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-slate-700 shadow-sm">
                  <MenuIcon className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="absolute inset-0 lg:hidden">
              <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-[66%_center]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.88)_38%,rgba(255,255,255,0.2)_72%,rgba(255,255,255,0.02)_100%),linear-gradient(180deg,rgba(255,252,247,0.65)_0%,rgba(255,252,247,0.12)_100%)]" />
            </div>

            <div className="relative z-10 pt-8 lg:pt-12">
              <div className="max-w-[520px] pb-44 lg:min-h-[430px] lg:pb-0">
                <h1 className="text-[28px] font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-[48px] lg:text-[60px]">
                  Semua kebutuhan
                  <span className="block">perjalanan Anda,</span>
                  <span className="mt-1 block text-[#ff5a43]">dalam satu platform</span>
                </h1>
                <p className="mt-4 max-w-[330px] text-[15px] leading-8 text-slate-700 sm:text-[16px] sm:leading-8">
                  Pesawat, hotel, kereta, bus, kapal, aktivitas, dan paket wisata terbaik untuk Anda.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-36 max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_16px_30px_-28px_rgba(15,23,42,0.08)]">
            <HeroTabs />
            <HeroSearchPanel />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroTabs() {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-4 py-4 text-sm font-semibold text-slate-700 sm:px-5">
      {heroTabs.map((tab, index) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.label}
            className={`flex shrink-0 flex-col items-center gap-2 border-b-2 px-3 py-2 text-[13px] lg:flex-row lg:text-sm ${index > 3 ? "hidden lg:flex" : ""} ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-slate-500"}`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.badge ? <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] text-white">Baru</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function HeroSearchPanel() {
  return (
    <div className="px-4 py-5 lg:px-6 lg:py-6">
      <div className="hidden flex-wrap gap-6 text-[13px] text-slate-600 lg:flex">
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

      <HeroSearchMobile />
      <HeroSearchDesktop />

      <div className="mt-6 grid grid-cols-4 gap-4 border-t border-slate-200/80 pt-5 text-sm text-slate-600">
        {heroBenefits.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium leading-5 text-slate-600">{item.title}</span>
            </div>
          )
        })}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
            <CardIcon className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-medium leading-5 text-slate-600">Pembayaran fleksibel</span>
        </div>
      </div>
    </div>
  )
}

function HeroSearchMobile() {
  return (
    <div className="lg:hidden">
      <SearchField label="Dari" value="Jakarta (CGK)" sublabel="Soekarno Hatta Intl." withSwap />
      <SearchField label="Ke" value="Bali / Denpasar (DPS)" sublabel="Ngurah Rai Intl." />
      <div className="grid grid-cols-3">
        <SearchField label="Berangkat" value="25 Mei 2026" sublabel="Minggu" compact />
        <SearchField label="Pulang" value="28 Mei 2026" sublabel="Rabu" compact />
        <SearchField label="Penumpang" value="1 Dewasa" sublabel="Ekonomi" withChevron compact />
      </div>
      <Link href="/packages" className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-[16px] bg-[#ff3a31] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        Cari Tiket
      </Link>
    </div>
  )
}

function HeroSearchDesktop() {
  return (
    <div className="hidden gap-3 lg:mt-5 lg:grid lg:grid-cols-[1.22fr_44px_1.22fr_0.86fr_0.86fr_1fr_auto] lg:items-center">
      <SearchField label="Dari" value="CGK   Jakarta (Semua Bandara)" sublabel="" withSwap />
      <button className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)] lg:flex">
        <SwapIcon className="h-4 w-4" />
      </button>
      <SearchField label="Ke" value="DPS   Denpasar (Bali)" sublabel="" />
      <SearchField label="Berangkat" value="25 Mei 2026" sublabel="" />
      <SearchField label="Pulang" value="28 Mei 2026" sublabel="" />
      <SearchField label="Penumpang" value="1 Dewasa, Ekonomi" sublabel="" withChevron />
      <Link href="/packages" className="inline-flex min-h-[76px] items-center justify-center rounded-2xl bg-[#ff5a43] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        Cari Tiket
      </Link>
    </div>
  )
}

function SearchField({
  label,
  value,
  sublabel,
  withSwap = false,
  withChevron = false,
  compact = false,
}: {
  label: string
  value: string
  sublabel: string
  withSwap?: boolean
  withChevron?: boolean
  compact?: boolean
}) {
  return (
    <div className={`relative bg-[#fdfefe] ${compact ? "min-h-[108px] border-r border-t border-slate-200 px-4 py-4 first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5" : "border-t border-slate-200 px-4 py-4 first:rounded-t-[20px] last:border-b lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5"}`}>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 pr-8 text-[15px] font-bold text-slate-900">{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {withSwap ? (
        <span className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1f2937] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] lg:hidden">
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
