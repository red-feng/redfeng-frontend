import Image from "next/image"
import HomeResultsClient from "@/app/HomeResultsClient"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
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
      title: "Temukan paket tour yang lebih cocok untuk rencana perjalanan Anda.",
      body: "Jelajahi katalog, atur negara, travel style, durasi, dan filter harga dalam satu alur yang lebih nyaman untuk membandingkan paket.",
      sticky: "Cari dan filter paket dengan cepat",
      stickyCta: "Jelajahi paket",
      picks: "Pilihan RedFeng",
      compare: "Perbandingan pintar",
      compareBody: "Filter lebih cepat, bandingkan lebih mudah, dan lanjut ke checkout dengan alur yang lebih rapi.",
    },
    en: {
      eyebrow: "Package Catalog",
      title: "Find the tour package that fits your travel plan better.",
      body: "Browse the catalog, adjust country, travel style, duration, and price filters in one smoother package comparison flow.",
      sticky: "Search and filter packages quickly",
      stickyCta: "Browse packages",
      picks: "RedFeng Picks",
      compare: "Smart comparison",
      compareBody: "Filter faster, compare easier, and move from discovery to checkout with less friction.",
    },
    zh: {
      eyebrow: "å¥—é¤ç›®å½•",
      title: "æ‰¾åˆ°æ›´é€‚åˆæ‚¨æ—…è¡Œè®¡åˆ’çš„æ—…æ¸¸å¥—é¤ã€‚",
      body: "åœ¨ä¸€ä¸ªæ›´é¡ºç•…çš„æ¯”è¾ƒä½“éªŒä¸­æµè§ˆå¥—é¤ç›®å½•ï¼Œè°ƒæ•´å›½å®¶ã€�æ—…è¡Œé£Žæ ¼ã€�æ—¶é•¿å’Œä»·æ ¼ç­›é€‰ã€‚",
      sticky: "æ›´å¿«æœç´¢å’Œç­›é€‰å¥—é¤",
      stickyCta: "æµè§ˆå¥—é¤",
      picks: "RedFeng ç²¾é€‰",
      compare: "æ™ºèƒ½æ¯”è¾ƒ",
      compareBody: "æ›´å¿«ç­›é€‰ã€�æ›´è½»æ¾æ¯”è¾ƒï¼Œä»¥æ›´é¡ºç•…çš„æ–¹å¼ä»Žå‘çŽ°è¿›å…¥ä¸‹å•ã€‚",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <section className="px-4 pb-5 pt-5 sm:px-6 md:px-8 md:pb-6 md:pt-7">
        <div className="mx-auto max-w-[1360px] overflow-hidden rounded-[34px] border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]">
          <div className="relative min-h-[470px] px-5 pb-5 pt-8 sm:min-h-[520px] sm:px-7 sm:pb-6 sm:pt-10 lg:min-h-[610px] lg:px-10 lg:pb-8 lg:pt-12">
            <Image
              src="/home-assets/background-hero-tour-package.png"
              alt="RedFeng package catalog hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1360px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,239,0.94)_0%,rgba(255,248,241,0.84)_34%,rgba(255,244,235,0.46)_62%,rgba(255,243,236,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/28 to-transparent" />

            <div className="relative flex h-full flex-col justify-between">
              <div className="max-w-[680px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ef4423]">{pageCopy.eyebrow}</p>
                <h1 className="mt-4 text-[34px] font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-[42px] lg:text-[58px]">
                  {pageCopy.title}
                </h1>
                <p className="mt-5 max-w-[580px] text-[15px] leading-8 text-slate-700 sm:text-base">
                  {pageCopy.body}
                </p>
              </div>

              <div className="mt-8 lg:mt-10">
                <div id="package-search" className="max-w-[1020px]">
                  <SearchBar
                    key={`search:${locale}:${searchParamsKey}`}
                    locale={locale}
                    countries={searchBarCountries}
                    variant="catalog"
                  />
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
