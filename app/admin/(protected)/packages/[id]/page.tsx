import { createAdminClient } from "@/lib/supabase/admin"

export default async function Page(props: any) {
  const supabase = createAdminClient()

  const packageId = props.params?.id

  if (!packageId) {
    return <div>ID tidak ditemukan</div>
  }

  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .single()

  return (
    <div style={{ padding: 40 }}>
      <h1>DEBUG PACKAGE</h1>
      <p>ID: {packageId}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  )
}