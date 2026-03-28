import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { submitFinanceManagerReport } from "./actions"

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

type ManagerReportRow = {
  id: string
  author_id: string
  author_role: string | null
  report_type: string | null
  title: string
  summary: string
  blockers: string | null
  next_steps: string | null
  metric_snapshot: Record<string, unknown> | null
  created_at: string | null
}

export default async function FinanceDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; view?: string }>
}) {
  const adminSupabase = createAdminClient()
  const supabase = await createClient()
  const params = (await searchParams) || {}
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const isFinanceManager = currentProfile?.role === "finance_manager"
  const isSuperadmin = currentProfile?.role === "superadmin"
  const showFinanceManagerView = isFinanceManager || (isSuperadmin && params.view === "finance-manager")

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
  const currentTime = new Date().getTime()
  const rejectedCount = payouts.filter((item) => normalizeStatus(item.status) === "rejected").length
  const agedPendingCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    if (!["pending", "approved", "processing"].includes(status)) return false
    const requestedAt = item.requested_at ? new Date(item.requested_at) : null
    if (!requestedAt || Number.isNaN(requestedAt.getTime())) return false
    return currentTime - requestedAt.getTime() >= 2 * 24 * 60 * 60 * 1000
  }).length

  const financeActionLogs = showFinanceManagerView
    ? (
        (await adminSupabase
          .from("admin_action_logs")
          .select("id, actor_id, actor_role, action, summary, created_at")
          .in("actor_role", ["finance", "finance_manager"])
          .order("created_at", { ascending: false })
          .limit(120)).data as Array<{
          id: string
          actor_id: string | null
          actor_role: string | null
          action: string
          summary: string
          created_at: string | null
        }> | null
      ) || []
    : []

  const financeRoleProfiles = showFinanceManagerView
    ? (
        (await adminSupabase
          .from("profiles")
          .select("id, role")
          .in("role", ["finance", "finance_manager"])).data as Array<{ id: string; role: string | null }> | null
      ) || []
    : []

  const financeUsersRaw = showFinanceManagerView ? await adminSupabase.auth.admin.listUsers() : { data: { users: [] as Array<{ id: string; email?: string | null }> } }
  const financeRoleMap = new Map(financeRoleProfiles.map((profile) => [profile.id, profile.role]))
  const financeProfileIds = new Set(financeRoleProfiles.map((profile) => profile.id))
  const financeUsers = (financeUsersRaw.data.users || []).filter((authUser) => financeProfileIds.has(authUser.id))
  const financePerformance = financeUsers
    .map((authUser) => {
      const logs = financeActionLogs.filter((log) => log.actor_id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || "(tanpa email)",
        role: financeRoleMap.get(authUser.id) || "finance",
        totalActions: logs.length,
        approved: logs.filter((log) => log.action === "finance_approve_payout").length,
        processing: logs.filter((log) => log.action === "finance_mark_processing").length,
        paid: logs.filter((log) => log.action === "finance_mark_paid").length,
        rejected: logs.filter((log) => log.action === "finance_reject_payout").length,
        lastActionAt: logs[0]?.created_at || null,
      }
    })
    .sort((a, b) => b.totalActions - a.totalActions || a.email.localeCompare(b.email))

  const financeReports = showFinanceManagerView
    ? (
        (await adminSupabase
          .from("manager_reports")
          .select("id, author_id, author_role, report_type, title, summary, blockers, next_steps, metric_snapshot, created_at")
          .eq("report_type", "finance")
          .order("created_at", { ascending: false })
          .limit(6)).data as ManagerReportRow[] | null
      ) || []
    : []

  if (showFinanceManagerView) {
    const managerMetricCards = [
      { label: "Payout pending", value: String(pendingCount), note: "Request payout yang belum diambil keputusan final." },
      { label: "Payout aging", value: String(agedPendingCount), note: "Payout pending/processing yang berumur 2 hari atau lebih." },
      { label: "Rejected", value: String(rejectedCount), note: "Payout yang dikembalikan atau ditolak finance." },
      { label: "Outstanding", value: formatMoney(pendingTotal), note: "Nominal yang masih belum keluar dari finance queue." },
    ]

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-8">
          {params.success ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              {params.success}
            </div>
          ) : null}

          {params.error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {params.error}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#9a3412_30%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_340px]">
              <div className="max-w-3xl">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                  Finance Manager
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Pantau queue payout, aging, dan performa tim finance dari satu dashboard.
                </h1>
                <p className="mt-4 text-base leading-8 text-orange-50/90">
                  Dashboard ini membantu finance manager membaca beban outstanding, payout yang mulai macet, dan aktivitas tim finance tanpa harus memakai akses superadmin.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/finance/payouts"
                    className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                    Buka Payout Queue
                  </Link>
                  <Link
                    href="/admin/audit-log"
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Audit Log
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Finance pulse</p>
                <div className="mt-5 grid gap-4">
                  <div>
                    <p className="text-sm text-orange-50/80">Outstanding</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{formatMoney(pendingTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Queue aging</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{agedPendingCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Rejected</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{rejectedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {managerMetricCards.map((card) => (
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance team performance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kinerja tim finance</h2>
              <div className="mt-6 space-y-4">
                {financePerformance.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada aktivitas finance yang tercatat.
                  </div>
                ) : (
                  financePerformance.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Finance actor</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.email}</h3>
                          <p className="mt-2 text-xs text-slate-500">{String(item.role).replaceAll("_", " ")}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white px-4 py-3 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total action</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{item.totalActions}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Approve</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.approved}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Processing</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.processing}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Paid</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.paid}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rejected</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.rejected}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">
                        Aksi terakhir: {item.lastActionAt ? new Date(item.lastActionAt).toLocaleString("id-ID") : "-"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager focus</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Prioritas finance manager</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>1. Menjaga payout aging tetap rendah dan outstanding tidak menumpuk terlalu lama.</p>
                  <p>2. Melihat apakah team finance bergerak seimbang di approve, processing, paid, dan rejected.</p>
                  <p>3. Menggunakan Audit Log untuk investigasi keputusan transfer atau payout yang macet.</p>
                </div>
              </div>

              <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Queue access</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Jalur kerja utama</h2>
                <div className="mt-5 grid gap-4">
                  {[
                    {
                      href: "/finance/payouts",
                      label: "Payout Queue",
                      description: "Pantau seluruh payout aktif, aging, dan status transfer.",
                    },
                    {
                      href: "/admin/bookings",
                      label: "Booking Center",
                      description: "Lihat jalur booking yang sudah di-handoff dari admin.",
                    },
                    {
                      href: "/admin/audit-log",
                      label: "Audit Log",
                      description: "Cek histori keputusan finance dan handoff lintas tim.",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                    >
                      <h3 className="text-xl font-semibold text-slate-950">{item.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      <div className="mt-5 text-sm font-semibold text-orange-600">Buka area kerja -&gt;</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager report</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kirim laporan finance ke superadmin</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ringkas aging, outstanding, blocker payout, dan langkah keuangan berikutnya agar superadmin menerima pembaruan resmi dari finance manager.
              </p>
              <form action={submitFinanceManagerReport} className="mt-6 space-y-4">
                <input
                  type="hidden"
                  name="metric_snapshot"
                  value={JSON.stringify({
                    pendingCount,
                    processingCount,
                    paidCount,
                    rejectedCount,
                    agedPendingCount,
                    pendingTotal,
                  })}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Judul laporan</label>
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="mis: Laporan finance mingguan"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan utama</label>
                  <textarea
                    name="summary"
                    required
                    placeholder="Ringkas kondisi payout, outstanding, dan fokus keuangan tim."
                    className="min-h-[140px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Blocker utama</label>
                  <textarea
                    name="blockers"
                    placeholder="Masukkan blocker payout atau isu keuangan paling penting."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Next steps</label>
                  <textarea
                    name="next_steps"
                    placeholder="Tulis tindakan lanjut yang akan dijalankan tim finance."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <button className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Kirim laporan ke superadmin
                </button>
              </form>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recent reports</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Riwayat laporan finance manager</h2>
              <div className="mt-6 space-y-4">
                {!financeReports.length ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada laporan finance yang dikirim ke superadmin.
                  </div>
                ) : (
                  financeReports.slice(0, 4).map((report) => (
                    <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                        {report.created_at ? new Date(report.created_at).toLocaleString("id-ID") : "-"}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">{report.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{report.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

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
