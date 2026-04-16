import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import PackageTabs from "@/app/packages/[slug]/PackageTabs"
import { getFacilityLabel } from "@/lib/facility-labels"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { parseHighlights } from "@/lib/packages/highlights"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import { createClient } from "@/lib/supabase/server"

type MerchantPackageDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ room_id?: string }>
}

type PackageRow = {
  id: string
  slug: string | null
  title: string | null
  status: string | null
  travel_style: string | null
  departure_date: string | null
  duration: number | null
  minimal_peserta: number | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  default_language: string | null
  published_languages: string[] | null
  cover_image: string | null
  origin_country_id: string | null
  origin_province: string | null
  destination_country_id: string | null
  destination_province: string | null
  created_at: string | null
  updated_at: string | null
}

type PackageTranslationRow = {
  language_code: string | null
  title: string | null
  description: string | null
  about_tour: string | null
  service_standard: string | null
  include: string | null
  exclude: string | null
  preparation: string | null
  terms_conditions: string | null
  meeting_point: string | null
  highlights: string | null
  currency: string | null
  price_adult: number | null
  price_child: number | null
}

type PackageDetailRow = {
  meeting_point: string | null
  map_embed: string | null
}

type PackageImageRow = {
  id: string
  image_url: string
}

type FacilityRelation = {
  name: string
}

type PackageFacilityRow = {
  facility_id: string
  facilities: FacilityRelation | FacilityRelation[] | null
}

type TagRow = {
  id: string
  tag: string
}

type ItineraryRouteRow = {
  id: string
  pickup_time: string | null
  route: string | null
  description: string | null
}

type ItineraryDayRow = {
  id: string
  day_number: number
  day_title: string | null
  package_itinerary_routes: ItineraryRouteRow[]
}

type CountryRow = {
  id: string
  name: string
}

function toSupportedLocale(input: string | null | undefined): Locale | null {
  if (input === "id" || input === "en" || input === "zh") return input
  return null
}

function getFacilityName(relation: PackageFacilityRow["facilities"]): string {
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation?.name || "-"
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const lang = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleDateString(lang, { day: "2-digit", month: "long", year: "numeric" })
}

function getCopy(locale: Locale) {
  if (locale === "en") {
    return {
      title: "Merchant Package Detail",
      subtitle: "Complete operational view for merchant. Separated from customer package page.",
      packageId: "Package ID",
      packageStatus: "Package status",
      duration: "Duration",
      participant: "Minimum participant",
      createdAt: "Created",
      updatedAt: "Last updated",
      route: "Route",
      day: "day",
      people: "people",
      backToList: "Back to package list",
      editPackage: "Edit package",
      openMerchantChat: "Open merchant chat",
      packageNotFound: "Package not found or no longer belongs to this merchant.",
      gallery: "Gallery",
      quickActions: "Quick actions",
    }
  }
  if (locale === "zh") {
    return {
      title: "Merchant Package Detail",
      subtitle: "Complete operational view for merchant. Separated from customer package page.",
      packageId: "Package ID",
      packageStatus: "Package status",
      duration: "Duration",
      participant: "Minimum participant",
      createdAt: "Created",
      updatedAt: "Last updated",
      route: "Route",
      day: "day",
      people: "people",
      backToList: "Back to package list",
      editPackage: "Edit package",
      openMerchantChat: "Open merchant chat",
      packageNotFound: "Package not found or no longer belongs to this merchant.",
      gallery: "Gallery",
      quickActions: "Quick actions",
    }
  }
  return {
    title: "Detail Paket Merchant",
    subtitle: "Tampilan operasional lengkap untuk merchant. Terpisah dari halaman detail paket customer.",
    packageId: "ID Paket",
    packageStatus: "Status paket",
    duration: "Durasi",
    participant: "Minimal peserta",
    createdAt: "Dibuat",
    updatedAt: "Update terakhir",
    route: "Rute",
    day: "hari",
    people: "orang",
    backToList: "Kembali ke daftar paket",
    editPackage: "Edit paket",
    openMerchantChat: "Buka chat merchant",
    packageNotFound: "Paket tidak ditemukan atau bukan milik merchant ini.",
    gallery: "Galeri",
    quickActions: "Aksi cepat",
  }
}

export const dynamic = "force-dynamic"

export default async function MerchantPackageDetailPage({ params, searchParams }: MerchantPackageDetailPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const locale = normalizeLocale(await getCurrentLocale())
  const copy = getCopy(locale)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: merchant } = await supabase.from("merchants").select("id").eq("user_id", user.id).maybeSingle()
  if (!merchant?.id) notFound()

  const { data: pkg } = await supabase
    .from("packages")
    .select(
      "id, slug, title, status, travel_style, departure_date, duration, minimal_peserta, price_adult, price_child, currency, default_language, published_languages, cover_image, origin_country_id, origin_province, destination_country_id, destination_province, created_at, updated_at",
    )
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle<PackageRow>()

  if (!pkg) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{copy.packageNotFound}</div>
      </main>
    )
  }

  const defaultLocale = toSupportedLocale(pkg.default_language) || "id"
  const allowedLocalesRaw = (pkg.published_languages || [])
    .map((lang) => toSupportedLocale(lang))
    .filter((lang): lang is Locale => Boolean(lang))
  const allowedLocales = [...new Set([...allowedLocalesRaw, defaultLocale])]
  const activeLocale = allowedLocales.includes(locale) ? locale : allowedLocales[0] || defaultLocale
  const localeFallbacks = [...new Set([activeLocale, defaultLocale, "id"])]

  const [
    translationResult,
    localizedPricing,
    detailResult,
    galleryResult,
    facilitiesResult,
    tagsResult,
    itineraryDaysResult,
    countriesResult,
  ] = await Promise.all([
    supabase
      .from("package_translations")
      .select(
        "language_code, title, description, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights, currency, price_adult, price_child",
      )
      .eq("package_id", pkg.id)
      .in("language_code", localeFallbacks),
    getLiveLocalizedPackagePricing({
      locale: activeLocale,
      defaultLanguage: pkg.default_language,
      publishedLanguages: pkg.published_languages,
      baseCurrency: pkg.currency,
      baseAdultPrice: pkg.price_adult,
      baseChildPrice: pkg.price_child,
    }),
    supabase.from("package_details").select("meeting_point, map_embed").eq("package_id", pkg.id).maybeSingle<PackageDetailRow>(),
    supabase.from("package_images").select("id, image_url").eq("package_id", pkg.id),
    supabase
      .from("package_facilities")
      .select(
        `
        facility_id,
        facilities ( name )
      `,
      )
      .eq("package_id", pkg.id),
    supabase.from("package_tags").select("id, tag").eq("package_id", pkg.id),
    supabase
      .from("package_itinerary_days")
      .select(
        `
        id,
        day_number,
        day_title,
        package_itinerary_routes (
          id,
          pickup_time,
          route,
          description
        )
      `,
      )
      .eq("package_id", pkg.id)
      .order("day_number", { ascending: true }),
    supabase
      .from("countries")
      .select("id, name")
      .in("id", [pkg.origin_country_id, pkg.destination_country_id].filter(Boolean)),
  ])

  const translations = (translationResult.data || []) as PackageTranslationRow[]
  const translation = resolvePackageTranslation(translations, activeLocale, pkg.default_language, pkg.published_languages)
  const detail = detailResult.data || null
  const galleryImages = (galleryResult.data as PackageImageRow[] | null) || []
  const facilities = (facilitiesResult.data as PackageFacilityRow[] | null) || []
  const tags = (tagsResult.data as TagRow[] | null) || []
  const itineraryDays = (itineraryDaysResult.data as ItineraryDayRow[] | null) || []
  const countries = (countriesResult.data as CountryRow[] | null) || []
  const countryMap = new Map(countries.map((country) => [country.id, country.name]))

  const displayTitle = translation?.title || pkg.title || "Detail Paket"
  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"
  const routeText = `${countryMap.get(pkg.origin_country_id || "") || "-"} - ${pkg.origin_province || "-"} to ${
    countryMap.get(pkg.destination_country_id || "") || "-"
  } - ${pkg.destination_province || "-"}`
  const highlightTags =
    parseHighlights(translation?.highlights).length > 0
      ? parseHighlights(translation?.highlights)
      : tags.map((tag) => tag.tag).slice(0, 6)

  const chatSearch = new URLSearchParams()
  chatSearch.set("package_id", pkg.id)
  chatSearch.set("portal", "merchant")
  if (sp.room_id) chatSearch.set("room_id", sp.room_id)
  const merchantChatHref = `/merchant/chat?${chatSearch.toString()}`

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_48%,#fb923c_100%)] p-6 text-white shadow-[0_22px_60px_-36px_rgba(154,52,18,0.9)] md:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
          <p className="mt-2 text-sm text-orange-50/95">{copy.subtitle}</p>
          <p className="mt-4 text-lg font-semibold">{displayTitle}</p>
          <p className="mt-1 text-sm text-orange-50/95">{routeText}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/merchant/paket" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.backToList}
            </Link>
            <Link href={`/merchant/paket/${encodeURIComponent(pkg.id)}/edit`} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.editPackage}
            </Link>
            <Link href={merchantChatHref} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.openMerchantChat}
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-orange-100 bg-white p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageId}</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{pkg.id}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageStatus}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pkg.status || "-"}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.duration}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {(pkg.duration || 0).toString()} {copy.day}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.participant}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {getScheduleQuotaLabel(pkg.travel_style, activeLocale)}: {(pkg.minimal_peserta || 0).toString()} {copy.people}
            </p>
            {isQuotaTravelStyle(pkg.travel_style) && pkg.departure_date ? (
              <p className="mt-2 text-sm text-slate-600">{pkg.departure_date}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.createdAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.created_at, activeLocale)}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.updatedAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.updated_at, activeLocale)}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.gallery}</p>
              <Image
                src={coverImage}
                alt={displayTitle}
                width={1600}
                height={900}
                unoptimized
                className="h-[240px] w-full rounded-[16px] object-cover md:h-[420px]"
              />
              {galleryImages.length > 1 ? (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {galleryImages.slice(0, 8).map((image) => (
                    <Image
                      key={image.id}
                      src={image.image_url}
                      alt={displayTitle}
                      width={320}
                      height={220}
                      unoptimized
                      className="h-16 w-full rounded-xl object-cover md:h-24"
                    />
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                  {formatTravelStyleLabel(pkg.travel_style, activeLocale)}
                </span>
                {highlightTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <PackageTabs
              locale={activeLocale}
              data={{
                aboutTour: translation?.about_tour || null,
                serviceStandard: translation?.service_standard || null,
                include: translation?.include || null,
                exclude: translation?.exclude || null,
                meetingPoint: translation?.meeting_point || detail?.meeting_point || null,
                mapEmbed: detail?.map_embed || null,
                facilities: facilities.map((facility) => ({
                  id: facility.facility_id,
                  name: getFacilityLabel(getFacilityName(facility.facilities), activeLocale),
                })),
                tags:
                  highlightTags.length > 0
                    ? highlightTags.map((tag, index) => ({ id: `hl-${index}`, tag }))
                    : tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
                itineraryDays: itineraryDays.map((day) => ({
                  id: day.id,
                  day_number: day.day_number,
                  day_title: day.day_title,
                  routes: day.package_itinerary_routes,
                })),
              }}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.quickActions}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {formatPackageMoney(localizedPricing.priceAdult, localizedPricing.currency, activeLocale)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Child: {formatPackageMoney(localizedPricing.priceChild, localizedPricing.currency, activeLocale)}
              </p>
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>{copy.route}: {routeText}</p>
                <p>{copy.duration}: {(pkg.duration || 0).toString()} {copy.day}</p>
                <p>{copy.participant}: {(pkg.minimal_peserta || 0).toString()} {copy.people}</p>
              </div>
              <Link
                href={merchantChatHref}
                className="mt-4 block w-full rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                {copy.openMerchantChat}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
