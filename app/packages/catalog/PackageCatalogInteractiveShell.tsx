"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import HomeResultsClient from "@/app/HomeResultsClient"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import type { Locale } from "@/lib/i18n"
import type { PackageFilterState } from "@/app/packages/FilterClient"

const STICKY_SCROLL_ENTER_Y = 220
const STICKY_SCROLL_EXIT_Y = 140

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

type Props = {
  facilities: Facility[]
  initialFilters: Partial<PackageFilterState>
  locale: Locale
  maxAvailablePrice: number
  packages: PackageItem[]
  searchBarCountries: string[]
  searchParamsKey: string
  stickyLabel: string
  stickySummary: string
  totalPackages: number
  selectedCountry: string
  selectedStyle: string
  selectedDuration: string
}

function formatCountrySummary(value: string, locale: Locale) {
  if (!value) {
    return locale === "en" ? "All countries" : locale === "zh" ? "全部国家" : "Semua negara"
  }

  const normalized = value.trim().toLowerCase()
  const labels: Record<string, { id: string; en: string; zh: string }> = {
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
  const match = labels[normalized]
  return match ? match[locale] : value
}

function formatDurationSummary(value: string, locale: Locale) {
  if (!value) {
    return locale === "en" ? "Any duration" : locale === "zh" ? "任意时长" : "Durasi fleksibel"
  }
  if (value === "1-3") return locale === "en" ? "1-3 days" : locale === "zh" ? "1-3 天" : "1-3 hari"
  if (value === "4-7") return locale === "en" ? "4-7 days" : locale === "zh" ? "4-7 天" : "4-7 hari"
  if (value === "8+") return locale === "en" ? "8+ days" : locale === "zh" ? "8 天以上" : "8+ hari"
  return value
}

export default function PackageCatalogInteractiveShell({
  facilities,
  initialFilters,
  locale,
  maxAvailablePrice,
  packages,
  searchBarCountries,
  searchParamsKey,
  stickyLabel,
  stickySummary,
  totalPackages,
  selectedCountry,
  selectedStyle,
  selectedDuration,
}: Props) {
  const searchSectionRef = useRef<HTMLDivElement | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isStickySearchExpanded, setIsStickySearchExpanded] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled((current) => {
        const nextScrolled = current ? window.scrollY > STICKY_SCROLL_EXIT_Y : window.scrollY > STICKY_SCROLL_ENTER_Y
        if (!nextScrolled) {
          setIsStickySearchExpanded(false)
        }
        return nextScrolled
      })
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const compactCopy = useMemo(
    () =>
      locale === "en"
        ? {
            style: "Travel style",
            duration: "Duration",
            action: "Edit search",
          }
        : locale === "zh"
          ? {
              style: "旅行风格",
              duration: "行程时长",
              action: "调整搜索",
            }
          : {
              style: "Travel style",
              duration: "Durasi",
              action: "Ubah pencarian",
            },
    [locale],
  )

  const styleSummary = selectedStyle
    ? formatTravelStyleLabel(selectedStyle, locale)
    : locale === "en"
      ? "All styles"
      : locale === "zh"
        ? "全部风格"
        : "Semua style"

  const shouldShowCompactStickyBar = isScrolled

  const scrollToSearch = () => {
    const target = searchSectionRef.current
    if (!target) return

    const headerOffset = 92
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  return (
    <>
      {shouldShowCompactStickyBar ? (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]">
          <div className="mx-auto max-w-[1240px] px-4 py-2 sm:px-6 sm:py-3 md:px-8">
            <div className="scale-[0.994] rounded-[22px] border border-[#f1ddd0] bg-white/92 transition-all duration-200">
              {isStickySearchExpanded ? (
                <div className="p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">
                        {formatCountrySummary(selectedCountry, locale)}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-500">
                        {compactCopy.style}: {styleSummary} | {compactCopy.duration}: {formatDurationSummary(selectedDuration, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={scrollToSearch}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                        aria-label={compactCopy.action}
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                          <path d="M8 12.5v-9" />
                          <path d="M4.5 6.5 8 3l3.5 3.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsStickySearchExpanded(false)}
                        className="inline-flex rounded-[12px] border border-[#f1ddd0] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {locale === "en" ? "Close" : locale === "zh" ? "关闭" : "Tutup"}
                      </button>
                    </div>
                  </div>
                  <SearchBar
                    key={`package-catalog-sticky-search:${locale}:${searchParamsKey}`}
                    locale={locale}
                    countries={searchBarCountries}
                    destinationPath="/packages/catalog"
                    variant="catalog"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setIsStickySearchExpanded(true)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[18px] border border-[#f0d4c4] bg-white px-4 py-3 text-left shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)] transition hover:border-[#ebb89f] hover:bg-[#fffdfb]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-slate-950">
                        {formatCountrySummary(selectedCountry, locale)}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-slate-500">
                        {compactCopy.style}: {styleSummary} | {compactCopy.duration}: {formatDurationSummary(selectedDuration, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#fff3ea] px-3 py-1.5 text-[11px] font-semibold text-[#ef5b2a]">
                      {compactCopy.action}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={scrollToSearch}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                    aria-label={compactCopy.action}
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                      <path d="M8 12.5v-9" />
                      <path d="M4.5 6.5 8 3l3.5 3.5" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="-mt-8 pb-1 lg:-mt-12">
        <div id="package-search" ref={searchSectionRef} className="mx-auto max-w-[1240px] px-4 sm:px-6 md:px-8">
          <SearchBar
            key={`package-catalog-search:${locale}:${searchParamsKey}`}
            locale={locale}
            countries={searchBarCountries}
            destinationPath="/packages/catalog"
            variant="catalog"
          />
        </div>
      </section>

      <HomeResultsClient
        key={`package-catalog-results:${locale}:${searchParamsKey}`}
        facilities={facilities}
        filterDesktopStickyTopClass="lg:top-[8.2rem]"
        initialFilters={initialFilters}
        layoutVariant="flightCatalog"
        locale={locale}
        maxAvailablePrice={maxAvailablePrice}
        packages={packages}
        totalPackages={totalPackages}
      />

      <PublicStickyAction locale={locale} href="#package-search" label={stickyLabel} summary={stickySummary} />
      <PublicMobileNav locale={locale} />
    </>
  )
}
