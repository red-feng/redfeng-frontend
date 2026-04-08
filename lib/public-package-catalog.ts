import { unstable_cache } from "next/cache"
import { getFacilityCategoryLabel, getFacilityLabel, normalizeFacilityCategory, normalizeFacilityName } from "@/lib/facility-labels"
import { getFacilitiesLookup, getHomePackages, getPublicMerchantIds, localePriceRangeMap, type HomePackageListItem } from "@/lib/home-packages"
import { type Locale } from "@/lib/i18n"

type PublicCatalogData = {
  facilities: Array<{ id: string; name: string; category: string }>
  initialFilters: {
    minPrice: number
    maxPrice: number
    selectedFacilities: string[]
  }
  localeMaxPrice: number
  packagesResult: {
    availableCountries: string[]
    items: HomePackageListItem[]
    total: number
  }
  searchBarCountries: string[]
  searchParamsKey: string
}

function normalizeSearchParams(
  searchParams: { [key: string]: string | string[] | undefined },
) {
  return Object.fromEntries(
    Object.entries(searchParams)
      .filter(([, value]) => value !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => [key, Array.isArray(value) ? value : String(value)]),
  )
}

const getPublicCatalogDataCached = unstable_cache(
  async (serializedSearchParams: string, locale: Locale): Promise<PublicCatalogData> => {
    const searchParams = JSON.parse(serializedSearchParams) as { [key: string]: string | string[] | undefined }
    const searchParamsKey = Object.entries(searchParams)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(",") : value || ""}`)
      .join("|")
    const localeMaxPrice = localePriceRangeMap[locale]
    const initialMinPrice = Math.max(
      0,
      Number(
        Array.isArray(searchParams.min_price)
          ? searchParams.min_price[0]
          : searchParams.min_price || 0,
      ) || 0,
    )
    const initialMaxPriceRaw = Number(
      Array.isArray(searchParams.max_price)
        ? searchParams.max_price[0]
        : searchParams.max_price || localeMaxPrice,
    )
    const initialMaxPrice = initialMaxPriceRaw > 0 ? Math.min(initialMaxPriceRaw, localeMaxPrice) : localeMaxPrice
    const initialSelectedFacilities = String(
      Array.isArray(searchParams.facilities)
        ? searchParams.facilities[0]
        : searchParams.facilities || "",
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
    const searchBarParams = { ...searchParams }
    delete searchBarParams.country
    delete searchBarParams.page

    const [packagesResult, searchBarCountriesResult] = await Promise.all([
      getHomePackages(searchParams, locale, {
        pageSizeMode: "cumulative",
        publicMerchantIds,
        facilitiesLookup,
      }),
      getHomePackages(searchBarParams, locale, {
        pageSizeMode: "single",
        publicMerchantIds,
        facilitiesLookup,
      }),
    ])

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

    return {
      facilities: Array.from(facilitiesMap.values()),
      initialFilters: {
        minPrice: initialMinPrice,
        maxPrice: Math.max(initialMaxPrice, initialMinPrice),
        selectedFacilities: initialSelectedFacilities,
      },
      localeMaxPrice,
      packagesResult,
      searchBarCountries: searchBarCountriesResult.availableCountries,
      searchParamsKey,
    }
  },
  ["public-catalog-data"],
  { revalidate: 60 },
)

export async function getPublicCatalogData(
  searchParams: { [key: string]: string | string[] | undefined },
  locale: Locale,
) {
  const normalizedSearchParams = normalizeSearchParams(searchParams)
  return getPublicCatalogDataCached(JSON.stringify(normalizedSearchParams), locale)
}
