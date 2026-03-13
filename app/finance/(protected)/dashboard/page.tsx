import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

export default async function FinanceDashboardPage() {
  const adminSupabase = createAdminClient()

  const { data: payoutsData } = await adminSupabase
    .from("payout_requests")
    .select("id, amount, status, requested_at")
    .order("requested_at", { ascending: false })

  const payouts = payoutsData || []
  const { data: bookingsData } = await adminSupabase
    .from("bookings")
    .select("id, booking_status")
    .order("created_at", { ascending: false })
  const bookings = bookingsData || []
  const pendingCount = payouts.filter((item) => normalizeStatus(item.status) === "pending").length
  const processingCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    return status === "approved" || status === "processing"
  }).length
  const paidCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    return status === "paid" || status === "completed"
  }).length
  const pendingTotal = payouts
    .filter((item) => {
      const status = normalizeStatus(item.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const metricCards = [
    { label: "Booking dari admin", value: String(bookings.filter((item) => normalizeStatus(item.booking_status) === "finance_review").length), note: "Booking yang sudah di-handoff admin ke finance." },
    { label: "Payout pending", value: String(pendingCount), note: "Request payout menunggu keputusan finance." },
    { label: "Sedang diproses", value: String(processingCount), note: "Transfer sedang dijalankan atau sudah di-approve." },
    { label: "Sudah paid", value: String(paidCount), note: "Request payout yang sudah final." },
    { label: "Nominal outstanding", value: formatMoney(pendingTotal), note: "Nominal yang masih menunggu pencairan." },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Finance Command Center
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Kelola payout approval merchant dari workspace finance.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Semua arus payout dipusatkan di area finance agar admin hanya melakukan handoff booking dan finance mengontrol transfer, komisi, fee, serta potongan payout merchant.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Live payout snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Pending</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Processing</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{processingCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Outstanding</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatMoney(pendingTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance workstreams</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Area payout approval</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Masuk ke antrean payout merchant untuk approve, mark processing, atau menutup request sebagai paid.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link
                href="/finance/payouts"
                className="group block overflow-hidden rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
              >
                <div className="inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                  Open queue
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">Payout Approvals</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Review request payout merchant berdasarkan status escrow dan proses transfer internal.
                </p>
                <div className="mt-5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
                  Buka area kerja -&gt;
                </div>
              </Link>
              <Link
                href="/finance/settings"
                className="group block overflow-hidden rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
              >
                <div className="inline-flex rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                  Open settings
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">Finance Settings</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Atur komisi Red Feng, admin fee customer, pajak, dan biaya transfer merchant.
                </p>
                <div className="mt-5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
                  Buka pengaturan -&gt;
                </div>
              </Link>
              <Link
                href="/finance/admin-users"
                className="group block overflow-hidden rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
              >
                <div className="inline-flex rounded-full bg-gradient-to-r from-slate-700 to-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                  Internal accounts
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">Admin &amp; Finance Accounts</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Finance mengelola akun admin, sedangkan superadmin membuat dan mengelola akun finance.
                </p>
                <div className="mt-5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
                  Buka manajemen akun -&gt;
                </div>
              </Link>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance note</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aturan release dana</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Dana customer tetap masuk dan ditahan di rekening Red Feng.</p>
                <p>2. Merchant klik <span className="font-semibold text-slate-900">Arrived</span> saat sudah di meeting point.</p>
                <p>3. Customer klik <span className="font-semibold text-slate-900">Picked up</span> saat sudah naik kendaraan.</p>
                <p>4. Merchant klik <span className="font-semibold text-slate-900">Go</span> agar admin tahu trip sudah berjalan.</p>
                <p>5. Admin handoff booking ke finance, lalu finance transfer sesuai setting komisi dan biaya.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
