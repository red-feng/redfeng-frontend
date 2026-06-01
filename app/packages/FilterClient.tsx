"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatPackageMoney, localeCurrencyMap } from "@/lib/package-pricing"

type Facility = {
  id: string
  name: string
  category: string
}

export type PackageFilterState = {
  minPrice: number
  maxPrice: number
  selectedFacilities: string[]
}

const openCategoriesStorageKey = "rf_home_filter_open_categories"

export default function FilterClient({
  facilities,
  initialState,
  locale,
  maxAvailablePrice,
  onChange,
  selectedCountry,
  selectedStyle,
  selectedDuration,
}: {
  facilities: Facility[]
  initialState?: Partial<PackageFilterState>
  locale: Locale
  maxAvailablePrice: number
  onChange: (state: PackageFilterState) => void
  selectedCountry?: string
  selectedStyle?: string
  selectedDuration?: string
}) {
  const t = dictionaries[locale].filter
  const priceCurrency = localeCurrencyMap[locale]
  const sliderMin = 0
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)
  const priceChangeTimeoutRef = useRef<number | null>(null)

  const [minPrice, setMinPrice] = useState(initialState?.minPrice ?? sliderMin)
  const [maxPrice, setMaxPrice] = useState(initialState?.maxPrice ?? sliderMax)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initialState?.selectedFacilities ?? [])
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)

  const sliderStep = useMemo(() => {
    if (priceCurrency === "USD") return 10
    if (priceCurrency === "CNY") return 100
    return 100000
  }, [priceCurrency])

  const groupedEntries = useMemo(() => {
    const grouped = facilities.reduce<Record<string, Facility[]>>((acc, facility) => {
      if (!acc[facility.category]) acc[facility.category] = []
      acc[facility.category].push(facility)
      return acc
    }, {})

    return Object.entries(grouped)
  }, [facilities])

  const [openCategories, setOpenCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const storedValue = window.sessionStorage.getItem(openCategoriesStorageKey)
      if (storedValue) {
        const parsed = storedValue
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        if (parsed.length > 0) return parsed
      }
    }

    return groupedEntries.length > 0 ? [groupedEntries[0][0]] : []
  })

  const effectiveMinPrice = Math.min(minPrice, sliderMax)
  const effectiveMaxPrice = Math.min(Math.max(maxPrice, effectiveMinPrice), sliderMax)
  const minPercent =
    sliderMax === sliderMin ? 0 : ((effectiveMinPrice - sliderMin) / (sliderMax - sliderMin)) * 100
  const maxPercent =
    sliderMax === sliderMin ? 100 : ((effectiveMaxPrice - sliderMin) / (sliderMax - sliderMin)) * 100

  const emitChange = ({
    nextMinPrice = minPrice,
    nextMaxPrice = maxPrice,
    nextSelectedFacilities = selectedFacilities,
  }: {
    nextMinPrice?: number
    nextMaxPrice?: number
    nextSelectedFacilities?: string[]
  }) => {
    const boundedMinPrice = Math.min(nextMinPrice, sliderMax)
    const boundedMaxPrice = Math.min(Math.max(nextMaxPrice, boundedMinPrice), sliderMax)

    onChange({
      minPrice: boundedMinPrice,
      maxPrice: boundedMaxPrice,
      selectedFacilities: nextSelectedFacilities,
    })
  }

  const schedulePriceChange = (nextMinPrice: number, nextMaxPrice: number) => {
    if (typeof window === "undefined") {
      emitChange({ nextMinPrice, nextMaxPrice })
      return
    }

    if (priceChangeTimeoutRef.current !== null) {
      window.clearTimeout(priceChangeTimeoutRef.current)
    }

    priceChangeTimeoutRef.current = window.setTimeout(() => {
      emitChange({ nextMinPrice, nextMaxPrice })
      priceChangeTimeoutRef.current = null
    }, 180)
  }

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(openCategoriesStorageKey, openCategories.join(","))
  }, [openCategories])

  useEffect(() => {
    return () => {
      if (priceChangeTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(priceChangeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!isMobilePanelOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobilePanelOpen])

  const resetFilters = () => {
    setMinPrice(sliderMin)
    setMaxPrice(sliderMax)
    setSelectedFacilities([])
    emitChange({
      nextMinPrice: sliderMin,
      nextMaxPrice: sliderMax,
      nextSelectedFacilities: [],
    })
  }

  const hasActiveFilters =
    effectiveMinPrice > sliderMin || effectiveMaxPrice < sliderMax || selectedFacilities.length > 0

  const mobileFilterTitle =
    locale === "en" ? "Filter packages" : locale === "zh" ? "ç­›é€‰å¥—é¤" : "Filter paket"
  const mobileFilterSubtitle =
    locale === "en"
      ? "Refine the packages that match your plan."
      : locale === "zh"
        ? "è°ƒæ•´ç¬¦åˆä½ è®¡åˆ’çš„å¥—ç¥¨ã€‚"
        : "Atur paket yang paling cocok dengan rencanamu."
  const mobileOpenLabel =
    locale === "en" ? "Open filters" : locale === "zh" ? "æ‰“å¼€ç­›é€‰" : "Buka filter"
  const mobileCloseLabel =
    locale === "en" ? "Close" : locale === "zh" ? "å…³é—­" : "Tutup"
  const trustTitle =
    locale === "en"
      ? "Safe and trusted booking"
      : locale === "zh"
        ? "å®‰å…¨å¯é çš„é¢„è®¢"
        : "Pemesanan aman dan terpercaya"
  const trustBody =
    locale === "en"
      ? "Secure transactions, protected customer data, and support when you need it."
      : locale === "zh"
        ? "å®‰å…¨äº¤æ˜“ã€�å®¢æˆ·æ•°æ®å—ä¿æŠ¤ï¼Œå¹¶åœ¨éœ€è¦æ—¶æä¾›æ”¯æŒã€‚"
        : "Transaksi lebih aman, data customer terlindungi, dan dukungan saat Anda membutuhkannya."
  const exploreTitle =
    locale === "en"
      ? `Explore ${selectedCountry || "tour destinations"}`
      : locale === "zh"
        ? `探索${selectedCountry || "热门目的地"}`
        : `Jelajahi ${selectedCountry || "destinasi tour"}`
  const exploreMeta = [selectedStyle || (locale === "en" ? "All styles" : locale === "zh" ? "全部风格" : "Semua style"), selectedDuration || (locale === "en" ? "Any duration" : locale === "zh" ? "任意时长" : "Semua durasi")]
    .filter(Boolean)
    .join(" • ")
  const exploreAction =
    locale === "en" ? "View tour area" : locale === "zh" ? "查看目的地" : "Lihat area tour"
  const handleExploreClick = () => {
    if (typeof document === "undefined") return
    const target = document.getElementById("package-search-results")
    if (!target) return
    const top = target.getBoundingClientRect().top + window.scrollY - 120
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  const filterBody = (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-[#d8ebfb] bg-[linear-gradient(135deg,#eef8ff_0%,#dff1ff_100%)] shadow-[0_18px_40px_-34px_rgba(37,99,235,0.28)]">
        <div className="relative min-h-[160px] px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.78)_0,rgba(255,255,255,0.78)_3px,transparent_3px)] bg-[length:16px_16px] opacity-30" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_20%_30%,rgba(129,212,250,0.34)_0,rgba(129,212,250,0.34)_18%,transparent_18%),radial-gradient(circle_at_68%_56%,rgba(96,165,250,0.24)_0,rgba(96,165,250,0.24)_16%,transparent_16%),linear-gradient(135deg,rgba(191,219,254,0.82)_0%,rgba(219,234,254,0.52)_100%)]" />
          <div className="pointer-events-none absolute right-6 top-5 h-10 w-10 rounded-full border-8 border-[#1f6fbd] bg-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.45)]" />
          <div className="pointer-events-none absolute right-[92px] top-0 h-full w-px bg-white/70" />
          <div className="relative flex h-full flex-col justify-end">
            <p className="max-w-[220px] text-[18px] font-semibold tracking-[-0.03em] text-[#0f4f87]">{exploreTitle}</p>
            <p className="mt-2 max-w-[230px] text-[13px] text-[#4e6f8f]">{exploreMeta}</p>
            <button
              type="button"
              onClick={handleExploreClick}
              className="mt-5 inline-flex w-fit items-center rounded-full bg-[#1464b4] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(20,100,180,0.85)] transition hover:brightness-105"
            >
              {exploreAction}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filter Paket</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {locale === "en"
                ? "Adjust your package preference"
                : locale === "zh"
                  ? "è°ƒæ•´ä½ çš„å¥—ç¥¨åå¥½"
                  : "Atur preferensi paketmu"}
            </p>
          </div>
          {selectedFacilities.length > 0 ? (
            <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
              {selectedFacilities.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-900">{t.priceRange}</p>
            <p className="mt-1 text-sm text-slate-500">{t.perPackage}</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="text-sm font-semibold text-orange-600 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {t.reset}
          </button>
        </div>

        <div className="relative mt-6 px-2">
          <div className="h-1 rounded-full bg-[#edf1f5]" />
          <div
            className="pointer-events-none absolute top-0 h-1 rounded-full bg-[#ff6131]"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(maxPercent - minPercent, 0)}%`,
            }}
          />

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={minPrice}
            onChange={(event) => {
              const nextMin = Math.min(Number(event.target.value), maxPrice)
              setMinPrice(nextMin)
              schedulePriceChange(nextMin, maxPrice)
            }}
            className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)]"
          />
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={maxPrice}
            onChange={(event) => {
              const nextMax = Math.max(Number(event.target.value), minPrice)
              setMaxPrice(nextMax)
              schedulePriceChange(minPrice, nextMax)
            }}
            className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)]"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
          <div className="min-w-0 rounded-2xl border border-[#e6ebf2] bg-[#fcfdff] px-3 py-3 text-[12px] font-medium text-slate-700 sm:rounded-full sm:text-[13px]">
            {formatPackageMoney(effectiveMinPrice, priceCurrency, locale)}
          </div>
          <div className="min-w-0 rounded-2xl border border-[#e6ebf2] bg-[#fcfdff] px-3 py-3 text-[12px] font-medium text-slate-700 sm:rounded-full sm:text-[13px]">
            {formatPackageMoney(effectiveMaxPrice, priceCurrency, locale)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {groupedEntries.map(([category, items]) => {
          const isOpen = openCategories.includes(category)
          const selectedCount = items.filter((facility) => selectedFacilities.includes(facility.id)).length

          return (
            <div
              key={category}
              className="overflow-hidden rounded-[22px] border border-[#eef1f6] bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]"
            >
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <span className="block text-[13px] font-semibold tracking-[-0.01em] text-slate-900">
                    {getFacilityCategoryLabel(category, locale)}
                  </span>
                  {selectedCount > 0 ? (
                    <span className="mt-1 block text-[11px] font-medium text-orange-500">
                      {locale === "en"
                        ? `${selectedCount} selected`
                        : locale === "zh"
                          ? `å·²é€‰ ${selectedCount}`
                          : `${selectedCount} dipilih`}
                    </span>
                  ) : null}
                </div>
                <span className={`text-sm text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>

              {isOpen ? (
                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map((facility) => (
                      <label key={facility.id} className="flex items-start gap-3 rounded-xl px-1 py-1 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          value={facility.id}
                          checked={selectedFacilities.includes(facility.id)}
                          onChange={(event) => {
                            const nextSelectedFacilities = event.target.checked
                              ? [...selectedFacilities, facility.id]
                              : selectedFacilities.filter((id) => id !== facility.id)

                            setSelectedFacilities(nextSelectedFacilities)
                            emitChange({ nextSelectedFacilities })
                          }}
                          className="mt-1 rounded border-slate-300"
                        />
                        <span>{getFacilityLabel(facility.name, locale)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4ec] text-orange-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
              <path d="M12 3.8 5.5 6.5v5c0 4.2 2.5 7.5 6.5 8.7 4-1.2 6.5-4.5 6.5-8.7v-5L12 3.8Z" />
              <path d="m9.5 12 1.6 1.6 3.4-3.7" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">{trustTitle}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{trustBody}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className="flex w-full items-center justify-between rounded-[24px] border border-orange-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff9f2_55%,#fff1e3_100%)] px-4 py-3.5 text-left shadow-[0_18px_40px_-30px_rgba(249,115,22,0.35)]"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{mobileFilterTitle}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{mobileFilterSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters ? (
              <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
                {selectedFacilities.length > 0 ? selectedFacilities.length : 1}
              </span>
            ) : null}
            <span className="rounded-full bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(249,115,22,0.85)]">
              {mobileOpenLabel}
            </span>
          </div>
        </button>
      </div>

      <div className="hidden lg:block">{filterBody}</div>

      {isMobilePanelOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/45 backdrop-blur-[2px] lg:hidden">
          <button
            type="button"
            aria-label={mobileCloseLabel}
            className="absolute inset-0"
            onClick={() => setIsMobilePanelOpen(false)}
          />
          <div className="relative max-h-[88vh] w-full overflow-hidden rounded-t-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] shadow-[0_-24px_60px_-34px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{mobileFilterTitle}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{mobileFilterSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePanelOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm"
              >
                {mobileCloseLabel}
              </button>
            </div>
            <div className="max-h-[calc(88vh-84px)] overflow-y-auto px-4 py-4">{filterBody}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}
