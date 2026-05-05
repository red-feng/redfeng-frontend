"use client"

import Image from "next/image"
import { useState } from "react"
import HeroBenefits from "@/app/components/home/HeroBenefits"
import HeroHeader from "@/app/components/home/HeroHeader"
import HeroSearchDesktop from "@/app/components/home/HeroSearchDesktop"
import HeroSearchMobile from "@/app/components/home/HeroSearchMobile"
import HeroTabs from "@/app/components/home/HeroTabs"
import { getHeroSearchConfig, heroSearchConfigs } from "@/app/components/home/heroSearchContent"
import type { HeroSearchFieldData } from "@/app/components/home/heroSearchContent"
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

        <div className="home-hero-search-wrap relative z-[80] mx-auto -mt-44 max-w-[1240px] px-4 pb-10 sm:-mt-56 sm:px-6 lg:-mt-80 lg:pb-14 lg:px-8">
          <div className="home-hero-search-card overflow-visible rounded-[30px] border border-white/90 bg-white shadow-[0_22px_44px_-30px_rgba(15,23,42,0.14)]">
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
        <h1 className="home-hero-title mx-auto max-w-[320px] text-[26px] font-bold leading-[1.12] tracking-[-0.03em] text-slate-950 sm:max-w-[620px] sm:text-[42px] lg:max-w-[760px] lg:text-[46px] lg:leading-[1.08]">
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
  const baseConfig = getHeroSearchConfig(activeTab, activeOption)
  const stateKey = `${activeTab}:${activeOption}`
  const [fieldStates, setFieldStates] = useState<Record<string, HeroSearchFieldData>>({})
  const desktopFields = buildFormFields(baseConfig.desktopFields, activeTab, stateKey, fieldStates)
  const mobileFields = buildFormFields(baseConfig.mobileFields, activeTab, stateKey, fieldStates)
  const config = {
    ...baseConfig,
    desktopFields,
    mobileFields,
  }

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
        fields={mobileFields}
        onSwap={() => {
          const firstField = baseConfig.mobileFields[0]
          const secondField = baseConfig.mobileFields[1]
          if (!firstField || !secondField) return

          const firstKey = getFieldStateKey(stateKey, firstField.label)
          const secondKey = getFieldStateKey(stateKey, secondField.label)
          const firstCurrent = fieldStates[firstKey] ?? firstField
          const secondCurrent = fieldStates[secondKey] ?? secondField

          setFieldStates((current) => ({
            ...current,
            [firstKey]: { ...firstCurrent, label: firstField.label, value: secondCurrent.value, sublabel: secondCurrent.sublabel },
            [secondKey]: { ...secondCurrent, label: secondField.label, value: firstCurrent.value, sublabel: firstCurrent.sublabel },
          }))
        }}
        onFieldChange={(index, value) =>
          setFieldStates((current) => updateFieldState(current, stateKey, activeTab, mobileFields[index], value))
        }
      />
      <HeroSearchDesktop
        config={config}
        fields={desktopFields}
        onSwap={() => {
          const firstField = baseConfig.desktopFields[0]
          const secondField = baseConfig.desktopFields[1]
          if (!firstField || !secondField) return

          const firstKey = getFieldStateKey(stateKey, firstField.label)
          const secondKey = getFieldStateKey(stateKey, secondField.label)
          const firstCurrent = fieldStates[firstKey] ?? firstField
          const secondCurrent = fieldStates[secondKey] ?? secondField

          setFieldStates((current) => ({
            ...current,
            [firstKey]: { ...firstCurrent, label: firstField.label, value: secondCurrent.value, sublabel: secondCurrent.sublabel },
            [secondKey]: { ...secondCurrent, label: secondField.label, value: firstCurrent.value, sublabel: firstCurrent.sublabel },
          }))
        }}
        onFieldChange={(index, value) =>
          setFieldStates((current) => updateFieldState(current, stateKey, activeTab, desktopFields[index], value))
        }
      />
      <HeroBenefits activeTab={activeTab} />
    </div>
  )
}

function buildFormFields(fields: HeroSearchFieldData[], activeTab: HeroTabKey, stateKey: string, fieldStates: Record<string, HeroSearchFieldData>) {
  return fields.map((field) => {
    const stateField = fieldStates[getFieldStateKey(stateKey, field.label)] ?? field
    const choices = getFieldChoices(activeTab, field)
    const inputType = getFieldInputType(field, choices)

      return {
        ...stateField,
        inputType,
        options:
          inputType === "date"
            ? undefined
            : choices.map((choice) => ({
              value: choice.value,
              label: formatOptionPrimaryLabel(activeTab, field, choice),
              sublabel: formatOptionSecondaryLabel(activeTab, field, choice),
              group: inferOptionGroup(activeTab, field, choice),
            })),
        value: inputType === "date" ? formatDisplayDateToIso(stateField.value) : stateField.value,
      }
  })
}

function updateFieldState(
  current: Record<string, HeroSearchFieldData>,
  stateKey: string,
  activeTab: HeroTabKey,
  field: HeroSearchFieldData & { inputType?: "text" | "date" | "select" | "autocomplete" },
  nextValue: string,
) {
  const fieldKey = getFieldStateKey(stateKey, field.label)

  if (field.inputType === "date") {
    return {
      ...current,
      [fieldKey]: {
        ...field,
        value: formatIsoDateToDisplay(nextValue),
        sublabel: formatIsoDateToWeekday(nextValue),
      },
    }
  }

  if (field.inputType === "select" || field.inputType === "autocomplete") {
    const matchedChoice = getFieldChoices(activeTab, field).find((choice) => choice.value.toLowerCase() === nextValue.toLowerCase())

    return {
      ...current,
      [fieldKey]: matchedChoice
        ? { ...field, value: matchedChoice.value, sublabel: matchedChoice.sublabel ?? field.sublabel }
        : { ...field, value: nextValue, sublabel: field.inputType === "autocomplete" ? "" : field.sublabel },
    }
  }

  return {
    ...current,
    [fieldKey]: {
      ...field,
      value: nextValue,
    },
  }
}

function getFieldStateKey(stateKey: string, label: string) {
  return `${stateKey}:${getFieldSemanticKey(label)}`
}

function getFieldSemanticKey(label: string) {
  const normalized = label.toLowerCase()

  if (normalized.includes("dari") || normalized.includes("asal")) return "origin"
  if (normalized.includes("ke") || normalized.includes("tujuan")) return "destination"
  if (normalized.includes("transit")) return "transit"
  if (normalized.includes("check-in")) return "checkin"
  if (normalized.includes("check-out")) return "checkout"
  if (normalized.includes("berangkat") || normalized.includes("pergi") || normalized.includes("keberangkatan")) return "departure"
  if (normalized.includes("pulang")) return "return"
  if (normalized.includes("tanggal") || normalized.includes("kunjungan")) return "date"
  if (normalized.includes("jam")) return "time"
  if (normalized.includes("destinasi") || normalized.includes("trip") || normalized.includes("event") || normalized.includes("area")) return "destination_query"
  if (normalized.includes("durasi")) return "duration"
  if (normalized.includes("kategori") || normalized.includes("jenis")) return "category"
  if (normalized.includes("tamu") || normalized.includes("penumpang") || normalized.includes("peserta") || normalized.includes("tiket")) return "passenger"

  return normalized.replace(/\s+/g, "_")
}

function getFieldInputType(field: HeroSearchFieldData, choices: HeroSearchFieldData[]) {
  const normalized = field.label.toLowerCase()
  if (
    normalized.includes("berangkat") ||
    normalized.includes("pulang") ||
    normalized.includes("check-in") ||
    normalized.includes("check-out") ||
    normalized.includes("tanggal") ||
    normalized.includes("kunjungan") ||
    normalized.includes("keberangkatan") ||
    normalized.includes("pergi")
  ) {
    return "date" as const
  }

  if (
    normalized.includes("dari") ||
    normalized.includes("asal") ||
    normalized.includes("ke") ||
    normalized.includes("tujuan") ||
    normalized.includes("destinasi") ||
    normalized.includes("trip") ||
    normalized.includes("event") ||
    normalized.includes("area")
  ) {
    return "autocomplete" as const
  }

  if (field.withChevron || choices.length > 1) {
    return "select" as const
  }

  return "text" as const
}

function getFieldChoices(activeTab: HeroTabKey, field: HeroSearchFieldData): HeroSearchFieldData[] {
  const label = field.label.toLowerCase()
  const current = [{ label: field.label, value: field.value, sublabel: field.sublabel, withChevron: field.withChevron, withSwap: field.withSwap }]
  let choices: HeroSearchFieldData[] = current

  if (label.includes("dari") || label.includes("asal")) {
    choices =
      activeTab === "flight"
        ? [
            { label: field.label, value: "CGK   Jakarta", sublabel: "Soekarno Hatta International" },
            { label: field.label, value: "HLP   Jakarta", sublabel: "Halim Perdanakusuma" },
            { label: field.label, value: "YIA   Yogyakarta", sublabel: "Yogyakarta International" },
            { label: field.label, value: "JOG   Yogyakarta", sublabel: "Adisutjipto" },
            { label: field.label, value: "DPS   Denpasar", sublabel: "Ngurah Rai" },
            { label: field.label, value: "SUB   Surabaya", sublabel: "Juanda" },
            { label: field.label, value: "KNO   Medan", sublabel: "Kualanamu" },
            { label: field.label, value: "UPG   Makassar", sublabel: "Sultan Hasanuddin" },
            { label: field.label, value: "BPN   Balikpapan", sublabel: "Sultan Aji Muhammad Sulaiman" },
            { label: field.label, value: "PLM   Palembang", sublabel: "Sultan Mahmud Badaruddin II" },
            { label: field.label, value: "PNK   Pontianak", sublabel: "Supadio" },
            { label: field.label, value: "BDO   Bandung", sublabel: "Husein Sastranegara" },
            { label: field.label, value: "SOC   Solo", sublabel: "Adi Soemarmo" },
            { label: field.label, value: "SRG   Semarang", sublabel: "Jenderal Ahmad Yani" },
            ...current,
          ]
        : [
            ...current,
            { label: field.label, value: activeTab === "ship" ? "Ketapang" : "Surabaya", sublabel: activeTab === "ship" ? "Banyuwangi" : "Pasar Turi", withSwap: field.withSwap },
            { label: field.label, value: activeTab === "ship" ? "Gilimanuk" : "Semarang", sublabel: activeTab === "ship" ? "Bali" : "Tawang", withSwap: field.withSwap },
            { label: field.label, value: activeTab === "ship" ? "Padang Bai" : "Bandung", sublabel: activeTab === "ship" ? "Karangasem" : "Hall", withSwap: field.withSwap },
            { label: field.label, value: activeTab === "ship" ? "Tanjung Perak" : "Yogyakarta", sublabel: activeTab === "ship" ? "Surabaya" : "Tugu", withSwap: field.withSwap },
            { label: field.label, value: activeTab === "ship" ? "Tanjung Priok" : "Solo", sublabel: activeTab === "ship" ? "Jakarta" : "Balapan", withSwap: field.withSwap },
            { label: field.label, value: activeTab === "ship" ? "Bakauheni" : "Malang", sublabel: activeTab === "ship" ? "Lampung" : "Kota Baru", withSwap: field.withSwap },
          ]
  } else if (label.includes("ke") || label.includes("tujuan")) {
    choices =
      activeTab === "flight"
        ? [
            { label: field.label, value: "DPS   Denpasar", sublabel: "Ngurah Rai" },
            { label: field.label, value: "YIA   Yogyakarta", sublabel: "Yogyakarta International" },
            { label: field.label, value: "JOG   Yogyakarta", sublabel: "Adisutjipto" },
            { label: field.label, value: "SIN   Singapore", sublabel: "Changi" },
            { label: field.label, value: "BKK   Bangkok", sublabel: "Suvarnabhumi" },
            { label: field.label, value: "HND   Tokyo", sublabel: "Haneda" },
            { label: field.label, value: "NRT   Tokyo", sublabel: "Narita International" },
            { label: field.label, value: "ICN   Seoul", sublabel: "Incheon" },
            { label: field.label, value: "HKG   Hong Kong", sublabel: "Hong Kong International" },
            { label: field.label, value: "MEL   Melbourne", sublabel: "Tullamarine" },
            { label: field.label, value: "KUL   Kuala Lumpur", sublabel: "Kuala Lumpur International" },
            { label: field.label, value: "CAN   Guangzhou", sublabel: "Baiyun" },
            { label: field.label, value: "PVG   Shanghai", sublabel: "Pudong International" },
            { label: field.label, value: "SHA   Shanghai", sublabel: "Hongqiao International" },
            { label: field.label, value: "PEK   Beijing", sublabel: "Capital International" },
            { label: field.label, value: "PKX   Beijing", sublabel: "Daxing International" },
            { label: field.label, value: "TPE   Taipei", sublabel: "Taoyuan" },
            { label: field.label, value: "SYD   Sydney", sublabel: "Kingsford Smith" },
            { label: field.label, value: "DOH   Doha", sublabel: "Hamad International" },
            { label: field.label, value: "DXB   Dubai", sublabel: "Dubai International" },
            ...current,
          ]
        : [
            ...current,
            { label: field.label, value: activeTab === "ship" ? "Lembar" : "Solo", sublabel: activeTab === "ship" ? "Lombok" : "Balapan" },
            { label: field.label, value: activeTab === "ship" ? "Padang Bai" : "Malang", sublabel: activeTab === "ship" ? "Bali" : "Kota Baru" },
            { label: field.label, value: activeTab === "ship" ? "Gili Trawangan" : "Yogyakarta", sublabel: activeTab === "ship" ? "Lombok Utara" : "Tugu" },
            { label: field.label, value: activeTab === "ship" ? "Nusa Penida" : "Semarang", sublabel: activeTab === "ship" ? "Banjar Nyuh" : "Tawang" },
            { label: field.label, value: activeTab === "ship" ? "Labuan Bajo" : "Surabaya", sublabel: activeTab === "ship" ? "Marina" : "Gubeng" },
            { label: field.label, value: activeTab === "ship" ? "Batam Center" : "Bandung", sublabel: activeTab === "ship" ? "Kepulauan Riau" : "Hall", },
          ]
  } else if (label.includes("destinasi") || label.includes("trip") || label.includes("event") || label.includes("area")) {
    if (activeTab === "hotel") {
      choices = [
        ...current,
        { label: field.label, value: "Yogyakarta", sublabel: "Daerah Istimewa Yogyakarta, Indonesia" },
        { label: field.label, value: "Kuala Lumpur", sublabel: "Malaysia" },
        { label: field.label, value: "Tokyo", sublabel: "Kanto, Jepang" },
        { label: field.label, value: "Jakarta", sublabel: "Indonesia" },
        { label: field.label, value: "Bali", sublabel: "Indonesia" },
        { label: field.label, value: "Singapura", sublabel: "Singapura" },
        { label: field.label, value: "Hong Kong", sublabel: "Hong Kong SAR" },
        { label: field.label, value: "Bandung", sublabel: "Jawa Barat, Indonesia" },
        { label: field.label, value: "Semarang", sublabel: "Jawa Tengah, Indonesia" },
        { label: field.label, value: "Bangkok", sublabel: "Thailand" },
        { label: field.label, value: "Osaka", sublabel: "Kansai, Jepang" },
        { label: field.label, value: "Shanghai", sublabel: "China" },
        { label: field.label, value: "Seoul", sublabel: "Korea Selatan" },
        { label: field.label, value: "Dubai", sublabel: "Uni Emirat Arab" },
      ]
    } else if (activeTab === "activity") {
      choices = [
        ...current,
        { label: field.label, value: "Universal Beijing Resort", sublabel: "Beijing, China" },
        { label: field.label, value: "Shanghai Disneyland", sublabel: "Shanghai, China" },
        { label: field.label, value: "The Bund Night Cruise", sublabel: "Shanghai, China" },
        { label: field.label, value: "Great Wall Day Tour", sublabel: "Beijing, China" },
        { label: field.label, value: "Zhujiajiao Water Town Tour", sublabel: "Shanghai, China" },
        { label: field.label, value: "Chimelong Safari Park", sublabel: "Guangzhou, China" },
        { label: field.label, value: "Terracotta Warriors Tour", sublabel: "Xi'an, China" },
        { label: field.label, value: "Victoria Peak Experience", sublabel: "Hong Kong" },
        { label: field.label, value: "Tokyo Disneyland", sublabel: "Tokyo, Jepang" },
        { label: field.label, value: "Lotte World Adventure", sublabel: "Seoul, Korea Selatan" },
      ]
    } else if (activeTab === "package") {
      choices = [
        ...current,
        { label: field.label, value: "Bali 3H2M", sublabel: "Hotel + Tour" },
        { label: field.label, value: "Shanghai 4H3M", sublabel: "Hotel + City Tour" },
        { label: field.label, value: "Beijing 5H4M", sublabel: "Hotel + Tour" },
        { label: field.label, value: "Chongqing Explorer", sublabel: "4 Hari 3 Malam" },
        { label: field.label, value: "Tokyo Sakura Escape", sublabel: "5 Hari 4 Malam" },
        { label: field.label, value: "Hong Kong Family Fun", sublabel: "Disney + Hotel" },
        { label: field.label, value: "Labuan Bajo Premium", sublabel: "Liveaboard + Hotel" },
        { label: field.label, value: "Bangkok Shopping Trip", sublabel: "4 Hari 3 Malam" },
        { label: field.label, value: "Seoul K-Culture Journey", sublabel: "5 Hari 4 Malam" },
      ]
    } else {
      choices = [
        ...current,
        { label: field.label, value: "Bandung", sublabel: "Indonesia" },
        { label: field.label, value: "Yogyakarta", sublabel: "Indonesia" },
        { label: field.label, value: "Jakarta", sublabel: "Indonesia" },
        { label: field.label, value: "Surabaya", sublabel: "Indonesia" },
        { label: field.label, value: "Semarang", sublabel: "Indonesia" },
        { label: field.label, value: "Malang", sublabel: "Indonesia" },
      ]
    }
  } else if (label.includes("transit")) {
    choices = [
      ...current,
      { label: field.label, value: "Kuala Lumpur", sublabel: "KUL" },
      { label: field.label, value: "Hong Kong", sublabel: "HKG" },
      { label: field.label, value: "Singapore", sublabel: "SIN" },
      { label: field.label, value: "Bangkok", sublabel: "BKK" },
      { label: field.label, value: "Taipei", sublabel: "TPE" },
      { label: field.label, value: "Doha", sublabel: "DOH" },
    ]
  } else if (label.includes("berangkat") || label.includes("pergi") || label.includes("check-in") || label.includes("kunjungan") || label.includes("tanggal") || label.includes("keberangkatan")) {
    choices = [
      ...current,
      { label: field.label, value: compactDateShift(field.value, 3), sublabel: "Pilihan berikutnya" },
      { label: field.label, value: compactDateShift(field.value, 7), sublabel: "Minggu depan" },
      { label: field.label, value: compactDateShift(field.value, 10), sublabel: "Akhir pekan depan" },
      { label: field.label, value: compactDateShift(field.value, 14), sublabel: "2 minggu lagi" },
      { label: field.label, value: compactDateShift(field.value, 21), sublabel: "Bulan ini" },
    ]
  } else if (label.includes("pulang") || label.includes("check-out")) {
    choices = [
      ...current,
      { label: field.label, value: compactDateShift(field.value, 4), sublabel: "Durasi fleksibel" },
      { label: field.label, value: compactDateShift(field.value, 8), sublabel: "Durasi lebih lama" },
      { label: field.label, value: compactDateShift(field.value, 12), sublabel: "Liburan panjang" },
      { label: field.label, value: compactDateShift(field.value, 16), sublabel: "Pulang akhir pekan" },
    ]
  } else if (label.includes("jam")) {
    choices = [
      ...current,
      { label: field.label, value: "08:30", sublabel: "Pagi" },
      { label: field.label, value: "21:15", sublabel: "Malam" },
      { label: field.label, value: "06:00", sublabel: "Subuh" },
      { label: field.label, value: "12:45", sublabel: "Siang" },
      { label: field.label, value: "15:30", sublabel: "Sore" },
      { label: field.label, value: "23:00", sublabel: "Larut malam" },
    ]
  } else if (label.includes("penumpang") || label.includes("tamu") || label.includes("peserta") || label.includes("tiket")) {
    choices = [
      ...current,
      { label: field.label, value: "2 Dewasa", sublabel: "Pilihan populer", withChevron: field.withChevron },
      { label: field.label, value: "2 Dewasa, 1 Anak", sublabel: "Family option", withChevron: field.withChevron },
      { label: field.label, value: "1 Dewasa", sublabel: "Solo traveler", withChevron: field.withChevron },
      { label: field.label, value: "2 Dewasa, 2 Anak", sublabel: "Family saver", withChevron: field.withChevron },
      { label: field.label, value: "3 Dewasa", sublabel: "Group light", withChevron: field.withChevron },
      { label: field.label, value: "4 Dewasa", sublabel: "Small group", withChevron: field.withChevron },
      { label: field.label, value: "1 Dewasa, Ekonomi", sublabel: "Kelas Kabin", withChevron: field.withChevron },
      { label: field.label, value: "1 Dewasa, Premium Economy", sublabel: "Kelas Kabin", withChevron: field.withChevron },
      { label: field.label, value: "1 Dewasa, Business", sublabel: "Kelas Kabin", withChevron: field.withChevron },
      { label: field.label, value: "1 Dewasa, First Class", sublabel: "Kelas Kabin", withChevron: field.withChevron },
    ]
  } else if (label.includes("kategori") || label.includes("jenis") || label.includes("durasi")) {
    choices = [
      ...current,
      { label: field.label, value: activeTab === "activity" ? "Family friendly" : "4 Hari 3 Malam", sublabel: activeTab === "activity" ? "Rekomendasi" : "Paket favorit", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "VIP access" : "5 Hari 4 Malam", sublabel: activeTab === "activity" ? "Premium" : "Lebih lengkap", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "Theme park" : "2 Hari 1 Malam", sublabel: activeTab === "activity" ? "Paling populer" : "Trip singkat", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "Day tour" : "3 Hari 2 Malam", sublabel: activeTab === "activity" ? "Half / full day" : "Pilihan utama", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "Adventure" : "6 Hari 5 Malam", sublabel: activeTab === "activity" ? "Outdoor" : "Long stay", withChevron: field.withChevron },
      { label: field.label, value: activeTab === "activity" ? "Cultural experience" : "7 Hari 6 Malam", sublabel: activeTab === "activity" ? "Local highlight" : "Eksplor lengkap", withChevron: field.withChevron },
    ]
  }

  return dedupeFieldChoices(choices, field)
}

function inferOptionGroup(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if (normalized.includes("dari") || normalized.includes("ke") || normalized.includes("asal") || normalized.includes("tujuan")) {
    if (activeTab === "flight") {
      const city = extractFlightCity(choice.value)
      if (city) return city
      return "Bandara Lainnya"
    }

    return activeTab === "ship" ? "Pelabuhan Populer" : "Kota & Stasiun Populer"
  }

  if (normalized.includes("destinasi") || normalized.includes("trip") || normalized.includes("event") || normalized.includes("area")) {
    const value = choice.value.toLowerCase()
    if (activeTab === "hotel") {
      if (value.includes("bali") || value.includes("jakarta") || value.includes("bandung") || value.includes("yogyakarta")) return "Domestik Populer"
      return "Internasional Favorit"
    }
    if (activeTab === "activity") return "Atraksi & Tur Terpopuler"
    if (activeTab === "package") return "Paket Favorit"
    return "Destinasi Populer"
  }

  if (normalized.includes("transit")) return "Transit Rekomendasi"
  if (normalized.includes("berangkat") || normalized.includes("pergi") || normalized.includes("check-in") || normalized.includes("tanggal") || normalized.includes("kunjungan") || normalized.includes("keberangkatan")) return "Tanggal Rekomendasi"
  if (normalized.includes("pulang") || normalized.includes("check-out")) return "Tanggal Pulang"
  if (normalized.includes("jam")) return "Pilihan Jam"
  if (normalized.includes("penumpang") || normalized.includes("tamu") || normalized.includes("peserta") || normalized.includes("tiket")) return "Kombinasi Populer"
  if (normalized.includes("kategori") || normalized.includes("jenis")) return "Kategori Favorit"
  if (normalized.includes("durasi")) return "Durasi Favorit"

  return "Pilihan Lainnya"
}

function formatOptionPrimaryLabel(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if ((normalized.includes("dari") || normalized.includes("ke") || normalized.includes("asal") || normalized.includes("tujuan")) && activeTab === "flight") {
    const code = extractFlightCode(choice.value)
    if (code) return code
    return extractFlightCity(choice.value)
  }

  return choice.value ?? ""
}

function formatOptionSecondaryLabel(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if ((normalized.includes("dari") || normalized.includes("ke") || normalized.includes("asal") || normalized.includes("tujuan")) && activeTab === "flight") {
    return choice.sublabel ?? ""
    const code = extractFlightCode(choice.value)
    return code ? `${code} • ${choice.sublabel ?? ""}` : choice.sublabel
  }

  return choice.sublabel ?? ""
}

function extractFlightCode(input: string) {
  const match = input.match(/^([A-Z]{3})\s+/)
  return match?.[1] ?? ""
}

function extractFlightCity(input: string) {
  const match = input.match(/^[A-Z]{3}\s+(.*)$/)
  return match?.[1] ?? input
}

function dedupeFieldChoices(choices: HeroSearchFieldData[], baseField: HeroSearchFieldData) {
  const normalizedLabel = baseField.label.toLowerCase()
  const isFlightAirportField =
    normalizedLabel.includes("dari") ||
    normalizedLabel.includes("ke") ||
    normalizedLabel.includes("asal") ||
    normalizedLabel.includes("tujuan")

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
      const key = isFlightAirportField ? choice.value : `${choice.value}::${choice.sublabel}`
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
  return formatDateObjectToDisplay(date)
}

function formatDisplayDateToIso(input: string) {
  const match = input.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!match) return ""
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
  if (monthIndex === undefined) return ""

  return `${yearRaw}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(dayRaw)).padStart(2, "0")}`
}

function formatIsoDateToDisplay(input: string) {
  if (!input) return ""
  const [year, month, day] = input.split("-").map(Number)
  if (!year || !month || !day) return ""
  return formatDateObjectToDisplay(new Date(year, month - 1, day))
}

function formatIsoDateToWeekday(input: string) {
  if (!input) return ""
  const [year, month, day] = input.split("-").map(Number)
  if (!year || !month || !day) return ""
  const weekdays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  return weekdays[new Date(year, month - 1, day).getDay()]
}

function formatDateObjectToDisplay(date: Date) {
  const monthLabels = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`
}
