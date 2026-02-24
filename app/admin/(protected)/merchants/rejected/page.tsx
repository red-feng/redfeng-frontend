import { createClient } from "@/lib/supabase/server"

export default async function RejectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from("merchants")
    .select("rejection_reason")
    .eq("user_id", user?.id)
    .single()

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold text-red-600">
        Pengajuan Ditolak
      </h1>

      <p className="mt-4">
        Alasan:
      </p>

      <div className="bg-red-50 p-4 mt-2 border">
        {merchant?.rejection_reason}
      </div>

      <a
        href="/merchant/onboarding"
        className="inline-block bg-blue-600 text-white px-4 py-2 mt-6"
      >
        Perbaiki & Ajukan Ulang
      </a>
    </div>
  )
}