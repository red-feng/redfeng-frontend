import SearchBar from "@/app/components/SearchBar"
import PublicHeader from "@/app/components/PublicHeader"
import HomeResultsClient from "@/app/HomeResultsClient"
import { getFacilityCategoryLabel, getFacilityLabel, normalizeFacilityCategory, normalizeFacilityName } from "@/lib/facility-labels"
import { getHomePackages, getFacilitiesLookup, getPublicMerchantIds, localePriceRangeMap } from "@/lib/home-packages"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-dynamic"

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
  const initialMinPrice = Math.max(
    0,
    Number(
      Array.isArray(resolvedSearchParams.min_price)
        ? resolvedSearchParams.min_price[0]
        : resolvedSearchParams.min_price || 0,
    ) || 0,
  )
  const initialMaxPriceRaw = Number(
    Array.isArray(resolvedSearchParams.max_price)
      ? resolvedSearchParams.max_price[0]
      : resolvedSearchParams.max_price || localeMaxPrice,
  )
  const initialMaxPrice = initialMaxPriceRaw > 0 ? Math.min(initialMaxPriceRaw, localeMaxPrice) : localeMaxPrice
  const initialSelectedFacilities = String(
    Array.isArray(resolvedSearchParams.facilities)
      ? resolvedSearchParams.facilities[0]
      : resolvedSearchParams.facilities || "",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const publicMerchantIds = await getPublicMerchantIds()
  const facilitiesData = await getFacilitiesLookup()
  const facilitiesLookup = facilitiesData.map((facility) => ({
    id: facility.id,
    name: facility.name,
  }))
  const searchBarParams = { ...resolvedSearchParams }
  delete searchBarParams.country
  delete searchBarParams.page
  const packagesResult = await getHomePackages(resolvedSearchParams, locale, {
    pageSizeMode: "cumulative",
    publicMerchantIds,
    facilitiesLookup,
  })
  const searchBarCountriesResult = await getHomePackages(searchBarParams, locale, {
    pageSizeMode: "single",
    publicMerchantIds,
    facilitiesLookup,
  })

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
    <div className="min-h-screen bg-gray-100">
      <PublicHeader locale={locale} redirectSuperadminFromHome />
      <SearchBar
        key={`search:${locale}:${searchParamsKey}`}
        locale={locale}
        countries={searchBarCountriesResult.availableCountries}
      />
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
        packages={packagesResult.items}
        totalPackages={packagesResult.total}
      />
    </div>
  )
}
