import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import PackageCard from "@/app/components/PackageCard"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

type StyleGroup = {
  key: string
  label: string
  description: string
  items: Awaited<ReturnType<typeof getPublicCatalogData>>["packagesResult"]["items"]
}

export default async function PackagesMarketingLanding() {
  const locale = await getCurrentLocale()
  const { packagesResult, searchBarCountries } = await getPublicCatalogData({}, locale)
  const allPackages = packagesResult.items

  const copy = {
    id: {
      eyebrow: "Paket Wisata RedFeng",
      title: "Landing yang menjual inspirasinya, katalog yang menutup booking-nya.",
      body:
        "Halaman ini membantu customer mengenali gaya perjalanan, destinasi, dan pilihan paket terbaik lebih dulu. Saat mereka siap membandingkan detail, filter lengkap tetap tersedia di katalog.",
      primaryCta: "Lihat katalog lengkap",
      secondaryCta: "Mulai jelajah paket",
      statsPackages: "paket aktif",
      statsCountries: "negara tujuan",
      statsStyles: "gaya perjalanan",
      featuredEyebrow: "Pilihan unggulan",
      featuredTitle: "Paket yang layak dipasang di baris depan.",
      featuredBody: "Kurasi ini tetap bersumber dari katalog aktif, jadi tim tidak perlu mengelola dua daftar produk yang terpisah.",
      stylesEyebrow: "Belanja berdasarkan gaya",
      stylesTitle: "Customer bisa masuk dari tipe perjalanan yang mereka cari.",
      stylesBody: "Alih-alih langsung tenggelam di filter, landing ini membantu orang memahami bentuk perjalanan yang paling cocok untuk rencana mereka.",
      destinationsEyebrow: "Destinasi populer",
      destinationsTitle: "Negara tujuan yang paling ramai di katalog.",
      destinationsBody: "Blok ini mengambil ringkasan dari sebaran paket aktif, lalu mengarahkan user ke katalog dengan konteks yang lebih spesifik.",
      trustEyebrow: "Kenapa format ini lebih kuat",
      trustTitle: "Pemisahan antara discovery dan compare memberi alur yang lebih bersih.",
      trustItems: [
        "Landing membantu menjual value, bukan langsung menumpuk filter.",
        "Katalog tetap fokus untuk browsing, compare, dan pindah ke detail paket.",
        "Semua blok landing tetap hidup dari data katalog yang sama.",
      ],
      browseAll: "Buka katalog penuh",
      exploreCountry: "Lihat paket ke",
      searchLabel: "Cari via katalog",
    },
    en: {
      eyebrow: "RedFeng Tour Packages",
      title: "A landing page that sells the story, with a catalog that closes the booking.",
      body:
        "This page helps travelers understand destination themes, travel styles, and standout package options first. Once they are ready to compare details, the full catalog flow is still one click away.",
      primaryCta: "View full catalog",
      secondaryCta: "Start exploring packages",
      statsPackages: "active packages",
      statsCountries: "destination countries",
      statsStyles: "travel styles",
      featuredEyebrow: "Featured picks",
      featuredTitle: "Packages worth putting on the front row.",
      featuredBody: "This curation still comes from the live catalog, so the team does not need to maintain a separate product list.",
      stylesEyebrow: "Shop by style",
      stylesTitle: "Travelers can enter through the kind of trip they actually want.",
      stylesBody: "Instead of dropping users straight into filters, this landing page frames the travel style first and lets the catalog handle the comparison layer.",
      destinationsEyebrow: "Popular destinations",
      destinationsTitle: "Destination countries that appear the most in the catalog.",
      destinationsBody: "This block summarizes the current active package spread, then routes visitors into the catalog with more context.",
      trustEyebrow: "Why this works",
      trustTitle: "Separating discovery and comparison creates a cleaner customer flow.",
      trustItems: [
        "The landing page sells value before showing dense filtering.",
        "The catalog stays focused on browsing, comparing, and moving into package detail.",
        "Every landing block still stays connected to the same catalog data.",
      ],
      browseAll: "Open full catalog",
      exploreCountry: "See packages to",
      searchLabel: "Search in catalog",
    },
    zh: {
      eyebrow: "RedFeng 旅游套餐",
      title: "先用营销落地页建立兴趣，再用目录完成比较与预订。",
      body:
        "这个页面先帮助用户理解目的地主题、旅行风格与精选套餐；当他们准备比较细节时，完整目录仍然可以直接进入。",
      primaryCta: "查看完整目录",
      secondaryCta: "开始浏览套餐",
      statsPackages: "在售套餐",
      statsCountries: "目的地国家",
      statsStyles: "旅行风格",
      featuredEyebrow: "精选推荐",
      featuredTitle: "适合放在首页前排的套餐。",
      featuredBody: "这些内容仍然来自实时目录，因此团队不需要维护第二份独立产品清单。",
      stylesEyebrow: "按风格浏览",
      stylesTitle: "让用户先从真正想要的旅行类型进入。",
      stylesBody: "与其一开始就把用户丢进筛选器，不如先讲清楚旅行风格，再由目录承担比较层。",
      destinationsEyebrow: "热门目的地",
      destinationsTitle: "目录中出现最多的国家目的地。",
      destinationsBody: "这个区块根据当前有效套餐分布生成概览，再把用户带入更具体的目录结果。",
      trustEyebrow: "为什么这样更好",
      trustTitle: "把发现和比较分开，会让客户路径更清晰。",
      trustItems: [
        "落地页先讲清价值，而不是直接堆满筛选器。",
        "目录继续专注于浏览、比较和进入套餐详情。",
        "落地页所有内容仍然来自同一个目录数据源。",
      ],
      browseAll: "打开完整目录",
      exploreCountry: "查看前往",
      searchLabel: "在目录中搜索",
    },
  }[locale]

  const featuredPackages = allPackages.slice(0, 3)
  const styleKeys = [...new Set(allPackages.map((pkg) => String(pkg.travel_style || "").trim()).filter(Boolean))].slice(0, 3)
  const styleGroups: StyleGroup[] = styleKeys.map((styleKey) => ({
    key: styleKey,
    label: formatTravelStyleLabel(styleKey, locale),
    description:
      locale === "en"
        ? "Curated from active packages in this travel style."
        : locale === "zh"
          ? "基于该旅行风格下的有效套餐整理。"
          : "Dikurasi dari paket aktif dalam gaya perjalanan ini.",
    items: allPackages.filter((pkg) => pkg.travel_style === styleKey).slice(0, 3),
  }))

  const destinationEntries = Object.entries(
    allPackages.reduce<Record<string, { count: number; sampleSlug: string | null }>>((acc, pkg) => {
      const country = String(pkg.country || "").trim()
      if (!country) return acc
      if (!acc[country]) {
        acc[country] = { count: 0, sampleSlug: pkg.slug || null }
      }
      acc[country].count += 1
      if (!acc[country].sampleSlug && pkg.slug) {
        acc[country].sampleSlug = pkg.slug
      }
      return acc
    }, {}),
  )
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .slice(0, 6)

  const stats = [
    { value: packagesResult.total, label: copy.statsPackages },
    { value: packagesResult.availableCountries.length, label: copy.statsCountries },
    { value: styleKeys.length, label: copy.statsStyles },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf9_28%,#eef5fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} />

      <main className="px-4 pb-10 pt-5 sm:px-6 md:px-8 md:pt-7">
        <section className="mx-auto max-w-[1360px] overflow-hidden rounded-[36px] border border-[#f2d6c6] bg-[radial-gradient(circle_at_top_left,rgba(255,217,193,0.55),transparent_28%),linear-gradient(135deg,#fff8ee_0%,#fffefb_44%,#f1f7ff_100%)] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.35)]">
          <div className="grid gap-8 px-5 py-8 sm:px-7 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:px-10 lg:py-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#ef4423]">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-[34px] font-semibold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-[42px] lg:text-[60px]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-8 text-slate-700 sm:text-base">
                {copy.body}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/packages/catalog"
                  className="inline-flex items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#fb923c_0%,#f97316_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.5)] transition hover:-translate-y-0.5"
                >
                  {copy.primaryCta}
                </Link>
                <a
                  href="#package-discovery"
                  className="inline-flex items-center justify-center rounded-[22px] border border-orange-200 bg-white/85 px-5 py-3 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
                >
                  {copy.secondaryCta}
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur">
                    <p className="text-[28px] font-semibold tracking-tight text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-white/35 p-3 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.28)] backdrop-blur">
              <div className="rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,248,242,0.88)_100%)] p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{copy.searchLabel}</p>
                </div>
                <SearchBar
                  locale={locale}
                  countries={searchBarCountries}
                  destinationPath="/packages/catalog"
                  submitLabel={copy.primaryCta}
                  variant="catalog"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="package-discovery" className="mx-auto mt-10 max-w-[1360px]">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.featuredEyebrow}</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[34px]">{copy.featuredTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{copy.featuredBody}</p>
            </div>
            <Link href="/packages/catalog" className="hidden text-sm font-semibold text-orange-600 transition hover:text-orange-700 md:inline-flex">
              {copy.browseAll}
            </Link>
          </div>

          <div className="mt-6 grid gap-5">
            {featuredPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-[1360px]">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.stylesEyebrow}</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[34px]">{copy.stylesTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{copy.stylesBody}</p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            {styleGroups.map((group) => (
              <article key={group.key} className="rounded-[30px] border border-[#eadfd6] bg-white/90 p-5 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.24)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{group.label}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{group.description}</p>
                  </div>
                  <Link
                    href={`/packages/catalog?style=${encodeURIComponent(group.key)}`}
                    className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
                  >
                    {copy.browseAll}
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {group.items.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/packages/${encodeURIComponent(pkg.slug)}`}
                      className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 p-3 transition hover:border-orange-200 hover:bg-orange-50/60"
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-[18px] bg-slate-200">
                        {pkg.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pkg.cover_image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{pkg.package_translations?.[0]?.title || pkg.slug}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{[pkg.city, pkg.country].filter(Boolean).join(", ") || "-"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-[1360px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_420px]">
            <div className="rounded-[32px] border border-[#eadfd6] bg-white/90 p-6 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.destinationsEyebrow}</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[34px]">{copy.destinationsTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{copy.destinationsBody}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {destinationEntries.map(([country, meta]) => (
                  <Link
                    key={country}
                    href={`/packages/catalog?country=${encodeURIComponent(country)}`}
                    className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)] p-4 transition hover:-translate-y-0.5 hover:border-orange-200"
                  >
                    <p className="text-lg font-semibold text-slate-900">{country}</p>
                    <p className="mt-1 text-sm text-slate-500">{meta.count} {copy.statsPackages}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">{copy.exploreCountry} {country}</p>
                  </Link>
                ))}
              </div>
            </div>

            <aside className="rounded-[32px] border border-[#eadfd6] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] p-6 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.trustEyebrow}</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{copy.trustTitle}</h2>
              <div className="mt-6 space-y-3">
                {copy.trustItems.map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/packages/catalog"
                className="mt-6 inline-flex w-full items-center justify-center rounded-[22px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {copy.primaryCta}
              </Link>
            </aside>
          </div>
        </section>
      </main>

      <PublicStickyAction locale={locale} href="/packages/catalog" label={copy.primaryCta} summary={copy.title} />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
