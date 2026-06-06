import Image from "next/image"
import Link from "next/link"
import PriceLiveClient from "@/app/components/PriceLiveClient"
import { dictionaries, type Locale } from "@/lib/i18n"
import { resolveLocalizedPackagePricing, resolvePackageTranslation } from "@/lib/package-pricing"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"

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
  const departureLabel = locale === "zh" ? "出发日期" : locale === "en" ? "Departure date" : "Tanggal keberangkatan"
  const durationLabel = locale === "zh" ? "时长" : locale === "en" ? "Duration" : "Durasi"
  const childPriceLabel = locale === "zh" ? "儿童价格" : locale === "en" ? "Child price" : "Harga anak"
  const taxNotice = locale === "zh" ? "未含税费" : locale === "en" ? "Taxes excluded" : "Belum termasuk pajak"
  const locationText = [pkg.city, pkg.country].filter(Boolean).join(", ")
  const hasDescription = Boolean(translation?.description?.trim())
  const dayLabel = locale === "zh" ? "天" : locale === "en" ? "days" : "hari"
  const availableLabel = locale === "zh" ? "Bisa dipesan" : locale === "en" ? "Available now" : "Tersedia sekarang"
  const fromLabel = locale === "zh" ? "Mulai dari" : locale === "en" ? "Starting from" : "Mulai dari"

  const infoChips = [
    pkg.travel_style
      ? {
          key: "style",
          tone: "bg-[#fff4ec] text-[#ef5b2a]",
          label: formatTravelStyleLabel(pkg.travel_style, locale),
        }
      : null,
    {
      key: "participants",
      tone: "bg-[#f8fafc] text-slate-600",
      label: `${participantLabel}: ${pkg.minimal_peserta || 0}`,
    },
    pkg.duration
      ? {
          key: "duration",
          tone: "bg-[#f8fafc] text-slate-600",
          label: `${durationLabel}: ${pkg.duration} ${dayLabel}`,
        }
      : null,
    hasFixedDeparture && pkg.departure_date
      ? {
          key: "departure",
          tone: "bg-[#f8fafc] text-slate-600",
          label: `${departureLabel}: ${pkg.departure_date}`,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; tone: string; label: string }>

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#eef1f6] bg-white shadow-[0_20px_44px_-36px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.22)]">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="p-5 xl:p-6">
          <div className="grid gap-5 xl:grid-cols-[190px_minmax(0,1fr)] xl:items-start">
            <div className="relative h-[170px] w-full overflow-hidden rounded-[18px] border border-[#eef1f6] xl:h-[190px]">
              <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 1279px) 100vw, 190px" className="object-cover" />
              <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700 shadow-sm backdrop-blur">
                {availableLabel}
              </div>
            </div>

            <div className="min-w-0 xl:flex xl:min-h-[190px] xl:flex-col">
              <h2 className="line-clamp-2 text-[24px] font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950">{displayTitle}</h2>
              {locationText ? <p className="mt-2 text-[13px] text-slate-500">{t.location}: {locationText}</p> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {infoChips.map((chip) => (
                  <span key={chip.key} className={`rounded-[10px] border border-[#eef2f6] px-2.5 py-1.5 text-[11px] font-medium ${chip.tone}`}>
                    {chip.label}
                  </span>
                ))}
              </div>

              {hasDescription ? (
                <p className="mt-4 line-clamp-2 text-[13px] leading-6 text-slate-600 xl:mt-auto">
                  {translation?.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-center border-t border-[#eef1f6] bg-white p-5 xl:border-l xl:border-t-0">
          <p className="text-[12px] text-slate-500">{fromLabel}</p>
          <p className="mt-2">
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
          </p>

          <div className="mt-5">
            <Link
              href={`/packages/${encodeURIComponent(pkg.slug)}`}
              className="block rounded-[12px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] py-2.5 text-center text-[15px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(239,68,35,0.58)] transition hover:brightness-105"
            >
              {t.choosePackage}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
