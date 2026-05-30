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
      sticky: "Cari dan filter paket dengan cepat",
      stickyCta: "Jelajahi paket",
    },
    en: {
      eyebrow: "Package Catalog",
      title: "Find the tour package that fits your travel plan better.",
      body: "Browse the catalog, adjust country, travel style, duration, and price filters in one smoother package comparison flow.",
      sticky: "Search and filter packages quickly",
      stickyCta: "Browse packages",
    },
    zh: {
      eyebrow: "å¥—é¤ç›®å½•",
      title: "æ‰¾åˆ°æ›´é€‚åˆä½ æ—…ç¨‹è®¡åˆ’çš„æ—…æ¸¸å¥—é¤ã€‚",
      body: "æµè§ˆç›®å½•ï¼Œè°ƒæ•´å›½å®¶ã€å‡ºè¡Œé£Žæ ¼ã€æ—¶é•¿å’Œä»·æ ¼ç­›é€‰ï¼Œæ›´é¡ºç•…åœ°æ¯”è¾ƒå¥—é¤ã€‚",
      sticky: "å¿«é€Ÿæœç´¢å¹¶ç­›é€‰å¥—é¤",
      stickyCta: "æµè§ˆå¥—é¤",
    },
  }[locale]

  const topPackages = packagesResult.items.slice(0, 4)
  const leadPackage = topPackages[0]
  const leadRoute =
    [leadPackage?.city, leadPackage?.country].filter(Boolean).join(", ") ||
    (locale === "en" ? "Featured destination" : locale === "zh" ? "ç²¾é€‰ç›®çš„åœ°" : "Destinasi unggulan")
  const resultsCountLabel =
    locale === "en"
      ? `${packagesResult.total} packages available`
      : locale === "zh"
        ? `${packagesResult.total} 个套餐`
        : `${packagesResult.total} paket tersedia`
  const leadMeta = [
    leadPackage?.travel_style ? formatTravelStyleLabel(leadPackage.travel_style, locale) : null,
    leadPackage?.duration ? `${leadPackage.duration} ${locale === "en" ? "days" : locale === "zh" ? "å¤©" : "hari"}` : null,
    resultsCountLabel,
  ]
    .filter(Boolean)
    .join(" • ")

  const compactSummaryCards = topPackages.slice(0, 3).map((entry, index) => ({
    key: `${entry.id}-${index}`,
    title: entry.city || entry.country || (locale === "en" ? "Package" : locale === "zh" ? "å¥—è£…" : "Paket"),
    meta: [
      entry.travel_style ? formatTravelStyleLabel(entry.travel_style, locale) : null,
      entry.duration ? `${entry.duration} ${locale === "en" ? "days" : locale === "zh" ? "å¤©" : "hari"}` : null,
    ]
      .filter(Boolean)
      .join(" • "),
  }))

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} relative overflow-hidden pb-10 pt-4 md:pb-14 md:pt-5`}>
        <div className={homeLayoutLock.contentWidthClass}>
          <PackagesCatalogSearchShell
            locale={locale}
            countries={searchBarCountries}
            searchKey={searchParamsKey}
            heroEyebrow={pageCopy.eyebrow}
            heroTitle={pageCopy.title}
            heroBody={pageCopy.body}
            leadTitle={leadRoute}
            leadMeta={leadMeta}
            resultsCountLabel={resultsCountLabel}
            stickyButtonLabel={pageCopy.stickyCta}
            summaryCards={compactSummaryCards}
          />
        </div>
      </main>

      <div id="results-start">
        <HomeResultsClient
          key={`results:${locale}:${searchParamsKey}`}
          facilities={facilities}
          filterDesktopStickyTopClass="lg:top-[8.2rem]"
          initialFilters={initialFilters}
          layoutVariant="flightCatalog"
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
