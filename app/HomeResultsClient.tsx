"use client"

import { useMemo, useState } from "react"
import PackageCard from "@/app/components/PackageCard"
import SortBar from "@/app/components/SortBar"
import FilterClient, { type PackageFilterState } from "@/app/packages/FilterClient"
import { dictionaries, type Locale } from "@/lib/i18n"

type Facility = {
  id: string
  name: string
  category: string
}

type PackageItem = {
  id: string
  slug: string
  merchant_id: string | null
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  departure_date: string | null
  minimal_peserta: number | null
  travel_style: string | null
  duration?: number | null
  price_adult: number | null
  price_child?: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_facilities?: { facility_id: string }[] | null
  package_translations?: { language_code?: string | null; title: string | null; description: string | null; currency?: string | null; price_adult?: number | null; price_child?: number | null }[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  }
  facilityKeys?: string[]
}

const defaultFilterState: PackageFilterState = {
  minPrice: 0,
  maxPrice: Number.MAX_SAFE_INTEGER,
  selectedFacilities: [],
}

export default function HomeResultsClient({
  facilities,
  locale,
  maxAvailablePrice,
  packages,
}: {
  facilities: Facility[]
  locale: Locale
  maxAvailablePrice: number
  packages: PackageItem[]
}) {
  const t = dictionaries[locale]
  const [filters, setFilters] = useState<PackageFilterState>({
    ...defaultFilterState,
    maxPrice: maxAvailablePrice,
  })

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const displayPrice = Number(pkg.livePricing?.priceAdult || 0)
      const withinPriceRange = displayPrice >= filters.minPrice && displayPrice <= filters.maxPrice
      if (!withinPriceRange) return false

      if (filters.selectedFacilities.length === 0) return true

      const packageFacilityKeys = new Set(pkg.facilityKeys || [])
      return filters.selectedFacilities.some((facilityId) => packageFacilityKeys.has(facilityId))
    })
  }, [filters.maxPrice, filters.minPrice, filters.selectedFacilities, packages])

  return (
    <div className="max-w-[1360px] mx-auto flex gap-8 px-8 py-8">
      <aside className="w-[320px] shrink-0">
        <FilterClient
          facilities={facilities}
          locale={locale}
          maxAvailablePrice={maxAvailablePrice}
          onChange={setFilters}
        />
      </aside>

      <main className="flex-1">
        <SortBar total={filteredPackages.length} locale={locale} />

        <div className="flex flex-col gap-6">
          {filteredPackages.length === 0 ? (
            <p>{t.home.noPackages}</p>
          ) : (
            filteredPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} locale={locale} />)
          )}
        </div>
      </main>
    </div>
  )
}
