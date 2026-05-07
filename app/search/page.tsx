import HomeResultsClient from "@/app/HomeResultsClient"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function SearchResultsPage({
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
      eyebrow: "Hasil Pencarian",
      title: "Cari hotel, tiket, dan paket yang paling pas untuk rencana perjalanan Anda.",
      body: "Halaman ini menjadi entry point pencarian dari aplikasi. Filter negara, gaya trip, dan durasi tetap memakai source data yang sama dengan website agar hasilnya konsisten.",
      sticky: "Atur filter lalu jelajahi hasil dengan cepat",
      stickyCta: "Ubah pencarian",
    },
    en: {
      eyebrow: "Search Results",
      title: "Find the hotel, ticket, and package options that best fit your trip plan.",
      body: "This page is the dedicated search entry point from the app. Country, trip style, and duration filters use the same data source as the website so results stay consistent.",
      sticky: "Adjust filters and explore results quickly",
      stickyCta: "Refine search",
    },
    zh: {
      eyebrow: "搜索结果",
      title: "找到最适合您旅行计划的酒店、票务和套餐选项。",
      body: "此页面是应用端专用的搜索入口。国家、旅行风格和时长筛选与网站使用同一数据源，因此结果保持一致。",
      sticky: "调整筛选并快速浏览结果",
      stickyCta: "调整搜索",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <section className="px-4 pb-5 pt-5 sm:px-6 md:px-8 md:pb-6 md:pt-7">
        <div className="mx-auto max-w-[1360px] rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff7ec_0%,#ffffff_42%,#fff0e0_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
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
          destinationPath="/search"
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
