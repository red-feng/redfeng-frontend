"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import SearchBar from "@/app/components/SearchBar"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatPackageMoney, localeCurrencyMap, resolvePackageTranslation } from "@/lib/package-pricing"

const ActiveResultsMap = dynamic(() => import("@/app/packages/ActiveResultsMap"), {
  ssr: false,
})

type Facility = {
  id: string
  name: string
  category: string
}

type PackagePreview = {
  id: string
  slug: string
  cover_image?: string | null
  title?: string | null
  city?: string | null
  country?: string | null
  currency: string | null
  travel_style: string | null
  duration?: number | null
  price_adult: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_translations?: {
    language_code?: string | null
    title: string | null
    description: string | null
    currency?: string | null
    price_adult?: number | null
    price_child?: number | null
  }[] | null
  package_details?:
    | {
        location_label?: string | null
        location_type?: string | null
        primary_lat?: number | null
        primary_lng?: number | null
        viewport_radius_km?: number | null
      }
    | {
        location_label?: string | null
        location_type?: string | null
        primary_lat?: number | null
        primary_lng?: number | null
        viewport_radius_km?: number | null
      }[]
    | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  } | null
}

export type PackageFilterState = {
  minPrice: number
  maxPrice: number
  selectedFacilities: string[]
}

const openCategoriesStorageKey = "rf_home_filter_open_categories"

type MapWindow = {
  centerLabel: string
  left: number
  top: number
  width: number
  height: number
  bbox: string
}

type GeoPoint = {
  lat: number
  lng: number
  label: string
}

function getPreviewTitle(pkg: PackagePreview, locale: Locale) {
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const fallbackTitle = decodeURIComponent(pkg.slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return translation?.title?.trim() || pkg.title?.trim() || fallbackTitle || "Untitled package"
}

function getPreviewPrice(pkg: PackagePreview) {
  return pkg.livePricing?.priceAdult ?? pkg.price_adult ?? 0
}

function getPreviewImage(pkg: PackagePreview) {
  return pkg.cover_image || "/placeholder.png"
}

function getPreviewMeta(pkg: PackagePreview, locale: Locale) {
  const location = [pkg.city, pkg.country].filter(Boolean).join(", ")
  const duration =
    typeof pkg.duration === "number" && pkg.duration > 0
      ? locale === "en"
        ? `${pkg.duration} days`
        : locale === "zh"
          ? `${pkg.duration} 天`
          : `${pkg.duration} hari`
      : ""

  return [location, duration].filter(Boolean).join(" • ")
}

function getPreviewGeoPoint(pkg: PackagePreview): GeoPoint | null {
  const detail = Array.isArray(pkg.package_details) ? pkg.package_details[0] : pkg.package_details
  if (!detail) return null
  const lat = typeof detail.primary_lat === "number" ? detail.primary_lat : null
  const lng = typeof detail.primary_lng === "number" ? detail.primary_lng : null
  if (lat === null || lng === null) return null

  return {
    lat,
    lng,
    label: String(detail.location_label || pkg.city || pkg.country || "").trim(),
  }
}

function getPreviewMapPoint(pkg: PackagePreview, fallbackCountry?: string): GeoPoint {
  const geoPoint = getPreviewGeoPoint(pkg)
  if (geoPoint) return geoPoint

  const countryWindow = getCountryMapWindow(pkg.country || fallbackCountry)
  const center = getBBoxCenter(countryWindow.bbox)
  const seed = hashSeed(`${pkg.id}:${pkg.country || fallbackCountry || "map"}`)
  const jitterLng = ((seed % 100) / 100 - 0.5) * Math.min((parseBBox(countryWindow.bbox).maxLng - parseBBox(countryWindow.bbox).minLng) * 0.08, 1.8)
  const jitterLat = ((Math.floor(seed / 17) % 100) / 100 - 0.5) * Math.min((parseBBox(countryWindow.bbox).maxLat - parseBBox(countryWindow.bbox).minLat) * 0.08, 1.2)

  return {
    lat: clamp(center.lat + jitterLat, -85, 85),
    lng: clamp(center.lng + jitterLng, -179.5, 179.5),
    label: String(pkg.country || fallbackCountry || "Tour destination").trim(),
  }
}

function hashSeed(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003
  }
  return hash
}

const COUNTRY_MAP_PRESETS: Record<string, { centerLabel: string; left: number; top: number; width: number; height: number; bbox: string }> = {
  china: { centerLabel: "China", left: 60, top: 43, width: 34, height: 26, bbox: "73.0,18.0,135.0,54.0" },
  indonesia: { centerLabel: "Indonesia", left: 53, top: 58, width: 42, height: 18, bbox: "94.0,-12.0,142.0,8.0" },
  japan: { centerLabel: "Japan", left: 73, top: 35, width: 18, height: 24, bbox: "128.0,30.0,147.0,46.0" },
  singapore: { centerLabel: "Singapore", left: 58, top: 60, width: 10, height: 12, bbox: "103.55,1.14,104.08,1.50" },
  malaysia: { centerLabel: "Malaysia", left: 57, top: 55, width: 16, height: 18, bbox: "99.0,0.8,120.0,8.5" },
  thailand: { centerLabel: "Thailand", left: 56, top: 48, width: 18, height: 22, bbox: "97.0,5.0,106.0,21.0" },
  vietnam: { centerLabel: "Vietnam", left: 63, top: 46, width: 14, height: 26, bbox: "102.0,8.0,110.0,24.0" },
  korea: { centerLabel: "Korea", left: 69, top: 34, width: 12, height: 18, bbox: "124.0,33.0,132.0,39.0" },
  "south korea": { centerLabel: "South Korea", left: 69, top: 34, width: 12, height: 18, bbox: "124.0,33.0,132.0,39.0" },
  "hong kong": { centerLabel: "Hong Kong", left: 66, top: 45, width: 9, height: 10, bbox: "113.80,22.10,114.50,22.60" },
  "arab saudi": { centerLabel: "Saudi Arabia", left: 44, top: 46, width: 24, height: 20, bbox: "34.0,16.0,56.0,33.0" },
  "saudi arabia": { centerLabel: "Saudi Arabia", left: 44, top: 46, width: 24, height: 20, bbox: "34.0,16.0,56.0,33.0" },
}

function getCountryMapWindow(country?: string): MapWindow {
  const normalized = (country || "").trim().toLowerCase()
  return COUNTRY_MAP_PRESETS[normalized] || { centerLabel: country || "Asia", left: 58, top: 46, width: 24, height: 22, bbox: "60.0,-12.0,150.0,55.0" }
}

function parseBBox(bbox: string) {
  const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map((value) => Number(value))
  return { minLng, minLat, maxLng, maxLat }
}

function getBBoxCenter(bbox: string) {
  const { minLng, minLat, maxLng, maxLat } = parseBBox(bbox)
  return {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2,
  }
}

function stringifyBBox({ minLng, minLat, maxLng, maxLat }: { minLng: number; minLat: number; maxLng: number; maxLat: number }) {
  return `${minLng},${minLat},${maxLng},${maxLat}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildMapWindowFromBBox(bbox: string, centerLabel: string): MapWindow {
  const { minLng, minLat, maxLng, maxLat } = parseBBox(bbox)
  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2

  return {
    centerLabel,
    left: ((centerLng + 180) / 360) * 100,
    top: ((90 - centerLat) / 180) * 100,
    width: clamp(((maxLng - minLng) / 360) * 100, 8, 34),
    height: clamp(((maxLat - minLat) / 180) * 100, 8, 28),
    bbox,
  }
}

function buildGeoMapWindow(packages: PackagePreview[], fallbackCountry?: string): MapWindow {
  const geoPoints = packages.map(getPreviewGeoPoint).filter((point): point is GeoPoint => point !== null)
  if (geoPoints.length === 0) return getCountryMapWindow(fallbackCountry)

  const lngs = geoPoints.map((point) => point.lng)
  const lats = geoPoints.map((point) => point.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngSpan = Math.max(maxLng - minLng, 0.35)
  const latSpan = Math.max(maxLat - minLat, 0.25)
  const paddedMinLng = clamp(minLng - lngSpan * 0.4, -179.5, 179.5)
  const paddedMaxLng = clamp(maxLng + lngSpan * 0.4, -179.5, 179.5)
  const paddedMinLat = clamp(minLat - latSpan * 0.4, -85, 85)
  const paddedMaxLat = clamp(maxLat + latSpan * 0.4, -85, 85)
  const centerLng = (paddedMinLng + paddedMaxLng) / 2
  const centerLat = (paddedMinLat + paddedMaxLat) / 2

  return {
    centerLabel: fallbackCountry || geoPoints[0]?.label || "Results",
    left: ((centerLng + 180) / 360) * 100,
    top: ((90 - centerLat) / 180) * 100,
    width: clamp(((paddedMaxLng - paddedMinLng) / 360) * 100, 8, 34),
    height: clamp(((paddedMaxLat - paddedMinLat) / 180) * 100, 8, 28),
    bbox: `${paddedMinLng},${paddedMinLat},${paddedMaxLng},${paddedMaxLat}`,
  }
}

function buildPackageMapWindow(packages: PackagePreview[], fallbackCountry?: string): MapWindow {
  const mapPoints = packages.map((pkg) => getPreviewMapPoint(pkg, fallbackCountry))
  if (mapPoints.length === 0) return getCountryMapWindow(fallbackCountry)

  const lngs = mapPoints.map((point) => point.lng)
  const lats = mapPoints.map((point) => point.lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const lngSpan = Math.max(maxLng - minLng, 0.35)
  const latSpan = Math.max(maxLat - minLat, 0.25)
  const paddedMinLng = clamp(minLng - lngSpan * 0.4, -179.5, 179.5)
  const paddedMaxLng = clamp(maxLng + lngSpan * 0.4, -179.5, 179.5)
  const paddedMinLat = clamp(minLat - latSpan * 0.4, -85, 85)
  const paddedMaxLat = clamp(maxLat + latSpan * 0.4, -85, 85)
  const centerLng = (paddedMinLng + paddedMaxLng) / 2
  const centerLat = (paddedMinLat + paddedMaxLat) / 2

  return {
    centerLabel: fallbackCountry || mapPoints[0]?.label || "Results",
    left: ((centerLng + 180) / 360) * 100,
    top: ((90 - centerLat) / 180) * 100,
    width: clamp(((paddedMaxLng - paddedMinLng) / 360) * 100, 8, 34),
    height: clamp(((paddedMaxLat - paddedMinLat) / 180) * 100, 8, 28),
    bbox: `${paddedMinLng},${paddedMinLat},${paddedMaxLng},${paddedMaxLat}`,
  }
}

function zoomBBox(bbox: string, factor: number) {
  const { minLng, minLat, maxLng, maxLat } = parseBBox(bbox)
  const centerLng = (minLng + maxLng) / 2
  const centerLat = (minLat + maxLat) / 2
  const nextLngSpan = clamp((maxLng - minLng) * factor, 0.12, 320)
  const nextLatSpan = clamp((maxLat - minLat) * factor, 0.08, 150)

  return stringifyBBox({
    minLng: clamp(centerLng - nextLngSpan / 2, -179.5, 179.5),
    maxLng: clamp(centerLng + nextLngSpan / 2, -179.5, 179.5),
    minLat: clamp(centerLat - nextLatSpan / 2, -85, 85),
    maxLat: clamp(centerLat + nextLatSpan / 2, -85, 85),
  })
}

function pointIsInsideBBox(point: GeoPoint, bbox: string) {
  const { minLng, minLat, maxLng, maxLat } = parseBBox(bbox)
  return point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat
}

function buildPackageMarkerLayout(packages: PackagePreview[], bbox: string, fallbackCountry?: string) {
  const { minLng, minLat, maxLng, maxLat } = parseBBox(bbox)
  const lngRange = Math.max(maxLng - minLng, 0.0001)
  const latRange = Math.max(maxLat - minLat, 0.0001)
  const placedMarkers: Array<{ left: number; top: number }> = []

  return [...packages]
    .sort((left, right) => getPreviewPrice(left) - getPreviewPrice(right))
    .map((pkg, index) => {
      const point = getPreviewMapPoint(pkg, fallbackCountry)
      const baseLeft = clamp(((point.lng - minLng) / lngRange) * 100, 6, 94)
      const baseTop = clamp((1 - (point.lat - minLat) / latRange) * 100, 8, 92)
      const overlappingCount = placedMarkers.filter((marker) => Math.abs(marker.left - baseLeft) < 3.8 && Math.abs(marker.top - baseTop) < 4.6).length
      const seed = hashSeed(`${pkg.id}:${index}:${overlappingCount}`)
      const ring = Math.floor(overlappingCount / 6) + 1
      const angle = ((seed % 360) * Math.PI) / 180
      const offsetDistance = overlappingCount === 0 ? 0 : 2.4 + ring * 1.2
      const left = clamp(baseLeft + Math.cos(angle) * offsetDistance, 6, 94)
      const top = clamp(baseTop + Math.sin(angle) * offsetDistance, 8, 92)

      placedMarkers.push({ left, top })

      return {
        pkg,
        point,
        left,
        top,
      }
    })
}

function buildCountryMarkerLayout(packages: PackagePreview[], selectedCountry: string | undefined) {
  const groupedByCountry = new Map<string, PackagePreview[]>()

  packages.forEach((pkg) => {
    const countryKey = (pkg.country || selectedCountry || "other").trim()
    const current = groupedByCountry.get(countryKey) || []
    current.push(pkg)
    groupedByCountry.set(countryKey, current)
  })

  return Array.from(groupedByCountry.entries()).map(([country, countryPackages], index) => {
    const countryGeoPackages = countryPackages.filter((pkg) => getPreviewGeoPoint(pkg) !== null)
    const windowBox = countryGeoPackages.length > 0 ? buildGeoMapWindow(countryGeoPackages, country || selectedCountry) : getCountryMapWindow(country || selectedCountry)
    const seed = hashSeed(`${country}-${index}-${countryPackages.length}`)
    const jitterX = ((seed % 100) / 100 - 0.5) * Math.min(windowBox.width * 0.08, 2.4)
    const jitterY = ((Math.floor(seed / 19) % 100) / 100 - 0.5) * Math.min(windowBox.height * 0.08, 2)
    const cheapestPackage = [...countryPackages].sort((a, b) => getPreviewPrice(a) - getPreviewPrice(b))[0]

    return {
      country,
      packages: countryPackages,
      cheapestPackage,
      left: windowBox.left + jitterX,
      top: windowBox.top + jitterY,
      windowBox,
    }
  })
}

function buildCountryOverviewWindow(
  entries: Array<{
    country: string
    windowBox: MapWindow
  }>,
  selectedCountry?: string,
) {
  if (entries.length === 0) return getCountryMapWindow(selectedCountry)

  const prioritizedEntry =
    entries.find((entry) => entry.country.trim().toLowerCase() === (selectedCountry || "").trim().toLowerCase()) || entries[0]

  if (selectedCountry) return prioritizedEntry.windowBox

  const unionBBox = entries.reduce(
    (acc, entry) => {
      const bounds = parseBBox(entry.windowBox.bbox)
      return {
        minLng: Math.min(acc.minLng, bounds.minLng),
        minLat: Math.min(acc.minLat, bounds.minLat),
        maxLng: Math.max(acc.maxLng, bounds.maxLng),
        maxLat: Math.max(acc.maxLat, bounds.maxLat),
      }
    },
    {
      minLng: Number.POSITIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    },
  )

  const paddedLng = Math.max((unionBBox.maxLng - unionBBox.minLng) * 0.12, 4)
  const paddedLat = Math.max((unionBBox.maxLat - unionBBox.minLat) * 0.12, 3)

  return buildMapWindowFromBBox(
    stringifyBBox({
      minLng: clamp(unionBBox.minLng - paddedLng, -179.5, 179.5),
      minLat: clamp(unionBBox.minLat - paddedLat, -85, 85),
      maxLng: clamp(unionBBox.maxLng + paddedLng, -179.5, 179.5),
      maxLat: clamp(unionBBox.maxLat + paddedLat, -85, 85),
    }),
    prioritizedEntry.country || "Asia",
  )
}

export default function FilterClient({
  facilities,
  initialState,
  locale,
  maxAvailablePrice,
  onChange,
  packages,
  searchBarCountries = [],
  selectedCountry,
  selectedStyle,
  selectedDuration,
  totalPackages,
}: {
  facilities: Facility[]
  initialState?: Partial<PackageFilterState>
  locale: Locale
  maxAvailablePrice: number
  onChange: (state: PackageFilterState) => void
  packages?: PackagePreview[]
  searchBarCountries?: string[]
  selectedCountry?: string
  selectedStyle?: string
  selectedDuration?: string
  totalPackages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = dictionaries[locale].filter
  const priceCurrency = localeCurrencyMap[locale]
  const showMapDebug = searchParams.get("debug_map") === "1"
  const isMapRequested = searchParams.get("map") === "1"
  const sliderMin = 0
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)
  const priceChangeTimeoutRef = useRef<number | null>(null)

  const [minPrice, setMinPrice] = useState(initialState?.minPrice ?? sliderMin)
  const [maxPrice, setMaxPrice] = useState(initialState?.maxPrice ?? sliderMax)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initialState?.selectedFacilities ?? [])
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(isMapRequested)
  const [manualActiveMapCountry, setManualActiveMapCountry] = useState("")
  const [manualActiveMapPackageId, setManualActiveMapPackageId] = useState("")
  const [mapViewportState, setMapViewportState] = useState<{ key: string; bbox: string } | null>(null)

  const sliderStep = useMemo(() => {
    if (priceCurrency === "USD") return 10
    if (priceCurrency === "CNY") return 100
    return 100000
  }, [priceCurrency])

  const groupedEntries = useMemo(() => {
    const grouped = facilities.reduce<Record<string, Facility[]>>((acc, facility) => {
      if (!acc[facility.category]) acc[facility.category] = []
      acc[facility.category].push(facility)
      return acc
    }, {})

    return Object.entries(grouped)
  }, [facilities])

  const [openCategories, setOpenCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const storedValue = window.sessionStorage.getItem(openCategoriesStorageKey)
      if (storedValue) {
        const parsed = storedValue
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        if (parsed.length > 0) return parsed
      }
    }

    return groupedEntries.length > 0 ? [groupedEntries[0][0]] : []
  })

  const effectiveMinPrice = Math.min(minPrice, sliderMax)
  const effectiveMaxPrice = Math.min(Math.max(maxPrice, effectiveMinPrice), sliderMax)
  const minPercent =
    sliderMax === sliderMin ? 0 : ((effectiveMinPrice - sliderMin) / (sliderMax - sliderMin)) * 100
  const maxPercent =
    sliderMax === sliderMin ? 100 : ((effectiveMaxPrice - sliderMin) / (sliderMax - sliderMin)) * 100

  const emitChange = ({
    nextMinPrice = minPrice,
    nextMaxPrice = maxPrice,
    nextSelectedFacilities = selectedFacilities,
  }: {
    nextMinPrice?: number
    nextMaxPrice?: number
    nextSelectedFacilities?: string[]
  }) => {
    const boundedMinPrice = Math.min(nextMinPrice, sliderMax)
    const boundedMaxPrice = Math.min(Math.max(nextMaxPrice, boundedMinPrice), sliderMax)

    onChange({
      minPrice: boundedMinPrice,
      maxPrice: boundedMaxPrice,
      selectedFacilities: nextSelectedFacilities,
    })
  }

  const schedulePriceChange = (nextMinPrice: number, nextMaxPrice: number) => {
    if (typeof window === "undefined") {
      emitChange({ nextMinPrice, nextMaxPrice })
      return
    }

    if (priceChangeTimeoutRef.current !== null) {
      window.clearTimeout(priceChangeTimeoutRef.current)
    }

    priceChangeTimeoutRef.current = window.setTimeout(() => {
      emitChange({ nextMinPrice, nextMaxPrice })
      priceChangeTimeoutRef.current = null
    }, 180)
  }

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(openCategoriesStorageKey, openCategories.join(","))
  }, [openCategories])

  useEffect(() => {
    return () => {
      if (priceChangeTimeoutRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(priceChangeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!isMobilePanelOpen && !isMapModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMapModalOpen, isMobilePanelOpen])

  useEffect(() => {
    setIsMapModalOpen(isMapRequested)
  }, [isMapRequested])

  const resetFilters = () => {
    setMinPrice(sliderMin)
    setMaxPrice(sliderMax)
    setSelectedFacilities([])
    emitChange({
      nextMinPrice: sliderMin,
      nextMaxPrice: sliderMax,
      nextSelectedFacilities: [],
    })
  }

  const hasActiveFilters =
    effectiveMinPrice > sliderMin || effectiveMaxPrice < sliderMax || selectedFacilities.length > 0

  const mobileFilterTitle =
    locale === "en" ? "Filter packages" : locale === "zh" ? "ç­›é€‰å¥—é¤" : "Filter paket"
  const mobileFilterSubtitle =
    locale === "en"
      ? "Refine the packages that match your plan."
      : locale === "zh"
        ? "è°ƒæ•´ç¬¦åˆä½ è®¡åˆ’çš„å¥—ç¥¨ã€‚"
        : "Atur paket yang paling cocok dengan rencanamu."
  const mobileOpenLabel =
    locale === "en" ? "Open filters" : locale === "zh" ? "æ‰“å¼€ç­›é€‰" : "Buka filter"
  const mobileCloseLabel =
    locale === "en" ? "Close" : locale === "zh" ? "å…³é—­" : "Tutup"
  const trustTitle =
    locale === "en"
      ? "Safe and trusted booking"
      : locale === "zh"
        ? "å®‰å…¨å¯é çš„é¢„è®¢"
        : "Pemesanan aman dan terpercaya"
  const trustBody =
    locale === "en"
      ? "Secure transactions, protected customer data, and support when you need it."
      : locale === "zh"
        ? "å®‰å…¨äº¤æ˜“ã€�å®¢æˆ·æ•°æ®å—ä¿æŠ¤ï¼Œå¹¶åœ¨éœ€è¦æ—¶æä¾›æ”¯æŒã€‚"
        : "Transaksi lebih aman, data customer terlindungi, dan dukungan saat Anda membutuhkannya."
  const exploreTitle =
    locale === "en"
      ? `Explore ${selectedCountry || "tour destinations"}`
      : locale === "zh"
        ? `探索${selectedCountry || "热门目的地"}`
        : `Jelajahi ${selectedCountry || "destinasi tour"}`
  const exploreMeta = [selectedStyle || (locale === "en" ? "All styles" : locale === "zh" ? "全部风格" : "Semua style"), selectedDuration || (locale === "en" ? "Any duration" : locale === "zh" ? "任意时长" : "Semua durasi")]
    .filter(Boolean)
    .join(" • ")
  const exploreAction =
    locale === "en" ? "Open map area" : locale === "zh" ? "打开地图区域" : "Buka area peta"
  const syncMapQueryState = (nextOpen: boolean) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextOpen) params.set("map", "1")
    else params.delete("map")

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }

  const handleExploreClick = () => {
    setIsMapModalOpen(true)
    syncMapQueryState(true)
  }

  const handleCloseMapModal = () => {
    setIsMapModalOpen(false)
    syncMapQueryState(false)
  }
  const mapModalBackLabel =
    locale === "en" ? "Back to List View" : locale === "zh" ? "返回列表" : "Kembali ke daftar"
  const mapModalTitle =
    locale === "en" ? "Tour map explorer" : locale === "zh" ? "套餐地图探索" : "Eksplor peta tour"
  const mapModalHint =
    locale === "en"
      ? "Stage 1 map mode: compare packages by area and price."
      : locale === "zh"
        ? "阶段 1 地图模式：按区域和价格比较套餐。"
        : "Mode peta tahap 1: bandingkan paket berdasarkan area dan harga."
  const mapModalSurfaceTitle = mapModalTitle
  const mapModalSurfaceHint = mapModalHint
  const mapModalEmpty =
    locale === "en"
      ? "No package points are ready for this filter yet."
      : locale === "zh"
        ? "当前筛选下还没有可显示的套餐点位。"
        : "Belum ada titik paket yang siap ditampilkan untuk filter ini."
  const mapModalPackages = [...(packages || [])].sort((a, b) => getPreviewPrice(a) - getPreviewPrice(b)).slice(0, 15)
  const mapCountries = buildCountryMarkerLayout(mapModalPackages, selectedCountry)
  const mapWindow = buildCountryOverviewWindow(mapCountries, selectedCountry)
  const activeCountryLabel = selectedCountry || manualActiveMapCountry || mapCountries[0]?.country || mapWindow.centerLabel
  const activeMapCountryGroup = mapCountries.find((entry) => entry.country === activeCountryLabel) || mapCountries[0] || null
  const activeMapPackages = activeMapCountryGroup?.packages || mapModalPackages
  const activeMapPackageCount = activeMapCountryGroup?.packages.length || mapModalPackages.length
  const mapDrawerTitle =
    locale === "en"
      ? `Packages in ${activeCountryLabel}`
      : locale === "zh"
        ? `${activeCountryLabel}的套餐`
        : `Paket di ${activeCountryLabel}`
  const mapSearchPlaceholder =
    locale === "en" ? "Country, tour package, place to go" : locale === "zh" ? "国家、套餐、目的地" : "Negara, paket tour, tempat tujuan"
  const mapZoomHint =
    locale === "en"
      ? "Country-based map mode. Zoom and pan for a closer tour view."
      : locale === "zh"
        ? "国家级地图模式。可缩放和拖动以查看更近的旅游视图。"
        : "Mode peta berbasis negara. Zoom dan geser untuk melihat area tour lebih dekat."
  const mapInteractionHint =
    locale === "en"
      ? "Tap a price point to focus the area and update the package strip below."
      : locale === "zh"
        ? "点击价格点位以聚焦区域，并更新下方套餐列表。"
        : "Klik titik harga untuk fokus ke area dan memperbarui list paket di bawah."
  const activeAreaSummary =
    locale === "en"
      ? `${totalPackages} packages match the current catalog filters`
      : locale === "zh"
        ? `${totalPackages} 个套餐符合当前筛选`
        : `${totalPackages} paket cocok dengan filter katalog saat ini`
  const applyAreaLabel =
    locale === "en"
      ? `View ${activeMapPackageCount} packages`
      : locale === "zh"
        ? `查看 ${activeMapPackageCount} 个套餐`
        : `Lihat ${activeMapPackageCount} paket`

  // PROTECTED-PACKAGE-MAP-RESULTS-START
  const geoReadyPackages = mapModalPackages.filter((pkg) => getPreviewGeoPoint(pkg) !== null)
  const mapReadyPackages = mapModalPackages.filter((pkg) => Boolean(getPreviewMapPoint(pkg, selectedCountry)))
  const useActiveResultMap = mapReadyPackages.length > 0
  const activeResultBaseWindow = useActiveResultMap ? buildPackageMapWindow(mapReadyPackages, selectedCountry) : mapWindow
  const activeResultViewportKey = useActiveResultMap
    ? `geo:${selectedCountry || "all"}:${mapReadyPackages.map((pkg) => pkg.id).join(",")}`
    : `country:${selectedCountry || "all"}:${mapCountries.map((entry) => `${entry.country}:${entry.packages.length}`).join(",")}`
  const activeViewportBBox =
    mapViewportState?.key === activeResultViewportKey ? mapViewportState.bbox : activeResultBaseWindow.bbox
  const resolvedMapWindow = buildMapWindowFromBBox(activeViewportBBox, activeResultBaseWindow.centerLabel)
  const visibleGeoPackages = useActiveResultMap
    ? mapReadyPackages.filter((pkg) => {
        const point = getPreviewMapPoint(pkg, selectedCountry)
        return pointIsInsideBBox(point, activeViewportBBox)
      })
    : []
  const resolvedGeoMarkers = useActiveResultMap ? buildPackageMarkerLayout(visibleGeoPackages, activeViewportBBox, selectedCountry) : []
  const resolvedCountryMarkers = !useActiveResultMap
    ? mapCountries.map(({ country, cheapestPackage, windowBox }) => {
        const center = getBBoxCenter(windowBox.bbox)
        return {
          id: country,
          lat: center.lat,
          lng: center.lng,
          label: country,
          priceLabel: formatPackageMoney(getPreviewPrice(cheapestPackage), cheapestPackage.livePricing?.currency || cheapestPackage.currency || priceCurrency, locale),
          active: country === activeCountryLabel,
        }
      })
    : []
  const resolvedActiveCountryGroup = !useActiveResultMap
    ? mapCountries.find((entry) => entry.country === activeCountryLabel) || mapCountries[0] || null
    : null
  const selectedCountryGroup = !useActiveResultMap
    ? mapCountries.find((entry) => entry.country === manualActiveMapCountry) || null
    : null
  const resolvedActiveMapPackageId = useActiveResultMap
    ? (resolvedGeoMarkers.some((entry) => entry.pkg.id === manualActiveMapPackageId)
        ? manualActiveMapPackageId
        : resolvedGeoMarkers[0]?.pkg.id || "")
    : ""
  const resolvedActiveMapPackage = useActiveResultMap
    ? resolvedGeoMarkers.find((entry) => entry.pkg.id === resolvedActiveMapPackageId)?.pkg || resolvedGeoMarkers[0]?.pkg || null
    : resolvedActiveCountryGroup?.cheapestPackage || null
  const popupActivePackage = useActiveResultMap
    ? (manualActiveMapPackageId
        ? resolvedGeoMarkers.find((entry) => entry.pkg.id === manualActiveMapPackageId)?.pkg || null
        : null)
    : selectedCountryGroup?.cheapestPackage || null
  const popupActiveMarker = useActiveResultMap
    ? (manualActiveMapPackageId
        ? resolvedGeoMarkers.find((entry) => entry.pkg.id === manualActiveMapPackageId) || null
        : null)
    : selectedCountryGroup
      ? {
          point: getBBoxCenter(selectedCountryGroup.windowBox.bbox),
        }
      : null
  const resolvedMapModalSurfaceTitle = useActiveResultMap
    ? locale === "en"
      ? "Active package results"
      : locale === "zh"
        ? "å½“å‰å¥—é¤ç»“æžœ"
        : "Hasil paket aktif"
    : mapModalSurfaceTitle
  const resolvedMapModalSurfaceHint = useActiveResultMap
    ? locale === "en"
      ? "Map now follows the packages that match your current search."
      : locale === "zh"
        ? "åœ°å›¾çŽ°åœ¨è·Ÿéšå½“å‰æœç´¢åŒ¹é…çš„å¥—é¤ã€‚"
        : "Peta sekarang mengikuti paket yang cocok dengan pencarian aktifmu."
    : mapModalSurfaceHint
  const resolvedFocusLabel = useActiveResultMap
    ? selectedCountry || resolvedActiveMapPackage?.city || resolvedActiveMapPackage?.country || resolvedMapWindow.centerLabel
    : activeCountryLabel
  const resolvedMapZoomHint = useActiveResultMap
    ? locale === "en"
      ? "Active-search map mode. Zoom controls update the visible results on this map."
      : locale === "zh"
        ? "å½“å‰æœç´¢åœ°å›¾æ¨¡å¼ã€‚è§†å›¾ä¼šè·ŸéšçœŸå®žå¥—é¤ç‚¹ä½ã€‚"
        : "Mode peta hasil aktif. Tombol zoom memperbarui hasil yang terlihat di peta ini."
    : mapZoomHint
  const resolvedMapInteractionHint = useActiveResultMap
    ? locale === "en"
      ? "Tap a package price point to inspect the active search results on the map."
      : locale === "zh"
        ? "ç‚¹å‡»å¥—é¤ä»·æ ¼ç‚¹ä½ï¼ŒæŸ¥çœ‹åœ°å›¾ä¸Šçš„å½“å‰æœç´¢ç»“æžœã€‚"
        : "Klik titik harga paket untuk memeriksa hasil pencarian aktif di peta."
    : mapInteractionHint
  const resolvedActiveMapPackages = useActiveResultMap ? resolvedGeoMarkers.map((entry) => entry.pkg) : activeMapPackages
  const resolvedActiveMapPackageCount = useActiveResultMap ? resolvedGeoMarkers.length : activeMapPackageCount
  const resolvedActiveAreaSummary = useActiveResultMap
    ? resolvedActiveMapPackageCount === 0
      ? locale === "en"
        ? "No active results are visible in the current map viewport"
        : locale === "zh"
          ? `当前地图视图中没有可见结果`
          : "Belum ada hasil aktif yang terlihat di viewport peta saat ini"
      : locale === "en"
        ? `${resolvedActiveMapPackageCount} active results are visible on this map`
        : locale === "zh"
          ? `è¿™å¼ åœ°å›¾ä¸Šæ˜¾ç¤º ${resolvedActiveMapPackageCount} ä¸ªå½“å‰ç»“æžœ`
          : `${resolvedActiveMapPackageCount} hasil pencarian aktif terlihat di peta ini`
    : activeAreaSummary
  const resolvedApplyAreaLabel = useActiveResultMap
    ? locale === "en"
      ? "View active results"
      : locale === "zh"
        ? "æŸ¥çœ‹å½“å‰ç»“æžœ"
        : "Lihat hasil aktif"
    : applyAreaLabel
  const resolvedMapDrawerTitle = useActiveResultMap
    ? locale === "en"
      ? `Showing ${resolvedActiveMapPackageCount} active results`
      : locale === "zh"
        ? `æ˜¾ç¤º ${resolvedActiveMapPackageCount} ä¸ªå½“å‰ç»“æžœ`
        : `Menampilkan ${resolvedActiveMapPackageCount} hasil aktif`
    : mapDrawerTitle
  const resolvedExploreTitle = useActiveResultMap
    ? locale === "en"
      ? `Active results in ${resolvedFocusLabel}`
      : locale === "zh"
        ? `${resolvedFocusLabel} å½“å‰ç»“æžœ`
        : `Hasil aktif di ${resolvedFocusLabel}`
    : exploreTitle
  const resolvedExploreMeta = useActiveResultMap
    ? locale === "en"
      ? `Viewport currently shows ${resolvedActiveMapPackageCount} live package points`
      : locale === "zh"
        ? `åœ°å›¾è·Ÿéš ${resolvedActiveMapPackageCount} ä¸ªçœŸå®žå¥—é¤ç‚¹ä½`
        : `Viewport saat ini menampilkan ${resolvedActiveMapPackageCount} titik paket yang nyata`
    : exploreMeta
  const resolvedExploreSummary = useActiveResultMap ? resolvedActiveAreaSummary : activeAreaSummary
  const resolvedExploreAction = useActiveResultMap
    ? locale === "en"
      ? "Open active result map"
      : locale === "zh"
        ? "æ‰“å¼€å½“å‰ç»“æžœåœ°å›¾"
        : "Buka peta hasil aktif"
    : exploreAction
  const resolvedHeaderChip = useActiveResultMap ? resolvedFocusLabel : activeCountryLabel
  const resolvedMapResultHeading = useActiveResultMap
    ? locale === "en"
      ? "Active search results"
      : locale === "zh"
        ? "å½“å‰æœç´¢ç»“æžœ"
        : "Hasil pencarian aktif"
    : locale === "en"
      ? "Cheapest package points"
      : locale === "zh"
        ? "æœ€ä½Žä»·å¥—é¤ç‚¹ä½"
        : "Titik paket termurah"
  // PROTECTED-PACKAGE-MAP-RESULTS-END
  const mapAccessibilitySummary = [
    mapModalTitle,
    mapModalHint,
    mapSearchPlaceholder,
    resolvedMapModalSurfaceTitle,
    resolvedMapModalSurfaceHint,
    resolvedMapZoomHint,
    resolvedMapInteractionHint,
    resolvedMapDrawerTitle,
    resolvedMapResultHeading,
    resolvedApplyAreaLabel,
    `${resolvedActiveMapPackages.length}`,
  ].join(" | ")
  const resetViewportLabel =
    locale === "en" ? "Fit map" : locale === "zh" ? "Fit map" : "Sesuaikan peta"
  const mapPreviewOpenLabel =
    locale === "en" ? "Open details" : locale === "zh" ? "打开详情" : "Buka detail"
  const zoomViewport = (factor: number) => {
    setMapViewportState({
      key: activeResultViewportKey,
      bbox: zoomBBox(activeViewportBBox, factor),
    })
  }
  const resetViewport = () => {
    setMapViewportState({
      key: activeResultViewportKey,
      bbox: activeResultBaseWindow.bbox,
    })
  }
  const handleActiveMapBoundsChange = (nextBBox: string) => {
    if (nextBBox === activeViewportBBox) return
    setMapViewportState({
      key: activeResultViewportKey,
      bbox: nextBBox,
    })
  }
  const mapDebugRows = showMapDebug
    ? (packages || []).slice(0, 12).map((pkg) => {
        const point = getPreviewGeoPoint(pkg)
        return {
          id: pkg.id,
          title: getPreviewTitle(pkg, locale),
          country: pkg.country || "-",
          hasGeo: Boolean(point),
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          locationLabel: point?.label || "-",
        }
      })
    : []


  const filterBody = (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-[#f1ddd0] bg-[linear-gradient(135deg,#fff8f2_0%,#fff1e7_100%)] shadow-[0_18px_40px_-34px_rgba(239,91,42,0.18)]">
        <div className="relative min-h-[160px] px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.78)_0,rgba(255,255,255,0.78)_3px,transparent_3px)] bg-[length:16px_16px] opacity-30" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_20%_30%,rgba(254,215,170,0.34)_0,rgba(254,215,170,0.34)_18%,transparent_18%),radial-gradient(circle_at_68%_56%,rgba(251,191,36,0.18)_0,rgba(251,191,36,0.18)_16%,transparent_16%),linear-gradient(135deg,rgba(255,237,213,0.82)_0%,rgba(255,247,237,0.52)_100%)]" />
          <div className="pointer-events-none absolute right-6 top-5 h-10 w-10 rounded-full border-8 border-[#ef5b2a] bg-white shadow-[0_10px_20px_-12px_rgba(239,91,42,0.3)]" />
          <div className="pointer-events-none absolute right-[92px] top-0 h-full w-px bg-white/70" />
          <div className="relative flex h-full flex-col justify-end">
             <p className="max-w-[220px] text-[18px] font-semibold tracking-[-0.03em] text-[#b85a2c]">{resolvedExploreTitle}</p>
             <p className="mt-3 max-w-[240px] text-[12px] font-medium text-[#ef5b2a]">{resolvedExploreSummary}</p>
             <button
               type="button"
                 onClick={handleExploreClick}
                className="mt-5 inline-flex w-fit items-center rounded-full bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(239,68,35,0.58)] transition hover:brightness-105"
              >
                {resolvedExploreAction}
              </button>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3 sm:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filter Paket</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {locale === "en"
                ? "Adjust your package preference"
                : locale === "zh"
                  ? "è°ƒæ•´ä½ çš„å¥—ç¥¨åå¥½"
                  : "Atur preferensi paketmu"}
            </p>
          </div>
          {selectedFacilities.length > 0 ? (
            <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
              {selectedFacilities.length}
            </span>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-slate-900">{t.priceRange}</p>
            <p className="mt-1 text-sm text-slate-500">{t.perPackage}</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="text-sm font-semibold text-orange-600 transition hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {t.reset}
          </button>
        </div>

        <div className="relative mt-6 px-2">
          <div className="h-1 rounded-full bg-[#edf1f5]" />
          <div
            className="pointer-events-none absolute top-0 h-1 rounded-full bg-[#ff6131]"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(maxPercent - minPercent, 0)}%`,
            }}
          />

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={minPrice}
            onChange={(event) => {
              const nextMin = Math.min(Number(event.target.value), maxPrice)
              setMinPrice(nextMin)
              schedulePriceChange(nextMin, maxPrice)
            }}
            className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)]"
          />
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={maxPrice}
            onChange={(event) => {
              const nextMax = Math.max(Number(event.target.value), minPrice)
              setMaxPrice(nextMax)
              schedulePriceChange(minPrice, nextMax)
            }}
            className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-slate-200 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)]"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8">
          <div className="min-w-0 rounded-2xl border border-[#e6ebf2] bg-[#fcfdff] px-3 py-3 text-[12px] font-medium text-slate-700 sm:rounded-full sm:text-[13px]">
            {formatPackageMoney(effectiveMinPrice, priceCurrency, locale)}
          </div>
          <div className="min-w-0 rounded-2xl border border-[#e6ebf2] bg-[#fcfdff] px-3 py-3 text-[12px] font-medium text-slate-700 sm:rounded-full sm:text-[13px]">
            {formatPackageMoney(effectiveMaxPrice, priceCurrency, locale)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {groupedEntries.map(([category, items]) => {
          const isOpen = openCategories.includes(category)
          const selectedCount = items.filter((facility) => selectedFacilities.includes(facility.id)).length

          return (
            <div
              key={category}
              className="overflow-hidden rounded-[22px] border border-[#eef1f6] bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]"
            >
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <span className="block text-[13px] font-semibold tracking-[-0.01em] text-slate-900">
                    {getFacilityCategoryLabel(category, locale)}
                  </span>
                  {selectedCount > 0 ? (
                    <span className="mt-1 block text-[11px] font-medium text-orange-500">
                      {locale === "en"
                        ? `${selectedCount} selected`
                        : locale === "zh"
                          ? `å·²é€‰ ${selectedCount}`
                          : `${selectedCount} dipilih`}
                    </span>
                  ) : null}
                </div>
                <span className={`text-sm text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>

              {isOpen ? (
                <div className="border-t border-slate-100 px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map((facility) => (
                      <label key={facility.id} className="flex items-start gap-3 rounded-xl px-1 py-1 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          value={facility.id}
                          checked={selectedFacilities.includes(facility.id)}
                          onChange={(event) => {
                            const nextSelectedFacilities = event.target.checked
                              ? [...selectedFacilities, facility.id]
                              : selectedFacilities.filter((id) => id !== facility.id)

                            setSelectedFacilities(nextSelectedFacilities)
                            emitChange({ nextSelectedFacilities })
                          }}
                          className="mt-1 rounded border-slate-300"
                        />
                        <span>{getFacilityLabel(facility.name, locale)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rounded-[22px] border border-[#eef1f6] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff4ec] text-orange-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
              <path d="M12 3.8 5.5 6.5v5c0 4.2 2.5 7.5 6.5 8.7 4-1.2 6.5-4.5 6.5-8.7v-5L12 3.8Z" />
              <path d="m9.5 12 1.6 1.6 3.4-3.7" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">{trustTitle}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{trustBody}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className="flex w-full items-center justify-between rounded-[24px] border border-orange-100 bg-[linear-gradient(135deg,#ffffff_0%,#fff9f2_55%,#fff1e3_100%)] px-4 py-3.5 text-left shadow-[0_18px_40px_-30px_rgba(249,115,22,0.35)]"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{mobileFilterTitle}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{mobileFilterSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters ? (
              <span className="rounded-full border border-orange-100 bg-white px-3 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
                {selectedFacilities.length > 0 ? selectedFacilities.length : 1}
              </span>
            ) : null}
            <span className="rounded-full bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(249,115,22,0.85)]">
              {mobileOpenLabel}
            </span>
          </div>
        </button>
      </div>

      <div className="hidden lg:block">{filterBody}</div>

      {showMapDebug ? (
        <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/80 p-4 text-sm text-slate-700 shadow-[0_18px_40px_-34px_rgba(180,83,9,0.18)]">
          <p className="font-semibold text-amber-900">Debug map geo</p>
          <p className="mt-1 text-xs text-amber-800">
            `useActiveResultMap`: {String(useActiveResultMap)} | `selectedCountry`: {selectedCountry || "-"} | `geoReadyPackages`: {geoReadyPackages.length} / {(packages || []).length}
          </p>
          <div className="mt-3 space-y-2">
            {mapDebugRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2">
                <p className="font-medium text-slate-900">{row.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {row.country} | geo: {row.hasGeo ? "yes" : "no"} | lat: {row.lat ?? "-"} | lng: {row.lng ?? "-"} | label: {row.locationLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isMapModalOpen && typeof document !== "undefined"
        ? createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-white">
          <div className="border-b border-slate-200 bg-white px-3 py-2 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.35)]">
            <div className="grid items-center gap-2 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
              <button
                type="button"
                onClick={handleCloseMapModal}
                title={mapModalBackLabel}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#c8d7ee] bg-white px-3 py-2 text-[12px] font-semibold text-[#1b4f87] transition hover:bg-[#f5f9ff]"
              >
                <span aria-hidden="true">‹</span>
                <span>{mapModalBackLabel}</span>
              </button>
              <div className="min-w-0">
                <SearchBar
                  key={`package-map-search:${locale}:${selectedCountry || ""}:${selectedStyle || ""}:${selectedDuration || ""}`}
                  locale={locale}
                  countries={searchBarCountries}
                  destinationPath="/packages/catalog"
                  variant="mapCompact"
                />
              </div>
              <button
                type="button"
                onClick={handleCloseMapModal}
                className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {mobileCloseLabel}
              </button>
            </div>
            <div className="sr-only" aria-live="polite">
              <p>{mapAccessibilitySummary}</p>
              <span className="truncate rounded-full border border-[#dbe7f5] bg-[#f6fbff] px-3 py-1.5 text-xs font-semibold text-[#1b4f87]">{resolvedHeaderChip}</span>
              <p className="truncate text-xs text-slate-500">{resolvedExploreTitle} • {resolvedExploreMeta}</p>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#dcebf8]">
            <ActiveResultsMap
              bbox={activeViewportBBox}
              markers={
                useActiveResultMap
                  ? resolvedGeoMarkers.map(({ pkg, point }) => ({
                      id: pkg.id,
                      lat: point.lat,
                      lng: point.lng,
                      label: point.label || getPreviewTitle(pkg, locale),
                      priceLabel: formatPackageMoney(getPreviewPrice(pkg), pkg.livePricing?.currency || pkg.currency || priceCurrency, locale),
                      active: pkg.id === resolvedActiveMapPackageId,
                    }))
                  : resolvedCountryMarkers
              }
              activeMarker={
                popupActivePackage && popupActiveMarker
                  ? {
                      id: popupActivePackage.id,
                      lat: popupActiveMarker.point.lat,
                      lng: popupActiveMarker.point.lng,
                      content: (
                        <div className="w-[280px] overflow-hidden rounded-[22px] border border-white/90 bg-white/98 shadow-[0_26px_60px_-28px_rgba(15,23,42,0.34)] backdrop-blur">
                          <div className="relative h-[156px] w-full bg-slate-100">
                            <Image
                              src={getPreviewImage(popupActivePackage)}
                              alt={getPreviewTitle(popupActivePackage, locale)}
                              fill
                              sizes="280px"
                              className="object-cover"
                            />
                          </div>
                          <div className="space-y-3 p-4">
                            <div>
                              <p className="line-clamp-2 text-[18px] font-semibold leading-[1.12] tracking-[-0.03em] text-slate-950">
                                {getPreviewTitle(popupActivePackage, locale)}
                              </p>
                              {getPreviewMeta(popupActivePackage, locale) ? (
                                <p className="mt-1.5 text-[13px] text-slate-500">{getPreviewMeta(popupActivePackage, locale)}</p>
                              ) : null}
                            </div>
                            <div className="flex items-end justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                  {locale === "en" ? "Starting from" : locale === "zh" ? "起价" : "Mulai dari"}
                                </p>
                                <p className="mt-1 truncate text-[22px] font-semibold leading-none tracking-[-0.04em] text-[#ef5b2a]">
                                  {formatPackageMoney(
                                    getPreviewPrice(popupActivePackage),
                                    popupActivePackage.livePricing?.currency || popupActivePackage.currency || priceCurrency,
                                    locale,
                                  )}
                                </p>
                              </div>
                              <Link
                                href={`/packages/${encodeURIComponent(popupActivePackage.slug)}`}
                                className="inline-flex shrink-0 items-center rounded-full bg-[#ff6a3d] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_14px_30px_-18px_rgba(255,106,61,0.85)] transition hover:brightness-105"
                              >
                                {mapPreviewOpenLabel}
                              </Link>
                            </div>
                          </div>
                        </div>
                      ),
                    }
                  : null
              }
              onBoundsChange={handleActiveMapBoundsChange}
              onMapBackgroundClick={
                useActiveResultMap
                  ? () => setManualActiveMapPackageId("")
                  : () => setManualActiveMapCountry("")
              }
              onSelectMarker={useActiveResultMap ? setManualActiveMapPackageId : setManualActiveMapCountry}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.72)_42%,rgba(255,255,255,0)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.72)_44%,rgba(255,255,255,0.96)_100%)]" />
            <div className="pointer-events-auto absolute right-4 top-[108px] z-[1000] overflow-hidden rounded-[16px] border border-slate-200 bg-white/96 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.28)]">
              <button type="button" onClick={() => zoomViewport(0.6)} className="block w-12 border-b border-slate-200 py-2 text-xl font-medium text-slate-600">
                +
              </button>
              <button type="button" onClick={() => zoomViewport(1.6)} className="block w-12 border-b border-slate-200 py-2 text-xl font-medium text-slate-600">
                −
              </button>
              <button type="button" onClick={resetViewport} className="block w-12 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {resetViewportLabel}
              </button>
            </div>

            {!useActiveResultMap && mapCountries.length === 0 ? (
              <div
                title={mapModalEmpty}
                className="absolute left-1/2 top-1/2 w-[320px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white/92 px-5 py-4 text-center shadow-[0_20px_44px_-24px_rgba(15,23,42,0.24)]"
              >
                <p className="text-sm font-semibold text-slate-900">{mapModalEmpty}</p>
              </div>
            ) : null}
          </div>
        </div>,
        document.body,
      )
        : null}

      {isMobilePanelOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-3 lg:hidden">
          <button
            type="button"
            aria-label={mobileCloseLabel}
            className="absolute inset-0"
            onClick={() => setIsMobilePanelOpen(false)}
          />
          <div className="relative max-h-[88vh] w-full overflow-hidden rounded-t-[28px] border border-orange-100 bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] shadow-[0_-24px_60px_-34px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-orange-100/80 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{mobileFilterTitle}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{mobileFilterSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePanelOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm"
              >
                {mobileCloseLabel}
              </button>
            </div>
            <div className="max-h-[calc(88vh-84px)] overflow-y-auto px-4 py-4">{filterBody}</div>
          </div>
        </div>
      ) : null}
    </>
  )
}



