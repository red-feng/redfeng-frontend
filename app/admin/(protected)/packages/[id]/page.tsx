import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { toneClass } from "@/lib/status-tones"
import { getRevisionById } from "@/lib/package-revisions"
import { approvePackage, deletePackage, rejectPackage } from "./actions"
import Image from "next/image"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import AdminPackageReviewTabs from "./AdminPackageReviewTabs"
import ConfirmSubmitButton from "../../merchants/ConfirmSubmitButton"
import { redirect } from "next/navigation"
import { formatPackageCode } from "@/lib/merchant-code"

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

type TranslationRow = {
  language_code: string | null
  title: string | null
  about_tour: string | null
  service_standard: string | null
  include: string | null
  exclude: string | null
  preparation: string | null
  terms_conditions: string | null
  meeting_point: string | null
  highlights: string | null
}

type PackageDetailRow = {
  meeting_point: string | null
  map_embed: string | null
  location_label: string | null
  location_type: string | null
  primary_lat: number | null
  primary_lng: number | null
  viewport_radius_km: number | null
}

type GeoReviewIssue = {
  tone: "warning" | "blocking"
  message: string
}

function formatMoney(value: number | null, currency: string | null): string {
  const safeValue = value ?? 0
  const safeCurrency = currency || "IDR"
  return `${safeCurrency} ${safeValue.toLocaleString("id-ID")}`
}

function statusClass(status: string | null): string {
  if (status === "approved") return toneClass("success", "bordered")
  if (status === "rejected") return toneClass("danger", "bordered")
  if (status === "pending") return toneClass("pending", "bordered")
  return toneClass("neutral", "bordered")
}

function getFacilityName(relation: PackageFacilityRow["facilities"]): string {
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation?.name || "-"
}

function getLanguageLabel(code: string | null): string {
  if (code === "id") return "Indonesia"
  if (code === "en") return "English"
  if (code === "zh") return "Chinese"
  return code || "-"
}

function formatStatusLabel(status: string | null): string {
  if (status === "approved") return "Disetujui"
  if (status === "rejected") return "Ditolak"
  if (status === "pending") return "Menunggu Review"
  if (status === "draft") return "Draft"
  if (status === "inactive") return "Nonaktif"
  return status || "Tidak diketahui"
}

function statusSummary(status: string | null): string {
  if (status === "approved") return "Paket sudah lolos review dan siap tayang ke customer."
  if (status === "rejected") return "Paket memerlukan revisi merchant sebelum diajukan ulang."
  if (status === "pending") return "Seluruh isi paket sedang menunggu validasi admin."
  if (status === "draft") return "Paket masih disusun merchant dan belum siap direview."
  if (status === "inactive") return "Paket tersimpan tetapi belum aktif untuk customer."
  return "Status paket belum memiliki ringkasan."
}

function formatLocationType(value: string | null | undefined): string {
  if (value === "country") return "Negara"
  if (value === "city") return "Kota / destinasi"
  if (value === "meeting_point") return "Meeting point"
  if (value === "tour_area") return "Area tour"
  return value || "-"
}

function formatCoordinates(lat: number | null | undefined, lng: number | null | undefined): string {
  if (typeof lat === "number" && typeof lng === "number") return `${lat}, ${lng}`
  return "-"
}

function formatRouteSummary(countryMap: Map<string, string>, originCountryId: string | null | undefined, originProvince: string | null | undefined, destinationCountryId: string | null | undefined, destinationProvince: string | null | undefined): string {
  return `${countryMap.get(originCountryId || "") || "-"} - ${originProvince || "-"} ke ${countryMap.get(destinationCountryId || "") || "-"} - ${destinationProvince || "-"}`
}

function getGeoReviewIssues(detail: PackageDetailRow | null | undefined): GeoReviewIssue[] {
  if (!detail) return []

  const issues: GeoReviewIssue[] = []
  const locationType = String(detail.location_type || "").trim()
  const hasLabel = Boolean(String(detail.location_label || "").trim())
  const hasLat = typeof detail.primary_lat === "number"
  const hasLng = typeof detail.primary_lng === "number"
  const hasRadius = typeof detail.viewport_radius_km === "number"

  if (locationType && !hasLabel) {
    issues.push({
      tone: "warning",
      message: "Tipe lokasi peta sudah dipilih, tetapi label lokasi belum diisi.",
    })
  }

  if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
    issues.push({
      tone: "blocking",
      message: "Koordinat peta belum lengkap. Latitude dan longitude harus diisi berpasangan.",
    })
  }

  if ((locationType === "meeting_point" || locationType === "city") && (!hasLat || !hasLng)) {
    issues.push({
      tone: "blocking",
      message: `Tipe lokasi "${formatLocationType(locationType)}" memerlukan koordinat utama agar bisa dipakai di map katalog.`,
    })
  }

  if (locationType === "tour_area" && !hasRadius) {
    issues.push({
      tone: "warning",
      message: "Area tour belum memiliki radius area. Marker masih bisa tampil sebagai titik, tetapi cakupan area belum jelas.",
    })
  }

  if (locationType === "country" && (!hasLat || !hasLng)) {
    issues.push({
      tone: "warning",
      message: "Lokasi bertipe negara belum punya koordinat utama. Sistem masih bisa fallback ke mode negara, tetapi belum siap untuk map titik nyata.",
    })
  }

  if (hasRadius && !locationType) {
    issues.push({
      tone: "warning",
      message: "Radius area sudah diisi, tetapi tipe lokasi peta belum dipilih.",
    })
  }

  return issues
}

export default async function Page({
  params,
  searchParams,
  portal = "admin",
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ revision?: string }>
  portal?: "admin" | "superadmin"
}) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) || {}
  const requestedRevisionId = String(resolvedSearchParams.revision || "").trim()
  const supabase = createAdminClient()
  const authSupabase = await createClient(portal)
  const {
    data: { user },
  } = await authSupabase.auth.getUser()
  const { data: currentProfile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)

  const { data: pkgByCode } = await supabase
    .from("packages")
    .select("*")
    .eq("package_code", id)
    .maybeSingle()

  const { data: pkgById } = pkgByCode
    ? { data: null }
    : await supabase
        .from("packages")
        .select("*")
        .eq("id", id)
        .maybeSingle()

  const pkg = pkgByCode || pkgById

  if (!pkg) return <div className="p-8">Paket tidak ditemukan</div>

  if (pkg.package_code && id !== pkg.package_code) {
    redirect(`${portal === "superadmin" ? "/superadmin/packages" : "/admin/packages"}/${encodeURIComponent(pkg.package_code)}`)
  }
  const packageInternalId = pkg.id
  const revisionRecord = requestedRevisionId ? await getRevisionById(supabase, requestedRevisionId) : null
  if (revisionRecord && revisionRecord.package_id !== packageInternalId) {
    return <div className="p-8">Revision paket tidak cocok dengan paket yang sedang dibuka.</div>
  }
  const revisionPayload = revisionRecord?.payload || null

  const { data: merchant } = await supabase
    .from("merchants")
    .select("company_name")
    .eq("id", pkg.merchant_id)
    .single()

  const countryIds = [pkg.origin_country_id, pkg.destination_country_id].filter(Boolean)
  const availableLanguageCodes =
    Array.isArray(pkg.published_languages) && pkg.published_languages.length > 0
      ? [...new Set([pkg.default_language || "id", ...pkg.published_languages])]
      : [pkg.default_language || "id"]

  let countries: CountryRow[] = []
  if (countryIds.length > 0) {
    const { data } = await supabase
      .from("countries")
      .select("id, name")
      .in("id", countryIds)
    countries = (data as CountryRow[] | null) || []
  }
  const countryMap = new Map(countries.map((country) => [country.id, country.name]))

  const { data: translationRows } = await supabase
    .from("package_translations")
    .select(
      "language_code, title, about_tour, service_standard, include, exclude, preparation, terms_conditions, meeting_point, highlights",
    )
    .eq("package_id", packageInternalId)
  const translations = (translationRows as TranslationRow[] | null) || []
  const sortedTranslations = [...translations].sort((a, b) => {
    if (a.language_code === pkg.default_language) return -1
    if (b.language_code === pkg.default_language) return 1
    return (a.language_code || "").localeCompare(b.language_code || "")
  })
  const primaryTranslation = sortedTranslations[0] || null

  const { data: detail } = await supabase
    .from("package_details")
    .select("*")
    .eq("package_id", packageInternalId)
    .maybeSingle<PackageDetailRow>()

  const { data: galleryData } = await supabase
    .from("package_images")
    .select("id, image_url")
    .eq("package_id", packageInternalId)
  const galleryImages = (galleryData as GalleryRow[] | null) || []

  const { data: facilitiesData } = await supabase
    .from("package_facilities")
    .select(`
      facility_id,
      facilities ( name )
    `)
    .eq("package_id", packageInternalId)
  const facilities = (facilitiesData as PackageFacilityRow[] | null) || []
  const revisionFacilityIds = revisionPayload?.facility_ids || []
  const { data: revisionFacilityLookupData } = revisionFacilityIds.length > 0
    ? await supabase.from("facilities").select("id, name").in("id", revisionFacilityIds)
    : { data: [] as Array<{ id: string; name: string | null }> }
  const revisionFacilityLookup = new Map(
    (((revisionFacilityLookupData as Array<{ id: string; name: string | null }> | null) || []) as Array<{ id: string; name: string | null }>)
      .map((facility) => [facility.id, facility.name || "-"]),
  )

  const { data: tagsData } = await supabase
    .from("package_tags")
    .select("*")
    .eq("package_id", packageInternalId)
  const tags = (tagsData as TagRow[] | null) || []

  const { data: itineraryDaysData } = await supabase
    .from("package_itinerary_days")
    .select(`
      *,
      package_itinerary_routes (*)
    `)
    .eq("package_id", packageInternalId)
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
          .in("language_code", availableLanguageCodes)
      : Promise.resolve({ data: [], error: null }),
    itineraryRouteIds.length > 0
      ? supabase
          .from("package_itinerary_route_translations")
          .select("itinerary_route_id, language_code, route, description")
          .in("itinerary_route_id", itineraryRouteIds)
          .in("language_code", availableLanguageCodes)
      : Promise.resolve({ data: [], error: null }),
  ])

  const itineraryDayTranslationMap = new Map(
    ((itineraryDayTranslationResult.data || []) as Array<{
      itinerary_day_id: string | null
      language_code: string | null
      day_title: string | null
    }>).map((item) => [`${item.itinerary_day_id || ""}:${item.language_code || ""}`, item.day_title || ""]),
  )

  const itineraryRouteTranslationMap = new Map(
    ((itineraryRouteTranslationResult.data || []) as Array<{
      itinerary_route_id: string | null
      language_code: string | null
      route: string | null
      description: string | null
    }>).map((item) => [
      `${item.itinerary_route_id || ""}:${item.language_code || ""}`,
      {
        route: item.route || "",
        description: item.description || "",
      },
    ]),
  )

  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"
  const publishedLanguageLabels =
    revisionPayload?.package.published_languages?.length
      ? revisionPayload.package.published_languages.map((code: string) => getLanguageLabel(code)).join(", ")
      : Array.isArray(pkg.published_languages) && pkg.published_languages.length > 0
        ? pkg.published_languages.map((code: string) => getLanguageLabel(code)).join(", ")
        : getLanguageLabel(pkg.default_language)
  const effectiveDetail = revisionPayload
    ? {
        meeting_point: revisionPayload.details.meeting_point || null,
        map_embed: revisionPayload.details.map_embed || null,
        location_label: revisionPayload.details.location_label || null,
        location_type: revisionPayload.details.location_type || null,
        primary_lat: revisionPayload.details.primary_lat,
        primary_lng: revisionPayload.details.primary_lng,
        viewport_radius_km: revisionPayload.details.viewport_radius_km,
      }
    : detail
  const effectiveTranslations = revisionPayload
    ? (["id", "en", "zh"] as const).map((code) => ({
        language_code: code,
        ...revisionPayload.translations[code],
      }))
    : sortedTranslations
  const effectivePrimaryTranslation = revisionPayload
    ? {
        language_code: revisionPayload.package.default_language,
        ...revisionPayload.translations[revisionPayload.package.default_language],
      }
    : primaryTranslation
  const effectiveTags = revisionPayload ? revisionPayload.tags.map((tag, index) => ({ id: `${index}`, tag })) : tags
  const effectiveFacilities = revisionPayload
    ? revisionPayload.facility_ids.map((facilityId) => ({
        facility_id: facilityId,
        facilities: { name: revisionFacilityLookup.get(facilityId) || "-" },
      }))
    : facilities
  const effectiveItineraryDays = revisionPayload
    ? revisionPayload.itinerary.map((day, index) => ({
        id: `revision-day-${index + 1}`,
        day_number: day.day,
        day_title: day.translations[revisionPayload.package.default_language].title || null,
        package_itinerary_routes: day.routes.map((route, routeIndex) => ({
          id: `revision-route-${index + 1}-${routeIndex + 1}`,
          pickup_time: route.pickup_time || null,
          route: route.translations[revisionPayload.package.default_language] || null,
          description: day.translations[revisionPayload.package.default_language].description || null,
        })),
      }))
    : itineraryDays
  const geoReviewIssues = getGeoReviewIssues(effectiveDetail)
  const hasBlockingGeoIssue = geoReviewIssues.some((issue) => issue.tone === "blocking")
  const liveSnapshot = revisionRecord?.live_snapshot || null
  const revisionChangedFields = revisionRecord?.changed_fields || []
  const revisionDiffRows = revisionRecord && revisionPayload && liveSnapshot
    ? [
        {
          label: "Judul paket",
          before: liveSnapshot.translations[liveSnapshot.package.default_language]?.title || liveSnapshot.package.title || "-",
          after: revisionPayload.translations[revisionPayload.package.default_language]?.title || revisionPayload.package.title || "-",
        },
        {
          label: "Harga dewasa",
          before: formatMoney(liveSnapshot.package.price_adult, liveSnapshot.package.currency),
          after: formatMoney(revisionPayload.package.price_adult, revisionPayload.package.currency),
        },
        {
          label: "Harga anak",
          before: formatMoney(liveSnapshot.package.price_child, liveSnapshot.package.currency),
          after: formatMoney(revisionPayload.package.price_child, revisionPayload.package.currency),
        },
        {
          label: "Durasi",
          before: `${liveSnapshot.package.duration || 0} hari`,
          after: `${revisionPayload.package.duration || 0} hari`,
        },
        {
          label: "Minimal peserta",
          before: `${liveSnapshot.package.minimal_peserta || 0} orang`,
          after: `${revisionPayload.package.minimal_peserta || 0} orang`,
        },
        {
          label: "Gaya perjalanan",
          before: formatTravelStyleLabel(liveSnapshot.package.travel_style),
          after: formatTravelStyleLabel(revisionPayload.package.travel_style),
        },
        {
          label: "Rute",
          before: formatRouteSummary(
            countryMap,
            liveSnapshot.package.origin_country_id,
            liveSnapshot.package.origin_province,
            liveSnapshot.package.destination_country_id,
            liveSnapshot.package.destination_province,
          ),
          after: formatRouteSummary(
            countryMap,
            revisionPayload.package.origin_country_id,
            revisionPayload.package.origin_province,
            revisionPayload.package.destination_country_id,
            revisionPayload.package.destination_province,
          ),
        },
        {
          label: "Meeting point",
          before: liveSnapshot.details.meeting_point || liveSnapshot.translations[liveSnapshot.package.default_language]?.meeting_point || "-",
          after: revisionPayload.details.meeting_point || revisionPayload.translations[revisionPayload.package.default_language]?.meeting_point || "-",
        },
        {
          label: "Label lokasi peta",
          before: liveSnapshot.details.location_label || "-",
          after: revisionPayload.details.location_label || "-",
        },
        {
          label: "Tipe lokasi peta",
          before: formatLocationType(liveSnapshot.details.location_type),
          after: formatLocationType(revisionPayload.details.location_type),
        },
        {
          label: "Koordinat",
          before: formatCoordinates(liveSnapshot.details.primary_lat, liveSnapshot.details.primary_lng),
          after: formatCoordinates(revisionPayload.details.primary_lat, revisionPayload.details.primary_lng),
        },
        {
          label: "Radius area",
          before: liveSnapshot.details.viewport_radius_km !== null ? `${liveSnapshot.details.viewport_radius_km} km` : "-",
          after: revisionPayload.details.viewport_radius_km !== null ? `${revisionPayload.details.viewport_radius_km} km` : "-",
        },
      ].filter((row) => row.before !== row.after)
    : []

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
        <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:mb-8 sm:rounded-[28px]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                  Tinjauan Paket Admin
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {effectivePrimaryTranslation?.title || pkg.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Merchant: {merchant?.company_name || "-"} | ID Paket: {formatPackageCode(pkg.package_code, pkg.id)}
                </p>
                {revisionRecord ? (
                  <p className="mt-2 text-sm leading-6 text-sky-700">
                    Sedang meninjau revisi merchant yang diajukan pada {revisionRecord.submitted_at ? new Date(revisionRecord.submitted_at).toLocaleString("id-ID") : "-"}.
                  </p>
                ) : null}
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{statusSummary(pkg.status)}</p>
              </div>

              <div className="flex w-full flex-col items-start gap-3 sm:w-auto">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(pkg.status)}`}>
                  {formatStatusLabel(pkg.status)}
                </span>
                <div className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:w-auto">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Bahasa Review
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{publishedLanguageLabels}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:gap-4 sm:px-8 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Harga Dewasa</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(pkg.price_adult, pkg.currency)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Harga Anak</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(pkg.price_child, pkg.currency)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Durasi</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{pkg.duration || 0} hari</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Minimal Peserta</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{pkg.minimal_peserta || 0} orang</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                <Image
                  src={coverImage}
                  alt="cover"
                  width={1600}
                  height={900}
                  unoptimized
                  className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[360px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">Hero Preview</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                      {effectivePrimaryTranslation?.title || pkg.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/85">
                      {countryMap.get(pkg.origin_country_id) || "-"} - {pkg.origin_province || "-"} menuju{" "}
                      {countryMap.get(pkg.destination_country_id) || "-"} - {pkg.destination_province || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {galleryImages.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Galeri</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pastikan foto utama dan pendukung merepresentasikan paket secara konsisten.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {galleryImages.length} foto
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {galleryImages.map((image) => (
                    <Image
                      key={image.id}
                      src={image.image_url}
                      alt="gallery"
                      width={800}
                      height={600}
                      unoptimized
                       className="h-48 w-full rounded-2xl object-cover sm:h-40"
                    />
                  ))}
                </div>
              </section>
            )}

            {revisionRecord && revisionPayload && liveSnapshot ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Perubahan Revisi</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Bandingkan versi live saat ini dengan payload revisi merchant sebelum mengambil keputusan.
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {revisionDiffRows.length} perubahan inti
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status revisi</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatStatusLabel(revisionRecord.status)}</p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Diajukan</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {revisionRecord.submitted_at ? new Date(revisionRecord.submitted_at).toLocaleString("id-ID") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Changed fields</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {revisionChangedFields.length > 0 ? (
                        revisionChangedFields.slice(0, 12).map((field) => (
                          <span key={field} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                            {field}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">Belum ada daftar perubahan terdeteksi.</span>
                      )}
                    </div>
                  </div>
                </div>

                {revisionDiffRows.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {revisionDiffRows.map((row) => (
                      <div key={row.label} className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">Sebelum</p>
                            <p className="mt-2 text-sm leading-6 text-rose-900">{row.before}</p>
                          </div>
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Sesudah</p>
                            <p className="mt-2 text-sm leading-6 text-emerald-900">{row.after}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Tidak ada perubahan inti yang terdeteksi pada field utama. Admin tetap bisa memeriksa tab detail untuk konten yang lebih panjang.
                  </div>
                )}
              </section>
            ) : null}

            <AdminPackageReviewTabs
              detailContent={{
                title: effectivePrimaryTranslation?.title || pkg.title || "-",
                about_tour: effectivePrimaryTranslation?.about_tour || null,
                meeting_point: effectivePrimaryTranslation?.meeting_point || effectiveDetail?.meeting_point || null,
                location_label: effectiveDetail?.location_label || null,
                location_type: effectiveDetail?.location_type || null,
                primary_lat: effectiveDetail?.primary_lat ?? null,
                primary_lng: effectiveDetail?.primary_lng ?? null,
                viewport_radius_km: effectiveDetail?.viewport_radius_km ?? null,
                service_standard: effectivePrimaryTranslation?.service_standard || null,
                include: effectivePrimaryTranslation?.include || null,
                exclude: effectivePrimaryTranslation?.exclude || null,
                highlights:
                  effectivePrimaryTranslation?.highlights ||
                  (effectiveTags.length > 0 ? effectiveTags.map((tag) => tag.tag).join(", ") : null),
                preparation: effectivePrimaryTranslation?.preparation || null,
                terms_conditions: effectivePrimaryTranslation?.terms_conditions || null,
                map_embed: effectiveDetail?.map_embed || null,
              }}
              translations={effectiveTranslations.map((translation) => ({
                ...translation,
                meeting_point: translation.meeting_point || effectiveDetail?.meeting_point || null,
                highlights: translation.highlights || null,
              }))}
              defaultLanguage={pkg.default_language}
              publishedLanguages={revisionPayload?.package.published_languages || availableLanguageCodes}
              fallbackTitle={pkg.title}
              facilities={effectiveFacilities.map((facility) => ({
                id: facility.facility_id,
                rawName: getFacilityName(facility.facilities),
              }))}
              tags={effectiveTags.map((tag) => ({
                id: tag.id,
                label: tag.tag,
              }))}
              itineraryDays={effectiveItineraryDays.map((day) => ({
                id: day.id,
                day_number: day.day_number,
                translations: Object.fromEntries(
                  (revisionPayload?.package.published_languages || availableLanguageCodes).map((languageCode) => [
                    languageCode,
                    {
                      title:
                        itineraryDayTranslationMap.get(`${day.id}:${languageCode}`) ||
                        itineraryDayTranslationMap.get(`${day.id}:${pkg.default_language || "id"}`) ||
                        day.day_title ||
                        null,
                      routes: day.package_itinerary_routes.map((route) => ({
                        id: route.id,
                        pickup_time: route.pickup_time,
                        route:
                          itineraryRouteTranslationMap.get(`${route.id}:${languageCode}`)?.route ||
                          itineraryRouteTranslationMap.get(`${route.id}:${pkg.default_language || "id"}`)?.route ||
                          route.route ||
                          "-",
                        description:
                          itineraryRouteTranslationMap.get(`${route.id}:${languageCode}`)?.description ||
                          itineraryRouteTranslationMap.get(`${route.id}:${pkg.default_language || "id"}`)?.description ||
                          route.description ||
                          "-",
                      })),
                    },
                  ]),
                ),
              }))}
            />
          </main>

          <aside className="space-y-4 sm:space-y-6 xl:sticky xl:top-6 xl:h-fit">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Keputusan Admin</h2>
                <p className="mt-1 text-sm text-slate-500">Verifikasi detail paket sebelum disetujui atau ditolak.</p>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Aksi Aman</p>
                  <p className="mt-1 text-sm text-emerald-900">
                    Setujui hanya jika konten, media, dan versi bahasa sudah konsisten.
                  </p>
                </div>

                {geoReviewIssues.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Validasi Geo</p>
                      <p className="mt-1 text-sm text-amber-900">
                        Cek kesiapan data peta sebelum paket disetujui untuk katalog berbasis map.
                      </p>
                    </div>
                    {geoReviewIssues.map((issue, index) => (
                      <div
                        key={`${issue.tone}-${index}`}
                        className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                          issue.tone === "blocking"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <p className="font-semibold">
                          {issue.tone === "blocking" ? "Perlu diperbaiki sebelum approve" : "Perlu diperhatikan"}
                        </p>
                        <p className="mt-1">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                    Data geo paket sudah cukup rapi untuk tahap map discovery saat ini.
                  </div>
                )}

                {canExecuteAdminOps ? (
                  <>
                    <form
                      className="mt-4"
                      action={async () => {
                        "use server"
                        await approvePackage(packageInternalId, revisionRecord?.id)
                      }}
                    >
                      <button
                        disabled={hasBlockingGeoIssue}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Setujui
                      </button>
                    </form>

                    <form
                      className="mt-4"
                      action={async (formData) => {
                        "use server"
                        const reason = formData.get("reason") as string
                        await rejectPackage(packageInternalId, reason, revisionRecord?.id)
                      }}
                    >
                      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Catatan Revisi
                      </label>
                      <textarea
                        name="reason"
                        placeholder="Tuliskan alasan penolakan atau revisi yang perlu dilakukan merchant."
                        required
                        className="mt-2 h-32 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none ring-orange-500 transition focus:bg-white focus:ring-2"
                      />
                      <button className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
                        Tolak
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                    Operations Manager hanya memonitor detail paket dan outcome review, tanpa mengeksekusi approve / reject.
                  </div>
                )}

                {currentProfile?.role === "superadmin" ? (
                  <form
                    className="mt-4"
                    action={async () => {
                      "use server"
                      await deletePackage(packageInternalId)
                    }}
                  >
                    <ConfirmSubmitButton
                      confirmMessage="Yakin ingin menghapus permanen paket ini dari database? Tindakan ini tidak bisa dibatalkan."
                      className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Hapus
                    </ConfirmSubmitButton>
                  </form>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Penghapusan permanen hanya tersedia untuk superadmin.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">Ringkasan Cepat</h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Overview
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Ringkasan inti paket untuk pengecekan cepat sebelum mengambil keputusan.</p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gaya Perjalanan</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatTravelStyleLabel(pkg.travel_style)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bahasa Default</dt>
                  <dd className="mt-1 font-medium text-slate-900">{getLanguageLabel(pkg.default_language)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bahasa Tersedia</dt>
                  <dd className="mt-1 font-medium text-slate-900">{publishedLanguageLabels}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Keberangkatan</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {countryMap.get(pkg.origin_country_id) || "-"} - {pkg.origin_province || "-"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tujuan</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {countryMap.get(pkg.destination_country_id) || "-"} - {pkg.destination_province || "-"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Label Lokasi Peta</dt>
                  <dd className="mt-1 font-medium text-slate-900">{effectiveDetail?.location_label || "-"}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tipe Lokasi Peta</dt>
                  <dd className="mt-1 font-medium text-slate-900">{formatLocationType(effectiveDetail?.location_type)}</dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Koordinat</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {effectiveDetail && effectiveDetail.primary_lat !== null && effectiveDetail.primary_lng !== null
                      ? `${effectiveDetail.primary_lat}, ${effectiveDetail.primary_lng}`
                      : "-"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Radius Area</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {effectiveDetail && effectiveDetail.viewport_radius_km !== null ? `${effectiveDetail.viewport_radius_km} km` : "-"}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
