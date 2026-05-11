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
      title: "Cari paket yang paling pas untuk rencana perjalanan Anda.",
      body: "Halaman ini menjadi entry point pencarian dari aplikasi. Filter negara, travel style, durasi, dan harga tetap memakai source data yang sama dengan katalog website agar hasilnya konsisten.",
      sticky: "Atur filter lalu jelajahi hasil dengan cepat",
      stickyCta: "Ubah pencarian",
      picks: "Search Flow",
      compare: "Hasil sinkron",
      compareBody: "Filter dari aplikasi dan katalog website membaca source data yang sama, jadi hasil pencarian tetap sejalan di dua konteks.",
    },
    en: {
      eyebrow: "Search Results",
      title: "Find the package options that best fit your travel plan.",
      body: "This page is the dedicated search entry point from the app. Country, travel style, duration, and price filters use the same data source as the website catalog so results stay consistent.",
      sticky: "Adjust filters and explore results quickly",
      stickyCta: "Refine search",
      picks: "Search Flow",
      compare: "Synced results",
      compareBody: "App search and website catalog filters read from the same source, so the results stay aligned across both contexts.",
    },
    zh: {
      eyebrow: "æœç´¢ç»“æžœ",
      title: "æ‰¾åˆ°æœ€é€‚åˆæ‚¨æ—…è¡Œè®¡åˆ’çš„å¥—é¤é€‰é¡¹ã€‚",
      body: "æ­¤é¡µé¢æ˜¯åº”ç”¨ç«¯çš„ä¸“ç”¨æœç´¢å…¥å£ã€‚å›½å®¶ã€�æ—…è¡Œé£Žæ ¼ã€�æ—¶é•¿å’Œä»·æ ¼ç­›é€‰ä¸Žç½‘ç«™ç›®å½•ä½¿ç”¨åŒä¸€æ•°æ®æºï¼Œå› æ­¤ç»“æžœä¿æŒä¸€è‡´ã€‚",
      sticky: "è°ƒæ•´ç­›é€‰å¹¶å¿«é€Ÿæµè§ˆç»“æžœ",
      stickyCta: "è°ƒæ•´æœç´¢",
      picks: "Search Flow",
      compare: "åŒæ­¥ç»“æžœ",
      compareBody: "åº”ç”¨æœç´¢ä¸Žç½‘ç«™ç›®å½•ç­›é€‰å…±ç”¨åŒä¸€æ•°æ®æºï¼Œå› æ­¤ä¸¤ç«¯çš„ç»“æžœä¿æŒä¸€è‡´ã€‚",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <section className={`${homeLayoutLock.pageXClass} pb-5 pt-5 md:pb-6 md:pt-7`}>
        <div className={`${homeLayoutLock.contentWidthClass} overflow-hidden rounded-[32px] border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]`}>
          <div className="relative min-h-[360px] px-5 pb-3 pt-8 sm:min-h-[410px] sm:px-6 sm:pb-4 sm:pt-9 lg:min-h-[470px] lg:px-8 lg:pb-5 lg:pt-10">
            <Image
              src="/home-assets/background-hero-tour-package.png"
              alt="RedFeng search hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,239,0.94)_0%,rgba(255,248,241,0.84)_34%,rgba(255,244,235,0.46)_62%,rgba(255,243,236,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/28 to-transparent" />

            <div className="relative flex h-full flex-col">
              <div className="max-w-[680px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ef4423]">{pageCopy.eyebrow}</p>
                <h1 className="mt-4 text-[34px] font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-[42px] lg:text-[58px]">
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

      <section className={`${homeLayoutLock.pageXClass} -mt-8 pb-1 lg:-mt-12`}>
        <div id="package-search" className={homeLayoutLock.contentWidthClass}>
          <SearchBar
            key={`search:${locale}:${searchParamsKey}`}
            locale={locale}
            countries={searchBarCountries}
            destinationPath="/search"
            variant="catalog"
          />
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
