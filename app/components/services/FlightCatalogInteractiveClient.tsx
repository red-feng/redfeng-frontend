"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Fragment, type ReactNode } from "react"
import {
  SearchIcon,
} from "@/app/components/flights/FlightSearchShared"
import { buildFlightCatalogQuery, normalizeFlightLocationLabel, type FlightTripMode } from "@/app/components/flights/flightSearchParams"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { SwapIcon } from "@/app/components/home/shared/homeContent"
import { buildFormFields, updateFieldState } from "@/app/components/home/web/WebHomeHeroSection"
import HeroSearchField from "@/app/components/home/web/hero/HeroSearchField"
import type { HeroPassengerState, HeroSearchFieldData } from "@/app/components/home/web/hero/heroSearchContent"
import type { Locale } from "@/lib/i18n"
import { formatPackageMoney, localeCurrencyMap, roundConvertedPrice } from "@/lib/package-pricing"

type FilterSectionKey = "region" | "group" | "airline" | "departWindow" | "transit" | "price"
type RecommendationPanelMode = "calendar" | "price_table"

type FlightFact = {
  label: string
  value: string
}

type FlightMeta = {
  airline: string
  departure: string
  arrival: string
  duration: string
  transit: string
  price: string
  seatNote: string
  origin: string
  destination: string
  routeCode: string
  cabin: string
  tripLabel: string
  highlightBadges: string[]
  maxPassengers: number
  tripSupport: FlightTripMode[]
  availableDates: string[]
}

type FlightItem = {
  id: string
  title: string
  location: string
  region: string
  group: string
  image: string
  availabilityNote: string
  statusNote: string
  highlights: string[]
  facts: FlightFact[]
  meta: FlightMeta
}

type FlightFilterState = {
  tripMode: FlightTripMode
  q: string
  region: string
  group: string
  from: string
  via: string
  to: string
  depart: string
  returnDate: string
  passengers: string
  cabin: string
  sort: string
  airlines: string[]
  departWindows: string[]
  transitTypes: string[]
  priceBands: string[]
}

type FlightCopy = {
  searchSummary: string
  topTitle: string
  topBody: string
  refineSearch: string
  roundTrip: string
  oneWay: string
  multiCity: string
  fromLabel: string
  viaLabel: string
  toLabel: string
  departLabel: string
  returnLabel: string
  passengerLabel: string
  passengerClassLabel: string
  cabinLabel: string
  allRegions: string
  allGroups: string
  allAirlines: string
  allDepartWindows: string
  allTransitTypes: string
  allPriceBands: string
  flightsFound: string
  sortLabel: string
  sortBest: string
  sortPrice: string
  sortEarly: string
  sortDepartLate: string
  sortArriveEarly: string
  sortArriveLate: string
  refundTag: string
  baggageTag: string
  activeFilters: string
  leftTitle: string
  leftBody: string
  regionBlock: string
  tripBlock: string
  airlineBlock: string
  departWindowBlock: string
  transitBlock: string
  priceBlock: string
  departMorning: string
  departAfternoon: string
  departEvening: string
  directOnly: string
  transitAllowed: string
  priceBudget: string
  priceMid: string
  pricePremium: string
  resetFilters: string
  priceLabel: string
  chooseLabel: string
  fareLabel: string
  supportHint: string
  emptyTitle: string
  emptyBody: string
}

type FlightMatchOptions = {
  skipDepartDate?: boolean
  skipReturnDate?: boolean
  skipFrom?: boolean
  skipTo?: boolean
}

type HeroFieldInputType = "text" | "date" | "select" | "autocomplete" | "passenger"

type CatalogHeroRenderedField = HeroSearchFieldData & {
  displayLabel?: string
  displayValue?: string
  displaySublabel?: string
  inputType: HeroFieldInputType
  options?: {
    label: string
    value: string
    sublabel?: string
    group?: string
    displayValue?: string
    displaySublabel?: string
    displayGroup?: string
  }[]
}

type PriceCalendarCell = {
  date: string
  day: number
  price: number | null
  isCurrentMonth: boolean
}

const FLIGHT_IDR_FALLBACK_RATES: Record<string, number> = {
  IDR: 1,
  USD: 1 / 16000,
  CNY: 1 / 2200,
}

const FLIGHT_HERO_STATE_KEY = "catalog-flight"
const FLIGHT_CABIN_OPTIONS = ["Ekonomi", "Premium Economy", "Business", "First Class"]
const INDONESIAN_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const INDONESIAN_WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const STICKY_SCROLL_ENTER_Y = 220
const STICKY_SCROLL_EXIT_Y = 140

function parseFlightPrice(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return Number(digits || "0")
}

function parseFlightTime(value: string) {
  const [hour, minute] = value.split(":").map((part) => Number(part || "0"))
  return hour * 60 + minute
}

function parseFlightDuration(value: string) {
  const hourMatch = value.match(/(\d+)\s*j/i)
  const minuteMatch = value.match(/(\d+)\s*m/i)
  const hours = hourMatch ? Number(hourMatch[1] || "0") : 0
  const minutes = minuteMatch ? Number(minuteMatch[1] || "0") : 0
  return hours * 60 + minutes
}

function matchesWindow(minutes: number, window: string) {
  if (window === "morning") return minutes < 720
  if (window === "afternoon") return minutes >= 720 && minutes < 1080
  if (window === "evening") return minutes >= 1080
  return true
}

function matchesPriceBand(price: number, band: string) {
  if (band === "budget") return price < 1500000
  if (band === "mid") return price >= 1500000 && price < 3000000
  if (band === "premium") return price >= 3000000
  return true
}

function normalizeFlightSearchTerm(value: string) {
  return value.toLowerCase().replace(/[()]/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeCabinTerm(value: string) {
  const normalized = normalizeFlightSearchTerm(value)
  if (!normalized) return normalized

  return normalized
    .replace(/\bpremium ekonomi\b/g, "premium economy")
    .replace(/\bekonomi premium\b/g, "premium economy")
    .replace(/\bekonomi\b/g, "economy")
    .replace(/\bbisnis\b/g, "business")
    .replace(/\bkelas satu\b/g, "first class")
}

function buildFlightMatchTokens(value: string) {
  return normalizeFlightSearchTerm(value)
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function matchesFlightField(query: string, ...candidates: string[]) {
  const tokens = buildFlightMatchTokens(query)
  if (tokens.length === 0) return true
  const haystack = normalizeFlightSearchTerm(candidates.filter(Boolean).join(" "))
  return tokens.every((token) => haystack.includes(token))
}

function matchesFlightTripMode(tripMode: FlightTripMode, item: FlightItem) {
  if (tripMode === "multi_city") {
    return item.meta.tripSupport.includes("multi_city")
  }
  return item.meta.tripSupport.includes(tripMode)
}

function parsePassengerCount(value: string) {
  const matches = value.match(/\d+/g)
  if (!matches) return 1
  return matches.reduce((total, current) => total + Number(current || "0"), 0) || 1
}

function matchesFlightDate(date: string, item: FlightItem) {
  if (!date.trim()) return true
  return item.meta.availableDates.includes(date)
}

function matchesFlightReturnDate(depart: string, returnDate: string, item: FlightItem) {
  if (!returnDate.trim()) return true
  if (!item.meta.availableDates.includes(returnDate)) return false
  if (!depart.trim()) return true
  return returnDate >= depart
}

function matchesFlightCabin(cabin: string, item: FlightItem) {
  if (!cabin.trim()) return true
  const queryTokens = normalizeCabinTerm(cabin)
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (queryTokens.length === 0) return true

  const haystack = normalizeCabinTerm(
    [item.meta.cabin, item.group, item.title, item.statusNote, item.availabilityNote, item.highlights.join(" ")].filter(Boolean).join(" "),
  )

  return queryTokens.every((token) => haystack.includes(token))
}

function matchesFlightVia(via: string, tripMode: FlightTripMode, item: FlightItem) {
  if (tripMode !== "multi_city") return true
  if (!via.trim()) return true
  return matchesFlightField(via, item.title, item.location, item.meta.transit, item.statusNote, item.availabilityNote, item.highlights.join(" "))
}

function matchesFlightItem(item: FlightItem, state: FlightFilterState, options: FlightMatchOptions = {}) {
  const keyword = state.q.trim().toLowerCase()
  const matchesKeyword =
    keyword.length === 0 ||
    item.title.toLowerCase().includes(keyword) ||
    item.location.toLowerCase().includes(keyword) ||
    item.highlights.some((highlight) => highlight.toLowerCase().includes(keyword))
  const matchesRegion = !state.region || item.region === state.region
  const matchesGroup = !state.group || item.group === state.group
  const matchesAirline = state.airlines.length === 0 || state.airlines.includes(item.meta.airline)
  const matchesDepartWindow =
    state.departWindows.length === 0 || state.departWindows.some((window) => matchesWindow(parseFlightTime(item.meta.departure), window))
  const isDirect =
    item.meta.transit.toLowerCase().includes("direct") ||
    item.meta.transit.toLowerCase().includes("langsung") ||
    item.meta.transit.includes("ç›´é£ž")
  const matchesTransit =
    state.transitTypes.length === 0 ||
    state.transitTypes.some((type) => (type === "direct" ? isDirect : !isDirect))
  const matchesPrice = state.priceBands.length === 0 || state.priceBands.some((band) => matchesPriceBand(parseFlightPrice(item.meta.price), band))
  const matchesFrom = options.skipFrom ? true : matchesFlightField(state.from, item.title, item.location, item.meta.origin, item.meta.routeCode)
  const matchesTo = options.skipTo ? true : matchesFlightField(state.to, item.title, item.location, item.meta.destination, item.meta.routeCode)
  const matchesVia = matchesFlightVia(state.via, state.tripMode, item)
  const matchesTripMode = matchesFlightTripMode(state.tripMode, item)
  const matchesDepartDate = options.skipDepartDate ? true : matchesFlightDate(state.depart, item)
  const matchesReturnDate = options.skipReturnDate || state.tripMode !== "round_trip" ? true : matchesFlightReturnDate(state.depart, state.returnDate, item)
  const matchesCabin = matchesFlightCabin(state.cabin, item)
  const requestedPassengers = parsePassengerCount(state.passengers)
  const matchesPassengers = requestedPassengers <= item.meta.maxPassengers

  return matchesKeyword && matchesRegion && matchesGroup && matchesAirline && matchesDepartWindow && matchesTransit && matchesPrice && matchesFrom && matchesTo && matchesVia && matchesTripMode && matchesDepartDate && matchesReturnDate && matchesCabin && matchesPassengers
}

function filterLinkClass(active: boolean) {
  return `flex items-center gap-3 rounded-[12px] border px-3 py-2.5 text-[13px] transition ${
    active
      ? "border-[#ffd8c6] bg-[#fff4ed] text-[#ef4423] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
      : "border-[#edf1f5] bg-white text-slate-600 hover:border-[#e3e8ef] hover:bg-slate-50 hover:text-slate-900"
  }`
}

function FilterCheck({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        active ? "border-[#ef5b2a] bg-[#ef5b2a] text-white" : "border-slate-300 bg-white text-transparent"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[2.2]">
        <path d="m3.5 8 2.5 2.5L12.5 4.5" />
      </svg>
    </span>
  )
}

function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-900">{title}</p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition ${
            open ? "bg-[#fff4ec] text-[#ef4423]" : "bg-white"
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 fill-none stroke-current stroke-[2] transition ${open ? "rotate-180" : ""}`}>
            <path d="M3.5 6.5 8 11l4.5-4.5" />
          </svg>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

function buildQuery(state: FlightFilterState) {
  const params = buildFlightCatalogQuery({
    tripMode: state.tripMode,
    from: state.from,
    via: state.via,
    to: state.to,
    depart: state.depart,
    returnDate: state.returnDate,
    passengers: state.passengers,
    cabin: state.cabin,
  })
  const setIfValue = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim())
  }

  setIfValue("q", state.q)
  setIfValue("region", state.region)
  setIfValue("group", state.group)
  setIfValue("sort", state.sort)
  state.airlines.forEach((value) => params.append("airline", value))
  state.departWindows.forEach((value) => params.append("depart_window", value))
  state.transitTypes.forEach((value) => params.append("transit_type", value))
  state.priceBands.forEach((value) => params.append("price_band", value))
  return params.toString()
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

function getCatalogFieldSemanticKey(label: string) {
  const normalized = label.toLowerCase()

  if (isOriginLabel(normalized)) return "origin"
  if (isDestinationLabel(normalized)) return "destination"
  if (normalized.includes("transit")) return "transit"
  if (normalized.includes("kabin") || normalized.includes("cabin")) return "cabin"
  if (normalized.includes("berangkat") || normalized.includes("pergi") || normalized.includes("keberangkatan")) return "departure"
  if (normalized.includes("pulang")) return "return"
  if (normalized.includes("penumpang")) return "passenger"

  return normalized.replace(/\s+/g, "_")
}

function getCatalogHeroFieldStateKey(label: string) {
  return `${FLIGHT_HERO_STATE_KEY}:${getCatalogFieldSemanticKey(label)}`
}

function parseHeroDisplayDateToIso(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  const match = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!match) return ""

  const [, dayPart, monthLabel, yearPart] = match
  const monthIndex = INDONESIAN_MONTHS.findIndex((month) => month.toLowerCase() === monthLabel.toLowerCase())
  if (monthIndex < 0) return ""

  const day = Number(dayPart)
  const year = Number(yearPart)
  if (!Number.isFinite(day) || !Number.isFinite(year)) return ""

  return `${year.toString().padStart(4, "0")}-${(monthIndex + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

function formatIsoToHeroDisplayDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ""

  const [, yearPart, monthPart, dayPart] = match
  const monthIndex = Number(monthPart) - 1
  if (monthIndex < 0 || monthIndex >= INDONESIAN_MONTHS.length) return ""

  return `${Number(dayPart)} ${INDONESIAN_MONTHS[monthIndex]} ${yearPart}`
}

function formatIsoToHeroWeekday(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ""

  const [, yearPart, monthPart, dayPart] = match
  const date = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart))
  return INDONESIAN_WEEKDAYS[date.getDay()] ?? ""
}

function extractPassengerCountByKeyword(value: string, keyword: string) {
  const match = value.toLowerCase().match(new RegExp(`(\\d+)\\s+${keyword}`))
  return match ? Number.parseInt(match[1], 10) : 0
}

function buildFallbackPassengerState(passengers: string, cabin: string): HeroPassengerState {
  return {
    adults: extractPassengerCountByKeyword(passengers, "dewasa") || 1,
    children: extractPassengerCountByKeyword(passengers, "anak"),
    infants: extractPassengerCountByKeyword(passengers, "bayi"),
    cabin: cabin.trim() || "Ekonomi",
  }
}

function formatLocationForHeroField(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim()
  const match = normalized.match(/^(.*)\(([A-Z]{3})\)$/)
  if (!match) return normalized

  const [, cityPart, codePart] = match
  return `${codePart}   ${cityPart.trim()}`
}

function normalizeLocationFromHeroField(value: string) {
  return normalizeFlightLocationLabel(value.replace(/\s+/g, " ").trim())
}

function buildCatalogHeroBaseFields(state: FlightFilterState): HeroSearchFieldData[] {
  const passengerState = buildFallbackPassengerState(state.passengers, state.cabin)
  const passengerValue = state.passengers.trim() || `${passengerState.adults} Dewasa`
  const cabinValue = state.cabin.trim() || passengerState.cabin
  const passengerField: HeroSearchFieldData = {
    label: "Penumpang",
    value: passengerValue,
    sublabel: cabinValue,
    withChevron: true,
    passengerState,
    cabinOptions: FLIGHT_CABIN_OPTIONS,
  }
  const cabinField: HeroSearchFieldData = {
    label: "Kelas Kabin",
    value: cabinValue,
    sublabel: "Pilihan kabin",
    withChevron: true,
    cabinOptions: FLIGHT_CABIN_OPTIONS,
  }

  if (state.tripMode === "multi_city") {
    return [
      { label: "Kota Asal", value: formatLocationForHeroField(state.from), sublabel: "" },
      { label: "Transit", value: formatLocationForHeroField(state.via), sublabel: "" },
      { label: "Kota Tujuan", value: formatLocationForHeroField(state.to), sublabel: "" },
      { label: "Berangkat", value: formatIsoToHeroDisplayDate(state.depart), sublabel: formatIsoToHeroWeekday(state.depart) },
      passengerField,
      cabinField,
    ]
  }

  const baseFields: HeroSearchFieldData[] = [
    { label: "Dari", value: formatLocationForHeroField(state.from), sublabel: "" },
    { label: "Ke", value: formatLocationForHeroField(state.to), sublabel: "" },
    { label: "Berangkat", value: formatIsoToHeroDisplayDate(state.depart), sublabel: formatIsoToHeroWeekday(state.depart) },
  ]

  if (state.tripMode === "round_trip") {
    baseFields.push({ label: "Pulang", value: formatIsoToHeroDisplayDate(state.returnDate), sublabel: formatIsoToHeroWeekday(state.returnDate) })
  }

  baseFields.push(passengerField, cabinField)
  return baseFields
}

function resolveCatalogHeroFields(baseFields: HeroSearchFieldData[], fieldStates: Record<string, HeroSearchFieldData>) {
  return baseFields.map((field) => fieldStates[getCatalogHeroFieldStateKey(field.label)] ?? field)
}

function applyCatalogHeroFieldsToDraft(current: FlightFilterState, fields: HeroSearchFieldData[]) {
  const getFieldValue = (semanticKey: string) => fields.find((field) => getCatalogFieldSemanticKey(field.label) === semanticKey)
  const passengerField = getFieldValue("passenger")
  const cabinField = getFieldValue("cabin")

  return {
    ...current,
    from: normalizeLocationFromHeroField(getFieldValue("origin")?.value || ""),
    via: current.tripMode === "multi_city" ? normalizeLocationFromHeroField(getFieldValue("transit")?.value || "") : "",
    to: normalizeLocationFromHeroField(getFieldValue("destination")?.value || ""),
    depart: parseHeroDisplayDateToIso(getFieldValue("departure")?.value || ""),
    returnDate: current.tripMode === "round_trip" ? parseHeroDisplayDateToIso(getFieldValue("return")?.value || "") : "",
    passengers: passengerField?.value || current.passengers,
    cabin: cabinField?.value || passengerField?.sublabel || current.cabin,
  }
}

function getCalendarReferenceValue(fields: CatalogHeroRenderedField[], field: CatalogHeroRenderedField) {
  const normalized = field.label.toLowerCase()
  if (!normalized.includes("pulang")) return undefined

  return fields.find((candidate) => candidate.label.toLowerCase().includes("berangkat"))?.value
}

function getCatalogGridClass(tripMode: FlightTripMode) {
  if (tripMode === "one_way") {
    return "xl:grid-cols-[1.12fr_44px_1.12fr_0.92fr_1fr_0.92fr_64px]"
  }

  if (tripMode === "multi_city") {
    return "xl:grid-cols-[1fr_1fr_1fr_0.9fr_1fr_0.92fr_64px]"
  }

  return "xl:grid-cols-[1.08fr_44px_1.08fr_0.86fr_0.86fr_0.95fr_0.92fr_64px]"
}

function formatCompactDateLabel(value: string, locale: Locale) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value

  const [, yearPart, monthPart, dayPart] = match
  const date = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart))
  const formatter = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  return formatter.format(date)
}

function convertFlightIdrAmount(value: number, locale: Locale, rates?: Record<string, number>) {
  if (!Number.isFinite(value) || value <= 0) return "-"

  const currency = localeCurrencyMap[locale]
  const rate = Number(rates?.[currency] || FLIGHT_IDR_FALLBACK_RATES[currency] || 1)
  const converted = currency === "IDR" ? roundConvertedPrice(value) : roundConvertedPrice(value * rate)

  return {
    amount: converted,
    currency,
  }
}

function formatCompactPrice(value: number, locale: Locale, rates?: Record<string, number>) {
  const converted = convertFlightIdrAmount(value, locale, rates)
  if (converted === "-") return converted

  return formatPackageMoney(converted.amount, converted.currency, locale)
}

function formatCompactPriceAmountOnly(value: number, locale: Locale, rates?: Record<string, number>) {
  const converted = convertFlightIdrAmount(value, locale, rates)
  if (converted === "-") return converted

  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale === "zh" ? "zh-CN" : "id-ID", {
    maximumFractionDigits: 0,
  }).format(converted.amount)
}

function getLocaleTag(locale: Locale) {
  if (locale === "id") return "id-ID"
  if (locale === "zh") return "zh-CN"
  return "en-US"
}

function parseIsoDateValue(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, yearPart, monthPart, dayPart] = match
  return new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart))
}

function formatCalendarMonthLabel(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(getLocaleTag(locale), { month: "long", year: "numeric" }).format(date)
}

function formatCalendarInputValue(value: string, locale: Locale) {
  const date = parseIsoDateValue(value)
  if (!date) return locale === "id" ? "Pilih tanggal" : locale === "zh" ? "选择日期" : "Select date"
  return new Intl.DateTimeFormat(getLocaleTag(locale), { day: "numeric", month: "short", year: "numeric" }).format(date)
}

function formatCalendarDayHeader(locale: Locale) {
  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: "short" })
  const baseSunday = new Date(2026, 5, 7)
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(baseSunday.getFullYear(), baseSunday.getMonth(), baseSunday.getDate() + index)))
}

function formatPriceTableAxisLabel(value: string, locale: Locale) {
  const date = parseIsoDateValue(value)
  if (!date) {
    return {
      weekday: value,
      dayMonth: value,
    }
  }

  return {
    weekday: new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: "short" }).format(date),
    dayMonth: new Intl.DateTimeFormat(getLocaleTag(locale), { day: "numeric", month: "short" }).format(date),
  }
}

function buildPriceCalendarCells(monthDate: Date, pricesByDate: Map<string, number>) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: PriceCalendarCell[] = []

  for (let index = 0; index < firstWeekday; index += 1) {
    const date = new Date(year, month, index - firstWeekday + 1)
    const iso = `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
    cells.push({ date: iso, day: date.getDate(), price: pricesByDate.get(iso) ?? null, isCurrentMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year.toString().padStart(4, "0")}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    cells.push({ date: iso, day, price: pricesByDate.get(iso) ?? null, isCurrentMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const offset = cells.length - (firstWeekday + daysInMonth) + 1
    const date = new Date(year, month + 1, offset)
    const iso = `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
    cells.push({ date: iso, day: date.getDate(), price: pricesByDate.get(iso) ?? null, isCurrentMonth: false })
  }

  return cells
}

function getMonthLowestPrice(cells: PriceCalendarCell[]) {
  const prices = cells
    .filter((cell) => cell.isCurrentMonth && cell.price !== null)
    .map((cell) => cell.price as number)

  if (prices.length === 0) return null
  return Math.min(...prices)
}

function buildStickyRouteSummary(state: FlightFilterState, copy: Pick<FlightCopy, "fromLabel" | "viaLabel" | "toLabel">) {
  const from = state.from.trim() || copy.fromLabel
  const to = state.to.trim() || copy.toLabel
  if (state.tripMode === "multi_city" && state.via.trim()) {
    return `${from} → ${state.via.trim()} → ${to}`
  }

  return `${from} → ${to}`
}

function buildStickyMetaSummary(state: FlightFilterState, locale: Locale, copy: Pick<FlightCopy, "passengerLabel" | "cabinLabel">) {
  const parts = [formatCompactDateLabel(state.depart, locale)]

  if (state.tripMode === "round_trip" && state.returnDate.trim()) {
    parts.push(formatCompactDateLabel(state.returnDate, locale))
  }

  parts.push(state.passengers.trim() || copy.passengerLabel)
  parts.push(state.cabin.trim() || copy.cabinLabel)
  return parts.join(" • ")
}

function getStickyCompactCopy(locale: Locale) {
  if (locale === "en") {
    return {
      priceTable: "Price table",
      cheapest: "Cheapest",
      selected: "Selected",
      selectedCheapest: "Selected • Cheapest",
      best: "Best",
    }
  }

  if (locale === "zh") {
    return {
      priceTable: "价格表",
      cheapest: "最低价",
      selected: "已选择",
      selectedCheapest: "已选 • 最低价",
      best: "最佳",
    }
  }

  return {
    priceTable: "Tabel harga",
    cheapest: "Termurah",
    selected: "Dipilih",
    selectedCheapest: "Dipilih • Termurah",
    best: "Terbaik",
  }
}

function CatalogDesktopFieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <p className="pl-4 text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#42526b]">{label}</p>
      {children}
    </div>
  )
}

export default function FlightCatalogInteractiveClient({
  items,
  emptyKeyword,
  searchPlaceholder,
  serviceCatalogHref,
  supportHref,
  copy,
  filterKeywordLabel,
  locale,
  initialState,
}: {
  items: FlightItem[]
  emptyKeyword: string
  searchPlaceholder: string
  serviceCatalogHref: string
  supportHref: string
  copy: FlightCopy
  filterKeywordLabel: string
  locale: Locale
  initialState: FlightFilterState
}) {
  const [state, setState] = useState(initialState)
  const [draft, setDraft] = useState(initialState)
  const [heroFieldStates, setHeroFieldStates] = useState<Record<string, HeroSearchFieldData>>({})
  const [isScrolled, setIsScrolled] = useState(false)
  const [isStickySearchExpanded, setIsStickySearchExpanded] = useState(false)
  const [isPriceTableOpen, setIsPriceTableOpen] = useState(false)
  const [isResultSortMenuOpen, setIsResultSortMenuOpen] = useState(false)
  const [isRecommendationCalendarOpen, setIsRecommendationCalendarOpen] = useState(false)
  const [recommendationPanelMode, setRecommendationPanelMode] = useState<RecommendationPanelMode>("calendar")
  const [recommendationCalendarTarget, setRecommendationCalendarTarget] = useState<"depart" | "return">("depart")
  const [recommendationPriceTableDraft, setRecommendationPriceTableDraft] = useState({ depart: "", returnDate: "" })
  const [canScrollPriceLeft, setCanScrollPriceLeft] = useState(false)
  const [canScrollPriceRight, setCanScrollPriceRight] = useState(false)
  const [canScrollSummaryPriceLeft, setCanScrollSummaryPriceLeft] = useState(false)
  const [canScrollSummaryPriceRight, setCanScrollSummaryPriceRight] = useState(false)
  const [recommendationCardLimit, setRecommendationCardLimit] = useState(8)
  const [liveFlightRates, setLiveFlightRates] = useState<Record<string, number>>(FLIGHT_IDR_FALLBACK_RATES)
  const [recommendationCalendarMonth, setRecommendationCalendarMonth] = useState(() => {
    const current = parseIsoDateValue(initialState.depart)
    return current ? new Date(current.getFullYear(), current.getMonth(), 1) : new Date()
  })
  const isScrolledRef = useRef(false)
  const priceTableScrollRef = useRef<HTMLDivElement | null>(null)
  const summaryPriceTableScrollRef = useRef<HTMLDivElement | null>(null)
  const resultSortMenuRef = useRef<HTMLDivElement | null>(null)
  const [openSections, setOpenSections] = useState<Record<FilterSectionKey, boolean>>({
    region: true,
    group: false,
    airline: true,
    departWindow: false,
    transit: false,
    price: false,
  })

  useEffect(() => {
    const query = buildQuery(state)
    const nextUrl = query ? `${serviceCatalogHref}?${query}` : serviceCatalogHref
    window.history.replaceState(null, "", nextUrl)
  }, [serviceCatalogHref, state])

  useEffect(() => {
    const syncScrollState = () => {
      const nextScrolled = isScrolledRef.current
        ? window.scrollY > STICKY_SCROLL_EXIT_Y
        : window.scrollY > STICKY_SCROLL_ENTER_Y

      if (nextScrolled === isScrolledRef.current) {
        return
      }

      isScrolledRef.current = nextScrolled
      setIsScrolled(nextScrolled)
      if (!nextScrolled) {
        setIsStickySearchExpanded(false)
      }
    }

    syncScrollState()
    window.addEventListener("scroll", syncScrollState, { passive: true })
    return () => window.removeEventListener("scroll", syncScrollState)
  }, [])

  useEffect(() => {
    const syncRecommendationCardLimit = () => {
      const width = window.innerWidth
      if (width < 640) {
        setRecommendationCardLimit(4)
        return
      }
      if (width < 1024) {
        setRecommendationCardLimit(5)
        return
      }
      if (width < 1280) {
        setRecommendationCardLimit(6)
        return
      }
      setRecommendationCardLimit(8)
    }

    syncRecommendationCardLimit()
    window.addEventListener("resize", syncRecommendationCardLimit)
    return () => window.removeEventListener("resize", syncRecommendationCardLimit)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadFlightRates = async () => {
      try {
        const params = new URLSearchParams({
          baseLanguage: "id",
          baseCurrency: "IDR",
          adultPrice: "1",
          childPrice: "1",
        })
        const response = await fetch(`/api/currency-rates?${params.toString()}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) return
        const payload = (await response.json()) as { rates?: Record<string, number> }
        if (cancelled || !payload.rates) return

        setLiveFlightRates({
          IDR: 1,
          USD: Number(payload.rates.USD || FLIGHT_IDR_FALLBACK_RATES.USD),
          CNY: Number(payload.rates.CNY || FLIGHT_IDR_FALLBACK_RATES.CNY),
        })
      } catch {
        if (!cancelled) {
          setLiveFlightRates(FLIGHT_IDR_FALLBACK_RATES)
        }
      }
    }

    void loadFlightRates()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isRecommendationCalendarOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRecommendationCalendarOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isRecommendationCalendarOpen])

  const availableRegions = [...new Set(items.map((item) => item.region))]
  const availableGroups = [...new Set(items.map((item) => item.group))]
  const availableAirlines = [...new Set(items.map((item) => item.meta.airline))]
  const tripTabs = [
    { key: "round_trip" as const, label: copy.roundTrip },
    { key: "one_way" as const, label: copy.oneWay },
    { key: "multi_city" as const, label: copy.multiCity },
  ]
  const heroBaseFields = useMemo(() => buildCatalogHeroBaseFields(draft), [draft])
  const heroFields = useMemo(
    () => buildFormFields(heroBaseFields, "flight", FLIGHT_HERO_STATE_KEY, heroFieldStates, locale) as CatalogHeroRenderedField[],
    [heroBaseFields, heroFieldStates, locale],
  )

  const sortFlightResults = (entries: FlightItem[]) =>
    [...entries].sort((left, right) => {
      if (state.sort === "price") return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price)
      if (state.sort === "early") return parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
      if (state.sort === "duration") return parseFlightDuration(left.meta.duration) - parseFlightDuration(right.meta.duration)
      if (state.sort === "depart_late") return parseFlightTime(right.meta.departure) - parseFlightTime(left.meta.departure)
      if (state.sort === "arrive_early") return parseFlightTime(left.meta.arrival) - parseFlightTime(right.meta.arrival)
      if (state.sort === "arrive_late") return parseFlightTime(right.meta.arrival) - parseFlightTime(left.meta.arrival)
      return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price) || parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
    })

  const filteredItems = sortFlightResults(items
    .filter((item) => {
      const keyword = state.q.trim().toLowerCase()
      const matchesKeyword =
        keyword.length === 0 ||
        item.title.toLowerCase().includes(keyword) ||
        item.location.toLowerCase().includes(keyword) ||
        item.highlights.some((highlight) => highlight.toLowerCase().includes(keyword))
      const matchesRegion = !state.region || item.region === state.region
      const matchesGroup = !state.group || item.group === state.group
      const matchesAirline = state.airlines.length === 0 || state.airlines.includes(item.meta.airline)
      const matchesDepartWindow =
        state.departWindows.length === 0 || state.departWindows.some((window) => matchesWindow(parseFlightTime(item.meta.departure), window))
      const isDirect =
        item.meta.transit.toLowerCase().includes("direct") ||
        item.meta.transit.toLowerCase().includes("langsung") ||
        item.meta.transit.includes("直飞")
      const matchesTransit =
        state.transitTypes.length === 0 ||
        state.transitTypes.some((type) => (type === "direct" ? isDirect : !isDirect))
      const matchesPrice = state.priceBands.length === 0 || state.priceBands.some((band) => matchesPriceBand(parseFlightPrice(item.meta.price), band))
      const matchesFrom = matchesFlightField(state.from, item.title, item.location, item.meta.origin, item.meta.routeCode)
      const matchesTo = matchesFlightField(state.to, item.title, item.location, item.meta.destination, item.meta.routeCode)
      const matchesVia = matchesFlightVia(state.via, state.tripMode, item)
      const matchesTripMode = matchesFlightTripMode(state.tripMode, item)
      const matchesDepartDate = matchesFlightDate(state.depart, item)
      const matchesReturnDate = state.tripMode === "round_trip" ? matchesFlightReturnDate(state.depart, state.returnDate, item) : true
      const matchesCabin = matchesFlightCabin(state.cabin, item)
      const requestedPassengers = parsePassengerCount(state.passengers)
      const matchesPassengers = requestedPassengers <= item.meta.maxPassengers
      return matchesKeyword && matchesRegion && matchesGroup && matchesAirline && matchesDepartWindow && matchesTransit && matchesPrice && matchesFrom && matchesTo && matchesVia && matchesTripMode && matchesDepartDate && matchesReturnDate && matchesCabin && matchesPassengers
    }))

  const quickDateOptions = useMemo(() => {
    const lowestPriceByDate = new Map<string, number>()

    items
      .filter((item) => matchesFlightItem(item, state, { skipDepartDate: true, skipReturnDate: true }))
      .forEach((item) => {
        item.meta.availableDates.forEach((date) => {
          const price = parseFlightPrice(item.meta.price)
          const currentLowest = lowestPriceByDate.get(date)
          if (currentLowest === undefined || price < currentLowest) {
            lowestPriceByDate.set(date, price)
          }
        })
      })

    const sortedDates = Array.from(lowestPriceByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, price]) => ({ date, price }))

    return sortedDates
  }, [items, state])

  const cheapestQuickDatePrice = useMemo(() => {
    if (quickDateOptions.length === 0) return null
    return Math.min(...quickDateOptions.map((entry) => entry.price))
  }, [quickDateOptions])
  const quickDatePriceMap = useMemo(() => new Map(quickDateOptions.map((entry) => [entry.date, entry.price])), [quickDateOptions])
  const calendarDayHeaders = useMemo(() => formatCalendarDayHeader(locale), [locale])
  const selectedCalendarDate = recommendationCalendarTarget === "return" ? state.returnDate : state.depart
  const recommendationCalendarMonths = useMemo(() => {
    return [0, 1].map((offset) => {
      const monthDate = new Date(recommendationCalendarMonth.getFullYear(), recommendationCalendarMonth.getMonth() + offset, 1)
      const cells = buildPriceCalendarCells(monthDate, quickDatePriceMap)
      return {
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        label: formatCalendarMonthLabel(monthDate, locale),
        cells,
        lowestPrice: getMonthLowestPrice(cells),
      }
    })
  }, [locale, quickDatePriceMap, recommendationCalendarMonth])
  const recommendationPriceTableDates = useMemo(() => {
    if (quickDateOptions.length === 0) return []

    const monthStart = new Date(recommendationCalendarMonth.getFullYear(), recommendationCalendarMonth.getMonth(), 1)
    const windowStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - 6)
    const windowEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, monthStart.getDate() + 12)

    const windowedDates = quickDateOptions
      .filter((entry) => {
        const date = parseIsoDateValue(entry.date)
        return Boolean(date && date >= windowStart && date <= windowEnd)
      })
      .map((entry) => entry.date)

    const fallbackDates = quickDateOptions.slice(0, 10).map((entry) => entry.date)
    return (windowedDates.length >= 6 ? windowedDates : fallbackDates).slice(0, 10)
  }, [quickDateOptions, recommendationCalendarMonth])
  const recommendationPriceTableColumns = useMemo(() => recommendationPriceTableDates.slice(0, 7), [recommendationPriceTableDates])
  const recommendationPriceTableRows = useMemo(() => recommendationPriceTableDates.slice(0, 8), [recommendationPriceTableDates])
  const recommendationPriceTableLowestValue = useMemo(() => {
    let lowest: number | null = null

    recommendationPriceTableRows.forEach((rowDate) => {
      const returnPrice = quickDatePriceMap.get(rowDate) ?? null
      recommendationPriceTableColumns.forEach((columnDate) => {
        const departPrice = quickDatePriceMap.get(columnDate) ?? null
        if (departPrice === null) return
        if (state.tripMode === "round_trip") {
          if (returnPrice === null || rowDate < columnDate) return
          const value = departPrice + returnPrice
          if (lowest === null || value < lowest) lowest = value
          return
        }

        if (lowest === null || departPrice < lowest) lowest = departPrice
      })
    })

    return lowest
  }, [quickDatePriceMap, recommendationPriceTableColumns, recommendationPriceTableRows, state.tripMode])

  const shouldShowCompactStickyBar = isScrolled && !isStickySearchExpanded
  const stickyCompactCopy = getStickyCompactCopy(locale)
  const durationSortLabel = locale === "en" ? "Shortest duration" : locale === "id" ? "Durasi tersingkat" : "最短时长"
  const activeLabel = locale === "en" ? "Active" : locale === "zh" ? "已启用" : "Aktif"
  const currentSortLabel =
    state.sort === "price"
      ? copy.sortPrice
      : state.sort === "early"
        ? copy.sortEarly
        : state.sort === "duration"
          ? durationSortLabel
        : state.sort === "depart_late"
          ? copy.sortDepartLate
          : state.sort === "arrive_early"
            ? copy.sortArriveEarly
            : state.sort === "arrive_late"
              ? copy.sortArriveLate
              : copy.sortBest

  const recommendedLabel = locale === "en" ? "Recommended searches" : locale === "zh" ? "推荐搜索" : "Rekomendasi pencarian"
  const recommendationLead = locale === "en" ? "Affordable flights on your favorite routes" : locale === "zh" ? "为你喜爱的航线提供更经济的选择" : "Terbang ekonomis dengan rute favoritmu"
  const shortestDurationLabel = locale === "en" ? "Shortest duration" : locale === "zh" ? "最短时长" : "Durasi tersingkat"
  const bestTimeLabel = locale === "en" ? "Best time" : locale === "zh" ? "最佳时间" : "Waktu terbaik"
  const resultsCountLabel =
    locale === "en"
      ? `Showing ${filteredItems.length} of ${items.length} flights`
      : locale === "zh"
        ? `显示 ${filteredItems.length}/${items.length} 个航班`
        : `Menampilkan ${filteredItems.length} dari ${items.length} penerbangan`
  const moreRoutesLabel = locale === "en" ? "See more" : locale === "zh" ? "查看更多" : "Lihat lebih banyak"
  const calendarTabLabel = locale === "en" ? "Calendar" : locale === "zh" ? "日历" : "Kalender"
  const priceTableTabLabel = locale === "en" ? "Price Table" : locale === "zh" ? "价格表" : "Tabel harga"
  const resetInlineLabel = locale === "en" ? "Reset" : locale === "zh" ? "重置" : "Reset"
  const departureAxisLabel = locale === "en" ? "Departure" : locale === "zh" ? "Departure" : "Keberangkatan"
  const returnAxisLabel = locale === "en" ? "Return" : locale === "zh" ? "Return" : "Pulang"
  const priceTableMetaLabel = locale === "en" ? "Showing round-trip prices" : locale === "zh" ? "Showing round-trip prices" : "Menampilkan harga pulang-pergi"
  const noDateSelectedLabel = locale === "en" ? "No date selected" : locale === "zh" ? "No date selected" : "Belum ada tanggal dipilih"
  const selectLabel = locale === "en" ? "Select" : locale === "zh" ? "Select" : "Pilih"
  const benefitItems =
    locale === "en"
      ? ["Best fares", "Trusted booking", "24/7 support"]
      : locale === "zh"
        ? ["优惠价格", "安心预订", "24/7 客服"]
        : ["Harga terbaik", "Aman & terpercaya", "Layanan pelanggan 24/7"]

  const topSummaryChips = [
    state.q || emptyKeyword,
    state.region || copy.allRegions,
    state.group || copy.allGroups,
    state.airlines.length === 0 ? copy.allAirlines : state.airlines.length === 1 ? state.airlines[0] : `${state.airlines.length} ${copy.airlineBlock.toLowerCase()}`,
    state.departWindows.length === 0
      ? copy.allDepartWindows
      : state.departWindows.length === 1
        ? state.departWindows[0] === "morning"
          ? copy.departMorning
          : state.departWindows[0] === "afternoon"
            ? copy.departAfternoon
            : copy.departEvening
        : `${state.departWindows.length} ${copy.departWindowBlock.toLowerCase()}`,
    state.transitTypes.length === 0
      ? copy.allTransitTypes
      : state.transitTypes.length === 1
        ? state.transitTypes[0] === "direct"
          ? copy.directOnly
          : copy.transitAllowed
        : `${state.transitTypes.length} ${copy.transitBlock.toLowerCase()}`,
    state.priceBands.length === 0
      ? copy.allPriceBands
      : state.priceBands.length === 1
        ? state.priceBands[0] === "budget"
          ? copy.priceBudget
          : state.priceBands[0] === "mid"
            ? copy.priceMid
            : copy.pricePremium
        : `${state.priceBands.length} ${copy.priceBlock.toLowerCase()}`,
  ]

  const latestDepartureItem = filteredItems.reduce<FlightItem | null>((latest, item) => {
    if (!latest) return item
    return parseFlightTime(item.meta.departure) > parseFlightTime(latest.meta.departure) ? item : latest
  }, null)
  const earliestArrivalItem = filteredItems.reduce<FlightItem | null>((earliest, item) => {
    if (!earliest) return item
    return parseFlightTime(item.meta.arrival) < parseFlightTime(earliest.meta.arrival) ? item : earliest
  }, null)
  const latestArrivalItem = filteredItems.reduce<FlightItem | null>((latest, item) => {
    if (!latest) return item
    return parseFlightTime(item.meta.arrival) > parseFlightTime(latest.meta.arrival) ? item : latest
  }, null)
  const fastestHighlightedItem = filteredItems.reduce<FlightItem | null>((fastest, item) => {
    if (!fastest) return item
    return parseFlightDuration(item.meta.duration) < parseFlightDuration(fastest.meta.duration) ? item : fastest
  }, null)
  const cheapestHighlightedItem = filteredItems.reduce<FlightItem | null>((lowest, item) => {
    if (!lowest) return item
    return parseFlightPrice(item.meta.price) < parseFlightPrice(lowest.meta.price) ? item : lowest
  }, null)
  const earliestHighlightedItem = filteredItems.reduce<FlightItem | null>((earliest, item) => {
    if (!earliest) return item
    return parseFlightTime(item.meta.departure) < parseFlightTime(earliest.meta.departure) ? item : earliest
  }, null)
  const recommendationItems = sortFlightResults(items.filter((item) => matchesFlightItem(item, state, { skipFrom: true, skipTo: true })))
  const recommendationCards = recommendationItems.slice(0, recommendationCardLimit)
  const cheapestRecommendationPrice =
    recommendationCards.length > 0 ? Math.min(...recommendationCards.map((item) => parseFlightPrice(item.meta.price))) : null

  const buildResetState = (tripMode: FlightTripMode): FlightFilterState => ({
    tripMode,
    q: "",
    region: "",
    group: "",
    from: "",
    via: "",
    to: "",
    depart: "",
    returnDate: "",
    passengers: "",
    cabin: "",
    sort: "best",
    airlines: [],
    departWindows: [],
    transitTypes: [],
    priceBands: [],
  })

  const applyDraft = () => {
    setIsStickySearchExpanded(false)
    setIsPriceTableOpen(false)
    setState(draft)
  }

  const syncDraftAndState = (updater: (current: FlightFilterState) => FlightFilterState) => {
    setDraft((current) => {
      const next = updater(current)
      setState(next)
      return next
    })
  }

  const syncHeroFieldsToCatalogState = (nextFieldStates: Record<string, HeroSearchFieldData>, baseFields: HeroSearchFieldData[], currentDraft: FlightFilterState) => {
    const nextDraft = applyCatalogHeroFieldsToDraft(currentDraft, resolveCatalogHeroFields(baseFields, nextFieldStates))
    setDraft(nextDraft)
    setState(nextDraft)
  }

  const handleHeroFieldChange = (index: number, nextValue: string) => {
    const targetField = heroFields[index]
    if (!targetField) return

    setHeroFieldStates((current) => {
      const nextFieldStates = updateFieldState(current, FLIGHT_HERO_STATE_KEY, "flight", targetField, nextValue)
      syncHeroFieldsToCatalogState(nextFieldStates, heroBaseFields, draft)
      return nextFieldStates
    })
  }

  const handleHeroSwap = () => {
    setHeroFieldStates({})
    syncDraftAndState((current) => ({
      ...current,
      from: current.to,
      to: current.from,
    }))
  }

  const handleQuickDateSelect = (nextDate: string) => {
    setHeroFieldStates({})
    syncDraftAndState((current) => ({
      ...current,
      depart: nextDate,
      returnDate:
        current.tripMode === "round_trip" && current.returnDate && current.returnDate < nextDate ? nextDate : current.returnDate,
    }))
  }

  const openRecommendationCalendar = () => {
    const referenceDate = parseIsoDateValue(state.depart) ?? parseIsoDateValue(quickDateOptions[0]?.date || "") ?? new Date()
    setRecommendationCalendarMonth(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1))
    setRecommendationPanelMode("calendar")
    setRecommendationCalendarTarget("depart")
    setRecommendationPriceTableDraft({
      depart: state.depart,
      returnDate: state.tripMode === "round_trip" ? state.returnDate : "",
    })
    setIsRecommendationCalendarOpen(true)
  }

  const switchRecommendationCalendarToPriceTable = () => {
    setRecommendationPanelMode("price_table")
  }

  const toggleRecommendationReturnDate = () => {
    const isRoundTrip = state.tripMode === "round_trip"
    setHeroFieldStates({})
    syncDraftAndState((current) => {
      if (current.tripMode === "round_trip") {
        return {
          ...current,
          tripMode: "one_way",
          returnDate: "",
        }
      }

      return {
        ...current,
        tripMode: "round_trip",
        returnDate: current.returnDate && current.returnDate >= current.depart ? current.returnDate : "",
      }
    })

    setRecommendationCalendarTarget(isRoundTrip ? "depart" : "return")
  }

  const handleRecommendationCalendarDateSelect = (nextDate: string) => {
    setHeroFieldStates({})
    const shouldStayOpenForReturn = recommendationCalendarTarget === "depart" && state.tripMode === "round_trip"
    syncDraftAndState((current) => {
      if (recommendationCalendarTarget === "return" && current.tripMode === "round_trip") {
        return {
          ...current,
          returnDate: !current.depart || nextDate >= current.depart ? nextDate : current.depart,
        }
      }

      return {
        ...current,
        depart: nextDate,
        returnDate:
          current.tripMode === "round_trip" && current.returnDate && current.returnDate < nextDate ? nextDate : current.returnDate,
      }
    })

    if (shouldStayOpenForReturn) {
      setRecommendationCalendarTarget("return")
      return
    }

    setIsRecommendationCalendarOpen(false)
  }

  const handleRecommendationPriceTableCellSelect = (departDate: string, returnDate: string) => {
    setRecommendationPriceTableDraft({
      depart: departDate,
      returnDate: state.tripMode === "round_trip" ? returnDate : "",
    })
  }

  const applyRecommendationPriceTableSelection = () => {
    if (!recommendationPriceTableDraft.depart) return

    setHeroFieldStates({})
    syncDraftAndState((current) => ({
      ...current,
      tripMode: recommendationPriceTableDraft.returnDate ? "round_trip" : current.tripMode,
      depart: recommendationPriceTableDraft.depart,
      returnDate:
        recommendationPriceTableDraft.returnDate && recommendationPriceTableDraft.returnDate >= recommendationPriceTableDraft.depart
          ? recommendationPriceTableDraft.returnDate
          : recommendationPriceTableDraft.returnDate
            ? recommendationPriceTableDraft.depart
            : "",
    }))
    setIsRecommendationCalendarOpen(false)
  }

  const resetAll = () => {
    const clearedState = buildResetState(state.tripMode)
    setHeroFieldStates({})
    setIsStickySearchExpanded(false)
    setIsPriceTableOpen(false)
    setDraft(clearedState)
    setState(clearedState)
  }

  const updateState = (patch: Partial<FlightFilterState>) => {
    setState((current) => ({ ...current, ...patch }))
    setDraft((current) => ({ ...current, ...patch }))
  }

  const toggleSection = (section: FilterSectionKey) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  const scrollPriceTable = (direction: "left" | "right") => {
    const container = priceTableScrollRef.current
    if (!container) return
    const step = 280
    container.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth",
    })
  }

  const scrollSummaryPriceTable = (direction: "left" | "right") => {
    const container = summaryPriceTableScrollRef.current
    if (!container) return
    const visibleCardCount =
      recommendationCardLimit >= 8 ? 4 : recommendationCardLimit >= 6 ? 3 : recommendationCardLimit >= 5 ? 2.5 : 2
    const step = Math.max(220, Math.round(container.clientWidth / visibleCardCount))
    container.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    const container = priceTableScrollRef.current
    const syncPriceTableScrollState = () => {
      if (!shouldShowCompactStickyBar || !container) {
        setCanScrollPriceLeft(false)
        setCanScrollPriceRight(false)
        return
      }

      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
      setCanScrollPriceLeft(container.scrollLeft > 8)
      setCanScrollPriceRight(container.scrollLeft < maxScrollLeft - 8)
    }

    const frameId = window.requestAnimationFrame(syncPriceTableScrollState)
    if (!container) {
      return () => window.cancelAnimationFrame(frameId)
    }

    container.addEventListener("scroll", syncPriceTableScrollState, { passive: true })
    window.addEventListener("resize", syncPriceTableScrollState)

    return () => {
      window.cancelAnimationFrame(frameId)
      container.removeEventListener("scroll", syncPriceTableScrollState)
      window.removeEventListener("resize", syncPriceTableScrollState)
    }
  }, [quickDateOptions, shouldShowCompactStickyBar])

  useEffect(() => {
    const container = summaryPriceTableScrollRef.current

    const syncSummaryPriceTableScrollState = () => {
      if (!container) {
        setCanScrollSummaryPriceLeft(false)
        setCanScrollSummaryPriceRight(false)
        return
      }

      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
      setCanScrollSummaryPriceLeft(container.scrollLeft > 8)
      setCanScrollSummaryPriceRight(container.scrollLeft < maxScrollLeft - 8)
    }

    const frameId = window.requestAnimationFrame(syncSummaryPriceTableScrollState)
    if (!container) {
      return () => window.cancelAnimationFrame(frameId)
    }

    container.addEventListener("scroll", syncSummaryPriceTableScrollState, { passive: true })
    window.addEventListener("resize", syncSummaryPriceTableScrollState)

    return () => {
      window.cancelAnimationFrame(frameId)
      container.removeEventListener("scroll", syncSummaryPriceTableScrollState)
      window.removeEventListener("resize", syncSummaryPriceTableScrollState)
    }
  }, [recommendationCards])

  useEffect(() => {
    if (!isResultSortMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (resultSortMenuRef.current?.contains(target)) return
      setIsResultSortMenuOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isResultSortMenuOpen])

  return (
    <main className={`${homeLayoutLock.pageXClass} relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,215,196,0.38),transparent_28%),radial-gradient(circle_at_right_18%,rgba(255,224,205,0.32),transparent_22%),linear-gradient(180deg,#fffdfb_0%,#f8fbff_52%,#ffffff_100%)] pb-10 pt-5 md:pb-14`}>
      {shouldShowCompactStickyBar ? (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-[#dce7f5] bg-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]">
          <div className={`${homeLayoutLock.pageXClass} py-2 sm:py-3 lg:py-0`}>
            <div className={homeLayoutLock.contentWidthClass}>
              <div className="scale-[0.994] rounded-[22px] border border-[#dce7f5] bg-white transition-all duration-200 lg:border-transparent lg:bg-transparent">
                <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1.08fr)_44px_minmax(0,1fr)_108px_108px] xl:items-center">
                <button
                  type="button"
                  onClick={() => setIsStickySearchExpanded(true)}
                  className="min-w-0 text-left"
                >
                  <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[#1167c4]">
                    {buildStickyRouteSummary(state, copy)}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-slate-500">
                    {buildStickyMetaSummary(state, locale, copy)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStickySearchExpanded(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50 text-[#1390ee] transition hover:bg-sky-50"
                  aria-label={copy.refineSearch}
                >
                  <SearchIcon />
                </button>
                <div className="relative">
                  {canScrollPriceLeft ? (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollPriceTable("left")}
                        className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                        aria-label="Scroll price table left"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                          <path d="M9.5 3.5 5 8l4.5 4.5" />
                        </svg>
                      </button>
                      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-white via-white/92 to-transparent xl:block" />
                    </>
                  ) : null}
                  {canScrollPriceRight ? (
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white via-white/92 to-transparent xl:block" />
                  ) : null}
                  <div
                    ref={priceTableScrollRef}
                    className="overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
                  >
                    <div className="flex min-w-max gap-2 pr-1">
                    {quickDateOptions.map((entry) => {
                      const active = entry.date === state.depart
                      const isCheapest = cheapestQuickDatePrice !== null && entry.price === cheapestQuickDatePrice
                      return (
                        <button
                          key={entry.date}
                          type="button"
                          onClick={() => handleQuickDateSelect(entry.date)}
                          className={`min-w-[124px] snap-start rounded-[14px] border px-3 py-2 text-left transition ${
                            active
                              ? "border-[#1795f1] bg-[#edf7ff] text-[#0f6fcb] shadow-[0_10px_20px_-18px_rgba(23,149,241,0.75)]"
                              : isCheapest
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300"
                                : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50"
                          }`}
                        >
                          <p className="truncate text-[12px] font-semibold">{formatCompactDateLabel(entry.date, locale)}</p>
                          <p className={`mt-0.5 text-[12px] font-semibold ${active ? "text-[#11a36a]" : isCheapest ? "text-emerald-700" : "text-slate-700"}`}>{formatCompactPrice(entry.price, locale, liveFlightRates)}</p>
                          {!active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-emerald-700">{stickyCompactCopy.cheapest}</p> : null}
                          {active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-[#0f6fcb]">{stickyCompactCopy.selectedCheapest}</p> : active ? <p className="mt-1 text-[10px] font-medium text-[#0f6fcb]">{stickyCompactCopy.selected}</p> : null}
                        </button>
                      )
                    })}
                    </div>
                  </div>
                  {canScrollPriceRight ? (
                    <button
                      type="button"
                      onClick={() => scrollPriceTable("right")}
                      className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                      aria-label="Scroll price table right"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                        <path d="M6.5 3.5 11 8l-4.5 4.5" />
                      </svg>
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPriceTableOpen((current) => !current)}
                  className={`inline-flex h-[52px] items-center justify-center rounded-[16px] border px-4 text-sm font-semibold transition ${
                    isPriceTableOpen ? "border-[#1795f1] bg-[#edf7ff] text-[#0f6fcb]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {stickyCompactCopy.priceTable}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStickySearchExpanded(true)}
                  className="inline-flex h-[52px] items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#1e88e5_0%,#156fd1_100%)] px-4 text-sm font-semibold text-white shadow-[0_14px_26px_-20px_rgba(21,111,209,0.72)] transition hover:brightness-105"
                >
                  {copy.refineSearch}
                </button>
              </div>
              {isPriceTableOpen ? (
                <div className="border-t border-slate-100 px-4 py-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {quickDateOptions.map((entry) => {
                      const active = entry.date === state.depart
                      const isCheapest = cheapestQuickDatePrice !== null && entry.price === cheapestQuickDatePrice
                      return (
                        <button
                          key={`table-${entry.date}`}
                          type="button"
                          onClick={() => handleQuickDateSelect(entry.date)}
                          className={`rounded-[14px] border px-3 py-2.5 text-left transition ${
                            active
                              ? "border-[#1795f1] bg-[#edf7ff] text-[#0f6fcb]"
                              : isCheapest
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[12px] font-semibold">{formatCompactDateLabel(entry.date, locale)}</p>
                            {isCheapest ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{stickyCompactCopy.best}</span> : null}
                          </div>
                          <p className={`mt-1.5 text-sm font-semibold ${active ? "text-[#11a36a]" : isCheapest ? "text-emerald-700" : "text-slate-900"}`}>{formatCompactPrice(entry.price, locale, liveFlightRates)}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className={`${homeLayoutLock.contentWidthClass} mt-6 max-w-[1240px]`}>
        {!shouldShowCompactStickyBar ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              applyDraft()
            }}
            className={`rounded-[30px] border border-[#f4ebe4] bg-white shadow-[0_22px_56px_-36px_rgba(15,23,42,0.22)] transition-all duration-200 ${
              isScrolled ? "p-3 shadow-[0_24px_56px_-28px_rgba(15,23,42,0.22)]" : "p-4"
            }`}
          >
            <div className="mb-4 flex gap-6 overflow-x-auto border-b border-[#f5ede7] px-2 pb-3 text-[15px] font-semibold text-[#17324d] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tripTabs.map((tab) => {
                const active = draft.tripMode === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setHeroFieldStates({})
                      syncDraftAndState((current) => ({
                        ...current,
                        tripMode: tab.key,
                        via: tab.key === "multi_city" ? current.via || initialState.via : "",
                        returnDate: tab.key === "round_trip" ? current.returnDate || initialState.returnDate : "",
                      }))
                    }}
                    className={`inline-flex shrink-0 items-center border-b-[2px] pb-[0.72rem] transition ${
                      active ? "border-[#ef5b2a] text-[#ef5b2a]" : "border-transparent text-slate-600 hover:text-[#ef4423]"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className={`rounded-[24px] border border-[#f1ebe5] bg-[#fffdfa] p-2.5 transition-all duration-200 ${isScrolled ? "p-2" : "p-3"}`}>
              <div
                className={`grid gap-3 transition-all duration-200 ${getCatalogGridClass(draft.tripMode)} ${isScrolled ? "xl:gap-2" : ""}`}
              >
                {heroFields.map((field, index) => (
                  <Fragment key={field.label}>
                    <CatalogDesktopFieldShell key={field.label} label={field.displayLabel || field.label}>
                      <HeroSearchField
                        label={field.label}
                        displayLabel={field.displayLabel}
                        value={field.value}
                        displayValue={field.displayValue}
                        sublabel={field.sublabel ?? ""}
                        displaySublabel={field.displaySublabel}
                        hideLabel
                        hideSublabel
                        withChevron={field.withChevron}
                        variant="searchbox-desktop"
                        desktopDensity="compact"
                        inputType={field.inputType}
                        options={field.options}
                        passengerState={field.passengerState}
                        cabinOptions={field.cabinOptions}
                        calendarReferenceValue={getCalendarReferenceValue(heroFields, field)}
                        onValueChange={(value) => handleHeroFieldChange(index, value)}
                        locale={locale}
                        className="rounded-[16px] border-[#eceff4] px-4 py-3"
                      />
                    </CatalogDesktopFieldShell>
                    {draft.tripMode !== "multi_city" && index === 0 ? (
                      <button
                        key="catalog-swap-route"
                        type="button"
                        onClick={handleHeroSwap}
                        aria-label="Swap route"
                        className="relative mx-auto hidden h-[56px] w-[40px] items-center justify-center self-end text-[#ff5a43] xl:flex"
                      >
                        <span className="absolute left-[6px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#f3d7c8]" />
                        <SwapIcon className="h-[15px] w-[15px]" />
                        <span className="absolute right-[6px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#f3d7c8]" />
                      </button>
                    ) : null}
                  </Fragment>
                ))}
                <button type="submit" aria-label={copy.refineSearch} className="inline-flex items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#ff7b3f_0%,#ff5a28_100%)] text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105 xl:mt-[25px] xl:h-[52px] xl:w-[60px] xl:self-start">
                  <SearchIcon />
                </button>
              </div>
              <div className="mt-2.5 grid gap-2 xl:hidden xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                <label className="block rounded-[16px] border border-[#f1dbce] bg-white px-3.5 py-2 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)]">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6a819b]">{filterKeywordLabel}</span>
                  <input value={draft.q} onChange={(event) => syncDraftAndState((current) => ({ ...current, q: event.target.value }))} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
                </label>
                <button type="submit" className="inline-flex items-center justify-center rounded-[16px] border border-[#f1dbce] bg-white px-4 py-2 text-sm font-semibold text-[#ef4423] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.12)] transition hover:bg-[#fff4ec]">
                  {copy.refineSearch}
                </button>
                <button type="button" onClick={resetAll} className="inline-flex items-center justify-center rounded-[16px] border border-[#f1dbce] bg-[#fff1e7] px-4 py-2 text-sm font-semibold text-[#b85a2c] transition hover:bg-[#ffe7d8]">
                  {copy.resetFilters}
                </button>
              </div>
            </div>
            <div className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ${isScrolled ? "mt-2 max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="flex flex-wrap gap-1.5">
                {topSummaryChips.slice(0, 4).map((chip) => (
                  <span key={`sticky-${chip}`} className="rounded-full border border-[#f0d4c4] bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-[#b85a2c]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </form>
        ) : null}
      </section>

      <section className={`${homeLayoutLock.contentWidthClass} mt-5 max-w-[1240px]`}>
        <div className="rounded-[20px] border border-[#ffc49b] bg-[linear-gradient(135deg,#ff8e62_0%,#ffb67d_100%)] px-5 py-5 shadow-[0_24px_46px_-34px_rgba(239,98,44,0.44)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-[430px]">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-white">{recommendedLabel}</p>
                <p className="text-sm font-medium text-white/88">{recommendationLead}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {benefitItems.map((benefit, index) => (
                  <div key={benefit} className="inline-flex items-center gap-2 text-sm font-medium text-white">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/35 bg-white/10 text-[11px]">
                      {index === 0 ? "◎" : index === 1 ? "♡" : "↗"}
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1 xl:max-w-[760px]">
              <div className="rounded-[18px] border border-[#ff9a68] bg-[linear-gradient(135deg,#ff7b3f_0%,#ff5a28_100%)] p-3 shadow-[0_20px_32px_-24px_rgba(239,68,35,0.42)] backdrop-blur-[2px]">
                <div className="flex min-w-0 flex-col gap-3 xl:min-h-[96px] xl:flex-row xl:items-center">
                  <div className="relative min-w-0 flex-1">
              {canScrollSummaryPriceLeft ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollSummaryPriceTable("left")}
                    className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                    aria-label="Scroll recommendation cards left"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                      <path d="M9.5 3.5 5 8l4.5 4.5" />
                    </svg>
                  </button>
                  <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-white via-white/92 to-transparent xl:block" />
                </>
              ) : null}
              {canScrollSummaryPriceRight ? (
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white via-white/92 to-transparent xl:block" />
              ) : null}
              <div
                ref={summaryPriceTableScrollRef}
                className="overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex min-w-max items-stretch gap-2 pr-1">
                  {recommendationCards.map((item) => {
                    const active = item.meta.origin === state.from && item.meta.destination === state.to
                    const isCheapest = cheapestRecommendationPrice !== null && parseFlightPrice(item.meta.price) === cheapestRecommendationPrice

                    return (
                      <button
                        key={`recommendation-${item.id}`}
                        type="button"
                        onClick={() => updateState({ from: item.meta.origin, to: item.meta.destination })}
                        className={`min-w-[124px] snap-start rounded-[14px] border px-3 py-2 text-left transition ${
                          active
                            ? "border-[#7ed321] bg-white text-[#11a36a] shadow-[0_0_0_1px_rgba(126,211,33,0.95),0_0_18px_rgba(126,211,33,0.45),0_12px_24px_-18px_rgba(56,161,105,0.8)]"
                            : isCheapest
                              ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"
                              : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50"
                        }`}
                      >
                        <p className="truncate text-[12px] font-semibold">{item.meta.origin} → {item.meta.destination}</p>
                        <p className={`mt-0.5 text-[11px] ${active ? "text-[#11a36a]" : "text-slate-500"}`}>{copy.priceLabel}</p>
                        <p className={`mt-0.5 text-[12px] font-semibold ${active ? "text-[#11a36a]" : isCheapest ? "text-emerald-700" : "text-slate-700"}`}>{formatCompactPrice(parseFlightPrice(item.meta.price), locale, liveFlightRates)}</p>
                        {!active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-emerald-700">{stickyCompactCopy.cheapest}</p> : null}
                        {active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-[#11a36a]">{stickyCompactCopy.selectedCheapest}</p> : active ? <p className="mt-1 text-[10px] font-medium text-[#11a36a]">{stickyCompactCopy.selected}</p> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
              {canScrollSummaryPriceRight ? (
                <button
                  type="button"
                  onClick={() => scrollSummaryPriceTable("right")}
                  className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700 xl:inline-flex"
                  aria-label="Scroll recommendation cards right"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2]">
                    <path d="M6.5 3.5 11 8l-4.5 4.5" />
                  </svg>
                </button>
              ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={openRecommendationCalendar}
                    className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-white/45 bg-white/14 px-4 py-3 text-center text-[12px] font-semibold text-white transition hover:bg-white/22 xl:min-w-[136px]"
                  >
                    {moreRoutesLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isRecommendationCalendarOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/34 px-4 pb-8 pt-[5.9rem] md:px-6 md:pb-10 md:pt-[6.75rem] xl:pt-[7.35rem]"
            onClick={() => setIsRecommendationCalendarOpen(false)}
          >
            <div className={`${homeLayoutLock.pageXClass} w-full`}>
              <div className={`${homeLayoutLock.contentWidthClass} mx-auto flex w-full max-w-[1240px] items-start`}>
                <div className="w-full lg:ml-[276px] lg:flex lg:w-[calc(100%-276px)] lg:justify-center">
                  <div
                    className="relative flex w-full max-w-[1020px] flex-col overflow-hidden rounded-[10px] border border-[#dbe4f0] bg-white shadow-[0_32px_70px_-34px_rgba(15,23,42,0.42)] xl:max-w-[880px]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="-mx-px flex items-center gap-6 border-b border-[#edf2f7] bg-white px-[18px] pt-3">
                      <button
                        type="button"
                        onClick={() => setRecommendationPanelMode("calendar")}
                        className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-[14px] font-semibold transition ${
                          recommendationPanelMode === "calendar" ? "border-[#1a73e8] text-[#1a73e8]" : "border-transparent text-[#6b7c93] hover:text-[#1f2d3d]"
                        }`}
                        aria-current={recommendationPanelMode === "calendar" ? "page" : undefined}
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                          <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
                          <path d="M5 2.5v2M11 2.5v2M2.5 6.5h11" />
                        </svg>
                        <span>{calendarTabLabel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={switchRecommendationCalendarToPriceTable}
                        className={`inline-flex items-center gap-2 border-b-2 px-0.5 pb-3 text-[14px] font-semibold transition ${
                          recommendationPanelMode === "price_table" ? "border-[#1a73e8] text-[#1a73e8]" : "border-transparent text-[#6b7c93] hover:text-[#1f2d3d]"
                        }`}
                        aria-current={recommendationPanelMode === "price_table" ? "page" : undefined}
                      >
                        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                          <path d="M2.5 2.5h4.5v4.5H2.5Zm6.5 0h4.5v4.5H9Zm-6.5 6.5h4.5v4.5H2.5Zm6.5 0h4.5v4.5H9Z" />
                        </svg>
                        <span>{priceTableTabLabel}</span>
                      </button>
                    </div>
                    {recommendationPanelMode === "calendar" ? (
                      <div className="px-[18px] py-[14px]">
                        <div className="flex flex-col gap-3">
                          <div className="-mx-[18px] border-b border-[#edf2f7] bg-white px-[18px] pb-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,372px)_minmax(220px,280px)] md:items-start md:justify-between">
                            <div>
                              <p className="text-[13px] font-medium text-[#6b7c93]">Departure date</p>
                              <button
                                type="button"
                                onClick={() => setRecommendationCalendarTarget("depart")}
                                className={`mt-1.5 flex h-[44px] w-full max-w-[372px] items-center gap-3 rounded-[12px] border px-4 text-left transition ${
                                  recommendationCalendarTarget === "depart" ? "border-[#1a73e8] bg-white shadow-[0_0_0_1px_rgba(26,115,232,0.12)]" : "border-[#dbe4f0] bg-white hover:border-sky-200"
                                }`}
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#eef3f8] text-[#6f8096]">
                                  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
                                    <path d="M5 2.5v2M11 2.5v2M2.5 6.5h11" />
                                  </svg>
                                </span>
                                <span className="text-[16px] font-semibold text-[#1f2d3d]">{formatCalendarInputValue(state.depart, locale)}</span>
                              </button>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={toggleRecommendationReturnDate}
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-[7px] border transition ${
                                    state.tripMode === "round_trip"
                                      ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                                      : "border-[#c9d4e5] bg-white text-transparent hover:border-sky-200"
                                  }`}
                                  aria-pressed={state.tripMode === "round_trip"}
                                  aria-label="Toggle return date"
                                >
                                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.2]">
                                    <path d="m3.5 8 2.5 2.5L12.5 4.5" />
                                  </svg>
                                </button>
                                <p className="text-[13px] font-semibold text-[#1f2d3d]">Return Date</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (state.tripMode !== "round_trip") {
                                    toggleRecommendationReturnDate()
                                    return
                                  }
                                  setRecommendationCalendarTarget("return")
                                }}
                                className={`mt-1.5 flex h-[44px] w-full items-center gap-3 rounded-[12px] border px-4 text-left transition ${
                                  recommendationCalendarTarget === "return" && state.tripMode === "round_trip"
                                    ? "border-[#1a73e8] bg-white shadow-[0_0_0_1px_rgba(26,115,232,0.12)]"
                                    : "border-[#dbe4f0] bg-white hover:border-sky-200"
                                }`}
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#eef3f8] text-[#6f8096]">
                                  <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
                                    <path d="M5 2.5v2M11 2.5v2M2.5 6.5h11" />
                                  </svg>
                                </span>
                                <span className={`text-[15px] font-semibold ${state.tripMode === "round_trip" ? "text-[#1f2d3d]" : "text-[#8ea0b6]"}`}>
                                  {state.tripMode === "round_trip" ? formatCalendarInputValue(state.returnDate, locale) : "Select return date"}
                                </span>
                              </button>
                            </div>
                            </div>
                          </div>

                          <div className="grid gap-1 pt-0.5 md:grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_20px] md:items-start">
                            <button
                              type="button"
                              onClick={() => setRecommendationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#6f8096] transition hover:bg-[#f3f7fb] hover:text-[#1f2d3d]"
                              aria-label="Previous month"
                            >
                              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.1]">
                                <path d="M9.5 3.5 5 8l4.5 4.5" />
                              </svg>
                            </button>

                            {recommendationCalendarMonths.map((month) => (
                              <section key={month.key} className="rounded-none border-none bg-white p-0 shadow-none">
                                <div className="mb-1.5 flex items-center justify-center gap-3">
                                  <h3 className="text-[16px] font-semibold tracking-[-0.03em] text-[#0a458a]">{month.label}</h3>
                                </div>
                                <div className="grid grid-cols-7 gap-x-1 gap-y-0 border-t border-[#edf2f7] pt-2 [font-variant-numeric:tabular-nums]">
                                  {calendarDayHeaders.map((label, index) => (
                                    <div
                                      key={`${month.key}-${label}`}
                                      className={`pb-1.5 text-center text-[10px] font-semibold ${index === 0 ? "text-rose-500" : index === 6 ? "text-rose-500" : "text-[#6b7c93]"}`}
                                    >
                                      {label}
                                    </div>
                                  ))}
                                  {month.cells.map((cell) => {
                                    const active = cell.date === selectedCalendarDate
                                    const isCheapest = cheapestQuickDatePrice !== null && cell.price === cheapestQuickDatePrice && cell.price !== null
                                    const blockedByReturnRule = recommendationCalendarTarget === "return" && Boolean(state.depart) && cell.date < state.depart
                                    const disabled = cell.price === null || blockedByReturnRule
                                    const isRangeStart = state.tripMode === "round_trip" && Boolean(state.depart) && cell.date === state.depart
                                    const isRangeEnd = state.tripMode === "round_trip" && Boolean(state.returnDate) && cell.date === state.returnDate
                                    const isInSelectedRange =
                                      state.tripMode === "round_trip" &&
                                      Boolean(state.depart) &&
                                      Boolean(state.returnDate) &&
                                      cell.date > state.depart &&
                                      cell.date < state.returnDate
                                    const weekdayIndex = parseIsoDateValue(cell.date)?.getDay() ?? 0
                                    const weekendTone = weekdayIndex === 0 ? "text-rose-500" : weekdayIndex === 6 ? "text-[#0b82d8]" : "text-[#003b7a]"

                                    return (
                                      <button
                                        key={`${month.key}-${cell.date}`}
                                        type="button"
                                        onClick={() => {
                                          if (disabled) return
                                          handleRecommendationCalendarDateSelect(cell.date)
                                        }}
                                        disabled={disabled}
                                        className={`flex min-h-[48px] flex-col items-center rounded-[10px] border px-1 py-1 text-center transition ${
                                          active
                                            ? "border-[#8fd400] bg-white shadow-[inset_0_0_0_1px_rgba(143,212,0,0.95)]"
                                            : isRangeStart || isRangeEnd
                                              ? "border-[#8fd400] bg-[#f7ffe8] shadow-[inset_0_0_0_1px_rgba(143,212,0,0.8)]"
                                              : isInSelectedRange
                                                ? "border-[#b8ef65] bg-[#b8ef65]/75"
                                            : disabled
                                              ? "border-transparent bg-transparent text-slate-300"
                                              : "border-transparent bg-white hover:border-[#dbe4f0] hover:bg-slate-50"
                                        }`}
                                      >
                                        <p className={`h-[16px] text-[13px] font-semibold leading-none ${cell.isCurrentMonth ? weekendTone : "text-[#cfd8e3]"}`}>{cell.day}</p>
                                        <p className={`mt-1 min-h-[12px] text-[9px] font-medium leading-[1.05] ${active ? "text-[#0a458a]" : isCheapest ? "text-emerald-600" : "text-[#6b7c93]"}`}>
                                          {cell.price === null || blockedByReturnRule ? " " : formatCompactPriceAmountOnly(cell.price, locale, liveFlightRates)}
                                        </p>
                                      </button>
                                    )
                                  })}
                                </div>
                              </section>
                            ))}

                            <button
                              type="button"
                              onClick={() => setRecommendationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                              className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[#6f8096] transition hover:bg-[#f3f7fb] hover:text-[#1f2d3d]"
                              aria-label="Next month"
                            >
                              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.1]">
                                <path d="M6.5 3.5 11 8l-4.5 4.5" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 border-t border-[#edf2f7] pt-2.5 text-[12px] text-[#6b7c93]">
                            <span className="h-3 w-3 rounded-[4px] bg-emerald-500" />
                            <span>Lowest flight price</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between border-b border-[#edf2f7] px-[18px] py-3">
                          <div className="flex items-center gap-3 text-[13px] font-semibold text-[#1f2d3d]">
                            <span>{departureAxisLabel}</span>
                            <button
                              type="button"
                              onClick={() => setRecommendationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#9aa8b8] transition hover:bg-slate-50 hover:text-[#1f2d3d]"
                              aria-label="Previous price table dates"
                            >
                              <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[2]">
                                <path d="M9.5 3.5 5 8l4.5 4.5" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecommendationCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#9aa8b8] transition hover:bg-slate-50 hover:text-[#1f2d3d]"
                              aria-label="Next price table dates"
                            >
                              <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current stroke-[2]">
                                <path d="M6.5 3.5 11 8l-4.5 4.5" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-right text-[12px] font-medium text-[#6b7c93]">{priceTableMetaLabel} in {localeCurrencyMap[locale]}</p>
                        </div>
                        <div className="overflow-auto px-[18px] py-3">
                          <div className="grid min-w-[760px] border border-[#edf2f7] bg-white [grid-template-columns:106px_repeat(7,minmax(88px,1fr))]">
                            <div className="border-b border-r border-[#edf2f7] bg-[#f8fafc] px-3 py-3 text-left">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a9ab0]">{returnAxisLabel}</p>
                            </div>
                            {recommendationPriceTableColumns.map((columnDate) => {
                              const axis = formatPriceTableAxisLabel(columnDate, locale)
                              const weekdayIndex = parseIsoDateValue(columnDate)?.getDay() ?? 0
                              const weekendTone = weekdayIndex === 0 || weekdayIndex === 6 ? "text-rose-500" : "text-[#1f2d3d]"
                              return (
                                <div key={`col-${columnDate}`} className="border-b border-r border-[#edf2f7] bg-white px-2 py-3 text-center last:border-r-0">
                                  <p className={`text-[11px] font-semibold ${weekendTone}`}>{axis.weekday}</p>
                                  <p className={`mt-1 text-[12px] ${weekendTone}`}>{axis.dayMonth}</p>
                                </div>
                              )
                            })}

                            {recommendationPriceTableRows.map((rowDate) => {
                              const rowAxis = formatPriceTableAxisLabel(rowDate, locale)
                              const rowWeekdayIndex = parseIsoDateValue(rowDate)?.getDay() ?? 0
                              const rowWeekendTone = rowWeekdayIndex === 0 || rowWeekdayIndex === 6 ? "text-rose-500" : "text-[#1f2d3d]"

                              return (
                                <Fragment key={`row-${rowDate}`}>
                                  <div className="border-b border-r border-[#edf2f7] bg-white px-3 py-3 text-left">
                                    <p className={`text-[11px] font-semibold ${rowWeekendTone}`}>{rowAxis.weekday}</p>
                                    <p className={`mt-1 text-[12px] ${rowWeekendTone}`}>{rowAxis.dayMonth}</p>
                                  </div>
                                  {recommendationPriceTableColumns.map((columnDate) => {
                                    const departPrice = quickDatePriceMap.get(columnDate) ?? null
                                    const returnPrice = quickDatePriceMap.get(rowDate) ?? null
                                    const invalidRange = state.tripMode === "round_trip" && rowDate < columnDate
                                    const disabled = departPrice === null || (state.tripMode === "round_trip" && returnPrice === null) || invalidRange
                                    const value =
                                      disabled
                                        ? null
                                        : state.tripMode === "round_trip"
                                          ? (departPrice ?? 0) + (returnPrice ?? 0)
                                          : departPrice
                                    const selected =
                                      recommendationPriceTableDraft.depart === columnDate &&
                                      (state.tripMode !== "round_trip" || recommendationPriceTableDraft.returnDate === rowDate)
                                    const isBest = value !== null && recommendationPriceTableLowestValue !== null && value === recommendationPriceTableLowestValue

                                    return (
                                      <button
                                        key={`${columnDate}-${rowDate}`}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleRecommendationPriceTableCellSelect(columnDate, rowDate)}
                                        className={`min-h-[58px] border-b border-r border-[#edf2f7] px-2 py-2 text-center transition last:border-r-0 ${
                                          selected
                                            ? "bg-[#e8f1ff] shadow-[inset_0_0_0_1px_rgba(26,115,232,0.42)]"
                                            : disabled
                                              ? "bg-slate-50/90"
                                              : isBest
                                                ? "bg-emerald-50/45 hover:bg-emerald-50/70"
                                                : "bg-white hover:bg-sky-50"
                                        }`}
                                      >
                                        <span
                                          className={`text-[12px] font-semibold ${
                                            selected
                                              ? "text-[#1565d8]"
                                              : disabled
                                                ? "text-slate-300"
                                              : isBest
                                                  ? "text-emerald-600"
                                                  : "text-[#1f2d3d]"
                                          }`}
                                        >
                                          {value === null ? " " : formatCompactPriceAmountOnly(value, locale, liveFlightRates)}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </Fragment>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-[#edf2f7] bg-white px-[18px] py-3">
                          <div>
                            <p className="text-[13px] font-semibold text-[#1f2d3d]">
                              {recommendationPriceTableDraft.depart ? `${formatCalendarInputValue(recommendationPriceTableDraft.depart, locale)}${recommendationPriceTableDraft.returnDate ? ` - ${formatCalendarInputValue(recommendationPriceTableDraft.returnDate, locale)}` : ""}` : noDateSelectedLabel}
                            </p>
                            <p className="mt-1 text-[12px] text-[#6b7c93]">
                              {recommendationPriceTableDraft.depart
                                ? `${departureAxisLabel}: ${formatCalendarInputValue(recommendationPriceTableDraft.depart, locale)}${recommendationPriceTableDraft.returnDate ? ` | ${returnAxisLabel}: ${formatCalendarInputValue(recommendationPriceTableDraft.returnDate, locale)}` : ""}`
                                : `${departureAxisLabel} -`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={applyRecommendationPriceTableSelection}
                            disabled={!recommendationPriceTableDraft.depart || (state.tripMode === "round_trip" && !recommendationPriceTableDraft.returnDate)}
                            className="inline-flex min-w-[132px] items-center justify-center rounded-[10px] bg-[#1a73e8] px-4 py-3 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {selectLabel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <section className={`${homeLayoutLock.contentWidthClass} mt-5 grid max-w-[1240px] gap-4 lg:min-h-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start`}>
        <aside className="space-y-3 lg:sticky lg:top-[8.2rem] lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden">
          <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-slate-900">Filter Pencarian</p>
              <button type="button" onClick={resetAll} className="text-sm font-semibold text-[#ef5b2a] transition hover:opacity-80">
                {resetInlineLabel}
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">{copy.leftBody}</p>
          </div>

          <FilterSection title={copy.regionBlock} open={openSections.region} onToggle={() => toggleSection("region")}>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => updateState({ region: "" })} className={filterLinkClass(state.region === "")}>
                <FilterCheck active={state.region === ""} />
                <span>{copy.allRegions}</span>
              </button>
              {availableRegions.map((region) => (
                <button key={region} type="button" onClick={() => updateState({ region })} className={filterLinkClass(state.region === region)}>
                  <FilterCheck active={state.region === region} />
                  <span>{region}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={copy.tripBlock} open={openSections.group} onToggle={() => toggleSection("group")}>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => updateState({ group: "" })} className={filterLinkClass(state.group === "")}>
                <FilterCheck active={state.group === ""} />
                <span>{copy.allGroups}</span>
              </button>
              {availableGroups.map((group) => (
                <button key={group} type="button" onClick={() => updateState({ group })} className={filterLinkClass(state.group === group)}>
                  <FilterCheck active={state.group === group} />
                  <span>{group}</span>
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={copy.airlineBlock} open={openSections.airline} onToggle={() => toggleSection("airline")}>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => updateState({ airlines: [] })} className={filterLinkClass(state.airlines.length === 0)}>
                <FilterCheck active={state.airlines.length === 0} />
                <span>{copy.allAirlines}</span>
              </button>
              {availableAirlines.map((airline) => {
                const active = state.airlines.includes(airline)
                return (
                  <button key={airline} type="button" onClick={() => updateState({ airlines: toggleValue(state.airlines, airline) })} className={filterLinkClass(active)}>
                    <FilterCheck active={active} />
                    <span>{airline}</span>
                  </button>
                )
              })}
            </div>
          </FilterSection>

          <FilterSection title={copy.departWindowBlock} open={openSections.departWindow} onToggle={() => toggleSection("departWindow")}>
            <div className="flex flex-col gap-1.5">
              {[
                ["", copy.allDepartWindows],
                ["morning", copy.departMorning],
                ["afternoon", copy.departAfternoon],
                ["evening", copy.departEvening],
              ].map(([value, label]) => {
                const active = value ? state.departWindows.includes(value) : state.departWindows.length === 0
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => updateState({ departWindows: value ? toggleValue(state.departWindows, value) : [] })}
                    className={filterLinkClass(active)}
                  >
                    <FilterCheck active={active} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </FilterSection>

          <FilterSection title={copy.transitBlock} open={openSections.transit} onToggle={() => toggleSection("transit")}>
            <div className="flex flex-col gap-1.5">
              {[
                ["", copy.allTransitTypes],
                ["direct", copy.directOnly],
                ["mixed", copy.transitAllowed],
              ].map(([value, label]) => {
                const active = value ? state.transitTypes.includes(value) : state.transitTypes.length === 0
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => updateState({ transitTypes: value ? toggleValue(state.transitTypes, value) : [] })}
                    className={filterLinkClass(active)}
                  >
                    <FilterCheck active={active} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </FilterSection>

          <FilterSection title={copy.priceBlock} open={openSections.price} onToggle={() => toggleSection("price")}>
            <div className="flex flex-col gap-1.5">
              {[
                ["", copy.allPriceBands],
                ["budget", copy.priceBudget],
                ["mid", copy.priceMid],
                ["premium", copy.pricePremium],
              ].map(([value, label]) => {
                const active = value ? state.priceBands.includes(value) : state.priceBands.length === 0
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => updateState({ priceBands: value ? toggleValue(state.priceBands, value) : [] })}
                    className={filterLinkClass(active)}
                  >
                    <FilterCheck active={active} />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </FilterSection>
        </aside>

        <div className="space-y-4 lg:max-h-[calc(100vh-9rem)] lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-gutter:stable]">
          <div className="rounded-[24px] border border-[#eef1f6] bg-white p-4 shadow-[0_22px_52px_-38px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] font-medium text-slate-500">{resultsCountLabel}</p>
                <div ref={resultSortMenuRef} className="relative flex items-center gap-3">
                  <span className="text-[13px] text-slate-500">{copy.sortLabel}:</span>
                  <button
                    type="button"
                    onClick={() => setIsResultSortMenuOpen((current) => !current)}
                    className="inline-flex min-w-[180px] items-center justify-between rounded-[12px] border border-[#eceff4] bg-[#fcfdff] px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                    aria-expanded={isResultSortMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span>{currentSortLabel}</span>
                    <svg viewBox="0 0 16 16" className={`h-4 w-4 fill-none stroke-current stroke-[2] transition ${isResultSortMenuOpen ? "rotate-180" : ""}`}>
                      <path d="M3.5 6.5 8 11l4.5-4.5" />
                    </svg>
                  </button>
                  {isResultSortMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.6rem)] z-20 w-full min-w-[260px] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_24px_48px_-24px_rgba(15,23,42,0.24)]" role="menu">
                      <button
                        type="button"
                        onClick={() => {
                          updateState({ sort: "early" })
                          setIsResultSortMenuOpen(false)
                        }}
                        className={`flex w-full items-start justify-between px-5 py-5 text-left transition ${state.sort === "early" ? "bg-sky-50 text-sky-700" : "text-slate-900 hover:bg-slate-50"}`}
                        role="menuitem"
                      >
                        <div>
                          <p className="text-[15px] font-semibold">{copy.sortEarly}</p>
                          <p className="mt-1 text-sm text-slate-500">{earliestHighlightedItem?.meta.departure || "-"}</p>
                        </div>
                        {state.sort === "early" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{activeLabel}</span> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateState({ sort: "depart_late" })
                          setIsResultSortMenuOpen(false)
                        }}
                        className={`flex w-full items-start justify-between border-t border-slate-100 px-5 py-5 text-left transition ${state.sort === "depart_late" ? "bg-sky-50 text-sky-700" : "text-slate-900 hover:bg-slate-50"}`}
                        role="menuitem"
                      >
                        <div>
                          <p className="text-[15px] font-semibold">{copy.sortDepartLate}</p>
                          <p className="mt-1 text-sm text-slate-500">{latestDepartureItem?.meta.departure || "-"}</p>
                        </div>
                        {state.sort === "depart_late" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{activeLabel}</span> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateState({ sort: "arrive_early" })
                          setIsResultSortMenuOpen(false)
                        }}
                        className={`flex w-full items-start justify-between border-t border-slate-100 px-5 py-5 text-left transition ${state.sort === "arrive_early" ? "bg-sky-50 text-sky-700" : "text-slate-900 hover:bg-slate-50"}`}
                        role="menuitem"
                      >
                        <div>
                          <p className="text-[15px] font-semibold">{copy.sortArriveEarly}</p>
                          <p className="mt-1 text-sm text-slate-500">{earliestArrivalItem?.meta.arrival || "-"}</p>
                        </div>
                        {state.sort === "arrive_early" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{activeLabel}</span> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateState({ sort: "arrive_late" })
                          setIsResultSortMenuOpen(false)
                        }}
                        className={`flex w-full items-start justify-between border-t border-slate-100 px-5 py-5 text-left transition ${state.sort === "arrive_late" ? "bg-sky-50 text-sky-700" : "text-slate-900 hover:bg-slate-50"}`}
                        role="menuitem"
                      >
                        <div>
                          <p className="text-[15px] font-semibold">{copy.sortArriveLate}</p>
                          <p className="mt-1 text-sm text-slate-500">{latestArrivalItem?.meta.arrival || "-"}</p>
                        </div>
                        {state.sort === "arrive_late" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{activeLabel}</span> : null}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid overflow-hidden rounded-[18px] border border-[#f0f1f5] xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => updateState({ sort: "best" })}
                  className={`px-6 py-4 text-left transition ${state.sort === "best" ? "bg-[#fffaf7] text-[#ef5b2a] shadow-[inset_0_0_0_1px_rgba(239,91,42,0.4)]" : "bg-white hover:bg-slate-50"}`}
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{copy.sortBest}</p>
                    <p className="mt-1 text-[13px] font-medium opacity-80">{recommendedLabel}</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ sort: "price" })}
                  className="border-t border-[#f0f1f5] px-6 py-4 text-left transition hover:bg-slate-50 xl:border-l xl:border-t-0"
                >
                  <p className="text-[13px] text-slate-500">{copy.sortPrice}</p>
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">
                    {cheapestHighlightedItem ? formatCompactPrice(parseFlightPrice(cheapestHighlightedItem.meta.price), locale, liveFlightRates) : "-"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ sort: "early" })}
                  className="border-t border-[#f0f1f5] px-6 py-4 text-left transition hover:bg-slate-50 xl:border-l xl:border-t-0"
                >
                  <p className="text-[13px] text-slate-500">{bestTimeLabel}</p>
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">{earliestHighlightedItem?.meta.departure || "-"}</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateState({ sort: "duration" })}
                  className="border-t border-[#f0f1f5] px-6 py-4 text-left transition hover:bg-slate-50 xl:border-l xl:border-t-0"
                >
                  <p className="text-[13px] text-slate-500">{shortestDurationLabel}</p>
                  <p className="mt-1 text-[15px] font-semibold text-slate-900">{fastestHighlightedItem?.meta.duration || "-"}</p>
                </button>
              </div>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-[24px] border border-[#dce8f6] bg-white p-8 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.18)]">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.emptyTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{copy.emptyBody}</p>
              <button type="button" onClick={resetAll} className="mt-5 inline-flex rounded-[14px] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
                {copy.resetFilters}
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const { meta } = item
              return (
              <article key={item.id} className="overflow-hidden rounded-[22px] border border-[#eef1f6] bg-white shadow-[0_20px_44px_-36px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.22)]">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="p-5">
                    <div className="grid gap-5 xl:grid-cols-[190px_minmax(0,1fr)] xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#eef1f6] bg-white shadow-sm">
                          <Image src={item.image} alt={item.title} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[18px] font-semibold tracking-[-0.02em] text-slate-950">{meta.airline}</p>
                          <p className="mt-1 truncate text-[12px] text-slate-500">{meta.routeCode} | {meta.cabin}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_auto] md:items-start">
                        <div>
                          <p className="text-[33px] font-semibold leading-none tracking-[-0.05em] text-slate-950">{meta.departure}</p>
                          <p className="mt-1 text-[13px] font-semibold text-slate-700">{meta.origin}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{item.location}</p>
                        </div>
                        <div className="pt-2 text-center">
                          <p className="text-xs font-medium text-slate-500">{meta.duration}</p>
                          <div className="mt-2 h-px bg-slate-200" />
                          <p className="mt-2 text-[12px] font-medium text-[#ef5b2a]">{meta.transit}</p>
                        </div>
                        <div>
                          <p className="text-[33px] font-semibold leading-none tracking-[-0.05em] text-slate-950">{meta.arrival}</p>
                          <p className="mt-1 text-[13px] font-semibold text-slate-700">{meta.destination}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{state.to || copy.toLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:justify-end">
                          <span className="rounded-full bg-[#fff4dd] px-2.5 py-1 text-[10px] font-semibold text-[#c98a18]">{meta.highlightBadges[0] || copy.sortBest}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.facts.map((fact) => (
                        <span key={`${item.id}-${fact.label}`} className="rounded-[10px] border border-[#eef2f6] bg-[#f8fafc] px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          {fact.label} {fact.value}
                        </span>
                      ))}
                      {meta.highlightBadges.slice(1).map((badge) => (
                        <span key={badge} className="rounded-[10px] border border-[#eef2f6] bg-[#f8fafc] px-2.5 py-1.5 text-[11px] font-medium text-slate-600">
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 text-[12px] leading-6 text-slate-500">
                      <p>{item.availabilityNote}</p>
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-center border-t border-[#eef1f6] bg-white p-5 xl:border-l xl:border-t-0">
                    <button type="button" aria-label="Save fare" className="absolute right-4 top-4 text-slate-300 transition hover:text-slate-500">
                      <svg viewBox="0 0 16 16" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                        <path d="M8 13.2 3.3 8.6A2.9 2.9 0 0 1 7.4 4.5L8 5l.6-.5a2.9 2.9 0 0 1 4.1 4.1Z" />
                      </svg>
                    </button>
                    <p className="text-[12px] text-slate-500">{copy.priceLabel}</p>
                    <p className="mt-2 text-[16px] font-semibold tracking-[-0.02em] text-[#ef5b2a]">{formatCompactPrice(parseFlightPrice(meta.price), locale, liveFlightRates)}</p>
                    <p className="mt-1 text-[11px] text-slate-400">/pax</p>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">{meta.seatNote}</p>
                    <div className="mt-5 space-y-2">
                      <Link href={supportHref} className="block rounded-[12px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] py-2.5 text-center text-[15px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(239,68,35,0.58)] transition hover:brightness-105">
                        {copy.chooseLabel}
                      </Link>
                      <p className="text-[11px] leading-5 text-slate-500">{copy.supportHint}</p>
                    </div>
                  </div>
                </div>
              </article>
              )
            })
          )}
        </div>
      </section>

    </main>
  )
}
