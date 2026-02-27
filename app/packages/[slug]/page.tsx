import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Gallery from "./Gallery"

export const dynamic = "force-dynamic"

export default async function PaketPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createClient()

  const { data: pkg, error } = await supabase
    .from("packages")
    .select(`
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
    `)
    
    
    .eq("slug", params.slug)
    .eq("status", "approved")
    .single()



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