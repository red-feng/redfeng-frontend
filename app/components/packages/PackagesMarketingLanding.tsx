import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PackagesHeroSearch from "@/app/components/packages/PackagesHeroSearch"
import PackagesHeroFilterBar from "@/app/components/packages/PackagesHeroFilterBar"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { formatTravelStyleLabel, getScheduleQuotaLabel } from "@/lib/travelStyles"

type PackageItem = Awaited<ReturnType<typeof getPublicCatalogData>>["packagesResult"]["items"][number]

function getPackageTitle(pkg: PackageItem, locale: Locale) {
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const fallbackTitle = decodeURIComponent(pkg.slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return translation?.title?.trim() || fallbackTitle || "Untitled package"
}

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

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M12 21s-6-5.1-6-10.4A6 6 0 1 1 18 10.6C18 15.9 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </svg>
  )
}

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M4 11.5h16V19" />
      <path d="M4 19v-9a2.5 2.5 0 0 1 2.5-2.5h4A2.5 2.5 0 0 1 13 10v1.5" />
      <path d="M13 9h4a3 3 0 0 1 3 3v7" />
    </svg>
  )
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M7 4v7" />
      <path d="M10 4v7" />
      <path d="M7 7H5.5A1.5 1.5 0 0 1 4 5.5V4" />
      <path d="M10 7h1.5A1.5 1.5 0 0 0 13 5.5V4" />
      <path d="M8.5 11v9" />
      <path d="M18 4v16" />
      <path d="M18 4c-2 0-3 1.8-3 4v3h3" />
    </svg>
  )
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="5" y="4.5" width="14" height="12" rx="3" />
      <path d="M8 16.5v3M16 16.5v3M5 10.5h14" />
      <circle cx="8.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PackageRecoCard({
  pkg,
  locale,
  availableLabel,
  fromLabel,
  actionLabel,
}: {
  pkg: PackageItem
  locale: Locale
  availableLabel: string
  fromLabel: string
  actionLabel: string
}) {
  const title = getPackageTitle(pkg, locale)
  const pricing = pkg.livePricing || {
    currency: pkg.currency || "IDR",
    priceAdult: Number(pkg.price_adult || 0),
    priceChild: Number(pkg.price_child || 0),
  }
  const participantLabel = getScheduleQuotaLabel(pkg.travel_style, locale)

  return (
    <article className="overflow-hidden rounded-[30px] border border-[#e9e3db] bg-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-34px_rgba(15,23,42,0.22)]">
      <div className="relative h-[220px] w-full overflow-hidden">
        {pkg.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pkg.cover_image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Image
            src="/home-assets/card-package.png"
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.08)_48%,rgba(15,23,42,0.22)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
            {availableLabel}
          </span>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#ef4423] shadow-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5">
        <Link
          href={`/packages/${encodeURIComponent(pkg.slug)}`}
          className="line-clamp-2 text-[22px] font-semibold leading-tight tracking-[-0.035em] text-slate-950 transition hover:text-[#ef4423] xl:text-[24px]"
        >
          {title}
        </Link>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <span className="text-[#ef4423]">
            <MapPinIcon />
          </span>
          {[pkg.city, pkg.country].filter(Boolean).join(", ") || "-"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pkg.travel_style ? (
            <span className="rounded-full bg-[#fff1ea] px-3 py-1.5 text-[11px] font-semibold text-[#ef4423]">
              {formatTravelStyleLabel(pkg.travel_style, locale)}
            </span>
          ) : null}
          <span className="rounded-full bg-[#f4f6fb] px-3 py-1.5 text-[11px] font-semibold text-slate-700">
            {participantLabel} {pkg.minimal_peserta || 0}
          </span>
          {pkg.departure_date ? (
            <span className="rounded-full bg-[#fff7e8] px-3 py-1.5 text-[11px] font-semibold text-amber-700">
              {pkg.departure_date}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#f2ebe5] pt-4 text-[11px] text-slate-500">
          <div className="rounded-[14px] bg-[#faf7f4] px-3 py-2">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700">
              <BedIcon />
              Hotel
            </p>
            <p className="mt-1">3x</p>
          </div>
          <div className="rounded-[14px] bg-[#faf7f4] px-3 py-2">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700">
              <UtensilsIcon />
              Makan
            </p>
            <p className="mt-1">4x</p>
          </div>
          <div className="rounded-[14px] bg-[#faf7f4] px-3 py-2">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700">
              <BusIcon />
              Transport
            </p>
            <p className="mt-1">Termasuk</p>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{fromLabel}</p>
            <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#ef4423] xl:text-[30px]">
              {formatPackageMoney(pricing.priceAdult, pricing.currency, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-400">/ orang</p>
          </div>
          <Link
            href={`/packages/${encodeURIComponent(pkg.slug)}`}
            className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.7)] transition hover:brightness-105"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}

export default async function PackagesMarketingLanding() {
  const locale = await getCurrentLocale()
  const { packagesResult, searchBarCountries } = await getPublicCatalogData({}, locale)
  const allPackages = packagesResult.items
  const topPackages = allPackages.slice(0, 3)

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
      destinationLabel: "Tujuan / Destinasi",
      allDestinations: "Semua Destinasi",
      durationLabel: "Durasi",
      allDurations: "Semua Durasi",
      typeLabel: "Tipe Paket",
      allTypes: "Semua Tipe",
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
      destinationLabel: "Destination",
      allDestinations: "All Destinations",
      durationLabel: "Duration",
      allDurations: "All Durations",
      typeLabel: "Package Type",
      allTypes: "All Types",
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
      destinationLabel: "目的地",
      allDestinations: "全部目的地",
      durationLabel: "时长",
      allDurations: "全部时长",
      typeLabel: "套餐类型",
      allTypes: "全部类型",
      offerLine: "适用于精选目的地",
    },
  }[locale]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-visible ${homeLayoutLock.cardRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[440px] px-4 pb-24 pt-[100px] sm:px-6 sm:pb-28 md:pt-[112px] lg:min-h-[500px] lg:px-8 xl:min-h-[520px]">
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

            <div className="relative z-10 max-w-[640px] pt-5 sm:pt-6 lg:pt-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-[620px] text-[23px] font-bold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:max-w-[660px] sm:text-[23px] lg:max-w-[760px] lg:text-[50px]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-[520px] text-[13px] leading-6 text-slate-700 sm:mt-4 sm:text-[14px] sm:leading-7 lg:max-w-[540px] lg:text-[15px] lg:leading-7">
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
                    destination: copy.destinationLabel,
                    allDestinations: copy.allDestinations,
                    duration: copy.durationLabel,
                    allDurations: copy.allDurations,
                    type: copy.typeLabel,
                    allTypes: copy.allTypes,
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

        <div className="relative z-[220] mx-auto -mt-44 max-w-[1280px] px-4 sm:-mt-48 sm:px-6 lg:-mt-[12.25rem] lg:px-8">
          <div className="max-w-[430px] sm:max-w-[500px] lg:max-w-[500px]">
            <PackagesHeroSearch placeholder={copy.heroSearch} buttonLabel={copy.heroSearchButton} />
          </div>
        </div>

        <section className={`${homeLayoutLock.contentWidthClass} mt-2 sm:mt-3 lg:mt-4`}>
          <div className={`${homeLayoutLock.wideContentWidthClass} ${homeLayoutLock.cardRadiusClass} border border-white/80 bg-white/94 p-3 shadow-[0_32px_70px_-34px_rgba(15,23,42,0.24)] backdrop-blur md:p-4`}>
            <PackagesHeroFilterBar
              locale={locale}
              countries={searchBarCountries}
              buttonLabel={locale === "en" ? "Apply Filter" : locale === "zh" ? "åº”ç”¨ç­›é€‰" : "Terapkan Filter"}
              labels={{
                destination: copy.destinationLabel,
                allDestinations: copy.allDestinations,
                duration: copy.durationLabel,
                allDurations: copy.allDurations,
                type: copy.typeLabel,
                allTypes: copy.allTypes,
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

        <section className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-8 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-slate-950">{copy.promoTitle}</h2>
              <p className="mt-4 text-sm text-slate-500">{copy.promoBody}</p>
              <p className="mt-3 text-[48px] font-semibold tracking-[-0.05em] text-[#ef4423]">
                30% <span className="text-[24px]">OFF</span>
              </p>
              <p className="mt-1 max-w-[220px] text-sm leading-6 text-slate-500">{copy.offerLine}</p>
              <Link
                href="/promo"
                className="mt-6 inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105"
              >
                {copy.promoAction}
              </Link>
            </article>

            {promoDestinations.map((entry) => (
              <Link
                key={entry.country}
                href={`/packages/catalog?country=${encodeURIComponent(entry.country)}`}
                className="overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.22)]"
              >
                <div className="relative h-[185px]">
                  <Image src={entry.image} alt={entry.country} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#ef4423] shadow-sm">
                    Diskon {entry.discount}%
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-slate-950">{entry.country}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{copy.fromLabel}</p>
                  <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-950">{entry.price || "-"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-10`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[34px] font-semibold tracking-[-0.04em] text-slate-950">{copy.popularTitle}</h2>
            <Link href="/packages/catalog" className="text-sm font-semibold text-[#ef4423] transition hover:text-[#d93b1d]">
              {copy.seeAll}
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-6">
            {popularDestinations.map((entry) => (
              <Link
                key={entry.country}
                href={`/packages/catalog?country=${encodeURIComponent(entry.country)}`}
                className="overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.2)]"
              >
                <div className="relative h-[190px] sm:h-[235px]">
                  <Image src={entry.image} alt={entry.country} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_54%,rgba(15,23,42,0.54)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-white sm:text-[24px]">{entry.country}</h3>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{copy.fromLabel}</p>
                  <p className="mt-2 text-[18px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[22px]">{entry.price || "-"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-10`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[34px] font-semibold tracking-[-0.04em] text-slate-950">{copy.recommendationTitle}</h2>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd8] bg-white text-slate-500 shadow-sm transition hover:text-[#ef4423]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                  <path d="m14.5 6.5-5 5 5 5" />
                </svg>
              </button>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd8] bg-white text-slate-500 shadow-sm transition hover:text-[#ef4423]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                  <path d="m9.5 6.5 5 5-5 5" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            {topPackages.map((pkg) => (
              <PackageRecoCard
                key={pkg.id}
                pkg={pkg}
                locale={locale}
                availableLabel={copy.availableNow}
                fromLabel={copy.fromLabel}
                actionLabel={copy.choosePackage}
              />
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-10 overflow-hidden rounded-[28px] border border-[#f0ddd2] bg-[linear-gradient(90deg,#fff0eb_0%,#fff6f2_40%,#fff9f5_100%)] shadow-[0_26px_70px_-44px_rgba(15,23,42,0.16)] sm:rounded-[30px]`}>
          <div className="grid gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[1fr_1.2fr_260px] lg:items-center lg:px-8">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[30px]">{copy.newsletterTitle}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{copy.newsletterBody}</p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder={copy.newsletterPlaceholder}
                className="h-14 flex-1 rounded-[18px] border border-white bg-white px-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)]"
              />
              <button
                type="button"
                className="inline-flex h-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105"
              >
                {copy.newsletterButton}
              </button>
            </form>
            <div className="relative hidden h-[130px] lg:block">
              <Image
                src="/home-assets/newsletter-bg-generated-china.png"
                alt="Travel newsletter"
                fill
                sizes="260px"
                className="object-contain object-right"
              />
            </div>
          </div>
        </section>
      </main>

      <PublicStickyAction locale={locale} href="/packages/catalog" label={copy.heroSearchButton} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
