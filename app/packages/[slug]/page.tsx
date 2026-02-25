import { notFound } from "next/navigation"
import type { Metadata } from "next"

async function getPaket(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/packages/${slug}`,
    {
      next: { revalidate: 60 }, // cache 60 detik
    }
  )

  if (!res.ok) return null

  return res.json()
}

// 🔥 Dynamic SEO Metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {

  const paket = await getPaket(params.slug)

  if (!paket) {
    return {
      title: "Paket Tidak Ditemukan",
    }
  }

  return {
    title: `${paket.title} | RedFeng`,
    description: paket.description?.slice(0, 150),
    openGraph: {
      title: paket.title,
      description: paket.description?.slice(0, 150),
      images: [
        {
          url: paket.thumbnail_url,
        },
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

  if (!paket) {
    notFound()
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>{paket.title}</h1>
      <p>{paket.description}</p>
      <h3>Harga Dewasa: Rp {paket.price_adult}</h3>
      <h3>Harga Anak: Rp {paket.price_child}</h3>
    </main>
  )
}