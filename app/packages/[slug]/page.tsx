import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"

async function getPaket(slug: string) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from("packages")
    .select(`
      id,
      title,
      slug,
      description,
      price_adult,
      price_child,
      thumbnail_url
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (error || !data) return null

  return data
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {

  const paket = await getPaket(params.slug)

  if (!paket) {
    return { title: "Paket Tidak Ditemukan" }
  }

  return {
    title: `${paket.title} | RedFeng`,
    description: paket.description?.slice(0, 150),
    openGraph: {
      title: paket.title,
      description: paket.description?.slice(0, 150),
      images: [
        { url: paket.thumbnail_url }
      ],
    },
  }
}

export default async function PaketPage({
  params,
}: {
  params: { slug: string }
}) {

  const paket = await getPaket(params.slug)

  if (!paket) notFound()

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">{paket.title}</h1>

      <img
        src={paket.thumbnail_url}
        className="w-full h-80 object-cover rounded-lg mb-6"
      />

      <p className="mb-6">{paket.description}</p>

      <div className="space-y-2 font-semibold">
        <p>Harga Dewasa: Rp {paket.price_adult?.toLocaleString()}</p>
        <p>Harga Anak: Rp {paket.price_child?.toLocaleString()}</p>
      </div>
    </main>
  )
}