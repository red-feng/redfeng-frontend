import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import HotelHeroSearchBar from "@/app/components/hotel/HotelHeroSearchBar"
import { getMarketingPromos } from "@/lib/marketing-content"
import { getCurrentLocale } from "@/lib/locale"

type HotelMarketingLandingProps = {
  searchParams?: { newsletter_success?: string; newsletter_error?: string }
}

export default async function HotelMarketingLanding({ searchParams }: HotelMarketingLandingProps) {
  const locale = await getCurrentLocale()
  const promos = await getMarketingPromos(locale, { limit: 4 })
  const baseCopy = {
    id: {
      eyebrow: "HOTEL STAYS",
      title: "Temukan hotel pilihan untuk stay yang lebih tenang dan terencana",
      body: "Cari akomodasi, bandingkan properti populer, dan masuk ke promo stay terbaik dalam satu halaman yang rapi dan mudah dipindai.",
      searchButton: "Cari Hotel",
      benefitTitle: ["Harga transparan", "Booking aman", "Stay pilihan", "Siap ke live inventory"],
      benefitBody: [
        "Harga display tetap rapi dan mudah berkembang ke nightly rate real-time.",
        "Arah CTA dan ritme kartu mengikuti keluarga landing page paket.",
        "Destinasi stay populer dibuat lebih hangat dan tidak terasa seperti katalog generik.",
        "Saat inventory hotel live siap, halaman ini tinggal disambungkan ke hasil pencarian.",
      ],
      promoTitle: "Promo Stay Pilihan",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      offerLine: "untuk hotel dan properti yang paling sering dibuka customer",
      popularTitle: "Destinasi Stay Populer",
      seeAll: "Lihat semua destinasi",
      fromLabel: "Mulai dari",
      recommendationTitle: "Properti Favorit RedFeng",
      stickyLabel: "Buka promo hotel",
    },
    en: {
      eyebrow: "HOTEL STAYS",
      title: "Discover selected hotels for a calmer, better-planned stay",
      body: "Search accommodations, compare popular properties, and move into the best stay promos in one clean page.",
      searchButton: "Search Hotels",
      benefitTitle: ["Transparent pricing", "Secure booking", "Selected stays", "Ready for live inventory"],
      benefitBody: [
        "Display pricing stays clean and can grow into real-time nightly rates.",
        "CTA direction and card rhythm follow the same package landing family.",
        "Popular stay destinations feel warmer and less like a generic catalog.",
        "When live hotel inventory is ready, this page can connect directly to the search flow.",
      ],
      promoTitle: "Featured Stay Deals",
      promoBody: "Get discounts up to",
      promoAction: "View Promos",
      offerLine: "for hotels and properties customers open most often",
      popularTitle: "Popular Stay Destinations",
      seeAll: "View all destinations",
      fromLabel: "Starting from",
      recommendationTitle: "RedFeng Favorite Properties",
      stickyLabel: "Open hotel promos",
    },
    zh: {
      eyebrow: "HOTEL STAYS",
      title: "让酒店落地页与 /packages 采用同一家族的节奏",
      body: "酒店页现在继续沿用 RedFeng 套餐落地页的 hero、浮动搜索卡、优惠区与推荐 section。",
      searchButton: "搜索酒店",
      benefitTitle: ["价格更透明", "预订更安心", "精选住宿", "已准备接入 live inventory"],
      benefitBody: [
        "展示价格保持清晰，也方便后续继续扩展到实时房价。",
        "CTA 方向与卡片节奏继续沿用套餐落地页家族。",
        "热门住宿目的地更温暖，不再像普通目录页。",
        "当酒店 live inventory 准备好后，这个页面可以直接接入搜索流。",
      ],
      promoTitle: "精选住宿优惠",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      offerLine: "覆盖客户最常浏览的酒店与住宿类型",
      popularTitle: "热门住宿目的地",
      seeAll: "查看全部目的地",
      fromLabel: "起价",
      recommendationTitle: "RedFeng 推荐住宿",
      stickyLabel: "打开酒店优惠",
    },
  }[locale]
  const copy =
    locale === "zh"
      ? {
          ...baseCopy,
          title: "发现精选酒店，让每次入住更从容",
          body: "搜索住宿、比较热门酒店，并在一个清晰易读的页面中进入最合适的住宿优惠。",
          searchButton: "搜索酒店",
          benefitTitle: ["价格更透明", "预订更安心", "精选住宿", "已准备接入实时库存"],
          benefitBody: [
            "展示价格保持清楚，也方便后续扩展到实时房价。",
            "CTA 方向与卡片节奏保持一致，浏览体验更顺手。",
            "热门住宿目的地更有温度，不会显得像普通目录页。",
            "当酒店实时库存准备好后，这个页面可以直接接入搜索流程。",
          ],
          promoTitle: "精选住宿优惠",
          promoBody: "最高可享",
          promoAction: "查看优惠",
          offerLine: "覆盖客户最常浏览的酒店与住宿类型",
          popularTitle: "热门住宿目的地",
          seeAll: "查看全部目的地",
          fromLabel: "起价",
          recommendationTitle: "RedFeng 推荐住宿",
          stickyLabel: "打开酒店优惠",
        }
      : baseCopy

  const destinations = [
    { title: "Bali", price: "IDR 650.000", image: "/home-assets/dest-bali.png" },
    { title: "Bangkok", price: "IDR 890.000", image: "/home-assets/dest-bangkok.png" },
    { title: "Singapore", price: "IDR 1.250.000", image: "/home-assets/dest-singapore.png" },
    { title: "Tokyo", price: "IDR 1.980.000", image: "/home-assets/dest-tokyo.png" },
    { title: "Jakarta", price: "IDR 780.000", image: "/home-assets/dest-jakarta.png" },
    { title: "Labuan Bajo", price: "IDR 1.150.000", image: "/home-assets/dest-labuanbajo.png" },
  ]

  const properties = [
    { title: "Ubud Hills Resort", image: "/home-assets/card-hotel-1.png" },
    { title: "Marina Bay Stay", image: "/home-assets/card-hotel-2.png" },
    { title: "Citylight Suites", image: "/home-assets/card-hotel-1.png" },
    { title: "Shinjuku Garden Hotel", image: "/home-assets/card-hotel-2.png" },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-visible ${homeLayoutLock.cardRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image src="/home-assets/background-package-mobile.png" alt="Hotel hero" fill priority sizes="100vw" className="object-cover object-center sm:hidden" />
            <Image src="/home-assets/background-package-web.png" alt="Hotel hero" fill priority sizes="(max-width: 1440px) 100vw, 1280px" className="hidden object-cover object-center sm:block" />
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
            <HotelHeroSearchBar locale={locale} buttonLabel={copy.searchButton} />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    {index === 0 ? <path d="M4 18v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 14h16M7 10V8.5A1.5 1.5 0 0 1 8.5 7h2A1.5 1.5 0 0 1 12 8.5V10M12 10V8.5A1.5 1.5 0 0 1 13.5 7h2A1.5 1.5 0 0 1 17 8.5V10" /> : index === 1 ? <><rect x="4" y="6" width="16" height="12" rx="2.5" /><path d="M7 12l3 3 7-7" /></> : index === 2 ? <><path d="M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z" /><path d="M4.5 9.5h15M4.5 14.5h15M12 4c2.1 2.3 3.2 5 3.2 8s-1.1 5.7-3.2 8c-2.1-2.3-3.2-5-3.2-8s1.1-5.7 3.2-8Z" /></> : <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>}
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="hotel-promo" className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <PromoPlacementImpressionBeacon placement="homepage_feed" sourcePath="/hotel" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.promoTitle}</h2>
              <p className="mt-4 text-[13px] font-medium leading-none text-slate-500">{copy.promoBody}</p>
              <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] text-[#ef4423] sm:text-[19px]">
                25% <span className="text-[13px] sm:text-[14px]">OFF</span>
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
            {destinations.map((entry) => (
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
            {properties.map((property) => (
              <article key={property.title} className="overflow-hidden rounded-[24px] border border-[#ece2db] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                <div className="relative h-44">
                  <Image src={property.image} alt={property.title} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-slate-950">{property.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="mt-16">
        <HomeNewsletterSection locale={locale} redirectPath="/hotel" successMessage={searchParams?.newsletter_success} errorMessage={searchParams?.newsletter_error} />
      </div>
      <HomeFooter locale={locale} />
      <PublicStickyAction locale={locale} href="/hotel#hotel-promo" label={copy.stickyLabel} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
