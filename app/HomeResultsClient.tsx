"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useSearchParams } from "next/navigation"
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

const packagesPerPage = 12

export default function HomeResultsClient({
  facilities,
  initialFilters,
  locale,
  maxAvailablePrice,
  packages,
  totalPackages,
}: {
  facilities: Facility[]
  initialFilters?: Partial<PackageFilterState>
  locale: Locale
  maxAvailablePrice: number
  packages: PackageItem[]
  totalPackages: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = dictionaries[locale]
  const [, startTransition] = useTransition()
  const hasMountedRef = useRef(false)
  const [filters, setFilters] = useState<PackageFilterState>({
    ...defaultFilterState,
    maxPrice: initialFilters?.maxPrice ?? maxAvailablePrice,
    minPrice: initialFilters?.minPrice ?? defaultFilterState.minPrice,
    selectedFacilities: initialFilters?.selectedFacilities ?? defaultFilterState.selectedFacilities,
  })

  const handleFilterChange = (nextFilters: PackageFilterState) => {
    setFilters(nextFilters)
  }

  const totalPages = Math.max(1, Math.ceil(totalPackages / packagesPerPage))
  const requestedPage = Number(searchParams.get("page") || "1")
  const safeCurrentPage = Math.min(
    Math.max(Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1, 1),
    totalPages,
  )

  const paginationCopy =
    locale === "en"
      ? { previous: "Previous", next: "Next", page: "Page" }
      : locale === "zh"
        ? { previous: "上一页", next: "下一页", page: "第" }
        : { previous: "Sebelumnya", next: "Berikutnya", page: "Halaman" }

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const params = new URLSearchParams(searchParams.toString())

    if (filters.minPrice > 0) {
      params.set("min_price", String(filters.minPrice))
    } else {
      params.delete("min_price")
    }

    if (filters.maxPrice < maxAvailablePrice) {
      params.set("max_price", String(filters.maxPrice))
    } else {
      params.delete("max_price")
    }

    if (filters.selectedFacilities.length > 0) {
      params.set("facilities", filters.selectedFacilities.join(","))
    } else {
      params.delete("facilities")
    }

    params.delete("page")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    startTransition(() => {
      window.location.replace(nextUrl)
    })
  }, [filters.maxPrice, filters.minPrice, filters.selectedFacilities, maxAvailablePrice, pathname, searchParams, startTransition])

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page <= 1) {
      params.delete("page")
    } else {
      params.set("page", String(page))
    }

    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    window.location.assign(nextUrl)
  }

  return (
    <div className="max-w-[1360px] mx-auto flex gap-8 px-8 py-8">
      <aside className="w-[320px] shrink-0">
        <FilterClient
          key={`${locale}:${maxAvailablePrice}:${initialFilters?.minPrice ?? 0}:${initialFilters?.maxPrice ?? maxAvailablePrice}:${(initialFilters?.selectedFacilities ?? []).join(",")}`}
          facilities={facilities}
          initialState={filters}
          locale={locale}
          maxAvailablePrice={maxAvailablePrice}
          onChange={handleFilterChange}
        />
      </aside>

      <main className="flex-1">
        <SortBar total={totalPackages} locale={locale} />

        <div className="flex flex-col gap-6">
          {totalPackages === 0 ? (
            <p>{t.home.noPackages}</p>
          ) : (
            packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} locale={locale} />)
          )}
        </div>

        {totalPackages > packagesPerPage && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              {paginationCopy.page} {safeCurrentPage} / {totalPages}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                {paginationCopy.previous}
              </button>
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                {paginationCopy.next}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
