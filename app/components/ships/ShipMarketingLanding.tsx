import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import ShipHeroSearchBar from "@/app/components/ships/ShipHeroSearchBar"
import { getMarketingPromosResolved } from "@/lib/marketing-content"
import { getCurrentLocale } from "@/lib/locale"

type ShipMarketingLandingProps = {
  searchParams?: { newsletter_success?: string; newsletter_error?: string }
}

export default async function ShipMarketingLanding({ searchParams }: ShipMarketingLandingProps) {
  const locale = await getCurrentLocale()
  const { promos, placementUsed } = await getMarketingPromosResolved(locale, {
    placement: "ships_featured",
    fallbackPlacement: "homepage_feed",
    limit: 4,
  })
  const baseCopy = {
    id: {
      eyebrow: "SEA ROUTES",
      title: "Jelajahi rute kapal dan ferry untuk perjalanan laut yang lebih mudah",
      body: "Cari tiket kapal, lihat promo rute laut favorit, dan susun perjalanan antar-pulau dari pelabuhan utama ke destinasi populer dalam satu alur.",
      searchButton: "Lihat Katalog",
      benefitTitle: ["Pelabuhan utama", "Pelayaran aman", "Ferry cepat siap", "Mudah tumbuh ke jadwal live"],
      benefitBody: [
        "Rute Merak, Bakauheni, Bali, dan Nusa Penida lebih mudah dibaca sejak awal.",
        "Arah CTA dan struktur section tetap sejalan dengan landing page paket.",
        "Kapal reguler dan fast ferry bisa masuk ke sistem visual yang sama.",
        "Saat jadwal live siap, halaman ini tinggal diperluas ke inventory real-time.",
      ],
      promoTitle: "Promo Rute Laut",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      offerLine: "untuk rute ferry, fast boat, dan pelayaran favorit customer",
      popularTitle: "Rute Laut Populer",
      seeAll: "Lihat semua rute",
      fromLabel: "Mulai dari",
      recommendationTitle: "Pilihan Rute Kapal RedFeng",
      stickyLabel: "Buka katalog kapal",
    },
    en: {
      eyebrow: "SEA ROUTES",
      title: "Explore ship and ferry routes for easier sea travel",
      body: "Search ship tickets, explore favorite sea route promos, and plan inter-island trips from key ports to popular destinations in one flow.",
      searchButton: "View Catalog",
      benefitTitle: ["Main ports", "Safe sailings", "Fast ferry ready", "Easy to grow into live schedules"],
      benefitBody: [
        "Merak, Bakauheni, Bali, and Nusa Penida routes are easier to scan from the start.",
        "CTA direction and section structure stay aligned with the package landing page.",
        "Regular ship routes and fast ferry options fit into the same visual system.",
        "When live schedules are ready, this page can expand into real-time inventory.",
      ],
      promoTitle: "Sea Route Deals",
      promoBody: "Get discounts up to",
      promoAction: "View Promos",
      offerLine: "for ferry, fast boat, and favorite sea routes people open most often",
      popularTitle: "Popular Sea Routes",
      seeAll: "View all routes",
      fromLabel: "Starting from",
      recommendationTitle: "RedFeng Sea Route Picks",
      stickyLabel: "Open ship catalog",
    },
    zh: {
      eyebrow: "SEA ROUTES",
      title: "让海运页继续沿用与 /packages 相同的落地页家族",
      body: "船票页现在继续使用 /packages 的节奏：完整 hero、浮动搜索卡、优惠区、热门海上线路与更安静的推荐 section。",
      searchButton: "查看目录",
      benefitTitle: ["主要港口", "航行更安心", "快速渡轮已准备好", "方便扩展到实时班次"],
      benefitBody: [
        "Merak、Bakauheni、Bali 与 Nusa Penida 路线从一开始就更容易被快速扫描。",
        "CTA 方向与 section 结构继续保持与套餐落地页一致。",
        "普通船线与快速渡轮可以进入同一套视觉系统。",
        "当实时班次准备好后，这个页面可以扩展到实时库存。",
      ],
      promoTitle: "海上线路优惠",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      offerLine: "覆盖客户最常打开的渡轮、快艇与热门海上路线",
      popularTitle: "热门海上路线",
      seeAll: "查看全部路线",
      fromLabel: "起价",
      recommendationTitle: "精选港口与路线",
      stickyLabel: "打开船票目录",
    },
  }[locale]
  const copy =
    locale === "zh"
      ? {
          ...baseCopy,
          title: "探索船票与渡轮路线，让海上出行更轻松",
          body: "搜索船票、查看热门海上路线优惠，并在一个顺畅页面中规划从主要港口到热门岛屿的旅程。",
          searchButton: "查看目录",
          benefitTitle: ["主要港口", "航行更安心", "快速渡轮已准备好", "便于扩展到实时班次"],
          benefitBody: [
            "Merak、Bakauheni、Bali 与 Nusa Penida 等路线从首屏开始就更容易快速浏览。",
            "CTA 方向与 section 结构保持一致，阅读与操作都更顺手。",
            "普通船线与快速渡轮可以进入同一套视觉系统。",
            "当实时班次准备好后，这个页面可以扩展到实时库存。",
          ],
          promoTitle: "海上路线优惠",
          promoBody: "最高可享",
          promoAction: "查看优惠",
          offerLine: "覆盖客户最常打开的渡轮、快艇与热门海上路线",
          popularTitle: "热门海上路线",
          seeAll: "查看全部路线",
          fromLabel: "起价",
          recommendationTitle: "RedFeng 精选海上路线",
          stickyLabel: "打开船票目录",
        }
      : baseCopy

  const routes = [
    { title: "Merak - Bakauheni", price: "IDR 85.000", image: "/home-assets/dest-bali.png" },
    { title: "Sanur - Nusa Penida", price: "IDR 175.000", image: "/home-assets/dest-labuanbajo.png" },
    { title: "Ketapang - Gilimanuk", price: "IDR 70.000", image: "/home-assets/dest-bali.png" },
    { title: "Padang Bai - Lombok", price: "IDR 240.000", image: "/home-assets/dest-labuanbajo.png" },
    { title: "Batam - Singapore", price: "IDR 390.000", image: "/home-assets/dest-singapore.png" },
    { title: "Labuan Bajo - Komodo", price: "IDR 450.000", image: "/home-assets/dest-labuanbajo.png" },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />
      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-hidden ${homeLayoutLock.heroBackdropRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image src="/home-assets/hero-kapal-laut.png" alt="Ship hero" fill priority sizes="100vw" className="object-cover object-[72%_center] sm:hidden" />
            <Image src="/home-assets/hero-kapal-laut.png" alt="Ship hero" fill priority sizes="(max-width: 1440px) 100vw, 1280px" className="hidden object-cover object-[76%_center] sm:block" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(245,250,255,0.98)_0%,rgba(245,250,255,0.92)_24%,rgba(225,242,255,0.56)_50%,rgba(235,248,255,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.72),transparent_24%),radial-gradient(circle_at_20%_62%,rgba(103,232,249,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
            <div className="relative z-10 max-w-[600px] pt-12 sm:pt-12 lg:max-w-[560px] lg:pt-16">
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
            <ShipHeroSearchBar locale={locale} buttonLabel={copy.searchButton} />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    {index === 0 ? <path d="M12 4v9m0-9 4 3m-4-3-4 3" /> : index === 1 ? <path d="M7 12l3 3 7-7" /> : index === 2 ? <path d="M4 14.5 12 18l8-3.5" /> : <circle cx="11" cy="11" r="6.5" />}
                    {index === 0 ? <path d="M4 14.5 12 18l8-3.5M6 16.5c.7 1.5 2 2.5 3.8 2.5 1 0 1.8-.2 2.2-.5.4.3 1.2.5 2.2.5 1.8 0 3.1-1 3.8-2.5" /> : index === 1 ? <rect x="4" y="6" width="16" height="12" rx="2.5" /> : index === 2 ? <path d="M6 16.5c.7 1.5 2 2.5 3.8 2.5" /> : <path d="M16 16l4 4" />}
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ship-promo" className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <PromoPlacementImpressionBeacon placement={placementUsed || "homepage_feed"} sourcePath="/kapal" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.promoTitle}</h2>
              <p className="mt-4 text-[13px] font-medium leading-none text-slate-500">{copy.promoBody}</p>
              <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] text-[#ef4423] sm:text-[19px]">
                15% <span className="text-[13px] sm:text-[14px]">OFF</span>
              </p>
              <p className="mt-3 max-w-[220px] text-[12px] leading-[1.3] text-slate-500 sm:text-[13px]">{copy.offerLine}</p>
              <Link href="/promo" className="mt-5 inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.72)] transition hover:brightness-105">
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
      </main>
      <div className="mt-16">
        <HomeNewsletterSection locale={locale} redirectPath="/kapal" successMessage={searchParams?.newsletter_success} errorMessage={searchParams?.newsletter_error} />
      </div>
      <HomeFooter locale={locale} />
      <PublicStickyAction locale={locale} href="/kapal/catalog" label={copy.stickyLabel} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
