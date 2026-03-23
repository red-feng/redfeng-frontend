import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, deletePackage, rejectPackage } from "./actions"
import Image from "next/image"
import { formatTravelStyleLabel } from "@/lib/travelStyles"
import AdminPackageReviewTabs from "./AdminPackageReviewTabs"

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

function formatMoney(value: number | null, currency: string | null): string {
  const safeValue = value ?? 0
  const safeCurrency = currency || "IDR"
  return `${safeCurrency} ${safeValue.toLocaleString("id-ID")}`
}

function statusClass(status: string | null): string {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700"
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
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

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .single()

  if (!pkg) return <div className="p-8">Paket tidak ditemukan</div>

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
    .eq("package_id", id)
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
    .eq("package_id", id)
    .maybeSingle()

  const { data: galleryData } = await supabase
    .from("package_images")
    .select("id, image_url")
    .eq("package_id", id)
  const galleryImages = (galleryData as GalleryRow[] | null) || []

  const { data: facilitiesData } = await supabase
    .from("package_facilities")
    .select(`
      facility_id,
      facilities ( name )
    `)
    .eq("package_id", id)
  const facilities = (facilitiesData as PackageFacilityRow[] | null) || []

  const { data: tagsData } = await supabase
    .from("package_tags")
    .select("*")
    .eq("package_id", id)
  const tags = (tagsData as TagRow[] | null) || []

  const { data: itineraryDaysData } = await supabase
    .from("package_itinerary_days")
    .select(`
      *,
      package_itinerary_routes (*)
    `)
    .eq("package_id", id)
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
    Array.isArray(pkg.published_languages) && pkg.published_languages.length > 0
      ? pkg.published_languages.map((code: string) => getLanguageLabel(code)).join(", ")
      : getLanguageLabel(pkg.default_language)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#f8fafc_100%)] px-8 py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                  Tinjauan Paket Admin
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {primaryTranslation?.title || pkg.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Merchant: {merchant?.company_name || "-"} | ID Paket: {pkg.id}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{statusSummary(pkg.status)}</p>
              </div>

              <div className="flex flex-col items-start gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(pkg.status)}`}>
                  {formatStatusLabel(pkg.status)}
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Bahasa Review
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{publishedLanguageLabels}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-8 py-5 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                <Image
                  src={coverImage}
                  alt="cover"
                  width={1600}
                  height={900}
                  unoptimized
                  className="h-[360px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">Hero Preview</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {primaryTranslation?.title || pkg.title}
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
                <div className="flex items-center justify-between gap-3">
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
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {galleryImages.map((image) => (
                    <Image
                      key={image.id}
                      src={image.image_url}
                      alt="gallery"
                      width={800}
                      height={600}
                      unoptimized
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            <AdminPackageReviewTabs
              detailContent={{
                title: primaryTranslation?.title || pkg.title || "-",
                about_tour: primaryTranslation?.about_tour || null,
                meeting_point: primaryTranslation?.meeting_point || detail?.meeting_point || null,
                service_standard: primaryTranslation?.service_standard || null,
                include: primaryTranslation?.include || null,
                exclude: primaryTranslation?.exclude || null,
                highlights:
                  primaryTranslation?.highlights ||
                  (tags.length > 0 ? tags.map((tag) => tag.tag).join(", ") : null),
                preparation: primaryTranslation?.preparation || null,
                terms_conditions: primaryTranslation?.terms_conditions || null,
                map_embed: detail?.map_embed || null,
              }}
              translations={sortedTranslations.map((translation) => ({
                ...translation,
                meeting_point: translation.meeting_point || detail?.meeting_point || null,
                highlights: translation.highlights || null,
              }))}
              defaultLanguage={pkg.default_language}
              publishedLanguages={availableLanguageCodes}
              fallbackTitle={pkg.title}
              facilities={facilities.map((facility) => ({
                id: facility.facility_id,
                rawName: getFacilityName(facility.facilities),
              }))}
              tags={tags.map((tag) => ({
                id: tag.id,
                label: tag.tag,
              }))}
              itineraryDays={itineraryDays.map((day) => ({
                id: day.id,
                day_number: day.day_number,
                translations: Object.fromEntries(
                  availableLanguageCodes.map((languageCode) => [
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

          <aside className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
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

                <form
                  className="mt-4"
                  action={async () => {
                    "use server"
                    await approvePackage(id)
                  }}
                >
                  <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Setujui Paket
                  </button>
                </form>

                <form
                  className="mt-4"
                  action={async (formData) => {
                    "use server"
                    const reason = formData.get("reason") as string
                    await rejectPackage(id, reason)
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
                    Tolak Paket
                  </button>
                </form>

                <form
                  className="mt-4"
                  action={async () => {
                    "use server"
                    await deletePackage(id)
                  }}
                >
                  <button className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                    Hapus Permanen dari Database
                  </button>
                </form>
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
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
