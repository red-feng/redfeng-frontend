"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { getFacilityCategoryLabel, getFacilityLabel } from "@/lib/facility-labels"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatPackageMoney, localeCurrencyMap, resolvePackageTranslation } from "@/lib/package-pricing"

type Facility = {
  id: string
  name: string
  category: string
}

type PackagePreview = {
  id: string
  slug: string
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

function hashSeed(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003
  }
  return hash
}

function getCountryMapWindow(country?: string) {
  const normalized = (country || "").trim().toLowerCase()

  const presets: Record<string, { centerLabel: string; left: number; top: number; width: number; height: number; bbox: string }> = {
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

  return presets[normalized] || { centerLabel: country || "Asia", left: 58, top: 46, width: 24, height: 22, bbox: "60.0,-12.0,150.0,55.0" }
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
    const windowBox = getCountryMapWindow(country || selectedCountry)
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

export default function FilterClient({
  facilities,
  initialState,
  locale,
  maxAvailablePrice,
  onChange,
  packages,
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
  const sliderMin = 0
  const sliderMax = Math.max(maxAvailablePrice, sliderMin)
  const priceChangeTimeoutRef = useRef<number | null>(null)

  const [minPrice, setMinPrice] = useState(initialState?.minPrice ?? sliderMin)
  const [maxPrice, setMaxPrice] = useState(initialState?.maxPrice ?? sliderMax)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initialState?.selectedFacilities ?? [])
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [manualActiveMapCountry, setManualActiveMapCountry] = useState("")

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
  const handleExploreClick = () => {
    setIsMapModalOpen(true)
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
  const mapModalEmpty =
    locale === "en"
      ? "No package points are ready for this filter yet."
      : locale === "zh"
        ? "当前筛选下还没有可显示的套餐点位。"
        : "Belum ada titik paket yang siap ditampilkan untuk filter ini."
  const mapModalPackages = [...(packages || [])].sort((a, b) => getPreviewPrice(a) - getPreviewPrice(b)).slice(0, 15)
  const mapWindow = getCountryMapWindow(selectedCountry)
  const mapCountries = buildCountryMarkerLayout(mapModalPackages, selectedCountry)
  const activeCountryLabel = selectedCountry || manualActiveMapCountry || mapCountries[0]?.country || mapWindow.centerLabel
  const mapEmbedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(mapWindow.bbox)}&layer=mapnik`
  const mapModalSurfaceTitle = mapModalTitle
  const mapModalSurfaceHint = mapModalHint
  const mapModalSurfaceEmpty = mapModalEmpty
  const activeMapCountryGroup = mapCountries.find((entry) => entry.country === activeCountryLabel) || mapCountries[0] || null
  const activeMapPackages = activeMapCountryGroup?.packages || mapModalPackages
  const activeMapPackageCount = activeMapCountryGroup?.packages.length || mapModalPackages.length
  const activeMapPriceLabel = activeMapCountryGroup?.cheapestPackage
    ? formatPackageMoney(
        getPreviewPrice(activeMapCountryGroup.cheapestPackage),
        activeMapCountryGroup.cheapestPackage.livePricing?.currency || activeMapCountryGroup.cheapestPackage.currency || priceCurrency,
        locale,
      )
    : null
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

  const applyCountrySelection = (country: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const normalizedCountry = country.trim()

    if (normalizedCountry) {
      params.set("country", normalizedCountry)
    } else {
      params.delete("country")
    }

    params.delete("page")
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }

  const filterBody = (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[22px] border border-[#d8ebfb] bg-[linear-gradient(135deg,#eef8ff_0%,#dff1ff_100%)] shadow-[0_18px_40px_-34px_rgba(37,99,235,0.28)]">
        <div className="relative min-h-[160px] px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.78)_0,rgba(255,255,255,0.78)_3px,transparent_3px)] bg-[length:16px_16px] opacity-30" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle_at_20%_30%,rgba(129,212,250,0.34)_0,rgba(129,212,250,0.34)_18%,transparent_18%),radial-gradient(circle_at_68%_56%,rgba(96,165,250,0.24)_0,rgba(96,165,250,0.24)_16%,transparent_16%),linear-gradient(135deg,rgba(191,219,254,0.82)_0%,rgba(219,234,254,0.52)_100%)]" />
          <div className="pointer-events-none absolute right-6 top-5 h-10 w-10 rounded-full border-8 border-[#1f6fbd] bg-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.45)]" />
          <div className="pointer-events-none absolute right-[92px] top-0 h-full w-px bg-white/70" />
          <div className="relative flex h-full flex-col justify-end">
             <p className="max-w-[220px] text-[18px] font-semibold tracking-[-0.03em] text-[#0f4f87]">{exploreTitle}</p>
             <p className="mt-2 max-w-[230px] text-[13px] text-[#4e6f8f]">{exploreMeta}</p>
             <p className="mt-3 max-w-[240px] text-[12px] font-medium text-[#145da8]">{activeAreaSummary}</p>
             <button
               type="button"
               onClick={handleExploreClick}
              className="mt-5 inline-flex w-fit items-center rounded-full bg-[#1464b4] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(20,100,180,0.85)] transition hover:brightness-105"
            >
              {exploreAction}
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

      {isMapModalOpen ? (
        <div className="fixed inset-0 z-[80] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              className="inline-flex items-center gap-2 rounded-[14px] border border-[#c8d7ee] bg-white px-4 py-2.5 text-sm font-semibold text-[#1b4f87] transition hover:bg-[#f5f9ff]"
            >
              <span aria-hidden="true">‹</span>
              <span>{mapModalBackLabel}</span>
            </button>
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex">
              <span className="truncate rounded-full border border-[#dbe7f5] bg-[#f6fbff] px-3 py-1.5 text-xs font-semibold text-[#1b4f87]">{activeCountryLabel}</span>
              <p className="truncate text-xs text-slate-500">{exploreTitle} • {exploreMeta}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMapModalOpen(false)}
              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {mobileCloseLabel}
            </button>
          </div>

          <div className="relative h-[calc(100vh-69px)] overflow-hidden bg-[#dcebf8]">
            <iframe
              title={mapModalSurfaceTitle}
              src={mapEmbedSrc}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.72)_42%,rgba(255,255,255,0)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.72)_44%,rgba(255,255,255,0.96)_100%)]" />
            <div
              className="pointer-events-none absolute rounded-[44px] border border-[#60a5fa]/30 bg-[#2b6cb0]/8 shadow-[0_20px_50px_-30px_rgba(37,99,235,0.28)]"
              style={{
                left: `${mapWindow.left - mapWindow.width / 2}%`,
                top: `${mapWindow.top - mapWindow.height / 2}%`,
                width: `${mapWindow.width}%`,
                height: `${mapWindow.height}%`,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-[999px] border border-white/75 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-[#145da8] shadow-[0_14px_30px_-20px_rgba(15,23,42,0.24)]"
              style={{ left: `${mapWindow.left}%`, top: `${Math.max(mapWindow.top - mapWindow.height / 2 - 5, 8)}%`, transform: "translateX(-50%)" }}
            >
              {mapWindow.centerLabel}
            </div>

            <div className="absolute left-4 top-4 z-10 max-w-[360px] rounded-[18px] bg-white/96 px-4 py-3 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.26)] backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">{mapModalSurfaceTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{mapModalSurfaceHint}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#145da8]">
                {locale === "en"
                  ? `Focused country: ${activeCountryLabel}`
                  : locale === "zh"
                    ? `聚焦国家：${activeCountryLabel}`
                  : `Fokus negara: ${activeCountryLabel}`}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">{mapInteractionHint}</p>
            </div>

            <div className="absolute right-4 top-4 z-10 w-[min(420px,calc(100%-2rem))]">
              <div className="rounded-[16px] bg-white/96 px-4 py-3 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.26)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="text-lg text-[#1464b4]" aria-hidden="true">
                    ⌖
                  </span>
                  <span className="line-clamp-1 text-sm text-slate-400">{mapSearchPlaceholder}</span>
                </div>
              </div>
              <div className="mt-3 rounded-[16px] bg-white/94 px-4 py-3 text-sm text-slate-700 shadow-[0_22px_42px_-28px_rgba(15,23,42,0.24)] backdrop-blur">
                {mapZoomHint}
              </div>
            </div>

            <div className="absolute right-4 top-[108px] z-10 overflow-hidden rounded-[16px] border border-slate-200 bg-white/96 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.28)]">
              <button type="button" className="block w-12 border-b border-slate-200 py-2 text-xl font-medium text-slate-600">
                +
              </button>
              <button type="button" className="block w-12 py-2 text-xl font-medium text-slate-600">
                −
              </button>
            </div>

            {mapCountries.length === 0 ? (
              <div className="absolute left-1/2 top-1/2 w-[320px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white/92 px-5 py-4 text-center shadow-[0_20px_44px_-24px_rgba(15,23,42,0.24)]">
                <p className="text-sm font-semibold text-slate-900">{mapModalSurfaceEmpty}</p>
              </div>
            ) : (
              <>
                {mapCountries.map(({ country, packages: countryPackages, cheapestPackage, left, top }) => {
                  const isActiveCountry = country === activeCountryLabel

                  return (
                    <button
                      key={`country-${country}-${left}-${top}`}
                      type="button"
                      onClick={() => setManualActiveMapCountry(country)}
                      className="absolute z-[5] -translate-x-1/2 -translate-y-1/2 text-center"
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                    <div className={`rounded-[14px] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(20,93,168,0.72)] transition ${isActiveCountry ? "bg-[#0f4f87] ring-4 ring-white/80" : "bg-[#145da8] hover:bg-[#0f4f87]"}`}>
                      {formatPackageMoney(getPreviewPrice(cheapestPackage), cheapestPackage.livePricing?.currency || cheapestPackage.currency || priceCurrency, locale)}
                    </div>
                    <div className={`mx-auto mt-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isActiveCountry ? "bg-[#0f4f87]" : "bg-[#ff6a3d]"}`} />
                    <div className={`mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] ${isActiveCountry ? "text-[#0f4f87]" : "text-[#124d8c]"}`}>
                      {country}
                    </div>
                    <div className={`mt-1 text-center text-[10px] font-semibold ${isActiveCountry ? "text-[#0f4f87]" : "text-[#124d8c]"}`}>
                      {locale === "en"
                        ? `${countryPackages.length} packages`
                        : locale === "zh"
                          ? `${countryPackages.length} 个套餐`
                          : `${countryPackages.length} paket`}
                    </div>
                    </button>
                  )
                })}
              </>
            )}

            <div className="absolute inset-x-4 bottom-4 z-10 rounded-[24px] border border-slate-200 bg-white/96 p-4 shadow-[0_26px_60px_-32px_rgba(15,23,42,0.32)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{locale === "en" ? "Cheapest package points" : locale === "zh" ? "最低价套餐点位" : "Titik paket termurah"}</p>
                  <p className="text-xs text-slate-500">{exploreMeta}</p>
                  <p className="mt-1 text-xs font-medium text-[#145da8]">
                    {activeMapPriceLabel
                      ? locale === "en"
                        ? `${activeCountryLabel} starts from ${activeMapPriceLabel}`
                        : locale === "zh"
                          ? `${activeCountryLabel} 最低 ${activeMapPriceLabel}`
                          : `${activeCountryLabel} mulai dari ${activeMapPriceLabel}`
                      : activeAreaSummary}
                  </p>
                </div>
                <button
                  type="button"
                  title={mapDrawerTitle}
                  onClick={() => {
                    applyCountrySelection(activeCountryLabel)
                    setIsMapModalOpen(false)
                    const target = document.getElementById("package-search-results")
                    if (!target) return
                    const top = target.getBoundingClientRect().top + window.scrollY - 120
                    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" })
                  }}
                  className="rounded-full bg-[#1464b4] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_-18px_rgba(20,100,180,0.85)] transition hover:brightness-105"
                >
                  {applyAreaLabel}
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeMapPackages.map((pkg, index) => (
                  <a
                    key={pkg.id}
                    href={`/packages/${encodeURIComponent(pkg.slug)}`}
                    className="min-w-[240px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-24px_rgba(15,23,42,0.24)]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1464b4]">#{index + 1}</p>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900">{getPreviewTitle(pkg, locale)}</p>
                    <p className="mt-1 text-sm font-semibold text-[#ff5a28]">
                      {formatPackageMoney(getPreviewPrice(pkg), pkg.livePricing?.currency || pkg.currency || priceCurrency, locale)}
                    </p>
                     <p className="mt-1 line-clamp-1 text-xs text-slate-500">{[pkg.country, pkg.travel_style, pkg.duration ? `${pkg.duration} hari` : null].filter(Boolean).join(" • ") || exploreTitle}</p>
                   </a>
                 ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isMobilePanelOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/45 backdrop-blur-[2px] lg:hidden">
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
