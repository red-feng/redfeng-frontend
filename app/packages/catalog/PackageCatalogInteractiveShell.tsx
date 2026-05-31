"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import HomeResultsClient from "@/app/HomeResultsClient"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import SearchBar from "@/app/components/SearchBar"
import type { PackageFilterState } from "@/app/packages/FilterClient"
import type { Locale } from "@/lib/i18n"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

const STICKY_SCROLL_ENTER_Y = 80
const STICKY_SCROLL_EXIT_Y = 40

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
    return locale === "en" ? "All countries" : locale === "zh" ? "å…¨éƒ¨å›½å®¶" : "Semua negara"
  }

  const normalized = value.trim().toLowerCase()
  const labels: Record<string, { id: string; en: string; zh: string }> = {
    indonesia: { id: "Indonesia", en: "Indonesia", zh: "å°åº¦å°¼è¥¿äºš" },
    japan: { id: "Jepang", en: "Japan", zh: "æ—¥æœ¬" },
    singapore: { id: "Singapura", en: "Singapore", zh: "æ–°åŠ å¡" },
    china: { id: "China", en: "China", zh: "ä¸­å›½" },
    thailand: { id: "Thailand", en: "Thailand", zh: "æ³°å›½" },
    malaysia: { id: "Malaysia", en: "Malaysia", zh: "é©¬æ¥è¥¿äºš" },
    vietnam: { id: "Vietnam", en: "Vietnam", zh: "è¶Šå—" },
    korea: { id: "Korea", en: "Korea", zh: "éŸ©å›½" },
    "south korea": { id: "Korea Selatan", en: "South Korea", zh: "éŸ©å›½" },
    "saudi arabia": { id: "Arab Saudi", en: "Saudi Arabia", zh: "æ²™ç‰¹é˜¿æ‹‰ä¼¯" },
  }

  const match = labels[normalized]
  return match ? match[locale] : value
}

function formatDurationSummary(value: string, locale: Locale) {
  if (!value) {
    return locale === "en" ? "Any duration" : locale === "zh" ? "ä»»æ„æ—¶é•¿" : "Durasi fleksibel"
  }
  if (value === "1-3") return locale === "en" ? "1-3 days" : locale === "zh" ? "1-3 å¤©" : "1-3 hari"
  if (value === "4-7") return locale === "en" ? "4-7 days" : locale === "zh" ? "4-7 å¤©" : "4-7 hari"
  if (value === "8+") return locale === "en" ? "8+ days" : locale === "zh" ? "8 å¤©ä»¥ä¸Š" : "8+ hari"
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
  const quickChipScrollRef = useRef<HTMLDivElement | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isStickySearchExpanded, setIsStickySearchExpanded] = useState(false)
  const [canScrollChipLeft, setCanScrollChipLeft] = useState(false)
  const [canScrollChipRight, setCanScrollChipRight] = useState(false)

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

  useEffect(() => {
    const container = quickChipScrollRef.current
    if (!container || isStickySearchExpanded) return

    const updateChipScrollState = () => {
      setCanScrollChipLeft(container.scrollLeft > 8)
      setCanScrollChipRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8)
    }

    updateChipScrollState()
    container.addEventListener("scroll", updateChipScrollState, { passive: true })
    window.addEventListener("resize", updateChipScrollState)

    return () => {
      container.removeEventListener("scroll", updateChipScrollState)
      window.removeEventListener("resize", updateChipScrollState)
    }
  }, [isStickySearchExpanded, totalPackages, selectedStyle, selectedDuration])

  const compactCopy = useMemo(
    () =>
      locale === "en"
        ? { style: "Travel style", duration: "Duration", action: "Edit search" }
        : locale === "zh"
          ? { style: "æ—…è¡Œé£Žæ ¼", duration: "è¡Œç¨‹æ—¶é•¿", action: "è°ƒæ•´æœç´¢" }
          : { style: "Travel style", duration: "Durasi", action: "Ubah pencarian" },
    [locale],
  )

  const compactSecondaryAction = locale === "en" ? "Filters" : locale === "zh" ? "ç­›é€‰" : "Filter"
  const compactSummaryMeta =
    locale === "en" ? "Packages ready to compare" : locale === "zh" ? "å¯ç›´æŽ¥æ¯”è¾ƒçš„å¥—é¤" : "Paket siap dibandingkan"

  const styleSummary = selectedStyle
    ? formatTravelStyleLabel(selectedStyle, locale)
    : locale === "en"
      ? "All styles"
      : locale === "zh"
        ? "å…¨éƒ¨é£Žæ ¼"
        : "Semua style"

  const durationSummary = formatDurationSummary(selectedDuration, locale)
  const chips = [
    {
      key: "style",
      label: compactCopy.style,
      value: styleSummary,
      tone: "border-[#f0d4c4] bg-[#fff3ea] text-[#b85a2c]",
    },
    {
      key: "duration",
      label: compactCopy.duration,
      value: durationSummary,
      tone: "border-[#e7edf4] bg-[#f8fafc] text-slate-600",
    },
    {
      key: "results",
      label: locale === "en" ? "Results" : locale === "zh" ? "Ã§Â»â€œÃ¦Å¾Å“" : "Hasil",
      value: `${totalPackages}`,
      tone: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    },
  ]

  const shouldShowCompactStickyBar = isScrolled
  const showChipScrollLeft = !isStickySearchExpanded && canScrollChipLeft
  const showChipScrollRight = !isStickySearchExpanded && canScrollChipRight

  const scrollToSearch = () => {
    const target = searchSectionRef.current
    if (!target) return

    const headerOffset = typeof window !== "undefined" && window.innerWidth >= 1024 ? 72 : 52
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  const scrollQuickChips = (direction: "left" | "right") => {
    const container = quickChipScrollRef.current
    if (!container) return

    const amount = Math.max(220, Math.floor(container.clientWidth * 0.72))
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    })
  }

  const stickyBar = shouldShowCompactStickyBar ? (
    <div className="fixed inset-x-0 top-0 z-[90] border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm animate-[packageStickyDock_180ms_ease-out]">
      <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3 lg:py-0`}>
        <div className={homeLayoutLock.contentWidthClass}>
          <div className="scale-[0.994] overflow-hidden rounded-[22px] border border-[#f1ddd0] bg-white/92 backdrop-blur transition-all duration-200 lg:border-transparent lg:bg-transparent lg:shadow-none">
            {isStickySearchExpanded ? (
              <div className="animate-[packageStickyExpand_220ms_ease-out] p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">
                      {formatCountrySummary(selectedCountry, locale)}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-slate-500">
                      {compactCopy.style}: {styleSummary} | {compactCopy.duration}: {durationSummary}
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
                      {locale === "en" ? "Close" : locale === "zh" ? "å…³é—­" : "Tutup"}
                    </button>
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {chips.map((chip) => (
                    <span key={chip.key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${chip.tone}`}>
                      <span className="text-[10px] uppercase tracking-[0.18em] opacity-75">{chip.label}</span>
                      <span className="font-semibold">{chip.value}</span>
                    </span>
                  ))}
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
              <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1.08fr)_44px_minmax(0,1fr)_108px] xl:items-center">
                <button type="button" onClick={() => setIsStickySearchExpanded(true)} className="min-w-0 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">
                      {formatCountrySummary(selectedCountry, locale)}
                    </p>
                    <p className="mt-1 truncate text-[13px] text-slate-500">
                      {compactCopy.style}: {styleSummary} | {compactCopy.duration}: {durationSummary}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{compactSummaryMeta}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStickySearchExpanded(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                  aria-label={compactCopy.action}
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="M10.5 10.5 14 14" />
                  </svg>
                </button>
                <div className="relative">
                  {showChipScrollLeft ? (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollQuickChips("left")}
                        className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#f1ddd0] bg-white/95 text-[#b85a2c] shadow-sm transition hover:border-[#efc4ad] hover:text-[#ef5b2a] xl:inline-flex"
                        aria-label="Scroll quick filters left"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                          <path d="M9.5 3.5 5 8l4.5 4.5" />
                        </svg>
                      </button>
                      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-white via-white/92 to-transparent xl:block" />
                    </>
                  ) : null}
                  {showChipScrollRight ? (
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white via-white/92 to-transparent xl:block" />
                  ) : null}
                  <div
                    ref={quickChipScrollRef}
                    className="overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="flex min-w-max gap-2 pr-1">
                      {chips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setIsStickySearchExpanded(true)}
                          className={`min-w-[124px] snap-start rounded-[14px] border px-3 py-2 text-left transition hover:brightness-[0.98] ${chip.tone}`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] opacity-70">{chip.label}</p>
                          <p className="mt-1 text-[12px] font-semibold">{chip.value}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {showChipScrollRight ? (
                    <button
                      type="button"
                      onClick={() => scrollQuickChips("right")}
                      className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#f1ddd0] bg-white/95 text-[#b85a2c] shadow-sm transition hover:border-[#efc4ad] hover:text-[#ef5b2a] xl:inline-flex"
                      aria-label="Scroll quick filters right"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                        <path d="M6.5 3.5 11 8l-4.5 4.5" />
                      </svg>
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={scrollToSearch}
                  className="inline-flex h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] border border-[#efc4ad] bg-[#fff1e7] px-4 text-center text-[12px] font-semibold text-[#b85a2c] shadow-[0_10px_20px_-18px_rgba(239,91,42,0.35)] transition hover:bg-[#ffe7d8]"
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                    <path d="M3.5 4.5h9" />
                    <path d="M5.5 8h5" />
                    <path d="M7 11.5h2" />
                    <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
                  </svg>
                  <span>{compactSecondaryAction}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {stickyBar && typeof document !== "undefined" ? createPortal(stickyBar, document.body) : stickyBar}
      <section className="pb-1 pt-4 md:pt-5">
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
        filterDesktopStickyTopClass="lg:top-[12.25rem]"
        initialFilters={initialFilters}
        layoutVariant="flightCatalog"
        locale={locale}
        maxAvailablePrice={maxAvailablePrice}
        packages={packages}
        totalPackages={totalPackages}
      />

      <PublicStickyAction locale={locale} href="#package-search" label={stickyLabel} summary={stickySummary} />
      <PublicMobileNav locale={locale} />
      <style jsx>{`
        @keyframes packageStickyDock {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes packageStickyExpand {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
