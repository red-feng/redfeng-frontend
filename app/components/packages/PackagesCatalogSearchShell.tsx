"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"

const STICKY_GAP = 8

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
  const [isPinned, setIsPinned] = useState(false)
  const [stickyTop, setStickyTop] = useState(0)
  const [shellHeight, setShellHeight] = useState(0)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const summaryChips = useMemo(() => {
    const chips: string[] = []
    const country = String(searchParams.get("country") || "").trim()
    const style = String(searchParams.get("style") || "").trim().replace(/_/g, " ")
    const duration = String(searchParams.get("duration") || "").trim()

    if (country) chips.push(country)
    if (style) chips.push(style)
    if (duration) chips.push(duration)

    return chips.slice(0, 3)
  }, [searchParams])

  const stickyTitle =
    locale === "en" ? "Package catalog filters" : locale === "zh" ? "Package catalog filters" : "Filter katalog paket"
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
      const publicHeader = document.querySelector<HTMLElement>(".public-header")
      const isStandalone = document.documentElement.dataset.displayMode === "standalone"
      const headerBottom = publicHeader ? Math.max(publicHeader.getBoundingClientRect().bottom, 0) : 0
      const nextStickyTop = isStandalone ? headerBottom : 0
      setStickyTop((current) => (current === nextStickyTop ? current : nextStickyTop))

      const shell = shellRef.current
      if (!shell) return

      const nextShellHeight = shell.offsetHeight
      setShellHeight((current) => (current === nextShellHeight ? current : nextShellHeight))

      const nextPinned = shell.getBoundingClientRect().top <= nextStickyTop + STICKY_GAP
      setIsPinned((current) => (current === nextPinned ? current : nextPinned))
    }

    updateStickyState()
    window.addEventListener("scroll", updateStickyState, { passive: true })
    window.addEventListener("resize", updateStickyState)

    return () => {
      window.removeEventListener("scroll", updateStickyState)
      window.removeEventListener("resize", updateStickyState)
    }
  }, [])

  return (
    <div
      ref={shellRef}
      id="package-search"
      className="relative"
      style={isPinned && shellHeight > 0 ? { minHeight: `${shellHeight}px` } : undefined}
    >
      <div
        className={`${isPinned ? "fixed inset-x-0 z-[120]" : "relative"} transition-all duration-200`}
        style={isPinned ? { top: `${stickyTop}px` } : undefined}
      >
      <div className={isPinned ? "rounded-[28px] border border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)]" : ""}>
        <div className={`${homeLayoutLock.pageXClass} ${isPinned ? "py-2 sm:py-3" : ""}`}>
          <div className={homeLayoutLock.contentWidthClass}>
            {isPinned ? (
              <div className="mb-3 rounded-[18px] border border-[#f1ddd0] bg-white/92 px-4 py-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{stickyPrimarySummary}</p>
                    <p className="mt-1 truncate text-[13px] text-slate-500">{stickySecondarySummary}</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {summaryChips.length > 0 ? (
                      summaryChips.map((chip) => (
                        <span key={chip} className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-[#b85a2c]">
                          {chip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500">{stickyTitle}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="relative z-10">
              <SearchBar
                key={`search:${locale}:${searchKey}`}
                locale={locale}
                countries={countries}
                variant="catalog"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
