"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, travelStyleOptions } from "@/lib/travelStyles"

type SearchBarProps = {
  locale: Locale
  countries: string[]
  destinationPath?: string
  submitLabel?: string
  variant?: "default" | "catalog" | "mapCompact"
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 21 21" />
    </svg>
  )
}

type DropdownOption = {
  value: string
  label: string
}

function SearchDropdownField({
  icon,
  label,
  value,
  placeholder,
  options,
  isOpen,
  onToggle,
  onClose,
  onChange,
  compact = false,
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
  compact?: boolean
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

  const shellClass = compact
    ? "group flex min-w-0 items-center gap-2 rounded-[10px] border border-[#eceff4] bg-[#fcfdff] px-2.5 py-1.5 transition focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100"
    : "group flex min-w-0 items-center gap-3 rounded-[18px] border border-[#eceff4] bg-[#fcfdff] px-4 py-4 transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100"
  const iconShellClass = compact
    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-orange-500"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-orange-500"
  const menuPaddingClass = compact ? "p-1.5" : "p-2"
  const optionClass = compact ? "rounded-[12px] px-3 py-2.5 text-[13px]" : "rounded-[14px] px-4 py-3 text-[14px]"

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className={shellClass}>
        <span className={iconShellClass}>{icon}</span>
        <div className="min-w-0 flex-1">
          <span className={`block font-semibold uppercase tracking-[0.26em] text-slate-400 ${compact ? "text-[9px]" : "text-[10px]"}`}>{label}</span>
          <button
            type="button"
            onClick={onToggle}
            className={`mt-1 flex w-full items-center gap-3 rounded-[12px] bg-transparent text-left outline-none ${compact ? "text-[12px]" : "text-[14px] sm:text-[15px]"}`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{selectedLabel}</span>
            <span className={`shrink-0 text-slate-400 transition group-focus-within:text-orange-500 ${isOpen ? "rotate-180 text-orange-500" : ""}`}>
              <ChevronMark />
            </span>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-[260] mt-3">
          <div className={`overflow-hidden rounded-[20px] border border-[#efe2d8] bg-white ${menuPaddingClass} shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)]`}>
            <div role="listbox" className="max-h-72 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  onClose()
                }}
                className={`flex w-full items-center text-left font-medium transition ${optionClass} ${
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
                      onClose()
                    }}
                    className={`flex w-full items-center text-left font-medium transition ${optionClass} ${
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
  )
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
  const [openMenu, setOpenMenu] = useState<"country" | "style" | "duration" | null>(null)
  const isCatalogVariant = variant === "catalog"
  const isMapCompactVariant = variant === "mapCompact"

  const countryOptions = useMemo<DropdownOption[]>(() => {
    const uniqueCountries = [...new Set(countries.map((value) => value.trim()).filter(Boolean))]

    if (country && !uniqueCountries.includes(country)) {
      return [country, ...uniqueCountries].map((option) => ({
        value: option,
        label: formatCountryLabel(option, locale),
      }))
    }

    return uniqueCountries.map((option) => ({
      value: option,
      label: formatCountryLabel(option, locale),
    }))
  }, [countries, country, locale])
  const styleOptions = useMemo<DropdownOption[]>(
    () => travelStyleOptions.map((option) => ({ value: option.value, label: formatTravelStyleLabel(option.value, locale) })),
    [locale],
  )
  const durationOptions = useMemo<DropdownOption[]>(
    () => [
      { value: "1-3", label: `1-3 ${t.day}` },
      { value: "4-7", label: `4-7 ${t.day}` },
      { value: "8+", label: `8+ ${t.day}` },
    ],
    [t.day],
  )

  // PROTECTED-PACKAGE-MAP-SEARCHBAR-START
  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (country) params.set("country", country)
    else params.delete("country")

    if (style) params.set("style", style)
    else params.delete("style")

    if (duration) params.set("duration", duration)
    else params.delete("duration")

    if (isMapCompactVariant) params.set("map", "1")

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
  // PROTECTED-PACKAGE-MAP-SEARCHBAR-END

  const loadingLabel = locale === "en" ? "Loading..." : locale === "zh" ? "加载中..." : "Memuat..."

  if (isCatalogVariant) {
    return (
      <div className={`relative transition-opacity duration-200 ${isPending ? "opacity-75" : "opacity-100"}`}>
        {isPending ? (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[30px]">
            <div className="absolute inset-0 bg-white/28 backdrop-blur-[1px]" />
            <div className="absolute left-0 top-0 h-full w-24 -translate-x-full animate-[searchBarLoading_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        ) : null}

        <div className="rounded-[24px] border border-[#eef1f6] bg-white p-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.18)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <SearchDropdownField
              icon={<CountryIcon />}
              label={t.countryLabel}
              value={country}
              placeholder={t.allCountries}
              options={countryOptions}
              isOpen={openMenu === "country"}
              onToggle={() => setOpenMenu((current) => (current === "country" ? null : "country"))}
              onClose={() => setOpenMenu(null)}
              onChange={setCountry}
            />

            <SearchDropdownField
              icon={<StyleIcon />}
              label={t.styleLabel}
              value={style}
              placeholder={t.allStyles}
              options={styleOptions}
              isOpen={openMenu === "style"}
              onToggle={() => setOpenMenu((current) => (current === "style" ? null : "style"))}
              onClose={() => setOpenMenu(null)}
              onChange={setStyle}
            />

            <SearchDropdownField
              icon={<DurationIcon />}
              label={t.durationLabel}
              value={duration}
              placeholder={t.allDurations}
              options={durationOptions}
              isOpen={openMenu === "duration"}
              onToggle={() => setOpenMenu((current) => (current === "duration" ? null : "duration"))}
              onClose={() => setOpenMenu(null)}
              onChange={setDuration}
            />

            <button
              type="button"
              onClick={applyFilter}
              disabled={isPending}
              aria-label={submitLabel || (locale === "en" ? "Apply Filter" : locale === "zh" ? "应用筛选" : "Terapkan Filter")}
              className="inline-flex h-[58px] w-full items-center justify-center self-center rounded-[18px] bg-gradient-to-r from-[#ff6934] via-[#ff5d2d] to-[#ef4423] text-white shadow-[0_18px_34px_-22px_rgba(239,68,35,0.72)] transition hover:-translate-y-0.5 hover:from-[#ff5d2d] hover:to-[#ea3b1c] disabled:cursor-not-allowed disabled:opacity-70 md:w-[72px]"
            >
              {isPending ? loadingLabel : <SearchIcon />}
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

  if (isMapCompactVariant) {
    return (
      <div className={`relative min-w-0 transition-opacity duration-200 ${isPending ? "opacity-75" : "opacity-100"}`}>
        {isPending ? (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[24px]">
            <div className="absolute inset-0 bg-white/28 backdrop-blur-[1px]" />
            <div className="absolute left-0 top-0 h-full w-24 -translate-x-full animate-[searchBarLoading_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        ) : null}

        <div className="rounded-[16px] border border-[#eef1f6] bg-white px-2 py-1.5 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.12)]">
          <div className="grid min-w-0 gap-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.78fr)_auto] md:items-center">
            <SearchDropdownField
              icon={<CountryIcon />}
              label={t.countryLabel}
              value={country}
              placeholder={t.allCountries}
              options={countryOptions}
              isOpen={openMenu === "country"}
              onToggle={() => setOpenMenu((current) => (current === "country" ? null : "country"))}
              onClose={() => setOpenMenu(null)}
              onChange={setCountry}
              compact
            />

            <SearchDropdownField
              icon={<StyleIcon />}
              label={t.styleLabel}
              value={style}
              placeholder={t.allStyles}
              options={styleOptions}
              isOpen={openMenu === "style"}
              onToggle={() => setOpenMenu((current) => (current === "style" ? null : "style"))}
              onClose={() => setOpenMenu(null)}
              onChange={setStyle}
              compact
            />

            <SearchDropdownField
              icon={<DurationIcon />}
              label={t.durationLabel}
              value={duration}
              placeholder={t.allDurations}
              options={durationOptions}
              isOpen={openMenu === "duration"}
              onToggle={() => setOpenMenu((current) => (current === "duration" ? null : "duration"))}
              onClose={() => setOpenMenu(null)}
              onChange={setDuration}
              compact
            />

            <button
              type="button"
              onClick={applyFilter}
              disabled={isPending}
              aria-label={submitLabel || t.apply}
              className="relative inline-flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-gradient-to-r from-[#ff6934] via-[#ff5d2d] to-[#ef4423] text-[0px] text-white shadow-[0_12px_24px_-18px_rgba(239,68,35,0.72)] transition hover:-translate-y-0.5 hover:from-[#ff5d2d] hover:to-[#ea3b1c] disabled:cursor-not-allowed disabled:opacity-70"
              style={
                isPending
                  ? undefined
                  : {
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='M16 16 21 21'/%3E%3C/svg%3E\"), linear-gradient(90deg, #ff6934, #ff5d2d, #ef4423)",
                      backgroundRepeat: "no-repeat, no-repeat",
                      backgroundPosition: "center, center",
                      backgroundSize: "16px 16px, 100% 100%",
                    }
              }
            >
              {isPending
                ? loadingLabel
                : submitLabel || (locale === "en" ? "Apply" : locale === "zh" ? "应用" : "Pakai")}
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
                    ? "快速找到下一段旅程"
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
                  <option key={option.value} value={option.value}>
                    {option.label}
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


