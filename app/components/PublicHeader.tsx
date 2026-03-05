import Image from "next/image"

export default function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={295}
              height={101}
              priority
              className="h-23 w-auto md:h-25"
            />
          </div>

          <nav className="hidden flex-wrap items-center gap-8 text-[15px] font-medium text-slate-700 lg:flex">
            <a href="https://redfeng.co/promo/" className="hover:text-orange-600">Promo</a>
            <a href="https://redfeng.co/pesanan/" className="hover:text-orange-600">Pesanan</a>
            <a href="https://redfeng.co/kemitraan_tour/" className="hover:text-orange-600">Kemitraan Tour</a>
            <a href="https://redfeng.co/verifikasi-invoice/" className="hover:text-orange-600">Verifikasi Invoice Tour</a>
            <a href="https://redfeng.co/bantuan/" className="hover:text-orange-600">Bantuan</a>
            <details className="relative">
              <summary className="list-none cursor-pointer hover:text-orange-600">Bahasa</summary>
              <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <a href="#" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">Indonesia</a>
                <a href="#" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">English</a>
                <a href="#" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">China</a>
                <a href="#" className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100">Thailand</a>
              </div>
            </details>
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
          <a href="https://redfeng.co/paket-tour/" className="hover:text-orange-600">Paket Tour</a>
          <a href="https://redfeng.co/pesawat/" className="hover:text-orange-600">Pesawat</a>
          <a href="https://redfeng.co/hotel/" className="hover:text-orange-600">Hotel</a>
          <a href="https://redfeng.co/bus-travel/" className="hover:text-orange-600">Bus &amp; Travel</a>
          <a href="https://redfeng.co/kereta_api/" className="hover:text-orange-600">Kereta Api</a>
          <a href="https://redfeng.co/kapal_laut/" className="hover:text-orange-600">Kapal Laut</a>
          <a href="https://redfeng.co/kapal_pesiar/" className="hover:text-orange-600">Kapal Pesiar</a>
        </nav>
      </div>
    </header>
  )
}
