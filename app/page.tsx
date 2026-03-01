import FilterClient from "@/app/packages/FilterClient"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getPackages() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("packages")
    .select(`*, package_translations(*)`)
    .eq("status", "approved")

  return data || []
}

export default async function HomePage() {
  const packages = await getPackages()
  const supabase = await createClient()

  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name, category")

  const facilities = facilitiesData ?? []

  return (
    <div className="w-full bg-gray-100 min-h-screen">

      {/* 🔝 SEARCH BAR */}
      <div className="bg-white shadow-sm border-b px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex gap-4 items-center">
          <input
            placeholder="Search destination..."
            className="flex-1 border rounded-lg px-4 py-3"
          />
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Search
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto flex gap-8 px-8 py-8">

        {/* SIDEBAR */}
        <aside className="w-72 shrink-0 space-y-4">
          <FilterClient facilities={facilities} />
        </aside>

        {/* LIST AREA */}
        <main className="flex-1">

          {/* SORT BAR */}
          <div className="bg-white rounded-lg p-4 flex justify-between items-center mb-6 shadow-sm">
            <div className="font-semibold">
              {packages.length} packages found
            </div>

            <div className="flex gap-3">
              <button className="border px-4 py-2 rounded-lg bg-gray-50">
                Sort by Popularity
              </button>
              <button className="border px-4 py-2 rounded-lg bg-gray-50">
                Price per night
              </button>
            </div>
          </div>

          {/* CARD LIST */}
          <div className="flex flex-col gap-6">

            {packages.map((pkg: any) => {
              const translation = pkg.package_translations?.[0]

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition flex overflow-hidden border"
                >
                  {/* IMAGE SECTION */}
                  <div className="w-[280px] h-[200px] relative shrink-0">
                    <img
                      src={pkg.cover_image}
                      alt={translation?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* DETAIL SECTION */}
                  <div className="flex-1 p-5">
                    <h2 className="text-lg font-semibold mb-1">
                      {translation?.title}
                    </h2>

                    <div className="text-sm text-gray-500 mb-2">
                      📍 {pkg.city}, {pkg.country}
                    </div>

                    <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {translation?.description}
                    </div>

                    <div className="flex gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        Free Cancellation
                      </span>
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        Breakfast Included
                      </span>
                    </div>
                  </div>

                  {/* PRICE SECTION */}
                  <div className="w-[240px] border-l bg-gray-50 p-5 flex flex-col justify-between items-end">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Price per person
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {pkg.currency} {pkg.price_adult?.toLocaleString()}
                      </div>
                    </div>

                    <Link
                      href={`/packages/${pkg.slug}`}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg"
                    >
                      Choose
                    </Link>
                  </div>
                </div>
              )
            })}

          </div>
        </main>
      </div>
    </div>
  )
}