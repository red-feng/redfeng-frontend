import { Building2, CheckCircle2, Clock3, Mail, Send, XCircle } from "lucide-react"
import { createClient } from '@/lib/supabase/server'
import { approveMerchant, rejectMerchant } from './actions'

export default async function AdminMerchantsPage() {
  const supabase = await createClient()

  const { data: merchants } = await supabase
    .from('merchants')
    .select('*')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Merchant Review
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Review partner merchant dengan tampilan yang lebih rapi.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Seluruh merchant yang sudah menyelesaikan onboarding dan upload dokumen akan masuk ke
                antrian ini untuk approval admin.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pending queue</p>
              <p className="mt-2 text-3xl font-semibold text-white">{merchants?.length ?? 0}</p>
              <p className="mt-1 text-sm text-orange-50/80">Merchant menunggu keputusan</p>
            </div>
          </div>
        </section>

        {!merchants?.length ? (
          <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-orange-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">Tidak ada merchant pending</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Semua pengajuan merchant yang selesai onboarding sudah diproses atau belum ada pengajuan baru.
            </p>
          </section>
        ) : (
          <section className="grid gap-6">
            {merchants.map((merchant) => (
              <article
                key={merchant.id}
                className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
              >
                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="border-b border-orange-100/80 p-7 lg:border-b-0 lg:border-r">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                            <Building2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              Merchant profile
                            </p>
                            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                              {merchant.brand_name || merchant.company_name || "Merchant tanpa nama"}
                            </h2>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                        <Clock3 className="h-4 w-4" />
                        Pending review
                      </span>
                    </div>

                    <div className="mt-7 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Email
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Mail className="h-4 w-4 text-orange-700" />
                          {merchant.email || "-"}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Company
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-800">
                          {merchant.company_name || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          NIB
                        </p>
                        <p className="mt-2 text-sm text-slate-800">{merchant.nib || "-"}</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          NPWP
                        </p>
                        <p className="mt-2 text-sm text-slate-800">{merchant.npwp || "-"}</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Onboarding
                        </p>
                        <p className="mt-2 text-sm text-slate-800">
                          Step {merchant.onboarding_step ?? "-"} / completed: {merchant.onboarding_completed ? 'yes' : 'no'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] p-7">
                    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                        Approve merchant
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Setujui merchant jika data bisnis dan dokumen sudah sesuai standar internal Red Feng.
                      </p>
                      <form action={approveMerchant} className="mt-5">
                        <input type="hidden" name="merchantId" value={merchant.id} />
                        <button className="inline-flex items-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Approve merchant
                        </button>
                      </form>
                    </div>

                    <div className="rounded-[24px] border border-red-200 bg-red-50/80 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                        Reject merchant
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Berikan alasan yang jelas agar merchant dapat memperbaiki dan mengajukan ulang.
                      </p>
                      <form action={rejectMerchant} className="mt-5 space-y-4">
                        <input type="hidden" name="merchantId" value={merchant.id} />
                        <textarea
                          name="reason"
                          placeholder="Tuliskan alasan penolakan dengan jelas..."
                          required
                          className="min-h-[132px] w-full rounded-[18px] border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        />
                        <button className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.22)] transition hover:bg-red-700">
                          <XCircle className="h-4 w-4" />
                          Reject merchant
                        </button>
                      </form>
                    </div>

                    <div className="rounded-[24px] border border-orange-100 bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Review note
                      </p>
                      <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-slate-600">
                        <Send className="mt-1 h-4 w-4 text-orange-700" />
                        Merchant yang ditolak akan diarahkan ke halaman revisi dan bisa submit ulang ke antrian review.
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
