"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { dictionaries, type Locale } from "@/lib/i18n"

export default function PublicHeader({ locale }: { locale: Locale }) {
  const router = useRouter()
  const t = dictionaries[locale].header

  const changeLocale = async (nextLocale: Locale) => {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })
    router.refresh()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <a href="https://redfeng.co/" className="flex items-center gap-3">
            <Image
              src="/logo-redfeng.png"
              alt="Red Feng"
              width={295}
              height={101}
              priority
              className="h-16 w-auto md:h-20"
            />
          </a>

          <nav className="hidden flex-wrap items-center gap-8 text-[15px] font-medium text-slate-700 lg:flex">
            <a href="https://redfeng.co/promo/" className="hover:text-orange-600">{t.promo}</a>
            <a href="https://redfeng.co/pesanan/" className="hover:text-orange-600">{t.orders}</a>
            <a href="https://redfeng.co/kemitraan_tour/" className="hover:text-orange-600">{t.partnerTour}</a>
            <a href="https://redfeng.co/verifikasi-invoice/" className="hover:text-orange-600">{t.verifyInvoice}</a>
            <a href="https://redfeng.co/bantuan/" className="hover:text-orange-600">{t.help}</a>
            <details className="relative">
              <summary className="list-none cursor-pointer hover:text-orange-600">{t.language}</summary>
              <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button type="button" onClick={() => changeLocale("id")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langId}</button>
                <button type="button" onClick={() => changeLocale("en")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langEn}</button>
                <button type="button" onClick={() => changeLocale("zh")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langZh}</button>
                <button type="button" onClick={() => changeLocale("th")} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100">{t.langTh}</button>
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
              {t.account}
            </button>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center gap-5 text-[15px] font-medium text-slate-700">
          <a href="https://redfeng.co/paket-tour/" className="hover:text-orange-600">{t.packageTour}</a>
          <a href="https://redfeng.co/pesawat/" className="hover:text-orange-600">{t.flight}</a>
          <a href="https://redfeng.co/hotel/" className="hover:text-orange-600">{t.hotel}</a>
          <a href="https://redfeng.co/bus-travel/" className="hover:text-orange-600">{t.busTravel}</a>
          <a href="https://redfeng.co/kereta_api/" className="hover:text-orange-600">{t.train}</a>
          <a href="https://redfeng.co/kapal_laut/" className="hover:text-orange-600">{t.seaShip}</a>
          <a href="https://redfeng.co/kapal_pesiar/" className="hover:text-orange-600">{t.cruise}</a>
        </nav>
      </div>
    </header>
  )
}
