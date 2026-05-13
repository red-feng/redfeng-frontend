import PublicHeader from "@/app/components/PublicHeader"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { destinationCatalog, popularBookingCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import WishlistPageClient from "@/app/components/favorites/WishlistPageClient"
import { getCurrentLocale } from "@/lib/locale"
import { getMarketingPromos } from "@/lib/marketing-content"

export const dynamic = "force-dynamic"

export default async function WishlistPage() {
  const locale = await getCurrentLocale()
  const promos = await getMarketingPromos(locale)
  const suggestedItems = [
    ...promos.slice(0, 3).map((item) => ({
      key: item.favoriteKey,
      title: item.title.replace(/\n/g, " "),
      subtitle: item.price,
      href: item.detailHref,
      meta: "Promo",
    })),
    ...popularBookingCatalog.slice(0, 2).map((item) => ({
      key: item.favoriteKey,
      title: item.title,
      subtitle: item.subtitle,
      href: item.detailHref,
      meta: item.category,
    })),
    ...destinationCatalog.slice(0, 2).map((item) => ({
      key: item.favoriteKey,
      title: item.name,
      subtitle: item.country,
      href: item.detailHref,
      meta: item.teaser,
    })),
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.contentWidthClass} space-y-6`}>
          <section className="rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Wishlist / Favorite</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Simpan pilihan favorit Anda dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Semua ikon heart di aplikasi dan website sekarang bermuara ke halaman ini, sehingga promo, destinasi, dan pilihan perjalanan favorit Anda terkumpul dalam satu tempat.
            </p>
          </section>

          <WishlistPageClient suggestedItems={suggestedItems} />
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
