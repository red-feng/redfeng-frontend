import { createAdminClient } from "@/lib/supabase/admin"

export default async function PackageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", params.id)

  return (
    <div style={{ padding: 40 }}>
      <h1>DEBUG PACKAGE</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  )
}