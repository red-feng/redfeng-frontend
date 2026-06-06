"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import HomeResultsClient from "@/app/HomeResultsClient"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import SearchBar from "@/app/components/SearchBar"
import type { PackageFilterState } from "@/app/packages/FilterClient"
import type { Locale } from "@/lib/i18n"
import { resolvePackageTranslation } from "@/lib/package-pricing"
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
  package_details?:
    | {
        location_label?: string | null
        location_type?: string | null
        primary_lat?: number | null
        primary_lng?: number | null
        viewport_radius_km?: number | null
      }
    | {
        location_label?: string | null
        location_type?: string | null
        primary_lat?: number | null
        primary_lng?: number | null
        viewport_radius_km?: number | null
      }[]
    | null
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

function getPackageDisplayTitle(pkg: PackageItem, locale: Locale) {
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const fallbackTitleFromSlug = decodeURIComponent(pkg.slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return translation?.title?.trim() || fallbackTitleFromSlug || "Untitled package"
}

function formatPackageMeta(pkg: PackageItem, locale: Locale) {
  const parts = [
    [pkg.city, pkg.country].filter(Boolean).join(", "),
    pkg.travel_style ? formatTravelStyleLabel(pkg.travel_style, locale) : "",
    pkg.duration
      ? locale === "en"
        ? `${pkg.duration} days`
        : locale === "zh"
          ? `${pkg.duration} 天`
          : `${pkg.duration} hari`
      : "",
  ].filter(Boolean)

  return parts.join(" • ")
}

function formatPackagePrice(value: number | null | undefined, currency: string | null | undefined, locale: Locale) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-"

  const localeMap: Record<Locale, string> = {
    id: "id-ID",
    en: "en-US",
    zh: "zh-CN",
  }

  try {
    return new Intl.NumberFormat(localeMap[locale], {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency || "IDR"} ${value.toLocaleString(localeMap[locale])}`
  }
}

function getPackageSortPrice(pkg: PackageItem) {
  const livePrice = pkg.livePricing?.priceAdult
  if (typeof livePrice === "number" && Number.isFinite(livePrice)) return livePrice
  if (typeof pkg.price_adult === "number" && Number.isFinite(pkg.price_adult)) return pkg.price_adult
  return Number.MAX_SAFE_INTEGER
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
  const resultsSectionRef = useRef<HTMLDivElement | null>(null)
  const quickChipScrollRef = useRef<HTMLDivElement | null>(null)
  const recommendationScrollRef = useRef<HTMLDivElement | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isStickySearchExpanded, setIsStickySearchExpanded] = useState(false)
  const [canScrollChipLeft, setCanScrollChipLeft] = useState(false)
  const [canScrollChipRight, setCanScrollChipRight] = useState(false)
  const [canScrollRecommendationLeft, setCanScrollRecommendationLeft] = useState(false)
  const [canScrollRecommendationRight, setCanScrollRecommendationRight] = useState(false)

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

  useEffect(() => {
    const container = recommendationScrollRef.current
    if (!container) return

    const updateRecommendationScrollState = () => {
      setCanScrollRecommendationLeft(container.scrollLeft > 8)
      setCanScrollRecommendationRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8)
    }

    updateRecommendationScrollState()
    container.addEventListener("scroll", updateRecommendationScrollState, { passive: true })
    window.addEventListener("resize", updateRecommendationScrollState)

    return () => {
      container.removeEventListener("scroll", updateRecommendationScrollState)
      window.removeEventListener("resize", updateRecommendationScrollState)
    }
  }, [packages, locale, totalPackages])

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
      badgeTone: "border-[#f0d4c4] bg-[#fff3ea] text-[#b85a2c]",
      cardTone: "border-[#efc4ad] bg-[#fff1e7] text-[#b85a2c] shadow-[0_10px_20px_-18px_rgba(239,91,42,0.35)]",
      valueTone: "text-[#ef5b2a]",
      note: locale === "en" ? "Selected" : locale === "zh" ? "已选" : "Dipilih",
    },
    {
      key: "duration",
      label: compactCopy.duration,
      value: durationSummary,
      badgeTone: "border-[#e7edf4] bg-[#f8fafc] text-slate-600",
      cardTone: "border-[#f1ddd0] bg-[#fffdfa] text-slate-600 hover:border-[#efc4ad] hover:bg-[#fff6ee]",
      valueTone: "text-slate-700",
      note: locale === "en" ? "Flexible" : locale === "zh" ? "灵活" : "Fleksibel",
    },
    {
      key: "results",
      label: locale === "en" ? "Results" : locale === "zh" ? "Ã§Â»â€œÃ¦Å¾Å“" : "Hasil",
      value: `${totalPackages}`,
      badgeTone: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
      cardTone: "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300",
      valueTone: "text-emerald-700",
      note: locale === "en" ? "Ready now" : locale === "zh" ? "可用" : "Ready",
    },
  ]
  const stickyChips = chips.map((chip) => {
    if (chip.key === "style") {
      return {
        ...chip,
        note: selectedStyle ? (locale === "en" ? "Selected" : locale === "zh" ? "已选" : "Dipilih") : compactCopy.action,
      }
    }

    if (chip.key === "duration") {
      return {
        ...chip,
        note:
          selectedDuration
            ? locale === "en"
              ? "Selected"
              : locale === "zh"
                ? "已选"
                : "Dipilih"
            : locale === "en"
              ? "Flexible"
              : locale === "zh"
                ? "灵活"
                : "Fleksibel",
      }
    }

    if (chip.key === "results") {
      return {
        ...chip,
        label: locale === "en" ? "Results" : locale === "zh" ? "结果" : "Hasil",
        note:
          totalPackages > 0
            ? locale === "en"
              ? "Ready now"
              : locale === "zh"
                ? "可用"
                : "Ready"
            : locale === "en"
              ? "No results"
              : locale === "zh"
                ? "无结果"
                : "Belum ada",
      }
    }

    return chip
  })
  const recommendationPackages = [...packages].sort((a, b) => getPackageSortPrice(a) - getPackageSortPrice(b)).slice(0, 15)
  const filterSummaryTitle = [formatCountrySummary(selectedCountry, locale), selectedStyle ? formatTravelStyleLabel(selectedStyle, locale) : styleSummary, durationSummary]
    .filter(Boolean)
    .join(" • ")
  const filterSummaryMeta =
    locale === "en"
      ? `Showing ${recommendationPackages.length} cheapest matching packages`
      : locale === "zh"
        ? `显示 ${recommendationPackages.length} 个最便宜的匹配套餐`
        : `Menampilkan ${recommendationPackages.length} paket termurah yang cocok`
  const recommendationTitle =
    locale === "en"
      ? "Top cheapest package picks"
      : locale === "zh"
        ? "实时套餐推荐"
        : "Rekomendasi paket termurah"
  const recommendationFallback =
    locale === "en"
      ? "Only a few packages match the current filters."
      : locale === "zh"
        ? "当前筛选条件下可匹配的套餐较少。"
        : "Hanya sedikit paket yang cocok dengan filter aktif."
  const recommendationActionLabel =
    locale === "en"
      ? "View list"
      : locale === "zh"
        ? "查看列表"
        : "Lihat list"

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

  const scrollToResults = () => {
    const target = resultsSectionRef.current
    if (!target) return

    const headerOffset = typeof window !== "undefined" && window.innerWidth >= 1024 ? 110 : 80
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  const handleStickyChipClick = (chipKey: string) => {
    if (chipKey === "results") {
      setIsStickySearchExpanded(false)
      scrollToResults()
      return
    }

    setIsStickySearchExpanded(true)
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

  const scrollRecommendationCards = (direction: "left" | "right") => {
    const container = recommendationScrollRef.current
    if (!container) return

    const amount = Math.max(240, Math.floor(container.clientWidth * 0.72))
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
                  {stickyChips.map((chip) => (
                    <span key={chip.key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${chip.badgeTone}`}>
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
                      {stickyChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => handleStickyChipClick(chip.key)}
                          className={`min-w-[124px] snap-start rounded-[14px] border px-3 py-2 text-left transition ${chip.cardTone}`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] opacity-70">{chip.label}</p>
                          <p className={`mt-1 text-[12px] font-semibold ${chip.valueTone}`}>{chip.value}</p>
                          <p className={`mt-1 text-[10px] font-medium ${chip.valueTone}`}>{chip.note}</p>
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
      <main className={`${homeLayoutLock.pageXClass} relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,215,196,0.22),transparent_24%),radial-gradient(circle_at_right_18%,rgba(255,224,205,0.18),transparent_20%),linear-gradient(180deg,#fffdfb_0%,#f8fbff_52%,#ffffff_100%)] pb-10 pt-4 md:pb-14 md:pt-5`}>
        <section className="pb-1">
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

        <section className={`${homeLayoutLock.contentWidthClass} mt-5 max-w-[1240px]`}>
          <div
            className="relative overflow-hidden rounded-[20px] border border-[#ffc49b] bg-[#ff9a61] px-5 py-5 shadow-[0_24px_46px_-34px_rgba(239,98,44,0.44)]"
            style={{
              backgroundImage: "url('/package-strip-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,109,33,0.28)_0%,rgba(255,109,33,0.1)_35%,rgba(255,255,255,0.04)_100%)]" />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-[430px]">
                <div className="rounded-[28px] border border-white/70 bg-white px-7 py-6 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.22)]">
                  <p className="text-[16px] font-semibold tracking-[-0.03em] text-[#11a36a]">
                    {filterSummaryTitle}
                  </p>
                  <p className="mt-2 text-[14px] text-slate-500">
                    {filterSummaryMeta}
                  </p>
                </div>
              </div>

              {false ? (
                <div className="min-w-0 flex-1 xl:max-w-[680px]">
                <div className="overflow-hidden rounded-[18px] border border-[#ff9a68] bg-[linear-gradient(135deg,rgba(255,123,63,0.92)_0%,rgba(255,90,40,0.92)_100%)] p-3 shadow-[0_20px_32px_-24px_rgba(239,68,35,0.42)] backdrop-blur-[2px]">
                  <div className="flex min-w-0 flex-col gap-3 xl:min-h-[96px] xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                      {canScrollRecommendationLeft ? (
                        <>
                          <button
                            type="button"
                            onClick={() => scrollRecommendationCards("left")}
                            className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                            aria-label="Scroll package recommendations left"
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                              <path d="M9.5 3.5 5 8l4.5 4.5" />
                            </svg>
                          </button>
                          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-white via-white/92 to-transparent xl:block" />
                        </>
                      ) : null}
                      {canScrollRecommendationRight ? (
                        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white via-white/92 to-transparent xl:block" />
                      ) : null}
                      <div ref={recommendationScrollRef} className="overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden">
                        {recommendationPackages.length === 0 ? (
                          <div className="flex min-h-[92px] items-center rounded-[14px] border border-white/35 bg-white/12 px-4 py-3 text-[12px] font-medium text-white/90">
                            {recommendationFallback}
                          </div>
                        ) : (
                          <div className="flex min-w-max items-stretch gap-2 pr-1">
                            {recommendationPackages.map((pkg, index) => {
                              const isActive = index === 0
                              const isBudgetPick = !isActive && index === 1
                              const rankingLabel =
                                index === 0
                                  ? locale === "en"
                                    ? "#1 Cheapest"
                                    : locale === "zh"
                                      ? "#1 最低价"
                                      : "#1 Termurah"
                                  : index === 1
                                    ? "#2"
                                    : index === 2
                                      ? "#3"
                                      : `#${index + 1}`
                              return (
                                <Link
                                  key={pkg.id}
                                  href={`/packages/${encodeURIComponent(pkg.slug)}`}
                                  className={`min-w-[152px] snap-start rounded-[14px] border px-3 py-2 text-left transition ${
                                    isActive
                                      ? "border-[#7ed321] bg-[linear-gradient(180deg,#f7fff1_0%,#ecffe0_100%)] text-[#11a36a] shadow-[0_0_0_1px_rgba(126,211,33,0.8),0_0_10px_rgba(126,211,33,0.28),0_10px_22px_-18px_rgba(56,161,105,0.55)]"
                                      : isBudgetPick
                                        ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50"
                                  }`}
                                >
                                  <p
                                    className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                      isActive ? "text-[#11a36a]" : isBudgetPick ? "text-emerald-700" : "text-slate-400"
                                    }`}
                                  >
                                    {rankingLabel}
                                  </p>
                                  <p className="truncate text-[12px] font-semibold">{getPackageDisplayTitle(pkg, locale)}</p>
                                  <p className={`mt-1 text-[12px] font-semibold ${isActive ? "text-[#11a36a]" : isBudgetPick ? "text-emerald-700" : "text-slate-700"}`}>
                                    {formatPackagePrice(pkg.livePricing?.priceAdult ?? pkg.price_adult, pkg.livePricing?.currency ?? pkg.currency, locale)}
                                  </p>
                                  <p className={`mt-1 truncate text-[10px] font-medium ${isActive ? "text-[#11a36a]" : isBudgetPick ? "text-emerald-700" : "text-slate-500"}`}>
                                    {isActive ? recommendationTitle : isBudgetPick ? (locale === "en" ? "Value pick" : locale === "zh" ? "超值推荐" : "Pilihan hemat") : formatPackageMeta(pkg, locale) || recommendationTitle}
                                  </p>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {canScrollRecommendationRight ? (
                        <button
                          type="button"
                          onClick={() => scrollRecommendationCards("right")}
                          className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                          aria-label="Scroll package recommendations right"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                            <path d="M6.5 3.5 11 8l-4.5 4.5" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={scrollToResults}
                      title={recommendationActionLabel}
                      className="inline-flex shrink-0 flex-col items-center justify-center gap-2 rounded-[16px] border border-white/40 bg-transparent px-4 py-3 text-center text-[12px] font-semibold text-white shadow-none transition hover:bg-white/10 xl:min-w-[92px]"
                    >
                      <svg viewBox="0 0 16 16" className="h-7 w-7 fill-none stroke-current stroke-[1.8]">
                        <rect x="2.5" y="3" width="11" height="10" rx="2" />
                        <path d="M5 6h6M5 8.5h6M5 11h4" />
                      </svg>
                      <span>{recommendationActionLabel}</span>
                    </button>
                  </div>
                </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div id="package-search-results" ref={resultsSectionRef}>
          <HomeResultsClient
            key={`package-catalog-results:${locale}:${searchParamsKey}`}
            facilities={facilities}
            filterDesktopStickyTopClass="lg:top-[8.2rem]"
            initialFilters={initialFilters}
            layoutVariant="flightCatalog"
            locale={locale}
            maxAvailablePrice={maxAvailablePrice}
            packages={packages}
            searchBarCountries={searchBarCountries}
            selectedCountry={selectedCountry}
            selectedStyle={selectedStyle}
            selectedDuration={selectedDuration}
            totalPackages={totalPackages}
          />
        </div>
      </main>

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
