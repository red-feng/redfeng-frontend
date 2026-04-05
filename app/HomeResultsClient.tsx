"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  package_translations?: {
    language_code?: string | null
    title: string | null
    description: string | null
    currency?: string | null
    price_adult?: number | null
    price_child?: number | null
  }[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  }
  facilityKeys?: string[]
}

function PackageCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.18)]">
      <div className="h-[220px] w-[280px] shrink-0 animate-pulse bg-slate-200" />
      <div className="flex-1 p-6">
        <div className="h-8 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-4 h-4 w-1/3 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-5 flex flex-wrap gap-2">
          <div className="h-8 w-24 animate-pulse rounded-full bg-orange-100" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="h-8 w-20 animate-pulse rounded-full bg-amber-100" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="flex w-[260px] flex-col justify-between border-l border-slate-200 bg-slate-50/70 p-6">
        <div>
          <div className="ml-auto h-9 w-32 animate-pulse rounded-2xl bg-orange-100" />
          <div className="mt-3 ml-auto h-4 w-24 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-3 ml-auto h-4 w-28 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-orange-100" />
      </div>
    </div>
  )
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = dictionaries[locale]
  const [isPending, startTransition] = useTransition()
  const [displayedPackages, setDisplayedPackages] = useState<PackageItem[]>(packages)
  const [loadedPage, setLoadedPage] = useState(Math.max(1, Math.ceil(packages.length / packagesPerPage)))
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [freshPackageIds, setFreshPackageIds] = useState<string[]>([])
  const freshPackageTimerRef = useRef<number | null>(null)
  const filters: PackageFilterState = {
    ...defaultFilterState,
    maxPrice: initialFilters?.maxPrice ?? maxAvailablePrice,
    minPrice: initialFilters?.minPrice ?? defaultFilterState.minPrice,
    selectedFacilities: initialFilters?.selectedFacilities ?? defaultFilterState.selectedFacilities,
  }

  useEffect(() => {
    setDisplayedPackages(packages)
    setLoadedPage(Math.max(1, Math.ceil(packages.length / packagesPerPage)))
    setIsLoadingMore(false)
    setFreshPackageIds([])
  }, [packages])

  useEffect(() => {
    return () => {
      if (freshPackageTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(freshPackageTimerRef.current)
      }
    }
  }, [])

  const handleFilterChange = (nextFilters: PackageFilterState) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextFilters.minPrice > 0) {
      params.set("min_price", String(nextFilters.minPrice))
    } else {
      params.delete("min_price")
    }

    if (nextFilters.maxPrice < maxAvailablePrice) {
      params.set("max_price", String(nextFilters.maxPrice))
    } else {
      params.delete("max_price")
    }

    if (nextFilters.selectedFacilities.length > 0) {
      params.set("facilities", nextFilters.selectedFacilities.join(","))
    } else {
      params.delete("facilities")
    }

    params.delete("page")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }

  const totalPages = Math.max(1, Math.ceil(totalPackages / packagesPerPage))
  const requestedPage = Number(searchParams.get("page") || "1")
  const safeCurrentPage = Math.min(
    Math.max(Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1, 1),
    totalPages,
  )
  const visiblePage = Math.max(loadedPage, safeCurrentPage)
  const hasMorePackages = displayedPackages.length < totalPackages && visiblePage < totalPages

  const paginationCopy =
    locale === "en"
      ? { loadMore: "Load more", loading: "Loading...", page: "Page" }
      : locale === "zh"
        ? { loadMore: "加载更多", loading: "加载中...", page: "第" }
        : { loadMore: "Muat lebih banyak", loading: "Memuat...", page: "Halaman" }

  const searchMessage =
    locale === "en"
      ? { title: "Finding the best packages for you....", subtitle: "hang tight, okay..." }
      : locale === "zh"
        ? { title: "正在为你寻找最合适的旅游套餐....", subtitle: "请耐心等一下哦..." }
        : { title: "Lagi cari paket terbaik untukmu....", subtitle: "sabar ya..." }

  const goToPage = async (page: number) => {
    if (page <= visiblePage || isLoadingMore) return

    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    params.set("locale", locale)

    setIsLoadingMore(true)
    try {
      const response = await fetch(`/api/home-packages?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to load page ${page}`)
      }

      const result = (await response.json()) as { items?: PackageItem[] }
      const nextItems = result.items || []
      const appendedIds: string[] = []
      setDisplayedPackages((current) => {
        const seenIds = new Set(current.map((pkg) => pkg.id))
        const appendedItems = nextItems.filter((pkg) => !seenIds.has(pkg.id))
        appendedIds.push(...appendedItems.map((pkg) => pkg.id))
        return [...current, ...appendedItems]
      })
      setLoadedPage(page)

      if (appendedIds.length > 0) {
        setFreshPackageIds(appendedIds)
        if (freshPackageTimerRef.current !== null && typeof window !== "undefined") {
          window.clearTimeout(freshPackageTimerRef.current)
        }
        if (typeof window !== "undefined") {
          freshPackageTimerRef.current = window.setTimeout(() => {
            setFreshPackageIds([])
            freshPackageTimerRef.current = null
          }, 450)
        }
      }

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.set("page", String(page))
      const nextQuery = nextParams.toString()
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
      window.history.replaceState(window.history.state, "", nextUrl)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1360px] gap-8 px-8 py-8">
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

        <div className="relative flex flex-col gap-6">
          {isPending ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white/85 px-8 text-center shadow-[0_18px_45px_-30px_rgba(15,23,42,0.18)]">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_infinite] rounded-full bg-sky-300" />
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_0.15s_infinite] rounded-full bg-sky-400" />
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-sky-500" />
              </div>
              <p className="text-[24px] font-semibold text-slate-900">{searchMessage.title}</p>
              <p className="mt-2 text-base text-slate-500">{searchMessage.subtitle}</p>
            </div>
          ) : totalPackages === 0 ? (
            <p>{t.home.noPackages}</p>
          ) : (
            displayedPackages.map((pkg, index) => {
              const isFresh = freshPackageIds.includes(pkg.id)

              return (
                <div
                  key={pkg.id}
                  className={isFresh ? "animate-[homePackageReveal_320ms_ease-out]" : undefined}
                  style={isFresh ? { animationDelay: `${Math.min(index % packagesPerPage, 5) * 45}ms`, animationFillMode: "both" } : undefined}
                >
                  <PackageCard pkg={pkg} locale={locale} />
                </div>
              )
            })
          )}

          {!isPending && isLoadingMore &&
            Array.from({ length: Math.min(packagesPerPage, Math.max(totalPackages - displayedPackages.length, 1)) }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-[homePackageReveal_220ms_ease-out]"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
              >
                <PackageCardSkeleton />
              </div>
            ))}
        </div>

        <style jsx>{`
          @keyframes homePackageReveal {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes homeLoadingDot {
            0%,
            80%,
            100% {
              transform: translateY(0);
              opacity: 0.45;
            }
            40% {
              transform: translateY(-5px);
              opacity: 1;
            }
          }
        `}</style>

        {totalPackages > packagesPerPage && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">
              {paginationCopy.page} {visiblePage} / {totalPages}
            </p>
            {hasMorePackages ? (
              <button
                type="button"
                onClick={() => void goToPage(visiblePage + 1)}
                disabled={isPending || isLoadingMore}
                className="rounded-full border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
              >
                {isPending || isLoadingMore ? paginationCopy.loading : paginationCopy.loadMore}
              </button>
            ) : (
              <p className="text-sm font-medium text-slate-400">{displayedPackages.length} / {totalPackages}</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
