"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"

const STICKY_GAP = 12

export default function PackagesCatalogSearchShell({
  countries,
  locale,
  searchKey,
}: {
  countries: string[]
  locale: Locale
  searchKey: string
}) {
  const searchParams = useSearchParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const isScrolledRef = useRef(false)
  const [stickyTop, setStickyTop] = useState(0)
  const searchSurfaceRef = useRef<HTMLDivElement | null>(null)

  const summaryChips = useMemo(() => {
    const chips: string[] = []
    const country = String(searchParams.get("country") || "").trim()
    const style = String(searchParams.get("style") || "").trim()
    const duration = String(searchParams.get("duration") || "").trim()

    if (country) chips.push(country)
    if (style) chips.push(style.replace(/_/g, " "))
    if (duration) chips.push(duration)

    return chips.slice(0, 3)
  }, [searchParams])

  const stickyTitle =
    locale === "en" ? "Package catalog filters" : locale === "zh" ? "Package catalog filters" : "Filter katalog paket"
  const stickyButton =
    locale === "en" ? "Adjust filter" : locale === "zh" ? "Adjust filter" : "Atur filter"
  const stickyFallback =
    locale === "en" ? "Ready to refine your package search" : locale === "zh" ? "Ready to refine your package search" : "Siap lanjut atur pencarian paketmu"
  const stickyPrimarySummary = useMemo(() => {
    const country = String(searchParams.get("country") || "").trim()

    if (country) return country

    return locale === "en" ? "All package tours" : locale === "zh" ? "All package tours" : "Semua paket tour"
  }, [locale, searchParams])
  const stickySecondarySummary = useMemo(() => {
    const style = String(searchParams.get("style") || "").trim().replace(/_/g, " ")
    const duration = String(searchParams.get("duration") || "").trim()

    if (style && duration) return `${style} - ${duration}`
    if (style) return style
    if (duration) return duration

    return stickyFallback
  }, [searchParams, stickyFallback])

  useEffect(() => {
    const updateStickyState = () => {
      const searchSurface = searchSurfaceRef.current
      if (!searchSurface) return

      const publicHeader = document.querySelector<HTMLElement>(".public-header")
      const isStandalone = document.documentElement.dataset.displayMode === "standalone"
      const headerBottom = publicHeader ? Math.max(publicHeader.getBoundingClientRect().bottom, 0) : 0
      const nextStickyTop = isStandalone ? headerBottom : 0
      const searchRect = searchSurface.getBoundingClientRect()
      const nextScrolled = searchRect.bottom <= nextStickyTop + STICKY_GAP

      setStickyTop((current) => (current === nextStickyTop ? current : nextStickyTop))

      if (nextScrolled === isScrolledRef.current) return

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
    }

    updateStickyState()
    window.addEventListener("scroll", updateStickyState, { passive: true })
    window.addEventListener("resize", updateStickyState)

    return () => {
      window.removeEventListener("scroll", updateStickyState)
      window.removeEventListener("resize", updateStickyState)
    }
  }, [])

  const scrollToSearch = () => {
    document.getElementById("package-search")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div id="package-search">
      <div
        className={`fixed inset-x-0 top-0 z-30 border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)] transition-all duration-200 ${
          isScrolled ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
        style={{ top: `${stickyTop}px` }}
      >
        <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3`}>
          <div className={homeLayoutLock.contentWidthClass}>
            <div className="rounded-[22px] border border-[#f1ddd0] bg-white/92">
              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.92fr)] lg:items-center">
                <button type="button" onClick={scrollToSearch} className="min-w-0 text-left">
                  <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{stickyPrimarySummary}</p>
                  <p className="mt-1 truncate text-[13px] text-slate-500">{stickySecondarySummary}</p>
                </button>

                <button
                  type="button"
                  onClick={scrollToSearch}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                  aria-label={stickyButton}
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="m10.5 10.5 3 3" />
                  </svg>
                </button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {summaryChips.length > 0 ? (
                      summaryChips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-[#b85a2c]"
                        >
                          {chip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500">{stickyTitle}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={scrollToSearch}
                    className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[#efc4ad] bg-[#fff1e7] px-4 py-2.5 text-sm font-semibold text-[#b85a2c] shadow-[0_10px_20px_-18px_rgba(239,91,42,0.35)] transition hover:bg-[#ffe7d8]"
                  >
                    {stickyButton}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={searchSurfaceRef} className="relative z-10">
        <SearchBar
          key={`search:${locale}:${searchKey}`}
          locale={locale}
          countries={countries}
          variant="catalog"
        />
      </div>
    </div>
  )
}
