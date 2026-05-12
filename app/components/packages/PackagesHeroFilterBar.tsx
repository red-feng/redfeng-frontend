"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, travelStyleOptions } from "@/lib/travelStyles"

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z" />
      <path d="M4.5 9.5h15M4.5 14.5h15M12 4c2.1 2.3 3.2 5 3.2 8s-1.1 5.7-3.2 8c-2.1-2.3-3.2-5-3.2-8s1.1-5.7 3.2-8Z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="9" cy="8.5" r="2.5" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M4.5 17c.8-2.3 2.7-3.8 5.3-3.8 2.6 0 4.5 1.5 5.3 3.8" />
      <path d="M14 16.5c.5-1.5 1.8-2.5 3.7-2.5 1.2 0 2.2.3 3 .9" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function PackagesHeroFilterBar({
  locale,
  countries,
  buttonLabel,
  labels,
}: {
  locale: Locale
  countries: string[]
  buttonLabel: string
  labels: {
    destination: string
    allDestinations: string
    duration: string
    allDurations: string
    type: string
    allTypes: string
  }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")

  const countryOptions = useMemo(
    () => [...new Set(countries.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [countries],
  )

  const applyFilter = () => {
    const params = new URLSearchParams()
    if (country) params.set("country", country)
    if (duration) params.set("duration", duration)
    if (style) params.set("style", style)

    startTransition(() => {
      router.push(params.toString() ? `/packages/catalog?${params.toString()}` : "/packages/catalog")
    })
  }

  return (
    <div className={`grid gap-2.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_200px] ${isPending ? "opacity-80" : "opacity-100"}`}>
      <label className="flex min-w-0 items-center gap-3 rounded-[22px] px-3.5 py-3 md:px-4.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
          <GlobeIcon />
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-slate-500">{labels.destination}</span>
            <span className="mt-1 flex items-center gap-2">
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
               className="w-full appearance-none bg-transparent text-[15px] font-semibold text-slate-950 outline-none"
            >
              <option value="">{labels.allDestinations}</option>
              {countryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="shrink-0 text-slate-400">
              <ChevronIcon />
            </span>
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-center gap-3 border-t border-slate-100 px-3.5 py-3 md:px-4.5 xl:border-l xl:border-t-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
          <CalendarIcon />
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-slate-500">{labels.duration}</span>
          <span className="mt-1 flex items-center gap-2">
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
               className="w-full appearance-none bg-transparent text-[15px] font-semibold text-slate-950 outline-none"
            >
              <option value="">{labels.allDurations}</option>
              <option value="1-3">1-3</option>
              <option value="4-7">4-7</option>
              <option value="8+">8+</option>
            </select>
            <span className="shrink-0 text-slate-400">
              <ChevronIcon />
            </span>
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-center gap-3 border-t border-slate-100 px-3.5 py-3 md:px-4.5 xl:border-l xl:border-t-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
          <UsersIcon />
        </span>
        <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-slate-500">{labels.type}</span>
          <span className="mt-1 flex items-center gap-2">
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
               className="w-full appearance-none bg-transparent text-[15px] font-semibold text-slate-950 outline-none"
            >
              <option value="">{labels.allTypes}</option>
              {travelStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {formatTravelStyleLabel(option.value, locale)}
                </option>
              ))}
            </select>
            <span className="shrink-0 text-slate-400">
              <ChevronIcon />
            </span>
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={applyFilter}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 xl:h-full"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
