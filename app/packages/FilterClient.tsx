"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { dictionaries, type Locale } from "@/lib/i18n"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import { formatPackageMoney, localeCurrencyMap } from "@/lib/package-pricing"

type Facility = {
  id: string
  name: string
  category: string
}

export default function FilterClient({
  facilities,
  locale,
  maxAvailablePrice,
}: {
  facilities: Facility[]
  locale: Locale
  maxAvailablePrice: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = dictionaries[locale].filter

  const [maxPrice, setMaxPrice] = useState<number>(
    Number(searchParams.get("max_price")) || maxAvailablePrice
  )

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(
    searchParams.get("facilities")?.split(",").filter(Boolean) || []
  )
  const isFirstPriceRender = useRef(true)
  const isFirstFacilitiesRender = useRef(true)
  const priceCurrency = localeCurrencyMap[locale]
  const sliderMin = 0
  const selectedPriceLabel =
    locale === "zh"
      ? "当前最高价格"
      : locale === "en"
        ? "Current max price"
        : "Maksimum harga saat ini"
  const sliderStep = useMemo(() => {
    if (maxAvailablePrice <= 1000) return 10
    if (maxAvailablePrice <= 10000) return 100
    if (maxAvailablePrice <= 100000) return 1000
    if (maxAvailablePrice <= 1000000) return 10000
    return 100000
  }, [maxAvailablePrice])

  // AUTO FILTER PRICE
  useEffect(() => {
    if (isFirstPriceRender.current) {
      isFirstPriceRender.current = false
      return
    }
    const timeout = setTimeout(() => {
      const currentValue = searchParams.get("max_price") || ""
      const nextValue = String(maxPrice)
      if (currentValue === nextValue) return

      const params = new URLSearchParams(searchParams.toString())
      params.set("max_price", nextValue)
      router.replace(`/?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [maxPrice, router, searchParams])

  // AUTO FILTER FACILITIES
  useEffect(() => {
    if (isFirstFacilitiesRender.current) {
      isFirstFacilitiesRender.current = false
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const currentFacilities = searchParams.get("facilities") || ""
    const nextFacilities = selectedFacilities.join(",")
    if (currentFacilities === nextFacilities) return

    if (selectedFacilities.length > 0) {
      params.set("facilities", nextFacilities)
    } else {
      params.delete("facilities")
    }

    router.replace(`/?${params.toString()}`)
   }, [selectedFacilities, router, searchParams])

  const grouped = facilities.reduce<Record<string, Facility[]>>(
    (acc, f) => {
      if (!acc[f.category]) {
        acc[f.category] = []
      }
      acc[f.category].push(f)
      return acc
    },
    {}
  )
  const groupedEntries = Object.entries(grouped)
  const defaultOpenCategories = useMemo(() => {
    const activeCategories = groupedEntries
      .filter(([, items]) => items.some((item) => selectedFacilities.includes(item.id)))
      .map(([category]) => category)

    if (activeCategories.length > 0) return activeCategories
    return groupedEntries.length > 0 ? [groupedEntries[0][0]] : []
  }, [groupedEntries, selectedFacilities])
  const [openCategories, setOpenCategories] = useState<string[]>(defaultOpenCategories)

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  return (
    <div className="sticky top-6 space-y-6">

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-900">{t.priceRange}</label>

        <input
          type="range"
          min={sliderMin}
          max={maxAvailablePrice}
          step={sliderStep}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-4 w-full"
        />

        <div className="mt-3 flex justify-between text-sm text-slate-600">
          <span>{formatPackageMoney(sliderMin, priceCurrency, locale)}</span>
          <span>{formatPackageMoney(maxAvailablePrice, priceCurrency, locale)}</span>
        </div>

        <div className="mt-2 text-xs font-medium text-slate-500">
          {selectedPriceLabel}: {formatPackageMoney(maxPrice, priceCurrency, locale)}
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
                <span className="text-sm font-semibold text-slate-900">
                  {getFacilityCategoryLabel(category, locale)}
                </span>
                <span className={`text-sm text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map((f) => (
                      <label key={f.id} className="flex items-start gap-3 rounded-xl px-1 py-1 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          value={f.id}
                          checked={selectedFacilities.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFacilities([...selectedFacilities, f.id])
                            } else {
                              setSelectedFacilities(selectedFacilities.filter((id) => id !== f.id))
                            }
                          }}
                          className="mt-1 rounded border-slate-300"
                        />
                        <span>{getFacilityLabel(f.name, locale)}</span>
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
