import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import { notFound } from "next/navigation"
import Image from "next/image"
import Gallery from "./Gallery"
import PackageViewTracker from "./PackageViewTracker"
import PackageTabs from "./PackageTabs"
import SidebarActions from "./SidebarActions"
import PublicHeader from "@/app/components/PublicHeader"
import { getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import { getFacilityLabel } from "@/lib/facility-labels"
import { getCurrentLocale } from "@/lib/locale"
import { dictionaries, normalizeLocale, type Locale } from "@/lib/i18n"
import { formatPackageMoney, resolvePackageTranslation } from "@/lib/package-pricing"
import { parseHighlights } from "@/lib/packages/highlights"
import { formatTravelStyleLabel, getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"

export const dynamic = "force-dynamic"

type PackageRow = {
  id: string
  slug: string
  merchant_id: string | null
  title: string | null
  departure_date: string | null
  duration: number | null
  minimal_peserta: number | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  travel_style: string | null
  default_language: string | null
  published_languages: string[] | null
  cover_image: string | null
  origin_country_id: string | null
  origin_province: string | null
  destination_country_id: string | null
  destination_province: string | null
}

type CountryRow = {
  id: string
  name: string
}

type GalleryRow = {
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

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getFacilityName(relation: PackageFacilityRow["facilities"]): string {
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation?.name || "-"
}

function toSupportedLocale(input: string | null | undefined): Locale | null {
  if (input === "id" || input === "en" || input === "zh") return input
  return null
}

export default async function PaketPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const cookieLocale = await getCurrentLocale()
  const supabase = createAdminClient()

  const slugCandidates = [
    rawSlug,
    safeDecode(rawSlug),
    rawSlug.replace(/^["'“”]+|["'“”]+$/g, ""),
    safeDecode(rawSlug).replace(/^["'“”]+|["'“”]+$/g, ""),
  ].filter((value, index, arr) => value && arr.indexOf(value) === index)

  let pkg: PackageRow | null = null
  let error: unknown = null

  for (const candidate of slugCandidates) {
    const result = await supabase
      .from("packages")
      .select(`
        id,
        slug,
        merchant_id,
        title,
        departure_date,
        duration,
        minimal_peserta,
        price_adult,
        price_child,
        currency,
        travel_style,
        default_language,
        published_languages,
        cover_image,
        origin_country_id,
        origin_province,
        destination_country_id,
        destination_province
      `)
      .eq("slug", candidate)
      .eq("status", "approved")
      .maybeSingle()

    let resolvedData = result.data as PackageRow | null
    let resolvedError = result.error

    if (resolvedError && resolvedError.message.includes("published_languages")) {
      const legacyResult = await supabase
        .from("packages")
        .select(`
          id,
          slug,
          merchant_id,
          title,
          departure_date,
          duration,
          minimal_peserta,
          price_adult,
          price_child,
          currency,
          travel_style,
          default_language,
          cover_image,
          origin_country_id,
          origin_province,
          destination_country_id,
          destination_province
        `)
        .eq("slug", candidate)
        .eq("status", "approved")
        .maybeSingle()

      resolvedData = legacyResult.data
        ? ({
            ...legacyResult.data,
            published_languages: [legacyResult.data.default_language || "id"],
          } as PackageRow)
        : null
      resolvedError = legacyResult.error
    }

    if (resolvedData) {
      pkg = resolvedData
      error = null
      break
    }

    error = resolvedError
  }

  if (!pkg) {
    const suffix = rawSlug.match(/([a-z0-9]{6,})$/i)?.[1]
    if (suffix) {
      const fallback = await supabase
        .from("packages")
        .select(`
          id,
          slug,
          merchant_id,
          title,
          departure_date,
          duration,
          minimal_peserta,
          price_adult,
          price_child,
          currency,
          travel_style,
          default_language,
          published_languages,
          cover_image,
          origin_country_id,
          origin_province,
          destination_country_id,
          destination_province
        `)
        .ilike("slug", `%${suffix}`)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle()

      let fallbackData = fallback.data as PackageRow | null
      let fallbackError = fallback.error

      if (fallbackError && fallbackError.message.includes("published_languages")) {
        const legacyFallback = await supabase
          .from("packages")
          .select(`
            id,
            slug,
            merchant_id,
            title,
            duration,
            minimal_peserta,
            price_adult,
            price_child,
            currency,
            travel_style,
            default_language,
            cover_image,
            origin_country_id,
            origin_province,
            destination_country_id,
            destination_province
          `)
          .ilike("slug", `%${suffix}`)
          .eq("status", "approved")
          .limit(1)
          .maybeSingle()

        fallbackData = legacyFallback.data
          ? ({
              ...legacyFallback.data,
              published_languages: [legacyFallback.data.default_language || "id"],
            } as PackageRow)
          : null
        fallbackError = legacyFallback.error
      }

      pkg = fallbackData
      error = fallbackError
    }
  }

  if (error || !pkg) return notFound()

  if (!pkg.merchant_id) return notFound()

  const { data: merchantRow, error: merchantError } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", pkg.merchant_id)
    .eq("verification_status", "approved")
    .maybeSingle()

  if (merchantError || !merchantRow) return notFound()

  const defaultLocale = toSupportedLocale(pkg.default_language) || "id"
  const allowedLocalesRaw = (pkg.published_languages || [])
    .map((lang) => toSupportedLocale(lang))
    .filter((lang): lang is Locale => Boolean(lang))
  const allowedLocales = [...new Set([...allowedLocalesRaw, defaultLocale])]
  const activeLocale = allowedLocales.includes(cookieLocale)
    ? cookieLocale
    : allowedLocales[0] || normalizeLocale(pkg.default_language)
  const t = dictionaries[activeLocale].detail
  const participantLabel = getScheduleQuotaLabel(pkg.travel_style, activeLocale)

  const { data: translationRows } = await supabase
    .from("package_translations")
    .select("language_code, title, description, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights, currency, price_adult, price_child")
    .eq("package_id", pkg.id)
    .in(
      "language_code",
      [...new Set([activeLocale, defaultLocale, "id"])].filter(Boolean)
    )

  const translations = (translationRows || []) as Array<{
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
  }>

  const translation = resolvePackageTranslation(translations, activeLocale, pkg.default_language, pkg.published_languages)
  const localizedPricing = await getLiveLocalizedPackagePricing({
    locale: activeLocale,
    defaultLanguage: pkg.default_language,
    publishedLanguages: pkg.published_languages,
    baseCurrency: pkg.currency,
    baseAdultPrice: pkg.price_adult,
    baseChildPrice: pkg.price_child,
  })

  const { data: detail } = await supabase
    .from("package_details")
    .select("meeting_point, map_embed")
    .eq("package_id", pkg.id)
    .maybeSingle()

  const { data: galleryData } = await supabase
    .from("package_images")
    .select("id, image_url")
    .eq("package_id", pkg.id)
  const galleryImages = (galleryData as GalleryRow[] | null) || []

  const { data: facilitiesData } = await supabase
    .from("package_facilities")
    .select(`
      facility_id,
      facilities ( name )
    `)
    .eq("package_id", pkg.id)
  const facilities = (facilitiesData as PackageFacilityRow[] | null) || []

  const { data: tagsData } = await supabase
    .from("package_tags")
    .select("id, tag")
    .eq("package_id", pkg.id)
  const tags = (tagsData as TagRow[] | null) || []

  const { data: itineraryDaysData } = await supabase
    .from("package_itinerary_days")
    .select(`
      id,
      day_number,
      day_title,
      package_itinerary_routes (
        id,
        pickup_time,
        route,
        description
      )
    `)
    .eq("package_id", pkg.id)
    .order("day_number", { ascending: true })
  const itineraryDays = (itineraryDaysData as ItineraryDayRow[] | null) || []
  const itineraryDayIds = itineraryDays.map((day) => day.id)
  const itineraryRouteIds = itineraryDays.flatMap((day) => day.package_itinerary_routes.map((route) => route.id))

  const [itineraryDayTranslationResult, itineraryRouteTranslationResult] = await Promise.all([
    itineraryDayIds.length > 0
      ? supabase
          .from("package_itinerary_day_translations")
          .select("itinerary_day_id, language_code, day_title")
          .in("itinerary_day_id", itineraryDayIds)
          .in("language_code", [...new Set([activeLocale, defaultLocale, "id"])])
      : Promise.resolve({ data: [], error: null }),
    itineraryRouteIds.length > 0
      ? supabase
          .from("package_itinerary_route_translations")
          .select("itinerary_route_id, language_code, route, description")
          .in("itinerary_route_id", itineraryRouteIds)
          .in("language_code", [...new Set([activeLocale, defaultLocale, "id"])])
      : Promise.resolve({ data: [], error: null }),
  ])

  const itineraryDayTranslationMap = new Map(
    ((itineraryDayTranslationResult.data || []) as Array<{
      itinerary_day_id: string | null
      language_code: string | null
      day_title: string | null
    }>).map((item) => [`${item.itinerary_day_id}:${item.language_code}`, item.day_title || ""]),
  )

  const itineraryRouteTranslationMap = new Map(
    ((itineraryRouteTranslationResult.data || []) as Array<{
      itinerary_route_id: string | null
      language_code: string | null
      route: string | null
      description: string | null
    }>).map((item) => [
      `${item.itinerary_route_id}:${item.language_code}`,
      {
        route: item.route,
        description: item.description,
      },
    ]),
  )

  const countryIds = [pkg.origin_country_id, pkg.destination_country_id].filter(Boolean)
  let countries: CountryRow[] = []
  if (countryIds.length > 0) {
    const { data } = await supabase
      .from("countries")
      .select("id, name")
      .in("id", countryIds)
    countries = (data as CountryRow[] | null) || []
  }
  const countryMap = new Map(countries.map((country) => [country.id, country.name]))

  const displayTitle = translation?.title || pkg.title || "Detail Paket"
  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <PackageViewTracker packageId={pkg.id} />
      <PublicHeader locale={activeLocale} languageOptions={allowedLocales} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{displayTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {countryMap.get(pkg.origin_country_id || "") || "-"} - {pkg.origin_province || "-"} {t.fromTo}{" "}
            {countryMap.get(pkg.destination_country_id || "") || "-"} - {pkg.destination_province || "-"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
              {formatTravelStyleLabel(pkg.travel_style)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {t.language} {pkg.default_language || "-"}
            </span>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_340px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              {galleryImages.length > 0 ? (
                <Gallery images={galleryImages} />
              ) : (
                <Image
                  src={coverImage}
                  alt={displayTitle}
                  width={1600}
                  height={900}
                  unoptimized
                  className="h-[260px] w-full rounded-xl object-cover md:h-[500px]"
                />
              )}
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
                tags: (
                  parseHighlights(translation?.highlights).length > 0
                    ? parseHighlights(translation?.highlights).map((tag, index) => ({
                        id: `translated-${index}`,
                        tag,
                      }))
                    : tags.map((tag) => ({
                        id: tag.id,
                        tag: tag.tag,
                      }))
                ),
                itineraryDays: itineraryDays.map((day) => ({
                  id: day.id,
                  day_number: day.day_number,
                  day_title:
                    itineraryDayTranslationMap.get(`${day.id}:${activeLocale}`) ||
                    itineraryDayTranslationMap.get(`${day.id}:${defaultLocale}`) ||
                    itineraryDayTranslationMap.get(`${day.id}:id`) ||
                    day.day_title,
                  routes: day.package_itinerary_routes.map((route) => ({
                    ...route,
                    route:
                      itineraryRouteTranslationMap.get(`${route.id}:${activeLocale}`)?.route ||
                      itineraryRouteTranslationMap.get(`${route.id}:${defaultLocale}`)?.route ||
                      itineraryRouteTranslationMap.get(`${route.id}:id`)?.route ||
                      route.route,
                    description:
                      itineraryRouteTranslationMap.get(`${route.id}:${activeLocale}`)?.description ||
                      itineraryRouteTranslationMap.get(`${route.id}:${defaultLocale}`)?.description ||
                      itineraryRouteTranslationMap.get(`${route.id}:id`)?.description ||
                      route.description,
                  })),
                })),
              }}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/40">
              <h2 className="text-xl font-semibold text-slate-900">{t.bookingTour}</h2>
              <p className="mt-2 text-3xl font-bold text-orange-600">{formatPackageMoney(localizedPricing.priceAdult, localizedPricing.currency, activeLocale)}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>{t.duration}: {pkg.duration || 0} {t.day}</p>
                <p>{participantLabel}: {pkg.minimal_peserta || 0} {t.people}</p>
                {isQuotaTravelStyle(pkg.travel_style) && pkg.departure_date && (
                  <p>Tanggal keberangkatan: {pkg.departure_date}</p>
                )}
                <p>{t.childPrice}: {formatPackageMoney(localizedPricing.priceChild, localizedPricing.currency, activeLocale)}</p>
              </div>
              <Link
                href={`/checkout/${encodeURIComponent(pkg.slug)}`}
                className="mt-5 block w-full rounded-[20px] bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t.bookingNow}
              </Link>
            </section>
            <SidebarActions
              packageId={pkg.id}
              preparation={translation?.preparation || null}
              termsConditions={translation?.terms_conditions || null}
              locale={activeLocale}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
