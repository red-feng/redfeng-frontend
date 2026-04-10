import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import Image from "next/image"
import Gallery from "./Gallery"
import PackageViewTracker from "./PackageViewTracker"
import PackageTabs from "./PackageTabs"
import SidebarActions from "./SidebarActions"
import { getCustomerTargetUnreadCount } from "@/lib/chat/customer-target-unread"
import PublicHeader from "@/app/components/PublicHeader"
import PublicInstallPrompt from "@/app/components/PublicInstallPrompt"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import PublicStickyAction from "@/app/components/PublicStickyAction"
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
  const authSupabase = await createClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

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

  const defaultLocale = toSupportedLocale(pkg.default_language) || "id"
  if (!pkg.merchant_id) return notFound()

  const { data: merchantRow, error: merchantError } = await supabase
    .from("merchants")
    .select("id, verification_status, onboarding_completed")
    .eq("id", pkg.merchant_id)
    .maybeSingle()

  const merchantStatus = String(merchantRow?.verification_status || "").trim().toLowerCase()
  const merchantAllowed = Boolean(merchantRow?.id) && merchantStatus === "approved" && Boolean(merchantRow?.onboarding_completed)

  if (merchantError || !merchantAllowed) return notFound()

  const allowedLocalesRaw = (pkg.published_languages || [])
    .map((lang) => toSupportedLocale(lang))
    .filter((lang): lang is Locale => Boolean(lang))
  const allowedLocales = [...new Set([...allowedLocalesRaw, defaultLocale])]
  const activeLocale = allowedLocales.includes(cookieLocale)
    ? cookieLocale
    : allowedLocales[0] || normalizeLocale(pkg.default_language)
  const localeFallbacks = [...new Set([activeLocale, defaultLocale, "id"])]
  const t = dictionaries[activeLocale].detail
  const participantLabel = getScheduleQuotaLabel(pkg.travel_style, activeLocale)
  const luxuryCopy =
    activeLocale === "en"
      ? {
          heroEyebrow: "Signature Journey",
          routeTitle: "Curated Route",
          tripTitle: "Trip Format",
          bookingTitle: "Booking Detail",
          departure: "Departure",
          bookingSummary: "Premium booking summary",
          instant: "Instant",
          whyTitle: "Why guests love this",
          whyBody: "Curated itinerary, clear facilities, and a polished booking flow in your selected language.",
          pricingNoteTitle: "Live localized pricing",
          pricingNoteBody:
            "Displayed prices follow the latest exchange rate for your selected language. Final booking amounts are snapshotted when checkout is created.",
          withWord: "with",
        }
      : activeLocale === "zh"
        ? {
            heroEyebrow: "甄选旅程",
            routeTitle: "精选路线",
            tripTitle: "行程形式",
            bookingTitle: "预订信息",
            departure: "出发日期",
            bookingSummary: "高级预订摘要",
            instant: "即时",
            whyTitle: "旅客喜爱它的原因",
            whyBody: "精选行程、清晰设施说明，以及符合您所选语言的顺畅预订流程。",
            withWord: "",
          }
        : {
            heroEyebrow: "Perjalanan Pilihan",
            routeTitle: "Rute Pilihan",
            tripTitle: "Format Perjalanan",
            bookingTitle: "Detail Booking",
            departure: "Tanggal keberangkatan",
            bookingSummary: "Ringkasan booking premium",
            instant: "Instan",
            whyTitle: "Kenapa tamu menyukainya",
            whyBody: "Itinerary terkurasi, fasilitas jelas, dan alur booking yang rapi sesuai bahasa pilihan customer.",
            pricingNoteTitle: "Harga lokal live",
            pricingNoteBody:
              "Harga yang tampil mengikuti kurs terbaru sesuai bahasa pilihan customer. Nilai final booking akan disnapshot saat checkout dibuat.",
            withWord: "dengan",
          }
  const pricingNoteCopy =
    activeLocale === "en"
      ? {
          title: "Live localized pricing",
          body:
            "Displayed prices follow the latest exchange rate for your selected language. Final booking amounts are snapshotted when checkout is created.",
        }
      : activeLocale === "zh"
        ? {
            title: "实时本地化价格",
            body: "当前显示价格会根据您所选语言使用最新汇率换算。最终预订金额会在创建结账时锁定并保存。",
          }
        : {
            title: "Harga lokal live",
            body:
              "Harga yang tampil mengikuti kurs terbaru sesuai bahasa pilihan customer. Nilai final booking akan disnapshot saat checkout dibuat.",
          }

  const [
    translationResult,
    localizedPricing,
    detailResult,
    galleryResult,
    facilitiesResult,
    tagsResult,
    itineraryDaysResult,
  ] = await Promise.all([
    supabase
      .from("package_translations")
      .select("language_code, title, description, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights, currency, price_adult, price_child")
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
    supabase
      .from("package_details")
      .select("meeting_point, map_embed")
      .eq("package_id", pkg.id)
      .maybeSingle(),
    supabase
      .from("package_images")
      .select("id, image_url")
      .eq("package_id", pkg.id),
    supabase
      .from("package_facilities")
      .select(`
        facility_id,
        facilities ( name )
      `)
      .eq("package_id", pkg.id),
    supabase
      .from("package_tags")
      .select("id, tag")
      .eq("package_id", pkg.id),
    supabase
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
      .order("day_number", { ascending: true }),
  ])

  const translations = (translationResult.data || []) as PackageTranslationRow[]
  const translation = resolvePackageTranslation(translations, activeLocale, pkg.default_language, pkg.published_languages)
  const detail = detailResult.data
  const galleryImages = (galleryResult.data as GalleryRow[] | null) || []
  const facilities = (facilitiesResult.data as PackageFacilityRow[] | null) || []
  const tags = (tagsResult.data as TagRow[] | null) || []
  const itineraryDaysData = itineraryDaysResult.data
  const itineraryDays = (itineraryDaysData as ItineraryDayRow[] | null) || []
  const itineraryDayIds = itineraryDays.map((day) => day.id)
  const itineraryRouteIds = itineraryDays.flatMap((day) => day.package_itinerary_routes.map((route) => route.id))

  const [itineraryDayTranslationResult, itineraryRouteTranslationResult] = await Promise.all([
    itineraryDayIds.length > 0
      ? supabase
          .from("package_itinerary_day_translations")
          .select("itinerary_day_id, language_code, day_title")
          .in("itinerary_day_id", itineraryDayIds)
          .in("language_code", localeFallbacks)
      : Promise.resolve({ data: [], error: null }),
    itineraryRouteIds.length > 0
      ? supabase
          .from("package_itinerary_route_translations")
          .select("itinerary_route_id, language_code, route, description")
          .in("itinerary_route_id", itineraryRouteIds)
          .in("language_code", localeFallbacks)
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
  const countryResult = countryIds.length > 0
    ? await supabase
        .from("countries")
        .select("id, name")
        .in("id", countryIds)
    : { data: [] as CountryRow[] | null }
  const countries = (countryResult.data as CountryRow[] | null) || []
  const countryMap = new Map(countries.map((country) => [country.id, country.name]))

  const displayTitle = translation?.title || pkg.title || "Detail Paket"
  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"
  const highlightTags =
    parseHighlights(translation?.highlights).length > 0
      ? parseHighlights(translation?.highlights)
      : tags.map((tag) => tag.tag).slice(0, 4)

  const packageChatTarget = `/chat?package_id=${encodeURIComponent(pkg.id)}`
  let chatHref = user ? packageChatTarget : `/login?next=${encodeURIComponent(packageChatTarget)}`
  let chatBadgeCount = 0

  if (user?.email) {
    const { data: latestBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("package_id", pkg.id)
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestBooking?.id) {
      const bookingChatTarget = `/chat?booking_id=${encodeURIComponent(latestBooking.id)}`
      chatHref = bookingChatTarget
    } else {
      chatHref = packageChatTarget
    }

    chatBadgeCount = await getCustomerTargetUnreadCount(supabase, {
      customerId: user.id,
      bookingId: latestBooking?.id || null,
      packageId: pkg.id,
    })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#fffaf5_100%)] pb-36 md:pb-0">
      <PackageViewTracker packageId={pkg.id} />
      <PublicInstallPrompt locale={activeLocale} />
      <PublicHeader locale={activeLocale} languageOptions={allowedLocales} />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px] md:rounded-[32px]">
          <div className="relative px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(255,247,237,0.92)_100%)]" />
            <div className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">{luxuryCopy.heroEyebrow}</p>
                  <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-950 sm:text-[34px] md:text-5xl">{displayTitle}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7">
                    {countryMap.get(pkg.origin_country_id || "") || "-"} - {pkg.origin_province || "-"} {t.fromTo}{" "}
                    {countryMap.get(pkg.destination_country_id || "") || "-"} - {pkg.destination_province || "-"}
                  </p>
                </div>
                <div className="w-full rounded-[20px] border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur sm:w-auto sm:rounded-[24px] sm:px-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.bookingTour}</p>
                  <p className="mt-2 text-[28px] font-semibold tracking-tight text-orange-600 sm:text-3xl">
                    {formatPackageMoney(localizedPricing.priceAdult, localizedPricing.currency, activeLocale)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {participantLabel}: {pkg.minimal_peserta || 0} {t.people}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 font-semibold text-orange-700">
                  {formatTravelStyleLabel(pkg.travel_style, activeLocale)}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                  {t.language} {pkg.default_language || "-"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                  {pkg.duration || 0} {t.day}
                </span>
              </div>

              {highlightTags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {highlightTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:rounded-[24px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{luxuryCopy.routeTitle}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                    {countryMap.get(pkg.origin_country_id || "") || "-"} - {pkg.origin_province || "-"} {t.fromTo}{" "}
                    {countryMap.get(pkg.destination_country_id || "") || "-"} - {pkg.destination_province || "-"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:rounded-[24px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{luxuryCopy.tripTitle}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                    {formatTravelStyleLabel(pkg.travel_style, activeLocale)} {luxuryCopy.withWord ? `${luxuryCopy.withWord} ` : ""}{pkg.duration || 0} {t.day}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:rounded-[24px] sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{luxuryCopy.bookingTitle}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                    {participantLabel}: {pkg.minimal_peserta || 0} {t.people}
                  </p>
                  {isQuotaTravelStyle(pkg.travel_style) && pkg.departure_date && (
                    <p className="mt-1 text-sm leading-6 text-slate-600">{luxuryCopy.departure}: {pkg.departure_date}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-4 md:rounded-[32px] md:p-5">
              {galleryImages.length > 0 ? (
                <Gallery images={galleryImages} locale={activeLocale} />
              ) : (
                <Image
                  src={coverImage}
                  alt={displayTitle}
                  width={1600}
                  height={900}
                  unoptimized
                  className="h-[240px] w-full rounded-[20px] object-cover sm:h-[320px] sm:rounded-[24px] md:h-[620px] md:rounded-[28px]"
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
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:rounded-[28px] md:rounded-[32px]">
              <div className="bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">{t.bookingTour}</p>
                    <p className="mt-1 text-sm text-slate-500">{luxuryCopy.bookingSummary}</p>
                  </div>
                  <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                    {luxuryCopy.instant}
                  </span>
                </div>
                <p className="mt-3 text-[32px] font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {formatPackageMoney(localizedPricing.priceAdult, localizedPricing.currency, activeLocale)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {t.childPrice}: {formatPackageMoney(localizedPricing.priceChild, localizedPricing.currency, activeLocale)}
                </p>
              </div>

              <div className="space-y-3 p-4 text-sm text-slate-700 sm:p-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">{pricingNoteCopy.title}</p>
                  <p className="mt-2 leading-6 text-sm text-blue-900">{pricingNoteCopy.body}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p>{t.duration}: {pkg.duration || 0} {t.day}</p>
                  <p className="mt-2">{participantLabel}: {pkg.minimal_peserta || 0} {t.people}</p>
                  {isQuotaTravelStyle(pkg.travel_style) && pkg.departure_date && (
                    <p className="mt-2">Tanggal keberangkatan: {pkg.departure_date}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">{luxuryCopy.whyTitle}</p>
                  <p className="mt-2 leading-6">{luxuryCopy.whyBody}</p>
                </div>
                <Link
                  href={`/checkout/${encodeURIComponent(pkg.slug)}`}
                  className="block w-full rounded-[22px] bg-[linear-gradient(135deg,#fb923c_0%,#f97316_100%)] px-4 py-3.5 text-center text-sm font-semibold text-white shadow-[0_16px_30px_rgba(249,115,22,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_34px_rgba(249,115,22,0.34)]"
                >
                  {t.bookingNow}
                </Link>
              </div>
            </section>
            <SidebarActions
              chatHref={chatHref}
              chatBadgeCount={chatBadgeCount}
              preparation={translation?.preparation || null}
              termsConditions={translation?.terms_conditions || null}
              locale={activeLocale}
            />
          </aside>
        </div>
      </div>
      <PublicStickyAction
        locale={activeLocale}
        href={`/checkout/${encodeURIComponent(pkg.slug)}`}
        label={t.bookingNow}
        summary={luxuryCopy.bookingSummary}
      />
      <PublicMobileNav locale={activeLocale} />
    </main>
  )
}
