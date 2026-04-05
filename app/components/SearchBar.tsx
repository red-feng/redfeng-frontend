"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, isQuotaTravelStyle, travelStyleOptions } from "@/lib/travelStyles"

type SearchBarProps = {
  locale: Locale
  countries: string[]
}

const localizedCountryLabels: Record<string, { id: string; en: string; zh: string }> = {
  indonesia: { id: "Indonesia", en: "Indonesia", zh: "印度尼西亚" },
  japan: { id: "Jepang", en: "Japan", zh: "日本" },
  singapore: { id: "Singapura", en: "Singapore", zh: "新加坡" },
  china: { id: "China", en: "China", zh: "中国" },
  thailand: { id: "Thailand", en: "Thailand", zh: "泰国" },
  malaysia: { id: "Malaysia", en: "Malaysia", zh: "马来西亚" },
  vietnam: { id: "Vietnam", en: "Vietnam", zh: "越南" },
  korea: { id: "Korea", en: "Korea", zh: "韩国" },
  "south korea": { id: "Korea Selatan", en: "South Korea", zh: "韩国" },
  "saudi arabia": { id: "Arab Saudi", en: "Saudi Arabia", zh: "沙特阿拉伯" },
}

function formatCountryLabel(country: string, locale: Locale) {
  const normalized = country.trim().toLowerCase()
  const match = localizedCountryLabels[normalized]
  if (match) return match[locale]
  return country
}

export default function SearchBar({ locale, countries }: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = dictionaries[locale].searchBar

  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")
  const [departureDate, setDepartureDate] = useState(searchParams.get("departure_date") || "")
  const showDepartureDate = isQuotaTravelStyle(style)
  const countryOptions = useMemo(() => {
    const uniqueCountries = [...new Set(countries.map((value) => value.trim()).filter(Boolean))]

    if (country && !uniqueCountries.includes(country)) {
      return [country, ...uniqueCountries]
    }

    return uniqueCountries
  }, [countries, country])

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (country) {
      params.set("country", country)
    } else {
      params.delete("country")
    }

    if (style) {
      params.set("style", style)
    } else {
      params.delete("style")
    }

    if (duration) {
      params.set("duration", duration)
    } else {
      params.delete("duration")
    }

    if (showDepartureDate && departureDate) {
      params.set("departure_date", departureDate)
    } else {
      params.delete("departure_date")
    }

    params.delete("page")
    const nextQuery = params.toString()
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }

  return (
    <div className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur md:px-8">
      <div className="mx-auto max-w-[1360px] rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] md:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-[220px] flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              {t.countryLabel}
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">{t.allCountries}</option>
              {countryOptions.map((option) => (
                <option key={option} value={option}>
                  {formatCountryLabel(option, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[220px] flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              {t.styleLabel}
            </span>
            <select
              value={style}
              onChange={(e) => {
                const nextStyle = e.target.value
                setStyle(nextStyle)
                if (!isQuotaTravelStyle(nextStyle)) {
                  setDepartureDate("")
                }
              }}
              className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">{t.allStyles}</option>
              {travelStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {formatTravelStyleLabel(option.value, locale)}
                </option>
              ))}
            </select>
          </label>

          {showDepartureDate && (
            <label className="flex min-w-[220px] flex-1 flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {t.departureDateLabel}
              </span>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                aria-label={t.departureDateLabel}
              />
            </label>
          )}

          <label className="flex min-w-[190px] flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              {t.durationLabel}
            </span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            >
              <option value="">{t.allDurations}</option>
              <option value="1-3">1-3 {t.day}</option>
              <option value="4-7">4-7 {t.day}</option>
              <option value="8+">8+ {t.day}</option>
            </select>
          </label>

          <button
            onClick={applyFilter}
            className="h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 text-[15px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(249,115,22,0.9)] transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-orange-500"
          >
            {t.apply}
          </button>
        </div>
      </div>
    </div>
  )
}
