import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, rejectPackage } from "./actions"

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

  if (!pkg) return <div>Package tidak ditemukan</div>

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
  const countryMap = new Map(countries.map((c) => [c.id, c.name]))

  const { data: translation } = await supabase
    .from("package_translations")
    .select("*")
    .eq("package_id", id)
    .single()

  const { data: detail } = await supabase
    .from("package_details")
    .select("*")
    .eq("package_id", id)
    .single()

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

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "auto" }}>
      <h1 style={{ fontSize: 28 }}>{pkg.title}</h1>

      <p><strong>Status:</strong> {pkg.status}</p>
      <p><strong>Merchant:</strong> {merchant?.company_name}</p>
      <p><strong>Harga:</strong> {pkg.price_adult} {pkg.currency}</p>
      <p><strong>Harga Anak:</strong> {pkg.price_child} {pkg.currency}</p>
      <p><strong>Durasi:</strong> {pkg.duration} hari</p>
      <p><strong>Minimal Peserta:</strong> {pkg.minimal_peserta}</p>
      <p><strong>Travel Style:</strong> {pkg.travel_style || "-"}</p>
      <p><strong>Default Language:</strong> {pkg.default_language || "-"}</p>
      <p>
        <strong>Keberangkatan:</strong>{" "}
        {countryMap.get(pkg.origin_country_id) || "-"} - {pkg.origin_province || "-"}
      </p>
      <p>
        <strong>Tujuan:</strong>{" "}
        {countryMap.get(pkg.destination_country_id) || "-"} - {pkg.destination_province || "-"}
      </p>

      {pkg.cover_image && (
        <img
          src={pkg.cover_image}
          alt="cover"
          style={{ width: "100%", marginTop: 20, borderRadius: 12 }}
        />
      )}

      {galleryImages.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Gallery</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {galleryImages.map((image) => (
              <img
                key={image.id}
                src={image.image_url}
                alt="gallery"
                style={{ width: "100%", borderRadius: 8 }}
              />
            ))}
          </div>
        </>
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>Deskripsi</h2>
      <p>{translation?.about_tour}</p>

      <h3>Standar Layanan</h3>
      <p>{translation?.service_standard}</p>

      <h3>Include</h3>
      <p>{translation?.include}</p>

      <h3>Exclude</h3>
      <p>{translation?.exclude}</p>

      <h3>Persiapan</h3>
      <p>{translation?.preparation}</p>

      <h3>Syarat & Ketentuan</h3>
      <p>{translation?.terms_conditions}</p>

      <h3>Meeting Point</h3>
      <p>{detail?.meeting_point}</p>

      <h3>Map Embed</h3>
      <p>{detail?.map_embed || "-"}</p>

      <hr style={{ margin: "40px 0" }} />

      <h2>Fasilitas</h2>
      <ul>
        {facilities.map((f) => {
          const facilityName = Array.isArray(f.facilities)
            ? f.facilities[0]?.name
            : f.facilities?.name

          return <li key={f.facility_id}>{facilityName || "-"}</li>
        })}
      </ul>

      <hr style={{ margin: "40px 0" }} />

      <h2>Tags / Highlights</h2>
      <div>
        {tags.map((tag) => (
          <span
            key={tag.id}
            style={{
              display: "inline-block",
              background: "#eee",
              padding: "6px 12px",
              borderRadius: 20,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            {tag.tag}
          </span>
        ))}
      </div>

      <hr style={{ margin: "40px 0" }} />

      <h2>Itinerary</h2>
      {itineraryDays.map((day) => (
        <div key={day.id} style={{ marginBottom: 30 }}>
          <h3>Hari {day.day_number}</h3>
          {day.package_itinerary_routes.map((route) => (
            <div key={route.id} style={{ marginLeft: 20 }}>
              <p><strong>{route.pickup_time}</strong></p>
              <p>{route.route}</p>
              <p>{route.description}</p>
              <br />
            </div>
          ))}
        </div>
      ))}

      <hr style={{ margin: "40px 0" }} />

      <h2>Admin Decision</h2>

      <form
        action={async () => {
          "use server"
          await approvePackage(id)
        }}
      >
        <button
          style={{
            background: "green",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            marginRight: 10,
          }}
        >
          Approve
        </button>
      </form>

      <form
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
          style={{ width: "100%", marginTop: 20 }}
        />
        <button
          style={{
            background: "red",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            marginTop: 10,
          }}
        >
          Reject
        </button>
      </form>
    </div>
  )
}