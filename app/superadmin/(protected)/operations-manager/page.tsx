import Link from "next/link"
import { redirect } from "next/navigation"
import { submitOperationsManagerReport } from "@/app/admin/(protected)/dashboard/actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type DashboardSearchParams = {
  success?: string
  error?: string
}

type MerchantRow = {
  id: string
  created_at: string | null
}

type PackageRow = {
  id: string
  status: string | null
  created_at: string | null
  title: string | null
}

type BookingRow = {
  id: string
  booking_status: string | null
  created_at: string | null
  total_amount: number | null
}

type MerchantDeletionRequestRow = {
  id: string
  merchant_name: string | null
  merchant_email: string | null
  status: string | null
  requested_at: string | null
}

type MerchantReviewRequestRow = {
  id: string
  merchant_id: string | null
  request_type: string | null
  status: string | null
  requested_at: string | null
}

type ActionLogRow = {
  id: string
  actor_role: string | null
  action: string
  summary: string | null
  created_at: string | null
}

type ManagerReportRow = {
  id: string
  title: string
  summary: string
  blockers: string | null
  next_steps: string | null
  metric_snapshot: Record<string, unknown> | null
  created_at: string | null
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function daysSince(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatCompactCount(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
  return amount.toLocaleString("id-ID")
}

function formatMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function getMetricText(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key]
  return typeof value === "string" ? value.trim() : ""
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

function isOpenReviewStatus(status: string | null | undefined) {
  return !["approved", "rejected", "completed", "cancelled", "closed"].includes(normalizeStatus(status))
}

export default async function SuperadminOperationsManagerPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient("superadmin")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login?error=session-ended")
  }

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!currentProfile || currentProfile.role !== "superadmin") {
    redirect("/superadmin/dashboard")
  }

  const adminSupabase = createAdminClient()
  const [
    merchantResult,
    packageResult,
    bookingResult,
    deletionRequestResult,
    reviewRequestResult,
    teamActivityResult,
    adminCountResult,
    operationsManagerCountResult,
    operationsReportResult,
  ] = await Promise.all([
    adminSupabase.from("merchants").select("id, created_at").eq("verification_status", "pending"),
    adminSupabase.from("packages").select("id, status, created_at, title").order("created_at", { ascending: false }).limit(160),
    adminSupabase.from("bookings").select("id, booking_status, created_at, total_amount").order("created_at", { ascending: false }).limit(200),
    adminSupabase
      .from("merchant_deletion_requests")
      .select("id, merchant_name, merchant_email, status, requested_at")
      .order("requested_at", { ascending: false })
      .limit(30),
    adminSupabase
      .from("merchant_review_requests")
      .select("id, merchant_id, request_type, status, requested_at")
      .order("requested_at", { ascending: false })
      .limit(30),
    adminSupabase
      .from("admin_action_logs")
      .select("id, actor_role, action, summary, created_at")
      .in("actor_role", ["admin", "operations_manager"])
      .order("created_at", { ascending: false })
      .limit(8),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "operations_manager"),
    adminSupabase
      .from("manager_reports")
      .select("id, title, summary, blockers, next_steps, metric_snapshot, created_at")
      .eq("report_type", "operations")
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  const pendingMerchants = ((merchantResult.data as MerchantRow[] | null) || [])
  const packages = (packageResult.data as PackageRow[] | null) || []
  const bookings = (bookingResult.data as BookingRow[] | null) || []
  const deletionRequests = ((deletionRequestResult.data as MerchantDeletionRequestRow[] | null) || []).filter((item) =>
    isOpenReviewStatus(item.status),
  )
  const reviewRequests = ((reviewRequestResult.data as MerchantReviewRequestRow[] | null) || []).filter((item) =>
    isOpenReviewStatus(item.status),
  )
  const recentTeamActivity = (teamActivityResult.data as ActionLogRow[] | null) || []
  const operationsReports = (operationsReportResult.data as ManagerReportRow[] | null) || []
  const adminCount = Number(adminCountResult.count || 0)
  const operationsManagerCount = Number(operationsManagerCountResult.count || 0)

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending")
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const financeReadyBookings = bookings.filter((item) =>
    ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(item.booking_status)),
  )

  const merchantOverdueCount = pendingMerchants.filter((merchant) => daysSince(merchant.created_at) >= 3).length
  const packageOverdueCount = pendingPackages.filter((pkg) => daysSince(pkg.created_at) >= 3).length
  const bookingStalledCount = financeReadyBookings.filter((booking) => daysSince(booking.created_at) >= 1).length
  const openEscalationCount = deletionRequests.length + reviewRequests.length
  const financeReadyVolume = financeReadyBookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)

  const queueSummary = `Merchant pending ${pendingMerchants.length}, package pending ${pendingPackages.length}, booking siap finance ${financeReadyBookings.length}.`
  const slaSummary = `Merchant overdue ${merchantOverdueCount}, package overdue ${packageOverdueCount}, booking stalled ${bookingStalledCount}.`
  const customerTransactionSummary = `${financeReadyBookings.length} booking sedang menunggu handoff dengan nilai ${formatMoney(financeReadyVolume)}.`
  const customerFundsStatus = `${financeReadyBookings.length} booking perlu dipantau agar dana customer tidak tertahan terlalu lama sebelum finance mengambil alih.`
  const metricSnapshot = JSON.stringify({
    pendingMerchants: pendingMerchants.length,
    pendingPackages: pendingPackages.length,
    approvedPackages,
    financeReadyBookings: financeReadyBookings.length,
    merchantOverdueCount,
    packageOverdueCount,
    bookingStalledCount,
    openEscalationCount,
    financeReadyVolume,
  })

  const queueCards = [
    {
      label: "Merchant pending",
      value: formatCompactCount(pendingMerchants.length),
      note: "Merchant baru yang masih menunggu verifikasi operasional.",
    },
    {
      label: "Package review",
      value: formatCompactCount(pendingPackages.length),
      note: "Paket yang belum diputuskan dan masih ada di antrian review.",
    },
    {
      label: "Handoff finance",
      value: formatCompactCount(financeReadyBookings.length),
      note: "Booking yang sudah masuk jalur handoff ke finance.",
    },
    {
      label: "Package approved",
      value: formatCompactCount(approvedPackages),
      note: "Paket yang sudah lolos review dan siap terus dipantau performanya.",
    },
  ]

  const riskCards = [
    {
      label: "Merchant overdue",
      value: formatCompactCount(merchantOverdueCount),
      note: "Approval merchant yang lewat 3 hari atau lebih.",
    },
    {
      label: "Package overdue",
      value: formatCompactCount(packageOverdueCount),
      note: "Package review yang belum disentuh 3 hari atau lebih.",
    },
    {
      label: "Booking stalled",
      value: formatCompactCount(bookingStalledCount),
      note: "Booking siap finance yang tertahan 1 hari atau lebih.",
    },
    {
      label: "Open escalation",
      value: formatCompactCount(openEscalationCount),
      note: "Request review dan deletion yang masih butuh keputusan lintas tim.",
    },
  ]

  const slaCards = [
    {
      label: "Merchant SLA",
      value: `${Math.max(pendingMerchants.length - merchantOverdueCount, 0)} within SLA`,
      note: "Target review merchant di bawah 3 hari.",
    },
    {
      label: "Package SLA",
      value: `${Math.max(pendingPackages.length - packageOverdueCount, 0)} within SLA`,
      note: "Target review package di bawah 3 hari.",
    },
    {
      label: "Booking SLA",
      value: `${Math.max(financeReadyBookings.length - bookingStalledCount, 0)} within SLA`,
      note: "Target handoff booking ke finance di bawah 1 hari.",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
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

        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#9a3412_30%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Operations Manager
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Pantau backlog operasional, SLA review, dan handoff booking dari satu overview.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Halaman ini dibuat khusus untuk membaca kesehatan domain operations dari sisi manager dan superadmin,
                tanpa tercampur oleh ritme dashboard admin harian.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/superadmin/merchants"
                  className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  Buka merchant review
                </Link>
                <Link
                  href="/superadmin/packages"
                  className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Buka package review
                </Link>
                <Link
                  href="/superadmin/bookings"
                  className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Buka booking queue
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Operations pulse</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Pending ops items</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {formatCompactCount(pendingMerchants.length + pendingPackages.length + financeReadyBookings.length)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Open escalation</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{formatCompactCount(openEscalationCount)}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Active team</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatCompactCount(operationsManagerCount)} manager / {formatCompactCount(adminCount)} admin
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Finance-ready volume</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatMoney(financeReadyVolume)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {queueCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5"
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
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Queue lintas operasional yang perlu perhatian</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {riskCards.map((card) => (
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
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Target respons manager operasional</h2>
            <div className="mt-6 grid gap-4">
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

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Review Signals</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Sinyal review yang sedang terbuka</h2>
              </div>
              <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-sm leading-6 text-slate-600">
                <p>{reviewRequests.length} review request aktif</p>
                <p>{deletionRequests.length} deletion request aktif</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Merchant review requests</p>
                <div className="mt-4 space-y-3">
                  {!reviewRequests.length ? (
                    <div className="rounded-[20px] border border-dashed border-[#e8d7c1] bg-white px-4 py-5 text-sm text-slate-500">
                      Belum ada merchant review request terbuka.
                    </div>
                  ) : (
                    reviewRequests.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-[20px] border border-[#eadcc9] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{titleCase(item.request_type)}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {titleCase(item.status)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.requested_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Deletion requests</p>
                <div className="mt-4 space-y-3">
                  {!deletionRequests.length ? (
                    <div className="rounded-[20px] border border-dashed border-[#e8d7c1] bg-white px-4 py-5 text-sm text-slate-500">
                      Belum ada deletion request terbuka.
                    </div>
                  ) : (
                    deletionRequests.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-[20px] border border-[#eadcc9] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{item.merchant_name || item.merchant_email || "Merchant"}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {titleCase(item.status)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.requested_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pending packages terbaru</p>
                <div className="mt-4 space-y-3">
                  {!pendingPackages.length ? (
                    <div className="rounded-[20px] border border-dashed border-[#e8d7c1] bg-white px-4 py-5 text-sm text-slate-500">
                      Tidak ada package pending saat ini.
                    </div>
                  ) : (
                    pendingPackages.slice(0, 4).map((pkg) => (
                      <div key={pkg.id} className="rounded-[20px] border border-[#eadcc9] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{pkg.title || pkg.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Masuk {daysSince(pkg.created_at)} hari lalu</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(pkg.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Finance-ready bookings</p>
                <div className="mt-4 space-y-3">
                  {!financeReadyBookings.length ? (
                    <div className="rounded-[20px] border border-dashed border-[#e8d7c1] bg-white px-4 py-5 text-sm text-slate-500">
                      Tidak ada booking siap finance saat ini.
                    </div>
                  ) : (
                    financeReadyBookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="rounded-[20px] border border-[#eadcc9] bg-white px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{booking.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {titleCase(booking.booking_status)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(booking.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin performance</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aktivitas tim operasional terbaru</h2>
              <div className="mt-6 space-y-4">
                {!recentTeamActivity.length ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada aktivitas tim operasional yang tercatat.
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
                      <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary || "Aktivitas operasional internal."}</p>
                      <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Quick links</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Jalur kerja domain operations</h2>
              <div className="mt-5 grid gap-3">
                <Link href="/superadmin/team-accounts" className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50">
                  Kelola struktur operations team
                </Link>
                <Link href="/superadmin/merchant-support" className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50">
                  Buka merchant support
                </Link>
                <Link href="/superadmin/internal-chat" className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-5 py-4 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50">
                  Buka internal chat
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager report</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kirim laporan operations manager ke superadmin</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Gunakan form ini untuk mencatat backlog, kualitas keputusan, risiko operasional, dan dukungan lintas tim yang dibutuhkan.
            </p>
            <form action={submitOperationsManagerReport} className="mt-6 space-y-4">
              <input type="hidden" name="return_to" value="/superadmin/operations-manager" />
              <input type="hidden" name="metric_snapshot" value={metricSnapshot} />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Judul laporan</label>
                <input
                  name="title"
                  required
                  defaultValue="Laporan operations manager"
                  className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan eksekutif</label>
                <textarea
                  name="summary"
                  required
                  defaultValue={queueSummary}
                  rows={4}
                  className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Status queue" name="queue_status" defaultValue={queueSummary} />
                <Field label="Status SLA" name="sla_status" defaultValue={slaSummary} />
                <Field label="Ringkasan transaksi customer" name="customer_transaction_summary" defaultValue={customerTransactionSummary} />
                <Field label="Status dana customer" name="customer_funds_status" defaultValue={customerFundsStatus} />
                <Field label="Kualitas keputusan" name="decision_quality" defaultValue="Keputusan operasional masih fokus pada merchant review, package review, dan handoff booking." />
                <Field label="Kapasitas tim" name="team_capacity" defaultValue={`${operationsManagerCount} operations manager dan ${adminCount} admin aktif.`} />
                <Field label="Eskalasi" name="escalations" defaultValue={`${openEscalationCount} review signal terbuka yang perlu dipantau lintas tim.`} />
                <Field label="Status handoff finance" name="finance_handoff_status" defaultValue={`${financeReadyBookings.length} booking siap finance dengan nilai ${formatMoney(financeReadyVolume)}.`} />
              </div>
              <TextArea label="Blocker utama" name="blockers" defaultValue="" />
              <TextArea label="Anomali transaksi" name="transaction_anomalies" defaultValue="" />
              <TextArea label="Risiko operasional" name="operational_risks" defaultValue={slaSummary} required />
              <TextArea label="Next steps" name="next_steps" defaultValue="" />
              <TextArea label="Kebutuhan keputusan dari superadmin" name="support_needed" defaultValue="Butuh prioritas keputusan untuk queue overdue dan sinyal review yang paling berisiko." required />
              <button className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Kirim laporan ke superadmin
              </button>
            </form>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Riwayat laporan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Laporan operations manager terbaru</h2>
            <div className="mt-6 space-y-4">
              {!operationsReports.length ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada laporan operations manager yang tersimpan.
                </div>
              ) : (
                operationsReports.map((report) => (
                  <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                      {formatDateTime(report.created_at)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">{report.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{report.summary}</p>
                    {getMetricText(report.metric_snapshot, "queueStatus") ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-slate-900">Queue:</span> {getMetricText(report.metric_snapshot, "queueStatus")}
                      </p>
                    ) : null}
                    {getMetricText(report.metric_snapshot, "slaStatus") ? (
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-slate-900">SLA:</span> {getMetricText(report.metric_snapshot, "slaStatus")}
                      </p>
                    ) : null}
                    {report.blockers ? <p className="mt-3 text-sm leading-7 text-rose-700">Blocker: {report.blockers}</p> : null}
                    {getMetricText(report.metric_snapshot, "operationalRisks") ? (
                      <p className="mt-3 text-sm leading-7 text-amber-700">
                        Risiko: {getMetricText(report.metric_snapshot, "operationalRisks")}
                      </p>
                    ) : null}
                    {getMetricText(report.metric_snapshot, "supportNeeded") ? (
                      <p className="mt-3 text-sm leading-7 text-sky-700">
                        Butuh keputusan: {getMetricText(report.metric_snapshot, "supportNeeded")}
                      </p>
                    ) : null}
                    {report.next_steps ? <p className="mt-3 text-sm leading-7 text-slate-600">Next steps: {report.next_steps}</p> : null}
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

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}

function TextArea({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={4}
        className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}
