import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import SearchBar from "@/app/components/SearchBar"
import PublicHeader from "@/app/components/PublicHeader"
import { getFacilityCategoryLabel, getFacilityLabel, normalizeFacilityCategory, normalizeFacilityName } from "@/lib/facility-labels"
import { fetchLatestCurrencyRates } from "@/lib/currency-rates"
import { getCurrentLocale } from "@/lib/locale"
import { type Locale } from "@/lib/i18n"
import { localeCurrencyMap, normalizePackageCurrency, resolveLocalizedPackagePricing } from "@/lib/package-pricing"
import HomeResultsClient from "@/app/HomeResultsClient"

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
  destination_country_id?: string | null
  destination_province?: string | null
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

const packageListBaseSelect = `
  id,
  slug,
  merchant_id,
  cover_image,
  city,
  country,
  destination_country_id,
  destination_province,
  currency,
  departure_date,
  minimal_peserta,
  travel_style,
  price_adult,
  price_child,
  default_language,
  published_languages
`

const packagePricingSelect = `
  ${packageListBaseSelect},
  package_translations(language_code, currency, price_adult, price_child)
`

const packageListSelect = `
  ${packageListBaseSelect},
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

async function getPackages(searchParams?: {
  [key: string]: string | string[] | undefined
}, locale: Locale = "id", publicMerchantIds: Set<string> = new Set(), facilitiesLookup: Array<{ id: string; name: string | null }> = []): Promise<{
  availableCountries: string[]
  items: PackageListItem[]
  total: number
}> {
  const supabase = createAdminClient()
  const buildInFilterValue = (values: string[]) => `(${values.map((value) => `"${value}"`).join(",")})`

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
// FILTER COUNTRY
if (searchParams?.country) {
  const { data: matchedCountries, error: matchedCountriesError } = await supabase
    .from("countries")
    .select("id")
    .ilike("name", `%${searchParams.country}%`)

  if (matchedCountriesError) {
    console.log("COUNTRY FILTER ERROR:", matchedCountriesError)
    return {
      availableCountries: [],
      items: [],
      total: 0,
    }
  }

  const countryIds = (matchedCountries || [])
    .map((country) => String(country.id || "").trim())
    .filter(Boolean)

  if (countryIds.length === 0) {
    return {
      availableCountries: [],
      items: [],
      total: 0,
    }
  }

  query = query.in("destination_country_id", countryIds)
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

  if (hasPriceFilter) {
    const { data: localePriceRows, error: localePriceError } = await supabase
      .from("package_translations")
      .select("package_id, price_adult")
      .eq("language_code", locale)
      .eq("currency", localeCurrencyMap[locale])

    if (localePriceError) {
      console.log("LOCALE PRICE QUERY ERROR:", localePriceError)
    } else if (localePriceRows && localePriceRows.length > 0) {
      const excludedPackageIds = localePriceRows
        .filter((row) => {
          const priceAdult = Number(row.price_adult || 0)
          return priceAdult < minPriceParam || priceAdult > maxPriceParam
        })
        .map((row) => String(row.package_id || ""))
        .filter(Boolean)

      if (excludedPackageIds.length > 0) {
        query = query.not("id", "in", buildInFilterValue(excludedPackageIds))
      }
    }
  }
  // FILTER FACILITIES
  if (hasFacilityFilter) {
    if (selectedFacilityKeys.length > 0) {
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

      const { data: facilityRows, error: facilityError } = await supabase
        .from("package_facilities")
        .select("package_id")
        .in("facility_id", facilityIds)

      if (facilityError) {
        console.log("FACILITY FILTER ERROR:", facilityError)
        return {
          availableCountries: [],
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
  const resolvedPricingByPackage = new Map<string, { currency: string; priceAdult: number; priceChild: number }>()

  for (const pkg of filtered) {
    const exactLocalizedPricing = (pkg.package_translations || []).find(
      (translation) =>
        String(translation.language_code || "").trim().toLowerCase() === locale &&
        normalizePackageCurrency(translation.currency) === targetCurrency,
    )

    if (exactLocalizedPricing) {
      resolvedPricingByPackage.set(pkg.id, {
        currency: targetCurrency,
        priceAdult: Number(exactLocalizedPricing.price_adult || 0),
        priceChild: Number(exactLocalizedPricing.price_child || 0),
      })
      continue
    }

    resolvedPricingByPackage.set(
      pkg.id,
      resolveLocalizedPackagePricing({
        locale,
        defaultLanguage: pkg.default_language,
        publishedLanguages: pkg.published_languages,
        baseCurrency: pkg.currency,
        baseAdultPrice: pkg.price_adult,
        baseChildPrice: pkg.price_child,
        translations: pkg.package_translations,
      }),
    )
  }
  const distinctBaseCurrencies = [...new Set(
    filtered
      .map((pkg) => normalizePackageCurrency(resolvedPricingByPackage.get(pkg.id)?.currency || pkg.currency))
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
     const resolvedPricing = resolvedPricingByPackage.get(pkg.id)
     const baseCurrency = normalizePackageCurrency(resolvedPricing?.currency || pkg.currency)
     const baseAdultPrice = Number(resolvedPricing?.priceAdult ?? pkg.price_adult ?? 0)
     const baseChildPrice = Number(resolvedPricing?.priceChild ?? pkg.price_child ?? 0)

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

  if (hasPriceFilter) {
    filtered = filtered.filter((pkg) => {
      const priceAdult = Number(pkg.livePricing?.priceAdult || 0)
      return priceAdult >= minPriceParam && priceAdult <= maxPriceParam
    })
  }

  const availableDestinationCountryIds = [...new Set(
    filtered
      .map((pkg) => String(pkg.destination_country_id || "").trim())
      .filter(Boolean),
  )]
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
  const startIndex = (currentPage - 1) * packagesPerPage
  const pagedItems = filtered.slice(startIndex, startIndex + packagesPerPage)
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

  const detailedPackages = (pageData as PackageListItem[] | null) || []
  const destinationCountryIds = [...new Set(
    detailedPackages
      .map((pkg) => String(pkg.destination_country_id || "").trim())
      .filter(Boolean),
  )]
  const countryNameById = new Map<string, string>()

  if (destinationCountryIds.length > 0) {
    const { data: destinationCountries } = await supabase
      .from("countries")
      .select("id, name")
      .in("id", destinationCountryIds)

    for (const country of destinationCountries || []) {
      countryNameById.set(String(country.id), String(country.name || "").trim())
    }
  }

  const pageDataMap = new Map(
    detailedPackages.map((pkg) => [
      pkg.id,
      {
        ...pkg,
        city: pkg.city || pkg.destination_province || null,
        country: countryNameById.get(String(pkg.destination_country_id || "")) || pkg.country || null,
      },
    ]),
  )

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

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const searchParamsKey = Object.entries(resolvedSearchParams)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(",") : value || ""}`)
    .join("|")
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
  const facilitiesLookup = (facilitiesData as Array<{ id: string; name: string | null; category: string | null }>).map((facility) => ({
    id: facility.id,
    name: facility.name,
  }))
  const packagesResult = await getPackages(
    resolvedSearchParams,
    locale,
    publicMerchantIds,
    facilitiesLookup,
  )
  const packages = packagesResult.items
  const countries = packagesResult.availableCountries

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
      <PublicHeader locale={locale} redirectSuperadminFromHome />
      <SearchBar key={`search:${locale}:${searchParamsKey}`} locale={locale} countries={countries} />
      <HomeResultsClient
        key={`results:${locale}:${searchParamsKey}`}
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
