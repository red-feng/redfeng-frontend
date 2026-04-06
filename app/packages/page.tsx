import HomeResultsClient from "@/app/HomeResultsClient"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function PackagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const { facilities, initialFilters, localeMaxPrice, packagesResult, searchBarCountries, searchParamsKey } =
    await getPublicCatalogData(resolvedSearchParams, locale)
  const pageCopy = {
    id: {
      eyebrow: "Katalog Paket",
      title: "Temukan paket tour yang lebih cocok untuk rencana customer.",
      body: "Halaman ini difokuskan untuk browsing, search, filter harga, fasilitas, dan membandingkan pilihan dengan lebih nyaman di mobile.",
      sticky: "Cari dan filter paket dengan cepat",
      stickyCta: "Jelajahi paket",
    },
    en: {
      eyebrow: "Package Catalog",
      title: "Find the tour package that fits your customer plan better.",
      body: "This page is focused on browsing, search, price filters, facilities, and easier comparison on mobile.",
      sticky: "Search and filter packages quickly",
      stickyCta: "Browse packages",
    },
    zh: {
      eyebrow: "套餐目录",
      title: "找到更适合客户行程计划的旅游套餐。",
      body: "这个页面专注于浏览、搜索、价格筛选、设施筛选，以及更适合移动端的对比体验。",
      sticky: "更快搜索和筛选套餐",
      stickyCta: "浏览套餐",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <section className="px-4 pb-5 pt-5 sm:px-6 md:px-8 md:pb-6 md:pt-7">
        <div className="mx-auto max-w-[1360px] rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{pageCopy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
            {pageCopy.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {pageCopy.body}
          </p>
        </div>
      </section>

      <div id="package-search">
        <SearchBar
        key={`search:${locale}:${searchParamsKey}`}
        locale={locale}
        countries={searchBarCountries}
        />
      </div>

      <HomeResultsClient
        key={`results:${locale}:${searchParamsKey}`}
        facilities={facilities}
        initialFilters={initialFilters}
        locale={locale}
        maxAvailablePrice={localeMaxPrice}
        packages={packagesResult.items}
        totalPackages={packagesResult.total}
      />
      <PublicStickyAction locale={locale} href="#package-search" label={pageCopy.stickyCta} summary={pageCopy.sticky} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
