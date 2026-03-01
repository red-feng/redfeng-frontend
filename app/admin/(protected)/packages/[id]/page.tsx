import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"

export default async function PackageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createAdminClient()

  const packageId = params.id

  // STEP 1 DATA
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .single()

  if (pkgError || !pkg) {
    return notFound()
  }

  // STEP 2 DATA
  const { data: translation } = await supabase
    .from("package_translations")
    .select("*")
    .eq("package_id", packageId)
    .eq("language_code", pkg.default_language)
    .single()

  const { data: details } = await supabase
    .from("package_details")
    .select("*")
    .eq("package_id", packageId)
    .single()

  // STEP 3
  const { data: facilities } = await supabase
    .from("package_facilities")
    .select("facility_id")
    .eq("package_id", packageId)

  // STEP 4
  const { data: itineraryDays } = await supabase
    .from("package_itinerary_days")
    .select(`
      id,
      day_number,
      package_itinerary_routes (
        pickup_time,
        route,
        description
      )
    `)
    .eq("package_id", packageId)
    .order("day_number")

  return (
    <div className="p-10 space-y-10">

      <h1 className="text-3xl font-bold">
        Review Paket
      </h1>

      {/* ================= STEP 1 ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Basic Info</h2>

        <p><b>Title:</b> {pkg.title}</p>
        <p><b>Status:</b> {pkg.status}</p>
        <p><b>Country:</b> {pkg.country}</p>
        <p><b>City:</b> {pkg.city}</p>
        <p><b>Duration:</b> {pkg.duration} hari</p>
        <p><b>Price Adult:</b> {pkg.price_adult}</p>
        <p><b>Price Child:</b> {pkg.price_child}</p>

        {pkg.cover_image && (
          <img
            src={pkg.cover_image}
            alt="cover"
            className="mt-4 w-96 rounded-lg"
          />
        )}
      </div>

      {/* ================= STEP 2 ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Detail & Description</h2>

        <p><b>About Tour:</b></p>
        <p>{translation?.about_tour}</p>

        <p className="mt-4"><b>Include:</b></p>
        <p>{translation?.include}</p>

        <p className="mt-4"><b>Exclude:</b></p>
        <p>{translation?.exclude}</p>

        <p className="mt-4"><b>Meeting Point:</b></p>
        <p>{details?.meeting_point}</p>
      </div>

      {/* ================= STEP 3 ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Facilities</h2>

        {facilities?.length === 0 && <p>No facilities</p>}

        {facilities?.map((f, i) => (
          <p key={i}>Facility ID: {f.facility_id}</p>
        ))}
      </div>

      {/* ================= STEP 4 ================= */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Itinerary</h2>

        {itineraryDays?.map((day) => (
          <div key={day.id} className="mb-6">
            <h3 className="font-bold">
              Day {day.day_number}
            </h3>

            {day.package_itinerary_routes?.map((route, i) => (
              <div key={i} className="ml-4 mt-2">
                <p><b>Pickup:</b> {route.pickup_time}</p>
                <p><b>Route:</b> {route.route}</p>
                <p><b>Description:</b> {route.description}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}