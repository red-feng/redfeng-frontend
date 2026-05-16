import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import { HomeFooter, HomeNewsletterSection } from "@/app/components/home/shared/sections"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PromoPlacementImpressionBeacon from "@/app/components/promo/PromoPlacementImpressionBeacon"
import ActivitiesHeroSearchBar from "@/app/components/activities/ActivitiesHeroSearchBar"
import { getMarketingPromos } from "@/lib/marketing-content"
import { getCurrentLocale } from "@/lib/locale"

type ActivitiesMarketingLandingProps = {
  searchParams?: { newsletter_success?: string; newsletter_error?: string }
}

export default async function ActivitiesMarketingLanding({ searchParams }: ActivitiesMarketingLandingProps) {
  const locale = await getCurrentLocale()
  const promos = await getMarketingPromos(locale, { limit: 4 })
  const copy = {
    id: {
      eyebrow: "ACTIVITY PICKS",
      title: "Buat halaman aktivitas tetap satu keluarga dengan /packages",
      body: "Halaman aktivitas sekarang memakai hero, floating search card, promo strip, destinasi populer, dan rekomendasi yang seirama dengan keluarga landing page RedFeng.",
      searchButton: "Cari Aktivitas",
      benefitTitle: ["Atraksi favorit", "Voucher instan", "Event & tur siap", "Mudah tumbuh ke inventory live"],
      benefitBody: [
        "Aktivitas populer lebih mudah dibaca dari fold pertama.",
        "CTA dan struktur kartu tetap satu sistem dengan landing page paket.",
        "Atraksi, tur, dan event bisa hidup dalam bahasa visual yang sama.",
        "Saat inventory live siap, halaman ini tinggal berkembang ke hasil real-time.",
      ],
      promoTitle: "Promo Aktivitas",
      promoBody: "Dapatkan diskon hingga",
      promoAction: "Lihat Promo",
      offerLine: "untuk taman hiburan, event, dan tur yang paling sering dibuka customer",
      popularTitle: "Destinasi Aktivitas Populer",
      seeAll: "Lihat semua destinasi",
      fromLabel: "Mulai dari",
      recommendationTitle: "Pilihan Aktivitas RedFeng",
      stickyLabel: "Buka promo aktivitas",
    },
    en: {
      eyebrow: "ACTIVITY PICKS",
      title: "Keep the activities page in the same family as /packages",
      body: "The activities page now uses the same hero, floating search card, promo strip, popular destinations, and recommendation rhythm as the RedFeng landing family.",
      searchButton: "Search Activities",
      benefitTitle: ["Favorite attractions", "Instant vouchers", "Events & tours ready", "Easy to grow into live inventory"],
      benefitBody: [
        "Popular activities are easier to read from the first fold.",
        "CTA and card structure stay in the same system as the package landing page.",
        "Attractions, tours, and events can live inside the same visual language.",
        "When live inventory is ready, this page can grow into real-time results.",
      ],
      promoTitle: "Activity Deals",
      promoBody: "Get discounts up to",
      promoAction: "View Promos",
      offerLine: "for theme parks, events, and tours customers open most often",
      popularTitle: "Popular Activity Destinations",
      seeAll: "View all destinations",
      fromLabel: "Starting from",
      recommendationTitle: "RedFeng Activity Picks",
      stickyLabel: "Open activity promos",
    },
    zh: {
      eyebrow: "ACTIVITY PICKS",
      title: "让活动页继续沿用与 /packages 相同的家族语言",
      body: "活动页现在继续使用 RedFeng 落地页家族的 hero、浮动搜索卡、优惠区、热门目的地与推荐节奏。",
      searchButton: "搜索活动",
      benefitTitle: ["热门景点", "即时票券", "活动与行程已准备好", "方便扩展到实时库存"],
      benefitBody: [
        "热门活动从首屏开始就更容易被快速浏览。",
        "CTA 与卡片结构继续与套餐落地页保持同一系统。",
        "景点、行程与活动都能共用同一套视觉语言。",
        "当实时库存准备好后，这个页面可以继续扩展到实时结果。",
      ],
      promoTitle: "活动优惠",
      promoBody: "最高可享",
      promoAction: "查看优惠",
      offerLine: "覆盖客户最常打开的主题乐园、活动与行程",
      popularTitle: "热门活动目的地",
      seeAll: "查看全部目的地",
      fromLabel: "起价",
      recommendationTitle: "RedFeng 精选活动",
      stickyLabel: "打开活动优惠",
    },
  }[locale]

  const destinations = [
    { title: "Shanghai", price: "IDR 480.000", image: "/home-assets/dest-jakarta.png" },
    { title: "Tokyo", price: "IDR 620.000", image: "/home-assets/dest-tokyo.png" },
    { title: "Singapore", price: "IDR 450.000", image: "/home-assets/dest-singapore.png" },
    { title: "Bangkok", price: "IDR 390.000", image: "/home-assets/dest-bangkok.png" },
    { title: "Bali", price: "IDR 250.000", image: "/home-assets/dest-bali.png" },
    { title: "Labuan Bajo", price: "IDR 520.000", image: "/home-assets/dest-labuanbajo.png" },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8ef_0%,#fffdf9_36%,#f8fafc_72%,#eff5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />
      <main className={`${homeLayoutLock.pageXClass} pb-14 pt-2 md:pt-3`}>
        <section className={`${homeLayoutLock.contentWidthClass} relative overflow-visible ${homeLayoutLock.cardRadiusClass} bg-[#fff7ef] shadow-[0_40px_100px_-54px_rgba(249,115,22,0.34)]`}>
          <div className="relative min-h-[500px] px-4 pb-20 pt-[100px] sm:px-6 sm:pb-24 md:pt-[112px] lg:min-h-[560px] lg:px-8 xl:min-h-[600px]">
            <Image src="/home-assets/background-package-mobile.png" alt="Activities hero" fill priority sizes="100vw" className="object-cover object-center sm:hidden" />
            <Image src="/home-assets/background-package-web.png" alt="Activities hero" fill priority sizes="(max-width: 1440px) 100vw, 1280px" className="hidden object-cover object-center sm:block" />
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
            <ActivitiesHeroSearchBar locale={locale} buttonLabel={copy.searchButton} />
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {copy.benefitTitle.map((title, index) => (
              <article key={title} className="rounded-[24px] border border-white/85 bg-white/78 p-4 shadow-[0_22px_40px_-30px_rgba(15,23,42,0.18)] backdrop-blur sm:rounded-[26px] sm:p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]">
                    {index === 0 ? <path d="M7 6h10a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8a2 2 0 0 1 2-2Z" /> : index === 1 ? <path d="M12 8.5v7M12 10.5h.01M12 13.5h.01" /> : index === 2 ? <path d="M7 12l3 3 7-7" /> : <circle cx="11" cy="11" r="6.5" />}
                    {index === 0 ? <path d="M12 8.5v7" /> : index === 1 ? <path d="M12 13.5h.01" /> : index === 2 ? <rect x="4" y="6" width="16" height="12" rx="2.5" /> : <path d="M16 16l4 4" />}
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.benefitBody[index]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="activity-promo" className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.cardRadiusSmClass} mt-10 rounded-[28px] border border-[#efe2d8] bg-[linear-gradient(180deg,#fff7f3_0%,#fffdfa_100%)] p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.18)] sm:p-6`}>
          <PromoPlacementImpressionBeacon placement="homepage_feed" sourcePath="/aktivitas" promos={promos.map((promo) => ({ id: promo.id, slug: promo.slug }))} />
          <div className="grid gap-5 xl:grid-cols-[300px_repeat(4,minmax(0,1fr))]">
            <article className="rounded-[28px] bg-[linear-gradient(180deg,#fff5f2_0%,#fffaf8_100%)] p-5">
              <h2 className="text-[19px] font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[24px]">{copy.promoTitle}</h2>
              <p className="mt-4 text-[13px] font-medium leading-none text-slate-500">{copy.promoBody}</p>
              <p className="mt-2 text-[17px] font-bold leading-none tracking-[-0.03em] text-[#ef4423] sm:text-[19px]">
                22% <span className="text-[13px] sm:text-[14px]">OFF</span>
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
      </main>
      <div className="mt-16">
        <HomeNewsletterSection locale={locale} redirectPath="/" successMessage={searchParams?.newsletter_success} errorMessage={searchParams?.newsletter_error} />
      </div>
      <HomeFooter locale={locale} />
      <PublicStickyAction locale={locale} href="/promo" label={copy.stickyLabel} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
