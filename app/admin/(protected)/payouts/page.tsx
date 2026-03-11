import { createAdminClient } from "@/lib/supabase/admin"
import { updatePayoutStatus } from "./actions"

type PayoutRow = {
  id: string
  merchant_id: string
  amount: number | null
  status: string | null
  note: string | null
  requested_at: string | null
  processed_at: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusTone(status: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (normalized === "processing") return "bg-sky-50 text-sky-700 border-sky-200"
  if (normalized === "paid" || normalized === "completed") return "bg-violet-50 text-violet-700 border-violet-200"
  if (normalized === "rejected" || normalized === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()

  const { data: payoutsData, error } = await adminSupabase
    .from("payout_requests")
    .select("id, merchant_id, amount, status, note, requested_at, processed_at, bank_name, bank_account_number, bank_account_holder")
    .order("requested_at", { ascending: false })

  const payouts = (payoutsData as PayoutRow[] | null) || []
  const merchantIds = Array.from(new Set(payouts.map((item) => item.merchant_id).filter(Boolean)))

  const { data: merchantsData } =
    merchantIds.length > 0
      ? await adminSupabase
          .from("merchants")
          .select("id, brand_name, company_name, email")
          .in("id", merchantIds)
      : { data: [] as MerchantRow[] }

  const merchantMap = new Map(((merchantsData as MerchantRow[] | null) || []).map((merchant) => [merchant.id, merchant]))

  const pendingCount = payouts.filter((item) => normalizeStatus(item.status) === "pending").length
  const processingCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    return status === "approved" || status === "processing"
  }).length
  const paidTotal = payouts
    .filter((item) => {
      const status = normalizeStatus(item.status)
      return status === "paid" || status === "completed"
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const pendingTotal = payouts
    .filter((item) => {
      const status = normalizeStatus(item.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Payout Control
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Kelola approval payout merchant setelah pickup tervalidasi.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Semua dana customer tetap masuk ke escrow Red Feng. Payout baru boleh diproses penuh setelah
                merchant klik <span className="font-semibold">Tiba</span>, merchant klik{" "}
                <span className="font-semibold">Dijemput</span>, dan customer klik{" "}
                <span className="font-semibold">Sudah dijemput</span>.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Payout snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Request pending</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Sedang diproses</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{processingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Nominal menunggu transfer</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatMoney(pendingTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Nominal sudah dibayar</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatMoney(paidTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {params.success}
          </div>
        )}

        {params.error && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        )}

        {error ? (
          <section className="rounded-[30px] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            Gagal memuat data payout request.
          </section>
        ) : !payouts.length ? (
          <section className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-2xl font-semibold text-slate-950">Belum ada payout request</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Merchant baru bisa mengajukan payout ketika booking sudah berstatus ready for payout.
            </p>
          </section>
        ) : (
          <section className="grid gap-6">
            {payouts.map((payout) => {
              const merchant = merchantMap.get(payout.merchant_id)
              const merchantName = merchant?.brand_name || merchant?.company_name || "Merchant tanpa nama"
              const isFinal = ["paid", "completed", "rejected"].includes(normalizeStatus(payout.status))

              return (
                <article
                  key={payout.id}
                  className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="border-b border-orange-100/80 p-7 lg:border-b-0 lg:border-r">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                            Payout request
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{merchantName}</h2>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {merchant?.email || "Email merchant belum tersedia"}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${statusTone(payout.status)}`}>
                          {titleCaseStatus(payout.status)}
                        </span>
                      </div>

                      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Nominal</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(Number(payout.amount || 0))}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Request dibuat</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(payout.requested_at)}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Diproses admin</p>
                          <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(payout.processed_at)}</p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tujuan payout</p>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                            {[payout.bank_name, payout.bank_account_holder, payout.bank_account_number].filter(Boolean).join(" | ") || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Catatan admin</p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{payout.note || "Belum ada catatan admin untuk request ini."}</p>
                      </div>
                    </div>

                    <div className="grid gap-5 bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f1_100%)] p-7">
                      <div className="rounded-[24px] border border-orange-100 bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Decision flow</p>
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          Approve dulu untuk validasi internal, tandai processing saat transfer sedang dijalankan,
                          lalu tutup sebagai paid setelah dana benar-benar masuk ke merchant.
                        </p>
                      </div>

                      {!isFinal && (
                        <div className="grid gap-4">
                          <form action={updatePayoutStatus} className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <input type="hidden" name="nextStatus" value="approved" />
                            <button className="rounded-[18px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
                              Approve payout
                            </button>
                          </form>

                          <form action={updatePayoutStatus} className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-5">
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <input type="hidden" name="nextStatus" value="processing" />
                            <button className="rounded-[18px] bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(2,132,199,0.22)] transition hover:bg-sky-700">
                              Mark processing
                            </button>
                          </form>

                          <form action={updatePayoutStatus} className="rounded-[24px] border border-violet-200 bg-violet-50/80 p-5 space-y-4">
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <input type="hidden" name="nextStatus" value="paid" />
                            <textarea
                              name="note"
                              placeholder="Opsional: catatan transfer / referensi payout"
                              className="min-h-[110px] w-full rounded-[18px] border border-violet-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                            />
                            <button className="rounded-[18px] bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(124,58,237,0.22)] transition hover:bg-violet-700">
                              Mark paid
                            </button>
                          </form>

                          <form action={updatePayoutStatus} className="rounded-[24px] border border-rose-200 bg-rose-50/80 p-5 space-y-4">
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <input type="hidden" name="nextStatus" value="rejected" />
                            <textarea
                              name="note"
                              placeholder="Wajib isi alasan jika payout perlu ditolak atau dikembalikan"
                              className="min-h-[110px] w-full rounded-[18px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                            />
                            <button className="rounded-[18px] bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(225,29,72,0.22)] transition hover:bg-rose-700">
                              Reject payout
                            </button>
                          </form>
                        </div>
                      )}

                      {isFinal && (
                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
                          Request ini sudah final dengan status <span className="font-semibold text-slate-950">{titleCaseStatus(payout.status)}</span>.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
