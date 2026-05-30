"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"

const STICKY_SCROLL_ENTER_Y = 220
const STICKY_SCROLL_EXIT_Y = 140

type SummaryCard = {
  key: string
  title: string
  meta: string
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  )
}

export default function PackagesCatalogSearchShell({
  countries,
  locale,
  searchKey,
  heroEyebrow,
  heroTitle,
  heroBody,
  leadTitle,
  leadMeta,
  resultsCountLabel,
  stickyButtonLabel,
  summaryCards,
}: {
  countries: string[]
  locale: Locale
  searchKey: string
  heroEyebrow: string
  heroTitle: string
  heroBody: string
  leadTitle: string
  leadMeta: string
  resultsCountLabel: string
  stickyButtonLabel: string
  summaryCards: SummaryCard[]
}) {
  const searchParams = useSearchParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const [stickyTop, setStickyTop] = useState(0)
  const [compactBarHeight, setCompactBarHeight] = useState(92)
  const isScrolledRef = useRef(false)
  const compactBarRef = useRef<HTMLDivElement | null>(null)
  const heroSectionRef = useRef<HTMLElement | null>(null)

  const summaryChips = useMemo(() => {
    const chips: string[] = []
    const country = String(searchParams.get("country") || "").trim()
    const style = String(searchParams.get("style") || "").trim().replace(/_/g, " ")
    const duration = String(searchParams.get("duration") || "").trim()

    if (country) chips.push(country)
    if (style) chips.push(style)
    if (duration) chips.push(duration)

    return chips.slice(0, 4)
  }, [searchParams])

  const selectedCountry = String(searchParams.get("country") || "").trim()
  const selectedStyle = String(searchParams.get("style") || "").trim().replace(/_/g, " ")
  const selectedDuration = String(searchParams.get("duration") || "").trim()

  const stickyTitle =
    selectedCountry ||
    (locale === "en" ? "All package tours" : locale === "zh" ? "All package tours" : "Semua paket tour")

  const stickySubtitle = [selectedStyle, selectedDuration, resultsCountLabel].filter(Boolean).join(" • ") || heroBody

  useEffect(() => {
    const resolveStickyTop = () => {
      const publicHeader = document.querySelector<HTMLElement>(".public-header")
      const headerBottom = publicHeader ? Math.max(publicHeader.getBoundingClientRect().bottom, 0) : 0
      setStickyTop((current) => (current === headerBottom ? current : headerBottom))
    }

    const handleScroll = () => {
      resolveStickyTop()

      const nextScrolled = isScrolledRef.current
        ? window.scrollY > STICKY_SCROLL_EXIT_Y
        : window.scrollY > STICKY_SCROLL_ENTER_Y

      if (nextScrolled === isScrolledRef.current) return

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
    }

    resolveStickyTop()
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", resolveStickyTop)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", resolveStickyTop)
    }
  }, [])

  useEffect(() => {
    const measureCompactBar = () => {
      const nextHeight = compactBarRef.current?.offsetHeight ?? 92
      setCompactBarHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    measureCompactBar()
    window.addEventListener("resize", measureCompactBar)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && compactBarRef.current) {
      resizeObserver = new ResizeObserver(measureCompactBar)
      resizeObserver.observe(compactBarRef.current)
    }

    return () => {
      window.removeEventListener("resize", measureCompactBar)
      resizeObserver?.disconnect()
    }
  }, [isScrolled, stickySubtitle, summaryChips])

  const scrollToHero = () => {
    const top = heroSectionRef.current?.getBoundingClientRect().top ?? 0
    const targetTop = Math.max(window.scrollY + top - stickyTop - 16, 0)
    window.scrollTo({ top: targetTop, behavior: "smooth" })
  }

  return (
    <div id="package-search" className="space-y-5">
      {isScrolled ? (
        <>
          <div style={{ height: `${compactBarHeight}px` }} aria-hidden="true" />
          <div
            ref={compactBarRef}
            className="fixed inset-x-0 z-[120] border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]"
            style={{ top: `${stickyTop}px` }}
          >
            <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3`}>
              <div className={homeLayoutLock.contentWidthClass}>
                <div className="rounded-[22px] border border-[#f1ddd0] bg-white/92">
                  <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1.04fr)_44px_minmax(0,1fr)_auto] xl:items-center">
                    <button type="button" onClick={scrollToHero} className="min-w-0 text-left">
                      <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{stickyTitle}</p>
                      <p className="mt-1 truncate text-[13px] text-slate-500">{stickySubtitle}</p>
                    </button>

                    <button
                      type="button"
                      onClick={scrollToHero}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                      aria-label={stickyButtonLabel}
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
                        <span className="text-[11px] text-slate-500">{resultsCountLabel}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={scrollToHero}
                      className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[#efc4ad] bg-[#fff1e7] px-4 py-2.5 text-sm font-semibold text-[#b85a2c] shadow-[0_10px_20px_-18px_rgba(239,91,42,0.35)] transition hover:bg-[#ffe7d8]"
                    >
                      {stickyButtonLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!isScrolled ? (
        <section ref={heroSectionRef} className="space-y-5">
          <div className="overflow-hidden rounded-[30px] border border-[#f4ebe4] bg-white shadow-[0_22px_56px_-36px_rgba(15,23,42,0.22)]">
            <div className="border-b border-[#f5ede7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)] xl:items-end">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ef5b2a]">{heroEyebrow}</p>
                  <h1 className="mt-3 max-w-[680px] text-[26px] font-semibold leading-[1.15] tracking-[-0.04em] text-slate-900 sm:text-[32px]">
                    {heroTitle}
                  </h1>
                  <p className="mt-3 max-w-[700px] text-[14px] leading-6 text-slate-500 sm:text-[15px]">{heroBody}</p>
                </div>

                <div className="rounded-[24px] border border-[#f0ddd0] bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.14)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ef5b2a]">{resultsCountLabel}</p>
                  <p className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{leadTitle}</p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">{leadMeta}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {summaryChips.length > 0
                      ? summaryChips.map((chip) => (
                          <span key={`hero-${chip}`} className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-3 py-1.5 text-[11px] font-medium text-[#b85a2c]">
                            {chip}
                          </span>
                        ))
                      : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <SearchBar
                key={`search:${locale}:${searchKey}`}
                locale={locale}
                countries={countries}
                variant="catalog"
              />
            </div>
          </div>

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
              <div className="max-w-[420px]">
                <div className="rounded-[28px] border border-white/70 bg-white px-6 py-5 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.22)]">
                  <p className="text-[14px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{leadTitle}</p>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">{stickyTitle}</p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500">{leadMeta}</p>
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
                    <p className="max-w-[520px] text-[12px] text-white/88">{heroBody}</p>
                    <button
                      type="button"
                      onClick={() => document.getElementById("results-start")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/14 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/22"
                    >
                      {stickyButtonLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
