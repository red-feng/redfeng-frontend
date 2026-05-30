import Image from "next/image"
import HomeResultsClient from "@/app/HomeResultsClient"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

export default async function PackagesCatalogPage({
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
      title: "Temukan paket tour yang lebih cocok untuk rencana perjalanan Anda.",
      body: "Jelajahi katalog, atur negara, travel style, durasi, dan filter harga dalam satu alur yang lebih nyaman untuk membandingkan paket.",
      ribbonTitle: "Pilihan paket untuk pencarianmu",
      ribbonBody: "Ringkasan cepat destinasi, travel style, dan durasi teratas sebelum masuk ke daftar hasil.",
      sticky: "Cari dan filter paket dengan cepat",
      stickyCta: "Jelajahi paket",
    },
    en: {
      eyebrow: "Package Catalog",
      title: "Find the tour package that fits your travel plan better.",
      body: "Browse the catalog, adjust country, travel style, duration, and price filters in one smoother package comparison flow.",
      ribbonTitle: "Suggested packages for your search",
      ribbonBody: "A quick snapshot of destination, travel style, and duration before you dive into the results.",
      sticky: "Search and filter packages quickly",
      stickyCta: "Browse packages",
    },
    zh: {
      eyebrow: "套餐目录",
      title: "找到更适合你旅程计划的旅游套餐。",
      body: "浏览目录，调整国家、出行风格、时长和价格筛选，更顺畅地比较套餐。",
      ribbonTitle: "推荐给你的套装选择",
      ribbonBody: "先快速查看目的地、风格与时长，再进入完整结果列表。",
      sticky: "快速搜索并筛选套餐",
      stickyCta: "浏览套餐",
    },
  }[locale]

  const topPackages = packagesResult.items.slice(0, 4)
  const leadPackage = topPackages[0]
  const leadRoute =
    [leadPackage?.city, leadPackage?.country].filter(Boolean).join(", ") ||
    (locale === "en" ? "Featured destination" : locale === "zh" ? "精选目的地" : "Destinasi unggulan")
  const leadMeta = [
    leadPackage?.travel_style ? formatTravelStyleLabel(leadPackage.travel_style, locale) : null,
    leadPackage?.duration ? `${leadPackage.duration} ${locale === "en" ? "days" : locale === "zh" ? "天" : "hari"}` : null,
    packagesResult.total > 0
      ? locale === "en"
        ? `${packagesResult.total} packages available`
        : locale === "zh"
          ? `${packagesResult.total} 个套装可选`
          : `${packagesResult.total} paket tersedia`
      : null,
  ]
    .filter(Boolean)
    .join(" • ")
  const quickSummaryCards = topPackages.map((entry, index) => ({
    key: `${entry.id}-${index}`,
    title: entry.city || entry.country || (locale === "en" ? "Package" : locale === "zh" ? "套装" : "Paket"),
    meta: [
      entry.travel_style ? formatTravelStyleLabel(entry.travel_style, locale) : null,
      entry.duration ? `${entry.duration} ${locale === "en" ? "days" : locale === "zh" ? "天" : "hari"}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
  }))

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <section className={`${homeLayoutLock.pageXClass} pb-3 pt-2 md:pb-4 md:pt-3`}>
        <div className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.heroBackdropRadiusClass} overflow-hidden border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]`}>
          <div className="relative min-h-[340px] px-5 pb-3 pt-[104px] sm:min-h-[390px] sm:px-6 sm:pb-4 sm:pt-[118px] lg:min-h-[420px] lg:px-8 lg:pb-5 lg:pt-[130px]">
            <Image
              src="/home-assets/background-package-mobile.png"
              alt="RedFeng package catalog hero"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center sm:hidden"
            />
            <Image
              src="/home-assets/background-package-web.png"
              alt="RedFeng package catalog hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="hidden object-cover object-center sm:block"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,239,0.97)_0%,rgba(255,248,241,0.88)_30%,rgba(255,244,235,0.54)_58%,rgba(255,243,236,0.14)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 to-transparent" />

            <div className="relative flex h-full flex-col">
              <div className="max-w-[680px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ef4423]">{pageCopy.eyebrow}</p>
                <h1 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[46px] lg:text-[58px]">
                  {pageCopy.title}
                </h1>
                <p className="mt-4 max-w-[580px] text-[15px] leading-8 text-slate-700 sm:text-base">
                  {pageCopy.body}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} -mt-12 pb-1 lg:-mt-16`}>
        <div id="package-search" className={homeLayoutLock.contentWidthClass}>
          <SearchBar
            key={`search:${locale}:${searchParamsKey}`}
            locale={locale}
            countries={searchBarCountries}
            variant="catalog"
          />
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} pb-1`}>
        <div
          className={`${homeLayoutLock.contentWidthClass} overflow-hidden rounded-[20px] border border-[#ffc49b] px-5 py-4 shadow-[0_24px_46px_-34px_rgba(239,98,44,0.44)]`}
          style={{
            backgroundImage: "url('/flight-strip-bg-replacement.png')",
            backgroundPosition: "40% 37%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundColor: "#ff9a61",
          }}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-[430px]">
              <div className="rounded-[24px] border border-white/70 bg-white px-6 py-4 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.22)]">
                <p className="text-[15px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{pageCopy.ribbonTitle}</p>
                <p className="mt-2 text-[14px] font-semibold text-slate-900">{leadRoute}</p>
                <p className="mt-1 text-[13px] text-slate-500">{leadMeta || pageCopy.ribbonBody}</p>
              </div>
            </div>

            <div className="min-w-0 flex-1 xl:max-w-[680px]">
              <div className="overflow-hidden rounded-[18px] border border-[#ff9a68] bg-[linear-gradient(135deg,rgba(255,123,63,0.92)_0%,rgba(255,90,40,0.92)_100%)] p-2.5 shadow-[0_20px_32px_-24px_rgba(239,68,35,0.42)]">
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  {quickSummaryCards.map((entry) => (
                    <div key={entry.key} className="rounded-[14px] border border-white/65 bg-white px-4 py-3 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.2)]">
                      <p className="text-[13px] font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-1 text-[12px] text-slate-500">{entry.meta || pageCopy.ribbonBody}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
