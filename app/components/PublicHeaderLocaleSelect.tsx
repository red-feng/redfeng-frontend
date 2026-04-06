"use client"

import { type Locale } from "@/lib/i18n"

export default function PublicHeaderLocaleSelect({
  locale,
  availableLocales,
  labels,
}: {
  locale: Locale
  availableLocales: Locale[]
  labels: {
    language: string
    langId: string
    langEn: string
    langZh: string
  }
}) {
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
      <span className="sr-only">{labels.language}</span>
      <select
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale
          if (nextLocale !== locale) {
            void changeLocale(nextLocale)
          }
        }}
        className="min-h-[40px] appearance-none rounded-full border border-orange-100 bg-white/90 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:text-orange-600 focus:border-orange-200 focus:text-orange-600 sm:border-transparent sm:bg-transparent sm:py-1 sm:pl-1 sm:shadow-none"
      >
        {availableLocales.includes("id") && <option value="id">{labels.langId}</option>}
        {availableLocales.includes("en") && <option value="en">{labels.langEn}</option>}
        {availableLocales.includes("zh") && <option value="zh">{labels.langZh}</option>}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </span>
    </label>
  )
}
