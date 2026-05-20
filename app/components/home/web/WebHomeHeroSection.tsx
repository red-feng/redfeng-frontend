"use client"

import Image from "next/image"
import { useState } from "react"
import type { Locale } from "@/lib/i18n"

import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import {
  getHeroSearchConfig,
  getHeroSearchProviderAdapter,
  heroSearchConfigs,
  HeroBenefits,
  HeroHeader,
  HeroSearchDesktop,
  HeroSearchField,
  HeroSearchMobile,
  HeroTabs,
} from "@/app/components/home/web/hero"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { HeroPassengerState, HeroSearchFieldData, HeroSearchProviderKey } from "@/app/components/home/web/hero"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

export default function WebHomeHeroSection({ locale }: { locale: Locale }) {
  const [activeTab, setActiveTab] = useState<HeroTabKey>("flight")
  const [activeOptions, setActiveOptions] = useState<Record<HeroTabKey, string>>({
    flight: heroSearchConfigs.flight.defaultOption,
    hotel: heroSearchConfigs.hotel.defaultOption,
    train: heroSearchConfigs.train.defaultOption,
    bus: heroSearchConfigs.bus.defaultOption,
    ship: heroSearchConfigs.ship.defaultOption,
    cruise: heroSearchConfigs.cruise.defaultOption,
    activity: heroSearchConfigs.activity.defaultOption,
    package: heroSearchConfigs.package.defaultOption,
  })

  return (
    <div className="home-hero-standard relative z-20 overflow-visible">
      <div className="relative min-h-[500px] overflow-hidden bg-[#081f42]">
        <DesktopHeroBackdrop />

        <div className={`home-hero-shell ${homeLayoutLock.heroShellClass}`}>
          <HeroHeader locale={locale} />
          <MobileHeroBackdrop />
          <HeroIntro locale={locale} />
        </div>
      </div>

      <div className={`home-hero-search-wrap ${homeLayoutLock.floatingSearchShellClass}`}>
        <div className={`home-hero-search-card relative z-[220] overflow-visible ${homeLayoutLock.cardRadiusClass} border border-[#edf1f5] bg-white shadow-[0_28px_60px_-34px_rgba(15,23,42,0.28)]`}>
          <HeroTabs activeTab={activeTab} onChange={setActiveTab} locale={locale} />
          <HeroSearchPanel
            activeTab={activeTab}
            activeOption={activeOptions[activeTab]}
            locale={locale}
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
  )
}

function DesktopHeroBackdrop() {
  return (
    <div className="absolute inset-0 hidden lg:block">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-center" />
    </div>
  )
}

function MobileHeroBackdrop() {
  return (
    <div className="absolute inset-0 lg:hidden">
      <Image src="/home-assets/hero-bg.png" alt="Hero RedFeng" fill priority className="object-cover object-[72%_center]" />
    </div>
  )
}

function HeroIntro({ locale }: { locale: Locale }) {
  const copy = {
    id: {
      titleA: "Ekosistem perjalanan",
      titleB: "dalam satu genggaman",
    },
    en: {
      titleA: "Your travel ecosystem",
      titleB: "in one seamless place",
    },
    zh: {
      titleA: "一站式旅行生态",
      titleB: "尽在一个平台中",
    },
  }[locale]

  return (
    <div className="home-hero-intro relative z-10 flex justify-center pt-6 text-center lg:pt-1">
      <div className="home-hero-intro-shell max-w-[860px] pb-32 lg:min-h-[260px] lg:pb-0">
        <h1 className={`home-hero-title ${homeLayoutLock.homepageHeroTitleClass}`}>
          {copy.titleA}
          <span className="mt-2 block text-[#ff5a43]">{copy.titleB}</span>
        </h1>
      </div>
    </div>
  )
}

export function HeroSearchPanel({
  activeTab,
  activeOption,
  locale,
  onOptionChange,
  showStatus = true,
  showBenefits = true,
}: {
  activeTab: HeroTabKey
  activeOption: string
  locale: Locale
  onOptionChange: (optionKey: string) => void
  showStatus?: boolean
  showBenefits?: boolean
}) {
  const baseConfig = getHeroSearchConfig(activeTab, activeOption)
  const stateKey = `${activeTab}:${activeOption}`
  const [fieldStates, setFieldStates] = useState<Record<string, HeroSearchFieldData>>({})
  const desktopFields = buildFormFields(baseConfig.desktopFields, activeTab, stateKey, fieldStates, locale)
  const mobileFields = buildFormFields(baseConfig.mobileFields, activeTab, stateKey, fieldStates, locale)
  const desktopCabinField = activeTab === "flight" ? desktopFields.find((field) => getFieldSemanticKey(field.label) === "cabin") : undefined
  const desktopSearchFields = desktopCabinField ? desktopFields.filter((field) => field !== desktopCabinField) : desktopFields
  const isFlightOneWayDesktop = activeTab === "flight" && activeOption === "one_way" && Boolean(desktopCabinField)
  const config = {
    ...baseConfig,
    desktopFields: desktopSearchFields,
    mobileFields,
  }
  const localizedOptionLabels = getLocalizedOptionLabels(locale)
  const statusCopy = getHeroStatusCopy(activeTab, locale)

  return (
    <div className="relative overflow-visible px-5 py-5 lg:px-8 lg:py-[1.65rem]">
      {showStatus ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:mb-5">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusCopy.tone}`}>
            {statusCopy.label}
          </span>
          <p className="text-[12px] leading-6 text-slate-500 lg:text-[13px]">{statusCopy.body}</p>
        </div>
      ) : null}
      {isFlightOneWayDesktop && desktopCabinField ? (
        <div
          className="hidden items-center gap-x-6 lg:grid"
          style={{ gridTemplateColumns: "1fr 352px 1fr" }}
        >
          <div className="flex flex-wrap items-center gap-11 text-[13px] font-semibold text-slate-700">
            {config.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onOptionChange(option.key)}
                className={`inline-flex items-center gap-3 transition ${config.activeOption === option.key ? "text-[#314865]" : "text-[#7587a0] hover:text-slate-800"}`}
              >
                <span className={`h-3 w-3 rounded-full ${config.activeOption === option.key ? "bg-[#ff5a43]" : "border border-[#cfd8e4] bg-white"}`} />
                {localizedOptionLabels[option.key] ?? localizeHeroText(option.label, locale)}
              </button>
            ))}
          </div>
          <div className="grid w-[352px] shrink-0 translate-x-[24%] grid-cols-[96px_244px] items-center gap-3 justify-self-start">
            <p className="text-left text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#42526b]">
              {desktopCabinField.displayLabel || desktopCabinField.label}
            </p>
            <HeroSearchField
              label={desktopCabinField.label}
              displayLabel={desktopCabinField.displayLabel}
              value={desktopCabinField.value}
              displayValue={desktopCabinField.displayValue}
              sublabel={desktopCabinField.sublabel ?? ""}
              displaySublabel={desktopCabinField.displaySublabel}
              hideLabel
              hideSublabel
              withChevron={desktopCabinField.withChevron}
              desktopDensity="compact"
              variant="searchbox-desktop"
              inputType={desktopCabinField.inputType}
              options={desktopCabinField.options}
              passengerState={desktopCabinField.passengerState}
              cabinOptions={desktopCabinField.cabinOptions}
              onValueChange={(value) => setFieldStates((current) => updateFieldState(current, stateKey, activeTab, desktopCabinField, value))}
              locale={locale}
              className="w-[244px] rounded-[14px] px-[14px] py-0"
            />
          </div>
          <div />
        </div>
      ) : (
        <div className="hidden items-start justify-between gap-8 lg:flex">
          <div className="flex flex-wrap gap-11 text-[13px] font-semibold text-slate-700">
            {config.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onOptionChange(option.key)}
                className={`inline-flex items-center gap-3 transition ${config.activeOption === option.key ? "text-[#314865]" : "text-[#7587a0] hover:text-slate-800"}`}
              >
                <span className={`h-3 w-3 rounded-full ${config.activeOption === option.key ? "bg-[#ff5a43]" : "border border-[#cfd8e4] bg-white"}`} />
                {localizedOptionLabels[option.key] ?? localizeHeroText(option.label, locale)}
              </button>
            ))}
          </div>
          {desktopCabinField ? (
            <div className="ml-auto w-[406px] shrink-0 pt-[2px]">
              <div className="grid grid-cols-[104px_286px] items-center gap-4">
                <p className="text-left text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#42526b]">
                  {desktopCabinField.displayLabel || desktopCabinField.label}
                </p>
                <HeroSearchField
                  label={desktopCabinField.label}
                  displayLabel={desktopCabinField.displayLabel}
                  value={desktopCabinField.value}
                  displayValue={desktopCabinField.displayValue}
                  sublabel={desktopCabinField.sublabel ?? ""}
                  displaySublabel={desktopCabinField.displaySublabel}
                  hideLabel
                  hideSublabel
                  withChevron={desktopCabinField.withChevron}
                  variant="searchbox-desktop"
                  inputType={desktopCabinField.inputType}
                  options={desktopCabinField.options}
                  passengerState={desktopCabinField.passengerState}
                  cabinOptions={desktopCabinField.cabinOptions}
                  onValueChange={(value) => setFieldStates((current) => updateFieldState(current, stateKey, activeTab, desktopCabinField, value))}
                  locale={locale}
                  className="min-h-[38px] rounded-[14px] px-4 py-[7px]"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      <HeroSearchMobile
        config={config}
        locale={locale}
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
        locale={locale}
        fields={desktopSearchFields}
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
      {showBenefits ? <HeroBenefits activeTab={activeTab} locale={locale} /> : null}
    </div>
  )
}

function getHeroStatusCopy(activeTab: HeroTabKey, locale: Locale) {
  if (activeTab === "package") {
    return {
      label: locale === "en" ? "Live booking" : locale === "zh" ? "可直接预订" : "Live booking",
      body:
        locale === "en"
          ? "This tab already leads to the live package catalog and booking flow."
          : locale === "zh"
            ? "这个标签页已经连接到真实的套餐目录与预订流程。"
            : "Tab ini sudah masuk ke katalog paket dan alur booking live.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    }
  }

  const serviceLabelByTab: Record<Exclude<HeroTabKey, "package">, string> = {
    flight: "Pesawat",
    hotel: "Hotel",
    train: "Kereta",
    bus: "Bus",
    ship: "Kapal",
    cruise: "Kapal Pesiar",
    activity: "Aktivitas",
  }
  const service = servicePageConfigByLabel[serviceLabelByTab[activeTab]]

  return {
    label: locale === "en" ? "Dummy catalog" : locale === "zh" ? "示例目录" : "Katalog dummy",
    body:
      locale === "en"
        ? service?.status || "This tab currently opens a sample catalog foundation."
        : locale === "zh"
          ? "这个标签页目前打开的是示例目录基础页。"
          : service?.status || "Tab ini saat ini membuka fondasi katalog contoh.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  }
}

export function getLocalizedOptionLabels(locale: Locale): Record<string, string> {
  return {
    id: {
      one_way: "Sekali Jalan",
      round_trip: "Pulang - Pergi",
      multi_city: "Multi Kota",
      hotel: "Hotel",
      villa: "Villa",
      fast_train: "Kereta Cepat",
      sleeper: "Sleeper Bus",
      fast_ferry: "Ferry Cepat",
      regular_cruise: "Regular Cruise",
      luxury_cruise: "Luxury Cruise",
      family_cruise: "Family Cruise",
      domestic: "Domestik",
      international: "Internasional",
      by_city: "Per Kota",
      by_property: "Per Properti",
      economy: "Ekonomi",
      business: "Bisnis",
      ferry: "Feri",
      fast_boat: "Fast Boat",
      resort: "Resort",
      theme_park: "Taman Hiburan",
      attraction: "Atraksi",
      tour: "Tur",
      event: "Event",
      open_trip: "Open Trip",
      private_trip: "Private Trip",
    },
    en: {
      one_way: "One Way",
      round_trip: "Round Trip",
      multi_city: "Multi City",
      hotel: "Hotel",
      villa: "Villa",
      fast_train: "High-Speed Rail",
      sleeper: "Sleeper Bus",
      fast_ferry: "Fast Ferry",
      regular_cruise: "Regular Cruise",
      luxury_cruise: "Luxury Cruise",
      family_cruise: "Family Cruise",
      domestic: "Domestic",
      international: "International",
      by_city: "By City",
      by_property: "By Property",
      economy: "Economy",
      business: "Business",
      ferry: "Ferry",
      fast_boat: "Fast Boat",
      resort: "Resort",
      theme_park: "Theme Park",
      attraction: "Attractions",
      tour: "Tours",
      event: "Events",
      open_trip: "Open Trip",
      private_trip: "Private Trip",
    },
    zh: {
      one_way: "单程",
      round_trip: "往返",
      multi_city: "多城市",
      hotel: "酒店",
      villa: "别墅",
      fast_train: "高铁",
      sleeper: "卧铺巴士",
      fast_ferry: "快速渡轮",
      regular_cruise: "标准邮轮",
      luxury_cruise: "豪华邮轮",
      family_cruise: "家庭邮轮",
      domestic: "国内",
      international: "国际",
      by_city: "按城市",
      by_property: "按住宿",
      economy: "经济舱",
      business: "商务舱",
      ferry: "渡轮",
      fast_boat: "快艇",
      resort: "度假村",
      theme_park: "主题乐园",
      attraction: "景点",
      tour: "行程",
      event: "活动",
      open_trip: "拼团行程",
      private_trip: "私人行程",
    },
  }[locale]
}

export function buildFormFields(
  fields: HeroSearchFieldData[],
  activeTab: HeroTabKey,
  stateKey: string,
  fieldStates: Record<string, HeroSearchFieldData>,
  locale: Locale,
) {
  const providerKey = heroSearchConfigs[activeTab].dataProvider

  return fields.map((field) => {
    const stateField = fieldStates[getFieldStateKey(stateKey, field.label)] ?? field
    const choices = getFieldChoicesForProvider(activeTab, field, providerKey)
    const inputType = getFieldInputType(activeTab, field, choices)

    return {
      ...stateField,
      displayLabel: localizeHeroText(field.label, locale),
      inputType,
      passengerState: stateField.passengerState,
      cabinOptions: stateField.cabinOptions,
      options:
        inputType === "date"
          ? undefined
          : choices.map((choice) => ({
              value: choice.value,
              label: formatOptionPrimaryLabel(activeTab, field, choice),
              sublabel: formatOptionSecondaryLabel(activeTab, field, choice),
              group: inferOptionGroup(activeTab, field, choice),
              displayValue: localizeHeroText(formatOptionPrimaryLabel(activeTab, field, choice), locale),
              displaySublabel: localizeHeroText(formatOptionSecondaryLabel(activeTab, field, choice), locale),
              displayGroup: localizeHeroText(inferOptionGroup(activeTab, field, choice), locale),
            })),
      value:
        inputType === "date"
          ? formatDisplayDateToIso(stateField.value)
          : inputType === "passenger"
            ? buildPassengerPrimaryValue(stateField.passengerState ?? getDefaultPassengerState(stateField))
            : stateField.value,
      displayValue:
        inputType === "passenger"
          ? localizePassengerPrimaryValue(stateField.passengerState ?? getDefaultPassengerState(stateField), locale)
          : localizeHeroFieldValue(inputType === "date" ? stateField.value : stateField.value, locale),
      displaySublabel:
        inputType === "passenger"
          ? localizeHeroFieldValue((stateField.passengerState ?? getDefaultPassengerState(stateField)).cabin, locale)
          : localizeHeroFieldValue(stateField.sublabel ?? "", locale),
    }
  })
}

export function updateFieldState(
  current: Record<string, HeroSearchFieldData>,
  stateKey: string,
  activeTab: HeroTabKey,
  field: HeroSearchFieldData & { inputType?: "text" | "date" | "select" | "autocomplete" | "passenger" },
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

  if (field.inputType === "passenger") {
    const nextPassengerState = parsePassengerPayload(nextValue) ?? field.passengerState ?? getDefaultPassengerState(field)

    return {
      ...current,
      [fieldKey]: {
        ...field,
        passengerState: nextPassengerState,
        value: buildPassengerPrimaryValue(nextPassengerState),
        sublabel: nextPassengerState.cabin,
      },
      ...(activeTab === "flight"
        ? {
            [`${stateKey}:cabin`]: {
              ...(current[`${stateKey}:cabin`] ?? {
                label: "Kelas Kabin",
                value: nextPassengerState.cabin,
                sublabel: "Pilihan kabin",
                withChevron: true,
              }),
              label: (current[`${stateKey}:cabin`]?.label || "Kelas Kabin"),
              value: nextPassengerState.cabin,
              sublabel: current[`${stateKey}:cabin`]?.sublabel || "Pilihan kabin",
              withChevron: true,
            },
          }
        : {}),
    }
  }

  if (field.inputType === "select" || field.inputType === "autocomplete") {
    const providerKey = heroSearchConfigs[activeTab].dataProvider
    const matchedChoice = getFieldChoicesForProvider(activeTab, field, providerKey).find((choice) => choice.value.toLowerCase() === nextValue.toLowerCase())

    if (activeTab === "flight" && getFieldSemanticKey(field.label) === "cabin") {
      const passengerKey = `${stateKey}:passenger`
      const currentPassengerField = current[passengerKey]
      const nextPassengerState = currentPassengerField?.passengerState
        ? { ...currentPassengerField.passengerState, cabin: nextValue }
        : undefined

      return {
        ...current,
        [fieldKey]: matchedChoice
          ? { ...field, value: matchedChoice.value, sublabel: matchedChoice.sublabel ?? field.sublabel }
          : { ...field, value: nextValue, sublabel: field.sublabel },
        ...(currentPassengerField && nextPassengerState
          ? {
              [passengerKey]: {
                ...currentPassengerField,
                passengerState: nextPassengerState,
                sublabel: nextValue,
              },
            }
          : {}),
      }
    }

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

function hasStandaloneWord(input: string, word: string) {
  return new RegExp(`(^|\\s)${word}(\\s|$)`).test(input)
}

function isOriginLabel(normalized: string) {
  return hasStandaloneWord(normalized, "dari") || normalized.includes("asal")
}

function isDestinationLabel(normalized: string) {
  return hasStandaloneWord(normalized, "ke") || normalized.includes("tujuan")
}

function getFieldSemanticKey(label: string) {
  const normalized = label.toLowerCase()

  if (isOriginLabel(normalized)) return "origin"
  if (isDestinationLabel(normalized)) return "destination"
  if (normalized.includes("transit")) return "transit"
  if (normalized.includes("kabin") || normalized.includes("cabin")) return "cabin"
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

function getFieldInputType(activeTab: HeroTabKey, field: HeroSearchFieldData, choices: HeroSearchFieldData[]) {
  const normalized = field.label.toLowerCase()
  if (
    field.passengerState ||
    (activeTab === "flight" && (normalized.includes("penumpang") || normalized.includes("penumpang & kelas")))
  ) {
    return "passenger" as const
  }

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
    isOriginLabel(normalized) ||
    isDestinationLabel(normalized) ||
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

function getDefaultPassengerState(field: Pick<HeroSearchFieldData, "passengerState" | "value" | "sublabel">): HeroPassengerState {
  if (field.passengerState) return field.passengerState
  return {
    adults: extractPassengerCount(field.value, "dewasa") || 1,
    children: extractPassengerCount(field.value, "anak"),
    infants: extractPassengerCount(field.value, "bayi"),
    cabin: field.sublabel || "Ekonomi",
  }
}

function extractPassengerCount(value: string, keyword: string) {
  const match = value.toLowerCase().match(new RegExp(`(\\d+)\\s+${keyword}`))
  return match ? Number.parseInt(match[1], 10) : 0
}

function buildPassengerPrimaryValue(state: HeroPassengerState) {
  const parts = [`${state.adults} Dewasa`]
  if (state.children > 0) parts.push(`${state.children} Anak`)
  if (state.infants > 0) parts.push(`${state.infants} Bayi`)
  return parts.join(", ")
}

function localizePassengerPrimaryValue(state: HeroPassengerState, locale: Locale) {
  return localizeHeroFieldValue(buildPassengerPrimaryValue(state), locale)
}

function parsePassengerPayload(input: string): HeroPassengerState | null {
  try {
    const parsed = JSON.parse(input) as Partial<HeroPassengerState>
    if (typeof parsed.adults !== "number" || typeof parsed.children !== "number" || typeof parsed.infants !== "number" || typeof parsed.cabin !== "string") {
      return null
    }

    return {
      adults: Math.max(1, parsed.adults),
      children: Math.max(0, parsed.children),
      infants: Math.max(0, Math.min(parsed.infants, Math.max(1, parsed.adults))),
      cabin: parsed.cabin,
    }
  } catch {
    return null
  }
}

function getFieldChoicesForProvider(activeTab: HeroTabKey, field: HeroSearchFieldData, providerKey: HeroSearchProviderKey) {
  const providerChoices = getHeroSearchProviderAdapter(providerKey).getFieldChoices?.({
    activeTab,
    field,
  })

  if (providerChoices && providerChoices.length > 0) {
    return dedupeFieldChoices(providerChoices, field)
  }

  return getFallbackFieldChoices(activeTab, field)
}

function getFallbackFieldChoices(activeTab: HeroTabKey, field: HeroSearchFieldData): HeroSearchFieldData[] {
  const label = field.label.toLowerCase()
  const current = [{ label: field.label, value: field.value, sublabel: field.sublabel, withChevron: field.withChevron, withSwap: field.withSwap }]
  let choices: HeroSearchFieldData[] = current

  if (isOriginLabel(label)) {
    choices =
      activeTab === "flight"
        ? [...buildFlightAirportChoices(field.label), ...current]
        : activeTab === "train"
          ? [...buildTrainStationChoices(field.label), ...current]
          : activeTab === "ship"
            ? [...buildShipPortChoices(field.label), ...current]
        : [
            ...current,
            { label: field.label, value: "Surabaya", sublabel: "Pasar Turi", withSwap: field.withSwap },
            { label: field.label, value: "Semarang", sublabel: "Tawang", withSwap: field.withSwap },
            { label: field.label, value: "Bandung", sublabel: "Hall", withSwap: field.withSwap },
            { label: field.label, value: "Yogyakarta", sublabel: "Tugu", withSwap: field.withSwap },
            { label: field.label, value: "Solo", sublabel: "Balapan", withSwap: field.withSwap },
            { label: field.label, value: "Malang", sublabel: "Kota Baru", withSwap: field.withSwap },
          ]
  } else if (isDestinationLabel(label)) {
    choices =
      activeTab === "flight"
        ? [...buildFlightAirportChoices(field.label), ...current]
        : activeTab === "train"
          ? [...buildTrainStationChoices(field.label), ...current]
          : activeTab === "ship"
            ? [...buildShipPortChoices(field.label), ...current]
        : [
            ...current,
            { label: field.label, value: "Solo", sublabel: "Balapan" },
            { label: field.label, value: "Malang", sublabel: "Kota Baru" },
            { label: field.label, value: "Yogyakarta", sublabel: "Tugu" },
            { label: field.label, value: "Semarang", sublabel: "Tawang" },
            { label: field.label, value: "Surabaya", sublabel: "Gubeng" },
            { label: field.label, value: "Bandung", sublabel: "Hall" },
          ]
  } else if (label.includes("rute cruise")) {
    choices = [
      ...current,
      { label: field.label, value: "Singapore - Penang - Phuket", sublabel: "Royal Caribbean • 3 malam" },
      { label: field.label, value: "Singapore - Port Klang - Penang", sublabel: "Royal Caribbean • 4 malam" },
      { label: field.label, value: "Singapore - Phuket - Penang", sublabel: "Royal Caribbean • 5 malam" },
      { label: field.label, value: "Shanghai - Jeju - Fukuoka", sublabel: "Royal Caribbean • 5 malam" },
      { label: field.label, value: "Hong Kong - Okinawa - Taipei", sublabel: "Royal Caribbean • 5 malam" },
      { label: field.label, value: "Singapore - Benoa - Lombok", sublabel: "Royal Caribbean • 6 malam" },
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
        { label: field.label, value: "Universal Studios Singapore", sublabel: "Singapore" },
        { label: field.label, value: "Gardens by the Bay", sublabel: "Singapore" },
        { label: field.label, value: "Universal Beijing Resort", sublabel: "Beijing, China" },
        { label: field.label, value: "Shanghai Disneyland", sublabel: "Shanghai, China" },
        { label: field.label, value: "Hong Kong Disneyland", sublabel: "Hong Kong" },
        { label: field.label, value: "Ocean Park Hong Kong", sublabel: "Hong Kong" },
        { label: field.label, value: "Tokyo Disneyland", sublabel: "Tokyo, Jepang" },
        { label: field.label, value: "Tokyo DisneySea", sublabel: "Tokyo, Jepang" },
        { label: field.label, value: "Universal Studios Japan", sublabel: "Osaka, Jepang" },
        { label: field.label, value: "teamLab Planets TOKYO", sublabel: "Tokyo, Jepang" },
        { label: field.label, value: "Lotte World Adventure", sublabel: "Seoul, Korea Selatan" },
        { label: field.label, value: "Everland", sublabel: "Yongin, Korea Selatan" },
        { label: field.label, value: "LEGOLAND Malaysia", sublabel: "Johor Bahru, Malaysia" },
        { label: field.label, value: "Sunway Lagoon", sublabel: "Kuala Lumpur, Malaysia" },
        { label: field.label, value: "Siam Amazing Park", sublabel: "Bangkok, Thailand" },
        { label: field.label, value: "Safari World Bangkok", sublabel: "Bangkok, Thailand" },
        { label: field.label, value: "VinWonders Phu Quoc", sublabel: "Phu Quoc, Vietnam" },
        { label: field.label, value: "Ba Na Hills", sublabel: "Da Nang, Vietnam" },
        { label: field.label, value: "The Bund Night Cruise", sublabel: "Shanghai, China" },
        { label: field.label, value: "Great Wall Day Tour", sublabel: "Beijing, China" },
        { label: field.label, value: "Zhujiajiao Water Town Tour", sublabel: "Shanghai, China" },
        { label: field.label, value: "Chimelong Safari Park", sublabel: "Guangzhou, China" },
        { label: field.label, value: "Terracotta Warriors Tour", sublabel: "Xi'an, China" },
        { label: field.label, value: "Victoria Peak Experience", sublabel: "Hong Kong" },
      ]
    } else if (activeTab === "package") {
      choices = [
        ...current,
        { label: field.label, value: "Indonesia", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "China", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Jepang", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Singapura", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Thailand", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Malaysia", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Vietnam", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Korea Selatan", sublabel: "Katalog negara tujuan" },
        { label: field.label, value: "Arab Saudi", sublabel: "Katalog negara tujuan" },
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
  } else if (label.includes("kelas kabin") && activeTab === "flight") {
    choices = [
      ...(field.cabinOptions?.map((option) => ({
        label: field.label,
        value: option,
        sublabel: option === "Ekonomi" ? "Pilihan paling hemat" : option === "Premium Economy" ? "Kursi lebih lega" : option === "Business" ? "Layanan premium" : "Perjalanan paling nyaman",
        withChevron: field.withChevron,
      })) ?? current),
    ]
  } else if (label.includes("cabin")) {
    choices = [
      ...current,
      { label: field.label, value: "Interior Cabin", sublabel: "Royal Caribbean • Best value", withChevron: field.withChevron },
      { label: field.label, value: "Ocean View", sublabel: "Royal Caribbean • Jendela laut", withChevron: field.withChevron },
      { label: field.label, value: "Balcony Cabin", sublabel: "Royal Caribbean • Private balcony", withChevron: field.withChevron },
      { label: field.label, value: "Junior Suite", sublabel: "Royal Caribbean • Suite entry", withChevron: field.withChevron },
      { label: field.label, value: "Grand Suite", sublabel: "Royal Caribbean • Luxury deck", withChevron: field.withChevron },
      { label: field.label, value: "Family Cabin", sublabel: "Royal Caribbean • 2 Dewasa, 2 Anak", withChevron: field.withChevron },
    ]
  } else if (label.includes("tamu")) {
    choices = [
      ...current,
      { label: field.label, value: "2 Tamu, 1 Kamar", sublabel: "Standar menginap", withChevron: field.withChevron },
      { label: field.label, value: "2 Tamu, 2 Kamar", sublabel: "Twin room", withChevron: field.withChevron },
      { label: field.label, value: "3 Tamu, 1 Kamar", sublabel: "Extra bed", withChevron: field.withChevron },
      { label: field.label, value: "4 Tamu, 2 Kamar", sublabel: "Family stay", withChevron: field.withChevron },
      { label: field.label, value: "6 Tamu, 3 Kamar", sublabel: "Group stay", withChevron: field.withChevron },
    ]
  } else if (label.includes("tiket")) {
    choices =
      activeTab === "activity"
        ? [
            ...current,
            { label: field.label, value: "1 Dewasa", sublabel: "Reguler", withChevron: field.withChevron },
            { label: field.label, value: "2 Dewasa", sublabel: "Reguler", withChevron: field.withChevron },
            { label: field.label, value: "2 Dewasa, 1 Anak", sublabel: "Family package", withChevron: field.withChevron },
            { label: field.label, value: "2 Dewasa", sublabel: "VIP access", withChevron: field.withChevron },
            { label: field.label, value: "4 Dewasa", sublabel: "Group pass", withChevron: field.withChevron },
          ]
        : current
  } else if (label.includes("peserta")) {
    choices =
      activeTab === "activity" || activeTab === "package"
        ? [
            ...current,
            { label: field.label, value: "1 Orang", sublabel: "Solo option", withChevron: field.withChevron },
            { label: field.label, value: "2 Orang", sublabel: "Couple option", withChevron: field.withChevron },
            { label: field.label, value: "4 Orang", sublabel: "Small group", withChevron: field.withChevron },
            { label: field.label, value: "6 Orang", sublabel: "Family group", withChevron: field.withChevron },
            { label: field.label, value: "10 Orang", sublabel: "Rombongan", withChevron: field.withChevron },
          ]
        : current
  } else if (label.includes("travel style") || label.includes("gaya")) {
    choices = [
      ...current,
      { label: field.label, value: "Explore", sublabel: "Eksplorasi kota & budaya", withChevron: field.withChevron },
      { label: field.label, value: "Adventure", sublabel: "Aktif & outdoor", withChevron: field.withChevron },
      { label: field.label, value: "Family", sublabel: "Liburan keluarga", withChevron: field.withChevron },
      { label: field.label, value: "Luxury", sublabel: "Premium experience", withChevron: field.withChevron },
      { label: field.label, value: "Honeymoon", sublabel: "Romantic getaway", withChevron: field.withChevron },
      { label: field.label, value: "Open Trip", sublabel: "Join trip schedule", withChevron: field.withChevron },
      { label: field.label, value: "Umroh", sublabel: "Religious journey", withChevron: field.withChevron },
    ]
  } else if (label.includes("penumpang")) {
    choices =
      activeTab === "flight"
        ? current
        : activeTab === "cruise"
          ? [
              ...current,
              { label: field.label, value: "2 Dewasa", sublabel: "Cabin twin", withChevron: field.withChevron },
              { label: field.label, value: "2 Dewasa, 1 Anak", sublabel: "Family cabin", withChevron: field.withChevron },
              { label: field.label, value: "2 Dewasa, 2 Anak", sublabel: "Family cruise", withChevron: field.withChevron },
              { label: field.label, value: "3 Dewasa", sublabel: "Triple occupancy", withChevron: field.withChevron },
              { label: field.label, value: "4 Penumpang", sublabel: "Quad cabin", withChevron: field.withChevron },
            ]
          : [
              ...current,
              { label: field.label, value: "1 Dewasa", sublabel: "Solo traveler", withChevron: field.withChevron },
              { label: field.label, value: "2 Dewasa", sublabel: "Pilihan populer", withChevron: field.withChevron },
              { label: field.label, value: "2 Dewasa, 1 Anak", sublabel: "Family option", withChevron: field.withChevron },
              { label: field.label, value: "2 Dewasa, 2 Anak", sublabel: "Family saver", withChevron: field.withChevron },
              { label: field.label, value: "3 Dewasa", sublabel: "Group light", withChevron: field.withChevron },
              { label: field.label, value: "4 Dewasa", sublabel: "Small group", withChevron: field.withChevron },
            ]
  } else if (label.includes("kategori")) {
    choices =
      activeTab === "activity"
        ? [
            ...current,
            { label: field.label, value: "Taman Hiburan", sublabel: "Paling populer", withChevron: field.withChevron },
            { label: field.label, value: "Atraksi Keluarga", sublabel: "Family friendly", withChevron: field.withChevron },
            { label: field.label, value: "Live entertainment", sublabel: "Limited seats", withChevron: field.withChevron },
            { label: field.label, value: "Museum & budaya", sublabel: "Cultural experience", withChevron: field.withChevron },
            { label: field.label, value: "Outdoor adventure", sublabel: "Aktivitas luar ruang", withChevron: field.withChevron },
            { label: field.label, value: "VIP access", sublabel: "Premium entry", withChevron: field.withChevron },
          ]
        : current
  } else if (label.includes("jenis")) {
    choices =
      activeTab === "activity"
        ? [
            ...current,
            { label: field.label, value: "Private tour", sublabel: "Guide included", withChevron: field.withChevron },
            { label: field.label, value: "Open trip", sublabel: "Join grup harian", withChevron: field.withChevron },
            { label: field.label, value: "Day tour", sublabel: "Half / full day", withChevron: field.withChevron },
            { label: field.label, value: "Night tour", sublabel: "Evening experience", withChevron: field.withChevron },
            { label: field.label, value: "Adventure tour", sublabel: "Outdoor route", withChevron: field.withChevron },
          ]
        : current
  } else if (label.includes("durasi")) {
    choices =
      activeTab === "package"
        ? [
            ...current,
            { label: field.label, value: "1-3 Hari", sublabel: "Durasi singkat", withChevron: field.withChevron },
            { label: field.label, value: "4-7 Hari", sublabel: "Durasi menengah", withChevron: field.withChevron },
            { label: field.label, value: "8+ Hari", sublabel: "Perjalanan panjang", withChevron: field.withChevron },
          ]
        : [
            ...current,
            { label: field.label, value: "2 Hari 1 Malam", sublabel: "Trip singkat", withChevron: field.withChevron },
            { label: field.label, value: "3 Hari 2 Malam", sublabel: "Pilihan utama", withChevron: field.withChevron },
            { label: field.label, value: "4 Hari 3 Malam", sublabel: "Paket favorit", withChevron: field.withChevron },
            { label: field.label, value: "5 Hari 4 Malam", sublabel: "Lebih lengkap", withChevron: field.withChevron },
            { label: field.label, value: "6 Hari 5 Malam", sublabel: "Long stay", withChevron: field.withChevron },
            { label: field.label, value: "7 Hari 6 Malam", sublabel: "Eksplor lengkap", withChevron: field.withChevron },
          ]
  }

  return dedupeFieldChoices(choices, field)
}

function inferOptionGroup(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if (isOriginLabel(normalized) || isDestinationLabel(normalized)) {
    if (activeTab === "flight") {
      const city = extractFlightCity(choice.value)
      if (city) return getFlightRegionLabel(city)
      return "Bandara Internasional"
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
  if (normalized.includes("cabin")) return "Pilihan Cabin"
  if (normalized.includes("berangkat") || normalized.includes("pergi") || normalized.includes("check-in") || normalized.includes("tanggal") || normalized.includes("kunjungan") || normalized.includes("keberangkatan")) return "Tanggal Rekomendasi"
  if (normalized.includes("pulang") || normalized.includes("check-out")) return "Tanggal Pulang"
  if (normalized.includes("jam")) return "Pilihan Jam"
  if (normalized.includes("tamu")) return "Kombinasi Tamu"
  if (normalized.includes("tiket")) return "Pilihan Tiket"
  if (normalized.includes("peserta")) return "Jumlah Peserta"
  if (normalized.includes("penumpang")) return "Kombinasi Penumpang"
  if (normalized.includes("kategori") || normalized.includes("jenis")) return "Kategori Favorit"
  if (normalized.includes("durasi")) return "Durasi Favorit"

  return "Pilihan Lainnya"
}

function formatOptionPrimaryLabel(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if ((isOriginLabel(normalized) || isDestinationLabel(normalized)) && activeTab === "flight") {
    const code = extractFlightCode(choice.value)
    if (code) return code
    return extractFlightCity(choice.value)
  }

  return choice.value ?? ""
}

function formatOptionSecondaryLabel(activeTab: HeroTabKey, field: HeroSearchFieldData, choice: HeroSearchFieldData) {
  const normalized = field.label.toLowerCase()

  if ((isOriginLabel(normalized) || isDestinationLabel(normalized)) && activeTab === "flight") {
    return choice.sublabel ?? ""
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

function getFlightRegionLabel(city: string) {
  const normalized = city.trim().toLowerCase()

  if (["jakarta", "denpasar", "surabaya", "yogyakarta", "medan", "makassar", "balikpapan"].includes(normalized)) {
    return "Indonesia"
  }

  if (
    [
      "singapore",
      "kuala lumpur",
      "bangkok",
      "phuket",
      "chiang mai",
      "ho chi minh city",
      "hanoi",
      "da nang",
      "manila",
      "cebu",
    ].includes(normalized)
  ) {
    return "Asia Tenggara"
  }

  if (
    [
      "hong kong",
      "taipei",
      "kaohsiung",
      "shanghai",
      "beijing",
      "guangzhou",
      "shenzhen",
      "chengdu",
      "xi'an",
      "tokyo",
      "osaka",
      "nagoya",
      "fukuoka",
      "sapporo",
      "seoul",
      "busan",
      "jeju",
    ].includes(normalized)
  ) {
    return "Asia Timur"
  }

  if (["new delhi", "mumbai", "bengaluru", "chennai"].includes(normalized)) {
    return "Asia Selatan"
  }

  if (["doha", "dubai", "abu dhabi", "jeddah", "riyadh"].includes(normalized)) {
    return "Timur Tengah"
  }

  if (["sydney", "melbourne", "brisbane", "perth", "auckland"].includes(normalized)) {
    return "Australia & Selandia Baru"
  }

  if (["london", "paris", "frankfurt", "amsterdam", "istanbul"].includes(normalized)) {
    return "Eropa"
  }

  if (["new york", "los angeles", "san francisco"].includes(normalized)) {
    return "Amerika"
  }

  return "Bandara Internasional"
}

function dedupeFieldChoices(choices: HeroSearchFieldData[], baseField: HeroSearchFieldData) {
  const normalizedLabel = baseField.label.toLowerCase()
  const isFlightAirportField =
    isOriginLabel(normalizedLabel) ||
    isDestinationLabel(normalizedLabel)

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

function localizeHeroFieldValue(value: string, locale: Locale) {
  if (!value) return value

  if (value === "1 Dewasa") {
    if (locale === "en") return "1 Adult"
    if (locale === "zh") return "1位成人"
  }

  if (value === "2 Dewasa") {
    if (locale === "en") return "2 Adults"
    if (locale === "zh") return "2位成人"
  }

  if (value === "4 Penumpang") {
    if (locale === "en") return "4 Passengers"
    if (locale === "zh") return "4位乘客"
  }

  const localizedDate = localizeDateLabel(value, locale)
  return translateHeroText(localizedDate, locale)
}

function localizeHeroText(value: string, locale: Locale) {
  if (!value) return value
  return translateHeroText(localizeDateLabel(value, locale), locale)
}

function localizeDateLabel(value: string, locale: Locale) {
  if (locale === "id" || !value) return value

  const dateMatch = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (dateMatch) {
    const [, dayRaw, monthLabel, yearRaw] = dateMatch
    const monthIndex = monthNameToIndex(monthLabel)
    if (monthIndex !== null) {
      const date = new Date(Number(yearRaw), monthIndex, Number(dayRaw))
      return formatDateForLocale(date, locale)
    }
  }

  return translateHeroText(value, locale)
}

function monthNameToIndex(monthLabel: string) {
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

  return monthMap[monthLabel] ?? null
}

function formatDateForLocale(date: Date, locale: Locale) {
  const monthLabels = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  }

  if (locale === "en") {
    return `${date.getDate()} ${monthLabels.en[date.getMonth()]} ${date.getFullYear()}`
  }

  return `${date.getFullYear()}年${monthLabels.zh[date.getMonth()]}${date.getDate()}日`
}

function translateHeroText(value: string, locale: Locale) {
  if (locale === "id" || !value) return value

  const exactMap = getHeroExactTextMap(locale)
  if (exactMap[value]) return exactMap[value]

  let nextValue = value

  Object.entries(getHeroReplacementMap(locale)).forEach(([source, target]) => {
    nextValue = nextValue.replaceAll(source, target)
  })

  return nextValue
}

function getHeroExactTextMap(locale: Locale): Record<string, string> {
  if (locale === "en") {
    return {
      Dari: "From",
      Ke: "To",
      Asal: "Origin",
      Tujuan: "Destination",
      Berangkat: "Departure",
      Pulang: "Return",
      "Tanggal Pergi": "Departure Date",
      Tanggal: "Date",
      Jam: "Time",
      Penumpang: "Passengers",
      Peserta: "Participants",
      "Kota Asal": "Origin City",
      Transit: "Transit",
      "Kota Tujuan": "Destination City",
      Rute: "Route",
      Destinasi: "Destination",
      "Check-in": "Check-in",
      "Check-out": "Check-out",
      "Tamu & Kamar": "Guests & Rooms",
      Tamu: "Guests",
      "Area Villa": "Villa Area",
      "Destinasi Resort": "Resort Destination",
      "Stasiun Asal": "Origin Station",
      "Stasiun Tujuan": "Destination Station",
      "Pelabuhan Asal": "Origin Port",
      "Pelabuhan Tujuan": "Destination Port",
      "Rute Cruise": "Cruise Route",
      Cabin: "Cabin",
      Keberangkatan: "Departure Date",
      "Jenis Cabin": "Cabin Type",
      "Kategori Aktivitas": "Activity Category",
      "Jenis Aktivitas": "Activity Type",
      Kategori: "Category",
      Kunjungan: "Visit Date",
      Tiket: "Tickets",
      Tur: "Tour",
      Atraksi: "Attractions",
      Event: "Event",
      Hotel: "Hotel",
      Villa: "Villa",
      Resort: "Resort",
      "Travel Style": "Travel Style",
      "Kereta Cepat": "High-Speed Rail",
      "Sleeper Bus": "Sleeper Bus",
      "Ferry Cepat": "Fast Ferry",
      "Regular Cruise": "Regular Cruise",
      "Luxury Cruise": "Luxury Cruise",
      "Family Cruise": "Family Cruise",
      "Jumlah Tiket": "Tickets",
      "Tujuan / Destinasi": "Destination",
      Durasi: "Duration",
      "Tipe Paket": "Package Type",
      "Pilihan bandara populer": "Popular airport picks",
      "Destinasi populer": "Popular destinations",
      "Pilihan populer": "Popular picks",
      "Pilihan penumpang": "Passenger options",
      "Pilihan durasi": "Duration options",
      "Pilihan tersedia": "Available options",
      "Bandara Internasional": "International Airports",
      Indonesia: "Indonesia",
      "Asia Tenggara": "Southeast Asia",
      "Asia Timur": "East Asia",
      "Asia Selatan": "South Asia",
      "Timur Tengah": "Middle East",
      "Australia & Selandia Baru": "Australia & New Zealand",
      Eropa: "Europe",
      Amerika: "Americas",
      "Kota & Stasiun Populer": "Popular Cities & Stations",
      "Pelabuhan Populer": "Popular Ports",
      "Atraksi & Tur Terpopuler": "Popular Attractions & Tours",
      "Paket Favorit": "Favorite Packages",
      "Destinasi Populer": "Popular Destinations",
      "Transit Rekomendasi": "Recommended Transit",
      "Pilihan Cabin": "Cabin Choices",
      "Tanggal Rekomendasi": "Recommended Dates",
      "Tanggal Pulang": "Return Dates",
      "Pilihan Jam": "Time Options",
      "Kombinasi Tamu": "Guest Combinations",
      "Pilihan Tiket": "Ticket Choices",
      "Jumlah Peserta": "Participant Count",
      "Kombinasi Penumpang": "Passenger Combinations",
      "Kategori Favorit": "Favorite Categories",
      "Durasi Favorit": "Favorite Durations",
      "Pilihan Lainnya": "Other Options",
      "Semua Bandara": "All Airports",
      "Pilihan berikutnya": "Next recommendation",
      "Durasi fleksibel": "Flexible duration",
      "Durasi lebih lama": "Longer duration",
      "Family Cabin": "Family Cabin",
      "Family stay": "Family stay",
      "Family package": "Family package",
      Family: "Family",
      "Liburan keluarga": "Family getaway",
      "Join trip schedule": "Join scheduled trip",
      "Paling populer": "Most popular",
      "Family saver": "Family saver",
      "Family option": "Family option",
      "Family cruise": "Family cruise",
      "Family friendly": "Family friendly",
      "Cultural experience": "Cultural experience",
      "Aktivitas luar ruang": "Outdoor activity",
      "Guide included": "Guide included",
      "Join grup harian": "Join daily group",
      "Half / full day": "Half / full day",
      "Evening experience": "Evening experience",
      "Outdoor route": "Outdoor route",
      "Durasi singkat": "Short duration",
      "Durasi menengah": "Medium duration",
      "Perjalanan panjang": "Long journey",
      "Trip singkat": "Short trip",
      "Pilihan utama": "Top pick",
      "Paket favorit": "Favorite package",
      "Lebih lengkap": "More complete",
      "Eksplor lengkap": "Full exploration",
      "Katalog negara tujuan": "Destination country catalog",
      "Korea Selatan": "South Korea",
      "Arab Saudi": "Saudi Arabia",
      Jepang: "Japan",
      Singapura: "Singapore",
      "Taman Hiburan": "Theme Park",
      "Atraksi Keluarga": "Family Attraction",
      "Museum & budaya": "Museum & Culture",
      "Open trip": "Open Trip",
      "Private tour": "Private Tour",
      "Day tour": "Day Tour",
      "Night tour": "Night Tour",
      "Adventure tour": "Adventure Tour",
      "1-3 Hari": "1-3 Days",
      "4-7 Hari": "4-7 Days",
      "8+ Hari": "8+ Days",
      "2 Hari 1 Malam": "2 Days 1 Night",
      "3 Hari 2 Malam": "3 Days 2 Nights",
      "4 Hari 3 Malam": "4 Days 3 Nights",
      "5 Hari 4 Malam": "5 Days 4 Nights",
      "6 Hari 5 Malam": "6 Days 5 Nights",
      "7 Hari 6 Malam": "7 Days 6 Nights",
      Bali: "Bali",
      Jakarta: "Jakarta",
      "Jawa Barat": "West Java",
      "Jawa Tengah": "Central Java",
      "Jawa Timur": "East Java",
      "Nusa Tenggara Timur": "East Nusa Tenggara",
      "Kelas Kabin": "Cabin Class",
      Ekonomi: "Economy",
      "Premium Economy": "Premium Economy",
      Premium: "Premium",
      "1 Dewasa, Ekonomi": "1 Adult, Economy",
      "1 Dewasa": "1 Adult",
      "2 Dewasa": "2 Adults",
      "2 Tamu": "2 Guests",
      "1 Kamar": "1 Room",
      "2 Tamu, 1 Kamar": "2 Guests, 1 Room",
      "4 Tamu": "4 Guests",
      "4 Tamu, 2 Kamar": "4 Guests, 2 Rooms",
      "2 Kamar": "2 Rooms",
      "Private pool": "Private pool",
      "Ocean view": "Ocean view",
      "Soekarno Hatta": "Soekarno Hatta",
      "Ngurah Rai": "Ngurah Rai",
    }
  }

  return {
    Dari: "出发地",
    Ke: "目的地",
    Asal: "出发",
    Tujuan: "到达",
    Berangkat: "出发日期",
    Pulang: "返回日期",
    "Tanggal Pergi": "出发日期",
    Tanggal: "日期",
    Jam: "时间",
    Penumpang: "乘客",
    Peserta: "参与者",
    "Kota Asal": "出发城市",
    Transit: "中转",
    "Kota Tujuan": "到达城市",
    Rute: "路线",
    Destinasi: "目的地",
    "Check-in": "入住",
    "Check-out": "退房",
    "Tamu & Kamar": "住客与房间",
    Tamu: "住客",
    "Area Villa": "别墅区域",
    "Destinasi Resort": "度假村目的地",
    "Stasiun Asal": "出发车站",
    "Stasiun Tujuan": "到达车站",
    "Pelabuhan Asal": "出发港口",
    "Pelabuhan Tujuan": "到达港口",
    "Rute Cruise": "邮轮航线",
    Cabin: "舱房",
    Keberangkatan: "出发日期",
    "Jenis Cabin": "舱房类型",
    "Kategori Aktivitas": "活动分类",
    "Jenis Aktivitas": "活动类型",
    Kategori: "分类",
    Kunjungan: "参观日期",
    Tiket: "门票",
    Tur: "行程",
    Atraksi: "景点",
    Event: "活动",
    Hotel: "酒店",
    Villa: "别墅",
    Resort: "度假村",
    "Travel Style": "旅行风格",
    "Kereta Cepat": "高铁",
    "Sleeper Bus": "卧铺巴士",
    "Ferry Cepat": "快速渡轮",
    "Regular Cruise": "标准邮轮",
    "Luxury Cruise": "豪华邮轮",
    "Family Cruise": "家庭邮轮",
    "Jumlah Tiket": "门票数量",
    "Tujuan / Destinasi": "目的地",
    Durasi: "时长",
    "Tipe Paket": "套餐类型",
    "Pilihan bandara populer": "热门机场选择",
    "Destinasi populer": "热门目的地",
    "Pilihan populer": "热门选择",
    "Pilihan penumpang": "乘客选项",
    "Pilihan durasi": "时长选项",
    "Pilihan tersedia": "可用选项",
    "Bandara Internasional": "国际机场",
    Indonesia: "印度尼西亚",
    "Asia Tenggara": "东南亚",
    "Asia Timur": "东亚",
    "Asia Selatan": "南亚",
    "Timur Tengah": "中东",
    "Australia & Selandia Baru": "澳大利亚与新西兰",
    Eropa: "欧洲",
    Amerika: "美洲",
    "Kota & Stasiun Populer": "热门城市与车站",
    "Pelabuhan Populer": "热门港口",
    "Atraksi & Tur Terpopuler": "热门景点与行程",
    "Paket Favorit": "精选套餐",
    "Destinasi Populer": "热门目的地",
    "Transit Rekomendasi": "推荐中转",
    "Pilihan Cabin": "舱房选择",
    "Tanggal Rekomendasi": "推荐日期",
    "Tanggal Pulang": "返回日期",
    "Pilihan Jam": "时间选项",
    "Kombinasi Tamu": "住客组合",
    "Pilihan Tiket": "门票选择",
    "Jumlah Peserta": "参与人数",
    "Kombinasi Penumpang": "乘客组合",
    "Kategori Favorit": "热门分类",
    "Durasi Favorit": "热门时长",
    "Pilihan Lainnya": "其他选项",
    "Semua Bandara": "全部机场",
    "Katalog negara tujuan": "目的地国家目录",
    "Pilihan berikutnya": "下一个推荐",
    "Durasi fleksibel": "灵活时长",
    "Durasi lebih lama": "更长时长",
    Malam: "晚间",
    "Family Cabin": "家庭舱房",
    "Family stay": "家庭入住",
    "Family package": "家庭套餐",
    Family: "家庭",
    "Liburan keluarga": "家庭度假",
    "Join trip schedule": "加入固定行程",
    "Paling populer": "最受欢迎",
    "Family saver": "家庭优惠",
    "Family option": "家庭选项",
    "Family cruise": "家庭邮轮",
    "Family friendly": "适合家庭",
    "Cultural experience": "文化体验",
    "Aktivitas luar ruang": "户外活动",
    "Guide included": "含导游",
    "Join grup harian": "加入每日拼团",
    "Half / full day": "半日或全天",
    "Evening experience": "夜间体验",
    "Outdoor route": "户外路线",
    "Durasi singkat": "短时长",
    "Durasi menengah": "中等时长",
    "Perjalanan panjang": "长途行程",
    "Trip singkat": "短途行程",
    "Pilihan utama": "首选推荐",
    "Paket favorit": "热门套餐",
    "Lebih lengkap": "更完整",
    "Eksplor lengkap": "深度探索",
    "Korea Selatan": "韩国",
    "Arab Saudi": "沙特阿拉伯",
    Jepang: "日本",
    Singapura: "新加坡",
    "Taman Hiburan": "主题乐园",
    "Atraksi Keluarga": "家庭景点",
    "Museum & budaya": "博物馆与文化",
    "Open trip": "拼团行程",
    "Private tour": "私人行程",
    "Day tour": "一日游",
    "Night tour": "夜游",
    "Adventure tour": "探险行程",
    "1-3 Hari": "1-3天",
    "4-7 Hari": "4-7天",
    "8+ Hari": "8天以上",
    "2 Hari 1 Malam": "2天1晚",
    "3 Hari 2 Malam": "3天2晚",
    "4 Hari 3 Malam": "4天3晚",
    "5 Hari 4 Malam": "5天4晚",
    "6 Hari 5 Malam": "6天5晚",
    "7 Hari 6 Malam": "7天6晚",
    Bali: "巴厘岛",
    Jakarta: "雅加达",
    "Jawa Barat": "西爪哇",
    "Jawa Tengah": "中爪哇",
    "Jawa Timur": "东爪哇",
    "Nusa Tenggara Timur": "东努沙登加拉",
    "Kelas Kabin": "舱位等级",
    Ekonomi: "经济舱",
    "Premium Economy": "超级经济舱",
    Premium: "高级",
    "1 Dewasa, Ekonomi": "1位成人，经济舱",
    "1 Dewasa": "1位成人",
    "2 Dewasa": "2位成人",
    "2 Tamu": "2位住客",
    "1 Kamar": "1间房",
    "2 Tamu, 1 Kamar": "2位住客，1间房",
    "4 Tamu": "4位住客",
    "4 Tamu, 2 Kamar": "4位住客，2间房",
    "2 Kamar": "2间房",
    "Private pool": "私人泳池",
    "Ocean view": "海景",
    "Soekarno Hatta": "苏加诺哈达",
    "Ngurah Rai": "伍拉赖",
  }
}

function getHeroReplacementMap(locale: Locale): Record<string, string> {
  if (locale === "en") {
    return {
      Minggu: "Sunday",
      Senin: "Monday",
      Selasa: "Tuesday",
      Rabu: "Wednesday",
      Kamis: "Thursday",
      Jumat: "Friday",
      Sabtu: "Saturday",
      Januari: "January",
      Februari: "February",
      Maret: "March",
      April: "April",
      Mei: "May",
      Juni: "June",
      Juli: "July",
      Agustus: "August",
      September: "September",
      Oktober: "October",
      November: "November",
      Desember: "December",
      Penumpang: "Passengers",
      Dewasa: "Adults",
      Anak: "Children",
      Orang: "People",
      Tamu: "Guests",
      Kamar: "Rooms",
      Hari: "Days",
      Malam: "Nights",
      Pagi: "Morning",
      Siang: "Afternoon",
      Sore: "Evening",
      Singkat: "Short",
      Menengah: "Medium",
      Panjang: "Long",
      "Kereta Cepat": "High-Speed Rail",
      "Ferry Cepat": "Fast Ferry",
      Tur: "Tours",
      Atraksi: "Attractions",
      Event: "Event",
      Kategori: "Category",
      Kunjungan: "Visit Date",
      Tiket: "Tickets",
    }
  }

  return {
    Minggu: "周日",
    Senin: "周一",
    Selasa: "周二",
    Rabu: "周三",
    Kamis: "周四",
    Jumat: "周五",
    Sabtu: "周六",
    Januari: "1月",
    Februari: "2月",
    Maret: "3月",
    April: "4月",
    Mei: "5月",
    Juni: "6月",
    Juli: "7月",
    Agustus: "8月",
    September: "9月",
    Oktober: "10月",
    November: "11月",
    Desember: "12月",
    Penumpang: "乘客",
    Dewasa: "成人",
    Anak: "儿童",
    Orang: "人",
    Tamu: "住客",
    Kamar: "房间",
    Hari: "天",
    Malam: "晚",
    Pagi: "早上",
    Siang: "中午",
    Sore: "傍晚",
    Singkat: "短途",
    Menengah: "中程",
    Panjang: "长途",
  }
}

function buildFlightAirportChoices(label: string): HeroSearchFieldData[] {
  return flightAirportMaster.map((airport) => ({
    label,
    value: `${airport.code}   ${airport.city}`,
    sublabel: airport.name,
  }))
}

function buildTrainStationChoices(label: string): HeroSearchFieldData[] {
  return trainStationMaster.map((station) => ({
    label,
    value: station.name,
    sublabel: `${station.city}${station.detail ? ` • ${station.detail}` : ""}`,
  }))
}

function buildShipPortChoices(label: string): HeroSearchFieldData[] {
  return shipPortMaster.map((port) => ({
    label,
    value: port.name,
    sublabel: `${port.city}${port.detail ? ` • ${port.detail}` : ""}`,
  }))
}

const flightAirportMaster: Array<{ code: string; city: string; name: string }> = [
  { code: "CGK", city: "Jakarta", name: "Soekarno Hatta International" },
  { code: "HLP", city: "Jakarta", name: "Halim Perdanakusuma" },
  { code: "DPS", city: "Denpasar", name: "Ngurah Rai International" },
  { code: "SIN", city: "Singapore", name: "Changi Airport" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport" },
  { code: "DMK", city: "Bangkok", name: "Don Mueang International" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong International" },
  { code: "HND", city: "Tokyo", name: "Haneda Airport" },
  { code: "NRT", city: "Tokyo", name: "Narita International" },
  { code: "ICN", city: "Seoul", name: "Incheon International" },
  { code: "PVG", city: "Shanghai", name: "Pudong International" },
  { code: "SHA", city: "Shanghai", name: "Hongqiao International" },
  { code: "PEK", city: "Beijing", name: "Capital International" },
  { code: "PKX", city: "Beijing", name: "Daxing International" },
  { code: "DXB", city: "Dubai", name: "Dubai International" },
  { code: "DOH", city: "Doha", name: "Hamad International" },
  { code: "SYD", city: "Sydney", name: "Kingsford Smith Airport" },
  { code: "MEL", city: "Melbourne", name: "Tullamarine Airport" },
  { code: "LHR", city: "London", name: "Heathrow Airport" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle Airport" },
  { code: "JFK", city: "New York", name: "John F. Kennedy International" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles International" },
  { code: "SFO", city: "San Francisco", name: "San Francisco International" },
  { code: "SUB", city: "Surabaya", name: "Juanda International" },
  { code: "YIA", city: "Yogyakarta", name: "Yogyakarta International" },
  { code: "KNO", city: "Medan", name: "Kualanamu International" },
  { code: "UPG", city: "Makassar", name: "Sultan Hasanuddin International" },
  { code: "BPN", city: "Balikpapan", name: "Sultan Aji Muhammad Sulaiman" },
  { code: "TPE", city: "Taipei", name: "Taoyuan International" },
  { code: "KHH", city: "Kaohsiung", name: "Kaohsiung International" },
  { code: "CAN", city: "Guangzhou", name: "Baiyun International" },
  { code: "SZX", city: "Shenzhen", name: "Bao'an International" },
  { code: "CTU", city: "Chengdu", name: "Tianfu International" },
  { code: "XIY", city: "Xi'an", name: "Xianyang International" },
  { code: "KIX", city: "Osaka", name: "Kansai International" },
  { code: "ITM", city: "Osaka", name: "Itami Airport" },
  { code: "NGO", city: "Nagoya", name: "Chubu Centrair International" },
  { code: "FUK", city: "Fukuoka", name: "Fukuoka Airport" },
  { code: "CTS", city: "Sapporo", name: "New Chitose Airport" },
  { code: "GMP", city: "Seoul", name: "Gimpo International" },
  { code: "PUS", city: "Busan", name: "Gimhae International" },
  { code: "CJU", city: "Jeju", name: "Jeju International" },
  { code: "HKT", city: "Phuket", name: "Phuket International" },
  { code: "CNX", city: "Chiang Mai", name: "Chiang Mai International" },
  { code: "SGN", city: "Ho Chi Minh City", name: "Tan Son Nhat International" },
  { code: "HAN", city: "Hanoi", name: "Noi Bai International" },
  { code: "DAD", city: "Da Nang", name: "Da Nang International" },
  { code: "MNL", city: "Manila", name: "Ninoy Aquino International" },
  { code: "CEB", city: "Cebu", name: "Mactan Cebu International" },
  { code: "DEL", city: "New Delhi", name: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda International" },
  { code: "MAA", city: "Chennai", name: "Chennai International" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed International" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz International" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International" },
  { code: "BNE", city: "Brisbane", name: "Brisbane Airport" },
  { code: "PER", city: "Perth", name: "Perth Airport" },
  { code: "AKL", city: "Auckland", name: "Auckland Airport" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt Airport" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol Airport" },
  { code: "IST", city: "Istanbul", name: "Istanbul Airport" },
]

const trainStationMaster: Array<{ name: string; city: string; detail?: string }> = [
  { name: "Gambir", city: "Jakarta", detail: "Stasiun pusat" },
  { name: "Pasar Senen", city: "Jakarta", detail: "Keberangkatan antarkota" },
  { name: "Bekasi", city: "Bekasi", detail: "Jawa Barat" },
  { name: "Bandung", city: "Bandung", detail: "Hall Station" },
  { name: "Kiaracondong", city: "Bandung", detail: "Jawa Barat" },
  { name: "Tegal", city: "Tegal", detail: "Jawa Tengah" },
  { name: "Cirebon", city: "Cirebon", detail: "Kejaksan" },
  { name: "Purwokerto", city: "Banyumas", detail: "Jawa Tengah" },
  { name: "Yogyakarta", city: "Yogyakarta", detail: "Tugu Station" },
  { name: "Lempuyangan", city: "Yogyakarta", detail: "Jawa Tengah & DIY" },
  { name: "Solo Balapan", city: "Solo", detail: "Jawa Tengah" },
  { name: "Semarang Tawang", city: "Semarang", detail: "Jawa Tengah" },
  { name: "Semarang Poncol", city: "Semarang", detail: "Jawa Tengah" },
  { name: "Madiun", city: "Madiun", detail: "Jawa Timur" },
  { name: "Surabaya Gubeng", city: "Surabaya", detail: "Jawa Timur" },
  { name: "Surabaya Pasar Turi", city: "Surabaya", detail: "Jawa Timur" },
  { name: "Malang", city: "Malang", detail: "Kota Baru" },
  { name: "Jember", city: "Jember", detail: "Jawa Timur" },
  { name: "Banyuwangi Kota", city: "Banyuwangi", detail: "Jawa Timur" },
  { name: "Ketapang", city: "Banyuwangi", detail: "Akses pelabuhan" },
  { name: "Halim", city: "Jakarta", detail: "Whoosh" },
  { name: "Karawang", city: "Karawang", detail: "Whoosh" },
  { name: "Padalarang", city: "Bandung", detail: "Whoosh" },
  { name: "Tegalluar", city: "Bandung", detail: "Whoosh" },
]

const shipPortMaster: Array<{ name: string; city: string; detail?: string }> = [
  { name: "Merak", city: "Banten", detail: "Rute Lampung" },
  { name: "Bakauheni", city: "Lampung", detail: "Rute Banten" },
  { name: "Ketapang", city: "Banyuwangi", detail: "Rute Bali" },
  { name: "Gilimanuk", city: "Bali", detail: "Rute Jawa" },
  { name: "Padang Bai", city: "Karangasem", detail: "Bali" },
  { name: "Lembar", city: "Lombok Barat", detail: "Nusa Tenggara Barat" },
  { name: "Sanur", city: "Denpasar", detail: "Bali" },
  { name: "Banjar Nyuh", city: "Nusa Penida", detail: "Bali" },
  { name: "Gili Trawangan", city: "Lombok Utara", detail: "NTB" },
  { name: "Senggigi", city: "Lombok Barat", detail: "NTB" },
  { name: "Tanjung Perak", city: "Surabaya", detail: "Jawa Timur" },
  { name: "Tanjung Priok", city: "Jakarta", detail: "DKI Jakarta" },
  { name: "Batam Center", city: "Batam", detail: "Kepulauan Riau" },
  { name: "Sekupang", city: "Batam", detail: "Kepulauan Riau" },
  { name: "HarbourFront", city: "Singapore", detail: "Rute Batam/Bintan" },
  { name: "Telaga Punggur", city: "Batam", detail: "Kepulauan Riau" },
  { name: "Tanjung Pinang", city: "Bintan", detail: "Kepulauan Riau" },
  { name: "Marina Labuan Bajo", city: "Labuan Bajo", detail: "Nusa Tenggara Timur" },
  { name: "Sape", city: "Bima", detail: "Nusa Tenggara Barat" },
  { name: "Kayangan", city: "Lombok Timur", detail: "Nusa Tenggara Barat" },
]
