import Image from "next/image"
import PackageCatalogInteractiveShell from "@/app/packages/catalog/PackageCatalogInteractiveShell"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import { getCurrentLocale } from "@/lib/locale"
import { getPublicCatalogData } from "@/lib/public-package-catalog"

export const dynamic = "force-dynamic"

export default async function PackagesCatalogRoute({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const locale = await getCurrentLocale()
  const { facilities, initialFilters, localeMaxPrice, packagesResult, searchBarCountries, searchParamsKey } =
    await getPublicCatalogData(resolvedSearchParams, locale)
  const selectedCountry = Array.isArray(resolvedSearchParams.country) ? resolvedSearchParams.country[0] || "" : resolvedSearchParams.country || ""
  const selectedStyle = Array.isArray(resolvedSearchParams.style) ? resolvedSearchParams.style[0] || "" : resolvedSearchParams.style || ""
  const selectedDuration = Array.isArray(resolvedSearchParams.duration) ? resolvedSearchParams.duration[0] || "" : resolvedSearchParams.duration || ""

  const copy = {
    id: {
      eyebrow: "Katalog Paket Tour",
      title: "Jelajahi paket tour dengan layout katalog yang sama seperti pengalaman pesawat.",
      body: "Ringkasan pencarian tampil di atas, filter tetap di kiri, dan kartu hasil memakai source data paket live yang sama dengan detail paket serta checkout.",
      stickySummary: "Ubah pencarian dan bandingkan paket lebih cepat",
      stickyLabel: "Ubah pencarian",
      compareLabel: "Live package catalog",
    },
    en: {
      eyebrow: "Package Tour Catalog",
      title: "Browse package tours with the same catalog rhythm as the flight experience.",
      body: "Search summary stays on top, filters stay on the left, and the result cards keep using the same live package source as package detail and checkout.",
      stickySummary: "Refine your search and compare packages faster",
      stickyLabel: "Refine search",
      compareLabel: "Live package catalog",
    },
    zh: {
      eyebrow: "旅游套餐目录",
      title: "以与航班目录相同的节奏浏览旅游套餐。",
      body: "搜索摘要保留在顶部，筛选保留在左侧，结果卡片继续使用与套餐详情和结账相同的实时套餐数据源。",
      stickySummary: "更快调整搜索并比较套餐",
      stickyLabel: "调整搜索",
      compareLabel: "实时套餐目录",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_22%,#f3f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <section className={`${homeLayoutLock.pageXClass} pb-5 pt-2 md:pb-6 md:pt-3`}>
        <div className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.heroBackdropRadiusClass} overflow-hidden border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]`}>
          <div className="relative min-h-[430px] px-5 pb-6 pt-[104px] sm:min-h-[480px] sm:px-6 sm:pb-7 sm:pt-[118px] lg:min-h-[530px] lg:px-8 lg:pb-8 lg:pt-[130px]">
            <Image
              src="/home-assets/background-hero-tour-package.png"
              alt="RedFeng package catalog hero"
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,239,0.96)_0%,rgba(255,248,241,0.86)_34%,rgba(255,244,235,0.5)_64%,rgba(255,243,236,0.16)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/20 to-transparent" />

            <div className="relative grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="max-w-[700px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ef4423]">{copy.eyebrow}</p>
                <h1 className="mt-4 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[46px] lg:text-[58px]">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-[620px] text-[15px] leading-8 text-slate-700 sm:text-base">
                  {copy.body}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/40 bg-white/74 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)] backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.compareLabel}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{packagesResult.total} paket</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {locale === "en"
                      ? "Packages, filters, and pagination stay connected to the same public catalog source."
                      : locale === "zh"
                        ? "套餐、筛选和分页继续连接到同一个公开目录数据源。"
                        : "Paket, filter, dan pagination tetap terhubung ke source public catalog yang sama."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PackageCatalogInteractiveShell
        facilities={facilities}
        initialFilters={initialFilters}
        locale={locale}
        maxAvailablePrice={localeMaxPrice}
        packages={packagesResult.items}
        searchBarCountries={searchBarCountries}
        searchParamsKey={searchParamsKey}
        stickyLabel={copy.stickyLabel}
        stickySummary={copy.stickySummary}
        totalPackages={packagesResult.total}
        selectedCountry={selectedCountry}
        selectedStyle={selectedStyle}
        selectedDuration={selectedDuration}
      />
    </div>
  )
}
