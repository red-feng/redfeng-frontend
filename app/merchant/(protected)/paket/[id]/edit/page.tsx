import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import EditStep1Basic from "./EditStep1Basic"
import EditStep2Details from "./EditStep2Details"
import EditStep3Facilities from "./EditStep3Facilities"
import EditStep4Itinerary from "./EditStep4Itinerary"

type EditPackagePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string; error?: string }>
}

function getStepLabel(step: string) {
  if (step === "1") return "Basic Info"
  if (step === "2") return "Detail Konten"
  if (step === "3") return "Fasilitas"
  if (step === "4") return "Itinerary"
  return "Basic Info"
}

export default async function EditPackagePage({ params, searchParams }: EditPackagePageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const activeStep = ["1", "2", "3", "4"].includes(resolvedSearchParams.step || "")
    ? String(resolvedSearchParams.step)
    : "1"

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    return <div className="p-10">Data merchant tidak ditemukan.</div>
  }

  const [{ data: countries }, pkgWithPublishedResult] = await Promise.all([
    adminSupabase.from("countries").select("id, name").order("name"),
    adminSupabase
      .from("packages")
      .select("id, title, travel_style, departure_date, origin_country_id, origin_province, destination_country_id, destination_province, currency, minimal_peserta, duration, price_adult, price_child, status, default_language, published_languages")
      .eq("id", id)
      .eq("merchant_id", merchant.id)
      .single(),
  ])

  let pkg = pkgWithPublishedResult.data as {
    id: string
    title: string | null
    travel_style: string | null
    departure_date: string | null
    origin_country_id: string | null
    origin_province: string | null
    destination_country_id: string | null
    destination_province: string | null
    currency: string | null
    minimal_peserta: number | null
    duration: number | null
    price_adult: number | null
    price_child: number | null
    status: string | null
    default_language: string | null
    published_languages?: string[] | null
  } | null
  let packageError = pkgWithPublishedResult.error

  if (packageError && packageError.message.includes("published_languages")) {
    const legacyResult = await adminSupabase
      .from("packages")
      .select("id, title, travel_style, departure_date, origin_country_id, origin_province, destination_country_id, destination_province, currency, minimal_peserta, duration, price_adult, price_child, status, default_language")
      .eq("id", id)
      .eq("merchant_id", merchant.id)
      .single()

    pkg = legacyResult.data
      ? ({
          ...legacyResult.data,
          published_languages: [legacyResult.data.default_language || "id"],
        } as typeof pkg)
      : null
    packageError = legacyResult.error
  }

  if (packageError || !pkg) {
    return <div className="p-10">Paket tidak ditemukan atau tidak bisa diakses.</div>
  }

  const [translationsResult, detailsResult, tagsResult, facilitiesResult, selectedFacilitiesResult, itineraryResult] = await Promise.all([
    adminSupabase
      .from("package_translations")
      .select("language_code, about_tour, service_standard, include, exclude, preparation, terms_conditions")
      .eq("package_id", id),
    adminSupabase
      .from("package_details")
      .select("meeting_point, map_embed")
      .eq("package_id", id)
      .maybeSingle(),
    adminSupabase
      .from("package_tags")
      .select("tag")
      .eq("package_id", id),
    adminSupabase
      .from("facilities")
      .select("id, name")
      .order("category", { ascending: true }),
    adminSupabase
      .from("package_facilities")
      .select("facility_id")
      .eq("package_id", id),
    adminSupabase
      .from("package_itinerary_days")
      .select("day_number, package_itinerary_routes(pickup_time, route, description)")
      .eq("package_id", id)
      .order("day_number", { ascending: true }),
  ])

  const translations = Object.fromEntries(
    ((translationsResult.data || []) as Array<{
      language_code: string | null
      about_tour: string | null
      service_standard: string | null
      include: string | null
      exclude: string | null
      preparation: string | null
      terms_conditions: string | null
    }>).map((item) => [
      item.language_code || "id",
      {
        about_tour: item.about_tour || "",
        service_standard: item.service_standard || "",
        include: item.include || "",
        exclude: item.exclude || "",
        preparation: item.preparation || "",
        terms_conditions: item.terms_conditions || "",
      },
    ]),
  )

  const details = detailsResult.data || { meeting_point: "", map_embed: "" }
  const tags = ((tagsResult.data || []) as Array<{ tag: string | null }>).map((item) => item.tag).filter(Boolean).join(", ")
  const selectedFacilityIds = ((selectedFacilitiesResult.data || []) as Array<{ facility_id: string }>).map((item) => item.facility_id)
  const itineraryDays = ((itineraryResult.data || []) as Array<{
    day_number: number
    package_itinerary_routes: Array<{
      pickup_time: string | null
      route: string | null
      description: string | null
    }>
  }>).map((day) => ({
    day: day.day_number,
    description: day.package_itinerary_routes?.[0]?.description || "",
    routes: (day.package_itinerary_routes || []).map((route) => ({
      pickup_time: route.pickup_time || "",
      route: route.route || "",
    })),
  }))

  const stepItems = [
    { key: "1", label: "Step 1" },
    { key: "2", label: "Step 2" },
    { key: "3", label: "Step 3" },
    { key: "4", label: "Step 4" },
  ]

  return (
    <div className="min-h-screen p-6 md:p-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Paket</h1>
            <p className="mt-1 text-sm text-slate-500">
              Wizard edit paket merchant step 1 sampai 4 tanpa gambar sampul dan galeri.
            </p>
          </div>
          <Link
            href="/merchant/paket"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            Kembali ke Kelola Paket
          </Link>
        </div>
      </section>

      {resolvedSearchParams.error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      )}

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {stepItems.map((step) => (
            <Link
              key={step.key}
              href={`/merchant/paket/${id}/edit?step=${step.key}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeStep === step.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {step.label}
            </Link>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">{getStepLabel(activeStep)}</p>
          <p className="mt-1 text-sm text-slate-500">
            Setiap perubahan paket akan dikirim ulang ke admin untuk verifikasi.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        {activeStep === "1" && (
          <EditStep1Basic
            packageId={id}
            countries={(countries || []) as Array<{ id: string; name: string }>}
            initialData={{
              title: pkg.title || "",
              travel_style: pkg.travel_style || "",
              departure_date: pkg.departure_date || "",
              origin_country_id: pkg.origin_country_id || "",
              origin_province: pkg.origin_province || "",
              destination_country_id: pkg.destination_country_id || "",
              destination_province: pkg.destination_province || "",
              currency: pkg.currency || "IDR",
              minimal_peserta: pkg.minimal_peserta ?? 1,
              duration: pkg.duration ?? 1,
              price_adult: pkg.price_adult ?? 0,
              price_child: pkg.price_child ?? 0,
              default_language: pkg.default_language || "id",
              published_languages: pkg.published_languages || [pkg.default_language || "id"],
            }}
          />
        )}

        {activeStep === "2" && (
          <EditStep2Details
            packageId={id}
            defaultLanguage={pkg.default_language || "id"}
            initialTranslations={translations}
            meetingPoint={details.meeting_point || ""}
            mapEmbed={details.map_embed || ""}
            tags={tags}
          />
        )}

        {activeStep === "3" && (
          <EditStep3Facilities
            packageId={id}
            facilities={(facilitiesResult.data || []) as Array<{ id: string; name: string }>}
            selectedFacilityIds={selectedFacilityIds}
          />
        )}

        {activeStep === "4" && (
          <EditStep4Itinerary
            packageId={id}
            initialDays={itineraryDays}
          />
        )}
      </section>
    </div>
  )
}
