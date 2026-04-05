import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import SearchBar from "@/app/components/SearchBar"
import PublicHeader from "@/app/components/PublicHeader"
import { getFacilityCategoryLabel, getFacilityLabel, normalizeFacilityCategory, normalizeFacilityName } from "@/lib/facility-labels"
import { fetchLatestCurrencyRates } from "@/lib/currency-rates"
import { getCurrentLocale } from "@/lib/locale"
import { type Locale } from "@/lib/i18n"
import { localeCurrencyMap, normalizePackageCurrency } from "@/lib/package-pricing"
import HomeResultsClient from "@/app/HomeResultsClient"
import { redirect } from "next/navigation"

const localePriceRangeMap: Record<Locale, number> = {
  id: 100000000,
  en: 6000,
  zh: 50000,
}

const packagesPerPage = 12


export const dynamic = "force-dynamic"

type PackageListItem = {
  id: string
  slug: string
  merchant_id: string | null
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  departure_date: string | null
  minimal_peserta: number | null
  travel_style: string | null
  price_adult: number | null
  price_child?: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_translations?: { language_code?: string | null; title: string | null; description: string | null; currency?: string | null; price_adult?: number | null; price_child?: number | null }[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  }
}

const packageListSelect = `
  id,
  slug,
  merchant_id,
  cover_image,
  city,
  country,
  currency,
  departure_date,
  minimal_peserta,
  travel_style,
  price_adult,
  price_child,
  default_language,
  published_languages,
  package_translations(language_code, title, description, currency, price_adult, price_child)
`

const getPublicMerchantIds = cache(async (): Promise<Set<string>> => {
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

const getFacilitiesLookup = cache(async () => {
  const adminSupabase = createAdminClient()
  const { data } = await adminSupabase.from("facilities").select("id, name, category")
  return data || []
})

async function getAvailableCountries(publicMerchantIds: Set<string>): Promise<string[]> {
  const supabase = createAdminClient()
  if (publicMerchantIds.size === 0) return []
  const { data: packagesData, error } = await supabase
    .from("packages")
    .select("country, merchant_id")
    .eq("status", "approved")
    .in("merchant_id", Array.from(publicMerchantIds))

  if (error || !packagesData) return []

  return [...new Set(
    packagesData
      .map((pkg) => (pkg.country || "").trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b))
}


async function getPackages(searchParams?: {
  [key: string]: string | string[] | undefined
}, locale: Locale = "id", publicMerchantIds: Set<string> = new Set(), facilitiesLookup: Array<{ id: string; name: string | null }> = []): Promise<{
  items: PackageListItem[]
  total: number
}> {
  const supabase = createAdminClient()

  if (publicMerchantIds.size === 0) {
    return {
      items: [],
      total: 0,
    }
  }

  const toParamString = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value.join(",") : value || ""
  const pageParam = Number(toParamString(searchParams?.page) || 1)
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const facilitiesParam = toParamString(searchParams?.facilities)
  const hasFacilityFilter = facilitiesParam.length > 0
  const minPriceParam = Number(toParamString(searchParams?.min_price) || 0)
  const maxPriceParamRaw = toParamString(searchParams?.max_price)
  const maxPriceParam = maxPriceParamRaw ? Number(maxPriceParamRaw) : Number.POSITIVE_INFINITY
  const selectedFacilityKeys = facilitiesParam
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
  let query = supabase
    .from("packages")
    .select(packageListSelect)
    .eq("status", "approved")
    .in("merchant_id", Array.from(publicMerchantIds))
// FILTER COUNTRY
if (searchParams?.country) {
  query = query.ilike("country", `%${searchParams.country}%`)
}

// FILTER TRAVEL STYLE
if (searchParams?.style) {
  query = query.eq("travel_style", searchParams.style)
}

if (searchParams?.departure_date) {
  query = query.eq("departure_date", searchParams.departure_date)
}

// FILTER DURATION
  if (searchParams?.duration) {
  if (searchParams.duration === "1-3") {
    query = query.lte("duration", 3)
  } else if (searchParams.duration === "4-7") {
    query = query.gte("duration", 4).lte("duration", 7)
  } else if (searchParams.duration === "8+") {
    query = query.gte("duration", 8)
  }
}
  // FILTER FACILITIES
  if (hasFacilityFilter) {
    if (selectedFacilityKeys.length > 0) {
      if (facilitiesLookup.length === 0) {
        return {
          items: [],
          total: 0,
        }
      }

      const facilityIds = facilitiesLookup
        .filter((facility) => selectedFacilityKeys.includes(normalizeFacilityName(facility.name)))
        .map((facility) => facility.id)

      if (facilityIds.length === 0) {
        return {
          items: [],
          total: 0,
        }
      }

      const { data: facilityRows, error: facilityError } = await supabase
        .from("package_facilities")
        .select("package_id")
        .in("facility_id", facilityIds)

      if (facilityError) {
        console.log("FACILITY FILTER ERROR:", facilityError)
        return {
          items: [],
          total: 0,
        }
      }

      const packageIds = [...new Set((facilityRows || []).map((row) => row.package_id))]
      if (packageIds.length === 0) {
        return {
          items: [],
          total: 0,
        }
      }

      query = query.in("id", packageIds)
    }
  }

  const { data, error } = await query

  if (error) {
    console.log("FILTER ERROR:", error)
  }

  let filtered = (data as PackageListItem[] | null) || []

  const targetCurrency = localeCurrencyMap[locale]
  const distinctBaseCurrencies = [...new Set(
    filtered
      .map((pkg) => normalizePackageCurrency(pkg.currency))
      .filter((currency) => currency !== targetCurrency),
  )]
  const rateEntries = await Promise.all(
    distinctBaseCurrencies.map(async (currency) => {
      const { rates, date } = await fetchLatestCurrencyRates(currency)
      return [currency, { rate: Number(rates[targetCurrency] || 0), date }] as const
    }),
  )
  const ratesByCurrency = new Map(rateEntries)
  filtered = filtered.map((pkg) => {
    const baseCurrency = normalizePackageCurrency(pkg.currency)
    const baseAdultPrice = Number(pkg.price_adult || 0)
    const baseChildPrice = Number(pkg.price_child || 0)

    if (baseCurrency === targetCurrency) {
      return {
        ...pkg,
        livePricing: {
          currency: targetCurrency,
          priceAdult: Math.round(baseAdultPrice),
          priceChild: Math.round(baseChildPrice),
        },
      }
    }

    const conversion = ratesByCurrency.get(baseCurrency)
    const rate = Number(conversion?.rate || 0)
    return {
      ...pkg,
      livePricing: {
        currency: targetCurrency,
        priceAdult: Math.round(baseAdultPrice * rate),
        priceChild: Math.round(baseChildPrice * rate),
      },
    }
  })

  if (Number.isFinite(minPriceParam) || Number.isFinite(maxPriceParam)) {
    filtered = filtered.filter((pkg) => {
      const priceAdult = Number(pkg.livePricing?.priceAdult || 0)
      return priceAdult >= minPriceParam && priceAdult <= maxPriceParam
    })
  }

  const total = filtered.length
  const startIndex = (currentPage - 1) * packagesPerPage

  return {
    items: filtered.slice(startIndex, startIndex + packagesPerPage),
    total,
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const normalizedRole = String(profile?.role || "").trim().toLowerCase()

    if (normalizedRole === "superadmin") {
      redirect("/superadmin/dashboard")
    }
  }

  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const localeMaxPrice = localePriceRangeMap[locale]
  const initialMinPrice = Math.max(0, Number(Array.isArray(resolvedSearchParams.min_price) ? resolvedSearchParams.min_price[0] : resolvedSearchParams.min_price || 0) || 0)
  const initialMaxPriceRaw = Number(Array.isArray(resolvedSearchParams.max_price) ? resolvedSearchParams.max_price[0] : resolvedSearchParams.max_price || localeMaxPrice)
  const initialMaxPrice = initialMaxPriceRaw > 0 ? Math.min(initialMaxPriceRaw, localeMaxPrice) : localeMaxPrice
  const initialSelectedFacilities = String(Array.isArray(resolvedSearchParams.facilities) ? resolvedSearchParams.facilities[0] : resolvedSearchParams.facilities || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const publicMerchantIds = await getPublicMerchantIds()
  const facilitiesData = await getFacilitiesLookup()
  const [packagesResult, countries] = await Promise.all([
    getPackages(
      resolvedSearchParams,
      locale,
      publicMerchantIds,
      (facilitiesData as Array<{ id: string; name: string | null; category: string | null }>).map((facility) => ({
        id: facility.id,
        name: facility.name,
      })),
    ),
    getAvailableCountries(publicMerchantIds),
  ])
  const packages = packagesResult.items

  const facilitiesMap = new Map<string, { id: string; name: string; category: string }>()
  for (const facility of facilitiesData) {
    const normalizedName = normalizeFacilityName(facility.name)
    const normalizedCategory = normalizeFacilityCategory(facility.category)
    const key = `${normalizedCategory}::${normalizedName}`
    if (!facilitiesMap.has(key)) {
      facilitiesMap.set(key, {
        id: normalizedName,
        name: getFacilityLabel(normalizedName, locale),
        category: getFacilityCategoryLabel(normalizedCategory, locale),
      })
    }
  }
  const facilities = Array.from(facilitiesMap.values())

  return (
    <div className="bg-gray-100 min-h-screen">
      <PublicHeader locale={locale} />
      <SearchBar locale={locale} countries={countries} />
      <HomeResultsClient
        key={`${locale}:${initialMinPrice}:${Math.max(initialMaxPrice, initialMinPrice)}:${initialSelectedFacilities.join(",")}`}
        facilities={facilities}
        initialFilters={{
          minPrice: initialMinPrice,
          maxPrice: Math.max(initialMaxPrice, initialMinPrice),
          selectedFacilities: initialSelectedFacilities,
        }}
        locale={locale}
        maxAvailablePrice={localeMaxPrice}
        packages={packages}
        totalPackages={packagesResult.total}
      />
    </div>
  )
}
