import Link from "next/link"
import HeroSearchField from "@/app/components/home/HeroSearchField"

export default function HeroSearchMobile() {
  return (
    <div className="lg:hidden">
      <HeroSearchField label="Dari" value="Jakarta (CGK)" sublabel="Soekarno Hatta Intl." withSwap />
      <HeroSearchField label="Ke" value="Bali / Denpasar (DPS)" sublabel="Ngurah Rai Intl." />
      <div className="grid grid-cols-3">
        <HeroSearchField label="Berangkat" value="25 Mei 2026" sublabel="Minggu" compact />
        <HeroSearchField label="Pulang" value="28 Mei 2026" sublabel="Rabu" compact />
        <HeroSearchField label="Penumpang" value="1 Dewasa" sublabel="Ekonomi" withChevron compact />
      </div>
      <Link href="/packages" className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center rounded-[14px] bg-[#ff3a31] px-10 text-[15px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        Cari Tiket
      </Link>
    </div>
  )
}
