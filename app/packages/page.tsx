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
        <div className="mx-auto overflow-hidden rounded-[34px] border border-[#ffd9c8] bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_42%,#fff1e6_100%)] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.45)] max-w-[1360px]">
          <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-7 lg:pt-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/55 to-transparent" />
            <div className="pointer-events-none absolute left-[-60px] top-[-70px] h-44 w-44 rounded-full bg-orange-100/60 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-70px] right-[-20px] h-48 w-48 rounded-full bg-amber-100/55 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/38 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-[2px] sm:p-6 lg:p-7">
              <div className="absolute inset-0">
                <Image
                  src="/home-assets/hero-reference.png"
                  alt="RedFeng package catalog hero"
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover object-center opacity-[0.24]"
                  priority
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,239,0.96)_0%,rgba(255,251,247,0.9)_44%,rgba(255,245,238,0.35)_100%)]" />
              </div>

              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.82fr)] lg:items-start">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">{pageCopy.eyebrow}</p>
                  <h1 className="mt-3 max-w-3xl text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-[38px] lg:text-[48px]">
                    {pageCopy.title}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    {pageCopy.body}
                  </p>
                </div>

                <div className="relative hidden min-h-[260px] overflow-hidden rounded-[26px] border border-white/70 bg-white/20 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.35)] lg:block">
                  <Image
                    src="/home-assets/hero-reference.png"
                    alt="Travel inspiration for package catalog"
                    fill
                    sizes="420px"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(15,23,42,0.22)_100%)]" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/60 bg-white/78 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-600 backdrop-blur">
                    {pageCopy.picks}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 rounded-[22px] border border-white/30 bg-white/82 p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.45)] backdrop-blur">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                      {pageCopy.compare}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                      {pageCopy.compareBody}
                    </p>
                  </div>
                </div>
              </div>

              <div id="package-search" className="relative mt-6 lg:mt-8">
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
