"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { type Locale } from "@/lib/i18n"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { formatTravelStyleLabel, getScheduleQuotaLabel } from "@/lib/travelStyles"

type RecommendationPackage = {
  id: string
  slug: string
  cover_image?: string | null
  city?: string | null
  country?: string | null
  destination_country_id?: string | null
  destination_province?: string | null
  departure_date: string | null
  minimal_peserta: number | null
  travel_style: string | null
  currency: string | null
  price_adult: number | null
  price_child?: number | null
  default_language?: string | null
  published_languages?: string[] | null
  package_facilities?: {
    facility_id: string
    facilities: { name: string } | { name: string }[] | null
  }[] | null
  package_translations?: {
    language_code?: string | null
    title: string | null
    description: string | null
    currency?: string | null
    price_adult?: number | null
    price_child?: number | null
  }[] | null
  livePricing?: {
    currency: string
    priceAdult: number
    priceChild: number
  }
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M12 21s-6-5.1-6-10.4A6 6 0 1 1 18 10.6C18 15.9 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </svg>
  )
}

function FacilityIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M8.5 12h7M12 8.5v7" />
    </svg>
  )
}

function getFacilityName(relation: RecommendationPackage["package_facilities"]) {
  return (relation || [])
    .map((item) => {
      if (Array.isArray(item.facilities)) return item.facilities[0]?.name || ""
      return item.facilities?.name || ""
    })
    .map((value) => value.trim())
    .filter(Boolean)
}

function getPackageTitle(pkg: RecommendationPackage, locale: Locale) {
  const translation = resolvePackageTranslation(pkg.package_translations, locale, pkg.default_language, pkg.published_languages)
  const fallbackTitle = decodeURIComponent(pkg.slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return translation?.title?.trim() || fallbackTitle || "Untitled package"
}

function getItemsPerPage(width: number) {
  if (width >= 1280) return 4
  if (width >= 640) return 2
  return 1
}

function RecommendationCard({
  pkg,
  locale,
  availableLabel,
  fromLabel,
  actionLabel,
}: {
  pkg: RecommendationPackage
  locale: Locale
  availableLabel: string
  fromLabel: string
  actionLabel: string
}) {
  const title = getPackageTitle(pkg, locale)
  const pricing = pkg.livePricing || {
    currency: pkg.currency || "IDR",
    priceAdult: Number(pkg.price_adult || 0),
    priceChild: Number(pkg.price_child || 0),
  }
  const participantLabel = getScheduleQuotaLabel(pkg.travel_style, locale)
  const facilityNames = getFacilityName(pkg.package_facilities).slice(0, 3)

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[30px] border border-[#e9e3db] bg-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-34px_rgba(15,23,42,0.22)]">
      <div className="relative h-[220px] w-full overflow-hidden">
        {pkg.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pkg.cover_image} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Image
            src="/home-assets/card-package.png"
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.08)_48%,rgba(15,23,42,0.22)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
            {availableLabel}
          </span>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#ef4423] shadow-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6.5c1.3 0 2.5.6 3.3 1.7.8-1.1 2-1.7 3.3-1.7A4.2 4.2 0 0 1 20 10.7C20 15.6 12 20 12 20Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Link
          href={`/packages/${encodeURIComponent(pkg.slug)}`}
          className="line-clamp-2 min-h-[2.7rem] text-[14px] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900 transition hover:text-[#ef4423] md:text-[17px] md:leading-[1.2]"
        >
          {title}
        </Link>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-[1.2] text-slate-500 md:text-[13px]">
          <span className="text-[#ef4423]">
            <MapPinIcon />
          </span>
          {[pkg.city, pkg.country].filter(Boolean).join(", ") || "-"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pkg.travel_style ? (
            <span className="rounded-full bg-[#fff1ea] px-3 py-1.5 text-[10px] font-medium text-[#ef4423]">
              {formatTravelStyleLabel(pkg.travel_style, locale)}
            </span>
          ) : null}
          <span className="rounded-full bg-[#f4f6fb] px-3 py-1.5 text-[10px] font-medium text-slate-700">
            {participantLabel} {pkg.minimal_peserta || 0}
          </span>
          {pkg.departure_date ? (
            <span className="rounded-full bg-[#fff7e8] px-3 py-1.5 text-[10px] font-medium text-amber-700">
              {pkg.departure_date}
            </span>
          ) : null}
        </div>

        {facilityNames.length > 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#f2ebe5] pt-4 text-[10px] text-slate-500 md:text-[11px]">
            {facilityNames.map((facilityName) => (
              <div key={facilityName} className="rounded-[14px] bg-[#faf7f4] px-3 py-2">
                <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <FacilityIcon />
                  <span className="line-clamp-1">{facilityName}</span>
                </p>
                <p className="mt-1">Tersedia</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] leading-none text-slate-400">{fromLabel}</p>
            <p className="mt-1.5 text-[14px] font-bold leading-[1.15] tracking-[-0.02em] text-[#ef4423] md:text-[17px]">
              {formatPackageMoney(pricing.priceAdult, pricing.currency, locale)}
            </p>
            <p className="mt-1 text-[11px] font-medium leading-none text-slate-500">/ orang</p>
          </div>
          <Link
            href={`/packages/${encodeURIComponent(pkg.slug)}`}
            className="inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ff6a3d_0%,#ef4423_100%)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_32px_-18px_rgba(239,68,35,0.7)] transition hover:brightness-105"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function PackagesRecommendationsSection({
  title,
  packages,
  locale,
  availableLabel,
  fromLabel,
  actionLabel,
}: {
  title: string
  packages: RecommendationPackage[]
  locale: Locale
  availableLabel: string
  fromLabel: string
  actionLabel: string
}) {
  const [itemsPerPage, setItemsPerPage] = useState(4)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const updateItemsPerPage = () => setItemsPerPage(getItemsPerPage(window.innerWidth))
    updateItemsPerPage()
    window.addEventListener("resize", updateItemsPerPage)
    return () => window.removeEventListener("resize", updateItemsPerPage)
  }, [])

  const pageCount = Math.max(1, Math.ceil(packages.length / itemsPerPage))
  const safePage = Math.min(page, pageCount - 1)

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  const visiblePackages = packages.slice(safePage * itemsPerPage, safePage * itemsPerPage + itemsPerPage)
  const canGoPrev = safePage > 0
  const canGoNext = safePage < pageCount - 1

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="max-w-[760px] text-[14px] font-semibold leading-[1.32] tracking-normal text-slate-900 lg:text-[15px]">{title}</h2>
        <div className="hidden items-center gap-2 md:flex md:self-start">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={!canGoPrev}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd8] bg-white text-slate-500 shadow-sm transition hover:border-[#efcbbd] hover:text-[#ef4423] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="m14.5 6.5-5 5 5 5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={!canGoNext}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd8] bg-white text-slate-500 shadow-sm transition hover:border-[#efcbbd] hover:text-[#ef4423] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="m9.5 6.5 5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
      <div className={`mt-7 grid gap-5 ${itemsPerPage >= 2 ? "sm:grid-cols-2" : ""} ${itemsPerPage >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {visiblePackages.map((pkg) => (
          <RecommendationCard
            key={pkg.id}
            pkg={pkg}
            locale={locale}
            availableLabel={availableLabel}
            fromLabel={fromLabel}
            actionLabel={actionLabel}
          />
        ))}
      </div>
    </section>
  )
}
