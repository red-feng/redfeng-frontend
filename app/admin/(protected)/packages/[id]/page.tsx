import { createAdminClient } from "@/lib/supabase/admin"

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

  return (
    <div style={{ padding: 40 }}>
      <h1>{pkg?.title}</h1>
      <p>Status: {pkg?.status}</p>
      <p>Harga: {pkg?.price_adult} {pkg?.currency}</p>
      <p>Durasi: {pkg?.duration} hari</p>
      <p>Lokasi: {pkg?.country} - {pkg?.city}</p>

      {pkg?.cover_image && (
        <img
          src={pkg.cover_image}
          alt="cover"
          style={{ width: 400, marginTop: 20 }}
        />
      )}

      <hr />

      <h2>Deskripsi</h2>
      <p>{translation?.about_tour}</p>

      <h3>Include</h3>
      <p>{translation?.include}</p>

      <h3>Exclude</h3>
      <p>{translation?.exclude}</p>

      <hr />

      <h2>Meeting Point</h2>
      <p>{detail?.meeting_point}</p>
    </div>
  )
}