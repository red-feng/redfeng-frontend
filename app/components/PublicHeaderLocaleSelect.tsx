"use client"

import { type Locale } from "@/lib/i18n"
import { localeCurrencyMap } from "@/lib/package-pricing"

export default function PublicHeaderLocaleSelect({
  locale,
  availableLocales,
  labels,
  mode = "language",
  className,
  iconClassName,
}: {
  locale: Locale
  availableLocales: Locale[]
  labels: {
    language: string
    langId: string
    langEn: string
    langZh: string
  }
  mode?: "language" | "currency"
  className?: string
  iconClassName?: string
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

  const selectValue = mode === "currency" ? localeCurrencyMap[locale] : locale
  const baseClassName =
    mode === "currency"
      ? "min-h-[42px] appearance-none rounded-full border border-white/15 bg-white/[0.04] py-2 pl-3.5 pr-9 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition hover:border-white/25 hover:bg-white/[0.08] hover:text-[#ffd2c4] focus:border-white/35"
      : "min-h-[40px] appearance-none rounded-full border border-orange-100 bg-white/90 py-2 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:text-orange-600 focus:border-orange-200 focus:text-orange-600 sm:border-transparent sm:bg-transparent sm:py-1 sm:pl-1 sm:shadow-none"
  const arrowClassName = mode === "currency" ? "text-white" : "text-slate-400"

  return (
    <label className="relative block shrink-0">
      <span className="sr-only">{labels.language}</span>
      <select
        value={selectValue}
        onChange={(event) => {
          const nextLocale =
            mode === "currency"
              ? ({ IDR: "id", USD: "en", CNY: "zh" }[event.target.value] as Locale | undefined)
              : (event.target.value as Locale)
          if (nextLocale && nextLocale !== locale) {
            void changeLocale(nextLocale)
          }
        }}
        className={[baseClassName, className].filter(Boolean).join(" ")}
        >
          {availableLocales.includes("id") && (
            <option value={mode === "currency" ? "IDR" : "id"} className={mode === "currency" ? "text-slate-900" : undefined}>
              {mode === "currency" ? "IDR/ID" : labels.langId}
            </option>
          )}
          {availableLocales.includes("en") && (
            <option value={mode === "currency" ? "USD" : "en"} className={mode === "currency" ? "text-slate-900" : undefined}>
              {mode === "currency" ? "USD/EN" : labels.langEn}
            </option>
          )}
          {availableLocales.includes("zh") && (
            <option value={mode === "currency" ? "CNY" : "zh"} className={mode === "currency" ? "text-slate-900" : undefined}>
              {mode === "currency" ? "CNY/ZH" : labels.langZh}
            </option>
          )}
      </select>
      <span className={["pointer-events-none absolute inset-y-0 right-2 flex items-center", arrowClassName, iconClassName].filter(Boolean).join(" ")}>
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </span>
    </label>
  )
}
