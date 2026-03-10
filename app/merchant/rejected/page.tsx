import Link from "next/link"
import { AlertTriangle, ArrowRight, RotateCcw } from "lucide-react"
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_28px_90px_rgba(146,64,14,0.12)]">
        <section className="bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_40%,#fb923c_100%)] px-8 py-10 text-white sm:px-10">
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Merchant Review
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pengajuan merchant belum disetujui
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/90">
            Tim admin menemukan data yang perlu diperbaiki sebelum merchant dapat masuk ke dashboard
            partner Red Feng.
          </p>
        </section>

        <section className="grid gap-6 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-8 py-10 sm:px-10 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[28px] border border-red-200 bg-white p-6 shadow-[0_20px_50px_rgba(127,29,29,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Review result
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">Revisi data diperlukan</p>
              </div>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-900">Alasan penolakan</p>
            <div className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800">
              {merchant?.rejection_reason || "Tidak ada alasan."}
            </div>

            <form action={resubmitMerchant} className="mt-6">
              <button className="inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(194,65,12,0.22)] transition hover:shadow-[0_18px_36px_rgba(194,65,12,0.28)]">
                <RotateCcw className="h-4 w-4" />
                Perbaiki dan ajukan ulang
              </button>
            </form>
          </article>

          <aside className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              What to do next
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>Tinjau alasan penolakan dari tim admin.</li>
              <li>Lengkapi atau perbaiki data yang diminta.</li>
              <li>Ajukan ulang untuk masuk ke antrian review berikutnya.</li>
            </ul>
            <Link
              href="https://redfeng.co/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800"
            >
              Kembali ke beranda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  )
}
