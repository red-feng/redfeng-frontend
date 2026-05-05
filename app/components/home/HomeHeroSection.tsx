"use client"

import Image from "next/image"
import { useState } from "react"
import HeroBenefits from "@/app/components/home/HeroBenefits"
import HeroHeader from "@/app/components/home/HeroHeader"
import HeroSearchDesktop from "@/app/components/home/HeroSearchDesktop"
import HeroSearchMobile from "@/app/components/home/HeroSearchMobile"
import HeroTabs from "@/app/components/home/HeroTabs"
import { getHeroSearchConfig, heroSearchConfigs } from "@/app/components/home/heroSearchContent"
import type { HeroSearchConfig, HeroSearchFieldData } from "@/app/components/home/heroSearchContent"
import type { HeroTabKey } from "@/app/components/home/homeContent"

export default function HomeHeroSection() {
  const [activeTab, setActiveTab] = useState<HeroTabKey>("flight")
  const [activeOptions, setActiveOptions] = useState<Record<HeroTabKey, string>>({
    flight: heroSearchConfigs.flight.defaultOption,
    hotel: heroSearchConfigs.hotel.defaultOption,
    train: heroSearchConfigs.train.defaultOption,
    bus: heroSearchConfigs.bus.defaultOption,
    ship: heroSearchConfigs.ship.defaultOption,
    activity: heroSearchConfigs.activity.defaultOption,
    package: heroSearchConfigs.package.defaultOption,
  })

  return (
    <section className="home-hero">
      <div className="home-hero-surface overflow-hidden bg-[linear-gradient(115deg,#fffaf7_0%,#fffefc_36%,#f9fbfe_100%)] shadow-[0_18px_36px_-34px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,194,155,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(148,197,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_100%)]" />
          <DesktopHeroBackdrop />

          <div className="home-hero-shell relative mx-auto max-w-[1240px] px-5 pb-12 pt-5 sm:px-6 lg:px-8">
            <HeroHeader />
            <MobileHeroBackdrop />
            <HeroIntro />
          </div>
        </div>

        <div className="home-hero-search-wrap relative z-20 mx-auto -mt-28 max-w-[1240px] px-4 pb-10 sm:-mt-36 sm:px-6 lg:-mt-56 lg:pb-14 lg:px-8">
          <div className="home-hero-search-card overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.14)]">
            <HeroTabs activeTab={activeTab} onChange={setActiveTab} />
            <HeroSearchPanel
              activeTab={activeTab}
              activeOption={activeOptions[activeTab]}
              onOptionChange={(optionKey) =>
                setActiveOptions((current) => ({
                  ...current,
                  [activeTab]: optionKey,
                }))
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function DesktopHeroBackdrop() {
  return (
    <div className="absolute inset-0 hidden lg:block">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,245,0.96)_0%,rgba(255,250,245,0.88)_16%,rgba(255,250,245,0.56)_30%,rgba(255,250,245,0.18)_46%,rgba(255,255,255,0.03)_62%,rgba(255,255,255,0)_76%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.02)_100%)]" />
    </div>
  )
}

function MobileHeroBackdrop() {
  return (
    <div className="absolute inset-0 lg:hidden">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-[72%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.9)_36%,rgba(255,255,255,0.18)_72%,rgba(255,255,255,0.02)_100%),linear-gradient(180deg,rgba(255,252,247,0.52)_0%,rgba(255,252,247,0.1)_100%)]" />
    </div>
  )
}

function HeroIntro() {
  return (
    <div className="home-hero-intro relative z-10 flex justify-center pt-8 text-center lg:pt-12">
      <div className="home-hero-intro-shell max-w-[760px] pb-40 lg:min-h-[430px] lg:pb-0">
        <h1 className="home-hero-title mx-auto max-w-[320px] text-[28px] font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:max-w-[620px] sm:text-[48px] lg:max-w-[760px] lg:text-[52px] lg:leading-[1.04]">
          Ekosistem perjalanan
          <span className="mt-1 block text-[#ff5a43]">dalam satu genggaman</span>
        </h1>
      </div>
    </div>
  )
}

function HeroSearchPanel({
  activeTab,
  activeOption,
  onOptionChange,
}: {
  activeTab: HeroTabKey
  activeOption: string
  onOptionChange: (optionKey: string) => void
}) {
  const [fieldSelectionIndexes, setFieldSelectionIndexes] = useState<Record<string, number>>({})
  const [swappedStates, setSwappedStates] = useState<Record<string, boolean>>({})
  const baseConfig = getHeroSearchConfig(activeTab, activeOption)
  const stateKey = `${activeTab}:${activeOption}`
  const config = buildInteractiveHeroConfig(baseConfig, activeTab, activeOption, fieldSelectionIndexes, swappedStates[stateKey] ?? false)

  return (
    <div className="px-4 py-5 lg:px-6 lg:py-7">
      <div className="hidden flex-wrap gap-6 text-[13px] text-slate-600 lg:flex">
        {config.options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onOptionChange(option.key)}
            className={`inline-flex items-center gap-2 font-medium transition ${config.activeOption === option.key ? "text-slate-800" : "text-slate-600 hover:text-slate-800"}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${config.activeOption === option.key ? "bg-[#ff5a43]" : "border border-slate-300 bg-white"}`} />
            {option.label}
          </button>
        ))}
      </div>

      <HeroSearchMobile
        config={config}
        fields={config.mobileFields}
        onSwap={() => setSwappedStates((current) => ({ ...current, [stateKey]: !(current[stateKey] ?? false) }))}
        onFieldClick={(index) =>
          setFieldSelectionIndexes((current) => ({
            ...current,
            [getFieldSelectionKey(activeTab, activeOption, "mobile", index)]: getNextFieldSelectionIndex(
              activeTab,
              config.mobileFields[index],
              current[getFieldSelectionKey(activeTab, activeOption, "mobile", index)] ?? 0,
            ),
          }))
        }
      />
      <HeroSearchDesktop
        config={config}
        fields={config.desktopFields}
        onSwap={() => setSwappedStates((current) => ({ ...current, [stateKey]: !(current[stateKey] ?? false) }))}
        onFieldClick={(index) =>
          setFieldSelectionIndexes((current) => ({
            ...current,
            [getFieldSelectionKey(activeTab, activeOption, "desktop", index)]: getNextFieldSelectionIndex(
              activeTab,
              config.desktopFields[index],
              current[getFieldSelectionKey(activeTab, activeOption, "desktop", index)] ?? 0,
            ),
          }))
        }
      />
      <HeroBenefits activeTab={activeTab} />
    </div>
  )
}

function buildInteractiveHeroConfig(
  baseConfig: HeroSearchConfig,
  activeTab: HeroTabKey,
  activeOption: string,
  fieldSelectionIndexes: Record<string, number>,
  isSwapped: boolean,
): HeroSearchConfig {
  const desktopFields = resolveInteractiveFields(baseConfig.desktopFields, activeTab, activeOption, "desktop", fieldSelectionIndexes)
  const mobileFields = resolveInteractiveFields(baseConfig.mobileFields, activeTab, activeOption, "mobile", fieldSelectionIndexes)

  return {
    ...baseConfig,
    desktopFields: isSwapped ? swapEndpointFieldValues(desktopFields) : desktopFields,
    mobileFields: isSwapped ? swapEndpointFieldValues(mobileFields) : mobileFields,
  }
}

function resolveInteractiveFields(
  fields: HeroSearchFieldData[],
  activeTab: HeroTabKey,
  activeOption: string,
  layout: "desktop" | "mobile",
  fieldSelectionIndexes: Record<string, number>,
) {
  return fields.map((field, index) => {
    const choices = getFieldChoices(activeTab, field)
    const selectionIndex = fieldSelectionIndexes[getFieldSelectionKey(activeTab, activeOption, layout, index)] ?? 0
    return choices[selectionIndex % choices.length]
  })
}

function swapEndpointFieldValues(fields: HeroSearchFieldData[]) {
  if (fields.length < 2) return fields

  const first = fields[0]
  const second = fields[1]

  return [
    { ...first, value: second.value, sublabel: second.sublabel },
    { ...second, value: first.value, sublabel: first.sublabel },
    ...fields.slice(2),
  ]
}

function getFieldSelectionKey(activeTab: HeroTabKey, activeOption: string, layout: "desktop" | "mobile", index: number) {
  return `${activeTab}:${activeOption}:${layout}:${index}`
}

function getNextFieldSelectionIndex(activeTab: HeroTabKey, field: HeroSearchFieldData, currentIndex: number) {
  const choices = getFieldChoices(activeTab, field)
  return (currentIndex + 1) % choices.length
}

function getFieldChoices(activeTab: HeroTabKey, field: HeroSearchFieldData): HeroSearchFieldData[] {
  const label = field.label.toLowerCase()
  const current = [{ value: field.value, sublabel: field.sublabel, withChevron: field.withChevron, withSwap: field.withSwap }]
  let choices: HeroSearchFieldData[] = current

  if (label.includes("dari") || label.includes("asal")) {
    choices = [
      ...current,
      { label: field.label, value: activeTab === "flight" ? "SUB   Surabaya" : activeTab === "ship" ? "Ketapang" : "Surabaya", sublabel: activeTab === "flight" ? "Jawa Timur" : activeTab === "ship" ? "Banyuwangi" : "Pasar Turi", withSwap: field.withSwap },
      { label: field.label, value: activeTab === "flight" ? "KNO   Medan" : activeTab === "ship" ? "Gilimanuk" : "Semarang", sublabel: activeTab === "flight" ? "Sumatera Utara" : activeTab === "ship" ? "Bali" : "Tawang", withSwap: field.withSwap },
    ]
  } else if (label.includes("ke") || label.includes("tujuan")) {
    choices = [
      ...current,
      { label: field.label, value: activeTab === "flight" ? "SIN   Singapore" : activeTab === "ship" ? "Lembar" : "Solo", sublabel: activeTab === "flight" ? "Changi" : activeTab === "ship" ? "Lombok" : "Balapan" },
      { label: field.label, value: activeTab === "flight" ? "HND   Tokyo" : activeTab === "ship" ? "Padang Bai" : "Malang", sublabel: activeTab === "flight" ? "Haneda" : activeTab === "ship" ? "Bali" : "Kota Baru" },
    ]
  } else if (label.includes("destinasi") || label.includes("trip") || label.includes("event") || label.includes("area")) {
    choices = [
      ...current,
      { label: field.label, value: activeTab === "hotel" ? "Jakarta" : activeTab === "activity" ? "Universal Beijing Resort" : activeTab === "package" ? "Beijing 5H4M" : "Bandung", sublabel: activeTab === "hotel" ? "Indonesia" : activeTab === "activity" ? "Beijing, China" : activeTab === "package" ? "Hotel + Tour" : "Indonesia" },
      { label: field.label, value: activeTab === "hotel" ? "Shanghai" : activeTab === "activity" ? "The Bund Night Cruise" : activeTab === "package" ? "Chongqing Explorer" : "Yogyakarta", sublabel: activeTab === "hotel" ? "China" : activeTab === "activity" ? "Shanghai, China" : activeTab === "package" ? "4 Hari 3 Malam" : "Indonesia" },
    ]
  } else if (label.includes("transit")) {
    choices = [
      ...current,
      { label: field.label, value: "Kuala Lumpur", sublabel: "KUL" },
      { label: field.label, value: "Hong Kong", sublabel: "HKG" },
    ]
  } else if (label.includes("berangkat") || label.includes("pergi") || label.includes("check-in") || label.includes("kunjungan") || label.includes("tanggal") || label.includes("keberangkatan")) {
    choices = [
      ...current,
      { label: field.label, value: compactDateShift(field.value, 3), sublabel: "Pilihan berikutnya" },
      { label: field.label, value: compactDateShift(field.value, 7), sublabel: "Minggu depan" },
    ]
  } else if (label.includes("pulang") || label.includes("check-out")) {
    choices = [
      ...current,
      { label: field.label, value: compactDateShift(field.value, 4), sublabel: "Durasi fleksibel" },
      { label: field.label, value: compactDateShift(field.value, 8), sublabel: "Durasi lebih lama" },
    ]
  } else if (label.includes("jam")) {
    choices = [
      ...current,
      { label: field.label, value: "08:30", sublabel: "Pagi" },
      { label: field.label, value: "21:15", sublabel: "Malam" },
    ]
  } else if (label.includes("penumpang") || label.includes("tamu") || label.includes("peserta") || label.includes("tiket")) {
    choices = [
      ...current,
      { label: field.label, value: "2 Dewasa", sublabel: "Pilihan populer", withChevron: field.withChevron },
      { label: field.label, value: "2 Dewasa, 1 Anak", sublabel: "Family option", withChevron: field.withChevron },
    ]
  } else if (label.includes("kategori") || label.includes("jenis") || label.includes("durasi")) {
    choices = [
      ...current,
      { label: field.label, value: activeTab === "activity" ? "Family friendly" : "4 Hari 3 Malam", sublabel: activeTab === "activity" ? "Rekomendasi" : "Paket favorit", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "VIP access" : "5 Hari 4 Malam", sublabel: activeTab === "activity" ? "Premium" : "Lebih lengkap", withChevron: field.withChevron },
    ]
  }

  return dedupeFieldChoices(choices, field)
}

function dedupeFieldChoices(choices: HeroSearchFieldData[], baseField: HeroSearchFieldData) {
  const seen = new Set<string>()
  return choices
    .map((choice) => ({
      label: baseField.label,
      value: choice.value,
      sublabel: choice.sublabel ?? "",
      withChevron: baseField.withChevron,
      withSwap: baseField.withSwap,
    }))
    .filter((choice) => {
      const key = `${choice.value}::${choice.sublabel}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function compactDateShift(input: string, dayOffset: number) {
  const match = input.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!match) return input
  const [, dayRaw, monthLabel, yearRaw] = match
  const monthMap: Record<string, number> = {
    Januari: 0,
    Februari: 1,
    Maret: 2,
    April: 3,
    Mei: 4,
    Juni: 5,
    Juli: 6,
    Agustus: 7,
    September: 8,
    Oktober: 9,
    November: 10,
    Desember: 11,
  }
  const monthIndex = monthMap[monthLabel]
  if (monthIndex === undefined) return input
  const date = new Date(Number(yearRaw), monthIndex, Number(dayRaw))
  date.setDate(date.getDate() + dayOffset)
  const monthLabels = Object.keys(monthMap)
  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`
}
