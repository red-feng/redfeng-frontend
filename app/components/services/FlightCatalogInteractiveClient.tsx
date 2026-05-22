"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  CalendarIcon as CalendarFieldIcon,
  FlightSearchInteractiveField,
  FlightSearchTripTab,
  PlaneIcon as PlaneFieldIcon,
  SearchIcon,
  UsersIcon as UsersFieldIcon,
} from "@/app/components/flights/FlightSearchShared"
import { buildFlightCatalogQuery, type FlightTripMode } from "@/app/components/flights/flightSearchParams"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"

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
  return matchesFlightField(cabin, item.meta.cabin, item.group, item.title, item.statusNote, item.availabilityNote, item.highlights.join(" "))
}

function matchesFlightVia(via: string, tripMode: FlightTripMode, item: FlightItem) {
  if (tripMode !== "multi_city") return true
  if (!via.trim()) return true
  return matchesFlightField(via, item.title, item.location, item.meta.transit, item.statusNote, item.availabilityNote, item.highlights.join(" "))
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

export default function FlightCatalogInteractiveClient({
  items,
  emptyKeyword,
  searchPlaceholder,
  serviceCatalogHref,
  supportHref,
  copy,
  filterKeywordLabel,
  initialState,
}: {
  items: FlightItem[]
  emptyKeyword: string
  searchPlaceholder: string
  serviceCatalogHref: string
  supportHref: string
  copy: FlightCopy
  filterKeywordLabel: string
  initialState: FlightFilterState
}) {
  const [state, setState] = useState(initialState)
  const [draft, setDraft] = useState(initialState)
  const [isScrolled, setIsScrolled] = useState(false)
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
      setIsScrolled(window.scrollY > 180)
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

  const applyDraft = () => {
    setState(draft)
  }

  const syncDraftAndState = (updater: (current: FlightFilterState) => FlightFilterState) => {
    setDraft((current) => {
      const next = updater(current)
      setState(next)
      return next
    })
  }

  const resetAll = () => {
    const clearedState = {
      ...initialState,
      q: "",
      region: "",
      group: "",
      airlines: [],
      departWindows: [],
      transitTypes: [],
      priceBands: [],
    }
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
      <section className={homeLayoutLock.contentWidthClass}>
        <div className="rounded-[24px] border border-[#d8e9f7] bg-[linear-gradient(180deg,#f2f9ff_0%,#fbfdff_68%,#ffffff_100%)] px-4 py-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.14)] sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">{copy.searchSummary}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  {filteredItems.length} {copy.flightsFound}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topDetailChips.map((chip) => (
                  <div key={chip.label} className="rounded-[14px] border border-sky-100 bg-white px-3 py-2 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">{chip.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{chip.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-w-[420px] rounded-[18px] border border-sky-100 bg-white/90 px-4 py-3 text-xs leading-6 text-slate-500">
              <span className="font-semibold text-slate-900">{copy.topTitle}.</span> {copy.topBody}
            </div>
          </div>
        </div>
      </section>

      <section className={`${homeLayoutLock.contentWidthClass} sticky top-4 z-20 mt-4 transition-all duration-200 ${isScrolled ? "scale-[0.992]" : ""}`}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            applyDraft()
          }}
          className={`rounded-[20px] border border-[#d9e8f6] bg-[#1687e0] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-all duration-200 ${
            isScrolled ? "p-2.5 shadow-[0_20px_44px_-26px_rgba(15,23,42,0.24)]" : "p-3"
          }`}
        >
          <div className="mb-3 flex gap-2 overflow-x-auto border-b border-white/14 px-1 pb-2 text-sm font-medium text-white/92 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tripTabs.map((tab) => {
              const active = draft.tripMode === tab.key
              return (
                <FlightSearchTripTab
                  key={tab.key}
                  active={active}
                  label={tab.label}
                  tone="inverse"
                  onClick={() =>
                    syncDraftAndState((current) => ({
                      ...current,
                      tripMode: tab.key,
                      via: tab.key === "multi_city" ? current.via || initialState.via : "",
                      returnDate: tab.key === "round_trip" ? current.returnDate || initialState.returnDate : "",
                    }))
                  }
                />
              )
            })}
          </div>
          <div className={`rounded-[24px] bg-white/10 p-2 transition-all duration-200 ${isScrolled ? "p-1.5" : "p-2.5"}`}>
            <div
              className={`grid gap-2 transition-all duration-200 ${
                draft.tripMode === "one_way"
                  ? "xl:grid-cols-[1.15fr_1.15fr_0.9fr_1.25fr_64px]"
                  : draft.tripMode === "multi_city"
                    ? "xl:grid-cols-[1.05fr_1.05fr_1.05fr_0.9fr_1.25fr_64px]"
                    : "xl:grid-cols-[1.15fr_1.15fr_0.9fr_0.9fr_1.25fr_64px]"
              } ${isScrolled ? "xl:gap-1.5" : ""}`}
            >
              <FlightSearchInteractiveField icon={<PlaneFieldIcon />} label={copy.fromLabel} withChevron>
                <input value={draft.from} onChange={(event) => syncDraftAndState((current) => ({ ...current, from: event.target.value }))} className="w-full bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400" />
              </FlightSearchInteractiveField>
              {draft.tripMode === "multi_city" ? (
                <FlightSearchInteractiveField icon={<PlaneFieldIcon />} label={copy.viaLabel} withChevron>
                  <input value={draft.via} onChange={(event) => syncDraftAndState((current) => ({ ...current, via: event.target.value }))} className="w-full bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400" />
                </FlightSearchInteractiveField>
              ) : null}
              <FlightSearchInteractiveField icon={<PlaneFieldIcon />} label={copy.toLabel} withChevron>
                <input value={draft.to} onChange={(event) => syncDraftAndState((current) => ({ ...current, to: event.target.value }))} className="w-full bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400" />
              </FlightSearchInteractiveField>
              <FlightSearchInteractiveField icon={<CalendarFieldIcon />} label={copy.departLabel} withChevron>
                <input type="date" value={draft.depart} onChange={(event) => syncDraftAndState((current) => ({ ...current, depart: event.target.value }))} className="w-full bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none" />
              </FlightSearchInteractiveField>
              {draft.tripMode === "round_trip" ? (
                <FlightSearchInteractiveField icon={<CalendarFieldIcon />} label={copy.returnLabel} withChevron>
                  <input type="date" value={draft.returnDate} onChange={(event) => syncDraftAndState((current) => ({ ...current, returnDate: event.target.value }))} className="w-full bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none" />
                </FlightSearchInteractiveField>
              ) : null}
              <FlightSearchInteractiveField icon={<UsersFieldIcon />} label={copy.passengerClassLabel} withChevron>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
                  <input value={draft.passengers} onChange={(event) => syncDraftAndState((current) => ({ ...current, passengers: event.target.value }))} className="min-w-0 bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400" />
                  <input value={draft.cabin} onChange={(event) => syncDraftAndState((current) => ({ ...current, cabin: event.target.value }))} className="min-w-0 bg-transparent text-[15px] font-semibold leading-6 text-slate-950 outline-none placeholder:text-slate-400 sm:border-l sm:border-slate-200 sm:pl-2.5" />
                </div>
              </FlightSearchInteractiveField>
              <button type="submit" aria-label={copy.refineSearch} className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6541_0%,#ef4423_100%)] text-white shadow-[0_18px_34px_-18px_rgba(239,68,35,0.82)] transition hover:brightness-105 xl:mt-1 xl:h-[56px] xl:w-[56px] xl:self-center">
                <SearchIcon />
              </button>
            </div>
            <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
              <label className="block rounded-[18px] border border-white/20 bg-white/12 px-3 py-2.5 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.28)]">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">{filterKeywordLabel}</span>
                <input value={draft.q} onChange={(event) => syncDraftAndState((current) => ({ ...current, q: event.target.value }))} placeholder={searchPlaceholder} className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/55" />
              </label>
              <button type="submit" className="inline-flex items-center justify-center rounded-[16px] bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-[0_10px_24px_-18px_rgba(255,255,255,0.62)] transition hover:bg-sky-50">
                {copy.refineSearch}
              </button>
              <button type="button" onClick={resetAll} className="inline-flex items-center justify-center rounded-[16px] border border-white/30 bg-[#0f72c0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c6ab8]">
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
      </section>

      <section className={`${homeLayoutLock.contentWidthClass} mt-5 grid gap-4 lg:grid-cols-[272px_minmax(0,1fr)]`}>
        <aside className="space-y-3 lg:sticky lg:top-[8.2rem] lg:self-start">
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
