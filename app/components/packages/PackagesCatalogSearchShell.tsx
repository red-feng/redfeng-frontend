"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"

const STICKY_SCROLL_ENTER_Y = 220
const STICKY_SCROLL_EXIT_Y = 140

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

  useEffect(() => {
    const handleScroll = () => {
      let nextScrolled = isScrolledRef.current

      if (!nextScrolled && window.scrollY > STICKY_SCROLL_ENTER_Y) {
        nextScrolled = true
      } else if (nextScrolled && window.scrollY < STICKY_SCROLL_EXIT_Y) {
        nextScrolled = false
      }

      if (nextScrolled === isScrolledRef.current) return

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
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
      >
        <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3`}>
          <div className={homeLayoutLock.contentWidthClass}>
            <div className="rounded-[22px] border border-[#f1ddd0] bg-white/92">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-900">{stickyTitle}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
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
                      <span className="text-[11px] text-slate-500">{stickyFallback}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={scrollToSearch}
                  className="inline-flex shrink-0 items-center justify-center rounded-[12px] border border-[#f1ddd0] bg-[#fff7f1] px-4 py-2.5 text-sm font-semibold text-[#ef5b2a] transition hover:bg-[#fff1e7]"
                >
                  {stickyButton}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
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
