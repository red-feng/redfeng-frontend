import Link from "next/link"
import HeroSearchField from "@/app/components/home/HeroSearchField"
import { SwapIcon } from "@/app/components/home/homeContent"

export default function HeroSearchDesktop() {
  return (
    <div className="hidden gap-3 lg:mt-5 lg:grid lg:grid-cols-[1.22fr_44px_1.22fr_0.86fr_0.86fr_1fr_auto] lg:items-center">
      <HeroSearchField label="Dari" value="CGK   Jakarta (Semua Bandara)" sublabel="" withSwap />
      <button className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)] lg:flex">
        <SwapIcon className="h-4 w-4" />
      </button>
      <HeroSearchField label="Ke" value="DPS   Denpasar (Bali)" sublabel="" />
      <HeroSearchField label="Berangkat" value="25 Mei 2026" sublabel="" />
      <HeroSearchField label="Pulang" value="28 Mei 2026" sublabel="" />
      <HeroSearchField label="Penumpang" value="1 Dewasa, Ekonomi" sublabel="" withChevron />
      <Link href="/packages" className="inline-flex min-h-[76px] items-center justify-center rounded-2xl bg-[#ff5a43] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        Cari Tiket
      </Link>
    </div>
  )
}
