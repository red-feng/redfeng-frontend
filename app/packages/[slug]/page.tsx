import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Image from "next/image"
import Gallery from "./Gallery"

export const dynamic = "force-dynamic"

type PackageRow = {
  id: string
  slug: string
  title: string | null
  duration: number | null
  minimal_peserta: number | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  travel_style: string | null
  default_language: string | null
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
  package_itinerary_routes: ItineraryRouteRow[]
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function formatMoney(value: number | null, currency: string | null): string {
  const safeValue = value ?? 0
  const safeCurrency = currency || "IDR"
  return `${safeCurrency} ${safeValue.toLocaleString("id-ID")}`
}

function getFacilityName(relation: PackageFacilityRow["facilities"]): string {
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation?.name || "-"
}

export default async function PaketPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const supabase = await createClient()

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
      .eq("slug", candidate)
      .eq("status", "approved")
      .maybeSingle()

    if (result.data) {
      pkg = result.data as PackageRow
      error = null
      break
    }

    error = result.error
  }

  if (!pkg) {
    const suffix = rawSlug.match(/([a-z0-9]{6,})$/i)?.[1]
    if (suffix) {
      const fallback = await supabase
        .from("packages")
        .select(`
          id,
          slug,
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

      pkg = fallback.data as PackageRow | null
      error = fallback.error
    }
  }

  if (error || !pkg) return notFound()

  const { data: translation } = await supabase
    .from("package_translations")
    .select("title, description, about_tour, service_standard, include, exclude, preparation, terms_conditions")
    .eq("package_id", pkg.id)
    .limit(1)
    .maybeSingle()

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
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={coverImage}
          alt={displayTitle}
          width={1600}
          height={900}
          unoptimized
          className="h-[240px] w-full object-cover md:h-[420px]"
        />
        <div className="p-5 md:p-6">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{displayTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {countryMap.get(pkg.origin_country_id || "") || "-"} - {pkg.origin_province || "-"} to{" "}
            {countryMap.get(pkg.destination_country_id || "") || "-"} - {pkg.destination_province || "-"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              Style: {pkg.travel_style || "-"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              Language: {pkg.default_language || "-"}
            </span>
          </div>
        </div>
      </section>

      {galleryImages.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gallery</h2>
          <div className="mt-4">
            <Gallery images={galleryImages} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Detail Konten</h2>
        <div className="mt-5 space-y-5 text-sm leading-7 text-slate-700">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Deskripsi</h3>
            <p className="whitespace-pre-line">{translation?.about_tour || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Standar Layanan</h3>
            <p className="whitespace-pre-line">{translation?.service_standard || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Include</h3>
            <p className="whitespace-pre-line">{translation?.include || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Exclude</h3>
            <p className="whitespace-pre-line">{translation?.exclude || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Persiapan</h3>
            <p className="whitespace-pre-line">{translation?.preparation || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Syarat & Ketentuan</h3>
            <p className="whitespace-pre-line">{translation?.terms_conditions || "-"}</p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Meeting Point</h3>
            <p className="whitespace-pre-line">{detail?.meeting_point || "-"}</p>
          </div>
        </div>

        {detail?.map_embed && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Map</h3>
            <div
              className="overflow-hidden rounded-xl border border-slate-200"
              dangerouslySetInnerHTML={{ __html: detail.map_embed }}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Tags / Highlights</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.length === 0 && <span className="text-sm text-slate-500">Tidak ada tags.</span>}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
        <div className="mt-5 space-y-5">
          {itineraryDays.length === 0 && (
            <p className="text-sm text-slate-500">Itinerary belum tersedia.</p>
          )}
          {itineraryDays.map((day) => (
            <div key={day.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Hari {day.day_number}</h3>
              <div className="mt-3 space-y-3">
                {day.package_itinerary_routes.length === 0 && (
                  <p className="text-sm text-slate-500">Rute belum tersedia.</p>
                )}
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
  )
}
