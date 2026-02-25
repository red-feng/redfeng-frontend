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
      created_at
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false })

  const { data, error } = await query

  if (error) return []

  return data
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {

  const packages = await getPackages(searchParams || {})

  return (
    <div className="grid grid-cols-4 gap-8 p-6">
      <div className="col-span-1">
  <Suspense fallback={<div>Loading filter...</div>}>
    <FilterClient />
  </Suspense>
</div>

      <div className="col-span-3 grid grid-cols-3 gap-6">
  {packages.length === 0 ? (
    <p>Tidak ada paket ditemukan</p>
  ) : (
    packages.map((pkg: any) => (
      <div key={pkg.id} className="border p-4 rounded shadow hover:shadow-lg transition">
        
    {pkg.thumbnail_url && (
    <img
        src={pkg.thumbnail_url}
        alt={pkg.title}
        className="w-full h-40 object-cover rounded mb-3"
    />
    )}

        <h3 className="text-lg font-semibold mb-2">
          {pkg.title}
        </h3>

        <p className="text-gray-500 text-sm mb-2">
          {pkg.destination} • {pkg.duration}
        </p>

        <p className="text-red-600 font-bold mb-4">
          Rp {pkg.price_adult?.toLocaleString()}
        </p>

        <Link
          href={`/packages/${pkg.slug}`}
          className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
        >
          Lihat Detail
        </Link>

      </div>
    ))
  )}
</div>
    </div>
  )
}