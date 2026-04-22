import Link from "next/link"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { submitFinanceManagerReport } from "./actions"

type FinanceWorkspacePortal = "finance" | "superadmin"

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function getMetricText(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function ChartLegend({
  items,
}: {
  items: Array<{ label: string; tone: string }>
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-[#ead8c2] bg-[#fffaf4] px-3 py-1 text-[11px] font-medium text-slate-600"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
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
  portal = "finance",
}: {
  searchParams?: Promise<{ success?: string; error?: string; view?: string }>
  portal?: FinanceWorkspacePortal
}) {
  const adminSupabase = createAdminClient()
  const supabase = await createClient(portal)
  const params = (await searchParams) || {}
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const loginPath = portal === "superadmin" ? "/superadmin/login" : "/finance/login"
  const fallbackDashboardPath = portal === "superadmin" ? "/superadmin/dashboard" : "/finance/dashboard"

  if (!user) {
    redirect(loginPath)
  }

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }

  const canAccessDashboard =
    portal === "superadmin"
      ? currentProfile?.role === "superadmin"
      : ["finance", "finance_manager"].includes(currentProfile?.role || "")

  if (!canAccessDashboard) {
    redirect(fallbackDashboardPath)
  }

  const isFinanceManager = currentProfile?.role === "finance_manager"
  const isSuperadmin = currentProfile?.role === "superadmin"
  const canManageFinanceSettings = isFinanceManager || isSuperadmin
  const showFinanceManagerView = isFinanceManager || (isSuperadmin && params.view === "finance-manager")
  const reportReturnTo =
    portal === "superadmin" && params.view === "finance-manager" ? "/superadmin/finance-manager" : fallbackDashboardPath
  const refundsHref = portal === "superadmin" ? "/superadmin/finance-refunds?filter=auto-review" : "/finance/refunds?filter=auto-review"
  const payoutsHref = portal === "superadmin" ? "/superadmin/finance-payouts" : "/finance/payouts"
  const settingsHref = portal === "superadmin" ? "/superadmin/finance-settings" : "/finance/settings"
  const auditLogHref = portal === "superadmin" ? "/superadmin/audit-log" : "/finance/audit-log"

  const { data: payoutsData } = await adminSupabase
    .from("payout_requests")
    .select("id, amount, status, requested_at, gross_booking_amount, redfeng_commission_amount, merchant_transfer_fee")
    .order("requested_at", { ascending: false })

  const payouts = payoutsData || []
  const { data: refundsData } = await adminSupabase
    .from("refund_requests")
    .select("id, status, net_refund_amount, metadata, refund_reason_code")
    .order("created_at", { ascending: false })
  const refunds = refundsData || []
  const { data: bookingsData } = await adminSupabase
    .from("bookings")
    .select("id, booking_status, payment_status, payment_type, escrow_status, total_amount, subtotal_amount, dp_amount, final_payment_amount, customer_admin_fee_amount, customer_tax_amount")
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
  const autoReviewRefunds = refunds.filter((refund) => {
    const metadata = (refund.metadata || {}) as Record<string, unknown>
    return (
      Boolean(metadata.autoGenerated) ||
      normalizeStatus(refund.refund_reason_code || null) === "final_payment_overdue_auto_review"
    )
  })
  const autoReviewRefundCount = autoReviewRefunds.filter((refund) =>
    ["refund_requested", "refund_under_review", "refund_approved", "refund_processing_midtrans", "refund_processing_bank"].includes(
      normalizeStatus(refund.status),
    ),
  ).length
  const autoReviewRefundOutstanding = autoReviewRefunds
    .filter((refund) =>
      !["refund_paid", "refund_rejected", "refund_failed", "refund_reconciled", "refund_closed"].includes(
        normalizeStatus(refund.status),
      ),
    )
    .reduce((sum, refund) => sum + Number(refund.net_refund_amount || 0), 0)
  const agedPendingCount = payouts.filter((item) => {
    const status = normalizeStatus(item.status)
    if (!["pending", "approved", "processing"].includes(status)) return false
    const requestedAt = item.requested_at ? new Date(item.requested_at) : null
    if (!requestedAt || Number.isNaN(requestedAt.getTime())) return false
    return currentTime - requestedAt.getTime() >= 2 * 24 * 60 * 60 * 1000
  }).length
  const customerTransactionRows = bookings
    .map((booking) => {
      const paymentStatus = normalizeStatus(booking.payment_status)
      const paymentType = normalizeStatus(booking.payment_type)
      const totalAmount = Number(booking.total_amount || 0)
      const subtotalAmount = Number(booking.subtotal_amount || 0)
      const dpAmount = Number(booking.dp_amount || 0)
      const finalPaymentAmount = Number(booking.final_payment_amount || 0)
      const customerAdminFeeAmount = Number(booking.customer_admin_fee_amount || 0)
      const customerTaxAmount = Number(booking.customer_tax_amount || 0)
      const receivedAmount =
        paymentStatus === "paid" ? totalAmount : paymentStatus === "dp_paid" ? dpAmount : 0
      const receivedRatio = totalAmount > 0 ? Math.min(receivedAmount / totalAmount, 1) : 0

      return {
        bookingStatus: normalizeStatus(booking.booking_status),
        escrowStatus: normalizeStatus(booking.escrow_status),
        paymentStatus,
        paymentType,
        receivedAmount,
        dpAmount,
        finalPaymentAmount,
        subtotalAmount,
        customerAdminFeeCollected: Math.round(customerAdminFeeAmount * receivedRatio),
        customerTaxCollected: Math.round(customerTaxAmount * receivedRatio),
      }
    })
    .filter((item) => item.receivedAmount > 0)

  const dpReceivedTotal = customerTransactionRows
    .filter((item) => item.paymentStatus === "dp_paid")
    .reduce((sum, item) => sum + item.dpAmount, 0)
  const finalSettlementTotal = customerTransactionRows
    .filter((item) => item.paymentStatus === "paid" && item.paymentType === "dp")
    .reduce((sum, item) => sum + item.finalPaymentAmount, 0)
  const fullPaymentTotal = customerTransactionRows
    .filter((item) => item.paymentStatus === "paid" && item.paymentType !== "dp")
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const grossCustomerTransactionTotal = dpReceivedTotal + finalSettlementTotal + fullPaymentTotal
  const customerAdminFeeCollectedTotal = customerTransactionRows.reduce(
    (sum, item) => sum + item.customerAdminFeeCollected,
    0,
  )
  const customerTaxCollectedTotal = customerTransactionRows.reduce(
    (sum, item) => sum + item.customerTaxCollected,
    0,
  )
  const customerHeldFundsTotal = customerTransactionRows
    .filter((item) => ["partial_hold", "held", "awaiting_admin_handoff", "finance_review", "payout_processing"].includes(item.escrowStatus))
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const financeReviewFundsTotal = customerTransactionRows
    .filter((item) => ["finance_review", "payout_processing"].includes(item.escrowStatus))
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const paidOutFundsTotal = customerTransactionRows
    .filter((item) => item.escrowStatus === "paid_out")
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const packageBaseSettledTotal = customerTransactionRows.reduce((sum, item) => sum + item.subtotalAmount, 0)
  const merchantObligationTotal = payouts.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const commissionProjectedTotal = payouts.reduce((sum, item) => sum + Number(item.redfeng_commission_amount || 0), 0)
  const transferFeeProjectedTotal = payouts.reduce((sum, item) => sum + Number(item.merchant_transfer_fee || 0), 0)

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
      { label: "Transaksi customer", value: formatMoney(grossCustomerTransactionTotal), note: "Total uang customer yang sudah masuk ke Red Feng." },
      { label: "Dana tertahan", value: formatMoney(customerHeldFundsTotal), note: "Dana customer yang masih ada di escrow / belum selesai." },
      { label: "Payout aging", value: String(agedPendingCount), note: "Payout pending/processing yang berumur 2 hari atau lebih." },
      { label: "Outstanding", value: formatMoney(pendingTotal), note: "Nominal net payout yang masih belum keluar dari finance queue." },
      { label: "DP overdue auto-review", value: String(autoReviewRefundCount), note: "Kasus DP lewat H-3 yang sedang menunggu review refund." },
    ]
    const queueChartItems = [
      { label: "Pending", value: pendingCount, tone: "bg-amber-400" },
      { label: "Approved / Processing", value: processingCount, tone: "bg-sky-500" },
      { label: "Paid", value: paidCount, tone: "bg-emerald-500" },
      { label: "Rejected", value: rejectedCount, tone: "bg-rose-500" },
    ]
    const queueChartBase = queueChartItems.reduce((sum, item) => sum + item.value, 0) || 1
    const customerFundsChartItems = [
      { label: "Dana tertahan", value: customerHeldFundsTotal, tone: "bg-rose-500" },
      { label: "Sudah di finance", value: financeReviewFundsTotal, tone: "bg-sky-500" },
      { label: "Sudah paid out", value: paidOutFundsTotal, tone: "bg-emerald-500" },
    ]
    const customerFundsChartBase = Math.max(grossCustomerTransactionTotal, 1)
    const customerMixItems = [
      { label: "DP", value: dpReceivedTotal, tone: "bg-amber-400" },
      { label: "Pelunasan", value: finalSettlementTotal, tone: "bg-sky-500" },
      { label: "Full payment", value: fullPaymentTotal, tone: "bg-emerald-500" },
    ]
    const customerMixBase = Math.max(grossCustomerTransactionTotal, 1)

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
                  Finance Manager
                </span>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                  Pantau queue payout, aging, dan performa tim finance dari satu dashboard.
                </h1>
                <p className="mt-4 text-base leading-8 text-orange-50/90">
                  Dashboard ini membantu finance manager membaca beban outstanding, payout yang mulai macet, dan aktivitas tim finance tanpa harus memakai akses superadmin.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={refundsHref}
                    className="rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                    Buka Auto Review Refund
                  </Link>
                  <Link
                    href={payoutsHref}
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Payout Queue
                  </Link>
                  <Link
                    href={auditLogHref}
                    className="rounded-[18px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Buka Audit Log
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
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
                  <div>
                    <p className="text-sm text-orange-50/80">DP overdue auto-review</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{autoReviewRefundCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {managerMetricCards.map((card) => (
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Diagram Dana Customer</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Diagram arus dana customer</h2>
              <ChartLegend
                items={[
                  { label: "Dana tertahan", tone: "bg-rose-500" },
                  { label: "Masuk finance", tone: "bg-sky-500" },
                  { label: "Sudah paid out", tone: "bg-emerald-500" },
                ]}
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Bruto transaksi customer</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(grossCustomerTransactionTotal)}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Kewajiban payout merchant</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(merchantObligationTotal)}</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {customerFundsChartItems.map((item) => {
                  const width = Math.max((item.value / customerFundsChartBase) * 100, item.value > 0 ? 8 : 0)
                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="font-semibold text-slate-950">{formatMoney(item.value)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#f4e7d6]">
                        <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Admin fee terkumpul</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(customerAdminFeeCollectedTotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pajak customer</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(customerTaxCollectedTotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Komisi projected</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(commissionProjectedTotal)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Grafik Queue Dan Komposisi</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Grafik queue dan komposisi transaksi</h2>
              <ChartLegend
                items={[
                  { label: "Pending", tone: "bg-amber-400" },
                  { label: "Approved / Processing", tone: "bg-sky-500" },
                  { label: "Paid", tone: "bg-emerald-500" },
                  { label: "Rejected", tone: "bg-rose-500" },
                ]}
              />
              <div className="mt-6 space-y-4">
                {queueChartItems.map((item) => {
                  const width = Math.max((item.value / queueChartBase) * 100, item.value > 0 ? 8 : 0)
                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="font-semibold text-slate-950">{item.value}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#f4e7d6]">
                        <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <ChartLegend
                items={[
                  { label: "DP", tone: "bg-amber-400" },
                  { label: "Pelunasan", tone: "bg-sky-500" },
                  { label: "Full payment", tone: "bg-emerald-500" },
                ]}
              />
              <div className="mt-8 space-y-4">
                {customerMixItems.map((item) => {
                  const width = Math.max((item.value / customerMixBase) * 100, item.value > 0 ? 8 : 0)
                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="font-semibold text-slate-950">{formatMoney(item.value)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#f4e7d6]">
                        <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Dasar paket settle</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(packageBaseSettledTotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Transfer fee projected</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(transferFeeProjectedTotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Dana paid out</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(paidOutFundsTotal)}</p>
                </div>
              </div>
            </div>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Panduan Baca</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Prioritas finance manager</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>1. Menjaga payout aging tetap rendah dan outstanding tidak menumpuk terlalu lama.</p>
                  <p>2. Melihat apakah team finance bergerak seimbang di approve, processing, paid, dan rejected.</p>
                  <p>3. Menggunakan Audit Log untuk investigasi keputusan transfer atau payout yang macet.</p>
                </div>
              </div>

            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Laporan Ke Superadmin</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kirim laporan finance manager</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isi laporan finance secara lengkap agar superadmin bisa membaca kondisi payout, aging, posisi keuangan, risiko, dan kebutuhan keputusan tanpa mengejar detail tambahan.
              </p>
              <form action={submitFinanceManagerReport} className="mt-6 space-y-4">
                <input type="hidden" name="return_to" value={reportReturnTo} />
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
                    grossCustomerTransactionTotal,
                    dpReceivedTotal,
                    finalSettlementTotal,
                    fullPaymentTotal,
                    customerHeldFundsTotal,
                    financeReviewFundsTotal,
                    paidOutFundsTotal,
                    packageBaseSettledTotal,
                    customerAdminFeeCollectedTotal,
                    customerTaxCollectedTotal,
                    merchantObligationTotal,
                    commissionProjectedTotal,
                    transferFeeProjectedTotal,
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan eksekutif</label>
                  <textarea
                    name="summary"
                    required
                    placeholder="Ringkas kondisi keuangan dan payout paling penting yang harus langsung dipahami superadmin."
                    className="min-h-[140px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan transaksi customer</label>
                  <textarea
                    name="customer_transaction_summary"
                    required
                    placeholder="Jelaskan total transaksi customer, komposisi DP, pelunasan, full payment, dan pola pemasukan utama."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status dana customer</label>
                  <textarea
                    name="customer_funds_status"
                    required
                    placeholder="Jelaskan berapa dana masih held, sudah masuk finance review, sudah paid out, dan titik penumpukannya."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status queue payout</label>
                  <textarea
                    name="payout_queue_status"
                    required
                    placeholder="Jelaskan kondisi payout pending, processing, rejected, dan antrean yang paling berat."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status aging dan outstanding</label>
                  <textarea
                    name="aging_status"
                    required
                    placeholder="Jelaskan payout aging, outstanding utama, dan area yang mulai macet."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Posisi keuangan dan ringkasan nominal</label>
                  <textarea
                    name="financial_position"
                    required
                    placeholder="Jelaskan outstanding nominal, payout paid, nominal tertahan, dan poin keuangan utama yang perlu diketahui superadmin."
                    className="min-h-[130px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kewajiban merchant dan margin Red Feng</label>
                  <textarea
                    name="merchant_obligation_status"
                    required
                    placeholder="Jelaskan kewajiban payout merchant, komisi Red Feng, biaya transfer merchant, admin fee customer, dan pajak customer."
                    className="min-h-[130px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kualitas eksekusi tim finance</label>
                  <textarea
                    name="execution_quality"
                    placeholder="Jelaskan distribusi approve, processing, paid, rejected, serta kualitas eksekusi tim finance."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Masalah transfer dan payout</label>
                  <textarea
                    name="transfer_issues"
                    placeholder="Jelaskan kendala transfer, payout tertahan, mismatch data, atau isu rekonsiliasi yang perlu dicatat."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Anomali finansial dan rekonsiliasi</label>
                  <textarea
                    name="financial_anomalies"
                    placeholder="Jelaskan payment yang belum sinkron, payout mismatch, transfer tertahan, atau anomali rekonsiliasi."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Risiko keuangan</label>
                  <textarea
                    name="financial_risks"
                    required
                    placeholder="Jelaskan risiko finansial, risiko payout, risiko cashflow, atau potensi komplain akibat keterlambatan finansial."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
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
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kasus prioritas tinggi</label>
                  <textarea
                    name="priority_cases"
                    placeholder="Tulis transaksi, payout, atau booking prioritas tinggi yang harus mendapat perhatian superadmin."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kebutuhan keputusan dari superadmin</label>
                  <textarea
                    name="support_needed"
                    required
                    placeholder="Jelaskan keputusan, dukungan lintas tim, atau prioritas keuangan yang perlu ditegaskan superadmin."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <button className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Kirim laporan ke superadmin
                </button>
              </form>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Riwayat Laporan</p>
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
                      {getMetricText(report.metric_snapshot, "payoutQueueStatus") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Queue:</span> {getMetricText(report.metric_snapshot, "payoutQueueStatus")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "agingStatus") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Aging:</span> {getMetricText(report.metric_snapshot, "agingStatus")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "customerTransactionSummary") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Transaksi customer:</span> {getMetricText(report.metric_snapshot, "customerTransactionSummary")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "customerFundsStatus") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Status dana customer:</span> {getMetricText(report.metric_snapshot, "customerFundsStatus")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "financialPosition") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Posisi keuangan:</span> {getMetricText(report.metric_snapshot, "financialPosition")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "merchantObligationStatus") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Kewajiban merchant & margin:</span> {getMetricText(report.metric_snapshot, "merchantObligationStatus")}
                        </p>
                      ) : null}
                      {report.blockers ? <p className="mt-3 text-sm leading-7 text-rose-700">Blocker: {report.blockers}</p> : null}
                      {getMetricText(report.metric_snapshot, "financialAnomalies") ? (
                        <p className="mt-3 text-sm leading-7 text-amber-700">
                          Anomali: {getMetricText(report.metric_snapshot, "financialAnomalies")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "financialRisks") ? (
                        <p className="mt-3 text-sm leading-7 text-amber-700">
                          Risiko: {getMetricText(report.metric_snapshot, "financialRisks")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "priorityCases") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          Kasus prioritas: {getMetricText(report.metric_snapshot, "priorityCases")}
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

  const metricCards = [
    { label: "Booking masuk finance", value: String(bookings.filter((item) => normalizeStatus(item.booking_status) === "finance_review").length), note: "Booking yang sudah masuk queue finance, baik otomatis maupun dari admin." },
    { label: "Payout pending", value: String(pendingCount), note: "Request payout menunggu keputusan finance." },
    { label: "Sedang diproses", value: String(processingCount), note: "Transfer sedang dijalankan atau sudah di-approve." },
    { label: "Sudah paid", value: String(paidCount), note: "Request payout yang sudah final." },
    { label: "Nominal outstanding", value: formatMoney(pendingTotal), note: "Nominal yang masih menunggu pencairan." },
    { label: "DP overdue auto-review", value: String(autoReviewRefundCount), note: "Kasus refund otomatis dari booking DP yang melewati H-3." },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Finance Command Center
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Kelola payout approval merchant dari workspace finance.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Semua arus payout dipusatkan di area finance agar admin hanya melakukan handoff booking dan finance mengontrol transfer, komisi, fee, serta potongan payout merchant.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
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

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
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

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance priorities</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Prioritas payout hari ini</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Dashboard depan finance lebih berguna jika langsung menunjukkan fokus kerja hari ini, bukan mengulang menu navigasi yang sudah ada di header.
              </p>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#efe1cf] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_100%)] p-4 sm:rounded-[28px] sm:p-6">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Payout pending",
                    value: String(pendingCount),
                    note: "Request yang belum diputuskan.",
                  },
                  {
                    label: "Sedang diproses",
                    value: String(processingCount),
                    note: "Transfer yang masih berjalan.",
                  },
                  {
                    label: "Aging 2+ hari",
                    value: String(agedPendingCount),
                    note: "Queue yang mulai butuh perhatian cepat.",
                  },
                  {
                    label: "Outstanding",
                    value: formatMoney(pendingTotal),
                    note: "Nominal yang masih belum keluar.",
                  },
                  {
                    label: "Auto-review DP",
                    value: String(autoReviewRefundCount),
                    note: `Outstanding ${formatMoney(autoReviewRefundOutstanding)}.`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[20px] border border-[#efe1cf] bg-white p-4 sm:rounded-[22px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={refundsHref}
                  className="inline-flex items-center justify-center rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Buka Auto Review Refund
                </Link>
                <Link
                  href={payoutsHref}
                  className="inline-flex items-center justify-center rounded-[18px] border border-[#e7d6c1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                >
                  Buka Payout Queue
                </Link>
                {canManageFinanceSettings ? (
                  <Link
                    href={settingsHref}
                    className="inline-flex items-center justify-center rounded-[18px] border border-[#e7d6c1] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  >
                    Buka Finance Settings
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                Fokus utama tim finance di dashboard depan adalah membaca backlog dan segera masuk ke antrean payout. Manajemen akun finance tetap berada di jalur manager, bukan workspace eksekusi harian.
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance note</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aturan release dana</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Dana customer tetap masuk dan ditahan di rekening Red Feng.</p>
                <p>2. Merchant klik <span className="font-semibold text-slate-900">Arrived</span> saat sudah di meeting point.</p>
                <p>3. Customer klik <span className="font-semibold text-slate-900">Picked up</span> saat sudah naik kendaraan.</p>
                <p>4. Merchant klik <span className="font-semibold text-slate-900">Go</span> agar trip tervalidasi berjalan.</p>
                <p>5. Booking normal yang sudah lunas masuk queue finance secara semi-otomatis, lalu finance transfer sesuai setting komisi dan biaya.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
