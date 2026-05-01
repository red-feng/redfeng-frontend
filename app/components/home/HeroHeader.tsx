import Image from "next/image"
import Link from "next/link"
import { BellIcon, ChevronDownIcon, MenuIcon } from "@/app/components/home/homeContent"

export default function HeroHeader() {
  return (
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
  )
}
