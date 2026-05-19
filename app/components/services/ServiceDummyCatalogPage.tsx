import Image from "next/image"
import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
import {
  getServiceAvailabilityLabel,
  getServiceAvailabilityTone,
  servicePageConfigBySlug,
} from "@/app/components/services/serviceCatalog"
import { getCurrentLocale } from "@/lib/locale"
import { getDummyServiceCatalog, type DummyCatalogItem, type DummyServiceSlug } from "@/lib/service-dummy-catalog"

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || ""
}

function filterItems(items: DummyCatalogItem[], keyword: string, region: string, group: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  return items.filter((item) => {
    const matchesKeyword =
      normalizedKeyword.length === 0 ||
      item.title.toLowerCase().includes(normalizedKeyword) ||
      item.location.toLowerCase().includes(normalizedKeyword) ||
      item.highlights.some((highlight) => highlight.toLowerCase().includes(normalizedKeyword))
    const matchesRegion = !region || item.region === region
    const matchesGroup = !group || item.group === group
    return matchesKeyword && matchesRegion && matchesGroup
  })
}

function getHotelStayNights(checkin: string, checkout: string) {
  const start = new Date(`${checkin}T00:00:00`)
  const end = new Date(`${checkout}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}

function filterHotelItems(
  items: DummyCatalogItem[],
  params: {
    keyword: string
    checkin: string
    checkout: string
    adults: string
    children: string
    rooms: string
  },
) {
  const adults = Number(params.adults || "0")
  const children = Number(params.children || "0")
  const rooms = Math.max(1, Number(params.rooms || "1"))
  const guests = adults + children
  const nights = getHotelStayNights(params.checkin, params.checkout)
  const hasStaySignal = Boolean(params.keyword || params.checkin || params.checkout || params.adults || params.children || params.rooms)
  if (!hasStaySignal) return items

  return items.filter((item) => {
    const text = `${item.title} ${item.location} ${item.group} ${item.highlights.join(" ")} ${item.facts.map((fact) => `${fact.label} ${fact.value}`).join(" ")}`.toLowerCase()
    const isCompact = item.id.includes("compact") || item.group.toLowerCase().includes("compact") || text.includes("transit")
    const isBusiness = item.id.includes("business") || item.group.toLowerCase().includes("business") || text.includes("weekday")
    const isFamily = text.includes("family") || text.includes("resort") || text.includes("beach")
    const isUrban = text.includes("urban") || text.includes("city")

    if (guests >= 4 && isCompact) return false
    if (children > 0 && isCompact) return false
    if (rooms >= 2 && isCompact) return false
    if (nights >= 4 && (isCompact || isBusiness)) return false
    if (nights >= 3 && isUrban && children > 0 && !isFamily) return false
    if (guests <= 2 && nights <= 2) return true
    if (children > 0) return isFamily || !isCompact
    if (guests >= 3) return isFamily || isBusiness || isUrban
    if (nights >= 3) return isFamily || isUrban
    return true
  })
}

function formatHotelStaySummary(params: {
  locale: string
  checkin: string
  checkout: string
  adults: string
  children: string
  rooms: string
}) {
  const adults = Number(params.adults || "0")
  const children = Number(params.children || "0")
  const rooms = Number(params.rooms || "0")
  const nights = getNightCount(params.checkin, params.checkout)

  if (params.locale === "en") {
    return [
      params.checkin && params.checkout ? `${params.checkin} to ${params.checkout}` : "",
      adults || children || rooms ? `${adults} adults, ${children} children, ${rooms} rooms` : "",
      nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : "",
    ].filter(Boolean)
  }

  if (params.locale === "zh") {
    return [
      params.checkin && params.checkout ? `${params.checkin} 至 ${params.checkout}` : "",
      adults || children || rooms ? `${adults}位成人，${children}位儿童，${rooms}间房` : "",
      nights > 0 ? `${nights}晚` : "",
    ].filter(Boolean)
  }

  return [
    params.checkin && params.checkout ? `${params.checkin} sampai ${params.checkout}` : "",
    adults || children || rooms ? `${adults} dewasa, ${children} anak, ${rooms} kamar` : "",
    nights > 0 ? `${nights} malam` : "",
  ].filter(Boolean)
}

function getNightCount(checkin: string, checkout: string) {
  return getHotelStayNights(checkin, checkout)
}

export default async function ServiceDummyCatalogPage({
  slug,
  searchParams,
}: {
  slug: DummyServiceSlug
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const locale = await getCurrentLocale()
  const resolvedSearchParams = (await searchParams) || {}
  const service = servicePageConfigBySlug[slug]
  const catalog = getDummyServiceCatalog(slug)

  const keyword = firstQueryValue(resolvedSearchParams.q)
  const selectedRegion = firstQueryValue(resolvedSearchParams.region)
  const selectedGroup = firstQueryValue(resolvedSearchParams.group)
  const hotelCheckin = firstQueryValue(resolvedSearchParams.checkin)
  const hotelCheckout = firstQueryValue(resolvedSearchParams.checkout)
  const hotelAdults = firstQueryValue(resolvedSearchParams.adults)
  const hotelChildren = firstQueryValue(resolvedSearchParams.children)
  const hotelRooms = firstQueryValue(resolvedSearchParams.rooms)
  const baseFilteredItems = filterItems(catalog.items, keyword, selectedRegion, selectedGroup)
  const filteredItems =
    slug === "hotel"
      ? filterHotelItems(baseFilteredItems, {
          keyword,
          checkin: hotelCheckin,
          checkout: hotelCheckout,
          adults: hotelAdults,
          children: hotelChildren,
          rooms: hotelRooms,
        })
      : baseFilteredItems
  const availableRegions = [...new Set(catalog.items.map((item) => item.region))]
  const availableGroups = [...new Set(catalog.items.map((item) => item.group))]
  const catalogUiCopy = locale === "en" ? catalog.uiCopy.en : catalog.uiCopy.id
  const hotelSummaryLines =
    slug === "hotel"
      ? formatHotelStaySummary({
          locale,
          checkin: hotelCheckin,
          checkout: hotelCheckout,
          adults: hotelAdults,
          children: hotelChildren,
          rooms: hotelRooms,
        })
      : []

  const copy = {
    id: {
      eyebrow: `Katalog ${service.shortLabel}`,
      title: `Jelajahi katalog dummy ${service.shortLabel.toLowerCase()} dengan struktur yang siap disambungkan nanti.`,
      body: `Halaman ini sengaja dibuat sebagai katalog dummy, bukan fitur live palsu. Tim bisa memakai fondasi ini untuk menata inventory, filter, dan promosi ${service.shortLabel.toLowerCase()} sebelum checkout customer benar-benar aktif.`,
      searchTitle: `Cari ${catalogUiCopy.searchNoun}`,
      searchBody: `Gunakan kata kunci, region, atau tipe katalog untuk melihat bentuk hasil ${catalogUiCopy.resultNoun} yang nanti bisa dihubungkan ke data live.`,
      searchButton: "Lihat hasil contoh",
      resetButton: "Reset",
      resultTitle: catalogUiCopy.resultTitle,
      resultCount: `${filteredItems.length} ${catalogUiCopy.resultNoun}`,
      dummyBadge: "Katalog dummy",
      emptyTitle: "Belum ada hasil yang cocok",
      emptyBody: "Coba ganti kata kunci atau reset filter untuk melihat contoh katalog lainnya.",
      emptyAction: "Kembali ke semua contoh",
      supportTitle: "Catatan fondasi",
      supportBody: "Data di bawah ini hanya contoh untuk menguji struktur katalog, filter, dan presentasi produk. Belum ada checkout live atau inventory customer langsung.",
      stickySummary: `Cari contoh ${service.shortLabel.toLowerCase()} dengan format katalog baru`,
      stickyLabel: "Buka filter",
      supportCta: "Butuh bantuan?",
      promoCta: "Lihat promo",
      landingCta: `Kembali ke landing ${service.shortLabel.toLowerCase()}`,
      filterRegion: catalogUiCopy.regionLabel,
      filterGroup: catalogUiCopy.groupLabel,
      filterKeyword: catalogUiCopy.keywordLabel,
      rightTitle: "Status fondasi",
      rightBody: service.status,
      chipTarget: "Siap sambung",
      chipStatus: "Dummy inventory",
      highlightsTitle: "Fokus tahap ini",
      locationLabel: catalogUiCopy.locationLabel,
    },
    en: {
      eyebrow: `${service.shortLabel} Catalog`,
      title: `Explore a dummy ${service.shortLabel.toLowerCase()} catalog built for future integration.`,
      body: `This page is intentionally a dummy catalog, not a fake live feature. The team can use it to shape ${service.shortLabel.toLowerCase()} inventory, filters, and promotions before customer checkout is truly enabled.`,
      searchTitle: `Search ${catalogUiCopy.searchNoun}`,
      searchBody: `Use keyword, region, or catalog type to preview how these ${catalogUiCopy.resultNoun} will behave once live data is connected.`,
      searchButton: "View sample results",
      resetButton: "Reset",
      resultTitle: catalogUiCopy.resultTitle,
      resultCount: `${filteredItems.length} ${catalogUiCopy.resultNoun}`,
      dummyBadge: "Dummy catalog",
      emptyTitle: "No matching sample found",
      emptyBody: "Try another keyword or reset filters to see more sample catalog entries.",
      emptyAction: "Back to all samples",
      supportTitle: "Foundation note",
      supportBody: "The entries below are sample inventory only. They exist to validate catalog structure, filters, and product presentation before live checkout is introduced.",
      stickySummary: `Browse sample ${service.shortLabel.toLowerCase()} cards in the new catalog family`,
      stickyLabel: "Open filters",
      supportCta: "Need help?",
      promoCta: "View promos",
      landingCta: `Back to ${service.shortLabel.toLowerCase()} landing`,
      filterRegion: catalogUiCopy.regionLabel,
      filterGroup: catalogUiCopy.groupLabel,
      filterKeyword: catalogUiCopy.keywordLabel,
      rightTitle: "Foundation status",
      rightBody: service.status,
      chipTarget: "Ready to connect",
      chipStatus: "Dummy inventory",
      highlightsTitle: "Current focus",
      locationLabel: catalogUiCopy.locationLabel,
    },
    zh: {
      eyebrow: `${service.shortLabel} 目录`,
      title: `查看为后续接入准备好的 ${service.shortLabel} 示例目录。`,
      body: `这个页面刻意保持为示例目录，而不是伪装成真实下单功能。团队可以先用它整理 ${service.shortLabel} 的目录结构、筛选方式与促销展示。`,
      searchTitle: `搜索 ${service.shortLabel} 示例需求`,
      searchBody: "使用关键词、区域或目录类型，预览后续接入实时数据后的目录形态。",
      searchButton: "查看示例结果",
      resetButton: "重置",
      resultTitle: "示例目录结果",
      resultCount: `${filteredItems.length} 个示例结果`,
      dummyBadge: "示例目录",
      emptyTitle: "没有匹配的示例",
      emptyBody: "请更换关键词或重置筛选，查看其他示例目录。",
      emptyAction: "返回全部示例",
      supportTitle: "基础说明",
      supportBody: "以下内容仅为示例 inventory，用于验证目录结构、筛选体验与产品展示，并不代表已开启实时下单。",
      stickySummary: `浏览新的 ${service.shortLabel} 示例目录`,
      stickyLabel: "打开筛选",
      supportCta: "需要帮助？",
      promoCta: "查看促销",
      landingCta: `返回 ${service.shortLabel} 落地页`,
      filterRegion: "区域",
      filterGroup: "目录类型",
      filterKeyword: "关键词",
      rightTitle: "基础状态",
      rightBody: service.status,
      chipTarget: "待接入",
      chipStatus: "示例 inventory",
      highlightsTitle: "当前重点",
      locationLabel: "位置",
    },
  }[locale]

  return (
    <div id="top" className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicInstallPrompt locale={locale} />
      <PublicHeader locale={locale} variant="overlay" />

      <section className={`${homeLayoutLock.pageXClass} pb-5 pt-2 md:pb-6 md:pt-3`}>
        <div className={`${homeLayoutLock.contentWidthClass} ${homeLayoutLock.heroBackdropRadiusClass} overflow-hidden border border-[#f5d5c5] shadow-[0_34px_90px_-52px_rgba(249,115,22,0.42)]`}>
          <div className="relative min-h-[430px] px-5 pb-6 pt-[104px] sm:min-h-[480px] sm:px-6 sm:pb-7 sm:pt-[118px] lg:min-h-[530px] lg:px-8 lg:pb-8 lg:pt-[130px]">
            <Image
              src={catalog.visualTheme.heroMobileImage}
              alt={`${service.shortLabel} dummy catalog hero`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center sm:hidden"
            />
            <Image
              src={catalog.visualTheme.heroDesktopImage}
              alt={`${service.shortLabel} dummy catalog hero`}
              fill
              priority
              sizes="(max-width: 1440px) 100vw, 1280px"
              className="hidden object-cover object-center sm:block"
            />
            <div className={`absolute inset-0 ${catalog.visualTheme.heroOverlayClass}`} />
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
                <div className="mt-5 flex flex-wrap gap-2.5 text-xs">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 font-semibold ${getServiceAvailabilityTone(service.availability)}`}>
                    {getServiceAvailabilityLabel(service.availability, locale)}
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1.5 font-semibold ${catalog.visualTheme.accentBadgeClass}`}>
                    {copy.dummyBadge}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/40 bg-white/74 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br ${service.accent} text-white`}>
                      {service.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.rightTitle}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{service.shortLabel}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{copy.rightBody}</p>
                </div>

                <div className="rounded-[28px] border border-white/40 bg-white/74 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)] backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.highlightsTitle}</p>
                  <div className="mt-4 grid gap-3">
                    {service.highlights.map((item) => (
                      <div key={item} className="rounded-[18px] border border-[#f3e5da] bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} -mt-8 pb-1 lg:-mt-12`}>
        <div id="service-filter" className={homeLayoutLock.contentWidthClass}>
          <form method="get" action={service.catalogHref} className="rounded-[30px] border border-[#f0d8c9] bg-white/96 p-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.22)] backdrop-blur sm:p-5 lg:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.8fr_0.8fr_auto] lg:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.searchTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.searchBody}</p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterKeyword}</span>
                  <input
                    type="text"
                    name="q"
                    defaultValue={keyword}
                    placeholder={catalog.searchPlaceholder}
                    className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterRegion}</span>
                <select
                  name="region"
                  defaultValue={selectedRegion}
                  className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">{copy.filterRegion}</option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">{copy.filterGroup}</span>
                <select
                  name="group"
                  defaultValue={selectedGroup}
                  className="w-full rounded-[22px] border border-[#e8d8cc] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">{copy.filterGroup}</option>
                  {availableGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-[22px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(249,115,22,0.62)] transition hover:bg-orange-600"
                >
                  {copy.searchButton}
                </button>
                <Link
                  href={service.catalogHref}
                  className="inline-flex items-center justify-center rounded-[22px] border border-[#ead8cb] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {copy.resetButton}
                </Link>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className={`${homeLayoutLock.pageXClass} pb-10 pt-6 md:pb-14`}>
        <div className={`${homeLayoutLock.contentWidthClass} grid gap-6 lg:grid-cols-[300px_1fr]`}>
          <aside className="space-y-4">
            <div className={`rounded-[28px] border p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] ${catalog.visualTheme.resultPanelClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.resultTitle}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.resultCount}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{copy.supportBody}</p>
            </div>

            <div className={`rounded-[28px] border p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.14)] ${service.cardTone}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">{copy.supportTitle}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-current/10 bg-white/75 px-4 py-3 text-sm leading-6">
                  {copy.chipTarget}: {service.shortLabel}
                </div>
                <div className="rounded-[18px] border border-current/10 bg-white/75 px-4 py-3 text-sm leading-6">
                  {copy.chipStatus}: {copy.dummyBadge}
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                <Link
                  href={service.href}
                  className="inline-flex items-center justify-center rounded-[18px] border border-current/15 bg-transparent px-4 py-3 text-sm font-semibold transition hover:bg-white/65"
                >
                  {copy.landingCta}
                </Link>
                <Link
                  href={catalog.supportHref}
                  className="inline-flex items-center justify-center rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {copy.supportCta}
                </Link>
                <Link
                  href={catalog.promoHref}
                  className="inline-flex items-center justify-center rounded-[18px] border border-current/15 bg-transparent px-4 py-3 text-sm font-semibold transition hover:bg-white/65"
                >
                  {copy.promoCta}
                </Link>
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {slug === "hotel" && (keyword || hotelSummaryLines.length > 0) ? (
              <div className="rounded-[28px] border border-[#efe3d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f2_100%)] p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.14)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                  {locale === "en" ? "Stay search summary" : locale === "zh" ? "住宿搜索摘要" : "Ringkasan pencarian stay"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {keyword ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {locale === "en" ? "Destination" : locale === "zh" ? "目的地" : "Destinasi"}: {keyword}
                    </span>
                  ) : null}
                  {hotelSummaryLines.map((line) => (
                    <span key={line} className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {filteredItems.length === 0 ? (
              <div className="rounded-[30px] border border-[#f0dfd2] bg-white p-8 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{copy.dummyBadge}</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.emptyTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{copy.emptyBody}</p>
                <Link
                  href={service.catalogHref}
                  className="mt-5 inline-flex rounded-[18px] bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  {copy.emptyAction}
                </Link>
              </div>
            ) : (
              filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-[28px] border border-[#efe3d8] bg-white shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-36px_rgba(15,23,42,0.24)] md:flex-row"
                >
                  <div className="relative h-[180px] w-full shrink-0 sm:h-[210px] md:h-[230px] md:w-[280px]">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 767px) 100vw, 280px"
                      className="object-cover"
                    />
                    <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:text-[11px] ${catalog.visualTheme.accentBadgeClass}`}>
                      {copy.dummyBadge}
                    </div>
                  </div>

                  <div className="flex-1 p-4 sm:p-5 md:p-6">
                    <h2 className="line-clamp-2 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-slate-950 md:text-[28px]">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{copy.locationLabel}</p>
                    <p className="mt-1 text-[12px] text-slate-500 sm:text-sm">{item.location}</p>

                     <div className="mt-4 flex flex-wrap gap-2 text-[10px] sm:text-xs">
                       <span className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">{item.region}</span>
                       <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">{item.group}</span>
                       {item.facts.slice(0, 2).map((fact) => (
                         <span key={`${item.id}-${fact.label}`} className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200">
                           {fact.label}: {fact.value}
                         </span>
                       ))}
                       {item.highlights.slice(0, 2).map((highlight) => (
                         <span key={highlight} className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                           {highlight}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.availabilityNote}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-500">{item.statusNote}</p>
                  </div>

                  <div className="hidden flex-col justify-between border-t border-[#efe3d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f2_100%)] p-4 sm:p-5 md:flex md:w-[268px] md:border-l md:border-t-0 md:p-6">
                    <div className="text-left md:text-right">
                      <p className="text-sm text-slate-500">{copy.rightTitle}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{copy.dummyBadge}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{item.group}</p>
                      <div className="mt-4 space-y-2">
                        {item.facts.map((fact) => (
                          <div key={`${item.id}-side-${fact.label}`} className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm text-slate-600 md:text-right">
                            <span className="font-semibold text-slate-900">{fact.value}</span>
                            <span className="ml-2 text-slate-500">{fact.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 md:mt-6">
                      <Link
                        href={catalog.supportHref}
                        className="block w-full rounded-2xl bg-orange-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600 md:text-base"
                      >
                        {copy.supportCta}
                      </Link>
                      <Link
                        href={catalog.promoHref}
                        className="block text-center text-sm font-semibold text-slate-700 transition hover:text-orange-600"
                      >
                        {copy.promoCta} →
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <PublicStickyAction
        locale={locale}
        href="#service-filter"
        label={copy.stickyLabel}
        summary={copy.stickySummary}
        secondaryHref={catalog.supportHref}
        secondaryLabel={copy.supportCta}
      />
      <PublicMobileNav locale={locale} />
    </div>
  )
}
