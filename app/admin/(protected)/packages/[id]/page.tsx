import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, rejectPackage } from "./actions"
import Image from "next/image"
import { formatTravelStyleLabel } from "@/lib/travelStyles"

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
}

function formatMoney(value: number | null, currency: string | null): string {
  const safeValue = value ?? 0
  const safeCurrency = currency || "IDR"
  return `${safeCurrency} ${safeValue.toLocaleString("id-ID")}`
}

function statusClass(status: string | null): string {
  if (status === "approved") return "bg-emerald-100 text-emerald-700 border-emerald-200"
  if (status === "rejected") return "bg-rose-100 text-rose-700 border-rose-200"
  if (status === "pending") return "bg-amber-100 text-amber-700 border-amber-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
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
    .select("language_code, title, about_tour, service_standard, include, exclude, preparation, terms_conditions")
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

  const coverImage = pkg.cover_image || galleryImages[0]?.image_url || "/placeholder.png"
  const publishedLanguageLabels =
    Array.isArray(pkg.published_languages) && pkg.published_languages.length > 0
      ? pkg.published_languages.map((code: string) => getLanguageLabel(code)).join(", ")
      : getLanguageLabel(pkg.default_language)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tinjauan Paket Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {primaryTranslation?.title || pkg.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Merchant: {merchant?.company_name || "-"} • ID Paket: {pkg.id}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(pkg.status)}`}>
            {formatStatusLabel(pkg.status)}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Image
                src={coverImage}
                alt="cover"
                width={1600}
                height={900}
                unoptimized
                className="h-[360px] w-full object-cover"
              />
              <div className="grid gap-4 border-t border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Harga Dewasa</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(pkg.price_adult, pkg.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Harga Anak</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(pkg.price_child, pkg.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durasi</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{pkg.duration || 0} hari</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minimal Peserta</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{pkg.minimal_peserta || 0} orang</p>
                </div>
              </div>
            </section>

            {galleryImages.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Galeri</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {galleryImages.map((image) => (
                    <Image
                      key={image.id}
                      src={image.image_url}
                      alt="gallery"
                      width={800}
                      height={600}
                      unoptimized
                      className="h-36 w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Detail Konten</h2>
              <div className="mt-5 space-y-5">
                {sortedTranslations.length === 0 && (
                  <p className="text-sm text-slate-500">Konten terjemahan belum tersedia.</p>
                )}

                {sortedTranslations.map((translation) => (
                  <div key={translation.language_code || "unknown"} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Konten Bahasa {getLanguageLabel(translation.language_code)}
                      </h3>
                      {translation.language_code === pkg.default_language && (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          Bahasa Default
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-5 text-sm leading-7 text-slate-700">
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Judul Paket</h4>
                        <p className="whitespace-pre-line">{translation.title || pkg.title || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Info Tentang Tour</h4>
                        <p className="whitespace-pre-line">{translation.about_tour || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Standar Layanan Merchant</h4>
                        <p className="whitespace-pre-line">{translation.service_standard || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Include</h4>
                        <p className="whitespace-pre-line">{translation.include || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Exclude</h4>
                        <p className="whitespace-pre-line">{translation.exclude || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Peralatan & Dokumen yang Disiapkan Peserta</h4>
                        <p className="whitespace-pre-line">{translation.preparation || "-"}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 text-sm font-semibold text-slate-900">Syarat & Ketentuan saat di Lokasi</h4>
                        <p className="whitespace-pre-line">{translation.terms_conditions || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">Meeting Point</h3>
                  <p className="text-sm text-slate-700">{detail?.meeting_point || "-"}</p>
                </div>
              </div>

              {detail?.map_embed && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Preview Peta Titik Penjemputan</h3>
                  <div
                    className="overflow-hidden rounded-xl border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: detail.map_embed }}
                  />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Fasilitas</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {facilities.length === 0 && (
                  <span className="text-sm text-slate-500">Tidak ada fasilitas.</span>
                )}
                {facilities.map((facility) => (
                  <span
                    key={facility.facility_id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    {getFacilityName(facility.facilities)}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Tag / Sorotan</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.length === 0 && <span className="text-sm text-slate-500">Tidak ada tag.</span>}
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white"
                  >
                    {tag.tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
              <div className="mt-5 space-y-5">
                {itineraryDays.length === 0 && (
                  <p className="text-sm text-slate-500">Itinerary belum tersedia.</p>
                )}
                {itineraryDays.map((day) => (
                  <div key={day.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-base font-semibold text-slate-900">
                      Hari {day.day_number}{day.day_title ? ` - ${day.day_title}` : ""}
                    </h3>
                    <div className="mt-3 space-y-3">
                      {day.package_itinerary_routes.map((route) => (
                        <div key={route.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{route.pickup_time || "-"}</p>
                          <p className="mt-1 text-sm text-slate-700">{route.route || "-"}</p>
                          <p className="mt-1 text-sm text-slate-500">{route.description || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Keputusan Admin</h2>
              <p className="mt-1 text-sm text-slate-500">
                Verifikasi detail paket sebelum disetujui atau ditolak.
              </p>

              <form
                className="mt-4"
                action={async () => {
                  "use server"
                  await approvePackage(id)
                }}
              >
                <button className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  Setujui Paket
                </button>
              </form>

              <form
                className="mt-3"
                action={async (formData) => {
                  "use server"
                  const reason = formData.get("reason") as string
                  await rejectPackage(id, reason)
                }}
              >
                <textarea
                  name="reason"
                  placeholder="Alasan penolakan..."
                  required
                  className="h-28 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
                <button className="mt-2 w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
                  Tolak Paket
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Ringkasan Cepat</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Gaya Perjalanan</dt>
                  <dd className="font-medium text-slate-900">{formatTravelStyleLabel(pkg.travel_style)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Bahasa Default</dt>
                  <dd className="font-medium text-slate-900">{getLanguageLabel(pkg.default_language)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Bahasa Tersedia</dt>
                  <dd className="font-medium text-slate-900">{publishedLanguageLabels}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Keberangkatan</dt>
                  <dd className="font-medium text-slate-900">
                    {countryMap.get(pkg.origin_country_id) || "-"} - {pkg.origin_province || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tujuan</dt>
                  <dd className="font-medium text-slate-900">
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
