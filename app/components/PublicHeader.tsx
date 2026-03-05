import Image from "next/image"
import Link from "next/link"

export default function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={300}
              height={106}
              priority
              className="h-25 w-auto md:h-27"
            />
          </div>

          <nav className="hidden flex-wrap items-center gap-8 text-[15px] font-medium text-slate-700 lg:flex">
            <Link href="#" className="hover:text-orange-600">Promo</Link>
            <Link href="#" className="hover:text-orange-600">Pesanan</Link>
            <Link href="#" className="hover:text-orange-600">Kemitraan Tour</Link>
            <Link href="#" className="hover:text-orange-600">Verifikasi Invoice Tour</Link>
            <Link href="#" className="hover:text-orange-600">Bantuan</Link>
            <Link href="#" className="hover:text-orange-600">Bahasa</Link>
          </nav>

          <div className="flex items-center gap-5">
            <button type="button" className="text-slate-600 hover:text-orange-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.65 16.65" />
              </svg>
            </button>
            <button
              type="button"
              className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Akun Saya
            </button>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center gap-5 text-[15px] font-medium text-slate-700">
          <Link href="#" className="hover:text-orange-600">Paket Tour</Link>
          <Link href="#" className="hover:text-orange-600">Pesawat</Link>
          <Link href="#" className="hover:text-orange-600">Hotel</Link>
          <Link href="#" className="hover:text-orange-600">Bus &amp; Travel</Link>
          <Link href="#" className="hover:text-orange-600">Kereta Api</Link>
          <Link href="#" className="hover:text-orange-600">Kapal Laut</Link>
          <Link href="#" className="hover:text-orange-600">Kapal Pesiar</Link>
        </nav>
      </div>
    </header>
  )
}
