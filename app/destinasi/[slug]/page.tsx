import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  destinationCatalog,
  getDestinationBySlug,
} from "@/app/components/home/shared/homeDetailCatalog"
import { getCurrentLocale } from "@/lib/locale"

type DestinationDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return destinationCatalog.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: DestinationDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getDestinationBySlug(slug)
  if (!item) return { title: "Destinasi | Red Feng" }

  return {
    title: `${item.name} | Red Feng`,
    description: `Detail destinasi populer Red Feng untuk ${item.name}.`,
    alternates: { canonical: `/destinasi/${item.slug}` },
  }
}

export default async function DestinationDetailPage({ params }: DestinationDetailPageProps) {
  const { slug } = await params
  const item = getDestinationBySlug(slug)
  const locale = await getCurrentLocale()

  if (!item) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className="px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-[#eef2f6] bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.12)]">
            <div className="relative h-[280px] sm:h-[360px]">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.72)_100%)]" />
              <div className="absolute left-6 top-6 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                Destinasi Populer
              </div>
              <div className="absolute inset-x-6 bottom-6 text-white">
                <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[40px]">{item.name}</h1>
                <p className="mt-2 text-sm text-white/88">{item.country}</p>
              </div>
            </div>

            <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-sm leading-8 text-slate-700">{item.overview}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {item.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-[20px] border border-[#eceff4] bg-[#fafcfe] px-4 py-4 text-sm leading-6 text-slate-700">
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Langkah berikutnya</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  Detail destinasi ini dibuat untuk mengubah kartu populer menjadi pintu masuk yang nyata. Tahap berikutnya bisa menghubungkannya ke paket, artikel, promo, dan hasil pencarian yang lebih spesifik.
                </p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Teaser harga</p>
                <p className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-slate-950">{item.teaser}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cari perjalanan ke sini
                  </Link>
                  <Link
                    href="/promo"
                    className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
                  >
                    Lihat promo terkait
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
