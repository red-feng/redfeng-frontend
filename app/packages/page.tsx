import FilterClient from "./FilterClient"
import { createClient } from "@supabase/supabase-js"

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
        <FilterClient />
      </div>

      <div className="col-span-3 grid grid-cols-3 gap-6">
        {packages.length === 0 ? (
          <p>Tidak ada paket ditemukan</p>
        ) : (
          packages.map((pkg: any) => (
            <div key={pkg.id} className="border p-4 rounded">
              <h3>{pkg.title}</h3>
              <p>Rp {pkg.price_adult}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}