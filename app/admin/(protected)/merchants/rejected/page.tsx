import { createClient } from "@/lib/supabase/server"
import { resubmitMerchant } from "./actions"

export default async function RejectedPage() {
  const supabase = await createClient("admin")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="px-4 py-10 text-sm text-slate-600 sm:px-6">Unauthorized</div>
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("rejection_reason")
    .eq("user_id", user.id)
    .single()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-rose-200 bg-[linear-gradient(135deg,#7f1d1d_0%,#b91c1c_38%,#ef4444_72%,#fca5a5_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(127,29,29,0.18)] sm:px-8 sm:py-8">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-50">
            Merchant Review
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Pengajuan Ditolak
          </h1>
          <p className="mt-3 text-sm leading-7 text-rose-50/90 sm:text-base">
            Tim admin menemukan beberapa bagian yang perlu diperbaiki sebelum merchant bisa diajukan ulang.
          </p>
        </section>

        <section className="rounded-[24px] border border-rose-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-600">Alasan penolakan</p>
          <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-slate-700">
            {merchant?.rejection_reason || "Tidak ada alasan."}
          </div>

          <form action={resubmitMerchant} className="mt-6">
            <button className="w-full rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto">
              Perbaiki & Ajukan Ulang
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
