import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import {
  getInspirationArticleBySlug,
  inspirationArticleCatalog,
} from "@/app/components/home/shared/homeDetailCatalog"
import { getCurrentLocale } from "@/lib/locale"

type InspirationDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return inspirationArticleCatalog.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: InspirationDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getInspirationArticleBySlug(slug)
  if (!item) return { title: "Inspirasi | Red Feng" }

  return {
    title: `${item.title} | Red Feng`,
    description: `Artikel inspirasi Red Feng: ${item.title}.`,
    alternates: { canonical: `/inspirasi/${item.slug}` },
  }
}

export default async function InspirationDetailPage({ params }: InspirationDetailPageProps) {
  const { slug } = await params
  const item = getInspirationArticleBySlug(slug)
  const locale = await getCurrentLocale()

  if (!item) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.wideContentWidthClass} space-y-6`}>
          <section className={`${homeLayoutLock.cardRadiusClass} border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7`}>
            <span className="inline-flex rounded-full bg-[#fff3ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ef3b2d]">
              {item.category}
            </span>
            <h1 className="mt-4 max-w-4xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              {item.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.readTime}</p>
          </section>

          <section className={`overflow-hidden ${homeLayoutLock.cardRadiusClass} border border-[#eef2f6] bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.12)]`}>
            <div className="h-[240px] bg-cover bg-center sm:h-[320px]" style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.18) 100%), url('${item.image}')` }} />
            <div className="p-6 sm:p-7">
              <p className="text-sm leading-8 text-slate-700">{item.bodyIntro}</p>

              <div className="mt-6 space-y-4">
                {item.sections.map((section, index) => (
                  <article key={section} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Bagian {index + 1}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{section}</p>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Cari perjalanan terkait
                </Link>
                <Link
                  href="/packages"
                  className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
                >
                  Lihat katalog paket
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
