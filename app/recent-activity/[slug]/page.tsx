import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  getRecentActivityBySlug,
  recentActivityDetail,
} from "@/app/components/home/shared/homeDetailCatalog"
import { getCurrentLocale } from "@/lib/locale"

type RecentActivityDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return [{ slug: recentActivityDetail.slug }]
}

export async function generateMetadata({ params }: RecentActivityDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getRecentActivityBySlug(slug)
  if (!item) return { title: "Recent Activity | Red Feng" }

  return {
    title: `${item.title} | Red Feng`,
    description: `Lanjutkan aktivitas terakhir untuk ${item.title}.`,
    alternates: { canonical: `/recent-activity/${item.slug}` },
  }
}

export default async function RecentActivityDetailPage({ params }: RecentActivityDetailPageProps) {
  const { slug } = await params
  const item = getRecentActivityBySlug(slug)
  const locale = await getCurrentLocale()

  if (!item) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className="px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
        <div className="mx-auto max-w-[1120px] space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-[#eef2f6] bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.12)]">
            <div className="grid gap-0 md:grid-cols-[0.92fr_1.08fr]">
              <div className="relative min-h-[280px]">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.38)_100%)]" />
                <div className="absolute left-5 top-5 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {item.category}
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Continue Booking</p>
                <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[34px]">
                  {item.title}
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.subtitle}
                  {item.suffix ? ` ${item.suffix}` : ""}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{item.summary}</p>

                <div className="mt-6 space-y-3">
                  {item.nextSteps.map((step, index) => (
                    <div key={step} className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4 text-sm leading-7 text-slate-700">
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/customer/bookings"
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Buka semua pesanan
                  </Link>
                  <Link
                    href={item.serviceHref}
                    className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
                  >
                    Kembali ke layanan terkait
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
