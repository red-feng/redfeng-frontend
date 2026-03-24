import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import { formatPackageMoney, resolveLocalizedPackagePricing, resolvePackageTranslation } from "@/lib/package-pricing"

type PackageCardTranslation = {
  language_code?: string | null
  title: string | null
  description: string | null
  currency?: string | null
  price_adult?: number | null
  price_child?: number | null
}

type PackageCardData = {
  slug: string
  title?: string | null
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  departure_date: string | null
  minimal_peserta: number | null
  travel_style: string | null
  duration?: number | null
  price_adult: number | null
  price_child?: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_translations?: PackageCardTranslation[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  } | null
}

export default function PackageCard({ pkg, locale }: { pkg: PackageCardData; locale: Locale }) {
  const t = dictionaries[locale].packageCard
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const fallbackTitleFromSlug = decodeURIComponent(pkg.slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const displayTitle = translation?.title?.trim() || pkg.title?.trim() || fallbackTitleFromSlug || "Untitled package"
  const imageSrc = pkg.cover_image || "/placeholder.png"
  const imageAlt = displayTitle || "Package image"
  const pricing = resolveLocalizedPackagePricing({
    locale,
    defaultLanguage: pkg.default_language,
    publishedLanguages: pkg.published_languages,
    baseCurrency: pkg.currency,
    baseAdultPrice: pkg.price_adult,
    baseChildPrice: pkg.price_child,
    translations: pkg.package_translations,
  })
  const displayPricing = pkg.livePricing || pricing
  const participantLabel = getScheduleQuotaLabel(pkg.travel_style, locale)
  const hasFixedDeparture = isQuotaTravelStyle(pkg.travel_style)
  const departureLabel = locale === "zh" ? "出发日期" : locale === "en" ? "Departure date" : "Tanggal keberangkatan"
  const durationLabel = locale === "zh" ? "时长" : locale === "en" ? "Duration" : "Durasi"
  const childPriceLabel = locale === "zh" ? "儿童价格" : locale === "en" ? "Child price" : "Harga anak"
  const taxNotice = locale === "zh" ? "未含税费" : locale === "en" ? "Taxes excluded" : "Belum termasuk pajak"
  const locationText = [pkg.city, pkg.country].filter(Boolean).join(", ")
  const hasDescription = Boolean(translation?.description?.trim())
  const hasChildPrice = Number(displayPricing.priceChild || 0) > 0
  const dayLabel = locale === "zh" ? "天" : locale === "en" ? "days" : "hari"
  const availableLabel = locale === "zh" ? "可预订" : locale === "en" ? "Available now" : "Tersedia sekarang"

  const infoChips = [
    pkg.travel_style
      ? {
          key: "style",
          className: "bg-orange-50 text-orange-700",
          label: formatTravelStyleLabel(pkg.travel_style, locale),
        }
      : null,
    {
      key: "participants",
      className: "bg-slate-100 text-slate-700",
      label: `${participantLabel}: ${pkg.minimal_peserta || 0}`,
    },
    pkg.duration
      ? {
          key: "duration",
          className: "bg-amber-50 text-amber-700",
          label: `${durationLabel}: ${pkg.duration} ${dayLabel}`,
        }
      : null,
    hasFixedDeparture && pkg.departure_date
      ? {
          key: "departure",
          className: "bg-blue-50 text-blue-700",
          label: `${departureLabel}: ${pkg.departure_date}`,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; className: string; label: string }>

  return (
    <div className="flex overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-28px_rgba(15,23,42,0.4)]">
      <div className="relative h-[220px] w-[280px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm backdrop-blur">
          {availableLabel}
        </div>
      </div>

      <div className="flex-1 p-6">
        <h2 className="mb-2 text-[28px] font-semibold leading-tight text-slate-950">{displayTitle}</h2>

        {locationText && <p className="mb-4 text-sm text-slate-500">{t.location}: {locationText}</p>}

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {infoChips.map((chip) => (
            <span key={chip.key} className={`rounded-full px-3 py-1.5 font-medium ${chip.className}`}>
              {chip.label}
            </span>
          ))}
        </div>

        {hasDescription && <p className="line-clamp-3 text-sm leading-7 text-slate-600">{translation?.description}</p>}
      </div>

      <div className="flex w-[260px] flex-col justify-between border-l border-slate-200 bg-slate-50/70 p-6">
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">{formatPackageMoney(displayPricing.priceAdult, displayPricing.currency, locale)}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{taxNotice}</div>
          {hasChildPrice && (
            <div className="mt-2 text-sm text-slate-500">
              {childPriceLabel}: {formatPackageMoney(displayPricing.priceChild, displayPricing.currency, locale)}
            </div>
          )}
        </div>

        <Link
          href={`/packages/${encodeURIComponent(pkg.slug)}`}
          className="mt-6 w-full rounded-2xl bg-orange-500 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
        >
          {t.choosePackage}
        </Link>
      </div>
    </div>
  )
}
