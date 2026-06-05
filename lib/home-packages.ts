import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchLatestCurrencyRates } from "@/lib/currency-rates"
import { type Locale } from "@/lib/i18n"
import { formatPackageMoney, localeCurrencyMap, normalizePackageCurrency, roundConvertedPrice } from "@/lib/package-pricing"
import { normalizeFacilityName } from "@/lib/facility-labels"

export const localePriceRangeMap: Record<Locale, number> = {
  id: 100000000,
  en: 6000,
  zh: 50000,
}

export const packagesPerPage = 12

type PackageSortMode = "popular" | "price-low"

export type HomePackageListItem = {
  id: string
  slug: string
  merchant_id: string | null
  reviewed_at?: string | null
  cover_image?: string | null
  city?: string | null
  country?: string | null
  destination_country_id?: string | null
  destination_province?: string | null
  currency: string | null
  departure_date: string | null
  duration?: number | null
  minimal_peserta: number | null
  travel_style: string | null
  price_adult: number | null
  price_child?: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_facilities?: {
    facility_id: string
    facilities: { name: string } | { name: string }[] | null
  }[] | null
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
  }
}

export type PopularCatalogDestination = {
  country: string
  totalPackages: number
  totalViews: number
  totalBookings: number
  popularityScore: number
  priceLabel: string | null
  coverImage: string | null
}

const packageFilterBaseSelect = `
  id,
  slug,
  merchant_id,
  destination_country_id,
  destination_province,
  currency,
  departure_date,
  duration,
  minimal_peserta,
  travel_style,
  price_adult,
  price_child,
  default_language,
  published_languages
`

const packageListBaseSelect = `
  id,
  slug,
  merchant_id,
  reviewed_at,
  cover_image,
  city,
  country,
  destination_country_id,
  destination_province,
  currency,
  departure_date,
  duration,
  minimal_peserta,
  travel_style,
  price_adult,
  price_child,
  default_language,
  published_languages
`

const packagePricingSelect = `
  ${packageFilterBaseSelect},
  package_translations(language_code, currency, price_adult, price_child)
`

const packageListSelect = `
  ${packageListBaseSelect},
  package_facilities(
    facility_id,
    facilities(name)
  ),
  package_translations(language_code, title, description, currency, price_adult, price_child),
  package_details(location_label, location_type, primary_lat, primary_lng, viewport_radius_km)
`

export const getPublicMerchantIds = cache(async (): Promise<Set<string>> => {
  const supabase = createAdminClient()
  const { data: merchantRows, error } = await supabase
    .from("merchants")
    .select("id, verification_status, onboarding_completed")

  if (error || !merchantRows) return new Set()

  return new Set(
    merchantRows
      .filter((merchant) => {
        const status = String(merchant.verification_status || "").trim().toLowerCase()
        return status === "approved" && Boolean(merchant.onboarding_completed)
      })
      .map((merchant) => merchant.id),
  )
})

export const getFacilitiesLookup = cache(async () => {
  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase.from("facilities").select("id, name, category")
  return data || []
})

async function attachLivePricingToPackages(
  packages: HomePackageListItem[],
  locale: Locale,
) {
  const targetCurrency = localeCurrencyMap[locale]

  const distinctBaseCurrencies = [
    ...new Set(
      packages
        .map((pkg) => normalizePackageCurrency(pkg.currency))
        .filter((currency) => currency !== targetCurrency),
    ),
  ]
  const rateEntries = await Promise.all(
    distinctBaseCurrencies.map(async (currency) => {
      const { rates, date } = await fetchLatestCurrencyRates(currency)
      return [currency, { rate: Number(rates[targetCurrency] || 0), date }] as const
    }),
  )
  const ratesByCurrency = new Map(rateEntries)

  return packages.map((pkg) => {
    const baseCurrency = normalizePackageCurrency(pkg.currency)
    const baseAdultPrice = Number(pkg.price_adult ?? 0)
    const baseChildPrice = Number(pkg.price_child ?? 0)

    if (baseCurrency === targetCurrency) {
      return {
        ...pkg,
        livePricing: {
          currency: targetCurrency,
          priceAdult: roundConvertedPrice(baseAdultPrice),
          priceChild: roundConvertedPrice(baseChildPrice),
        },
      }
    }

    const conversion = ratesByCurrency.get(baseCurrency)
    const rate = Number(conversion?.rate || 0)
    return {
      ...pkg,
      livePricing: {
        currency: targetCurrency,
        priceAdult: roundConvertedPrice(baseAdultPrice * rate),
        priceChild: roundConvertedPrice(baseChildPrice * rate),
      },
    }
  })
}

const getFeaturedHomePackagesCached = unstable_cache(
  async (locale: Locale) => {
    const supabase = createAdminClient()
    const publicMerchantIds = await getPublicMerchantIds()

    if (publicMerchantIds.size === 0) {
      return [] as HomePackageListItem[]
    }

    const { data, error } = await supabase
      .from("packages")
      .select(packageListSelect)
      .eq("status", "approved")
      .in("merchant_id", Array.from(publicMerchantIds))
      .order("departure_date", { ascending: true, nullsFirst: false })
      .limit(6)

    if (error || !data) {
      if (error) {
        console.log("FEATURED PACKAGES ERROR:", error)
      }
      return [] as HomePackageListItem[]
    }

    const localizedPackages = await attachLivePricingToPackages(data as HomePackageListItem[], locale)
    return localizedPackages.slice(0, 3)
  },
  ["featured-home-packages"],
  { revalidate: 60 },
)

export async function getFeaturedHomePackages(locale: Locale) {
  return getFeaturedHomePackagesCached(locale)
}

const getLatestApprovedPackagesCached = unstable_cache(
  async (locale: Locale) => {
    const supabase = createAdminClient()
    const publicMerchantIds = await getPublicMerchantIds()

    if (publicMerchantIds.size === 0) {
      return [] as HomePackageListItem[]
    }

    const { data, error } = await supabase
      .from("packages")
      .select(packageListSelect)
      .eq("status", "approved")
      .in("merchant_id", Array.from(publicMerchantIds))
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(12)

    if (error || !data) {
      if (error) {
        console.log("LATEST APPROVED PACKAGES ERROR:", error)
      }
      return [] as HomePackageListItem[]
    }

    const localizedPackages = await attachLivePricingToPackages(data as HomePackageListItem[], locale)
    const destinationCountryIds = [
      ...new Set(
        localizedPackages
          .map((pkg) => String(pkg.destination_country_id || "").trim())
          .filter(Boolean),
      ),
    ]
    const countryNameById = await fetchCountryNameMap(destinationCountryIds)
    return enrichPackageCatalogFields(localizedPackages, countryNameById)
  },
  ["latest-approved-packages"],
  { revalidate: 60 },
)

export async function getLatestApprovedPackages(locale: Locale) {
  return getLatestApprovedPackagesCached(locale)
}

export async function getLatestCatalogPackages(locale: Locale) {
  return getLatestApprovedPackages(locale)
}

const getPopularCatalogDestinationsCached = unstable_cache(
  async (locale: Locale, limit: number, days: number) => {
    const supabase = createAdminClient()
    const publicMerchantIds = await getPublicMerchantIds()

    if (publicMerchantIds.size === 0) {
      return [] as PopularCatalogDestination[]
    }

    const { data: packagesData, error: packagesError } = await supabase
      .from("packages")
      .select(packageListBaseSelect)
      .eq("status", "approved")
      .in("merchant_id", Array.from(publicMerchantIds))

    if (packagesError || !packagesData) {
      if (packagesError) {
        console.log("POPULAR DESTINATIONS PACKAGES ERROR:", packagesError)
      }
      return [] as PopularCatalogDestination[]
    }

    const localizedPackages = await attachLivePricingToPackages(packagesData as HomePackageListItem[], locale)
    const destinationCountryIds = [
      ...new Set(
        localizedPackages
          .map((pkg) => String(pkg.destination_country_id || "").trim())
          .filter(Boolean),
      ),
    ]
    const countryNameById = await fetchCountryNameMap(destinationCountryIds)
    const enrichedPackages = enrichPackageCatalogFields(localizedPackages, countryNameById).sort((left, right) => {
      const leftReviewedAt = left.reviewed_at || ""
      const rightReviewedAt = right.reviewed_at || ""
      return rightReviewedAt.localeCompare(leftReviewedAt)
    })
    const packageIds = enrichedPackages.map((pkg) => pkg.id)

    if (packageIds.length === 0) {
      return [] as PopularCatalogDestination[]
    }

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - Math.max(days, 1))

    const { data: packageViewsData, error: packageViewsError } = await supabase
      .from("package_views")
      .select("package_id, viewed_at")
      .in("package_id", packageIds)
      .gte("viewed_at", sinceDate.toISOString())

    if (packageViewsError) {
      console.log("POPULAR DESTINATIONS VIEWS ERROR:", packageViewsError)
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("package_id, created_at")
      .in("package_id", packageIds)
      .gte("created_at", sinceDate.toISOString())

    if (bookingsError) {
      console.log("POPULAR DESTINATIONS BOOKINGS ERROR:", bookingsError)
    }

    const viewsByPackageId = new Map<string, number>()
    for (const view of (packageViewsData || []) as Array<{ package_id?: string | null }>) {
      const packageId = String(view.package_id || "").trim()
      if (!packageId) continue
      viewsByPackageId.set(packageId, (viewsByPackageId.get(packageId) || 0) + 1)
    }

    const bookingsByPackageId = new Map<string, number>()
    for (const booking of (bookingsData || []) as Array<{ package_id?: string | null }>) {
      const packageId = String(booking.package_id || "").trim()
      if (!packageId) continue
      bookingsByPackageId.set(packageId, (bookingsByPackageId.get(packageId) || 0) + 1)
    }

    const countriesMap = new Map<string, {
      totalPackages: number
      totalViews: number
      totalBookings: number
      lowestPrice: number | null
      currency: string | null
      coverImage: string | null
      bestPackageScore: number
      bestPackageReviewedAt: string | null
    }>()
    for (const pkg of enrichedPackages) {
      const country = String(pkg.country || "").trim()
      if (!country) continue

      const current = countriesMap.get(country) || {
        totalPackages: 0,
        totalViews: 0,
        totalBookings: 0,
        lowestPrice: null,
        currency: pkg.livePricing?.currency || null,
        coverImage: null,
        bestPackageScore: -1,
        bestPackageReviewedAt: null,
      }
      const currentPrice = Number(pkg.livePricing?.priceAdult || 0)
      const packageViews = Number(viewsByPackageId.get(pkg.id) || 0)
      const packageBookings = Number(bookingsByPackageId.get(pkg.id) || 0)
      const packageScore = packageBookings * 20 + packageViews
      const nextLowestPrice =
        currentPrice > 0 && (current.lowestPrice === null || currentPrice < current.lowestPrice)
          ? currentPrice
          : current.lowestPrice
      const packageReviewedAt = pkg.reviewed_at || null
      const shouldUsePackageImage =
        Boolean(pkg.cover_image) &&
        (
          packageScore > current.bestPackageScore ||
          (
            packageScore === current.bestPackageScore &&
            packageReviewedAt !== null &&
            (current.bestPackageReviewedAt === null || packageReviewedAt > current.bestPackageReviewedAt)
          ) ||
          (current.coverImage === null && current.bestPackageScore < 0)
        )

      countriesMap.set(country, {
        totalPackages: current.totalPackages + 1,
        totalViews: current.totalViews + packageViews,
        totalBookings: current.totalBookings + packageBookings,
        lowestPrice: nextLowestPrice,
        currency: current.currency || pkg.livePricing?.currency || null,
        coverImage: shouldUsePackageImage ? pkg.cover_image || null : current.coverImage,
        bestPackageScore: shouldUsePackageImage ? packageScore : current.bestPackageScore,
        bestPackageReviewedAt: shouldUsePackageImage ? packageReviewedAt : current.bestPackageReviewedAt,
      })
    }

    return Array.from(countriesMap.entries())
      .map(([country, value]) => {
        const popularityScore = value.totalBookings * 20 + value.totalViews

        return {
          country,
          totalPackages: value.totalPackages,
          totalViews: value.totalViews,
          totalBookings: value.totalBookings,
          popularityScore,
          coverImage: value.coverImage,
          priceLabel:
            value.lowestPrice !== null && value.currency
              ? formatPackageMoney(value.lowestPrice, value.currency, locale)
              : null,
        }
      })
      .sort(
        (left, right) =>
          right.popularityScore - left.popularityScore ||
          right.totalBookings - left.totalBookings ||
          right.totalViews - left.totalViews ||
          right.totalPackages - left.totalPackages ||
          left.country.localeCompare(right.country),
      )
      .slice(0, limit)
  },
  ["popular-catalog-destinations"],
  { revalidate: 300 },
)

export async function getPopularCatalogDestinations(
  locale: Locale,
  options?: { limit?: number; days?: number },
) {
  return getPopularCatalogDestinationsCached(locale, options?.limit ?? 6, options?.days ?? 30)
}

const searchCountryIdsByNameCached = unstable_cache(
  async (searchTerm: string) => {
    const normalizedSearchTerm = searchTerm.trim()
    if (!normalizedSearchTerm) {
      return [] as string[]
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("countries")
      .select("id")
      .ilike("name", `%${normalizedSearchTerm}%`)

    if (error) {
      console.log("COUNTRY FILTER ERROR:", error)
      return [] as string[]
    }

    return (data || [])
      .map((country) => String(country.id || "").trim())
      .filter(Boolean)
  },
  ["search-country-ids-by-name"],
  { revalidate: 1800 },
)

async function searchCountryIdsByName(searchTerm: string) {
  return searchCountryIdsByNameCached(searchTerm)
}

const getPackageIdsByFacilityIdsCached = unstable_cache(
  async (serializedFacilityIds: string) => {
    const facilityIds = serializedFacilityIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (facilityIds.length === 0) {
      return [] as string[]
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("package_facilities")
      .select("package_id")
      .in("facility_id", facilityIds)

    if (error) {
      console.log("FACILITY FILTER ERROR:", error)
      return [] as string[]
    }

    return [...new Set((data || []).map((row) => String(row.package_id || "").trim()).filter(Boolean))]
  },
  ["package-ids-by-facility-ids"],
  { revalidate: 180 },
)

async function getPackageIdsByFacilityIds(facilityIds: string[]) {
  return getPackageIdsByFacilityIdsCached([...facilityIds].sort().join(","))
}

async function fetchCountryNameMap(countryIds: string[]) {
  if (countryIds.length === 0) {
    return new Map<string, string>()
  }

  const supabase = createAdminClient()
  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .in("id", countryIds)

  return new Map(
    (countries || []).map((country) => [String(country.id || ""), String(country.name || "").trim()]),
  )
}

function enrichPackageCatalogFields<T extends HomePackageListItem>(packages: T[], countryNameById: Map<string, string>): T[] {
  return packages.map((pkg) => ({
    ...pkg,
    city: pkg.city || pkg.destination_province || null,
    country: countryNameById.get(String(pkg.destination_country_id || "")) || pkg.country || null,
  }))
}

function comparePackageDates(leftDate: string | null | undefined, rightDate: string | null | undefined) {
  if (leftDate && rightDate) {
    return leftDate.localeCompare(rightDate)
  }
  if (leftDate) return -1
  if (rightDate) return 1
  return 0
}

function sortPackages<T extends HomePackageListItem>(items: T[], sortMode: PackageSortMode): T[] {
  const sortedItems = [...items]

  if (sortMode === "price-low") {
    sortedItems.sort((left, right) => {
      const leftPrice = Number(left.livePricing?.priceAdult || 0)
      const rightPrice = Number(right.livePricing?.priceAdult || 0)
      if (leftPrice !== rightPrice) {
        return leftPrice - rightPrice
      }

      const departureDiff = comparePackageDates(left.departure_date, right.departure_date)
      if (departureDiff !== 0) {
        return departureDiff
      }

      return String(left.slug || "").localeCompare(String(right.slug || ""))
    })

    return sortedItems
  }

  sortedItems.sort((left, right) => {
    const departureDiff = comparePackageDates(left.departure_date, right.departure_date)
    if (departureDiff !== 0) {
      return departureDiff
    }

    const leftPrice = Number(left.livePricing?.priceAdult || 0)
    const rightPrice = Number(right.livePricing?.priceAdult || 0)
    if (leftPrice !== rightPrice) {
      return rightPrice - leftPrice
    }

    return String(left.slug || "").localeCompare(String(right.slug || ""))
  })

  return sortedItems
}

export async function getHomePackages(
  searchParams: { [key: string]: string | string[] | undefined } | undefined,
  locale: Locale,
  options?: {
    pageSizeMode?: "single" | "cumulative"
    publicMerchantIds?: Set<string>
    facilitiesLookup?: Array<{ id: string; name: string | null }>
  },
): Promise<{
  availableCountries: string[]
  items: HomePackageListItem[]
  total: number
}> {
  const supabase = createAdminClient()
  const publicMerchantIds = options?.publicMerchantIds ?? (await getPublicMerchantIds())
  const facilitiesLookup = options?.facilitiesLookup ?? (await getFacilitiesLookup()).map((facility) => ({
    id: facility.id,
    name: facility.name,
  }))
  const pageSizeMode = options?.pageSizeMode ?? "single"

  if (publicMerchantIds.size === 0) {
    return {
      availableCountries: [],
      items: [],
      total: 0,
    }
  }

  const toParamString = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value.join(",") : value || ""
  const pageParam = Number(toParamString(searchParams?.page) || 1)
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const sortParam = toParamString(searchParams?.sort)
  const sortMode: PackageSortMode = sortParam === "price-low" ? "price-low" : "popular"
  const facilitiesParam = toParamString(searchParams?.facilities)
  const hasFacilityFilter = facilitiesParam.length > 0
  const minPriceParam = Number(toParamString(searchParams?.min_price) || 0)
  const maxPriceParamRaw = toParamString(searchParams?.max_price)
  const maxPriceParam = maxPriceParamRaw ? Number(maxPriceParamRaw) : Number.POSITIVE_INFINITY
  const hasPriceFilter = Number.isFinite(minPriceParam) || Number.isFinite(maxPriceParam)
  const selectedFacilityKeys = facilitiesParam
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
  let query = supabase
    .from("packages")
    .select(packagePricingSelect)
    .eq("status", "approved")
    .in("merchant_id", Array.from(publicMerchantIds))

  if (searchParams?.country) {
    const countryIds = await searchCountryIdsByName(String(searchParams.country))

    if (countryIds.length === 0) {
      return {
        availableCountries: [],
        items: [],
        total: 0,
      }
    }

    query = query.in("destination_country_id", countryIds)
  }

  if (searchParams?.style) {
    query = query.eq("travel_style", searchParams.style)
  }

  if (searchParams?.departure_date) {
    query = query.eq("departure_date", searchParams.departure_date)
  }

  if (searchParams?.duration) {
    if (searchParams.duration === "1-3") {
      query = query.lte("duration", 3)
    } else if (searchParams.duration === "4-7") {
      query = query.gte("duration", 4).lte("duration", 7)
    } else if (searchParams.duration === "8+") {
      query = query.gte("duration", 8)
    }
  }

  if (hasFacilityFilter && selectedFacilityKeys.length > 0) {
    if (facilitiesLookup.length === 0) {
      return {
        availableCountries: [],
        items: [],
        total: 0,
      }
    }

    const facilityIds = facilitiesLookup
      .filter((facility) => selectedFacilityKeys.includes(normalizeFacilityName(facility.name)))
      .map((facility) => facility.id)

    if (facilityIds.length === 0) {
      return {
        availableCountries: [],
        items: [],
        total: 0,
      }
    }

    const packageIds = await getPackageIdsByFacilityIds(facilityIds)
    if (packageIds.length === 0) {
      return {
        availableCountries: [],
        items: [],
        total: 0,
      }
    }

    query = query.in("id", packageIds)
  }

  const { data, error } = await query

  if (error) {
    console.log("FILTER ERROR:", error)
  }

  let filtered = await attachLivePricingToPackages((data as HomePackageListItem[] | null) || [], locale)

  if (hasPriceFilter) {
    filtered = filtered.filter((pkg) => {
      const priceAdult = Number(pkg.livePricing?.priceAdult || 0)
      return priceAdult >= minPriceParam && priceAdult <= maxPriceParam
    })
  }

  filtered = sortPackages(filtered, sortMode)

  const availableDestinationCountryIds = [
    ...new Set(
      filtered
        .map((pkg) => String(pkg.destination_country_id || "").trim())
        .filter(Boolean),
    ),
  ]
  let availableCountries: string[] = []

  if (availableDestinationCountryIds.length > 0) {
    const { data: availableCountriesRows } = await supabase
      .from("countries")
      .select("id, name")
      .in("id", availableDestinationCountryIds)

    availableCountries = (availableCountriesRows || [])
      .map((country) => String(country.name || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }

  const total = filtered.length
  const sliceCount = pageSizeMode === "cumulative" ? currentPage * packagesPerPage : packagesPerPage
  const startIndex = pageSizeMode === "single" ? (currentPage - 1) * packagesPerPage : 0
  const pagedItems = filtered.slice(startIndex, startIndex + sliceCount)
  const pagedItemIds = pagedItems.map((pkg) => pkg.id)

  if (pagedItemIds.length === 0) {
    return {
      availableCountries,
      items: [],
      total,
    }
  }

  const { data: pageData, error: pageError } = await supabase
    .from("packages")
    .select(packageListSelect)
    .in("id", pagedItemIds)

  if (pageError) {
    console.log("PAGE DETAIL ERROR:", pageError)
    return {
      availableCountries,
      items: pagedItems,
      total,
    }
  }

  const detailedPackages = (pageData as HomePackageListItem[] | null) || []
  const destinationCountryIds = [
    ...new Set(
      detailedPackages
        .map((pkg) => String(pkg.destination_country_id || "").trim())
        .filter(Boolean),
    ),
  ]
  const countryNameById = await fetchCountryNameMap(destinationCountryIds)

  const pageDataMap = new Map(enrichPackageCatalogFields(detailedPackages, countryNameById).map((pkg) => [pkg.id, pkg]))

  return {
    availableCountries,
    items: pagedItems.map((pkg) => {
      const detailedPackage = pageDataMap.get(pkg.id)
      return detailedPackage
        ? {
            ...detailedPackage,
            livePricing: pkg.livePricing,
          }
        : pkg
    }),
    total,
  }
}
