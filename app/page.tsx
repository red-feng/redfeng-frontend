import FilterClient from "@/app/packages/FilterClient"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import Link from "next/link"
import PackageCard from "@/app/components/PackageCard"
import SortBar from "@/app/components/SortBar"
import SearchBar from "@/app/components/SearchBar"


export const dynamic = "force-dynamic"

type PackageListItem = {
  id: string
  slug: string
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  price_adult: number | null
  package_translations?: { title: string | null; description: string | null }[] | null
}


async function getPackages(searchParams?: {
  [key: string]: string | string[] | undefined
}): Promise<PackageListItem[]> {
  const supabase = await createClient()

  const hasFacilityFilter = !!searchParams?.facilities

  let query = supabase
    .from("packages")
    .select(`
      *,
      package_translations(*),
      ${hasFacilityFilter
        ? "package_facilities!inner(facility_id)"
        : "package_facilities(facility_id)"
      }
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

// FILTER DURATION
if (searchParams?.duration) {
  if (searchParams.duration === "1-3") {
    query = query.lte("duration_days", 3)
  } else if (searchParams.duration === "4-7") {
    query = query.gte("duration_days", 4).lte("duration_days", 7)
  } else if (searchParams.duration === "8+") {
    query = query.gte("duration_days", 8)
  }
}
  // FILTER PRICE
  if (searchParams?.max_price) {
    query = query.lte("price_adult", Number(searchParams.max_price))
  }

  // FILTER FACILITIES
  if (hasFacilityFilter) {
    const facilityIds = String(searchParams.facilities).split(",")

    query = query.in(
      "package_facilities.facility_id",
      facilityIds
    )
  }

  const { data, error } = await query

  if (error) {
    console.log("FILTER ERROR:", error)
  }

  return data || []
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {

  const packages = await getPackages(searchParams)
const supabase = await createClient()

  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name, category")

  const facilities = facilitiesData ?? []

  return (
  <div className="bg-gray-100 min-h-screen">

    <SearchBar />

    <div className="max-w-[1360px] mx-auto flex gap-8 px-8 py-8">

      {/* SIDEBAR */}
      <aside className="w-[280px] shrink-0">
        <div className="sticky top-24 space-y-4">
          <Suspense fallback={<div>Loading filter...</div>}>
            <FilterClient facilities={facilities} />
          </Suspense>
        </div>
      </aside>

      {/* LIST AREA */}
      <main className="flex-1">

        <SortBar total={packages.length} />

        <div className="flex flex-col gap-6">
          {packages.length === 0 ? (
            <p>Tidak ada paket ditemukan</p>
          ) : (
            packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))
          )}
        </div>

      </main>
    </div>
  </div>
)
}
