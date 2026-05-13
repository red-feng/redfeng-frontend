import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"
import { getMarketingPromoBySlug, getMarketingPromoSlugs } from "@/lib/marketing-content"

type PromoDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getMarketingPromoSlugs()
}

export async function generateMetadata({ params }: PromoDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getCurrentLocale()
  const promo = await getMarketingPromoBySlug(slug, locale)

  if (!promo) {
    return {
      title: "Promo | Red Feng",
    }
  }

  return {
    title: `${promo.title.replace(/\n/g, " ")} | Red Feng`,
    description: `Detail promo Red Feng untuk ${promo.title.replace(/\n/g, " ")}.`,
    alternates: {
      canonical: `/promo/${promo.slug}`,
    },
  }
}

export default async function PromoDetailPage({ params }: PromoDetailPageProps) {
  const { slug } = await params
  const locale = await getCurrentLocale()
  const promo = await getMarketingPromoBySlug(slug, locale)

  if (!promo) notFound()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.contentWidthClass} space-y-6`}>
          <section className={`${homeLayoutLock.cardRadiusClass} border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7`}>
            <Link href="/promo" className="inline-flex text-[13px] font-semibold text-orange-600 transition hover:text-orange-700">
              Kembali ke semua promo
            </Link>
          </section>

          <section className={`relative overflow-hidden ${homeLayoutLock.cardRadiusClass} px-6 py-6 text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.34)] sm:px-7 sm:py-7 lg:px-8 lg:py-8`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${promo.gradient}`} />
            <div
              className={`absolute inset-0 bg-no-repeat ${promo.imageClass}`}
              style={{ backgroundImage: `url('${promo.image}')` }}
            />
            <div className={`absolute inset-0 ${promo.overlayClass}`} />
            <div className={`absolute inset-0 ${promo.glowClass}`} />
            <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.18)_46%,rgba(15,23,42,0.34)_100%)]" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                {promo.badge ? (
                  <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5b4d] shadow-[0_10px_22px_-18px_rgba(255,255,255,0.9)]">
                    {promo.badge}
                  </span>
                ) : null}
                <h1 className="mt-5 max-w-3xl whitespace-pre-line text-[30px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[40px] lg:text-[48px]">
                  {promo.title}
                </h1>
                <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.16em] text-white/86">{promo.eyebrow}</p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.04em] sm:text-[34px]">{promo.price}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={promo.targetHref}
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-slate-950 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.4)]"
                  >
                    {promo.cta}
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full border border-white/22 bg-white/10 px-5 py-3 text-[14px] font-semibold text-white backdrop-blur-sm"
                  >
                    Butuh bantuan promo?
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                <article className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/76">Detail promo</p>
                  <p className="mt-4 text-sm leading-7 text-white/92">
                    Promo ini sudah disamakan untuk aplikasi dan website, jadi penawaran yang Anda lihat berasal dari sumber konten yang sama. Yang berbeda hanya cara penyajiannya di tiap device.
                  </p>
                </article>
                <article className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/76">Arah berikutnya</p>
                  <p className="mt-4 text-sm leading-7 text-white/92">
                    Tahap berikutnya bisa menghubungkan promo ini ke redemption, rule periode aktif, atau target pencarian yang lebih spesifik saat backend promo sudah siap penuh.
                  </p>
                </article>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
