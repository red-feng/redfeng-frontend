import { createAdminClient } from "@/lib/supabase/admin"
import { approvePackage, rejectPackage } from "./actions"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  // ===============================
  // MAIN PACKAGE
  // ===============================
  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .single()

  if (!pkg) return <div>Package tidak ditemukan</div>

  // ===============================
  // MERCHANT
  // ===============================
  const { data: merchant } = await supabase
    .from("merchants")
    .select("company_name")
    .eq("id", pkg.merchant_id)
    .single()

  // ===============================
  // TRANSLATION
  // ===============================
  const { data: translation } = await supabase
    .from("package_translations")
    .select("*")
    .eq("package_id", id)
    .single()

  // ===============================
  // DETAIL
  // ===============================
  const { data: detail } = await supabase
    .from("package_details")
    .select("*")
    .eq("package_id", id)
    .single()

  // ===============================
  // FACILITIES
  // ===============================
  const { data: facilities } = await supabase
    .from("package_facilities")
    .select(`
      facility_id,
      facilities ( name )
    `)
    .eq("package_id", id)

  // ===============================
  // TAGS
  // ===============================
  const { data: tags } = await supabase
    .from("package_tags")
    .select("*")
    .eq("package_id", id)

  // ===============================
  // ITINERARY
  // ===============================
  const { data: itineraryDays } = await supabase
    .from("package_itinerary_days")
    .select(`
      *,
      package_itinerary_routes (*)
    `)
    .eq("package_id", id)
    .order("day_number", { ascending: true })

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "auto" }}>

      {/* ================= BASIC INFO ================= */}
      <h1 style={{ fontSize: 28 }}>{pkg.title}</h1>

      <p><strong>Status:</strong> {pkg.status}</p>
      <p><strong>Merchant:</strong> {merchant?.company_name}</p>
      <p><strong>Harga:</strong> {pkg.price_adult} {pkg.currency}</p>
      <p><strong>Durasi:</strong> {pkg.duration} hari</p>
      <p><strong>Minimal Peserta:</strong> {pkg.minimal_peserta}</p>
      <p><strong>Lokasi:</strong> {pkg.country} - {pkg.city}</p>

      {pkg.cover_image && (
        <img
          src={pkg.cover_image}
          alt="cover"
          style={{ width: "100%", marginTop: 20, borderRadius: 12 }}
        />
      )}

      <hr style={{ margin: "40px 0" }} />

      {/* ================= DETAIL CONTENT ================= */}
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

      <hr style={{ margin: "40px 0" }} />

      {/* ================= FACILITIES ================= */}
      <h2>Fasilitas</h2>
      <ul>
        {facilities?.map((f: any) => (
          <li key={f.facility_id}>{f.facilities.name}</li>
        ))}
      </ul>

      <hr style={{ margin: "40px 0" }} />

      {/* ================= TAGS ================= */}
      <h2>Tags / Highlights</h2>
      <div>
        {tags?.map((tag: any) => (
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

      {/* ================= ITINERARY ================= */}
      <h2>Itinerary</h2>

      {itineraryDays?.map((day: any) => (
        <div key={day.id} style={{ marginBottom: 30 }}>
          <h3>Hari {day.day_number}</h3>

          {day.package_itinerary_routes.map((route: any) => (
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

      {/* ================= APPROVAL SECTION ================= */}
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