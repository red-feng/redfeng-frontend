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
            packages.map((pkg: any) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))
          )}
        </div>

      </main>
    </div>
  </div>
)
}