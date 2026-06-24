"use client"

import { useState } from "react"

import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { heroSearchConfigs } from "@/app/components/home/web/hero"
import { HeroSearchPanel } from "@/app/components/home/web/WebHomeHeroSection"
import type { FlightAirportChoice } from "@/app/components/home/web/WebHomeHeroSection"
import type { Locale } from "@/lib/i18n"

export default function FlightsLandingHeroSearchCard({
  locale,
  flightAirportChoices,
}: {
  locale: Locale
  flightAirportChoices?: FlightAirportChoice[]
}) {
  const [activeOption, setActiveOption] = useState(heroSearchConfigs.flight.defaultOption)

  return (
    <div className={`home-hero-search-card relative z-[220] overflow-visible ${homeLayoutLock.cardRadiusClass} border border-[#edf1f5] bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)]`}>
      <HeroSearchPanel
        activeTab="flight"
        activeOption={activeOption}
        locale={locale}
        flightAirportChoices={flightAirportChoices}
        onOptionChange={setActiveOption}
        showStatus={false}
        showBenefits={false}
      />
    </div>
  )
}
