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

type FilterSectionKey = "region" | "group" | "airline" | "departWindow" | "transit" | "price"

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
  const matchesFrom = matchesFlightField(state.from, item.title, item.location, item.meta.origin, item.meta.routeCode)
  const matchesTo = matchesFlightField(state.to, item.title, item.location, item.meta.destination, item.meta.routeCode)
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
  return `flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-sm transition ${
    active
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
  }`
}

function FilterCheck({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        active ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 bg-white text-transparent"
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
    <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition ${
            open ? "bg-sky-50 text-sky-700" : "bg-white"
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

function formatCompactPrice(value: number, locale: Locale) {
  if (!Number.isFinite(value) || value <= 0) return "-"

  if (locale === "en") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
  }

  if (locale === "zh") {
    return `Rp ${new Intl.NumberFormat("zh-CN").format(value)}`
  }

  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`
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
  const isScrolledRef = useRef(false)
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

  const filteredItems = items
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
    })
    .sort((left, right) => {
      if (state.sort === "price") return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price)
      if (state.sort === "early") return parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
      return parseFlightPrice(left.meta.price) - parseFlightPrice(right.meta.price) || parseFlightTime(left.meta.departure) - parseFlightTime(right.meta.departure)
    })

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

  const shouldShowCompactStickyBar = isScrolled && !isStickySearchExpanded
  const stickyCompactCopy = getStickyCompactCopy(locale)

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

  const topDetailChips = [
    { label: copy.fromLabel, value: state.from },
    ...(state.tripMode === "multi_city" ? [{ label: copy.viaLabel, value: state.via }] : []),
    { label: copy.toLabel, value: state.to },
    { label: copy.departLabel, value: state.depart },
    ...(state.tripMode === "round_trip" ? [{ label: copy.returnLabel, value: state.returnDate }] : []),
    { label: copy.passengerClassLabel, value: `${state.passengers}, ${state.cabin}` },
  ]

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

  return (
    <main className={`${homeLayoutLock.pageXClass} pb-10 pt-5 md:pb-14`}>
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
                <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-max gap-2">
                    {quickDateOptions.map((entry) => {
                      const active = entry.date === state.depart
                      const isCheapest = cheapestQuickDatePrice !== null && entry.price === cheapestQuickDatePrice
                      return (
                        <button
                          key={entry.date}
                          type="button"
                          onClick={() => handleQuickDateSelect(entry.date)}
                          className={`min-w-[124px] rounded-[14px] border px-3 py-2 text-left transition ${
                            active
                              ? "border-[#1795f1] bg-[#edf7ff] text-[#0f6fcb] shadow-[0_10px_20px_-18px_rgba(23,149,241,0.75)]"
                              : isCheapest
                                ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300"
                                : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50"
                          }`}
                        >
                          <p className="truncate text-[12px] font-semibold">{formatCompactDateLabel(entry.date, locale)}</p>
                          <p className={`mt-0.5 text-[12px] font-semibold ${active ? "text-[#11a36a]" : isCheapest ? "text-emerald-700" : "text-slate-700"}`}>{formatCompactPrice(entry.price, locale)}</p>
                          {!active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-emerald-700">{stickyCompactCopy.cheapest}</p> : null}
                          {active && isCheapest ? <p className="mt-1 text-[10px] font-medium text-[#0f6fcb]">{stickyCompactCopy.selectedCheapest}</p> : active ? <p className="mt-1 text-[10px] font-medium text-[#0f6fcb]">{stickyCompactCopy.selected}</p> : null}
                        </button>
                      )
                    })}
                  </div>
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
                          <p className={`mt-1.5 text-sm font-semibold ${active ? "text-[#11a36a]" : isCheapest ? "text-emerald-700" : "text-slate-900"}`}>{formatCompactPrice(entry.price, locale)}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2.5">
                {topSummaryChips.slice(0, 2).map((chip) => (
                  <span key={`compact-${chip}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className={`${homeLayoutLock.contentWidthClass} mt-4`}>
        {!shouldShowCompactStickyBar ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              applyDraft()
            }}
            className={`rounded-[28px] border border-[#d8e7f6] bg-[linear-gradient(180deg,#2d8edf_0%,#2093ee_22%,#43a4ef_100%)] shadow-[0_24px_52px_-30px_rgba(15,23,42,0.24)] transition-all duration-200 ${
              isScrolled ? "p-3 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.22)]" : "p-4"
            }`}
          >
            <div className="mb-4 flex gap-5 overflow-x-auto border-b border-white/20 px-2 pb-3 text-sm font-semibold text-[#17324d] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      active ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-white/88 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className={`rounded-[26px] border border-white/16 bg-white/14 p-2.5 transition-all duration-200 ${isScrolled ? "p-2" : "p-3"}`}>
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
                        className="rounded-[999px] px-5 py-[14px]"
                      />
                    </CatalogDesktopFieldShell>
                    {draft.tripMode !== "multi_city" && index === 0 ? (
                      <button
                        key="catalog-swap-route"
                        type="button"
                        onClick={handleHeroSwap}
                        aria-label="Swap route"
                        className="relative mx-auto hidden h-[66px] w-[44px] items-center justify-center self-end text-[#ff5a43] xl:flex"
                      >
                        <span className="absolute left-[6px] top-1/2 h-7 w-px -translate-y-1/2 bg-white/35" />
                        <SwapIcon className="h-[15px] w-[15px]" />
                        <span className="absolute right-[6px] top-1/2 h-7 w-px -translate-y-1/2 bg-white/35" />
                      </button>
                    ) : null}
                  </Fragment>
                ))}
                <button type="submit" aria-label={copy.refineSearch} className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-[29px] xl:h-[56px] xl:w-[56px] xl:self-start">
                  <SearchIcon />
                </button>
              </div>
              <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
                <label className="block rounded-[18px] border border-white/45 bg-white px-3.5 py-2.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)]">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6a819b]">{filterKeywordLabel}</span>
                  <input value={draft.q} onChange={(event) => syncDraftAndState((current) => ({ ...current, q: event.target.value }))} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" />
                </label>
                <button type="submit" className="inline-flex items-center justify-center rounded-[16px] bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-[0_10px_24px_-18px_rgba(255,255,255,0.62)] transition hover:bg-sky-50">
                  {copy.refineSearch}
                </button>
                <button type="button" onClick={resetAll} className="inline-flex items-center justify-center rounded-[16px] border border-white/45 bg-[#1d78c7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176ab0]">
                  {copy.resetFilters}
                </button>
              </div>
            </div>
            <div className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ${isScrolled ? "mt-2 max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="flex flex-wrap gap-1.5">
                {topSummaryChips.slice(0, 4).map((chip) => (
                  <span key={`sticky-${chip}`} className="rounded-full border border-white/30 bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </form>
        ) : null}
      </section>

      <section className={`${homeLayoutLock.contentWidthClass} mt-4`}>
        <div className="rounded-[20px] border border-[#dce7f4] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.14)] sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">{copy.searchSummary}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  {filteredItems.length} {copy.flightsFound}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topDetailChips.map((chip) => (
                  <div key={chip.label} className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-[12px] shadow-sm">
                    <span className="font-semibold text-sky-700">{chip.label}:</span>{" "}
                    <span className="font-medium text-slate-700">{chip.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-w-[360px] rounded-[16px] border border-sky-100/80 bg-white/90 px-3.5 py-2.5 text-[11px] leading-5 text-slate-500">
              <span className="font-semibold text-slate-900">{copy.topTitle}.</span> {copy.topBody}
            </div>
          </div>
        </div>
      </section>

      <section className={`${homeLayoutLock.contentWidthClass} mt-5 grid gap-4 lg:grid-cols-[272px_minmax(0,1fr)]`}>
        <aside className="space-y-3 lg:sticky lg:top-[8.2rem] lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden">
          <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{copy.leftTitle}</p>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">{filteredItems.length}</span>
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">{copy.leftBody}</p>
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

        <div className="space-y-3">
          <div className="rounded-[20px] border border-[#dce8f6] bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.14)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{filteredItems.length} {copy.flightsFound}</p>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                  {copy.sortLabel}: {state.sort === "price" ? copy.sortPrice : state.sort === "early" ? copy.sortEarly : copy.sortBest}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">{copy.activeFilters}</span>
                {topSummaryChips.map((chip) => (
                  <span key={`active-${chip}`} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                    {chip}
                  </span>
                ))}
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
              <article key={item.id} className="overflow-hidden rounded-[20px] border border-[#dce8f6] bg-white shadow-[0_14px_32px_-26px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.2)]">
                <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="p-4">
                    <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)] xl:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-sky-100 bg-sky-50">
                          <Image src={item.image} alt={item.title} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{meta.airline}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{meta.cabin} • {meta.tripLabel}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_minmax(0,1fr)_auto] md:items-center">
                        <div>
                          <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{meta.departure}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{meta.origin}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-slate-500">{meta.duration}</p>
                          <div className="mt-1.5 h-px bg-slate-200" />
                          <p className="mt-1.5 text-[11px] text-sky-700">{meta.transit}</p>
                        </div>
                        <div>
                          <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{meta.arrival}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{meta.destination}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:justify-end">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{meta.routeCode}</span>
                          <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700">{copy.baggageTag}</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{copy.refundTag}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.facts.map((fact) => (
                        <span key={`${item.id}-${fact.label}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {fact.label}: {fact.value}
                        </span>
                      ))}
                      {meta.highlightBadges.map((badge) => (
                        <span key={badge} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                          {badge}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5 text-xs leading-6 text-slate-500">
                      <p>{item.availabilityNote}</p>
                      <p>{item.statusNote}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center border-t border-[#dce8f6] bg-[linear-gradient(180deg,#f8fbff_0%,#fffaf6_100%)] p-4 xl:border-l xl:border-t-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.fareLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{copy.priceLabel}</p>
                    <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-[#ef4423]">{meta.price}</p>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">{meta.seatNote}</p>
                    <div className="mt-4 space-y-2">
                      <Link href={supportHref} className="block rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] py-2.5 text-center text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(239,68,35,0.58)] transition hover:brightness-105">
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
