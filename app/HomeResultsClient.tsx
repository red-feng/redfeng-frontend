"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import PackageCard from "@/app/components/PackageCard"
import SortBar from "@/app/components/SortBar"
import FilterClient, { type PackageFilterState } from "@/app/packages/FilterClient"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

type Facility = {
  id: string
  name: string
  category: string
}

type PackageItem = {
  id: string
  slug: string
  merchant_id: string | null
  cover_image?: string | null
  city?: string | null
  country?: string | null
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
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.18)] md:flex md:rounded-[28px]">
      <div className="h-[160px] w-full animate-pulse bg-slate-200 md:h-[220px] md:w-[280px] md:shrink-0" />
      <div className="p-4 md:flex-1 md:p-6">
        <div className="h-6 w-4/5 animate-pulse rounded-2xl bg-slate-200 md:h-8 md:w-2/3" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-slate-100 md:mt-4 md:w-1/3" />
        <div className="mt-4 flex flex-wrap gap-2 md:mt-5">
          <div className="h-7 w-20 animate-pulse rounded-full bg-orange-100 md:h-8 md:w-24" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 md:h-8 md:w-28" />
        </div>
        <div className="mt-5 space-y-3 md:mt-6">
          <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="flex flex-col justify-between border-t border-slate-200 bg-slate-50/70 p-4 md:w-[260px] md:border-l md:border-t-0 md:p-6">
        <div>
          <div className="h-8 w-24 animate-pulse rounded-2xl bg-orange-100 md:ml-auto md:h-9 md:w-32" />
          <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-slate-100 md:ml-auto md:w-24" />
        </div>
        <div className="mt-5 h-11 w-full animate-pulse rounded-2xl bg-orange-100 md:mt-6 md:h-12" />
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
  filterDesktopStickyTopClass,
  initialFilters,
  layoutVariant = "default",
  locale,
  maxAvailablePrice,
  packages,
  selectedCountry,
  selectedDuration,
  selectedStyle,
  showSummaryCard = true,
  totalPackages,
}: {
  facilities: Facility[]
  filterDesktopStickyTopClass?: string
  initialFilters?: Partial<PackageFilterState>
  layoutVariant?: "default" | "flightCatalog"
  locale: Locale
  maxAvailablePrice: number
  packages: PackageItem[]
  selectedCountry?: string
  selectedDuration?: string
  selectedStyle?: string
  showSummaryCard?: boolean
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
  const pageCacheRef = useRef(new Map<string, PackageItem[]>())
  const inFlightRequestRef = useRef<AbortController | null>(null)
  const activeRequestKeyRef = useRef<string | null>(null)
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
    pageCacheRef.current.clear()
    pageCacheRef.current.set(`page:${Math.max(1, Math.ceil(packages.length / packagesPerPage))}`, packages)
  }, [packages])

  useEffect(() => {
    return () => {
      if (freshPackageTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(freshPackageTimerRef.current)
      }
      if (inFlightRequestRef.current) {
        inFlightRequestRef.current.abort()
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

  const featuredPackage = displayedPackages[0]
  const packageSummary = featuredPackage
    ? {
        leadLabel: locale === "en" ? "Top recommendation" : locale === "zh" ? "优先推荐" : "Pilihan terbaik",
        leadValue:
          [featuredPackage.city, featuredPackage.country].filter(Boolean).join(", ") ||
          (locale === "en" ? "Featured destination" : locale === "zh" ? "精选目的地" : "Destinasi unggulan"),
        leadNote:
          locale === "en"
            ? "Recommended package match"
            : locale === "zh"
              ? "推荐套装匹配"
              : "Rekomendasi pencarian",
        metricA: {
          label: locale === "en" ? "Travel style" : locale === "zh" ? "出行风格" : "Travel style",
          value: featuredPackage.travel_style
            ? formatTravelStyleLabel(featuredPackage.travel_style, locale)
            : locale === "en"
              ? "Flexible"
              : locale === "zh"
                ? "灵活安排"
                : "Fleksibel",
        },
        metricB: {
          label: locale === "en" ? "Departure" : locale === "zh" ? "出发日期" : "Keberangkatan",
          value:
            featuredPackage.departure_date ||
            (locale === "en" ? "Available anytime" : locale === "zh" ? "随时可出发" : "Tersedia kapan saja"),
        },
        metricC: {
          label: locale === "en" ? "Group size" : locale === "zh" ? "人数" : "Jumlah peserta",
          value: `${featuredPackage.minimal_peserta || 0} ${locale === "en" ? "people" : locale === "zh" ? "人" : "orang"}`,
        },
      }
    : null

  const goToPage = async (page: number) => {
    if (page <= visiblePage || isLoadingMore) return

    const requestCacheKey = `page:${page}|${searchParams.toString()}|${locale}`
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    params.set("locale", locale)

    setIsLoadingMore(true)
    try {
      let nextItems = pageCacheRef.current.get(requestCacheKey)

      if (!nextItems) {
        if (inFlightRequestRef.current) {
          inFlightRequestRef.current.abort()
        }

        const controller = new AbortController()
        inFlightRequestRef.current = controller
        activeRequestKeyRef.current = requestCacheKey

        const response = await fetch(`/api/home-packages?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load page ${page}`)
        }

        const result = (await response.json()) as { items?: PackageItem[] }
        nextItems = result.items || []
        pageCacheRef.current.set(requestCacheKey, nextItems)
      }
      const appendedIds: string[] = []
      setDisplayedPackages((current) => {
        const seenIds = new Set(current.map((pkg) => pkg.id))
        const appendedItems = (nextItems || []).filter((pkg) => !seenIds.has(pkg.id))
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
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error(error)
    } finally {
      if (activeRequestKeyRef.current === requestCacheKey) {
        inFlightRequestRef.current = null
        activeRequestKeyRef.current = null
      }
      setIsLoadingMore(false)
    }
  }

  const layoutClass =
    layoutVariant === "flightCatalog"
      ? "mx-auto grid max-w-[1240px] gap-5 px-4 py-6 sm:px-6 md:px-8 md:py-7 lg:min-h-0 lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start"
      : "mx-auto grid max-w-[1360px] gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start lg:gap-6"
  const flightCatalogAsideClass = `w-full min-w-0 space-y-3 lg:sticky ${filterDesktopStickyTopClass || "lg:top-[8.2rem]"} lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden`
  const mainClass =
    layoutVariant === "flightCatalog"
      ? "min-w-0 space-y-4 lg:max-h-[calc(100vh-9rem)] lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden"
      : "min-w-0 space-y-4"

  return (
    <div className={layoutClass}>
      <aside
        className={
          layoutVariant === "flightCatalog"
            ? flightCatalogAsideClass
            : "w-full min-w-0"
        }
      >
        <FilterClient
          key={`${locale}:${maxAvailablePrice}:${initialFilters?.minPrice ?? 0}:${initialFilters?.maxPrice ?? maxAvailablePrice}:${(initialFilters?.selectedFacilities ?? []).join(",")}`}
          facilities={facilities}
          initialState={filters}
          locale={locale}
          maxAvailablePrice={maxAvailablePrice}
          onChange={handleFilterChange}
          packages={packages}
          selectedCountry={selectedCountry}
          selectedStyle={selectedStyle}
          selectedDuration={selectedDuration}
        />
      </aside>

      <main className={mainClass}>
        <SortBar total={totalPackages} locale={locale} summary={showSummaryCard ? packageSummary : null} />

        <div className="relative">
          {isPending ? (
            <div className="relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-orange-100 bg-[radial-gradient(circle_at_top,_rgba(255,237,213,0.92),_rgba(255,255,255,0.97)_38%,_rgba(255,247,237,0.98)_100%)] px-5 py-10 text-center shadow-[0_28px_60px_-36px_rgba(234,88,12,0.28)] sm:min-h-[400px] sm:px-7 sm:py-12 lg:min-h-[460px] lg:rounded-[32px] lg:px-8 lg:py-14">
              <div className="pointer-events-none absolute left-[-70px] top-[-90px] h-36 w-36 rounded-full bg-orange-200/30 blur-3xl sm:h-40 sm:w-40 lg:h-48 lg:w-48" />
              <div className="pointer-events-none absolute bottom-[-100px] right-[-30px] h-44 w-44 rounded-full bg-amber-100/45 blur-3xl sm:h-52 sm:w-52 lg:h-60 lg:w-60" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/55 to-transparent sm:h-24" />

              <div className="mb-5 flex items-center gap-2 rounded-full border border-orange-100 bg-white/85 px-3.5 py-1.5 shadow-sm sm:mb-6 sm:px-4 sm:py-2">
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_infinite] rounded-full bg-orange-300" />
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_0.15s_infinite] rounded-full bg-orange-400" />
                <span className="h-2.5 w-2.5 animate-[homeLoadingDot_0.9s_ease-in-out_0.3s_infinite] rounded-full bg-orange-500" />
              </div>

              <div className="relative z-10 max-w-[560px]">
                <div className="mb-4 inline-flex items-center rounded-full border border-orange-100 bg-white/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500 shadow-sm sm:mb-5 sm:text-[11px]">
                  Red Feng
                </div>
                <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-900 sm:text-[26px] md:text-[30px] lg:text-[34px]">
                  {searchMessage.title}
                </p>
                <p className="mt-3 text-[14px] leading-6 text-slate-500 sm:mt-4 sm:text-[16px] sm:leading-7 md:text-[17px] lg:text-[18px]">
                  {searchMessage.subtitle}
                </p>
              </div>
            </div>
          ) : totalPackages === 0 ? (
            <p>{t.home.noPackages}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayedPackages.map((pkg, index) => {
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
              })}
            </div>
          )}

          {!isPending && isLoadingMore && (
            <div className="mt-4 grid grid-cols-1 gap-4">
              {Array.from({ length: Math.min(packagesPerPage, Math.max(totalPackages - displayedPackages.length, 1)) }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="animate-[homePackageReveal_220ms_ease-out]"
                  style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
                >
                  <PackageCardSkeleton />
                </div>
              ))}
            </div>
          )}
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
          <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {paginationCopy.page} {visiblePage} / {totalPages}
            </p>
            {hasMorePackages ? (
              <button
                type="button"
                onClick={() => void goToPage(visiblePage + 1)}
                disabled={isPending || isLoadingMore}
                className="rounded-full border border-orange-200 bg-gradient-to-r from-[#ffefe7] to-[#fff5ee] px-5 py-2.5 text-sm font-semibold text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
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
