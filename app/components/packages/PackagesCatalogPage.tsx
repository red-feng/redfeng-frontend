import HomeResultsClient from "@/app/HomeResultsClient"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PackagesCatalogSearchShell from "@/app/components/packages/PackagesCatalogSearchShell"
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
  const compactSummaryCards = quickSummaryCards.slice(0, 3)
  const heroStats = [
    leadPackage?.travel_style ? formatTravelStyleLabel(leadPackage.travel_style, locale) : null,
    leadPackage?.duration ? `${leadPackage.duration} ${locale === "en" ? "days" : locale === "zh" ? "å¤©" : "hari"}` : null,
    packagesResult.total > 0
      ? locale === "en"
        ? `${packagesResult.total} packages`
        : locale === "zh"
          ? `${packagesResult.total} ä¸ªå¥—è£…`
          : `${packagesResult.total} paket`
      : null,
  ].filter(Boolean)

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <section className={`${homeLayoutLock.pageXClass} pb-2 pt-2 md:pb-3 md:pt-3`}>
        <div className={homeLayoutLock.contentWidthClass}>
          <PackagesCatalogSearchShell locale={locale} countries={searchBarCountries} searchKey={searchParamsKey} />
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} pb-2`}>
        <div
          className={`${homeLayoutLock.contentWidthClass} overflow-hidden rounded-[20px] border border-[#ffc49b] px-4 py-4 shadow-[0_24px_46px_-34px_rgba(239,98,44,0.44)] sm:px-5 sm:py-5`}
          style={{
            backgroundImage: "url('/flight-strip-bg-replacement.png')",
            backgroundPosition: "40% 37%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundColor: "#ff9a61",
          }}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-[390px]">
              <div className="rounded-[22px] border border-white/70 bg-white px-5 py-4 shadow-[0_20px_48px_-32px_rgba(15,23,42,0.22)]">
                <p className="text-[14px] font-semibold tracking-[-0.03em] text-[#ef5b2a]">{pageCopy.ribbonTitle}</p>
                <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">{leadRoute}</p>
                <p className="mt-1 text-[12px] text-slate-500">{leadMeta || pageCopy.ribbonBody}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {heroStats.map((stat) => (
                    <span key={stat} className="rounded-full border border-[#f5dccd] bg-[#fff7f1] px-3 py-1.5 text-[11px] font-medium text-[#b85a2c]">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 xl:max-w-[720px]">
              <div className="overflow-hidden rounded-[18px] border border-[#ff9a68] bg-[linear-gradient(135deg,rgba(255,123,63,0.92)_0%,rgba(255,90,40,0.92)_100%)] p-3 shadow-[0_20px_32px_-24px_rgba(239,68,35,0.42)]">
                <div className="grid gap-2 md:grid-cols-3">
                  {compactSummaryCards.map((entry) => (
                    <div key={entry.key} className="rounded-[14px] border border-white/65 bg-white px-4 py-3 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.2)]">
                      <p className="text-[13px] font-semibold text-slate-900">{entry.title}</p>
                      <p className="mt-1 text-[12px] text-slate-500">{entry.meta || pageCopy.ribbonBody}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-[520px] text-[12px] text-white/88">{pageCopy.body}</p>
                  <a
                    href="#results-start"
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/14 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/22"
                  >
                    {pageCopy.stickyCta}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="results-start">
        <HomeResultsClient
          key={`results:${locale}:${searchParamsKey}`}
          facilities={facilities}
          initialFilters={initialFilters}
          locale={locale}
          maxAvailablePrice={localeMaxPrice}
          packages={packagesResult.items}
          showSummaryCard={false}
          totalPackages={packagesResult.total}
        />
      </div>
      <PublicStickyAction locale={locale} href="#package-search" label={pageCopy.stickyCta} summary={pageCopy.sticky} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
