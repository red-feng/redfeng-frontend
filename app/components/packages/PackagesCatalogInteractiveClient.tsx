"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import HomeResultsClient from "@/app/HomeResultsClient"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"
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

type PackageFilterState = {
  minPrice: number
  maxPrice: number
  selectedFacilities: string[]
}

const STICKY_SCROLL_ENTER_Y = 220
const STICKY_SCROLL_EXIT_Y = 140

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  )
}

function buildSummaryCards(packages: PackageItem[], locale: Locale) {
  return packages.slice(0, 3).map((entry, index) => ({
    key: `${entry.id}-${index}`,
    title: entry.city || entry.country || (locale === "en" ? "Package" : locale === "zh" ? "å¥—è£…" : "Paket"),
    meta: [
      entry.travel_style ? formatTravelStyleLabel(entry.travel_style, locale) : null,
      entry.duration ? `${entry.duration} ${locale === "en" ? "days" : locale === "zh" ? "å¤©" : "hari"}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
  }))
}

export default function PackagesCatalogInteractiveClient({
  countries,
  facilities,
  initialFilters,
  locale,
  maxAvailablePrice,
  packages,
  searchKey,
  totalPackages,
}: {
  countries: string[]
  facilities: Facility[]
  initialFilters?: Partial<PackageFilterState>
  locale: Locale
  maxAvailablePrice: number
  packages: PackageItem[]
  searchKey: string
  totalPackages: number
}) {
  const searchParams = useSearchParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isStickySearchExpanded, setIsStickySearchExpanded] = useState(false)
  const isScrolledRef = useRef(false)
  const heroSearchSectionRef = useRef<HTMLElement | null>(null)

  const copy = {
    id: {
      topLabel: "Katalog Paket Tour",
      topTitle: "Katalog paket tour Red Feng dengan alur pencarian yang setara katalog pesawat.",
      topBody: "Kami susun ulang area atas agar ritmenya sama seperti katalog pesawat: hero pencarian, ringkasan hasil, sticky compact bar, lalu langsung masuk ke hasil dan filter.",
      refineSearch: "Ubah pencarian",
      resultsFound: "paket ditemukan",
      browsePackages: "Jelajahi paket",
      featuredLabel: "Rekomendasi pencarian",
      activeFilters: "Filter aktif",
    },
    en: {
      topLabel: "Package Tour Catalog",
      topTitle: "Red Feng package catalog with the same search rhythm as the flight catalog.",
      topBody: "We rebuilt the top area to match the flight catalog flow: search hero, result summary, compact sticky bar, then straight into filters and package results.",
      refineSearch: "Refine search",
      resultsFound: "packages found",
      browsePackages: "Browse packages",
      featuredLabel: "Recommended search",
      activeFilters: "Active filters",
    },
    zh: {
      topLabel: "å¥—é¤ç›®å½•",
      topTitle: "Red Feng å¥—é¤ç›®å½•ï¼Œæœç´¢èŠ‚å¥ä¸Žèˆªç­ç›®å½•ä¸€è‡´ã€‚",
      topBody: "æˆ‘ä»¬é‡å»ºäº†é¡¶éƒ¨åŒºåŸŸï¼Œä½¿å…¶ä¸Žèˆªç­ç›®å½•æ‹¥æœ‰åŒæ ·çš„æµç¨‹ï¼šæœç´¢ heroã€ç»“æžœæ¦‚è§ˆã€compact sticky barï¼Œç„¶åŽç›´æŽ¥è¿›å…¥ç­›é€‰ä¸Žå¥—é¤ç»“æžœã€‚",
      refineSearch: "è°ƒæ•´æœç´¢",
      resultsFound: "ä¸ªå¥—é¤",
      browsePackages: "æµè§ˆå¥—é¤",
      featuredLabel: "æŽ¨èæœç´¢",
      activeFilters: "å·²å¯ç”¨ç­›é€‰",
    },
  }[locale]

  const selectedCountry = String(searchParams.get("country") || "").trim()
  const selectedStyle = String(searchParams.get("style") || "").trim().replace(/_/g, " ")
  const selectedDuration = String(searchParams.get("duration") || "").trim()

  const summaryChips = useMemo(() => {
    const chips = [selectedCountry, selectedStyle, selectedDuration].filter(Boolean)
    return chips.slice(0, 4)
  }, [selectedCountry, selectedDuration, selectedStyle])

  const shouldShowCompactStickyBar = isScrolled && !isStickySearchExpanded
  const topPackages = packages.slice(0, 4)
  const leadPackage = topPackages[0]
  const leadRoute =
    [leadPackage?.city, leadPackage?.country].filter(Boolean).join(", ") ||
    (locale === "en" ? "Featured destination" : locale === "zh" ? "ç²¾é€‰ç›®çš„åœ°" : "Destinasi unggulan")
  const resultsCountLabel =
    locale === "en"
      ? `${totalPackages} ${copy.resultsFound}`
      : locale === "zh"
        ? `${totalPackages} ${copy.resultsFound}`
        : `${totalPackages} ${copy.resultsFound}`
  const leadMeta = [
    leadPackage?.travel_style ? formatTravelStyleLabel(leadPackage.travel_style, locale) : null,
    leadPackage?.duration ? `${leadPackage.duration} ${locale === "en" ? "days" : locale === "zh" ? "å¤©" : "hari"}` : null,
    resultsCountLabel,
  ]
    .filter(Boolean)
    .join(" • ")
  const summaryCards = useMemo(() => buildSummaryCards(packages, locale), [locale, packages])
  const stickyTitle =
    selectedCountry ||
    (locale === "en" ? "All package tours" : locale === "zh" ? "All package tours" : "Semua paket tour")
  const stickySubtitle = [selectedStyle, selectedDuration, resultsCountLabel].filter(Boolean).join(" • ") || copy.topBody

  useEffect(() => {
    const syncScrollState = () => {
      const nextScrolled = isScrolledRef.current
        ? window.scrollY > STICKY_SCROLL_EXIT_Y
        : window.scrollY > STICKY_SCROLL_ENTER_Y

      if (nextScrolled === isScrolledRef.current) return

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
      if (!nextScrolled) {
        setIsStickySearchExpanded(false)
      }
    }

    syncScrollState()
    window.addEventListener("scroll", syncScrollState, { passive: true })
    return () => window.removeEventListener("scroll", syncScrollState)
  }, [])

  const scrollToHeroSearch = () => {
    setIsStickySearchExpanded(false)
    const section = heroSearchSectionRef.current
    if (!section) return

    const top = section.getBoundingClientRect().top + window.scrollY - 92
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
  }

  return (
    <main className={`${homeLayoutLock.pageXClass} relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,215,196,0.38),transparent_28%),radial-gradient(circle_at_right_18%,rgba(255,224,205,0.32),transparent_22%),linear-gradient(180deg,#fffdfb_0%,#f8fbff_52%,#ffffff_100%)] pb-10 pt-5 md:pb-14`}>
      {shouldShowCompactStickyBar ? (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]">
          <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3 lg:py-0`}>
            <div className={homeLayoutLock.contentWidthClass}>
              <div className="scale-[0.994] rounded-[22px] border border-[#f1ddd0] bg-white/92 transition-all duration-200 lg:border-transparent lg:bg-transparent">
                <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1.08fr)_44px_minmax(0,1fr)_108px] xl:items-center">
                  <button type="button" onClick={() => setIsStickySearchExpanded(true)} className="min-w-0 text-left">
                    <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{stickyTitle}</p>
                    <p className="mt-1 truncate text-[13px] text-slate-500">{stickySubtitle}</p>
                  </button>
                  <button
                    type="button"
                    onClick={scrollToHeroSearch}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                    aria-label={copy.refineSearch}
                  >
                    <SearchIcon />
                  </button>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {summaryChips.length > 0 ? (
                      summaryChips.map((chip) => (
                        <span key={chip} className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-[#b85a2c]">
                          {chip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500">{copy.activeFilters}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={scrollToHeroSearch}
                    className="inline-flex h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] border border-[#efc4ad] bg-[#fff1e7] px-4 text-center text-[12px] font-semibold text-[#b85a2c] shadow-[0_10px_20px_-18px_rgba(239,91,42,0.35)] transition hover:bg-[#ffe7d8]"
                  >
                    <SearchIcon />
                    <span>{copy.refineSearch}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section ref={heroSearchSectionRef} className={`${homeLayoutLock.contentWidthClass} mt-6 max-w-[1240px]`}>
        {!shouldShowCompactStickyBar ? (
          <>
            <div className="rounded-[30px] border border-[#f4ebe4] bg-white p-4 shadow-[0_22px_56px_-36px_rgba(15,23,42,0.22)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f5ede7] px-2 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ef5b2a]">{copy.topLabel}</p>
                  <h1 className="mt-3 max-w-[720px] text-[26px] font-semibold leading-[1.15] tracking-[-0.04em] text-slate-900 sm:text-[32px]">
                    {copy.topTitle}
                  </h1>
                  <p className="mt-3 max-w-[760px] text-[14px] leading-6 text-slate-500 sm:text-[15px]">{copy.topBody}</p>
                </div>
                <div className="rounded-[22px] border border-[#f1ddd0] bg-[#fffaf6] px-4 py-3 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.22)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ef5b2a]">{copy.featuredLabel}</p>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">{leadRoute}</p>
                  <p className="mt-1 text-[12px] text-slate-500">{leadMeta}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f1ebe5] bg-[#fffdfa] p-3">
                <SearchBar key={`search:${locale}:${searchKey}`} locale={locale} countries={countries} variant="catalog" />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {summaryChips.map((chip) => (
                  <span key={`hero-${chip}`} className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-[#b85a2c]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <section className="mt-5 max-w-[1240px]">
              <div
                className="overflow-hidden rounded-[20px] border border-[#ffc49b] bg-[#ff9a61] px-5 py-5 shadow-[0_24px_46px_-34px_rgba(239,98,44,0.44)]"
                style={{
                  backgroundImage: "url('/flight-strip-bg-replacement.png')",
                  backgroundPosition: "40% 37%",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="max-w-[430px]">
                    <div className="rounded-[28px] border border-white/70 bg-white px-7 py-6 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.22)]">
                      <p className="text-[16px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{leadRoute}</p>
                      <p className="mt-2 text-[14px] text-slate-500">{leadMeta}</p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 xl:max-w-[720px]">
                    <div className="overflow-hidden rounded-[18px] border border-[#ff9a68] bg-[linear-gradient(135deg,rgba(255,123,63,0.92)_0%,rgba(255,90,40,0.92)_100%)] p-3 shadow-[0_20px_32px_-24px_rgba(239,68,35,0.42)]">
                      <div className="grid gap-2 md:grid-cols-3">
                        {summaryCards.map((entry) => (
                          <div key={entry.key} className="rounded-[14px] border border-white/65 bg-white px-4 py-3 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.2)]">
                            <p className="text-[13px] font-semibold text-slate-900">{entry.title}</p>
                            <p className="mt-1 text-[12px] text-slate-500">{entry.meta}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-[520px] text-[12px] text-white/88">{copy.topBody}</p>
                        <button
                          type="button"
                          onClick={() => document.getElementById("results-start")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/14 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/22"
                        >
                          {copy.browsePackages}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </section>

      <div id="results-start" className="mt-5">
        <HomeResultsClient
          key={`results:${locale}:${searchKey}`}
          facilities={facilities}
          filterDesktopStickyTopClass="lg:top-[8.2rem]"
          initialFilters={initialFilters}
          layoutVariant="flightCatalog"
          locale={locale}
          maxAvailablePrice={maxAvailablePrice}
          packages={packages}
          showSummaryCard={false}
          totalPackages={totalPackages}
        />
      </div>
    </main>
  )
}
