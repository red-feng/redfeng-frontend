import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

const adminMenus = [
  {
    label: "Merchant Approvals",
    href: "/admin/merchants",
    description: "Review merchant yang sudah submit onboarding dan dokumen.",
    tone: "from-amber-500 to-orange-500",
  },
  {
    label: "Package Approvals",
    href: "/admin/packages",
    description: "Validasi paket yang siap tayang ke customer.",
    tone: "from-sky-500 to-cyan-500",
  },
  {
    label: "Finance Dashboard",
    href: "/finance/dashboard",
    description: "Masuk ke workspace finance untuk approval payout merchant.",
    tone: "from-emerald-500 to-lime-500",
  },
]

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

export default async function AdminDashboard() {
  const adminSupabase = createAdminClient()

  const [merchantResult, packageResult, payoutResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("payout_requests")
      .select("id, amount, status, requested_at")
      .order("requested_at", { ascending: false }),
  ])

  const pendingMerchants = merchantResult.count || 0
  const packages = packageResult.data || []
  const payouts = payoutResult.data || []

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const payoutPendingCount = payouts.filter((item) => normalizeStatus(item.status) === "pending").length
  const payoutProcessingCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    return status === "approved" || status === "processing"
  }).length
  const payoutPendingNominal = payouts
    .filter((item) => {
      const status = normalizeStatus(item.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const metricCards = [
    {
      label: "Merchant pending",
      value: String(pendingMerchants),
      note: "Partner menunggu approval admin.",
    },
    {
      label: "Package pending",
      value: String(pendingPackages),
      note: "Paket perlu dicek sebelum live.",
    },
    {
      label: "Payout pending",
      value: String(payoutPendingCount),
      note: "Request payout menunggu keputusan.",
    },
    {
      label: "Nominal menunggu payout",
      value: formatMoney(payoutPendingNominal),
      note: "Dana yang belum ditandai paid.",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Control Center
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Operasional approval merchant, package, dan payout dalam satu workspace.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Dashboard ini merangkum antrean approval utama Red Feng agar tim admin bisa memproses
                merchant, paket, dan payout tanpa kehilangan konteks bisnis harian.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Live queue snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Merchant pending</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{pendingMerchants}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Package approved</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{approvedPackages}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Payout processing</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{payoutProcessingCount}</p>
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin workstreams</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Approval queue utama</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Masuk ke area review yang paling sering dipakai oleh tim operasional Red Feng.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {adminMenus.map((menu) => (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="group overflow-hidden rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                >
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${menu.tone} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white`}>
                    Open queue
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{menu.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{menu.description}</p>
                  <div className="mt-5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
                    Buka area kerja -&gt;
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Payout focus</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Ringkasan payout merchant</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pending request</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutPendingCount}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Sedang diproses</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{payoutProcessingCount}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Nominal outstanding</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(payoutPendingNominal)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Ops note</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aturan release dana</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Dana customer tetap masuk dan ditahan di rekening Red Feng.</p>
                <p>2. Merchant klik <span className="font-semibold text-slate-900">Tiba</span> saat sudah di meeting point.</p>
                <p>3. Merchant klik <span className="font-semibold text-slate-900">Dijemput</span> saat customer benar-benar sudah naik.</p>
                <p>4. Customer klik <span className="font-semibold text-slate-900">Sudah dijemput</span>.</p>
                <p>5. Setelah itu booking masuk status <span className="font-semibold text-slate-900">ready_for_payout</span> dan admin bisa proses payout penuh.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
