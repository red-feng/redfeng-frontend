import FilterClient from "@/app/packages/FilterClient"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import Link from "next/link"
import PackageCard from "@/app/components/PackageCard"
import SortBar from "@/app/components/SortBar"
import SearchBar from "@/app/components/SearchBar"

export const dynamic = "force-dynamic"


async function getPackages() {
  const supabase = await createClient()

  // 🔍 DEBUG – CEK SUPABASE URL YANG DIPAKAI VERCEL
  console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  const { data, error } = await supabase
  .from("packages")
  .select(`
    *,
    package_translations(*)
  `)
  .eq("status", "approved")

  console.log("DATA RAW:", data)
  console.log("ERROR RAW:", error)

  return data || []
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {

  const packages = await getPackages()
const supabase = await createClient()

  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name, category")

  const facilities = facilitiesData ?? []

  return (
  <div className="w-full bg-gray-50">

    {/* MAIN AREA */}
    <div className="flex w-full min-h-screen">

      {/* SIDEBAR */}
      <aside className="w-72 shrink-0 bg-white border-r px-6 py-8 sticky top-0 h-screen overflow-y-auto">
        <Suspense fallback={<div>Loading filter...</div>}>
          <FilterClient facilities={facilities} />
        </Suspense>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 px-10 py-8">

        {/* TOP BAR (Future: Sort / Result Count / Map Toggle) */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">
            {packages.length} Packages Found
          </h1>

          <div className="flex gap-3">
            <button className="border px-4 py-2 rounded-lg bg-white hover:bg-gray-100">
              Sort
            </button>
            <button className="border px-4 py-2 rounded-lg bg-white hover:bg-gray-100">
              Map View
            </button>
          </div>
        </div>

        {/* PACKAGE LIST */}
        <div className="flex flex-col gap-6">

          {packages.length === 0 ? (
            <p>Tidak ada paket ditemukan</p>
          ) : (
            packages.map((pkg: any) => {
              const translation = pkg.package_translations?.[0]

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition flex overflow-hidden border"
                >
                  {/* IMAGE */}
                  <div className="w-64 h-56 shrink-0">
                    <img
                      src={pkg.cover_image}
                      alt={translation?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

<div className="bg-gray-100 min-h-screen">

  <SearchBar />

  <div className="max-w-[1360px] mx-auto flex gap-8 px-8 py-8">

    {/* SIDEBAR */}
    <aside className="w-[280px] shrink-0">
      <div className="sticky top-24 space-y-4">
        <FilterClient facilities={facilities} />
      </div>
    </aside>

    {/* LIST AREA */}
    <main className="flex-1">

      <SortBar total={packages.length} />

      <div className="flex flex-col gap-6">
        {packages.map((pkg: any) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

    </main>
  </div>
</div>

                  {/* DETAIL */}
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <h2 className="text-lg font-semibold mb-2">
                      {translation?.title}
                    </h2>

                    <div className="text-sm text-gray-500 mb-2">
                      📍 {pkg.city}, {pkg.country}
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-3">
                      {translation?.description || "Deskripsi paket wisata menarik."}
                    </p>
                  </div>

                  {/* PRICE */}
                  <div className="w-64 border-l bg-gray-50 p-6 flex flex-col justify-center items-center">
                    <p className="text-xl font-bold text-gray-800 mb-2">
                      {pkg.currency} {pkg.price_adult?.toLocaleString()}
                    </p>

                    <Link
                      href={`/packages/${pkg.slug}`}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition"
                    >
                      Choose
                    </Link>
                  </div>
                </div>
              )
            })
          )}

        </div>

      </main>
    </div>
  </div>
)
}