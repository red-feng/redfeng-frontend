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
  cover_image: string | null
  city: string | null
  country: string | null
  currency: string | null
  departure_date: string | null
  minimal_peserta: number | null
  travel_style: string | null
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
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const t = dictionaries[locale].packageCard
  const imageSrc = pkg.cover_image || "/placeholder.png"
  const imageAlt = translation?.title || "Package image"
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

  return (
    <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition flex overflow-hidden">
      {/* IMAGE */}
      <div className="w-[280px] h-[220px] relative shrink-0">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-full object-cover"
        />

        {/* Promo Badge */}
        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
          {t.specialDeal}
        </div>
      </div>

      {/* DETAIL */}
      <div className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-1">
          {translation?.title}
        </h2>

        <div className="text-sm text-gray-500 mb-2">
          {t.location}: {pkg.city}, {pkg.country}
        </div>

        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
            {formatTravelStyleLabel(pkg.travel_style)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {participantLabel}: {pkg.minimal_peserta || 0}
          </span>
          {hasFixedDeparture && pkg.departure_date && (
            <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
              Tanggal keberangkatan: {pkg.departure_date}
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
            8.4
          </div>
          <span className="text-sm text-gray-600">
            {t.excellent}
          </span>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {translation?.description}
        </p>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="bg-gray-100 px-2 py-1 rounded">
            {t.freeCancellation}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">
            {t.breakfastIncluded}
          </span>
        </div>
      </div>

      {/* PRICE */}
      <div className="w-[240px] border-l bg-gray-50 p-6 flex flex-col justify-between items-end">
        <div className="text-right">
          <div className="text-sm text-gray-500 line-through">
            {formatPackageMoney(displayPricing.priceAdult * 1.2, displayPricing.currency, locale)}
          </div>

          <div className="text-2xl font-bold text-orange-600">
            {formatPackageMoney(displayPricing.priceAdult, displayPricing.currency, locale)}
          </div>

          <div className="text-xs text-gray-500">
            {t.taxesIncluded}
          </div>
        </div>

        <Link
          href={`/packages/${encodeURIComponent(pkg.slug)}`}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-center transition"
        >
          {t.choosePackage}
        </Link>
      </div>
    </div>
  )
}
