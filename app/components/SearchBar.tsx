"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"
import { isQuotaTravelStyle, travelStyleOptions } from "@/lib/travelStyles"

export default function SearchBar({ locale }: { locale: Locale }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = dictionaries[locale].searchBar

  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")
  const [departureDate, setDepartureDate] = useState(searchParams.get("departure_date") || "")

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

    if (isQuotaTravelStyle(style) && departureDate) {
      params.set("departure_date", departureDate)
    } else {
      params.delete("departure_date")
    }

    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="bg-white border-b shadow-sm px-8 py-4">
      <div className="max-w-[1360px] mx-auto flex flex-wrap gap-4 items-end">

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t.countryLabel}
          </span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="border rounded-xl px-4 py-3 w-[240px]"
          >
            <option value="">{t.allCountries}</option>
            <option value="indonesia">Indonesia</option>
            <option value="japan">Japan</option>
            <option value="singapore">Singapore</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
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
            className="border rounded-xl px-4 py-3 w-[240px]"
          >
            <option value="">{t.allStyles}</option>
            {travelStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isQuotaTravelStyle(style) && (
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t.departureDateLabel}
            </span>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="border rounded-xl px-4 py-3 w-[220px]"
              aria-label={t.departureDateLabel}
            />
            <span className="text-xs text-slate-500">{t.departureDateHint}</span>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t.durationLabel}
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="border rounded-xl px-4 py-3 w-[200px]"
          >
            <option value="">{t.allDurations}</option>
            <option value="1-3">1-3 {t.day}</option>
            <option value="4-7">4-7 {t.day}</option>
            <option value="8+">8+ {t.day}</option>
          </select>
        </label>

        <button
          onClick={applyFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
        >
          {t.apply}
        </button>
      </div>
    </div>
  )
}
