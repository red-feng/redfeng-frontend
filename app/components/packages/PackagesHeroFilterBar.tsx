"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react"
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

type DropdownOption = {
  value: string
  label: string
}

function FilterDropdownField({
  icon,
  label,
  value,
  placeholder,
  options,
  isOpen,
  onToggle,
  onClose,
  onChange,
  withLeftBorder = false,
}: {
  icon: ReactNode
  label: string
  value: string
  placeholder: string
  options: DropdownOption[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onChange: (value: string) => void
  withLeftBorder?: boolean
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedLabel = options.find((option) => option.value === value)?.label || placeholder

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <div
      ref={rootRef}
      className={`relative flex min-w-0 items-center gap-3 px-3.5 py-3 md:px-4.5 ${
        withLeftBorder ? "border-t border-slate-100 xl:border-l xl:border-t-0" : "rounded-[22px]"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="block text-[11px] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 flex w-full items-center gap-3 rounded-[12px] bg-transparent text-left outline-none"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="min-w-0 flex-1 truncate pr-2 text-[15px] font-semibold leading-6 text-slate-950">
            {selectedLabel}
          </span>
          <span className={`shrink-0 text-slate-400 transition ${isOpen ? "rotate-180 text-[#ef4423]" : ""}`}>
            <ChevronIcon />
          </span>
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-[260] mt-3 px-3.5 md:px-4.5">
            <div className="overflow-hidden rounded-[20px] border border-[#efe2d8] bg-white p-2 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)]">
              <div role="listbox" className="max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onChange("")
                    onToggle()
                  }}
                  className={`flex w-full items-center rounded-[14px] px-4 py-3 text-left text-[14px] font-medium transition ${
                    value === "" ? "bg-[#fff1ea] text-[#ef4423]" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {placeholder}
                </button>
                {options.map((option) => {
                  const active = option.value === value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        onToggle()
                      }}
                      className={`flex w-full items-center rounded-[14px] px-4 py-3 text-left text-[14px] font-medium transition ${
                        active ? "bg-[#fff1ea] text-[#ef4423]" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
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
    country: string
    allCountries: string
    style: string
    allStyles: string
    duration: string
    allDurations: string
  }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [country, setCountry] = useState(searchParams.get("country") || "")
  const [duration, setDuration] = useState(searchParams.get("duration") || "")
  const [style, setStyle] = useState(searchParams.get("style") || "")
  const [openMenu, setOpenMenu] = useState<"country" | "style" | "duration" | null>(null)

  const countryOptions = useMemo<DropdownOption[]>(
    () =>
      [...new Set(countries.map((value) => value.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [countries],
  )
  const styleOptions = useMemo<DropdownOption[]>(
    () => travelStyleOptions.map((option) => ({ value: option.value, label: formatTravelStyleLabel(option.value, locale) })),
    [locale],
  )
  const durationOptions = useMemo<DropdownOption[]>(
    () => [
      { value: "1-3", label: "1-3" },
      { value: "4-7", label: "4-7" },
      { value: "8+", label: "8+" },
    ],
    [],
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
    <div className={`grid gap-2.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_56px] ${isPending ? "opacity-80" : "opacity-100"}`}>
      <FilterDropdownField
        icon={<GlobeIcon />}
        label={labels.country}
        value={country}
        placeholder={labels.allCountries}
        options={countryOptions}
        isOpen={openMenu === "country"}
        onToggle={() => setOpenMenu((current) => (current === "country" ? null : "country"))}
        onClose={() => setOpenMenu(null)}
        onChange={setCountry}
      />

      <FilterDropdownField
        icon={<UsersIcon />}
        label={labels.style}
        value={style}
        placeholder={labels.allStyles}
        options={styleOptions}
        isOpen={openMenu === "style"}
        onToggle={() => setOpenMenu((current) => (current === "style" ? null : "style"))}
        onClose={() => setOpenMenu(null)}
        onChange={setStyle}
        withLeftBorder
      />

      <FilterDropdownField
        icon={<CalendarIcon />}
        label={labels.duration}
        value={duration}
        placeholder={labels.allDurations}
        options={durationOptions}
        isOpen={openMenu === "duration"}
        onToggle={() => setOpenMenu((current) => (current === "duration" ? null : "duration"))}
        onClose={() => setOpenMenu(null)}
        onChange={setDuration}
        withLeftBorder
      />

      <button
        type="button"
        onClick={applyFilter}
        disabled={isPending}
        aria-label={buttonLabel}
        className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center xl:px-0 xl:py-0"
      >
        <SearchIcon />
      </button>
    </div>
  )
}
