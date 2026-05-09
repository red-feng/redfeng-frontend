"use client"

import { type Locale } from "@/lib/i18n"
import { localeCurrencyMap } from "@/lib/package-pricing"
import { ChevronDownIcon } from "@/app/components/home/shared/homeContent"

const localeByCurrency = {
  IDR: "id",
  USD: "en",
  CNY: "zh",
} as const satisfies Record<string, Locale>

export default function HeroHeaderCurrencySelect({ locale }: { locale: Locale }) {
  const currentCurrency = localeCurrencyMap[locale]

  const changeLocale = async (nextLocale: Locale) => {
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    })

    if (!response.ok) return
    window.location.reload()
  }

  return (
    <label className="relative block shrink-0">
      <span className="sr-only">Currency</span>
      <select
        value={currentCurrency}
        onChange={(event) => {
          const nextLocale = localeByCurrency[event.target.value as keyof typeof localeByCurrency]
          if (nextLocale && nextLocale !== locale) {
            void changeLocale(nextLocale)
          }
        }}
        className="min-h-[40px] appearance-none rounded-full bg-transparent py-2 pl-3 pr-8 text-sm font-medium text-white outline-none transition hover:bg-white/12 hover:text-[#ffd2c4]"
      >
        <option value="IDR" className="text-slate-900">
          IDR
        </option>
        <option value="USD" className="text-slate-900">
          USD
        </option>
        <option value="CNY" className="text-slate-900">
          CNY
        </option>
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white">
        <ChevronDownIcon className="h-4 w-4" />
      </span>
    </label>
  )
}
