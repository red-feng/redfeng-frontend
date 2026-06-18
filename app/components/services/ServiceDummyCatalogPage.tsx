import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import FlightCatalogInteractiveClient from "@/app/components/services/FlightCatalogInteractiveClient"
import { isFlightTripMode, normalizeFlightLocationLabel } from "@/app/components/flights/flightSearchParams"
import {
  getServiceAvailabilityLabel,
  getServiceAvailabilityTone,
  servicePageConfigBySlug,
} from "@/app/components/services/serviceCatalog"
import { getCurrentLocale } from "@/lib/locale"
import { getDummyServiceCatalog, type DummyCatalogItem, type DummyServiceSlug } from "@/lib/service-dummy-catalog"
import { buildFlightCatalogItems } from "@/lib/flights/flightCatalogService"

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || ""
}

function allQueryValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean)
  const normalized = String(value || "").trim()
  return normalized ? [normalized] : []
}

function filterItems(items: DummyCatalogItem[], keyword: string, region: string, group: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  return items.filter((item) => {
    const matchesKeyword =
      normalizedKeyword.length === 0 ||
      item.title.toLowerCase().includes(normalizedKeyword) ||
      item.location.toLowerCase().includes(normalizedKeyword) ||
      item.highlights.some((highlight) => highlight.toLowerCase().includes(normalizedKeyword))
    const matchesRegion = !region || item.region === region
    const matchesGroup = !group || item.group === group
    return matchesKeyword && matchesRegion && matchesGroup
  })
}

function getHotelStayNights(checkin: string, checkout: string) {
  const start = new Date(`${checkin}T00:00:00`)
  const end = new Date(`${checkout}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}

function filterHotelItems(
  items: DummyCatalogItem[],
  params: {
    keyword: string
    checkin: string
    checkout: string
    adults: string
    children: string
    rooms: string
  },
) {
  const adults = Number(params.adults || "0")
  const children = Number(params.children || "0")
  const rooms = Math.max(1, Number(params.rooms || "1"))
  const guests = adults + children
  const nights = getHotelStayNights(params.checkin, params.checkout)
  const hasStaySignal = Boolean(params.keyword || params.checkin || params.checkout || params.adults || params.children || params.rooms)
  if (!hasStaySignal) return items

  return items.filter((item) => {
    const text = `${item.title} ${item.location} ${item.group} ${item.highlights.join(" ")} ${item.facts.map((fact) => `${fact.label} ${fact.value}`).join(" ")}`.toLowerCase()
    const isCompact = item.id.includes("compact") || item.group.toLowerCase().includes("compact") || text.includes("transit")
    const isBusiness = item.id.includes("business") || item.group.toLowerCase().includes("business") || text.includes("weekday")
    const isFamily = text.includes("family") || text.includes("resort") || text.includes("beach")
    const isUrban = text.includes("urban") || text.includes("city")

    if (guests >= 4 && isCompact) return false
    if (children > 0 && isCompact) return false
    if (rooms >= 2 && isCompact) return false
    if (nights >= 4 && (isCompact || isBusiness)) return false
    if (nights >= 3 && isUrban && children > 0 && !isFamily) return false
    if (guests <= 2 && nights <= 2) return true
    if (children > 0) return isFamily || !isCompact
    if (guests >= 3) return isFamily || isBusiness || isUrban
    if (nights >= 3) return isFamily || isUrban
    return true
  })
}

function formatHotelStaySummary(params: {
  locale: string
  checkin: string
  checkout: string
  adults: string
  children: string
  rooms: string
}) {
  const adults = Number(params.adults || "0")
  const children = Number(params.children || "0")
  const rooms = Number(params.rooms || "0")
  const nights = getNightCount(params.checkin, params.checkout)

  if (params.locale === "en") {
    return [
      params.checkin && params.checkout ? `${params.checkin} to ${params.checkout}` : "",
      adults || children || rooms ? `${adults} adults, ${children} children, ${rooms} rooms` : "",
      nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "",
    ].filter(Boolean)
  }

  if (params.locale === "zh") {
    return [
      params.checkin && params.checkout ? `${params.checkin} 至 ${params.checkout}` : "",
      adults || children || rooms ? `${adults}位成人，${children}位儿童，${rooms}间房` : "",
      nights > 0 ? `${nights}晚` : "",
    ].filter(Boolean)
  }

  return [
    params.checkin && params.checkout ? `${params.checkin} sampai ${params.checkout}` : "",
    adults || children || rooms ? `${adults} dewasa, ${children} anak, ${rooms} kamar` : "",
    nights > 0 ? `${nights} malam` : "",
  ].filter(Boolean)
}

function getNightCount(checkin: string, checkout: string) {
  return getHotelStayNights(checkin, checkout)
}

const HOTEL_DEFAULT_CHECKIN = "2026-06-24"
const HOTEL_DEFAULT_CHECKOUT = "2026-06-27"

const HOTEL_STARTING_PRICE_BY_ID: Record<string, number> = {
  "hotel-bali-resort": 1248000,
  "hotel-jakarta-business": 930000,
  "hotel-singapore-city": 2360000,
  "hotel-tokyo-compact": 1680000,
}

function formatIdrCompact(value: number) {
  return `IDR ${Math.max(value, 0).toLocaleString("id-ID")}`
}

function getHotelFactValue(item: DummyCatalogItem, label: string) {
  return item.facts.find((fact) => fact.label.toLowerCase() === label.toLowerCase())?.value || ""
}

function getHotelStartingPrice(item: DummyCatalogItem) {
  return HOTEL_STARTING_PRICE_BY_ID[item.id] || (item.region === "Asia" ? 1880000 : 980000)
}

function getHotelMaxGuests(item: DummyCatalogItem) {
  const text = `${item.title} ${item.group} ${item.highlights.join(" ")}`.toLowerCase()
  if (text.includes("compact") || text.includes("transit")) return 2
  if (text.includes("family") || text.includes("resort")) return 4
  return 3
}

function buildHotelInteractiveItems(
  items: DummyCatalogItem[],
  params: {
    checkin: string
    checkout: string
  },
) {
  const checkin = params.checkin || HOTEL_DEFAULT_CHECKIN
  const checkout = params.checkout || HOTEL_DEFAULT_CHECKOUT
  const nights = Math.max(1, getNightCount(checkin, checkout) || getNightCount(HOTEL_DEFAULT_CHECKIN, HOTEL_DEFAULT_CHECKOUT))

  return items.map((item) => {
    const star = getHotelFactValue(item, "Star") || item.highlights.find((highlight) => highlight.toLowerCase().includes("star")) || "Hotel"
    const stayCue = getHotelFactValue(item, "Stay cue") || item.group

    return {
      ...item,
      meta: {
        airline: item.title,
        flightNumber: item.id.toUpperCase().replace(/[^A-Z0-9]/g, "-"),
        departure: "14:00",
        arrival: "12:00",
        duration: `${nights} malam`,
        transit: "Langsung",
        price: formatIdrCompact(getHotelStartingPrice(item)),
        seatNote: item.availabilityNote,
        origin: item.location,
        destination: item.group,
        routeCode: item.location,
        cabin: star,
        tripLabel: stayCue,
        highlightBadges: item.highlights,
        maxPassengers: getHotelMaxGuests(item),
        tripSupport: ["one_way", "round_trip"] as FlightTripMode[],
        availableDates: Array.from(new Set([checkin, checkout, HOTEL_DEFAULT_CHECKIN, HOTEL_DEFAULT_CHECKOUT].filter(Boolean))),
      },
    }
  })
}

function buildCatalogHref(
  baseHref: string,
  params: Record<string, string | string[] | undefined>,
) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.forEach((entry) => {
      const normalized = String(entry || "").trim()
      if (normalized) searchParams.append(key, normalized)
    })
  })
  const query = searchParams.toString()
  return query ? `${baseHref}?${query}` : baseHref
}

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

function getFlightFilterLinkClass(active: boolean) {
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

export default async function ServiceDummyCatalogPage({
  slug,
  searchParams,
}: {
  slug: DummyServiceSlug
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const locale = await getCurrentLocale()
  const resolvedSearchParams = (await searchParams) || {}
  const service = servicePageConfigBySlug[slug]
  const catalog = getDummyServiceCatalog(slug)

  const keyword = firstQueryValue(resolvedSearchParams.q)
  const selectedRegion = firstQueryValue(resolvedSearchParams.region)
  const selectedGroup = firstQueryValue(resolvedSearchParams.group)
  const flightTrip = firstQueryValue(resolvedSearchParams.trip) || "one_way"
  const rawFlightFrom = firstQueryValue(resolvedSearchParams.from)
  const rawFlightTo = firstQueryValue(resolvedSearchParams.to)
  const flightFrom = normalizeFlightLocationLabel(rawFlightFrom || "SUB Surabaya")
  const flightVia = normalizeFlightLocationLabel(firstQueryValue(resolvedSearchParams.via) || "Singapore")
  const flightTo = normalizeFlightLocationLabel(rawFlightTo || "CGK Jakarta")
  const flightDepart = firstQueryValue(resolvedSearchParams.depart) || "2026-06-24"
  const flightReturn = firstQueryValue(resolvedSearchParams.return) || "2026-06-27"
  const flightPassengers = firstQueryValue(resolvedSearchParams.passengers) || "1 Dewasa"
  const flightCabin = firstQueryValue(resolvedSearchParams.cabin) || "Economy"
  const flightSort = firstQueryValue(resolvedSearchParams.sort) || "best"
  const flightAirlines = allQueryValues(resolvedSearchParams.airline)
  const flightDepartWindows = allQueryValues(resolvedSearchParams.depart_window)
  const flightTransitTypes = allQueryValues(resolvedSearchParams.transit_type)
  const flightPriceBands = allQueryValues(resolvedSearchParams.price_band)
  const hotelCheckin = firstQueryValue(resolvedSearchParams.checkin)
  const hotelCheckout = firstQueryValue(resolvedSearchParams.checkout)
  const hotelAdults = firstQueryValue(resolvedSearchParams.adults)
  const hotelChildren = firstQueryValue(resolvedSearchParams.children)
  const hotelRooms = firstQueryValue(resolvedSearchParams.rooms)
  const baseFilteredItems = filterItems(catalog.items, keyword, selectedRegion, selectedGroup)
  const filteredItems =
    slug === "hotel"
      ? filterHotelItems(baseFilteredItems, {
          keyword,
          checkin: hotelCheckin,
          checkout: hotelCheckout,
          adults: hotelAdults,
          children: hotelChildren,
          rooms: hotelRooms,
        })
      : baseFilteredItems
  const availableRegions = [...new Set(catalog.items.map((item) => item.region))]
  const availableGroups = [...new Set(catalog.items.map((item) => item.group))]
  const catalogUiCopy = locale === "en" ? catalog.uiCopy.en : catalog.uiCopy.id
  const hotelSummaryLines =
    slug === "hotel"
      ? formatHotelStaySummary({
          locale,
          checkin: hotelCheckin,
          checkout: hotelCheckout,
          adults: hotelAdults,
          children: hotelChildren,
          rooms: hotelRooms,
        })
      : []
  const affiliateFlightSearchResult =
    slug === "pesawat"
      ? await buildFlightCatalogItems({
          items: filteredItems,
          locale,
          trip: flightTrip,
          rawFrom: rawFlightFrom || flightFrom,
          rawTo: rawFlightTo || flightTo,
          depart: flightDepart,
          returnDate: flightReturn,
          passengers: flightPassengers,
          cabin: flightCabin,
          sort: flightSort,
          airlines: flightAirlines,
          departWindows: flightDepartWindows,
          transitTypes: flightTransitTypes,
          priceBands: flightPriceBands,
          isFlightTripMode,
        })
      : { items: [], source: "fallback" as const }
  const flightItems = slug === "pesawat" ? affiliateFlightSearchResult.items : []
  const flightDataSource = slug === "pesawat" ? affiliateFlightSearchResult.source : "fallback"


  const copy = {
    id: {
      eyebrow: `Katalog ${service.shortLabel}`,
      title: `Jelajahi katalog dummy ${service.shortLabel.toLowerCase()} dengan struktur yang siap disambungkan nanti.`,
      body: `Halaman ini sengaja dibuat sebagai katalog dummy, bukan fitur live palsu. Tim bisa memakai fondasi ini untuk menata inventory, filter, dan promosi ${service.shortLabel.toLowerCase()} sebelum checkout customer benar-benar aktif.`,
      searchTitle: `Cari ${catalogUiCopy.searchNoun}`,
      searchBody: `Gunakan kata kunci, region, atau tipe katalog untuk melihat bentuk hasil ${catalogUiCopy.resultNoun} yang nanti bisa dihubungkan ke data live.`,
      searchButton: "Lihat hasil contoh",
      resetButton: "Reset",
      resultTitle: catalogUiCopy.resultTitle,
      resultCount: `${filteredItems.length} ${catalogUiCopy.resultNoun}`,
      dummyBadge: "Katalog dummy",
      emptyTitle: "Belum ada hasil yang cocok",
      emptyBody: "Coba ganti kata kunci atau reset filter untuk melihat contoh katalog lainnya.",
      emptyAction: "Kembali ke semua contoh",
      supportTitle: "Catatan fondasi",
      supportBody: "Data di bawah ini hanya contoh untuk menguji struktur katalog, filter, dan presentasi produk. Belum ada checkout live atau inventory customer langsung.",
      stickySummary: `Cari contoh ${service.shortLabel.toLowerCase()} dengan format katalog baru`,
      stickyLabel: "Buka filter",
      supportCta: "Butuh bantuan?",
      promoCta: "Lihat promo",
      landingCta: `Kembali ke landing ${service.shortLabel.toLowerCase()}`,
      filterRegion: catalogUiCopy.regionLabel,
      filterGroup: catalogUiCopy.groupLabel,
      filterKeyword: catalogUiCopy.keywordLabel,
      rightTitle: "Status fondasi",
      rightBody: service.status,
      chipTarget: "Siap sambung",
      chipStatus: "Dummy inventory",
      highlightsTitle: "Fokus tahap ini",
      locationLabel: catalogUiCopy.locationLabel,
    },
    en: {
      eyebrow: `${service.shortLabel} Catalog`,
      title: `Explore a dummy ${service.shortLabel.toLowerCase()} catalog built for future integration.`,
      body: `This page is intentionally a dummy catalog, not a fake live feature. The team can use it to shape ${service.shortLabel.toLowerCase()} inventory, filters, and promotions before customer checkout is truly enabled.`,
      searchTitle: `Search ${catalogUiCopy.searchNoun}`,
      searchBody: `Use keyword, region, or catalog type to preview how these ${catalogUiCopy.resultNoun} will behave once live data is connected.`,
      searchButton: "View sample results",
      resetButton: "Reset",
      resultTitle: catalogUiCopy.resultTitle,
      resultCount: `${filteredItems.length} ${catalogUiCopy.resultNoun}`,
      dummyBadge: "Dummy catalog",
      emptyTitle: "No matching sample found",
      emptyBody: "Try another keyword or reset filters to see more sample catalog entries.",
      emptyAction: "Back to all samples",
      supportTitle: "Foundation note",
      supportBody: "The entries below are sample inventory only. They exist to validate catalog structure, filters, and product presentation before live checkout is introduced.",
      stickySummary: `Browse sample ${service.shortLabel.toLowerCase()} cards in the new catalog family`,
      stickyLabel: "Open filters",
      supportCta: "Need help?",
      promoCta: "View promos",
      landingCta: `Back to ${service.shortLabel.toLowerCase()} landing`,
      filterRegion: catalogUiCopy.regionLabel,
      filterGroup: catalogUiCopy.groupLabel,
      filterKeyword: catalogUiCopy.keywordLabel,
      rightTitle: "Foundation status",
      rightBody: service.status,
      chipTarget: "Ready to connect",
      chipStatus: "Dummy inventory",
      highlightsTitle: "Current focus",
      locationLabel: catalogUiCopy.locationLabel,
    },
    zh: {
      eyebrow: `${service.shortLabel} 目录`,
      title: `查看为后续接入准备好的 ${service.shortLabel} 示例目录。`,
      body: `这个页面刻意保持为示例目录，而不是伪装成真实下单功能。团队可以先用它整理 ${service.shortLabel} 的目录结构、筛选方式与促销展示。`,
      searchTitle: `搜索 ${service.shortLabel} 示例需求`,
      searchBody: "使用关键词、区域或目录类型，预览后续接入实时数据后的目录形态。",
      searchButton: "查看示例结果",
      resetButton: "重置",
      resultTitle: "示例目录结果",
      resultCount: `${filteredItems.length} 个示例结果`,
      dummyBadge: "示例目录",
      emptyTitle: "没有匹配的示例",
      emptyBody: "请更换关键词或重置筛选，查看其他示例目录。",
      emptyAction: "返回全部示例",
      supportTitle: "基础说明",
      supportBody: "以下内容仅为示例 inventory，用于验证目录结构、筛选体验与产品展示，并不代表已开启实时下单。",
      stickySummary: `浏览新的 ${service.shortLabel} 示例目录`,
      stickyLabel: "打开筛选",
      supportCta: "需要帮助？",
      promoCta: "查看促销",
      landingCta: `返回 ${service.shortLabel} 落地页`,
      filterRegion: "区域",
      filterGroup: "目录类型",
      filterKeyword: "关键词",
      rightTitle: "基础状态",
      rightBody: service.status,
      chipTarget: "待接入",
      chipStatus: "示例 inventory",
      highlightsTitle: "当前重点",
      locationLabel: "位置",
    },
  }[locale]

  if (slug === "hotel" && resolvedSearchParams.interactive !== "legacy") {
    const hotelCopy =
      locale === "en"
        ? {
            searchSummary: "Stay summary",
            topTitle: "A RedFeng hotel catalog with the same focused OTA flow",
            topBody: "Hotel now uses the same catalog rhythm as flight: search summary on top, filters on the left, results in the middle, and clear price actions on every property card.",
            refineSearch: "Refine stay",
            roundTrip: "Stay Dates",
            oneWay: "Flexible Stay",
            multiCity: "Multi Area",
            fromLabel: "Destination",
            viaLabel: "Area",
            toLabel: "Property type",
            departLabel: "Check-in",
            returnLabel: "Check-out",
            passengerLabel: "Guests",
            passengerClassLabel: "Guests & Rooms",
            cabinLabel: "Room",
            allRegions: "All regions",
            allGroups: "All property types",
            allAirlines: "All properties",
            allDepartWindows: "All check-in times",
            allTransitTypes: "All access",
            allPriceBands: "All prices",
            flightsFound: "hotel options",
            sortLabel: "Sort by",
            sortBest: "Best choice",
            sortPrice: "Lowest price",
            sortEarly: "Earliest check-in",
            sortDepartLate: "Latest check-in",
            sortArriveEarly: "Earliest check-out",
            sortArriveLate: "Latest check-out",
            refundTag: "Stay window ready",
            baggageTag: "Room curated",
            activeFilters: "Active filters",
            leftTitle: "Filter results",
            leftBody: "The hotel rail follows the flight catalog structure so users scan both products with the same mental model.",
            regionBlock: "Region",
            tripBlock: "Property type",
            airlineBlock: "Property",
            departWindowBlock: "Check-in time",
            transitBlock: "Access",
            priceBlock: "Price range",
            departMorning: "Morning",
            departAfternoon: "Afternoon",
            departEvening: "Evening",
            directOnly: "Main area",
            transitAllowed: "Area / mixed",
            priceBudget: "Below 1.5m",
            priceMid: "1.5m - 3m",
            pricePremium: "Above 3m",
            resetFilters: "Reset all",
            priceLabel: "Starting from",
            chooseLabel: "Ask availability",
            fareLabel: "Hotel reference",
            supportHint: "Hotel checkout is not live yet. Red Feng can help validate availability manually.",
            fallbackHint: "Showing curated hotel catalog results while live inventory is prepared.",
            unitLabel: "/night",
            emptyTitle: "No matching hotels found",
            emptyBody: "Try widening the region, property type, or stay filters to bring results back.",
          }
        : locale === "zh"
          ? {
              searchSummary: "ä½å®¿æ‘˜è¦",
              topTitle: "ä½¿ç”¨åŒæ · OTA ç»“æž„çš„ RedFeng é…’åº—ç›®å½•",
              topBody: "é…’åº—ç›®å½•çŽ°åœ¨ä½¿ç”¨ä¸Žæœºç¥¨ç›®å½•ç›¸åŒçš„èŠ‚å¥ï¼šä¸Šæ–¹æœç´¢æ‘˜è¦ã€å·¦ä¾§ç­›é€‰ã€ä¸­é—´ç»“æžœï¼Œæ¯å¼ é…’åº—å¡ç‰‡éƒ½æœ‰æ¸…æ¥šçš„ä»·æ ¼ä¸Žæ“ä½œã€‚",
              refineSearch: "è°ƒæ•´ä½å®¿",
              roundTrip: "å…¥ä½æ—¥æœŸ",
              oneWay: "çµæ´»ä½å®¿",
              multiCity: "å¤šåŒºåŸŸ",
              fromLabel: "ç›®çš„åœ°",
              viaLabel: "åŒºåŸŸ",
              toLabel: "é…’åº—ç±»åž‹",
              departLabel: "å…¥ä½",
              returnLabel: "é€€æˆ¿",
              passengerLabel: "ä½å®¢",
              passengerClassLabel: "ä½å®¢ä¸Žæˆ¿é—´",
              cabinLabel: "æˆ¿é—´",
              allRegions: "å…¨éƒ¨åŒºåŸŸ",
              allGroups: "å…¨éƒ¨ç±»åž‹",
              allAirlines: "å…¨éƒ¨é…’åº—",
              allDepartWindows: "å…¨éƒ¨å…¥ä½æ—¶é—´",
              allTransitTypes: "å…¨éƒ¨ä½ç½®",
              allPriceBands: "å…¨éƒ¨ä»·æ ¼",
              flightsFound: "ä¸ªé…’åº—é€‰é¡¹",
              sortLabel: "æŽ’åº",
              sortBest: "æŽ¨èä¼˜å…ˆ",
              sortPrice: "æœ€ä½Žä»·æ ¼",
              sortEarly: "æœ€æ—©å…¥ä½",
              sortDepartLate: "æœ€æ™šå…¥ä½",
              sortArriveEarly: "æœ€æ—©é€€æˆ¿",
              sortArriveLate: "æœ€æ™šé€€æˆ¿",
              refundTag: "ä½å®¿çª—å£",
              baggageTag: "ç²¾é€‰æˆ¿åž‹",
              activeFilters: "å½“å‰ç­›é€‰",
              leftTitle: "ç­›é€‰ç»“æžœ",
              leftBody: "é…’åº—ç­›é€‰åŒºä¿æŒä¸Žæœºç¥¨ç›®å½•ç›¸åŒçš„æ‰«è¯»æ–¹å¼ã€‚",
              regionBlock: "åŒºåŸŸ",
              tripBlock: "é…’åº—ç±»åž‹",
              airlineBlock: "é…’åº—",
              departWindowBlock: "å…¥ä½æ—¶é—´",
              transitBlock: "ä½ç½®",
              priceBlock: "ä»·æ ¼èŒƒå›´",
              departMorning: "ä¸Šåˆ",
              departAfternoon: "ä¸‹åˆ",
              departEvening: "æ™šä¸Š",
              directOnly: "ä¸»è¦åŒºåŸŸ",
              transitAllowed: "åŒºåŸŸ / æ··åˆ",
              priceBudget: "ä½ŽäºŽ 150 ä¸‡",
              priceMid: "150 ä¸‡ - 300 ä¸‡",
              pricePremium: "é«˜äºŽ 300 ä¸‡",
              resetFilters: "é‡ç½®å…¨éƒ¨",
              priceLabel: "èµ·ä»·",
              chooseLabel: "è¯¢é—®åº“å­˜",
              fareLabel: "é…’åº—å‚è€ƒ",
              supportHint: "é…’åº—ç»“è´¦å°šæœªå¼€å¯ï¼ŒRed Feng å¯ååŠ©æ‰‹åŠ¨ç¡®è®¤åº“å­˜ã€‚",
              fallbackHint: "å®žæ—¶é…’åº—åº“å­˜å‡†å¤‡ä¸­ï¼Œå½“å‰æ˜¾ç¤ºç²¾é€‰ç›®å½•ã€‚",
              unitLabel: "/night",
              emptyTitle: "æ²¡æœ‰åŒ¹é…çš„é…’åº—",
              emptyBody: "è¯·æ”¾å®½åŒºåŸŸã€é…’åº—ç±»åž‹æˆ–ä½å®¿ç­›é€‰åŽå†è¯•ã€‚",
            }
          : {
              searchSummary: "Ringkasan stay",
              topTitle: "Katalog hotel RedFeng dengan alur OTA seperti katalog pesawat",
              topBody: "Hotel sekarang memakai ritme katalog yang sama dengan pesawat: ringkasan pencarian di atas, filter di kiri, hasil di tengah, lalu harga dan aksi yang jelas di setiap card properti.",
              refineSearch: "Ubah pencarian",
              roundTrip: "Tanggal Menginap",
              oneWay: "Stay Fleksibel",
              multiCity: "Multi Area",
              fromLabel: "Destinasi",
              viaLabel: "Area",
              toLabel: "Tipe properti",
              departLabel: "Check-in",
              returnLabel: "Check-out",
              passengerLabel: "Tamu",
              passengerClassLabel: "Tamu & Kamar",
              cabinLabel: "Kamar",
              allRegions: "Semua region",
              allGroups: "Semua tipe properti",
              allAirlines: "Semua properti",
              allDepartWindows: "Semua jam check-in",
              allTransitTypes: "Semua akses",
              allPriceBands: "Semua harga",
              flightsFound: "opsi hotel",
              sortLabel: "Urutkan",
              sortBest: "Pilihan terbaik",
              sortPrice: "Harga terendah",
              sortEarly: "Check-in paling awal",
              sortDepartLate: "Check-in paling akhir",
              sortArriveEarly: "Check-out paling awal",
              sortArriveLate: "Check-out paling akhir",
              refundTag: "Stay window siap",
              baggageTag: "Room curated",
              activeFilters: "Filter aktif",
              leftTitle: "Saring hasil",
              leftBody: "Panel kiri hotel mengikuti struktur katalog pesawat supaya user membaca dua produk ini dengan pola yang sama.",
              regionBlock: "Region",
              tripBlock: "Tipe properti",
              airlineBlock: "Properti",
              departWindowBlock: "Jam check-in",
              transitBlock: "Akses",
              priceBlock: "Rentang harga",
              departMorning: "Pagi",
              departAfternoon: "Siang - sore",
              departEvening: "Malam",
              directOnly: "Area utama",
              transitAllowed: "Area / mixed",
              priceBudget: "Di bawah 1.5 jt",
              priceMid: "1.5 jt - 3 jt",
              pricePremium: "Di atas 3 jt",
              resetFilters: "Reset semua",
              priceLabel: "Mulai dari",
              chooseLabel: "Cek ketersediaan",
              fareLabel: "Referensi hotel",
              supportHint: "Checkout hotel belum live. Red Feng bisa bantu validasi availability secara manual.",
              fallbackHint: "Menampilkan katalog hotel curated sambil menunggu inventory live disiapkan.",
              unitLabel: "/malam",
              emptyTitle: "Belum ada hotel yang cocok",
              emptyBody: "Coba longgarkan region, tipe properti, atau filter stay agar daftar hasil muncul lagi.",
            }
    const hotelCheckinDate = hotelCheckin || HOTEL_DEFAULT_CHECKIN
    const hotelCheckoutDate = hotelCheckout || HOTEL_DEFAULT_CHECKOUT
    const hotelAdultsCount = Math.max(Number(hotelAdults || "2"), 1)
    const hotelChildrenCount = Math.max(Number(hotelChildren || "0"), 0)
    const hotelPassengerLabel = [
      `${hotelAdultsCount} Dewasa`,
      hotelChildrenCount ? `${hotelChildrenCount} Anak` : "",
    ].filter(Boolean).join(", ")

    return (
      <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#f9fbff_16%,#fffdfa_48%,#f3f6fb_100%)] pb-36 md:pb-0">
        <PublicInstallPrompt locale={locale} />
        <PublicHeader locale={locale} variant="default" />
        <FlightCatalogInteractiveClient
          items={buildHotelInteractiveItems(filteredItems, {
            checkin: hotelCheckinDate,
            checkout: hotelCheckoutDate,
          })}
          dataSource="fallback"
          emptyKeyword={catalog.emptyKeyword}
          searchPlaceholder={catalog.searchPlaceholder}
          serviceCatalogHref={service.catalogHref}
          supportHref={catalog.supportHref}
          copy={hotelCopy}
          filterKeywordLabel={copy.filterKeyword}
          locale={locale}
          resultHrefMode="support"
          initialState={{
            tripMode: hotelCheckout ? "round_trip" : "one_way",
            q: keyword,
            region: selectedRegion,
            group: selectedGroup,
            from: keyword,
            via: "",
            to: "",
            depart: hotelCheckinDate,
            returnDate: hotelCheckout ? hotelCheckoutDate : "",
            passengers: hotelPassengerLabel,
            cabin: "",
            sort: flightSort,
            airlines: flightAirlines,
            departWindows: flightDepartWindows,
            transitTypes: flightTransitTypes,
            priceBands: flightPriceBands,
          }}
        />
        <PublicStickyAction
          locale={locale}
          href="#top"
          label={hotelCopy.refineSearch}
          summary={hotelCopy.topTitle}
          secondaryHref={catalog.promoHref}
          secondaryLabel={copy.promoCta}
        />
        <PublicMobileNav locale={locale} />
      </div>
    )
  }

  if (slug === "pesawat" && resolvedSearchParams.interactive !== "legacy") {
    const flightCopy =
      locale === "en"
        ? {
            searchSummary: "Search summary",
            topTitle: "A RedFeng flight catalog with a sharper OTA-style flow",
            topBody: "We borrow the OTA layout logic: search summary on top, filters on the left, results in the middle, and very clear pricing actions. The visual system stays warmer and calmer so it still feels like RedFeng.",
            refineSearch: "Refine search",
            roundTrip: "Round Trip",
            oneWay: "One Way",
              multiCity: "Multi City",
              fromLabel: "From",
              viaLabel: "Transit",
              toLabel: "To",
            departLabel: "Depart",
            returnLabel: "Return",
            passengerLabel: "Passengers",
            passengerClassLabel: "Passengers & Class",
            cabinLabel: "Cabin",
            allRegions: "All regions",
            allGroups: "All trip types",
            allAirlines: "All airlines",
            allDepartWindows: "All times",
            allTransitTypes: "All transit options",
            allPriceBands: "All prices",
            flightsFound: "flight options",
            sortLabel: "Sort by",
            sortBest: "Best choice",
            sortPrice: "Lowest price",
            sortEarly: "Earliest departure",
            sortDepartLate: "Latest departure",
            sortArriveEarly: "Earliest arrival",
            sortArriveLate: "Latest arrival",
            refundTag: "Reschedule ready",
            baggageTag: "Cabin baggage",
            activeFilters: "Active filters",
            leftTitle: "Filter results",
            leftBody: "The left rail follows OTA behavior, but stays cleaner so users can scan quickly without feeling crowded.",
            regionBlock: "Region",
            tripBlock: "Trip type",
            airlineBlock: "Airline",
            departWindowBlock: "Departure time",
            transitBlock: "Transit",
            priceBlock: "Price range",
            departMorning: "Morning to noon",
            departAfternoon: "Noon to evening",
            departEvening: "Evening",
            directOnly: "Direct only",
            transitAllowed: "Transit / mixed",
            priceBudget: "Below 1.5m",
            priceMid: "1.5m - 3m",
            pricePremium: "Above 3m",
            resetFilters: "Reset all",
            priceLabel: "Starting from",
            chooseLabel: "Choose",
            fareLabel: "Fare reference",
            supportHint: "Live fares are shown from our affiliate supplier for this route and date.",
            emptyTitle: "No matching flights found",
            emptyBody: "Try widening the region or trip type to bring results back.",
          }
        : locale === "zh"
          ? {
              searchSummary: "搜索摘要",
              topTitle: "更聚焦 OTA 节奏的 RedFeng 航班目录",
              topBody: "我们借鉴 OTA 的结构逻辑：顶部搜索摘要、左侧筛选、中间结果，以及非常清晰的价格与行动区，同时保留更温暖、更从容的 RedFeng 视觉气质。",
              refineSearch: "调整搜索",
              roundTrip: "往返",
              oneWay: "单程",
              multiCity: "多城市",
              fromLabel: "出发地",
              viaLabel: "中转",
              toLabel: "目的地",
              departLabel: "出发",
              returnLabel: "返程",
              passengerLabel: "乘客",
              passengerClassLabel: "乘客与舱位",
              cabinLabel: "舱位",
              allRegions: "全部区域",
              allGroups: "全部行程类型",
              allAirlines: "全部航司",
              allDepartWindows: "全部时间",
              allTransitTypes: "全部中转",
              allPriceBands: "全部价格",
              flightsFound: "个示例航班",
              sortLabel: "排序",
              sortBest: "推荐优先",
              sortPrice: "最低价格",
              sortEarly: "最早出发",
              sortDepartLate: "最晚出发",
              sortArriveEarly: "最早到达",
              sortArriveLate: "最晚到达",
              refundTag: "可改期",
              baggageTag: "含手提行李",
              activeFilters: "当前筛选",
              leftTitle: "筛选结果",
              leftBody: "左侧筛选区沿用 OTA 习惯，但保持更清爽的节奏，方便快速浏览。",
              regionBlock: "区域",
              tripBlock: "行程类型",
              airlineBlock: "航空公司",
              departWindowBlock: "出发时间",
              transitBlock: "中转",
              priceBlock: "价格范围",
              departMorning: "上午至中午",
              departAfternoon: "中午至傍晚",
              departEvening: "晚上",
              directOnly: "仅直飞",
              transitAllowed: "中转 / 混合",
              priceBudget: "低于 150 万",
              priceMid: "150 万 - 300 万",
              pricePremium: "高于 300 万",
              resetFilters: "重置全部",
              priceLabel: "起价",
              chooseLabel: "选择",
              fareLabel: "示例票价",
              supportHint: "当前显示的是该航线与日期的实时票价结果。",
              emptyTitle: "没有匹配的示例航班",
              emptyBody: "请放宽区域或行程类型后再试一次。",
            }
          : {
              searchSummary: "Ringkasan pencarian",
              topTitle: "Katalog pesawat RedFeng dengan alur OTA yang lebih fokus",
              topBody: "Kami ambil pola layout OTA: ringkasan pencarian di atas, filter di kiri, hasil di tengah, lalu harga dan aksi yang sangat jelas. Visualnya tetap dibuat lebih hangat dan lapang agar terasa RedFeng.",
              refineSearch: "Ubah pencarian",
              roundTrip: "Pulang - Pergi",
              oneWay: "Sekali Jalan",
              multiCity: "Multi Kota",
              fromLabel: "Dari",
              viaLabel: "Transit",
              toLabel: "Ke",
              departLabel: "Berangkat",
              returnLabel: "Pulang",
              passengerLabel: "Penumpang",
              passengerClassLabel: "Penumpang & Kelas",
              cabinLabel: "Kabin",
              allRegions: "Semua region",
              allGroups: "Semua tipe",
              allAirlines: "Semua maskapai",
              allDepartWindows: "Semua jam",
              allTransitTypes: "Semua transit",
              allPriceBands: "Semua harga",
              flightsFound: "opsi penerbangan",
              sortLabel: "Urutkan",
              sortBest: "Pilihan terbaik",
              sortPrice: "Harga terendah",
              sortEarly: "Berangkat paling pagi",
              sortDepartLate: "Berangkat paling akhir",
              sortArriveEarly: "Tiba paling awal",
              sortArriveLate: "Tiba paling akhir",
              refundTag: "Bisa reschedule",
              baggageTag: "Bagasi kabin",
              activeFilters: "Filter aktif",
              leftTitle: "Saring hasil",
              leftBody: "Panel kiri dibuat seperti OTA, tetapi lebih bersih supaya user cepat scan tanpa merasa sesak.",
              regionBlock: "Region",
              tripBlock: "Tipe perjalanan",
              airlineBlock: "Maskapai",
              departWindowBlock: "Jam berangkat",
              transitBlock: "Transit",
              priceBlock: "Rentang harga",
              departMorning: "Pagi - siang",
              departAfternoon: "Siang - sore",
              departEvening: "Malam",
              directOnly: "Langsung",
              transitAllowed: "Transit / mixed",
              priceBudget: "Di bawah 1.5 jt",
              priceMid: "1.5 jt - 3 jt",
              pricePremium: "Di atas 3 jt",
              resetFilters: "Reset semua",
              priceLabel: "Mulai dari",
              chooseLabel: "Pilih",
              fareLabel: "Referensi fare",
              supportHint: "Menampilkan fare live dari supplier affiliate untuk rute dan tanggal ini.",
              emptyTitle: "Belum ada penerbangan yang cocok",
              emptyBody: "Coba longgarkan region atau tipe perjalanan agar daftar hasil muncul lagi.",
            }
    const flightFallbackHint =
      locale === "en"
        ? "Showing fallback catalog results because the live supplier is slow or did not return matching fares yet."
        : locale === "zh"
          ? "由于实时供应商响应较慢或暂未返回匹配票价，当前显示的是后备目录结果。"
          : "Menampilkan hasil cadangan karena supplier live sedang lambat atau belum mengembalikan fare yang cocok."

    return (
      <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#f9fbff_16%,#fffdfa_48%,#f3f6fb_100%)] pb-36 md:pb-0">
        <PublicInstallPrompt locale={locale} />
        <PublicHeader locale={locale} variant="default" />
        <FlightCatalogInteractiveClient
          items={flightItems.map(({ item, meta }) => ({
            ...item,
            meta,
          }))}
          dataSource={flightDataSource}
          emptyKeyword={catalog.emptyKeyword}
          searchPlaceholder={catalog.searchPlaceholder}
          serviceCatalogHref={service.catalogHref}
          supportHref={catalog.supportHref}
          copy={{ ...flightCopy, fallbackHint: flightFallbackHint }}
          filterKeywordLabel={copy.filterKeyword}
          locale={locale}
          initialState={{
            tripMode:
              isFlightTripMode(flightTrip) ? flightTrip : "round_trip",
            q: keyword,
            region: selectedRegion,
            group: selectedGroup,
            from: flightFrom,
            via: flightTrip === "multi_city" ? flightVia : "",
            to: flightTo,
            depart: flightDepart,
            returnDate: flightTrip === "round_trip" ? flightReturn : "",
            passengers: flightPassengers,
            cabin: flightCabin,
            sort: flightSort,
            airlines: flightAirlines,
            departWindows: flightDepartWindows,
            transitTypes: flightTransitTypes,
            priceBands: flightPriceBands,
          }}
        />
        <PublicStickyAction
          locale={locale}
          href="#top"
          label={flightCopy.refineSearch}
          summary={flightCopy.topTitle}
          secondaryHref={catalog.promoHref}
          secondaryLabel={copy.promoCta}
        />
        <PublicMobileNav locale={locale} />
      </div>
    )
  }

  if (slug === "pesawat") {
    const flightCopy = {
      id: {
        topLabel: "Flight search mock",
        topTitle: "Katalog pesawat RedFeng dengan alur OTA yang lebih fokus",
        topBody: "Kami ambil pola layout OTA: ringkasan pencarian di atas, filter di kiri, hasil di tengah, lalu harga dan aksi yang sangat jelas. Visualnya tetap dibuat lebih hangat dan lapang agar terasa RedFeng.",
        searchSummary: "Ringkasan pencarian",
        refineSearch: "Ubah pencarian",
        fromLabel: "Dari",
        toLabel: "Ke",
        departLabel: "Berangkat",
        returnLabel: "Pulang",
        passengerLabel: "Penumpang",
        cabinLabel: "Kabin",
        allRegions: "Semua region",
        allGroups: "Semua tipe",
        flightsFound: "opsi penerbangan",
        sortLabel: "Urutkan",
        sortBest: "Pilihan terbaik",
        sortPrice: "Harga terendah",
        sortEarly: "Berangkat paling pagi",
        sortDepartLate: "Berangkat paling akhir",
        sortArriveEarly: "Tiba paling awal",
        sortArriveLate: "Tiba paling akhir",
        refundTag: "Bisa reschedule",
        baggageTag: "Bagasi kabin",
        perksTitle: "Termasuk",
        activeFilters: "Filter aktif",
        leftTitle: "Saring hasil",
        leftBody: "Panel kiri dibuat seperti OTA, tetapi lebih bersih supaya user cepat scan tanpa merasa sesak.",
        regionBlock: "Region",
        tripBlock: "Tipe perjalanan",
        airlineBlock: "Maskapai",
        departWindowBlock: "Jam berangkat",
        transitBlock: "Transit",
        priceBlock: "Rentang harga",
        allAirlines: "Semua maskapai",
        allDepartWindows: "Semua jam",
        allTransitTypes: "Semua transit",
        allPriceBands: "Semua harga",
        departMorning: "Pagi - siang",
        departAfternoon: "Siang - sore",
        departEvening: "Malam",
        directOnly: "Langsung",
        transitAllowed: "Transit / mixed",
        priceBudget: "Di bawah 1.5 jt",
        priceMid: "1.5 jt - 3 jt",
        pricePremium: "Di atas 3 jt",
        resetFilters: "Reset semua",
        resultIntro: "Hasil pencarian",
        priceLabel: "Mulai dari",
        chooseLabel: "Pilih",
        fareLabel: "Referensi fare",
        supportHint: "Menampilkan fare live dari supplier affiliate untuk rute dan tanggal ini.",
        emptyTitle: "Belum ada penerbangan yang cocok",
        emptyBody: "Coba longgarkan region atau tipe perjalanan agar daftar hasil muncul lagi.",
      },
      en: {
        topLabel: "Flight search mock",
        topTitle: "A RedFeng flight catalog with a sharper OTA-style flow",
        topBody: "We borrow the OTA layout logic: search summary on top, filters on the left, results in the middle, and very clear pricing actions. The visual system stays warmer and calmer so it still feels like RedFeng.",
        searchSummary: "Search summary",
        refineSearch: "Refine search",
        fromLabel: "From",
        toLabel: "To",
        departLabel: "Depart",
        returnLabel: "Return",
        passengerLabel: "Passengers",
        cabinLabel: "Cabin",
        allRegions: "All regions",
        allGroups: "All trip types",
        flightsFound: "flight options",
        sortLabel: "Sort by",
        sortBest: "Best choice",
        sortPrice: "Lowest price",
        sortEarly: "Earliest departure",
        sortDepartLate: "Latest departure",
        sortArriveEarly: "Earliest arrival",
        sortArriveLate: "Latest arrival",
        refundTag: "Reschedule ready",
        baggageTag: "Cabin baggage",
        perksTitle: "Includes",
        activeFilters: "Active filters",
        leftTitle: "Filter results",
        leftBody: "The left rail follows OTA behavior, but stays cleaner so users can scan quickly without feeling crowded.",
        regionBlock: "Region",
        tripBlock: "Trip type",
        airlineBlock: "Airline",
        departWindowBlock: "Departure time",
        transitBlock: "Transit",
        priceBlock: "Price range",
        allAirlines: "All airlines",
        allDepartWindows: "All times",
        allTransitTypes: "All transit options",
        allPriceBands: "All prices",
        departMorning: "Morning to noon",
        departAfternoon: "Noon to evening",
        departEvening: "Evening",
        directOnly: "Direct only",
        transitAllowed: "Transit / mixed",
        priceBudget: "Below 1.5m",
        priceMid: "1.5m - 3m",
        pricePremium: "Above 3m",
        resetFilters: "Reset all",
        resultIntro: "Search results",
        priceLabel: "Starting from",
        chooseLabel: "Choose",
        fareLabel: "Fare reference",
        supportHint: "Live fares are shown from our affiliate supplier for this route and date.",
        emptyTitle: "No matching flights found",
        emptyBody: "Try widening the region or trip type to bring results back.",
      },
      zh: {
        topLabel: "Flight search mock",
        topTitle: "更聚焦 OTA 节奏的 RedFeng 航班目录",
        topBody: "我们借鉴 OTA 的结构逻辑：顶部搜索摘要、左侧筛选、中间结果，以及非常清晰的价格与行动区，同时保留更温暖、更从容的 RedFeng 视觉气质。",
        searchSummary: "搜索摘要",
        refineSearch: "调整搜索",
        fromLabel: "出发地",
        toLabel: "目的地",
        departLabel: "出发",
        returnLabel: "返程",
        passengerLabel: "乘客",
        cabinLabel: "舱位",
        allRegions: "全部区域",
        allGroups: "全部行程类型",
        flightsFound: "个示例航班",
        sortLabel: "排序",
        sortBest: "推荐优先",
        sortPrice: "最低价格",
        sortEarly: "最早出发",
        sortDepartLate: "最晚出发",
        sortArriveEarly: "最早到达",
        sortArriveLate: "最晚到达",
        refundTag: "可改期",
        baggageTag: "含手提行李",
        perksTitle: "包含",
        activeFilters: "当前筛选",
        leftTitle: "筛选结果",
        leftBody: "左侧筛选区沿用 OTA 习惯，但保持更清爽的节奏，方便快速浏览。",
        regionBlock: "区域",
        tripBlock: "行程类型",
        airlineBlock: "航空公司",
        departWindowBlock: "出发时间",
        transitBlock: "中转",
        priceBlock: "价格范围",
        allAirlines: "全部航司",
        allDepartWindows: "全部时间",
        allTransitTypes: "全部中转",
        allPriceBands: "全部价格",
        departMorning: "早上到中午",
        departAfternoon: "中午到傍晚",
        departEvening: "晚上",
        directOnly: "仅直飞",
        transitAllowed: "中转 / 混合",
        priceBudget: "低于 150 万",
        priceMid: "150 万 - 300 万",
        pricePremium: "高于 300 万",
        resetFilters: "重置全部",
        resultIntro: "示例结果",
        priceLabel: "起价",
        chooseLabel: "选择",
        fareLabel: "示例票价",
        supportHint: "当前显示的是该航线与日期的实时票价结果。",
        emptyTitle: "没有匹配的示例航班",
        emptyBody: "请放宽区域或行程类型后再试一次。",
      },
    }[locale]

    const topSummaryChips = [
      keyword || catalog.emptyKeyword,
      selectedRegion || flightCopy.allRegions,
      selectedGroup || flightCopy.allGroups,
      flightAirlines.length === 0 ? flightCopy.allAirlines : flightAirlines.length === 1 ? flightAirlines[0] : `${flightAirlines.length} ${flightCopy.airlineBlock.toLowerCase()}`,
      flightDepartWindows.length === 0
        ? flightCopy.allDepartWindows
        : flightDepartWindows.length === 1
          ? flightDepartWindows[0] === "morning"
            ? flightCopy.departMorning
            : flightDepartWindows[0] === "afternoon"
              ? flightCopy.departAfternoon
              : flightCopy.departEvening
          : `${flightDepartWindows.length} ${flightCopy.departWindowBlock.toLowerCase()}`,
      flightTransitTypes.length === 0 ? flightCopy.allTransitTypes : flightTransitTypes.length === 1 ? (flightTransitTypes[0] === "direct" ? flightCopy.directOnly : flightCopy.transitAllowed) : `${flightTransitTypes.length} ${flightCopy.transitBlock.toLowerCase()}`,
      flightPriceBands.length === 0
        ? flightCopy.allPriceBands
        : flightPriceBands.length === 1
          ? flightPriceBands[0] === "budget"
            ? flightCopy.priceBudget
            : flightPriceBands[0] === "mid"
              ? flightCopy.priceMid
              : flightCopy.pricePremium
          : `${flightPriceBands.length} ${flightCopy.priceBlock.toLowerCase()}`,
    ]
    const topDetailChips = [
      { label: flightCopy.fromLabel, value: flightFrom },
      { label: flightCopy.toLabel, value: flightTo },
      { label: flightCopy.departLabel, value: flightDepart },
      { label: flightCopy.returnLabel, value: flightReturn },
      { label: flightCopy.passengerLabel, value: flightPassengers },
      { label: flightCopy.cabinLabel, value: flightCabin },
    ]
    const flightFilterBaseParams = {
      q: keyword,
      region: selectedRegion,
      group: selectedGroup,
      from: flightFrom,
      to: flightTo,
      depart: flightDepart,
      return: flightReturn,
      passengers: flightPassengers,
      cabin: flightCabin,
      sort: flightSort,
      airline: flightAirlines,
      depart_window: flightDepartWindows,
      transit_type: flightTransitTypes,
      price_band: flightPriceBands,
    }
    const availableAirlines = [...new Set(flightItems.map(({ meta }) => meta.airline))]

    return (
      <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#f6fbff_0%,#f9fbff_16%,#fffdfa_48%,#f3f6fb_100%)] pb-36 md:pb-0">
        <PublicInstallPrompt locale={locale} />
        <PublicHeader locale={locale} variant="default" />

        <main className={`${homeLayoutLock.pageXClass} pb-10 pt-5 md:pb-14`}>
          <section className={homeLayoutLock.contentWidthClass}>
            <div className="rounded-[24px] border border-[#d8e9f7] bg-[linear-gradient(180deg,#f2f9ff_0%,#fbfdff_68%,#ffffff_100%)] px-4 py-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.14)] sm:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-700">{flightCopy.searchSummary}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                      {flightItems.length} {flightCopy.flightsFound}
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
                  <span className="font-semibold text-slate-900">{flightCopy.topTitle}.</span> {flightCopy.topBody}
                </div>
              </div>
            </div>
          </section>

          <section className={`${homeLayoutLock.contentWidthClass} sticky top-4 z-20 mt-4`}>
            <form method="get" action={service.catalogHref} className="rounded-[20px] border border-[#d9e8f6] bg-[#1687e0] p-3 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)]">
              <div className="grid gap-2 xl:grid-cols-[1.05fr_1.05fr_0.78fr_0.78fr_0.85fr_0.72fr_0.9fr_auto] xl:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.fromLabel}</span>
                  <input
                    type="text"
                    name="from"
                    defaultValue={flightFrom}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.toLabel}</span>
                  <input
                    type="text"
                    name="to"
                    defaultValue={flightTo}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.departLabel}</span>
                  <input
                    type="date"
                    name="depart"
                    defaultValue={flightDepart}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.returnLabel}</span>
                  <input
                    type="date"
                    name="return"
                    defaultValue={flightReturn}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.passengerLabel}</span>
                  <input
                    type="text"
                    name="passengers"
                    defaultValue={flightPassengers}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{flightCopy.cabinLabel}</span>
                  <input
                    type="text"
                    name="cabin"
                    defaultValue={flightCabin}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{copy.filterKeyword}</span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={keyword}
                    placeholder={catalog.searchPlaceholder}
                    className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/25"
                  />
                </label>
                <label className="block xl:col-span-2">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    {copy.filterRegion} / {copy.filterGroup} / {flightCopy.sortLabel}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <select
                      name="region"
                      defaultValue={selectedRegion}
                      className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white focus:ring-4 focus:ring-white/25"
                    >
                      <option value="">{flightCopy.allRegions}</option>
                      {availableRegions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <select
                      name="group"
                      defaultValue={selectedGroup}
                      className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white focus:ring-4 focus:ring-white/25"
                    >
                      <option value="">{flightCopy.allGroups}</option>
                      {availableGroups.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                    <select
                      name="sort"
                      defaultValue={flightSort}
                      className="w-full rounded-[14px] border border-white/40 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-white focus:ring-4 focus:ring-white/25"
                    >
                      <option value="best">{flightCopy.sortBest}</option>
                      <option value="price">{flightCopy.sortPrice}</option>
                      <option value="early">{flightCopy.sortEarly}</option>
                    </select>
                  </div>
                </label>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-[14px] bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                  >
                    {flightCopy.refineSearch}
                  </button>
                  <Link
                    href={service.catalogHref}
                    className="inline-flex items-center justify-center rounded-[14px] border border-white/45 bg-[#0e74c8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c6ab8]"
                  >
                    {flightCopy.resetFilters}
                  </Link>
                </div>
              </div>
            </form>
          </section>

          <section className={`${homeLayoutLock.contentWidthClass} mt-5 grid gap-4 lg:grid-cols-[272px_minmax(0,1fr)]`}>
            <aside className="space-y-3 lg:sticky lg:top-[8.2rem] lg:self-start">
              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{flightCopy.leftTitle}</p>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">{flightItems.length}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-500">{flightCopy.leftBody}</p>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.regionBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link
                    href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, region: "" })}
                    className={`rounded-[14px] border px-3 py-2.5 text-sm transition ${selectedRegion ? "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}
                  >
                    {flightCopy.allRegions}
                  </Link>
                  {availableRegions.map((region) => (
                    <Link
                      key={region}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, region })}
                        className={`rounded-[14px] border px-3 py-2.5 text-sm transition ${
                        selectedRegion === region
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                      }`}
                    >
                      {region}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.tripBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link
                    href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, group: "" })}
                    className={`rounded-[14px] border px-3 py-2.5 text-sm transition ${selectedGroup ? "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}
                  >
                    {flightCopy.allGroups}
                  </Link>
                  {availableGroups.map((group) => (
                    <Link
                      key={group}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, group })}
                        className={`rounded-[14px] border px-3 py-2.5 text-sm transition ${
                        selectedGroup === group
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                      }`}
                    >
                      {group}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.airlineBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Link href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, airline: [] })} className={getFlightFilterLinkClass(flightAirlines.length === 0)}>
                    <FilterCheck active={flightAirlines.length === 0} />
                    <span>{flightCopy.allAirlines}</span>
                  </Link>
                  {availableAirlines.map((airline) => (
                    <Link
                      key={airline}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, airline: toggleFilterValue(flightAirlines, airline) })}
                      className={getFlightFilterLinkClass(flightAirlines.includes(airline))}
                    >
                      <FilterCheck active={flightAirlines.includes(airline)} />
                      <span>{airline}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.departWindowBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {[
                    ["", flightCopy.allDepartWindows],
                    ["morning", flightCopy.departMorning],
                    ["afternoon", flightCopy.departAfternoon],
                    ["evening", flightCopy.departEvening],
                  ].map(([value, label]) => (
                    <Link
                      key={value || "all"}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, depart_window: value ? toggleFilterValue(flightDepartWindows, value) : [] })}
                      className={getFlightFilterLinkClass(value ? flightDepartWindows.includes(value) : flightDepartWindows.length === 0)}
                    >
                      <FilterCheck active={value ? flightDepartWindows.includes(value) : flightDepartWindows.length === 0} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.transitBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {[
                    ["", flightCopy.allTransitTypes],
                    ["direct", flightCopy.directOnly],
                    ["mixed", flightCopy.transitAllowed],
                  ].map(([value, label]) => (
                    <Link
                      key={value || "all"}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, transit_type: value ? toggleFilterValue(flightTransitTypes, value) : [] })}
                      className={getFlightFilterLinkClass(value ? flightTransitTypes.includes(value) : flightTransitTypes.length === 0)}
                    >
                      <FilterCheck active={value ? flightTransitTypes.includes(value) : flightTransitTypes.length === 0} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#dce8f6] bg-white p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.priceBlock}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {[
                    ["", flightCopy.allPriceBands],
                    ["budget", flightCopy.priceBudget],
                    ["mid", flightCopy.priceMid],
                    ["premium", flightCopy.pricePremium],
                  ].map(([value, label]) => (
                    <Link
                      key={value || "all"}
                      href={buildCatalogHref(service.catalogHref, { ...flightFilterBaseParams, price_band: value ? toggleFilterValue(flightPriceBands, value) : [] })}
                      className={getFlightFilterLinkClass(value ? flightPriceBands.includes(value) : flightPriceBands.length === 0)}
                    >
                      <FilterCheck active={value ? flightPriceBands.includes(value) : flightPriceBands.length === 0} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-3">
              <div className="rounded-[20px] border border-[#dce8f6] bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.14)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{flightItems.length} {flightCopy.flightsFound}</p>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                      {flightCopy.sortLabel}: {flightSort === "price" ? flightCopy.sortPrice : flightSort === "early" ? flightCopy.sortEarly : flightCopy.sortBest}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">{flightCopy.activeFilters}</span>
                    {topSummaryChips.map((chip) => (
                      <span key={`active-${chip}`} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {flightItems.length === 0 ? (
                <div className="rounded-[24px] border border-[#dce8f6] bg-white p-8 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.18)]">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">{flightCopy.emptyTitle}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{flightCopy.emptyBody}</p>
                  <Link
                    href={service.catalogHref}
                    className="mt-5 inline-flex rounded-[14px] bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    {flightCopy.resetFilters}
                  </Link>
                </div>
              ) : (
                flightItems.map(({ item, meta }) => {

                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[20px] border border-[#dce8f6] bg-white shadow-[0_14px_32px_-26px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.2)]"
                    >
                      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="p-4">
                          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)] xl:items-center">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-sky-100 bg-sky-50">
                                <Image src={item.image} alt={item.title} fill sizes="48px" className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">{meta.airline}</p>
                                <p className="mt-1 text-xs text-slate-500">{meta.cabin} • {meta.tripLabel}</p>
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
                                <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700">{flightCopy.baggageTag}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{flightCopy.refundTag}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {meta.highlightBadges.map((badge) => (
                              <span key={badge} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                                {badge}
                              </span>
                            ))}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.facts.map((fact) => (
                              <span key={`${item.id}-${fact.label}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {fact.label}: {fact.value}
                              </span>
                            ))}
                          </div>

                          <div className="mt-3 flex flex-col gap-1.5 text-xs leading-6 text-slate-500">
                            <p>{item.availabilityNote}</p>
                            <p>{item.statusNote}</p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center border-t border-[#dce8f6] bg-[linear-gradient(180deg,#f8fbff_0%,#fffaf6_100%)] p-4 xl:border-l xl:border-t-0">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{flightCopy.fareLabel}</p>
                            <p className="mt-1 text-xs text-slate-500">{flightCopy.priceLabel}</p>
                            <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-[#ef4423]">{meta.price}</p>
                            <p className="mt-2 text-[11px] leading-5 text-slate-500">{meta.seatNote}</p>
                          </div>

                          <div className="mt-4 space-y-2">
                            <Link
                              href={catalog.supportHref}
                              className="block rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] py-2.5 text-center text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(239,68,35,0.58)] transition hover:brightness-105"
                            >
                              {flightCopy.chooseLabel}
                            </Link>
                            <p className="text-[11px] leading-5 text-slate-500">{flightCopy.supportHint}</p>
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

        <PublicStickyAction
          locale={locale}
          href="#top"
          label={flightCopy.refineSearch}
          summary={flightCopy.topTitle}
          secondaryHref={catalog.promoHref}
          secondaryLabel={copy.promoCta}
        />
        <PublicMobileNav locale={locale} />
      </div>
    )
  }

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <section className={`${homeLayoutLock.pageXClass} pb-5 pt-2 md:pb-6 md:pt-3`}>
        <div className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.heroBackdropRadiusClass} overflow-hidden border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]`}>
          <div className="relative min-h-[430px] px-5 pb-6 pt-[104px] sm:min-h-[480px] sm:px-6 sm:pb-7 sm:pt-[118px] lg:min-h-[530px] lg:px-8 lg:pb-8 lg:pt-[130px]">
            <Image
              src={catalog.visualTheme.heroMobileImage}
              alt={`${service.shortLabel} dummy catalog hero`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center sm:hidden"
            />
            <Image
              src={catalog.visualTheme.heroDesktopImage}
              alt={`${service.shortLabel} dummy catalog hero`}
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="hidden object-cover object-center sm:block"
            />
            <div className={`absolute inset-0 ${catalog.visualTheme.heroOverlayClass}`} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 to-transparent" />

            <div className="relative grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="max-w-[700px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
                <h1 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[46px] lg:text-[58px]">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-[620px] text-[15px] leading-8 text-slate-700 sm:text-base">
                  {copy.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5 text-xs">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 font-semibold ${getServiceAvailabilityTone(service.availability)}`}>
                    {getServiceAvailabilityLabel(service.availability, locale)}
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1.5 font-semibold ${catalog.visualTheme.accentBadgeClass}`}>
                    {copy.dummyBadge}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/40 bg-white/74 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${service.accent} text-white`}>
                      {service.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.rightTitle}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{service.shortLabel}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{copy.rightBody}</p>
                </div>

                <div className="rounded-[28px] border border-white/40 bg-white/74 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)] backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.highlightsTitle}</p>
                  <div className="mt-4 grid gap-3">
                    {service.highlights.map((item) => (
                      <div key={item} className="rounded-[18px] border border-[#f3e5da] bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} -mt-8 pb-1 lg:-mt-12`}>
        <div id="service-filter" className={homeLayoutLock.contentWidthClass}>
          <form method="get" action={service.catalogHref} className="rounded-[30px] border border-[#f0d8c9] bg-white/96 p-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.22)] backdrop-blur sm:p-5 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.8fr_0.8fr_auto] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.searchTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.searchBody}</p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterKeyword}</span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={keyword}
                    placeholder={catalog.searchPlaceholder}
                    className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterRegion}</span>
                <select
                  name="region"
                  defaultValue={selectedRegion}
                  className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">{copy.filterRegion}</option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterGroup}</span>
                <select
                  name="group"
                  defaultValue={selectedGroup}
                  className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">{copy.filterGroup}</option>
                  {availableGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-[22px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(249,115,22,0.62)] transition hover:bg-orange-600"
                >
                  {copy.searchButton}
                </button>
                <Link
                  href={service.catalogHref}
                  className="inline-flex items-center justify-center rounded-[22px] border border-[#ead8cb] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {copy.resetButton}
                </Link>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} pb-10 pt-6 md:pb-14`}>
        <div className={`${homeLayoutLock.contentWidthClass} grid gap-6 lg:grid-cols-[300px_1fr]`}>
          <aside className="space-y-4">
            <div className={`rounded-[28px] border p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] ${catalog.visualTheme.resultPanelClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.resultTitle}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.resultCount}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{copy.supportBody}</p>
            </div>

            <div className={`rounded-[28px] border p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.14)] ${service.cardTone}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">{copy.supportTitle}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-current/10 bg-white/75 px-4 py-3 text-sm leading-6">
                  {copy.chipTarget}: {service.shortLabel}
                </div>
                <div className="rounded-[18px] border border-current/10 bg-white/75 px-4 py-3 text-sm leading-6">
                  {copy.chipStatus}: {copy.dummyBadge}
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                <Link
                  href={service.href}
                  className="inline-flex items-center justify-center rounded-[18px] border border-current/15 bg-transparent px-4 py-3 text-sm font-semibold transition hover:bg-white/65"
                >
                  {copy.landingCta}
                </Link>
                <Link
                  href={catalog.supportHref}
                  className="inline-flex items-center justify-center rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {copy.supportCta}
                </Link>
                <Link
                  href={catalog.promoHref}
                  className="inline-flex items-center justify-center rounded-[18px] border border-current/15 bg-transparent px-4 py-3 text-sm font-semibold transition hover:bg-white/65"
                >
                  {copy.promoCta}
                </Link>
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {slug === "hotel" && (keyword || hotelSummaryLines.length > 0) ? (
              <div className="rounded-[28px] border border-[#efe3d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f2_100%)] p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.14)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  {locale === "en" ? "Stay search summary" : locale === "zh" ? "住宿搜索摘要" : "Ringkasan pencarian stay"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {keyword ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {locale === "en" ? "Destination" : locale === "zh" ? "目的地" : "Destinasi"}: {keyword}
                    </span>
                  ) : null}
                  {hotelSummaryLines.map((line) => (
                    <span key={line} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {filteredItems.length === 0 ? (
              <div className="rounded-[30px] border border-[#f0dfd2] bg-white p-8 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.dummyBadge}</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.emptyTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{copy.emptyBody}</p>
                <Link
                  href={service.catalogHref}
                  className="mt-5 inline-flex rounded-[18px] bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  {copy.emptyAction}
                </Link>
              </div>
            ) : (
              filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-[28px] border border-[#efe3d8] bg-white shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-36px_rgba(15,23,42,0.24)] md:flex-row"
                >
                  <div className="relative h-[180px] w-full shrink-0 sm:h-[210px] md:h-[230px] md:w-[280px]">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 767px) 100vw, 280px"
                      className="object-cover"
                    />
                    <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:text-[11px] ${catalog.visualTheme.accentBadgeClass}`}>
                      {copy.dummyBadge}
                    </div>
                  </div>

                  <div className="flex-1 p-4 sm:p-5 md:p-6">
                    <h2 className="line-clamp-2 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-slate-950 md:text-[28px]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.locationLabel}</p>
                    <p className="mt-1 text-[12px] text-slate-500 sm:text-sm">{item.location}</p>

                     <div className="mt-4 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                       <span className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">{item.region}</span>
                       <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">{item.group}</span>
                       {item.facts.slice(0, 2).map((fact) => (
                         <span key={`${item.id}-${fact.label}`} className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200">
                           {fact.label}: {fact.value}
                         </span>
                       ))}
                       {item.highlights.slice(0, 2).map((highlight) => (
                         <span key={highlight} className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                           {highlight}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.availabilityNote}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-500">{item.statusNote}</p>
                  </div>

                  <div className="hidden flex-col justify-between border-t border-[#efe3d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f2_100%)] p-4 sm:p-5 md:flex md:w-[268px] md:border-l md:border-t-0 md:p-6">
                    <div className="text-left md:text-right">
                      <p className="text-sm text-slate-500">{copy.rightTitle}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{copy.dummyBadge}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{item.group}</p>
                      <div className="mt-4 space-y-2">
                        {item.facts.map((fact) => (
                          <div key={`${item.id}-side-${fact.label}`} className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm text-slate-600 md:text-right">
                            <span className="font-semibold text-slate-900">{fact.value}</span>
                            <span className="ml-2 text-slate-500">{fact.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 md:mt-6">
                      <Link
                        href={catalog.supportHref}
                        className="block w-full rounded-2xl bg-orange-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600 md:text-base"
                      >
                        {copy.supportCta}
                      </Link>
                      <Link
                        href={catalog.promoHref}
                        className="block text-center text-sm font-semibold text-slate-700 transition hover:text-orange-600"
                      >
                        {copy.promoCta} →
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <PublicStickyAction
        locale={locale}
        href="#service-filter"
        label={copy.stickyLabel}
        summary={copy.stickySummary}
        secondaryHref={catalog.supportHref}
        secondaryLabel={copy.supportCta}
      />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
