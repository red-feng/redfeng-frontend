import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Gallery from "./Gallery"

export const dynamic = "force-dynamic"

export default async function PaketPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const supabase = await createClient()
  const safeDecode = (value: string): string => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  const selectFields = `
      id,
      slug,
      city,
      country,
      duration,
      price_adult,
      price_child,
      currency,
      thumbnail_url,
      package_translations (
        title,
        description,
        about_tour,
        itinerary,
        service_standard,
        preparation,
        terms_conditions
      ),
      package_details (
        map_embed
      )
    `

  const slugCandidates = [
    rawSlug,
    safeDecode(rawSlug),
    rawSlug.replace(/^["'“”]+|["'“”]+$/g, ""),
    safeDecode(rawSlug).replace(/^["'“”]+|["'“”]+$/g, ""),
  ].filter((value, index, arr) => value && arr.indexOf(value) === index)

  type PackageDetailsData = {
    id: string
    slug: string
    city: string | null
    country: string | null
    duration: number | null
    price_adult: number | null
    price_child: number | null
    currency: string | null
    thumbnail_url: string | null
    package_translations?: {
      title: string | null
      description: string | null
      about_tour: string | null
      itinerary: string | null
      service_standard: string | null
      preparation: string | null
      terms_conditions: string | null
    }[] | null
    package_details?: { map_embed: string | null }[] | null
  }

  let pkg: PackageDetailsData | null = null
  let error: unknown = null

  for (const candidate of slugCandidates) {
    const result = await supabase
      .from("packages")
      .select(selectFields)
      .eq("slug", candidate)
      .eq("status", "approved")
      .maybeSingle()

    if (result.data) {
      pkg = result.data as PackageDetailsData
      error = null
      break
    }

    error = result.error
  }

  if (!pkg) {
    const suffix = rawSlug.match(/([a-z0-9]{6,})$/i)?.[1]
    if (suffix) {
      const fallback = await supabase
        .from("packages")
        .select(selectFields)
        .ilike("slug", `%${suffix}`)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()

      pkg = fallback.data as PackageDetailsData | null
      error = fallback.error
    }
  }



  if (error || !pkg) return notFound()

  const translation = pkg.package_translations?.[0]
  const detail = pkg.package_details?.[0]
  
  const { data: images } = await supabase
    .from("package_images")
    .select("*")
   .eq("package_id", pkg.id)
  
  
   return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">

      <h1 className="text-2xl font-bold">
        {translation?.title}
      </h1>

{/* 🔥 Gallery Section */}
<Gallery images={images || []} />
<div className="mt-6 space-y-4">

  {/* Main Image */}
  {images && images.length > 0 && (
    <img
      src={images[0].image_url}
      className="w-full h-[450px] object-cover rounded-xl"
      alt="Main image"
    />
  )}
  </div>


      <p className="text-gray-600">
        📍 {pkg.city}, {pkg.country}
      </p>

      <p>
        ⏳ {pkg.duration} days
      </p>

      <div className="space-y-2 font-semibold">
        <p>
          Harga Dewasa: {pkg.currency} {pkg.price_adult?.toLocaleString()}
        </p>
        <p>
          Harga Anak: {pkg.currency} {pkg.price_child?.toLocaleString()}
        </p>
      </div>



      <hr />

      <section>
        <h2 className="font-semibold text-lg mb-2">Tentang Tour</h2>
        <p>{translation?.about_tour}</p>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Itinerary</h2>
        <div>{translation?.itinerary}</div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-2">Syarat & Ketentuan</h2>
        <p>{translation?.terms_conditions}</p>
      </section>

      {detail?.map_embed && (
        <section>
          <h2 className="font-semibold text-lg mb-2">Lokasi</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: detail.map_embed,
            }}
          />
        </section>
      )}

    </main>
  )
}
