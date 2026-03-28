import Link from "next/link"
import { formatAdminCode, formatFinanceCode } from "@/lib/merchant-code"
import { getRoleLabel } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { submitOperationsManagerReport } from "./actions"
import { createAdminAccount } from "@/app/admin/(protected)/team-accounts/actions"
import { createFinanceAccount } from "@/app/finance/(protected)/team-accounts/finance-actions"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function daysSince(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  const diff = Date.now() - parsed.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function titleCase(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
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

export default async function AdminDashboard({
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
  const isSuperadmin = currentProfile?.role === "superadmin"
  const isOperationsManager = currentProfile?.role === "operations_manager"
  const showOperationsManagerView = isOperationsManager || (isSuperadmin && params.view === "operations-manager")

  const [merchantResult, packageResult, bookingResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id, created_at")
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status, created_at")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, booking_status, created_at")
      .order("created_at", { ascending: false }),
  ])

  const pendingMerchantsData = (merchantResult.data as Array<{ id: string; created_at: string | null }> | null) || []
  const packages = (packageResult.data as Array<{ id: string; status: string | null; created_at: string | null }> | null) || []
  const bookings = (bookingResult.data as Array<{ id: string; booking_status: string | null; created_at: string | null }> | null) || []
  const pendingMerchants = pendingMerchantsData.length

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const financeReadyCount = bookings.filter((item) => normalizeStatus(item.booking_status) === "awaiting_admin_handoff").length
  const merchantOverdueCount = pendingMerchantsData.filter((merchant) => daysSince(merchant.created_at) >= 3).length
  const packageOverdueCount = packages.filter(
    (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
  ).length
  const bookingStalledCount = bookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "awaiting_admin_handoff" && daysSince(booking.created_at) >= 1,
  ).length
  const needsAttentionCards = [
    {
      label: "Merchant overdue",
      value: merchantOverdueCount,
      note: "Merchant pending 3 hari atau lebih.",
    },
    {
      label: "Package overdue",
      value: packageOverdueCount,
      note: "Package review yang belum disentuh 3 hari atau lebih.",
    },
    {
      label: "Booking stalled",
      value: bookingStalledCount,
      note: "Booking siap handoff 1 hari atau lebih.",
    },
  ]
  const slaCards = [
    {
      label: "Merchant SLA",
      value: `${pendingMerchants - merchantOverdueCount} within SLA`,
      note: "Target review merchant di bawah 3 hari.",
    },
    {
      label: "Package SLA",
      value: `${pendingPackages - packageOverdueCount} within SLA`,
      note: "Target review package di bawah 3 hari.",
    },
    {
      label: "Booking SLA",
      value: `${financeReadyCount - bookingStalledCount} within SLA`,
      note: "Target handoff booking di bawah 1 hari.",
    },
  ]
  const metricCards = [
    {
      label: "Merchant pending",
      value: String(pendingMerchants),
      note: "Partner menunggu approval admin.",
    },
    {
      label: "Review queue",
      value: String(pendingPackages),
      note: "Paket yang masih menunggu keputusan admin.",
    },
    {
      label: "Package approved",
      value: String(approvedPackages),
      note: "Paket yang sudah lolos review dan siap tayang.",
    },
    {
      label: "Finance handoff",
      value: String(financeReadyCount),
      note: "Booking yang sudah siap dikirim admin ke finance.",
    },
  ]

  const adminProfiles = isSuperadmin
    ? (
        (await adminSupabase
          .from("profiles")
          .select("id, username, role")
          .in("role", ["admin", "operations_manager"])
          .order("username", { ascending: true })).data as Array<{ id: string; username: string | null; role: string | null }> | null
      ) || []
    : []

  const financeRoleProfiles = isSuperadmin
    ? (
        (await adminSupabase
          .from("profiles")
          .select("id, role")
          .in("role", ["finance", "finance_manager"])).data as Array<{ id: string; role: string | null }> | null
      ) || []
    : []

  const financeUsersRaw = isSuperadmin ? await adminSupabase.auth.admin.listUsers() : { data: { users: [] as Array<{ id: string; email?: string | null }> } }
  const financeRoleMap = new Map(financeRoleProfiles.map((profile) => [profile.id, profile.role]))
  const financeProfileIds = new Set(financeRoleProfiles.map((profile) => profile.id))
  const financeProfiles = (financeUsersRaw.data.users || [])
    .filter((authUser) => financeProfileIds.has(authUser.id))
    .sort((a, b) => (a.email || "").localeCompare(b.email || ""))

  const superadminControlCards = [
    {
      label: "Finance accounts",
      value: String(financeProfiles.length),
      note: "Semua akun finance dan finance manager yang aktif di layer internal.",
    },
    {
      label: "Admin accounts",
      value: String(adminProfiles.length),
      note: "Semua akun admin dan operations manager yang terhubung ke workspace yang sama.",
    },
    {
      label: "Merchant pending",
      value: String(pendingMerchants),
      note: "Queue merchant yang masih menunggu keputusan tim admin.",
    },
    {
      label: "Finance handoff",
      value: String(financeReadyCount),
      note: "Booking siap handoff yang perlu dipantau lintas admin dan finance.",
    },
  ]

  const teamActionLogs = isSuperadmin
    ? (
        (await adminSupabase
          .from("admin_action_logs")
          .select("id, actor_id, actor_role, target_type, action, summary, created_at")
          .order("created_at", { ascending: false })
          .limit(120)).data as Array<{
          id: string
          actor_id: string | null
          actor_role: string | null
          target_type: string | null
          action: string
          summary: string
          created_at: string | null
        }> | null
      ) || []
    : []

  const adminActorMap = new Map(adminProfiles.map((profile) => [profile.id, profile]))
  const financeActorMap = new Map(financeProfiles.map((profile) => [profile.id, profile]))

  const adminPerformance = adminProfiles
    .map((profile) => {
      const logs = teamActionLogs.filter((log) => log.actor_id === profile.id)
      return {
        id: profile.id,
        username: profile.username || "(tanpa username)",
        code: formatAdminCode(profile.id),
        role: profile.role || "admin",
        totalActions: logs.length,
        merchantActions: logs.filter((log) => log.target_type === "merchant").length,
        packageActions: logs.filter((log) => log.target_type === "package").length,
        bookingHandoffs: logs.filter((log) => log.action === "handoff_to_finance").length,
        lastActionAt: logs[0]?.created_at || null,
      }
    })
    .sort((a, b) => b.totalActions - a.totalActions || a.username.localeCompare(b.username))

  const financePerformance = financeProfiles
    .map((profile) => {
      const logs = teamActionLogs.filter((log) => log.actor_id === profile.id)
      return {
        id: profile.id,
        email: profile.email || "(tanpa email)",
        code: formatFinanceCode(profile.id),
        role: financeRoleMap.get(profile.id) || "finance",
        totalActions: logs.length,
        approved: logs.filter((log) => log.action === "finance_approve_payout").length,
        processing: logs.filter((log) => log.action === "finance_mark_processing").length,
        paid: logs.filter((log) => log.action === "finance_mark_paid").length,
        rejected: logs.filter((log) => log.action === "finance_reject_payout").length,
        lastActionAt: logs[0]?.created_at || null,
      }
    })
    .sort((a, b) => b.totalActions - a.totalActions || a.email.localeCompare(b.email))

  const recentTeamActivity = teamActionLogs.slice(0, 12).map((log) => {
    const adminActor = log.actor_id ? adminActorMap.get(log.actor_id) : null
    const financeActor = log.actor_id ? financeActorMap.get(log.actor_id) : null
    return {
      ...log,
      actorLabel: adminActor?.username || financeActor?.email || log.actor_id || "-",
      actorCode: adminActor ? formatAdminCode(adminActor.id) : financeActor ? formatFinanceCode(financeActor.id) : "-",
    }
  })

  const managerReports = (
    (await adminSupabase
      .from("manager_reports")
      .select("id, author_id, author_role, report_type, title, summary, blockers, next_steps, metric_snapshot, created_at")
      .order("created_at", { ascending: false })
      .limit(12)).data as ManagerReportRow[] | null
  ) || []

  const operationsReports = managerReports.filter((report) => report.report_type === "operations")
  const financeReports = managerReports.filter((report) => report.report_type === "finance")
  const reportActorEntries: Array<[string, string]> = [
    ...adminProfiles.map((profile): [string, string] => [profile.id, profile.username || formatAdminCode(profile.id)]),
    ...financeProfiles.map((profile): [string, string] => [profile.id, profile.email || formatFinanceCode(profile.id)]),
  ]
  const reportActorMap = new Map<string, string>(reportActorEntries)

  if (showOperationsManagerView) {
    const operationalLoad = pendingMerchants + pendingPackages + financeReadyCount

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
                  Operations Manager
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Monitor SLA, backlog, dan ritme kerja tim operasional Red Feng.
                </h1>
                <p className="mt-4 text-base leading-8 text-orange-50/90">
                  Dashboard ini dirancang untuk operations manager agar cepat melihat antrian yang menumpuk, area yang mulai overdue, dan jalur tindak lanjut untuk merchant, package, serta Booking Center.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/admin/merchants"
                    className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                    Buka Merchant Directory
                  </Link>
                  <Link
                    href="/admin/packages"
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Package Review
                  </Link>
                  <Link
                    href="/admin/bookings"
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Booking Center
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Operations pulse</p>
                <div className="mt-5 grid gap-4">
                  <div>
                    <p className="text-sm text-orange-50/80">Total backlog</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{operationalLoad}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Overdue items</p>
                    <p className="mt-1 text-3xl font-semibold text-white">
                      {merchantOverdueCount + packageOverdueCount + bookingStalledCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Ready for finance</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{financeReadyCount}</p>
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

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Area yang harus disentuh lebih dulu</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {needsAttentionCards.map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">SLA Monitor</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kesehatan respons tim operasional</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {slaCards.map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager note</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Fokus utama operations manager</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Menjaga backlog merchant, package, dan booking tidak menumpuk di atas SLA.</p>
                <p>2. Mengarahkan admin ke queue yang paling urgent tanpa harus memegang seluruh kontrol superadmin.</p>
                <p>3. Memantau kualitas flow handoff ke finance agar booking siap transfer tidak macet.</p>
                <p>4. Menggunakan Audit Log untuk review pola kerja tim dan investigasi keputusan operasional.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager report</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kirim laporan operasional ke superadmin</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ringkas backlog, blocker utama, dan langkah berikutnya agar superadmin mendapat pembaruan resmi dari operations manager.
              </p>
              <form action={submitOperationsManagerReport} className="mt-6 space-y-4">
                <input
                  type="hidden"
                  name="metric_snapshot"
                  value={JSON.stringify({
                    pendingMerchants,
                    pendingPackages,
                    financeReadyCount,
                    merchantOverdueCount,
                    packageOverdueCount,
                    bookingStalledCount,
                  })}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Judul laporan</label>
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="mis: Laporan operasional mingguan"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan utama</label>
                  <textarea
                    name="summary"
                    required
                    placeholder="Ringkas kondisi merchant, package, booking, dan poin pengawasan utama."
                    className="min-h-[140px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Blocker utama</label>
                  <textarea
                    name="blockers"
                    placeholder="Masukkan blocker paling penting bila ada."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Next steps</label>
                  <textarea
                    name="next_steps"
                    placeholder="Tulis tindakan lanjut yang akan dijalankan tim operasional."
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
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Riwayat laporan operations manager</h2>
              <div className="mt-6 space-y-4">
                {!operationsReports.length ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada laporan operasional yang dikirim ke superadmin.
                  </div>
                ) : (
                  operationsReports.slice(0, 4).map((report) => (
                    <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                        {formatDateTime(report.created_at)}
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

  if (isSuperadmin) {
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

          <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#9a3412_28%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className="max-w-3xl">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                  Superadmin Command
                </span>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                  Dashboard superadmin untuk memantau semua admin, semua finance, dan health operasional Red Feng.
                </h1>
                <p className="mt-4 text-base leading-8 text-orange-50/90">
                  Dari satu layar, superadmin bisa melihat kekuatan akun internal, queue operasional, dan jalur kontrol menuju Internal Accounts, Booking Center, serta Audit Log.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/superadmin/finance-team-accounts"
                    className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                    Kelola akun internal
                  </Link>
                  <Link
                    href="/admin/bookings"
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Booking Center
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
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Control snapshot</p>
                <div className="mt-5 grid gap-4">
                  <div>
                    <p className="text-sm text-orange-50/80">Finance accounts</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{financeProfiles.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Admin accounts</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{adminProfiles.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Pending ops items</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{pendingMerchants + pendingPackages + financeReadyCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {superadminControlCards.map((card) => (
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

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance network</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Semua akun finance</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Superadmin memegang kontrol tertinggi untuk semua akun finance yang mengelola payout dan transfer merchant.
                  </p>
                </div>
                <Link
                  href="/superadmin/finance-team-accounts"
                  className="inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                >
                  Buka Internal Accounts
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {financeProfiles.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada akun finance aktif.
                  </div>
                ) : (
                  financeProfiles.map((profile) => (
                    <div key={profile.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Finance account</p>
                      <h3 className="mt-3 break-all text-base font-semibold leading-7 text-slate-950">
                        {profile.email || "(tanpa email)"}
                      </h3>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                        {formatFinanceCode(profile.id)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{getRoleLabel(financeRoleMap.get(profile.id) || "finance")}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin network</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Semua akun admin</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Semua admin operasional dan operations manager terhubung ke data yang sama, sehingga superadmin bisa memantau kapasitas tim dari satu dashboard.
                  </p>
                </div>
                <Link
                  href="/superadmin/team-accounts"
                  className="inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100"
                >
                  Kelola akun
                </Link>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {adminProfiles.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada akun admin aktif.
                  </div>
                ) : (
                  adminProfiles.map((profile) => (
                    <div key={profile.id} className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Admin account</p>
                      <h3 className="mt-3 text-lg font-semibold text-slate-950">{profile.username || "(tanpa username)"}</h3>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                        {formatAdminCode(profile.id)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Queue lintas tim yang perlu perhatian</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {needsAttentionCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin performance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Review kinerja admin</h2>
              <div className="mt-6 space-y-4">
                {adminPerformance.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada aktivitas admin yang tercatat.
                  </div>
                ) : (
                  adminPerformance.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Admin actor</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.username}</h3>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">{item.code}</p>
                          <p className="mt-2 text-xs text-slate-500">{getRoleLabel(item.role)}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white px-4 py-3 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total action</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{item.totalActions}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Merchant</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.merchantActions}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Package</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.packageActions}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Handoff</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.bookingHandoffs}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">Aksi terakhir: {formatDateTime(item.lastActionAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance performance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Review kinerja finance</h2>
              <div className="mt-6 space-y-4">
                {financePerformance.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada aktivitas finance yang tercatat.
                  </div>
                ) : (
                  financePerformance.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Finance actor</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.email}</h3>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">{item.code}</p>
                          <p className="mt-2 text-xs text-slate-500">{getRoleLabel(item.role)}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] px-4 py-3 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total action</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{item.totalActions}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Approve</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.approved}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Processing</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.processing}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Paid</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.paid}</p>
                        </div>
                        <div className="rounded-[18px] border border-[#f0e6da] bg-[#fffaf4] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Rejected</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">{item.rejected}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-slate-500">Aksi terakhir: {formatDateTime(item.lastActionAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager reports</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Laporan terbaru manager ke superadmin</h2>
              <div className="mt-6 grid gap-4">
                {!operationsReports.length && !financeReports.length ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada laporan manager yang masuk.
                  </div>
                ) : (
                  managerReports.slice(0, 6).map((report) => (
                    <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                          {titleCase(report.report_type)}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {titleCase(report.author_role)}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-950">{report.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {(reportActorMap.get(report.author_id) || report.author_id || "-") as string} | {formatDateTime(report.created_at)}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-slate-600">{report.summary}</p>
                      {report.blockers ? <p className="mt-3 text-sm leading-7 text-rose-700">Blocker: {report.blockers}</p> : null}
                      {report.next_steps ? <p className="mt-3 text-sm leading-7 text-slate-600">Next steps: {report.next_steps}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Reporting line</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Alur laporan manager</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Operations manager mengirim laporan backlog operasional, blocker, dan next steps ke superadmin.</p>
                <p>2. Finance manager mengirim ringkasan outstanding payout, aging, dan isu keuangan ke superadmin.</p>
                <p>3. Superadmin membaca laporan manager bersama performa tim dan audit log untuk keputusan lintas fungsi.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recent team activity</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aktivitas terbaru admin dan finance</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Gunakan panel ini untuk melihat siapa yang baru saja approve, handoff, memproses, atau menutup payout di sistem.
                </p>
              </div>
              <Link href="/admin/audit-log" className="text-sm font-semibold text-orange-600">
                Buka Audit Log
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentTeamActivity.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada aktivitas tim yang tercatat.
                </div>
              ) : (
                recentTeamActivity.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                        {titleCase(item.actor_role)}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {titleCase(item.action)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.actorLabel}</h3>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">{item.actorCode}</p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{item.summary}</p>
                    <p className="mt-4 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    )
  }

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
                Dashboard admin multi-produk dengan Paket Tour sebagai workspace utama saat ini.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Semua workflow merchant dan review yang aktif saat ini dipusatkan di Paket Tour, sementara booking tetap dipisah karena akan menampung transaksi lintas produk.
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
                  <p className="text-sm text-orange-50/80">Ready for finance</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{financeReadyCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Package approved</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{approvedPackages}</p>
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

        {isSuperadmin ? (
          <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager control deck</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Buat akun manager langsung dari dashboard superadmin
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Preview dashboard manager sudah tersedia di navigasi superadmin. Bagian ini difokuskan hanya untuk pembuatan akun manager baru.
                </p>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-900">Cara buat operations manager:</p>
                <p>Isi username, isi password awal, lalu klik `Buat akun operations manager`.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <form action={createAdminAccount} className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-6">
                  <input type="hidden" name="role" value="operations_manager" />
                  <input type="hidden" name="return_to" value="/superadmin/dashboard" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Create operations manager</p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-950">Akun manager operasional</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Login nanti lewat portal admin menggunakan username dan password awal yang Anda isi di bawah.
                  </p>
                  <div className="mt-5 space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Username
                      </label>
                      <input
                        name="username"
                        type="text"
                        required
                        placeholder="mis: ops.manager"
                        className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Password awal
                      </label>
                      <input
                        name="password"
                        type="text"
                        required
                        minLength={8}
                        placeholder="Minimal 8 karakter"
                        className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                      />
                    </div>
                    <button className="w-full rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                      Buat akun operations manager
                    </button>
                  </div>
                </form>

                <form action={createFinanceAccount} className="rounded-[28px] border border-[#efe1cf] bg-[#fffaf3] p-6">
                  <input type="hidden" name="role" value="finance_manager" />
                  <input type="hidden" name="return_to" value="/superadmin/dashboard" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Create finance manager</p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-950">Akun manager finance</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Login nanti lewat portal finance menggunakan username dan password awal yang Anda isi di bawah.
                  </p>
                  <div className="mt-5 space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Username
                      </label>
                      <input
                        name="username"
                        type="text"
                        required
                        placeholder="mis: finance.manager"
                        className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Password awal
                      </label>
                      <input
                        name="password"
                        type="text"
                        required
                        minLength={8}
                        placeholder="Minimal 8 karakter"
                        className="w-full rounded-[18px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                      />
                    </div>
                    <button className="w-full rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                      Buat akun finance manager
                    </button>
                  </div>
                </form>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Antrian yang perlu perhatian cepat</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {needsAttentionCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">SLA Monitor</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Target respons operasional admin</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {slaCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}
