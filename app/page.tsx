import FilterClient from "@/app/packages/FilterClient"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import PackageCard from "@/app/components/PackageCard"
import SortBar from "@/app/components/SortBar"
import SearchBar from "@/app/components/SearchBar"
import PublicHeader from "@/app/components/PublicHeader"
import { getFacilityCategoryLabel, getFacilityLabel, normalizeFacilityCategory, normalizeFacilityName } from "@/lib/facility-labels"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries, type Locale } from "@/lib/i18n"


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
  package_facilities?: { facility_id: string }[] | null
  package_translations?: { language_code?: string | null; title: string | null; description: string | null; currency?: string | null; price_adult?: number | null; price_child?: number | null }[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  }
}


async function getPackages(searchParams?: {
  [key: string]: string | string[] | undefined
}, locale: Locale = "id"): Promise<PackageListItem[]> {
  const supabase = await createClient()

  const toParamString = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value.join(",") : value || ""
  const facilitiesParam = toParamString(searchParams?.facilities)
  const hasFacilityFilter = facilitiesParam.length > 0

  let query = supabase
    .from("packages")
    .select(`
      *,
      package_translations(*),
      package_facilities(facility_id)
    `)
    .eq("status", "approved")
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
    const selectedFacilityKeys = facilitiesParam
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean)

    if (selectedFacilityKeys.length > 0) {
      const { data: facilitiesLookup, error: facilitiesLookupError } = await supabase
        .from("facilities")
        .select("id, name")

      if (facilitiesLookupError) {
        console.log("FACILITY LOOKUP ERROR:", facilitiesLookupError)
        return []
      }

      const facilityIds = (facilitiesLookup || [])
        .filter((facility) => selectedFacilityKeys.includes(normalizeFacilityName(facility.name)))
        .map((facility) => facility.id)

      if (facilityIds.length === 0) {
        return []
      }

      const { data: facilityRows, error: facilityError } = await supabase
        .from("package_facilities")
        .select("package_id")
        .in("facility_id", facilityIds)

      if (facilityError) {
        console.log("FACILITY FILTER ERROR:", facilityError)
        return []
      }

      const packageIds = [...new Set((facilityRows || []).map((row) => row.package_id))]
      if (packageIds.length === 0) {
        return []
      }

      query = query.in("id", packageIds)
    }
  }

  const { data, error } = await query

  if (error) {
    console.log("FILTER ERROR:", error)
  }

  let filtered = (data as PackageListItem[] | null) || []

  const withLivePricing = await Promise.all(
    filtered.map(async (pkg) => {
      const livePricing = await getLiveLocalizedPackagePricing({
        locale,
        defaultLanguage: pkg.default_language,
        publishedLanguages: pkg.published_languages,
        baseCurrency: pkg.currency,
        baseAdultPrice: pkg.price_adult,
        baseChildPrice: pkg.price_child,
      })

      return {
        ...pkg,
        livePricing,
      }
    }),
  )
  filtered = withLivePricing

  if (filtered.length > 0) {
    const merchantIds = [...new Set(filtered.map((pkg) => pkg.merchant_id).filter(Boolean))]

    if (merchantIds.length > 0) {
      const { data: merchantRows, error: merchantError } = await supabase
        .from("merchants")
        .select("id")
        .in("id", merchantIds)
        .eq("verification_status", "approved")

      if (merchantError) {
        console.log("MERCHANT FILTER ERROR:", merchantError)
        return []
      }

      const activeMerchantIds = new Set((merchantRows || []).map((merchant) => merchant.id))
      filtered = filtered.filter((pkg) => pkg.merchant_id && activeMerchantIds.has(pkg.merchant_id))
    } else {
      filtered = []
    }
  }

  if (searchParams?.max_price) {
    const max = Number(searchParams.max_price)
    if (!Number.isNaN(max)) {
      filtered = filtered.filter((pkg) => {
        return Number((pkg as PackageListItem & { livePricing?: { priceAdult: number } }).livePricing?.priceAdult || 0) <= max
      })
    }
  }

  if (hasFacilityFilter) {
    const selected = new Set(
      facilitiesParam
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean)
    )

    const { data: facilitiesLookup } = await supabase
      .from("facilities")
      .select("id, name")
    const facilityIdToKey = new Map(
      ((facilitiesLookup || []) as Array<{ id: string; name: string | null }>).map((facility) => [
        facility.id,
        normalizeFacilityName(facility.name),
      ])
    )

    filtered = filtered.filter((pkg) => {
      const ids = (pkg.package_facilities || []).map((f) => f.facility_id)
      return ids.some((id) => selected.has(facilityIdToKey.get(id) || ""))
    })
  }

  return filtered
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const t = dictionaries[locale]

  const packages = await getPackages(resolvedSearchParams, locale)
  const supabase = await createClient()

  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name, category")

  const facilitiesMap = new Map<string, { id: string; name: string; category: string }>()
  for (const facility of facilitiesData ?? []) {
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

    <SearchBar locale={locale} />

    <div className="max-w-[1360px] mx-auto flex gap-8 px-8 py-8">

      {/* SIDEBAR */}
      <aside className="w-[280px] shrink-0">
        <div className="sticky top-24 space-y-4">
          <Suspense fallback={<div>Loading filter...</div>}>
            <FilterClient facilities={facilities} locale={locale} />
          </Suspense>
        </div>
      </aside>

      {/* LIST AREA */}
      <main className="flex-1">

        <SortBar total={packages.length} locale={locale} />

        <div className="flex flex-col gap-6">
          {packages.length === 0 ? (
            <p>{t.home.noPackages}</p>
          ) : (
            packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))
          )}
        </div>

      </main>
    </div>
  </div>
)
}
