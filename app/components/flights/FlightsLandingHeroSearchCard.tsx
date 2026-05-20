"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { HeroTabs, heroSearchConfigs } from "@/app/components/home/web/hero"
import { HeroSearchPanel } from "@/app/components/home/web/WebHomeHeroSection"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"
import type { Locale } from "@/lib/i18n"

const serviceLabelByTab: Record<HeroTabKey, string> = {
  flight: "Pesawat",
  hotel: "Hotel",
  train: "Kereta",
  bus: "Bus",
  ship: "Kapal",
  cruise: "Kapal Pesiar",
  activity: "Aktivitas",
  package: "Paket Wisata",
}

export default function FlightsLandingHeroSearchCard({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [activeOption, setActiveOption] = useState(heroSearchConfigs.flight.defaultOption)

  return (
    <div className={`home-hero-search-card relative z-[220] overflow-visible ${homeLayoutLock.cardRadiusClass} border border-[#edf1f5] bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)]`}>
      <HeroTabs
        activeTab="flight"
        locale={locale}
        onChange={(tab) => {
          if (tab === "flight") return
          const target = servicePageConfigByLabel[serviceLabelByTab[tab]]?.href
          if (target) router.push(target)
        }}
      />
      <HeroSearchPanel
        activeTab="flight"
        activeOption={activeOption}
        locale={locale}
        onOptionChange={setActiveOption}
      />
    </div>
  )
}
