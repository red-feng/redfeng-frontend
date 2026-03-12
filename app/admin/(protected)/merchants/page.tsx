import { createClient } from "@/lib/supabase/server"
import {
  approveMerchant,
  deactivateMerchant,
  deleteMerchant,
  reactivateMerchant,
  rejectMerchant,
} from "./actions"

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
  nib: string | null
  npwp: string | null
  onboarding_step: number | null
  onboarding_completed: boolean | null
  verification_status: string | null
  rejection_reason: string | null
  created_at: string | null
}

function getStatusBadge(status: string | null) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "inactive") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "deleted") return "border-red-200 bg-red-50 text-red-700"
  return "border-slate-200 bg-slate-100 text-slate-600"
}

function getStatusLabel(status: string | null) {
  if (status === "approved") return "Aktif"
  if (status === "inactive") return "Nonaktif sementara"
  if (status === "deleted") return "Dihapus"
  return status || "Tidak diketahui"
}

export default async function AdminMerchantsPage() {
  const supabase = await createClient()

  const [{ data: pendingMerchants }, { data: managedMerchants }] = await Promise.all([
    supabase
      .from("merchants")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("merchants")
      .select("*")
      .in("verification_status", ["approved", "inactive", "deleted"])
      .order("created_at", { ascending: false }),
  ])

  const pending = (pendingMerchants || []) as MerchantRow[]
  const managed = (managedMerchants || []) as MerchantRow[]
  const activeMerchants = managed.filter((merchant) => merchant.verification_status === "approved")

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
                Review merchant baru dan kelola merchant aktif dari satu halaman.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Admin dapat approve merchant baru, menonaktifkan merchant aktif sementara, lalu
                menghapus akses merchant tanpa menyentuh data transaksi historis.
              </p>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pending queue</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pending.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Merchant aktif</p>
                <p className="mt-2 text-3xl font-semibold text-white">{activeMerchants.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600">Pending approvals</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Antrian merchant baru</h2>
            </div>
            <p className="text-sm text-slate-500">Hanya merchant `pending` yang muncul di area approval.</p>
          </div>

          {!pending.length ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-orange-700">
                <span className="text-2xl font-semibold">OK</span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">Tidak ada merchant pending</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Semua pengajuan merchant yang selesai onboarding sudah diproses atau belum ada pengajuan baru.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {pending.map((merchant) => (
                <article
                  key={merchant.id}
                  className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="border-b border-orange-100/80 p-7 lg:border-b-0 lg:border-r">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                            <span className="text-xl font-semibold">M</span>
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
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                          Pending review
                        </span>
                      </div>

                      <div className="mt-7 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{merchant.email || "-"}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Company</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{merchant.company_name || "-"}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">NIB</p>
                          <p className="mt-2 text-sm text-slate-800">{merchant.nib || "-"}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">NPWP</p>
                          <p className="mt-2 text-sm text-slate-800">{merchant.npwp || "-"}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Onboarding</p>
                          <p className="mt-2 text-sm text-slate-800">
                            Step {merchant.onboarding_step ?? "-"} / completed:{" "}
                            {merchant.onboarding_completed ? "yes" : "no"}
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
                            Reject merchant
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Merchant controls</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Merchant aktif, nonaktif, dan hapus</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              `Nonaktif sementara` memblok akses merchant ke dashboard. `Hapus merchant` di sini adalah soft delete:
              akses merchant dihentikan, tetapi histori booking dan payout tidak dihapus dari database.
            </p>
          </div>

          {!managed.length ? (
            <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold text-slate-950">Belum ada merchant aktif</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Merchant yang sudah approved akan muncul di sini untuk kontrol operasional admin.
              </p>
            </section>
          ) : (
            <section className="grid gap-6">
              {managed.map((merchant) => (
                <article
                  key={merchant.id}
                  className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold text-slate-950">
                          {merchant.brand_name || merchant.company_name || "Merchant tanpa nama"}
                        </h3>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusBadge(merchant.verification_status)}`}
                        >
                          {getStatusLabel(merchant.verification_status)}
                        </span>
                      </div>
                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <p>Email: <span className="font-medium text-slate-800">{merchant.email || "-"}</span></p>
                        <p>Company: <span className="font-medium text-slate-800">{merchant.company_name || "-"}</span></p>
                        <p>NIB: <span className="font-medium text-slate-800">{merchant.nib || "-"}</span></p>
                        <p>NPWP: <span className="font-medium text-slate-800">{merchant.npwp || "-"}</span></p>
                      </div>
                      {merchant.rejection_reason ? (
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Catatan admin: {merchant.rejection_reason}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 lg:min-w-[360px]">
                      {merchant.verification_status === "approved" ? (
                        <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                            Nonaktif sementara
                          </p>
                          <form action={deactivateMerchant} className="mt-4 space-y-4">
                            <input type="hidden" name="merchantId" value={merchant.id} />
                            <textarea
                              name="reason"
                              placeholder="Alasan nonaktif sementara, opsional..."
                              className="min-h-[96px] w-full rounded-[18px] border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                            />
                            <button className="inline-flex items-center gap-2 rounded-[18px] bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                              Nonaktif sementara
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {merchant.verification_status === "inactive" ? (
                        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                            Aktifkan kembali
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Merchant akan kembali bisa login dan mengakses workspace merchant.
                          </p>
                          <form action={reactivateMerchant} className="mt-4">
                            <input type="hidden" name="merchantId" value={merchant.id} />
                            <button className="inline-flex items-center gap-2 rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                              Aktifkan merchant
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {merchant.verification_status !== "deleted" ? (
                        <div className="rounded-[24px] border border-red-200 bg-red-50/80 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-700">
                            Hapus merchant
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            Gunakan hanya jika merchant harus dicabut permanen dari akses sistem.
                          </p>
                          <form action={deleteMerchant} className="mt-4 space-y-4">
                            <input type="hidden" name="merchantId" value={merchant.id} />
                            <textarea
                              name="reason"
                              placeholder="Alasan penghapusan merchant..."
                              required
                              className="min-h-[96px] w-full rounded-[18px] border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                            />
                            <button className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700">
                              Hapus merchant
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
