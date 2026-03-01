import { createAdminClient } from "@/lib/supabase/admin"

export default async function PackageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createAdminClient()

  const { data: pkg } = await supabase
    .from("packages")
    .select("*")
    .eq("id", params.id)
    .single()

  const { data: translation } = await supabase
    .from("package_translations")
    .select("*")
    .eq("package_id", params.id)
    .single()

  const { data: details } = await supabase
    .from("package_details")
    .select("*")
    .eq("package_id", params.id)
    .single()

  const { data: facilities } = await supabase
    .from("package_facilities")
    .select("facility_id")

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-bold">{pkg?.title}</h1>

      <p>Status: {pkg?.status}</p>
      <p>Harga Dewasa: {pkg?.price_adult}</p>
      <p>Negara: {pkg?.country}</p>

      <hr />

      <h2 className="text-xl font-semibold">Deskripsi</h2>
      <p>{translation?.about_tour}</p>

      <h2 className="text-xl font-semibold">Include</h2>
      <p>{translation?.include}</p>

      <h2 className="text-xl font-semibold">Exclude</h2>
      <p>{translation?.exclude}</p>

      <h2 className="text-xl font-semibold">Meeting Point</h2>
      <p>{details?.meeting_point}</p>
    </div>
  )
}