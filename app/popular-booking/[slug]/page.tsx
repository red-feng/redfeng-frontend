import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  getPopularBookingBySlug,
  popularBookingCatalog,
} from "@/app/components/home/shared/homeDetailCatalog"
import { getCurrentLocale } from "@/lib/locale"

type PopularBookingDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return popularBookingCatalog.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: PopularBookingDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getPopularBookingBySlug(slug)
  if (!item) return { title: "Popular Booking | Red Feng" }

  return {
    title: `${item.title} | Red Feng`,
    description: `Detail popular booking Red Feng untuk ${item.title}.`,
    alternates: { canonical: `/popular-booking/${item.slug}` },
  }
}

export default async function PopularBookingDetailPage({ params }: PopularBookingDetailPageProps) {
  const { slug } = await params
  const item = getPopularBookingBySlug(slug)
  const locale = await getCurrentLocale()

  if (!item) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.contentWidthClass} space-y-6`}>
          <section className={`${homeLayoutLock.cardRadiusClass} border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7`}>
            <Link href="/" className="inline-flex text-[13px] font-semibold text-orange-600 transition hover:text-orange-700">
              Kembali ke beranda
            </Link>
          </section>

          <section className={`overflow-hidden ${homeLayoutLock.cardRadiusClass} border border-[#eef2f6] bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.12)]`}>
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[280px] bg-slate-900">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12)_0%,rgba(15,23,42,0.58)_100%)]" />
                <div className="absolute left-6 top-6 inline-flex rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  {item.category}
                </div>
                <div className="absolute inset-x-6 bottom-6 text-white">
                  <h1 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">{item.title}</h1>
                  <p className="mt-2 text-sm text-white/88">{item.subtitle}</p>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Popular Booking Detail</p>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.overview}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {item.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-[20px] border border-[#eceff4] bg-[#fafcfe] px-4 py-4 text-sm leading-6 text-slate-700">
                      {highlight}
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Harga tampil</p>
                  <p className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-slate-950">
                    {item.price}
                    {item.suffix ? <span className="ml-1 text-[12px] font-medium text-slate-500">{item.suffix}</span> : null}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">Rating visual saat ini {item.rating} dan masih bisa dikembangkan ke detail inventory live di tahap berikutnya.</p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={item.serviceHref}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Buka layanan terkait
                  </Link>
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
                  >
                    Cari opsi lain
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
