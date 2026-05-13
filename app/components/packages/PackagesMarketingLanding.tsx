import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PackagesHeroFilterBar from "@/app/components/packages/PackagesHeroFilterBar"
import PackagesRecommendationsSection from "@/app/components/packages/PackagesRecommendationsSection"
import { getLatestCatalogPackages } from "@/lib/home-packages"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"
import { dictionaries } from "@/lib/i18n"
import { formatPackageMoney } from "@/lib/package-pricing"

type PackageItem = Awaited<ReturnType<typeof getPublicCatalogData>>["packagesResult"]["items"][number]

function getCountryImage(country: string) {
  const key = country.trim().toLowerCase()
  const imageMap: Record<string, string> = {
    indonesia: "/home-assets/dest-bali.png",
    japan: "/home-assets/dest-tokyo.png",
    jepang: "/home-assets/dest-tokyo.png",
    singapore: "/home-assets/dest-singapore.png",
    singapura: "/home-assets/dest-singapore.png",
    thailand: "/home-assets/dest-bangkok.png",
    australia: "/home-assets/hero-reference.png",
    swiss: "/home-assets/hero-reference.png",
    switzerland: "/home-assets/hero-reference.png",
    vietnam: "/home-assets/dest-labuanbajo.png",
    dubai: "/home-assets/hero-reference.png",
    china: "/home-assets/newsletter-bg-generated-china.png",
  }

  return imageMap[key] || "/home-assets/background-hero-tour-package.png"
}

function getLowestPrice(packages: PackageItem[], locale: Locale) {
  const availablePrices = packages
    .map((pkg) => ({
      price: Number(pkg.livePricing?.priceAdult || 0),
      currency: pkg.livePricing?.currency || pkg.currency || "IDR",
    }))
    .filter((entry) => entry.price > 0)
    .sort((left, right) => left.price - right.price)

  if (!availablePrices.length) return null
  return formatPackageMoney(availablePrices[0].price, availablePrices[0].currency, locale)
}

export default async function PackagesMarketingLanding() {
  const locale = await getCurrentLocale()
  const { packagesResult, searchBarCountries } = await getPublicCatalogData({}, locale)
  const allPackages = packagesResult.items
  const topPackages = await getLatestCatalogPackages(locale)

  const byCountry = allPackages.reduce<Record<string, PackageItem[]>>((acc, pkg) => {
    const country = String(pkg.country || "").trim()
    if (!country) return acc
    if (!acc[country]) acc[country] = []
    acc[country].push(pkg)
    return acc
  }, {})

  const popularDestinations = Object.entries(byCountry)
    .map(([country, items]) => ({
      country,
      items,
      total: items.length,
      image: getCountryImage(country),
      price: getLowestPrice(items, locale),
    }))
    .sort((left, right) => right.total - left.total || left.country.localeCompare(right.country))
    .slice(0, 6)

  const promoDestinations = popularDestinations.slice(0, 4).map((entry, index) => ({
    ...entry,
    discount: [30, 25, 20, 15][index] || 10,
  }))

  const t = dictionaries[locale]
  const copy = {
    id: {
      eyebrow: "PAKET WISATA TERBAIK",
      title: "Jelajahi Dunia, Ciptakan Kenangan Terindah",
      body: "Temukan ribuan paket wisata terbaik ke destinasi impianmu dengan harga terjangkau dan pengalaman tak terlupakan.",
      heroSearch: "Cari destinasi atau paket wisata...",
      heroSearchButton: "Cari Paket",
      benefitTitle: ["Harga Terbaik", "Pembayaran Aman", "Dukungan 24/7", "Pesan Mudah"],
      benefitBody: [
        "Kami menjaga harga kompetitif setiap hari.",
        "Berbagai metode pembayaran yang aman.",
        "Tim kami siap membantu kapan pun Anda butuh.",
        "Proses cepat, praktis, dan tanpa ribet.",
      ],
      promoTitle: "Promo Spesial Untukmu",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      popularTitle: "Destinasi Populer",
      seeAll: "Lihat semua",
      recommendationTitle: "Rekomendasi Paket Wisata Untukmu",
      availableNow: "TERSEDIA SEKARANG",
      fromLabel: "Mulai dari",
      choosePackage: t.packageCard.choosePackage,
      newsletterTitle: "Dapatkan promo & info terbaru dari RedFeng!",
      newsletterBody: "Berlangganan newsletter kami dan dapatkan penawaran menarik setiap minggunya.",
      newsletterPlaceholder: "Masukkan email Anda",
      newsletterButton: "Langganan",
      countryLabel: "Negara",
      allCountries: "Semua Negara",
      styleLabel: "Travel Style",
      allStyles: "Semua Travel Style",
      durationLabel: "Durasi",
      allDurations: "Semua Durasi",
      offerLine: "untuk berbagai destinasi pilihan",
    },
    en: {
      eyebrow: "BEST TOUR PACKAGES",
      title: "Explore the World, Create Your Most Beautiful Memories",
      body: "Discover curated travel packages to dream destinations with accessible pricing and unforgettable experiences.",
      heroSearch: "Search destination or travel package...",
      heroSearchButton: "Search Packages",
      benefitTitle: ["Best Prices", "Secure Payments", "24/7 Support", "Easy Booking"],
      benefitBody: [
        "We keep pricing competitive every day.",
        "Multiple payment methods with safe checkout.",
        "Our team is ready to help whenever you need it.",
        "A faster, simpler, lower-friction booking flow.",
      ],
      promoTitle: "Special Promotions For You",
      promoBody: "Get discounts up to",
      promoAction: "View Promotions",
      popularTitle: "Popular Destinations",
      seeAll: "See all",
      recommendationTitle: "Recommended Travel Packages For You",
      availableNow: "AVAILABLE NOW",
      fromLabel: "Starting from",
      choosePackage: t.packageCard.choosePackage,
      newsletterTitle: "Get the latest promotions and updates from RedFeng!",
      newsletterBody: "Subscribe to our newsletter and receive fresh travel offers every week.",
      newsletterPlaceholder: "Enter your email",
      newsletterButton: "Subscribe",
      countryLabel: "Country",
      allCountries: "All Countries",
      styleLabel: "Travel Style",
      allStyles: "All Travel Styles",
      durationLabel: "Duration",
      allDurations: "All Durations",
      offerLine: "for selected destination highlights",
    },
    zh: {
      eyebrow: "精选旅游套餐",
      title: "探索世界，创造最美好的回忆",
      body: "发现前往梦想目的地的优选旅游套餐，以更轻松的价格获得难忘体验。",
      heroSearch: "搜索目的地或旅游套餐...",
      heroSearchButton: "搜索套餐",
      benefitTitle: ["优惠价格", "安全支付", "全天支持", "轻松预订"],
      benefitBody: [
        "我们每天都保持有竞争力的价格。",
        "多种支付方式，结账更安心。",
        "无论何时需要，我们的团队都能提供帮助。",
        "更快、更简单、更省心的预订流程。",
      ],
      promoTitle: "专属优惠推荐",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      popularTitle: "热门目的地",
      seeAll: "查看全部",
      recommendationTitle: "为你推荐的旅游套餐",
      availableNow: "当前可预订",
      fromLabel: "起价",
      choosePackage: t.packageCard.choosePackage,
      newsletterTitle: "获取 RedFeng 最新优惠与资讯！",
      newsletterBody: "订阅我们的 newsletter，每周获取新的旅行优惠信息。",
      newsletterPlaceholder: "输入你的邮箱",
      newsletterButton: "订阅",
      countryLabel: "国家",
      allCountries: "全部国家",
      styleLabel: "旅行风格",
      allStyles: "全部旅行风格",
      durationLabel: "时长",
      allDurations: "全部时长",
      offerLine: "适用于精选目的地",
    },
  }[locale]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-visible ${homeLayoutLock.cardRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image
              src="/home-assets/background-package-mobile.png"
              alt="Travel package hero"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center sm:hidden"
            />
            <Image
              src="/home-assets/background-package-web.png"
              alt="Travel package hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="hidden object-cover object-center sm:block"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,241,0.98)_0%,rgba(255,248,241,0.9)_24%,rgba(255,240,231,0.58)_50%,rgba(255,247,243,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.72),transparent_24%),radial-gradient(circle_at_22%_62%,rgba(255,210,178,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
            <div className="absolute left-[8%] top-[26%] hidden h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,216,147,0.92)_0%,rgba(255,216,147,0.48)_42%,rgba(255,216,147,0)_72%)] blur-[2px] sm:block" />

            <div className="relative z-10 max-w-[600px] pt-10 sm:pt-11 lg:pt-14">
              <p className="text-[12px] font-bold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-[580px] text-[23px] font-bold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:max-w-[620px] sm:text-[23px] lg:max-w-[680px] lg:text-[50px]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-[500px] text-[13px] leading-6 text-slate-700 sm:mt-4 sm:text-[14px] sm:leading-7 lg:max-w-[520px] lg:text-[15px] lg:leading-7">
                {copy.body}
              </p>

            </div>

            <div className="hidden">
              <div className={`${homeLayoutLock.wideContentWidthClass} ${homeLayoutLock.cardRadiusClass} border border-white/80 bg-white/94 p-3 shadow-[0_32px_70px_-34px_rgba(15,23,42,0.24)] backdrop-blur md:p-4`}>
                <PackagesHeroFilterBar
                  locale={locale}
                  countries={searchBarCountries}
                  buttonLabel={locale === "en" ? "Apply Filter" : locale === "zh" ? "应用筛选" : "Terapkan Filter"}
                  labels={{
                    country: copy.countryLabel,
                    allCountries: copy.allCountries,
                    style: copy.styleLabel,
                    allStyles: copy.allStyles,
                    duration: copy.durationLabel,
                    allDurations: copy.allDurations,
                  }}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
                {copy.benefitTitle.map((title, index) => (
                  <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                      {index === 0 ? (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                          <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" />
                        </svg>
                      ) : index === 1 ? (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                          <path d="M7 7.5h10a2 2 0 0 1 2 2V18H5V9.5a2 2 0 0 1 2-2Z" />
                          <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
                        </svg>
                      ) : index === 2 ? (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                          <path d="M4 12a8 8 0 0 1 16 0" />
                          <rect x="3.5" y="11" width="4" height="7" rx="2" />
                          <rect x="16.5" y="11" width="4" height="7" rx="2" />
                          <path d="M18.5 18a3 3 0 0 1-3 3H12" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                          <rect x="4" y="6" width="16" height="12" rx="2.5" />
                          <path d="M7 12l3 3 7-7" />
                        </svg>
                      )}
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} relative z-[210] -mt-20 sm:-mt-24 lg:-mt-28`}>
          <div className={`${homeLayoutLock.wideContentWidthClass} ${homeLayoutLock.cardRadiusClass} border border-[#f0e4da] bg-white p-3 shadow-[0_28px_56px_-26px_rgba(15,23,42,0.22)] md:p-4`}>
            <PackagesHeroFilterBar
              locale={locale}
              countries={searchBarCountries}
              buttonLabel={locale === "en" ? "Apply Filter" : locale === "zh" ? "åº”ç”¨ç­›é€‰" : "Terapkan Filter"}
              labels={{
                country: copy.countryLabel,
                allCountries: copy.allCountries,
                style: copy.styleLabel,
                allStyles: copy.allStyles,
                duration: copy.durationLabel,
                allDurations: copy.allDurations,
              }}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  {index === 0 ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" />
                    </svg>
                  ) : index === 1 ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                      <path d="M7 7.5h10a2 2 0 0 1 2 2V18H5V9.5a2 2 0 0 1 2-2Z" />
                      <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
                    </svg>
                  ) : index === 2 ? (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                      <path d="M4 12a8 8 0 0 1 16 0" />
                      <rect x="3.5" y="11" width="4" height="7" rx="2" />
                      <rect x="16.5" y="11" width="4" height="7" rx="2" />
                      <path d="M18.5 18a3 3 0 0 1-3 3H12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                      <rect x="4" y="6" width="16" height="12" rx="2.5" />
                      <path d="M7 12l3 3 7-7" />
                    </svg>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.promoTitle}</h2>
              <p className="mt-4 text-[13px] font-medium leading-none text-slate-500">{copy.promoBody}</p>
              <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] text-[#ef4423] sm:text-[19px]">
                30% <span className="text-[13px] sm:text-[14px]">OFF</span>
              </p>
              <p className="mt-3 max-w-[220px] text-[12px] leading-[1.3] text-slate-500 sm:text-[13px]">{copy.offerLine}</p>
              <Link
                href="/promo"
                className="mt-5 inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105"
              >
                {copy.promoAction}
              </Link>
            </article>

            {promoDestinations.map((entry) => (
              <Link
                key={entry.country}
                href={`/packages/catalog?country=${encodeURIComponent(entry.country)}`}
                className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.22)]"
              >
                <div className="relative h-[185px]">
                  <Image src={entry.image} alt={entry.country} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#ef4423] shadow-sm">
                    Diskon {entry.discount}%
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="min-h-[2.7rem] text-[14px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900 md:text-[17px]">{entry.country}</h3>
                  <p className="mt-1 text-[11px] leading-none text-slate-400">{copy.fromLabel}</p>
                  <p className="mt-auto pt-2 text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">{entry.price || "-"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-12`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">{copy.popularTitle}</h2>
            <Link href="/packages/catalog" className="text-[14px] font-semibold text-slate-900 transition hover:text-[#d93b1d]">
              {copy.seeAll}
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-6">
            {popularDestinations.map((entry) => (
              <Link
                key={entry.country}
                href={`/packages/catalog?country=${encodeURIComponent(entry.country)}`}
                className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.2)]"
              >
                <div className="relative h-[190px] sm:h-[235px]">
                  <Image src={entry.image} alt={entry.country} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_54%,rgba(15,23,42,0.54)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-[12px] font-semibold leading-none tracking-normal text-white sm:text-[18px]">{entry.country}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="text-[11px] leading-none text-slate-400">{copy.fromLabel}</p>
                  <p className="mt-auto pt-2 text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">{entry.price || "-"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className={homeLayoutLock.contentWidthClass}>
          <PackagesRecommendationsSection
            title={copy.recommendationTitle}
            packages={topPackages}
            locale={locale}
            availableLabel={copy.availableNow}
            fromLabel={copy.fromLabel}
            actionLabel={copy.choosePackage}
          />
        </div>

        <div className="mt-16">
          <HomeNewsletterSection locale={locale} />
        </div>
        <HomeFooter locale={locale} />

      </main>

      <PublicStickyAction locale={locale} href="/packages/catalog" label={copy.heroSearchButton} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
