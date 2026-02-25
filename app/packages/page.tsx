import FilterClient from "./FilterClient"
import { createClient } from "@supabase/supabase-js"
import { Suspense } from "react"
import Link from "next/link"

export const revalidate = 60

async function getPackages(searchParams: Record<string, string | string[] | undefined>) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from("packages")
    .select(`
  id,
  title,
  slug,
  destination,
  duration,
  price_adult,
  thumbnail_url,
  description,
  created_at
`)
    .eq("status", "published")
    .order("created_at", { ascending: false })

  if (searchParams?.min_price) {
    query = query.gte("price_adult", Number(searchParams.min_price))
  }

  if (searchParams?.max_price) {
    query = query.lte("price_adult", Number(searchParams.max_price))
  }

  const { data, error } = await query

  if (error) return []

  return data
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {

  const packages = await getPackages(searchParams || {})

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select("id, name, category")

  const facilities = facilitiesData ?? []

  return (
    <div className="grid grid-cols-4 gap-8 p-6 items-start">

      {/* SIDEBAR */}
      <div className="col-span-1 max-h-[85vh] overflow-y-auto sticky top-6">
        <Suspense fallback={<div>Loading filter...</div>}>
          <FilterClient facilities={facilities} />
        </Suspense>
      </div>

      {/* LIST */}
      <div className="col-span-3 flex flex-col gap-6">

        {packages.length === 0 ? (
          <p>Tidak ada paket ditemukan</p>
        ) : (
          packages.map((pkg: any) => (
  <div
    key={pkg.id}
    className="bg-white rounded-xl shadow-md hover:shadow-lg transition flex overflow-hidden border border-gray-100"
  >

    {/* IMAGE */}
    <div className="w-1/4 h-56">
      <img
        src={
          pkg.thumbnail_url ||
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
        }
        alt={pkg.title}
        className="w-full h-full object-cover"
      />
    </div>

    {/* DETAIL */}
    <div className="w-2/4 p-6 flex flex-col justify-center">
      <h2 className="text-lg font-semibold mb-2">
        {pkg.title}
      </h2>

      <div className="flex items-center text-sm text-gray-500 mb-2">
        📍 {pkg.destination}
      </div>

      <div className="flex text-yellow-500 mb-2">
        ⭐⭐⭐⭐⭐
      </div>

      <p className="text-gray-600 text-sm line-clamp-3">
        {pkg.description || "Deskripsi paket wisata menarik."}
      </p>
    </div>

    {/* PRICE BOX */}
    <div className="w-1/4 border-l bg-gray-50 p-6 flex flex-col justify-center items-center">
      <p className="text-xl font-bold text-gray-800 mb-1">
        IDR {pkg.price_adult?.toLocaleString()}
      </p>

      <p className="text-xs text-gray-400 mb-4">
        Exclude taxes & fees
      </p>

      <Link
        href={`/packages/${pkg.slug}`}
        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition"
      >
        Choose
      </Link>
    </div>

  </div>
))
        )}

      </div>

    </div>
  )
}