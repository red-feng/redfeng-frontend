import Image from "next/image"
import Link from "next/link"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import { resolveLocalizedPackagePricing, resolvePackageTranslation } from "@/lib/package-pricing"
import PriceLiveClient from "@/app/components/PriceLiveClient"

type PackageCardTranslation = {
  language_code?: string | null
  title: string | null
  description: string | null
  currency?: string | null
  price_adult?: number | null
  price_child?: number | null
}

type PackageCardData = {
  id: string
  slug: string
  title?: string | null
  cover_image?: string | null
  city?: string | null
  country?: string | null
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
  const departureLabel = locale === "zh" ? "\u51fa\u53d1\u65e5\u671f" : locale === "en" ? "Departure date" : "Tanggal keberangkatan"
  const durationLabel = locale === "zh" ? "\u65f6\u957f" : locale === "en" ? "Duration" : "Durasi"
  const childPriceLabel = locale === "zh" ? "\u513f\u7ae5\u4ef7\u683c" : locale === "en" ? "Child price" : "Harga anak"
  const taxNotice = locale === "zh" ? "\u672a\u542b\u7a0e\u8d39" : locale === "en" ? "Taxes excluded" : "Belum termasuk pajak"
  const locationText = [pkg.city, pkg.country].filter(Boolean).join(", ")
  const hasDescription = Boolean(translation?.description?.trim())
  const dayLabel = locale === "zh" ? "\u5929" : locale === "en" ? "days" : "hari"
  const availableLabel = locale === "zh" ? "\u53ef\u9884\u8ba2" : locale === "en" ? "Available now" : "Tersedia sekarang"
  const viewDetailLabel = locale === "zh" ? "\u67e5\u770b\u8be6\u60c5" : locale === "en" ? "View details" : "Lihat detail"
  const fromLabel = locale === "zh" ? "\u8d77\u4ef7" : locale === "en" ? "Starting from" : "Mulai dari"

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
    <div className="flex flex-col overflow-hidden rounded-[28px] border border-[#efe3d8] bg-white shadow-[0_22px_46px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-36px_rgba(15,23,42,0.24)] md:flex-row">
      <div className="relative h-[168px] w-full shrink-0 sm:h-[190px] md:h-[220px] md:w-[280px]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 767px) 100vw, 280px"
          className="object-cover"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:text-[11px] sm:tracking-[0.24em]">
          {availableLabel}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent md:hidden" />
        <div className="absolute bottom-3 left-3 right-3 md:hidden">
          <div className="rounded-[18px] border border-white/20 bg-white/92 px-3 py-2.5 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{viewDetailLabel}</p>
                <p className="mt-1 truncate text-base font-bold text-orange-600">
                  <PriceLiveClient
                    packageId={pkg.id}
                    locale={locale}
                    baseCurrency={pkg.currency}
                    baseAdultPrice={pkg.price_adult}
                    baseChildPrice={pkg.price_child ?? null}
                    initialCurrency={displayPricing.currency}
                    initialAdultPrice={displayPricing.priceAdult}
                    initialChildPrice={displayPricing.priceChild}
                    variant="mobile"
                    childPriceLabel={childPriceLabel}
                  />
                </p>
              </div>
              <Link
                href={`/packages/${encodeURIComponent(pkg.slug)}`}
                className="shrink-0 rounded-full bg-orange-500 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-orange-600"
              >
                {t.choosePackage}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-5 md:p-6">
        <h2 className="mb-2 line-clamp-2 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-slate-950 md:text-[28px]">{displayTitle}</h2>

        {locationText && <p className="mb-3 text-[12px] text-slate-500 sm:mb-4 sm:text-sm">{t.location}: {locationText}</p>}

        <div className="mb-4 flex flex-wrap gap-2 text-[10px] sm:text-xs">
          {infoChips.slice(0, 3).map((chip) => (
            <span key={chip.key} className={`rounded-full px-2.5 py-1.5 font-medium sm:px-3 ${chip.className}`}>
              {chip.label}
            </span>
          ))}
        </div>

        {hasDescription ? (
          <p className="line-clamp-2 text-[12px] leading-6 text-slate-600 sm:line-clamp-3 sm:text-sm sm:leading-7">
            {translation?.description}
          </p>
        ) : null}
      </div>

      <div className="hidden flex-col justify-between border-t border-[#efe3d8] bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f2_100%)] p-4 sm:p-5 md:flex md:w-[268px] md:border-l md:border-t-0 md:p-6">
        <div className="text-left md:text-right">
          <p className="text-sm text-slate-500">{fromLabel}</p>
          <PriceLiveClient
            packageId={pkg.id}
            locale={locale}
            baseCurrency={pkg.currency}
            baseAdultPrice={pkg.price_adult}
            baseChildPrice={pkg.price_child ?? null}
            initialCurrency={displayPricing.currency}
            initialAdultPrice={displayPricing.priceAdult}
            initialChildPrice={displayPricing.priceChild}
            variant="desktop"
            childPriceLabel={childPriceLabel}
            taxNotice={taxNotice}
          />
        </div>

        <div className="mt-4 space-y-3 md:mt-6">
          <Link
            href={`/packages/${encodeURIComponent(pkg.slug)}`}
            className="block w-full rounded-2xl bg-orange-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600 md:text-base"
          >
            {t.choosePackage}
          </Link>
          <Link
            href={`/packages/${encodeURIComponent(pkg.slug)}`}
            className="block text-center text-sm font-semibold text-slate-700 transition hover:text-orange-600"
          >
            {viewDetailLabel} →
          </Link>
        </div>
      </div>
    </div>
  )
}
