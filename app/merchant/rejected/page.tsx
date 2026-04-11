import Link from "next/link"
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
    .select("rejection_reason, manager_rejection_reason, revision_deadline_at, verification_status, brand_name, company_name")
    .eq("user_id", user.id)
    .single()

  const reviewReason = merchant?.manager_rejection_reason || merchant?.rejection_reason || "Tidak ada alasan."
  const status = String(merchant?.verification_status || "").trim().toLowerCase()
  const deadlineAt = merchant?.revision_deadline_at || null
  const now = new Date()
  const deadlineDate = deadlineAt ? new Date(deadlineAt) : null
  const msRemaining = deadlineDate ? deadlineDate.getTime() - now.getTime() : null
  const isExpired = status === "expired" || (msRemaining !== null && msRemaining <= 0)
  const daysRemaining = msRemaining && msRemaining > 0 ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0
  const merchantLabel = merchant?.brand_name || merchant?.company_name || "Merchant"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f0e8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[36px] border border-orange-200/60 bg-white shadow-[0_28px_90px_rgba(146,64,14,0.12)]">
        <section className="bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_40%,#fb923c_100%)] px-8 py-10 text-white sm:px-10">
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Manager Decision
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            {isExpired ? "Batas revisi merchant sudah berakhir" : "Merchant ditolak manager dan perlu revisi"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/90">
            {isExpired
              ? `${merchantLabel} tidak menyelesaikan revisi dalam batas waktu yang diberikan. Akun ini tidak bisa melanjutkan onboarding lama.`
              : "Admin sudah mengajukan review, lalu operations manager meminta perbaikan data sebelum merchant dapat masuk ke dashboard partner Red Feng."}
          </p>
        </section>

        <section className="grid gap-6 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] px-8 py-10 sm:px-10 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[28px] border border-red-200 bg-white p-6 shadow-[0_20px_50px_rgba(127,29,29,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <span className="text-xl font-semibold">!</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Manager decision</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {isExpired ? "Revisi melewati tenggat" : "Manager meminta revisi data"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{isExpired ? "Expired" : "Revision requested by manager"}</p>
              </div>
              <div className={`rounded-[20px] border px-5 py-4 ${isExpired ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isExpired ? "text-rose-700" : "text-amber-700"}`}>
                  Batas revisi
                </p>
                <p className={`mt-2 text-sm font-semibold ${isExpired ? "text-rose-800" : "text-slate-900"}`}>
                  {deadlineDate ? deadlineDate.toLocaleString("id-ID") : "Belum tersedia"}
                </p>
                {!isExpired && deadlineDate ? <p className="mt-2 text-xs text-amber-800">Sisa waktu sekitar {daysRemaining} hari.</p> : null}
              </div>
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-900">Alasan final dari operations manager</p>
            <div className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800">
              {reviewReason}
            </div>

            {!isExpired ? (
              <form action={resubmitMerchant} className="mt-6">
                <button className="inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_42%,#fb923c_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(194,65,12,0.22)] transition hover:shadow-[0_18px_36px_rgba(194,65,12,0.28)]">
                  <span aria-hidden="true">{">"}</span>
                  Perbaiki data dan lanjutkan onboarding
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                Tenggat revisi sudah lewat. Merchant harus memulai registrasi ulang dari awal setelah akun lama dibersihkan oleh sistem.
              </div>
            )}
          </article>

          <aside className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Langkah berikutnya</p>
            {!isExpired ? (
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>Tinjau alasan final dari operations manager.</li>
                <li>Lengkapi atau perbaiki data yang diminta sebelum batas revisi berakhir.</li>
                <li>Masuk lagi ke onboarding, perbaiki data, lalu submit ulang agar admin bisa mengajukan review berikutnya ke manager.</li>
                <li>Jika lewat 7 hari tidak ada revisi, data merchant lama akan masuk flow penghapusan permanen.</li>
              </ul>
            ) : (
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>Flow onboarding lama sudah ditutup karena melewati batas revisi.</li>
                <li>Data merchant lama akan dijadwalkan untuk dihapus permanen oleh sistem.</li>
                <li>Setelah proses cleanup selesai, merchant harus registrasi dari awal.</li>
              </ul>
            )}
            <Link
              href="https://redfeng.co/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 transition hover:text-orange-800"
            >
              Kembali ke beranda
              <span aria-hidden="true">{">"}</span>
            </Link>
          </aside>
        </section>
      </div>
    </main>
  )
}
