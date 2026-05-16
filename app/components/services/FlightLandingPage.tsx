import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import FlightLandingHero from "@/app/components/services/FlightLandingHero"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import type { Locale } from "@/lib/i18n"

type FlightLandingPageProps = {
  locale: Locale
}

export default function FlightLandingPage({ locale }: FlightLandingPageProps) {
  const copy = {
    id: {
      promoEyebrow: "Promo Rute",
      promoTitle: "Promo penerbangan yang terasa satu keluarga dengan feed RedFeng.",
      promoBody:
        "Alih-alih memakai blok promo generik yang terlalu keras, halaman ini menurunkan ritme kartu promo, spacing, dan tone visual dari homepage utama.",
      promoCta: "Lihat semua promo",
      destinationsTitle: "Destinasi populer untuk inspirasi terbang berikutnya",
      destinationsBody: "Pilih rute yang dekat dengan minat customer, lalu sambungkan nanti ke inventory live saat engine flight sudah aktif penuh.",
      partnersTitle: "Maskapai partner yang siap disambungkan berikutnya",
      partnersBody: "Bagian ini sengaja dibuat ringan dan premium, mengikuti section partner di homepage tanpa terasa seperti daftar logo mentah.",
      promiseTitle: "Kenapa gaya ini lebih cocok untuk RedFeng",
      ctaTitle: "Bangun halaman pesawat yang terasa seperti turunan alami dari homepage RedFeng.",
      ctaBody: "Arah ini menjaga konsistensi visual hari ini, sekaligus memudahkan saat search live, hasil rute, dan promo transaksi pesawat mulai disambungkan nanti.",
      primaryCta: "Buka promo RedFeng",
      secondaryCta: "Jelajahi paket wisata",
    },
    en: {
      promoEyebrow: "Route Deals",
      promoTitle: "Flight offers that feel like a natural extension of the RedFeng feed.",
      promoBody:
        "Instead of using a loud generic promo block, this page brings down the card rhythm, spacing, and visual tone from the main homepage.",
      promoCta: "See all promos",
      destinationsTitle: "Popular destinations for your next flight inspiration",
      destinationsBody: "Keep the route inspiration close to customer intent, then connect it later to live inventory once the flight engine is fully active.",
      partnersTitle: "Airline partners ready for the next connection layer",
      partnersBody: "This section stays light and premium, following the homepage partner rhythm instead of feeling like a raw logo strip.",
      promiseTitle: "Why this design direction fits RedFeng better",
      ctaTitle: "Build a flight page that feels like a natural branch of the RedFeng homepage.",
      ctaBody: "This direction keeps the visual system consistent today while making it easier to connect live search, route results, and transaction promos later.",
      primaryCta: "Open RedFeng promos",
      secondaryCta: "Explore tour packages",
    },
    zh: {
      promoEyebrow: "航线优惠",
      promoTitle: "让机票优惠自然延续 RedFeng 首页的信息流气质。",
      promoBody: "这里不再使用过于生硬的通用促销大板块，而是延续首页的卡片节奏、留白与视觉语气。",
      promoCta: "查看全部优惠",
      destinationsTitle: "为下一次飞行准备的人气目的地灵感",
      destinationsBody: "先用目的地灵感承接客户意图，后续再在航班引擎接通后连接 live inventory。",
      partnersTitle: "下一阶段可继续接入的航空伙伴",
      partnersBody: "这一段保持轻盈且更高级，延续首页 partner section 的节奏，而不是生硬的 logo 列表。",
      promiseTitle: "为什么这套方向更适合 RedFeng",
      ctaTitle: "把机票页做成 RedFeng 首页的自然延伸。",
      ctaBody: "这会让今天的视觉系统保持一致，也更方便未来继续接入 live search、航线结果与交易优惠。",
      primaryCta: "打开 RedFeng 优惠",
      secondaryCta: "浏览旅游套餐",
    },
  }[locale]

  const promoCards = [
    {
      title: locale === "en" ? "Jakarta to Singapore" : locale === "zh" ? "雅加达到新加坡" : "Jakarta ke Singapura",
      price: "IDR 1.250.000",
      image: "/home-assets/dest-singapore.png",
      badge: "30%",
    },
    {
      title: locale === "en" ? "Jakarta to Tokyo" : locale === "zh" ? "雅加达到东京" : "Jakarta ke Tokyo",
      price: "IDR 3.850.000",
      image: "/home-assets/dest-tokyo.png",
      badge: "25%",
    },
    {
      title: locale === "en" ? "Jakarta to Bali" : locale === "zh" ? "雅加达到巴厘岛" : "Jakarta ke Bali",
      price: "IDR 950.000",
      image: "/home-assets/dest-bali.png",
      badge: "18%",
    },
  ]

  const destinations = [
    { title: "Bali", price: "IDR 950.000", image: "/home-assets/dest-bali.png" },
    { title: "Bangkok", price: "IDR 1.890.000", image: "/home-assets/dest-bangkok.png" },
    { title: "Singapore", price: "IDR 1.250.000", image: "/home-assets/dest-singapore.png" },
    { title: "Tokyo", price: "IDR 3.850.000", image: "/home-assets/dest-tokyo.png" },
    { title: "Jakarta", price: "IDR 780.000", image: "/home-assets/dest-jakarta.png" },
  ]

  const partnerNames = ["Garuda Indonesia", "AirAsia", "Lion Air", "Batik Air", "Citilink", "Singapore Airlines", "Malaysia Airlines"]
  const promises = [
    {
      title: locale === "en" ? "The search card still leads the story" : locale === "zh" ? "搜索卡片依然是主角" : "Search card tetap jadi pusat cerita",
      body:
        locale === "en"
          ? "The main action stays in the same place as the homepage, so users don't need to relearn the product."
          : locale === "zh"
            ? "核心动作仍放在与首页一致的位置，用户不需要重新学习这个产品。"
            : "Aksi utama tetap berada di tempat yang sama seperti homepage, jadi user tidak perlu belajar ulang produk ini.",
    },
    {
      title: locale === "en" ? "Promo feels editorial, not noisy" : locale === "zh" ? "优惠更像编辑精选，而不是噪音" : "Promo terasa editorial, bukan noisy",
      body:
        locale === "en"
          ? "The card-based promo rhythm feels closer to RedFeng than a single oversized red slab."
          : locale === "zh"
            ? "卡片式优惠节奏更接近 RedFeng，而不是单一巨大红色促销板。"
            : "Ritme promo berbasis kartu terasa lebih dekat dengan RedFeng daripada satu panel merah besar.",
    },
    {
      title: locale === "en" ? "Flight can grow without changing the DNA" : locale === "zh" ? "机票功能以后扩展时也不用改掉 DNA" : "Pesawat bisa tumbuh tanpa ganti DNA",
      body:
        locale === "en"
          ? "When live routes, airline inventory, and transaction promos arrive, the page can grow without becoming a different product family."
          : locale === "zh"
            ? "当 live route、航空 inventory 与交易优惠接入后，页面也能继续成长，而不会变成另一套产品家族。"
            : "Saat live route, inventory maskapai, dan promo transaksi masuk, halamannya bisa tumbuh tanpa berubah jadi keluarga produk yang berbeda.",
    },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_28%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <div className="relative">
        <PublicHeader locale={locale} variant="overlay" />
        <FlightLandingHero locale={locale} />
      </div>

      <main className={`${homeLayoutLock.pageXClass} pb-12 pt-8 md:pb-16`}>
        <div className={`${homeLayoutLock.contentWidthClass} space-y-8`}>
          <section id="promo-rute" className="rounded-[32px] border border-[#f4d9d0] bg-[linear-gradient(135deg,#fff2ec_0%,#fff8f2_38%,#ffffff_100%)] p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.18)] sm:p-7 lg:p-8">
            <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
              <article className="rounded-[28px] bg-[linear-gradient(145deg,#ef3b2d_0%,#ff6a3d_100%)] p-6 text-white shadow-[0_28px_60px_-34px_rgba(239,59,45,0.44)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">{copy.promoEyebrow}</p>
                <h2 className="mt-4 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em]">{copy.promoTitle}</h2>
                <p className="mt-4 text-sm leading-7 text-white/88">{copy.promoBody}</p>
                <Link
                  href="/promo"
                  className="mt-8 inline-flex rounded-[18px] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
                >
                  {copy.promoCta}
                </Link>
              </article>

              <div className="grid gap-4 md:grid-cols-3">
                {promoCards.map((card) => (
                  <article
                    key={card.title}
                    className="overflow-hidden rounded-[28px] border border-[#f2ddd4] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
                  >
                    <div className="relative h-40">
                      <Image src={card.image} alt={card.title} fill className="object-cover" />
                      <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#ef3b2d] shadow-sm">
                        {card.badge}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
                      <p className="mt-3 text-sm text-slate-500">Mulai dari</p>
                      <p className="mt-1 text-[20px] font-semibold text-[#ef3b2d]">{card.price}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#f0ddc7] bg-white/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{copy.destinationsTitle}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{copy.destinationsBody}</p>
              </div>
              <Link href="/promo" className="text-sm font-semibold text-[#ef3b2d] transition hover:text-[#d92f23]">
                {copy.promoCta}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {destinations.map((destination) => (
                <article
                  key={destination.title}
                  className="overflow-hidden rounded-[24px] border border-[#f3e2d0] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                >
                  <div className="relative h-40">
                    <Image src={destination.image} alt={destination.title} fill className="object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{destination.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">Mulai dari</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{destination.price}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-[#f0ddc7] bg-white p-6 shadow-[0_20px_54px_rgba(15,23,42,0.08)] sm:p-7">
            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{copy.partnersTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{copy.partnersBody}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[28px] border border-[#f4e5d7] bg-[linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] p-5">
              <div className="flex h-16 min-w-[160px] items-center justify-center rounded-[22px] bg-white px-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                <Image src="/home-assets/partner-garuda.png" alt="Garuda Indonesia" width={120} height={30} className="h-auto w-[120px]" />
              </div>
              {partnerNames.slice(1).map((partner) => (
                <div
                  key={partner}
                  className="inline-flex min-h-[58px] items-center rounded-[18px] border border-[#f0dfd0] bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                >
                  {partner}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            {promises.map((item, index) => (
              <article
                key={item.title}
                className={`rounded-[28px] border p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ${
                  index === 0
                    ? "border-orange-100 bg-[linear-gradient(180deg,#fff7ef_0%,#ffffff_100%)]"
                    : "border-[#f0ddc7] bg-white"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.promiseTitle}</p>
                <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-[32px] border border-[#f4ddd5] bg-cover bg-center bg-no-repeat p-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.2)] sm:p-7 lg:p-8">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/home-assets/newsletter-bg-generated-china.png')",
                backgroundPosition: "center bottom",
              }}
            />
            <div className="relative grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
              <div>
                <h2 className="text-[30px] font-semibold leading-[1.06] tracking-[-0.04em] text-slate-950">{copy.ctaTitle}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{copy.ctaBody}</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  href="/promo"
                  className="inline-flex items-center justify-center rounded-[18px] bg-[#ef3b2d] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(239,59,45,0.7)] transition hover:opacity-95"
                >
                  {copy.primaryCta}
                </Link>
                <Link
                  href="/packages"
                  className="inline-flex items-center justify-center rounded-[18px] border border-[#efd9ca] bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  {copy.secondaryCta}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
