import Link from "next/link"
import PackageCard from "@/app/components/PackageCard"
import PublicHeader from "@/app/components/PublicHeader"
import SearchBar from "@/app/components/SearchBar"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const { packagesResult, searchBarCountries, searchParamsKey } = await getPublicCatalogData(resolvedSearchParams, locale)
  const featuredPackages = packagesResult.items.slice(0, 3)
  const heroCopy = {
    id: {
      eyebrow: "Red Feng Mobile Tour",
      title: "Homepage dibuat ringan, katalog paket punya layar sendiri yang lebih fokus.",
      body: "Pengunjung mulai dari beranda yang cepat dan nyaman di mobile, lalu masuk ke katalog paket untuk cari, filter, bandingkan, dan lanjut checkout tanpa campur dengan konten landing page.",
      primaryCta: "Buka katalog paket",
      secondaryCta: "Lihat paket unggulan",
      badgeOne: `${packagesResult.total}+ paket aktif`,
      badgeTwo: "Mobile-first flow",
      badgeThree: "Siap jadi aplikasi",
      sectionTitle: "Paket unggulan untuk pembuka yang lebih ringkas",
      sectionBody: "Homepage tetap fokus untuk branding dan orientasi user. Paket unggulan tetap ditampilkan secukupnya agar pengguna cepat paham tanpa merasa penuh.",
      browseTitle: "Lanjut ke katalog yang lebih lengkap",
      browseBody: "Di halaman paket, user bisa memakai search, filter harga, fasilitas, dan melihat lebih banyak opsi dengan pengalaman yang lebih cocok untuk aplikasi mobile.",
      browseCta: "Ke halaman paket",
    },
    en: {
      eyebrow: "Red Feng Mobile Tour",
      title: "Keep the homepage light, and give the package catalog its own focused screen.",
      body: "Visitors start from a faster mobile landing page, then move into a dedicated catalog flow to search, filter, compare, and continue to checkout without mixing everything into the homepage.",
      primaryCta: "Open package catalog",
      secondaryCta: "View featured packages",
      badgeOne: `${packagesResult.total}+ active packages`,
      badgeTwo: "Mobile-first flow",
      badgeThree: "App-ready structure",
      sectionTitle: "Featured packages for a cleaner first impression",
      sectionBody: "The homepage stays focused on branding and orientation. Featured packages still appear in a compact way so users understand the offer without overload.",
      browseTitle: "Move into the full catalog experience",
      browseBody: "On the packages page, users can search, filter by price and facilities, and browse more options in a flow that feels more natural for a mobile app.",
      browseCta: "Go to packages",
    },
    zh: {
      eyebrow: "Red Feng Mobile Tour",
      title: "首页保持轻量，套餐目录使用独立页面更聚焦。",
      body: "用户先从移动端更轻快的首页进入，再进入独立的套餐目录页面进行搜索、筛选、比较并继续下单，不会把所有内容混在首页里。",
      primaryCta: "打开套餐目录",
      secondaryCta: "查看精选套餐",
      badgeOne: `${packagesResult.total}+ 在售套餐`,
      badgeTwo: "移动端优先",
      badgeThree: "适合做 App",
      sectionTitle: "精选套餐，首屏更清爽",
      sectionBody: "首页继续专注品牌与用户引导。精选套餐只展示必要内容，让用户更快理解产品而不会感到拥挤。",
      browseTitle: "进入完整套餐目录体验",
      browseBody: "在套餐页面中，用户可以搜索、按价格和设施筛选，并查看更多选择，这样的流程也更适合移动应用。",
      browseCta: "前往套餐页",
    },
  }[locale]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fffdfb_28%,#f6f7fb_100%)]">
      <PublicHeader locale={locale} redirectSuperadminFromHome />

      <main className="pb-14">
        <section className="px-4 pb-6 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-7">
          <div className="mx-auto max-w-[1360px] overflow-hidden rounded-[30px] border border-orange-100/80 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#ffd3a1_100%)] px-5 py-6 text-white shadow-[0_34px_90px_-40px_rgba(194,65,12,0.5)] sm:rounded-[34px] sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-50">
                  {heroCopy.eyebrow}
                </span>
                <h1 className="mt-4 max-w-3xl text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[38px] lg:text-[54px]">
                  {heroCopy.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/90 sm:text-base">
                  {heroCopy.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link
                    href="/packages"
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_34px_-20px_rgba(255,255,255,0.9)] transition hover:bg-orange-50"
                  >
                    {heroCopy.primaryCta}
                  </Link>
                  <a
                    href="#featured-packages"
                    className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {heroCopy.secondaryCta}
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[heroCopy.badgeOne, heroCopy.badgeTwo, heroCopy.badgeThree].map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/18 bg-white/10 p-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/80">Red Feng</p>
                    <p className="mt-3 text-base font-semibold text-white sm:text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SearchBar
          key={`search:${locale}:${searchParamsKey}`}
          locale={locale}
          countries={searchBarCountries}
          destinationPath="/packages"
          submitLabel={heroCopy.primaryCta}
        />

        <section id="featured-packages" className="px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1360px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Featured</p>
                <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[32px]">
                  {heroCopy.sectionTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {heroCopy.sectionBody}
                </p>
              </div>
              <Link
                href="/packages"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 sm:w-auto"
              >
                {heroCopy.browseCta}
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:gap-6">
              {featuredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Catalog</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{heroCopy.browseTitle}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {heroCopy.browseBody}
              </p>
              <Link
                href="/packages"
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
              >
                {heroCopy.browseCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
