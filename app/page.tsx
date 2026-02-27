import FilterClient from "./packages/FilterClient"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import Link from "next/link"

export const dynamic = "force-dynamic"


async function getPackages() {
  const supabase = await createClient()

  // 🔍 DEBUG – CEK SUPABASE URL YANG DIPAKAI VERCEL
  console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  const { data, error } = await supabase
  .from("packages")
  .select(`
    *,
    package_translations!fk_package_translation(*)
  `)
  .eq("status", "approved")

  console.log("DATA RAW:", data)
  console.log("ERROR RAW:", error)

  return data || []
}

export default async function PackagesPage({
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="grid grid-cols-4 gap-8 items-start">

        {/* SIDEBAR */}
        <div className="col-span-1 sticky top-6 self-start">
          <Suspense fallback={<div>Loading filter...</div>}>
            <FilterClient facilities={facilities} />
          </Suspense>
        </div>

        {/* LIST */}
        <div className="col-span-3 flex flex-col gap-6">

          {packages.length === 0 ? (
            <p>Tidak ada paket ditemukan</p>
          ) : (
            packages.map((pkg: any) => {
              const translation = pkg.package_translations?.[0]

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition flex overflow-hidden border border-gray-100"
                >
                  {/* IMAGE */}
                  <div className="w-1/4 h-56">
                    <img
                    src={pkg.cover_image}
                    alt={pkg.title}
                    className="w-full h-48 object-cover rounded"
                    />
                  </div>

                  {/* DETAIL */}
                  <div className="w-2/4 p-6 flex flex-col justify-center">
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

                  {/* PRICE BOX */}
                  <div className="w-1/4 border-l bg-gray-50 p-6 flex flex-col justify-center items-center">
                    <p className="text-xl font-bold text-gray-800 mb-1">
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
      </div>
    </div>
  )
}

