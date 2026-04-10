import Image from "next/image"
import Link from "next/link"
import PackageCard from "@/app/components/PackageCard"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import SearchBar from "@/app/components/SearchBar"
import { getCurrentLocale } from "@/lib/locale"
import { getFeaturedHomePackages } from "@/lib/home-packages"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const [{ packagesResult, searchBarCountries, searchParamsKey }, featuredPackages] = await Promise.all([
    getPublicCatalogData(resolvedSearchParams, locale),
    getFeaturedHomePackages(locale),
  ])
  const heroCopy = {
    id: {
      eyebrow: "Red Feng Mobile Tour",
      title: "Homepage dibuat ringan, katalog paket punya layar sendiri yang lebih fokus.",
      body: "Pengunjung mulai dari beranda yang cepat dan nyaman di mobile, lalu masuk ke katalog paket untuk cari, filter, bandingkan, dan lanjut checkout tanpa campur dengan konten landing page.",
      primaryCta: "Buka katalog paket",
      secondaryCta: "Lihat paket unggulan",
      badgeOne: `${packagesResult.total}+ paket aktif`,
      badgeTwo: "Mobile-first flow",
      badgeThree: "Siap jadi aplikasi",
      sectionTitle: "Paket unggulan untuk pembuka yang lebih ringkas",
      sectionBody: "Homepage tetap fokus untuk branding dan orientasi user. Paket unggulan tetap ditampilkan secukupnya agar pengguna cepat paham tanpa merasa penuh.",
      browseTitle: "Lanjut ke katalog yang lebih lengkap",
      browseBody: "Di halaman paket, user bisa memakai search, filter harga, fasilitas, dan melihat lebih banyak opsi dengan pengalaman yang lebih cocok untuk aplikasi mobile.",
      browseCta: "Ke halaman paket",
    },
    en: {
      eyebrow: "Red Feng Mobile Tour",
      title: "Keep the homepage light, and give the package catalog its own focused screen.",
      body: "Visitors start from a faster mobile landing page, then move into a dedicated catalog flow to search, filter, compare, and continue to checkout without mixing everything into the homepage.",
      primaryCta: "Open package catalog",
      secondaryCta: "View featured packages",
      badgeOne: `${packagesResult.total}+ active packages`,
      badgeTwo: "Mobile-first flow",
      badgeThree: "App-ready structure",
      sectionTitle: "Featured packages for a cleaner first impression",
      sectionBody: "The homepage stays focused on branding and orientation. Featured packages still appear in a compact way so users understand the offer without overload.",
      browseTitle: "Move into the full catalog experience",
      browseBody: "On the packages page, users can search, filter by price and facilities, and browse more options in a flow that feels more natural for a mobile app.",
      browseCta: "Go to packages",
    },
    zh: {
      eyebrow: "Red Feng Mobile Tour",
      title: "首页保持轻量，套餐目录使用独立页面更聚焦。",
      body: "用户先从移动端更轻快的首页进入，再进入独立的套餐目录页面进行搜索、筛选、比较并继续下单，不会把所有内容混在首页里。",
      primaryCta: "打开套餐目录",
      secondaryCta: "查看精选套餐",
      badgeOne: `${packagesResult.total}+ 在售套餐`,
      badgeTwo: "移动端优先",
      badgeThree: "适合做 App",
      sectionTitle: "精选套餐，首屏更清爽",
      sectionBody: "首页继续专注品牌与用户引导。精选套餐只展示必要内容，让用户更快理解产品而不会感到拥挤。",
      browseTitle: "进入完整套餐目录体验",
      browseBody: "在套餐页面中，用户可以搜索、按价格和设施筛选，并查看更多选择，这样的流程也更适合移动应用。",
      browseCta: "前往套餐页",
    },
  }[locale]

  const mobileCopy = {
    id: {
      searchPlaceholder: "Cari tour, hotel, atau pengalaman seru",
      quickPillOne: "Promo keluarga",
      quickPillTwo: "Tour Hong Kong",
      quickPillThree: "Siap berangkat",
      menuTitle: "Layanan populer",
      promoTitle: "Promo untukmu",
      promoSubtitle: "Pilihan singkat yang cepat dibuka dari beranda mobile.",
      moreLabel: "Lihat semuanya",
      featureTitle: "Paket unggulan RedFeng",
      featureBody: "Jelajahi paket yang paling sering dipilih untuk liburan singkat, keluarga, dan perjalanan internasional.",
      bottomCta: "Selengkapnya",
    },
    en: {
      searchPlaceholder: "Search tours, hotels, or memorable experiences",
      quickPillOne: "Family deals",
      quickPillTwo: "Hong Kong tours",
      quickPillThree: "Ready to go",
      menuTitle: "Popular services",
      promoTitle: "Promos for you",
      promoSubtitle: "Fast picks designed for the mobile home experience.",
      moreLabel: "See all",
      featureTitle: "Featured RedFeng packages",
      featureBody: "Browse the trips most often chosen for quick getaways, families, and international travel.",
      bottomCta: "See more",
    },
    zh: {
      searchPlaceholder: "搜索旅游、酒店或精彩体验",
      quickPillOne: "家庭优惠",
      quickPillTwo: "香港旅游",
      quickPillThree: "随时出发",
      menuTitle: "热门服务",
      promoTitle: "为你推荐",
      promoSubtitle: "为移动端首页准备的快捷精选内容。",
      moreLabel: "查看全部",
      featureTitle: "RedFeng 精选套餐",
      featureBody: "浏览最受欢迎的短途、家庭和国际旅行套餐。",
      bottomCta: "查看更多",
    },
  }[locale]

  const mobileMenuItems = [
    {
      href: "https://redfeng.co/pesawat/",
      label: locale === "en" ? "Flights" : locale === "zh" ? "机票" : "Tiket Pesawat",
      iconBg: "bg-[#fff4ec]",
      iconFg: "text-[#ef5b2a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M3 13.5l7-1.7 6.8-7.2 2.2 2.2-5.6 8 4.6 3.1-1.8 1.8-5.8-2-2.2 2.7H5.6l1.9-4.6-4.5-2.2Z" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/hotel/",
      label: locale === "en" ? "Hotel" : locale === "zh" ? "酒店" : "Hotel",
      iconBg: "bg-[#eef5ff]",
      iconFg: "text-[#3b82f6]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M5 20V7.5A1.5 1.5 0 0 1 6.5 6H18v14" />
          <path d="M3 20h18M8 9h2M8 12h2M8 15h2M13 9h2M13 12h2M13 15h2" />
        </svg>
      ),
    },
    {
      href: "/packages",
      label: locale === "en" ? "Tour" : locale === "zh" ? "旅游" : "Tour",
      iconBg: "bg-[#fff0f4]",
      iconFg: "text-[#f43f5e]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 18c4.4-4.8 8.7-7.4 16-10-1 6.9-4.2 10.7-9.6 12.2" />
          <path d="M4 18h6M4 18v-6" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/kereta_api/",
      label: locale === "en" ? "Train" : locale === "zh" ? "火车" : "Kereta",
      iconBg: "bg-[#fff7df]",
      iconFg: "text-[#f59e0b]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <rect x="6" y="4" width="12" height="12" rx="3" />
          <path d="M8 18h8M9 9h2M13 9h2M8 13h8M9 18l-2 2M15 18l2 2" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/bus-travel/",
      label: locale === "en" ? "Bus" : locale === "zh" ? "巴士" : "Bus Travel",
      iconBg: "bg-[#edfdf1]",
      iconFg: "text-[#22c55e]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 4h10a2 2 0 0 1 2 2v7.5A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5V6a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8M7.5 17 7 20M17 20l-.5-3M8.5 13h.01M15.5 13h.01" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/kapal_pesiar/",
      label: locale === "en" ? "Cruise" : locale === "zh" ? "邮轮" : "Cruises",
      iconBg: "bg-[#eefaff]",
      iconFg: "text-[#06b6d4]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 16h16l-2 3H6l-2-3Zm5-8h6l1 8H8l1-8Zm1-3h4v3h-4V5Z" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/pesawat/",
      label: locale === "en" ? "Flight+Hotel" : locale === "zh" ? "机票+酒店" : "Pesawat + Hotel",
      iconBg: "bg-[#f7efff]",
      iconFg: "text-[#8b5cf6]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 8h7v7H4zM13 8h7v4h-7zM13 14h7v1.5A1.5 1.5 0 0 1 18.5 17H13zM7.5 4v8M4 7.5h7" />
        </svg>
      ),
    },
    {
      href: "https://redfeng.co/kapal_laut/",
      label: locale === "en" ? "Sea Trip" : locale === "zh" ? "海运" : "Kapal Laut",
      iconBg: "bg-[#fff3f0]",
      iconFg: "text-[#dc2626]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M5 15h14l-2 3H7l-2-3Zm4-6h6l1 6H8l1-6Z" />
          <path d="M3 19c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0 2 .8 3 0" />
        </svg>
      ),
    },
  ]

  const mobileFeatured = featuredPackages.slice(0, 5)
  const mobileHeroPackage = mobileFeatured[0] ?? null
  const mobilePromoPackages = mobileFeatured.slice(1, 5)
  const mobileCarouselPackages = mobileFeatured.slice(0, 4)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ef_0%,#fffdfb_28%,#f6f7fb_100%)]">
      <PublicInstallPrompt locale={locale} />
      <div className="hidden md:block">
        <PublicHeader locale={locale} redirectSuperadminFromHome />
      </div>

      <main className="pb-36 md:pb-14">
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#b52a17_0%,#dd5a1d_45%,#f58a1f_100%)] px-4 pb-8 pt-5 text-white md:hidden">
          <div className="pointer-events-none absolute inset-x-[-15%] top-[-120px] h-[240px] rounded-full bg-white/14 blur-3xl" />
          <div className="pointer-events-none absolute right-[-50px] top-[120px] h-40 w-40 rounded-full bg-[#ffd7a0]/20 blur-3xl" />
          <div className="mx-auto max-w-md">
            <div className="rounded-[22px] bg-white/96 px-4 py-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)]">
              <Link href="/packages" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4ec] text-[#ef5b2a]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2]">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M16 16l4 4" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-500">{mobileCopy.searchPlaceholder}</span>
              </Link>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[mobileCopy.quickPillOne, mobileCopy.quickPillTwo, mobileCopy.quickPillThree].map((item, index) => (
                <Link
                  key={item}
                  href={index === 1 ? "/packages?country=Hong Kong" : "/packages"}
                  className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold shadow-sm ${
                    index === 0 ? "bg-white/18 text-white" : "bg-slate-950/18 text-orange-50"
                  }`}
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-5 rounded-[30px] bg-white px-4 pb-5 pt-4 text-slate-900 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.45)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ef5b2a]">Red Feng</p>
                  <h2 className="mt-1 text-base font-semibold">{mobileCopy.menuTitle}</h2>
                </div>
                <Link href="/packages" className="text-[11px] font-semibold text-[#ef5b2a]">
                  {mobileCopy.moreLabel}
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {mobileMenuItems.map((item, index) => (
                  <Link key={item.label} href={item.href} className="group flex flex-col items-center text-center">
                    <span
                      className={`relative flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-black/5 transition duration-200 group-active:scale-95 ${item.iconBg} ${item.iconFg}`}
                    >
                      <span className="absolute inset-1 rounded-full bg-white/55" />
                      <span className="relative z-10">{item.icon}</span>
                      {index < 3 ? (
                        <span className="absolute -right-0.5 -top-0.5 z-20 h-4 min-w-4 rounded-full bg-[#ef4444] px-1 text-[9px] font-bold leading-4 text-white shadow-sm">
                          {index + 1}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className={`h-1.5 rounded-full ${dot === 0 ? "w-5 bg-[#ef5b2a]" : "w-1.5 bg-slate-300"}`} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 pt-5 sm:px-6 md:px-8 md:pb-8 md:pt-7 hidden md:block">
          <div className="mx-auto max-w-[1360px] overflow-hidden rounded-[30px] border border-orange-100/80 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#ffd3a1_100%)] px-5 py-6 text-white shadow-[0_34px_90px_-40px_rgba(194,65,12,0.5)] sm:rounded-[34px] sm:px-7 sm:py-8 lg:px-10 lg:py-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-50">
                  {heroCopy.eyebrow}
                </span>
                <h1 className="mt-4 max-w-3xl text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[38px] lg:text-[54px]">
                  {heroCopy.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/90 sm:text-base">
                  {heroCopy.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link
                    href="/packages"
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_34px_-20px_rgba(255,255,255,0.9)] transition hover:bg-orange-50"
                  >
                    {heroCopy.primaryCta}
                  </Link>
                  <a
                    href="#featured-packages"
                    className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {heroCopy.secondaryCta}
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[heroCopy.badgeOne, heroCopy.badgeTwo, heroCopy.badgeThree].map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/18 bg-white/10 p-4 backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/80">Red Feng</p>
                    <p className="mt-3 text-base font-semibold text-white sm:text-lg">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="hidden md:block">
          <SearchBar
            key={`search:${locale}:${searchParamsKey}`}
            locale={locale}
            countries={searchBarCountries}
            destinationPath="/packages"
            submitLabel={heroCopy.primaryCta}
          />
        </div>

        <section className="px-4 py-5 md:hidden">
          <div className="mx-auto max-w-md">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ef5b2a]">Promo</p>
                <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-slate-950">{mobileCopy.promoTitle}</h2>
                <p className="mt-2 max-w-[18rem] text-[13px] leading-6 text-slate-500">{mobileCopy.promoSubtitle}</p>
              </div>
              <Link href="/packages" className="rounded-full bg-[#fff0e6] px-3 py-2 text-[11px] font-semibold text-[#ef5b2a]">
                {mobileCopy.moreLabel}
              </Link>
            </div>

            <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3">
                {mobileCarouselPackages.map((pkg, index) => {
                  const title =
                    pkg.package_translations?.find((translation) => translation.language_code === locale)?.title ||
                    pkg.package_translations?.[0]?.title ||
                    pkg.slug

                  return (
                    <Link
                      key={pkg.id}
                      href={`/packages/${encodeURIComponent(pkg.slug)}`}
                      className={`relative shrink-0 snap-start overflow-hidden bg-slate-200 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.35)] ${
                        index === 0 ? "min-h-[320px] w-[68%] rounded-[30px]" : "min-h-[320px] w-[52%] rounded-[26px]"
                      }`}
                    >
                      <Image
                        src={pkg.cover_image || "/placeholder.png"}
                        alt={title}
                        fill
                        sizes="(max-width: 767px) 68vw, 320px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                            index === 0 ? "bg-[#32d0d5] text-slate-950" : "bg-white/88 text-[#ef5b2a]"
                          }`}
                        >
                          {index === 0 ? "RedFeng Pick" : index === 1 ? "Hot" : index === 2 ? "New" : "Deal"}
                        </span>
                        <span className="rounded-full bg-slate-950/35 px-2 py-1 text-[10px] font-semibold text-white">
                          {index === 0 ? "Top" : `${index + 1}/4`}
                        </span>
                      </div>
                      <div className="absolute inset-x-3 bottom-3">
                        {index === 0 ? (
                          <div className="rounded-[22px] bg-[#1dc2d7]/92 px-3 py-3 text-white shadow-[0_18px_40px_-26px_rgba(34,211,238,0.8)]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-50">{mobileCopy.featureTitle}</p>
                            <p className="mt-2 line-clamp-2 text-xl font-bold leading-6">{title}</p>
                          </div>
                        ) : (
                          <div className="rounded-[20px] bg-white/14 px-3 py-3 backdrop-blur-[3px]">
                            <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-white">{title}</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              {mobileCarouselPackages.map((pkg, index) => (
                <span key={pkg.id} className={`h-1.5 rounded-full ${index === 0 ? "w-6 bg-[#ef5b2a]" : "w-1.5 bg-slate-300"}`} />
              ))}
            </div>

            {mobileHeroPackage ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {mobilePromoPackages.map((pkg, index) => (
                  <Link
                    key={pkg.id}
                    href={`/packages/${encodeURIComponent(pkg.slug)}`}
                    className="relative min-h-[148px] overflow-hidden rounded-[24px] bg-slate-200 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.3)]"
                  >
                    <Image
                      src={pkg.cover_image || "/placeholder.png"}
                      alt={pkg.package_translations?.[0]?.title || pkg.slug}
                      fill
                      sizes="(max-width: 767px) 48vw, 220px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/22 to-transparent" />
                    <div className="absolute right-3 top-3 rounded-full bg-[#ffd7bb] px-2 py-1 text-[10px] font-semibold text-[#b63a15]">
                      {index === 0 ? "-18%" : index === 1 ? "Flash" : "Weekend"}
                    </div>
                    <div className="absolute inset-x-3 bottom-3">
                      <p className="line-clamp-2 text-[14px] font-semibold leading-5 text-white">
                        {pkg.package_translations?.find((translation) => translation.language_code === locale)?.title ||
                          pkg.package_translations?.[0]?.title ||
                          pkg.slug}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-5 rounded-[28px] border border-[#ffd7bb] bg-white px-4 py-4 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ef5b2a]">Featured</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{mobileCopy.featureTitle}</h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-600">{mobileCopy.featureBody}</p>
              <Link
                href="/packages"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#ef5b2a_0%,#f59e0b_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-22px_rgba(239,91,42,0.7)]"
              >
                {mobileCopy.bottomCta}
              </Link>
            </div>
          </div>
        </section>

        <section id="featured-packages" className="hidden px-4 py-6 sm:px-6 md:block md:px-8 md:py-8">
          <div className="mx-auto max-w-[1360px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Featured</p>
                <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[32px]">
                  {heroCopy.sectionTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {heroCopy.sectionBody}
                </p>
              </div>
              <Link
                href="/packages"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 sm:w-auto"
              >
                {heroCopy.browseCta}
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:gap-6">
              {featuredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.22)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Catalog</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{heroCopy.browseTitle}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {heroCopy.browseBody}
              </p>
              <Link
                href="/packages"
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
              >
                {heroCopy.browseCta}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <div className="hidden md:block">
        <PublicStickyAction locale={locale} href="/packages" label={heroCopy.primaryCta} summary={heroCopy.browseBody} />
      </div>
      <PublicMobileNav locale={locale} />
    </div>
  )
}
