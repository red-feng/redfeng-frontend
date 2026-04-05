"use client"

import { useEffect, useMemo, useState } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
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

export default function FilterClient({
  facilities,
  locale,
  maxAvailablePrice,
  onChange,
}: {
  facilities: Facility[]
  locale: Locale
  maxAvailablePrice: number
  onChange: (state: PackageFilterState) => void
}) {
  const t = dictionaries[locale].filter
  const priceCurrency = localeCurrencyMap[locale]
  const sliderMin = 0
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)

  const [minPrice, setMinPrice] = useState(sliderMin)
  const [maxPrice, setMaxPrice] = useState(sliderMax)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])

  const sliderStep = useMemo(() => {
    if (priceCurrency === "USD") return 10
    if (priceCurrency === "CNY") return 100
    return 100000
  }, [priceCurrency])

  const groupedEntries = useMemo(() => {
    const grouped = facilities.reduce<Record<string, Facility[]>>((acc, facility) => {
      if (!acc[facility.category]) {
        acc[facility.category] = []
      }
      acc[facility.category].push(facility)
      return acc
    }, {})

    return Object.entries(grouped)
  }, [facilities])

  const [openCategories, setOpenCategories] = useState<string[]>(() =>
    groupedEntries.length > 0 ? [groupedEntries[0][0]] : [],
  )

  const effectiveMinPrice = Math.min(minPrice, sliderMax)
  const effectiveMaxPrice = Math.min(Math.max(maxPrice, effectiveMinPrice), sliderMax)
  const minPercent =
    sliderMax === sliderMin ? 0 : ((effectiveMinPrice - sliderMin) / (sliderMax - sliderMin)) * 100
  const maxPercent =
    sliderMax === sliderMin ? 100 : ((effectiveMaxPrice - sliderMin) / (sliderMax - sliderMin)) * 100

  useEffect(() => {
    onChange({
      minPrice: effectiveMinPrice,
      maxPrice: effectiveMaxPrice,
      selectedFacilities,
    })
  }, [effectiveMaxPrice, effectiveMinPrice, onChange, selectedFacilities])

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  const resetFilters = () => {
    setMinPrice(sliderMin)
    setMaxPrice(sliderMax)
    setSelectedFacilities([])
  }

  const hasActiveFilters =
    effectiveMinPrice > sliderMin || effectiveMaxPrice < sliderMax || selectedFacilities.length > 0

  return (
    <div className="sticky top-6 space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold text-slate-950">{t.priceRange}</p>
            <p className="mt-1 text-sm text-slate-500">{t.perPackage}</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="text-sm font-semibold text-sky-600 transition hover:text-sky-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {t.reset}
          </button>
        </div>

        <div className="relative mt-6 px-2">
          <div className="h-1 rounded-full bg-slate-200" />
          <div
            className="pointer-events-none absolute top-0 h-1 rounded-full bg-sky-500"
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
            }}
            className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)]"
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-full border border-slate-300 bg-white px-3 py-3 text-[13px] font-medium text-slate-700 shadow-sm">
            {formatPackageMoney(effectiveMinPrice, priceCurrency, locale)}
          </div>
          <div className="min-w-0 rounded-full border border-slate-300 bg-white px-3 py-3 text-[13px] font-medium text-slate-700 shadow-sm">
            {formatPackageMoney(effectiveMaxPrice, priceCurrency, locale)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {groupedEntries.map(([category, items]) => {
          const isOpen = openCategories.includes(category)

          return (
            <div key={category} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">{getFacilityCategoryLabel(category, locale)}</span>
                <span className={`text-sm text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>v</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map((facility) => (
                      <label key={facility.id} className="flex items-start gap-3 rounded-xl px-1 py-1 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          value={facility.id}
                          checked={selectedFacilities.includes(facility.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedFacilities((current) => [...current, facility.id])
                              return
                            }

                            setSelectedFacilities((current) => current.filter((id) => id !== facility.id))
                          }}
                          className="mt-1 rounded border-slate-300"
                        />
                        <span>{getFacilityLabel(facility.name, locale)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
