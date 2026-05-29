"use client"

import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import FlightsHeroSearchBar from "@/app/components/flights/FlightsHeroSearchBar"
import type { Locale } from "@/lib/i18n"

export default function FlightsLandingHeroSearchCard({ locale }: { locale: Locale }) {
  return (
    <div className={`home-hero-search-card relative z-[220] overflow-visible ${homeLayoutLock.cardRadiusClass} border border-[#edf1f5] bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)]`}>
      <div className="px-5 py-5 lg:px-8 lg:py-[1.65rem]">
        <FlightsHeroSearchBar
          locale={locale}
          buttonLabel={locale === "en" ? "Search flights" : locale === "zh" ? "搜索航班" : "Cari penerbangan"}
        />
      </div>
    </div>
  )
}
