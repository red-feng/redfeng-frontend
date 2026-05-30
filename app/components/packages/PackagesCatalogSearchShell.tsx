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
  const searchShellRef = useRef<HTMLDivElement | null>(null)
  const stickySentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stickySentinel = stickySentinelRef.current

    if (typeof window !== "undefined" && "IntersectionObserver" in window && stickySentinel) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const nextScrolled = !entry.isIntersecting
          if (nextScrolled === isScrolledRef.current) return
          isScrolledRef.current = nextScrolled
          setIsScrolled(nextScrolled)
        },
        {
          root: null,
          threshold: 0,
          rootMargin: "-12px 0px 0px 0px",
        },
      )

      observer.observe(stickySentinel)
      return () => observer.disconnect()
    }

    const handleScroll = () => {
      const searchShell = searchShellRef.current
      const searchTop = searchShell?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
      let nextScrolled = isScrolledRef.current

      if (!nextScrolled && (searchTop <= 28 || window.scrollY >= STICKY_SCROLL_ENTER_Y)) {
        nextScrolled = true
      } else if (nextScrolled && searchTop > 72 && window.scrollY <= STICKY_SCROLL_EXIT_Y) {
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
    locale === "en" ? "Package catalog filters" : locale === "zh" ? "套餐目录筛选" : "Filter katalog paket"
  const stickyButton =
    locale === "en" ? "Adjust filter" : locale === "zh" ? "调整筛选" : "Atur filter"
  const stickyFallback =
    locale === "en" ? "Ready to refine your package search" : locale === "zh" ? "准备继续调整你的套餐搜索" : "Siap lanjut atur pencarian paketmu"

  const scrollToSearch = () => {
    document.getElementById("package-search")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      {isScrolled ? (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-[#f1ddd0] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]">
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
      ) : null}

      <div id="package-search" ref={searchShellRef}>
        <div ref={stickySentinelRef} className="h-px w-full" aria-hidden="true" />
        <SearchBar
          key={`search:${locale}:${searchKey}`}
          locale={locale}
          countries={countries}
          variant="catalog"
        />
      </div>
    </>
  )
}
