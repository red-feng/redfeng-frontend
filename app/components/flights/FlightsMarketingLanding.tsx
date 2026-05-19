import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import FlightsHeroSearchBar from "@/app/components/flights/FlightsHeroSearchBar"
import { getMarketingPromosResolved } from "@/lib/marketing-content"
import { getCurrentLocale } from "@/lib/locale"

type FlightsMarketingLandingProps = {
  searchParams?: { newsletter_success?: string; newsletter_error?: string }
}

export default async function FlightsMarketingLanding({ searchParams }: FlightsMarketingLandingProps) {
  const locale = await getCurrentLocale()
  const { promos, placementUsed } = await getMarketingPromosResolved(locale, {
    placement: "flights_featured",
    fallbackPlacement: "homepage_feed",
    limit: 4,
  })

  const baseCopy = {
    id: {
      eyebrow: "FLIGHT JOURNEYS",
      title: "Terbang ke destinasi impianmu bersama RedFeng",
      body: "Cari tiket pesawat, lihat promo rute pilihan, dan susun perjalanan dari kota besar hingga destinasi liburan dalam satu alur yang ringan.",
      searchButton: "Lihat Katalog",
      benefitTitle: ["Harga terbaik", "Pembayaran aman", "Maskapai partner", "Arah ke promo live"],
      benefitBody: [
        "Susun pengalaman pencarian yang siap ditautkan ke harga real-time berikutnya.",
        "Ritme form dan CTA mengikuti keluarga landing page paket, jadi lebih konsisten di RedFeng.",
        "Area partner dibuat lebih ringan dan premium, tidak terasa seperti strip logo generik.",
        "Saat engine flight live siap, halaman ini tinggal disambungkan tanpa ganti DNA desain.",
      ],
      promoTitle: "Promo Rute Pilihan",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      offerLine: "untuk rute penerbangan yang paling sering dicari customer",
      popularTitle: "Destinasi Populer",
      seeAll: "Lihat semua destinasi",
      fromLabel: "Mulai dari",
      recommendationTitle: "Maskapai Partner RedFeng",
      newsletterCta: "Buka katalog penerbangan",
    },
    en: {
      eyebrow: "FLIGHT JOURNEYS",
      title: "Fly to your dream destination with RedFeng",
      body: "Search flights, explore featured route promos, and plan trips from major cities to holiday escapes in one clean flow.",
      searchButton: "View Catalog",
      benefitTitle: ["Best fares", "Secure payments", "Airline partners", "Ready for live promos"],
      benefitBody: [
        "Shape a flight search experience that can connect to real-time fares later.",
        "The form rhythm and CTA follow the package landing family, so the system feels more consistent.",
        "The partner zone stays lighter and more premium instead of becoming a generic logo strip.",
        "When the live flight engine is ready, this page can be connected without changing its design DNA.",
      ],
      promoTitle: "Featured Route Deals",
      promoBody: "Get discounts up to",
      promoAction: "View Promos",
      offerLine: "for the flight routes customers search most often",
      popularTitle: "Popular Destinations",
      seeAll: "View all destinations",
      fromLabel: "Starting from",
      recommendationTitle: "RedFeng Airline Partners",
      newsletterCta: "Open flight catalog",
    },
    zh: {
      eyebrow: "FLIGHT JOURNEYS",
      title: "与 RedFeng 一起飞往理想目的地",
      body: "机票页继续沿用套餐落地页的视觉方向：大幅 hero、浮动搜索卡、航线优惠与目的地灵感都放在同一条完整动线上。",
      searchButton: "查看目录",
      benefitTitle: ["更优票价", "支付更安心", "航空伙伴", "已准备接入 live promo"],
      benefitBody: [
        "先建立适合后续接入实时票价的航班搜索体验。",
        "表单节奏与 CTA 继续沿用套餐落地页家族，系统会更统一。",
        "合作伙伴区域保持轻盈与高级感，不会变成普通 logo 长条。",
        "当 live flight engine 准备好后，这个页面可以直接接入，而不需要重做设计语言。",
      ],
      promoTitle: "精选航线优惠",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      offerLine: "覆盖客户最常搜索的热门航线",
      popularTitle: "热门目的地",
      seeAll: "查看全部目的地",
      fromLabel: "起价",
      recommendationTitle: "RedFeng 航空伙伴",
      newsletterCta: "打开航班目录",
    },
  }[locale]
  const copy =
    locale === "zh"
      ? {
          ...baseCopy,
          title: "与 RedFeng 一起飞往理想目的地",
          body: "搜索航班、查看精选航线优惠，并在一个清晰顺畅的页面中规划从大城市到度假目的地的旅程。",
          searchButton: "查看目录",
          benefitTitle: ["更优票价", "支付更安心", "航空伙伴", "已准备接入实时优惠"],
          benefitBody: [
            "从起点开始就更轻松地浏览热门航线与出行灵感。",
            "表单节奏与 CTA 保持清晰，便于快速进入下一步搜索。",
            "合作航司区域更轻盈，也更符合 RedFeng 的整体视觉气质。",
            "当实时航班引擎准备好后，这个页面可以直接接入而无需重做结构。",
          ],
          promoTitle: "精选航线优惠",
          promoBody: "最高可享",
          promoAction: "查看优惠",
          offerLine: "覆盖客户最常搜索的热门航线",
          popularTitle: "热门目的地",
          seeAll: "查看全部目的地",
          fromLabel: "起价",
          recommendationTitle: "RedFeng 航空伙伴",
          newsletterCta: "打开航班目录",
        }
      : baseCopy

  const destinations = [
    { title: "Bali", price: "IDR 950.000", image: "/home-assets/dest-bali.png" },
    { title: "Bangkok", price: "IDR 1.890.000", image: "/home-assets/dest-bangkok.png" },
    { title: "Singapore", price: "IDR 1.250.000", image: "/home-assets/dest-singapore.png" },
    { title: "Tokyo", price: "IDR 3.850.000", image: "/home-assets/dest-tokyo.png" },
    { title: "Jakarta", price: "IDR 780.000", image: "/home-assets/dest-jakarta.png" },
    { title: "Labuan Bajo", price: "IDR 1.450.000", image: "/home-assets/dest-labuanbajo.png" },
  ]

  const partners = [
    { name: "Garuda Indonesia", image: "/home-assets/partner-garuda.png", isImage: true },
    { name: "AirAsia" },
    { name: "Lion Air" },
    { name: "Batik Air" },
    { name: "Citilink" },
    { name: "Singapore Airlines" },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-hidden ${homeLayoutLock.heroBackdropRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image
              src="/home-assets/hero-pesawat.png"
              alt="Flight hero"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[70%_center] sm:hidden"
            />
            <Image
              src="/home-assets/hero-pesawat.png"
              alt="Flight hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="hidden object-cover object-[74%_center] sm:block"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,248,255,0.985)_0%,rgba(239,246,255,0.94)_24%,rgba(219,234,254,0.56)_50%,rgba(239,246,255,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_16%,rgba(255,255,255,0.82),transparent_24%),radial-gradient(circle_at_24%_60%,rgba(191,219,254,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.2),transparent_30%)]" />

            <div className="relative z-10 max-w-[600px] pt-12 sm:pt-12 lg:max-w-[560px] lg:pt-16">
              <p className="text-[12px] font-bold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
              <h1 className={homeLayoutLock.marketingHeroTitleClass}>
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
            <FlightsHeroSearchBar locale={locale} buttonLabel={copy.searchButton} />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    {index === 0 ? <path d="M4 13.5h7.3l4.2 5.1c.3.4.8.6 1.3.6h1.5l-2.4-5.7h4.2c.9 0 1.7-.6 1.9-1.5l.2-.8-.2-.8c-.2-.9-1-1.5-1.9-1.5h-4.2l2.4-5.7h-1.5c-.5 0-1 .2-1.3.6l-4.2 5.1H3l-.8 1.2.8 1.4Z" /> : index === 1 ? <><rect x="4" y="6" width="16" height="12" rx="2.5" /><path d="M7 12l3 3 7-7" /></> : index === 2 ? <><path d="M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z" /><path d="M4.5 9.5h15M4.5 14.5h15M12 4c2.1 2.3 3.2 5 3.2 8s-1.1 5.7-3.2 8c-2.1-2.3-3.2-5-3.2-8s1.1-5.7 3.2-8Z" /></> : <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>}
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flight-promo" className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <PromoPlacementImpressionBeacon placement={placementUsed || "homepage_feed"} sourcePath="/pesawat" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
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

            {promos.slice(0, 4).map((entry) => (
              <Link
                key={entry.slug}
                href={entry.detailHref}
                className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.22)]"
              >
                <div className="relative h-[185px]">
                  {entry.image ? (
                    <Image src={entry.image} alt={entry.title.replace(/\n/g, " ")} fill sizes="(max-width: 1280px) 100vw, 220px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(135deg,#fff7ef_0%,#f8fafc_100%)]" aria-hidden="true" />
                  )}
                  {entry.badge ? (
                    <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#ef4423] shadow-sm">
                      {entry.badge}
                    </span>
                  ) : null}
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
              <Link
                key={entry.title}
                href="/promo"
                className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#ece2db] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.2)]"
              >
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
          <div className="mt-5 flex flex-wrap gap-4">
            {partners.map((partner) =>
              partner.isImage ? (
                <div key={partner.name} className="flex h-16 min-w-[180px] items-center justify-center rounded-[22px] border border-[#f0dfd0] bg-white px-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <Image src={partner.image!} alt={partner.name} width={120} height={30} className="h-auto w-[120px]" />
                </div>
              ) : (
                <div
                  key={partner.name}
                  className="inline-flex min-h-[58px] items-center rounded-[18px] border border-[#f0dfd0] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                >
                  {partner.name}
                </div>
              ),
            )}
          </div>
        </section>
      </main>

      <div className="mt-16">
        <HomeNewsletterSection
          locale={locale}
          redirectPath="/pesawat"
          successMessage={searchParams?.newsletter_success}
          errorMessage={searchParams?.newsletter_error}
        />
      </div>
      <HomeFooter locale={locale} />

      <PublicStickyAction locale={locale} href="/pesawat/catalog" label={copy.newsletterCta} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
