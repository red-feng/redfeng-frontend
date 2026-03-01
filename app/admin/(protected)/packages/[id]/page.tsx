import { createAdminClient } from "@/lib/supabase/admin"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) {
    return <div>ID tidak ditemukan</div>
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .single()

  return (
    <div style={{ padding: 40 }}>
      <h1>DETAIL PACKAGE</h1>
      <p>ID: {id}</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}