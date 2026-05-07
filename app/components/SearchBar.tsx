"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, travelStyleOptions } from "@/lib/travelStyles"

type SearchBarProps = {
  locale: Locale
  countries: string[]
  destinationPath?: string
  submitLabel?: string
  variant?: "default" | "catalog"
}

const localizedCountryLabels: Record<string, { id: string; en: string; zh: string }> = {
  indonesia: { id: "Indonesia", en: "Indonesia", zh: "å°å°¼" },
  japan: { id: "Jepang", en: "Japan", zh: "æ—¥æœ¬" },
  singapore: { id: "Singapura", en: "Singapore", zh: "æ–°åŠ å¡" },
  china: { id: "China", en: "China", zh: "ä¸­å›½" },
  thailand: { id: "Thailand", en: "Thailand", zh: "æ³°å›½" },
  malaysia: { id: "Malaysia", en: "Malaysia", zh: "é©¬æ¥è¥¿äºš" },
  vietnam: { id: "Vietnam", en: "Vietnam", zh: "è¶Šå—" },
  korea: { id: "Korea", en: "Korea", zh: "éŸ©å›½" },
  "south korea": { id: "Korea Selatan", en: "South Korea", zh: "éŸ©å›½" },
  "saudi arabia": { id: "Arab Saudi", en: "Saudi Arabia", zh: "æ²™ç‰¹é˜¿æ‹‰ä¼¯" },
}

function formatCountryLabel(country: string, locale: Locale) {
  const normalized = country.trim().toLowerCase()
  const match = localizedCountryLabels[normalized]
  if (match) return match[locale]
  return country
}

function CountryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z" />
      <path d="M4.5 9.5h15M4.5 14.5h15M12 4c2.1 2.3 3.2 5 3.2 8s-1.1 5.7-3.2 8c-2.1-2.3-3.2-5-3.2-8s1.1-5.7 3.2-8Z" />
    </svg>
  )
}

function StyleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M7 20V9.8a2.2 2.2 0 0 1 .64-1.55L12 4l4.36 4.25A2.2 2.2 0 0 1 17 9.8V20" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  )
}

function DurationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </svg>
  )
}

function ChevronMark() {
  return <span className="text-lg leading-none text-slate-400">⌄</span>
}

export default function SearchBar({
  locale,
  countries,
  destinationPath,
  submitLabel,
  variant = "default",
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = dictionaries[locale].searchBar
  const [isPending, startTransition] = useTransition()

  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")
  const isCatalogVariant = variant === "catalog"

  const countryOptions = useMemo(() => {
    const uniqueCountries = [...new Set(countries.map((value) => value.trim()).filter(Boolean))]

    if (country && !uniqueCountries.includes(country)) {
      return [country, ...uniqueCountries]
    }

    return uniqueCountries
  }, [countries, country])

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (country) params.set("country", country)
    else params.delete("country")

    if (style) params.set("style", style)
    else params.delete("style")

    if (duration) params.set("duration", duration)
    else params.delete("duration")

    params.delete("departure_date")
    params.delete("page")

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    const targetPath = destinationPath || pathname
    if (targetPath === pathname && nextQuery === currentQuery) return

    startTransition(() => {
      router.push(nextQuery ? `${targetPath}?${nextQuery}` : targetPath, { scroll: false })
    })
  }

  const loadingLabel = locale === "en" ? "Loading..." : locale === "zh" ? "åŠ è½½ä¸­..." : "Memuat..."

  if (isCatalogVariant) {
    return (
      <div className={`relative transition-opacity duration-200 ${isPending ? "opacity-75" : "opacity-100"}`}>
        {isPending ? (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[30px]">
            <div className="absolute inset-0 bg-white/28 backdrop-blur-[1px]" />
            <div className="absolute left-0 top-0 h-full w-24 -translate-x-full animate-[searchBarLoading_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        ) : null}

        <div className="rounded-[28px] border border-white/70 bg-white/24 p-3 shadow-[0_26px_50px_-34px_rgba(15,23,42,0.32)] backdrop-blur-md sm:rounded-[30px] sm:p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.22)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-orange-500">
                <CountryIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  {t.countryLabel}
                </span>
                <select
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  disabled={isPending}
                  className="mt-1 w-full appearance-none bg-transparent text-[14px] font-semibold text-slate-900 outline-none sm:text-[15px]"
                >
                  <option value="">{t.allCountries}</option>
                  {countryOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatCountryLabel(option, locale)}
                    </option>
                  ))}
                </select>
              </span>
              <span className="shrink-0 text-slate-400 transition group-focus-within:text-orange-500">
                <ChevronMark />
              </span>
            </label>

            <label className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.22)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-orange-500">
                <StyleIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  {t.styleLabel}
                </span>
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  disabled={isPending}
                  className="mt-1 w-full appearance-none bg-transparent text-[14px] font-semibold text-slate-900 outline-none sm:text-[15px]"
                >
                  <option value="">{t.allStyles}</option>
                  {travelStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {formatTravelStyleLabel(option.value, locale)}
                    </option>
                  ))}
                </select>
              </span>
              <span className="shrink-0 text-slate-400 transition group-focus-within:text-orange-500">
                <ChevronMark />
              </span>
            </label>

            <label className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_18px_30px_-24px_rgba(15,23,42,0.22)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-orange-500">
                <DurationIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                  {t.durationLabel}
                </span>
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  disabled={isPending}
                  className="mt-1 w-full appearance-none bg-transparent text-[14px] font-semibold text-slate-900 outline-none sm:text-[15px]"
                >
                  <option value="">{t.allDurations}</option>
                  <option value="1-3">1-3 {t.day}</option>
                  <option value="4-7">4-7 {t.day}</option>
                  <option value="8+">8+ {t.day}</option>
                </select>
              </span>
              <span className="shrink-0 text-slate-400 transition group-focus-within:text-orange-500">
                <ChevronMark />
              </span>
            </label>

            <button
              type="button"
              onClick={applyFilter}
              disabled={isPending}
              className="rounded-[22px] bg-gradient-to-r from-[#ff6934] via-[#ff5d2d] to-[#ef4423] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_22px_34px_-24px_rgba(239,68,35,0.9)] transition hover:-translate-y-0.5 hover:from-[#ff5d2d] hover:to-[#ea3b1c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending
                ? loadingLabel
                : submitLabel || (locale === "en" ? "Apply Filter" : locale === "zh" ? "åº”ç”¨ç­›é€‰" : "Terapkan Filter")}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes searchBarLoading {
            from {
              transform: translateX(-120%);
            }
            to {
              transform: translateX(680%);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] px-4 py-4 backdrop-blur sm:px-6 md:px-8 md:py-5">
      <div className="mx-auto max-w-[1360px] rounded-[28px] border border-orange-100/80 bg-[linear-gradient(145deg,#ffffff_0%,#fffaf4_52%,#fff1e6_100%)] p-4 shadow-[0_20px_55px_-28px_rgba(249,115,22,0.28)] sm:rounded-[28px] sm:p-5 md:p-6">
        <div className={`relative transition-opacity duration-200 ${isPending ? "opacity-75" : "opacity-100"}`}>
          {isPending ? (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[24px]">
              <div className="absolute inset-0 bg-white/45 backdrop-blur-[1px]" />
              <div className="absolute left-0 top-0 h-full w-24 -translate-x-full animate-[searchBarLoading_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </div>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-500">Red Feng Mobile</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {locale === "en"
                  ? "Find your next trip quickly"
                  : locale === "zh"
                    ? "å¿«é€Ÿæ‰¾åˆ°ä¸‹ä¸€æ®µæ—…ç¨‹"
                    : "Cari paket perjalananmu lebih cepat"}
              </p>
            </div>
            <div className="rounded-full border border-orange-100 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-orange-600 shadow-sm">
              {country ? formatCountryLabel(country, locale) : t.allCountries}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)_auto] xl:items-end">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
                {t.countryLabel}
              </span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={isPending}
                className="h-12 rounded-2xl border border-orange-100 bg-white/95 px-4 text-[14px] font-medium text-slate-800 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 sm:h-14 sm:text-[15px]"
              >
                <option value="">{t.allCountries}</option>
                {countryOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatCountryLabel(option, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
                {t.styleLabel}
              </span>
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                disabled={isPending}
                className="h-12 rounded-2xl border border-orange-100 bg-white/95 px-4 text-[14px] font-medium text-slate-800 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 sm:h-14 sm:text-[15px]"
              >
                <option value="">{t.allStyles}</option>
                {travelStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {formatTravelStyleLabel(option.value, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
                {t.durationLabel}
              </span>
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                disabled={isPending}
                className="h-12 rounded-2xl border border-orange-100 bg-white/95 px-4 text-[14px] font-medium text-slate-800 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 sm:h-14 sm:text-[15px]"
              >
                <option value="">{t.allDurations}</option>
                <option value="1-3">1-3 {t.day}</option>
                <option value="4-7">4-7 {t.day}</option>
                <option value="8+">8+ {t.day}</option>
              </select>
            </label>

            <button
              onClick={applyFilter}
              disabled={isPending}
              className="h-12 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 px-6 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.85)] transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:px-7 sm:text-[15px]"
            >
              {isPending ? loadingLabel : submitLabel || t.apply}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes searchBarLoading {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(680%);
          }
        }
      `}</style>
    </div>
  )
}
