import { createClient } from "@/lib/supabase/server"
import { resubmitMerchant } from "./actions"

export default async function RejectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Unauthorized</div>
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("rejection_reason")
    .eq("user_id", user.id)
    .single()

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold text-red-600">
        Pengajuan Ditolak
      </h1>

      <p className="mt-4 font-semibold">Alasan Penolakan:</p>

      <div className="bg-red-50 border p-4 mt-2">
        {merchant?.rejection_reason || "Tidak ada alasan."}
      </div>

      <form action={resubmitMerchant} className="mt-6">
        <button className="bg-blue-600 text-white px-4 py-2">
          Perbaiki & Ajukan Ulang
        </button>
      </form>
    </div>
  )
}