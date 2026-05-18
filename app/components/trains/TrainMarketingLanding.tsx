import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import TrainHeroSearchBar from "@/app/components/trains/TrainHeroSearchBar"
import { getMarketingPromosResolved } from "@/lib/marketing-content"
import { getCurrentLocale } from "@/lib/locale"

type TrainMarketingLandingProps = {
  searchParams?: { newsletter_success?: string; newsletter_error?: string }
}

export default async function TrainMarketingLanding({ searchParams }: TrainMarketingLandingProps) {
  const locale = await getCurrentLocale()
  const { promos, placementUsed } = await getMarketingPromosResolved(locale, {
    placement: "trains_featured",
    fallbackPlacement: "homepage_feed",
    limit: 4,
  })
  const baseCopy = {
    id: {
      eyebrow: "TRAIN ROUTES",
      title: "Jelajahi rute kereta favorit untuk perjalanan antarkota yang lebih nyaman",
      body: "Cari perjalanan kereta, lihat promo rute populer, dan susun perjalanan cepat dari kota besar ke destinasi pilihan dalam satu alur.",
      searchButton: "Lihat Katalog",
      benefitTitle: ["Rute populer", "Booking aman", "Kereta cepat siap", "Mudah tumbuh ke jadwal live"],
      benefitBody: [
        "Rute utama dan ide perjalanan dibuat lebih mudah dipindai sejak fold pertama.",
        "Pola CTA dan shadow card tetap satu keluarga dengan landing page paket.",
        "Kereta reguler dan cepat bisa ditampung tanpa ganti bahasa visual.",
        "Saat jadwal live siap, halaman ini tinggal diperluas ke hasil pencarian real-time.",
      ],
      promoTitle: "Promo Rute Kereta",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      offerLine: "untuk rute antarkota dan perjalanan whoosh yang paling diminati",
      popularTitle: "Rute Kereta Populer",
      seeAll: "Lihat semua rute",
      fromLabel: "Mulai dari",
      recommendationTitle: "Pilihan Rute Kereta RedFeng",
      stickyLabel: "Buka katalog kereta",
    },
    en: {
      eyebrow: "TRAIN ROUTES",
      title: "Explore favorite train routes for more comfortable intercity travel",
      body: "Search train journeys, browse popular route promos, and line up fast trips from major cities to top destinations in one flow.",
      searchButton: "View Catalog",
      benefitTitle: ["Popular routes", "Secure booking", "High-speed rail ready", "Easy to grow into live schedules"],
      benefitBody: [
        "Main routes and travel ideas are easier to scan from the first fold.",
        "CTA patterns and card shadows stay in the same family as the package landing page.",
        "Regular trains and high-speed rail can coexist without changing the visual language.",
        "When live schedules are ready, this page can expand directly into real-time results.",
      ],
      promoTitle: "Train Route Deals",
      promoBody: "Get discounts up to",
      promoAction: "View Promos",
      offerLine: "for intercity and high-speed train routes customers care about most",
      popularTitle: "Popular Train Routes",
      seeAll: "View all routes",
      fromLabel: "Starting from",
      recommendationTitle: "RedFeng Train Picks",
      stickyLabel: "Open train catalog",
    },
    zh: {
      eyebrow: "TRAIN ROUTES",
      title: "让火车页继续沿用与 /packages 相同的落地页家族",
      body: "火车页现在继续使用 /packages 的结构：完整 hero、浮动搜索卡、优惠区、热门线路与更清晰的推荐区域。",
      searchButton: "查看目录",
      benefitTitle: ["热门线路", "预订更安心", "高铁已准备好", "方便扩展到实时班次"],
      benefitBody: [
        "主要线路与出行灵感在首屏就更容易被快速扫描。",
        "CTA 模式与卡片阴影继续保持与套餐落地页同一家族。",
        "普通列车与高铁可以共存，而不需要更换视觉语言。",
        "当实时班次准备好后，这个页面可以直接扩展到实时结果。",
      ],
      promoTitle: "火车线路优惠",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      offerLine: "覆盖客户最关注的城际与高铁路线",
      popularTitle: "热门线路",
      seeAll: "查看全部线路",
      fromLabel: "起价",
      recommendationTitle: "精选旅程",
      stickyLabel: "打开火车目录",
    },
  }[locale]
  const copy =
    locale === "zh"
      ? {
          ...baseCopy,
          title: "探索热门火车路线，让城际出行更从容",
          body: "搜索火车行程、查看热门线路优惠，并在一个清晰顺畅的页面中安排从大城市到重点目的地的旅程。",
          searchButton: "查看目录",
          benefitTitle: ["热门线路", "预订更安心", "高铁已准备好", "便于扩展到实时班次"],
          benefitBody: [
            "主要路线与出行灵感从首屏开始就更容易快速浏览。",
            "CTA 模式与卡片节奏保持一致，阅读和操作都更自然。",
            "普通列车与高铁可以共存，而不需要更换视觉语言。",
            "当实时班次准备好后，这个页面可以直接扩展到实时结果。",
          ],
          promoTitle: "火车线路优惠",
          promoBody: "最高可享",
          promoAction: "查看优惠",
          offerLine: "覆盖客户最关注的城际与高铁路线",
          popularTitle: "热门火车路线",
          seeAll: "查看全部路线",
          fromLabel: "起价",
          recommendationTitle: "RedFeng 精选火车路线",
          stickyLabel: "打开火车目录",
        }
      : baseCopy

  const routes = [
    { title: "Jakarta - Bandung", price: "IDR 250.000", image: "/home-assets/card-train.png" },
    { title: "Jakarta - Yogyakarta", price: "IDR 480.000", image: "/home-assets/card-train.png" },
    { title: "Jakarta - Surabaya", price: "IDR 690.000", image: "/home-assets/card-train.png" },
    { title: "Bandung - Solo", price: "IDR 530.000", image: "/home-assets/card-train.png" },
    { title: "Semarang - Surabaya", price: "IDR 420.000", image: "/home-assets/card-train.png" },
    { title: "Whoosh Jakarta - Bandung", price: "IDR 180.000", image: "/home-assets/card-train.png" },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-visible ${homeLayoutLock.cardRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image src="/home-assets/background-package-mobile.png" alt="Train hero" fill priority sizes="100vw" className="object-cover object-center sm:hidden" />
            <Image src="/home-assets/background-package-web.png" alt="Train hero" fill priority sizes="(max-width: 1440px) 100vw, 1280px" className="hidden object-cover object-center sm:block" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,241,0.98)_0%,rgba(255,248,241,0.9)_24%,rgba(255,240,231,0.58)_50%,rgba(255,247,243,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.72),transparent_24%),radial-gradient(circle_at_22%_62%,rgba(255,210,178,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
            <div className="relative z-10 max-w-[600px] pt-10 sm:pt-11 lg:pt-14">
              <p className="text-[12px] font-bold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-[580px] text-[23px] font-bold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:max-w-[620px] sm:text-[23px] lg:max-w-[680px] lg:text-[50px]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-[500px] text-[13px] leading-6 text-slate-700 sm:text-[14px] sm:leading-7 lg:max-w-[520px] lg:text-[15px] lg:leading-7">
                {copy.body}
              </p>
            </div>
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} relative z-[210] -mt-20 sm:-mt-24 lg:-mt-28`}>
          <div className={`${homeLayoutLock.wideContentWidthClass} ${homeLayoutLock.cardRadiusClass} border border-[#f0e4da] bg-white p-3 shadow-[0_28px_56px_-26px_rgba(15,23,42,0.22)] md:p-4`}>
            <TrainHeroSearchBar locale={locale} buttonLabel={copy.searchButton} />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    {index === 0 ? <rect x="6" y="4.5" width="12" height="12" rx="2.5" /> : index === 1 ? <path d="M7 12l3 3 7-7" /> : index === 2 ? <path d="M8.5 16.5 6.5 19M15.5 16.5l2 2.5M9 20h6" /> : <circle cx="11" cy="11" r="6.5" />}
                    {index === 0 ? <path d="M8.5 16.5 6.5 19M15.5 16.5l2 2.5M9 20h6M8.5 8.5h2M13.5 8.5h2M6 12.5h12" /> : index === 1 ? <rect x="4" y="6" width="16" height="12" rx="2.5" /> : index === 2 ? <path d="M6 12.5h12" /> : <path d="M16 16l4 4" />}
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="train-promo" className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <PromoPlacementImpressionBeacon placement={placementUsed || "homepage_feed"} sourcePath="/kereta" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.promoTitle}</h2>
              <p className="mt-4 text-[13px] font-medium leading-none text-slate-500">{copy.promoBody}</p>
              <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] text-[#ef4423] sm:text-[19px]">
                20% <span className="text-[13px] sm:text-[14px]">OFF</span>
              </p>
              <p className="mt-3 max-w-[220px] text-[12px] leading-[1.3] text-slate-500 sm:text-[13px]">{copy.offerLine}</p>
              <Link
                href="/promo"
                className="mt-5 inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105"
              >
                {copy.promoAction}
              </Link>
            </article>

            {promos.slice(0, 4).map((entry) => (
              <Link key={entry.slug} href={entry.detailHref} className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.22)]">
                <div className="relative h-[185px]">
                  {entry.image ? <Image src={entry.image} alt={entry.title.replace(/\n/g, " ")} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#fff7ef_0%,#f8fafc_100%)]" aria-hidden="true" />}
                  {entry.badge ? <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#ef4423] shadow-sm">{entry.badge}</span> : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="min-h-[2.7rem] whitespace-pre-line text-[14px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900 md:text-[17px]">{entry.title}</h3>
                  <p className="mt-3 text-[11px] leading-none text-slate-400">{entry.eyebrow}</p>
                  <p className="mt-auto pt-2 text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">{entry.price || "-"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-12`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">{copy.popularTitle}</h2>
            <Link href="/promo" className="text-[14px] font-semibold text-slate-900 transition hover:text-[#d93b1d]">
              {copy.seeAll}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-6">
            {routes.map((entry) => (
              <Link key={entry.title} href="/promo" className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.2)]">
                <div className="relative h-[190px] sm:h-[235px]">
                  <Image src={entry.image} alt={entry.title} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_54%,rgba(15,23,42,0.54)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-[12px] font-semibold leading-none tracking-normal text-white sm:text-[18px]">{entry.title}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="text-[11px] leading-none text-slate-400">{copy.fromLabel}</p>
                  <p className="mt-auto pt-2 text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-slate-900 md:text-[17px]">{entry.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${homeLayoutLock.contentWidthClass} mt-12 rounded-[28px] border border-[#efe2d8] bg-white p-5 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.12)] sm:p-6`}>
          <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.recommendationTitle}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {routes.slice(0, 4).map((route) => (
              <article key={route.title} className="overflow-hidden rounded-[24px] border border-[#ece2db] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                <div className="relative h-44">
                  <Image src={route.image} alt={route.title} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-slate-950">{route.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="mt-16">
        <HomeNewsletterSection locale={locale} redirectPath="/kereta" successMessage={searchParams?.newsletter_success} errorMessage={searchParams?.newsletter_error} />
      </div>
      <HomeFooter locale={locale} />
      <PublicStickyAction locale={locale} href="/kereta/catalog" label={copy.stickyLabel} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
