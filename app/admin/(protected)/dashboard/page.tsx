import Link from "next/link"
import { redirect } from "next/navigation"
import { formatAdminCode, formatFinanceCode } from "@/lib/merchant-code"
import { canAccessInternalPortal, getInternalPortalHomePath, getRoleLabel } from "@/lib/internal-roles"
import { getPublicAccountHomePath, resolvePublicAccountRole } from "@/lib/login-role-lock"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  OPERATIONS_DASHBOARD_SCOPE,
  OPERATIONS_PRODUCT_WIDGET_CATALOG,
  resolveOperationsDashboardWidgetKeys,
} from "@/lib/admin-dashboard-widgets"
import { submitOperationsManagerReport } from "./actions"
import { createAdminAccount } from "@/app/admin/(protected)/team-accounts/actions"
import { createFinanceAccount } from "@/app/finance/(protected)/team-accounts/finance-actions"

type AdminWorkspacePortal = "admin" | "superadmin"

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

function formatMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function getMetricText(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function getMetricNumber(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const value = snapshot?.[key]
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

type WebVitalEventRow = {
  event_type: string | null
  metric_name: string
  metric_value: number | null
  path: string
  rating: string | null
  created_at: string | null
}

type DashboardPackageRow = {
  id: string
  status: string | null
  created_at: string | null
  merchant_id: string | null
  title: string | null
  city: string | null
  country: string | null
  destination_province: string | null
  destination_country_id: string | null
  travel_style: string | null
}

type DashboardBookingRow = {
  id: string
  package_id: string | null
  booking_status: string | null
  created_at: string | null
  payment_status: string | null
  payment_type: string | null
  escrow_status: string | null
  total_amount: number | null
  dp_amount: number | null
  final_payment_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
}

type MerchantDeletionRequestRow = {
  id: string
  merchant_id: string | null
  merchant_email: string | null
  merchant_name: string | null
  reason: string | null
  status: string | null
  requested_at: string | null
}

type MerchantReviewRequestRow = {
  id: string
  merchant_id: string | null
  request_type: string | null
  status: string | null
  admin_note: string | null
  requested_at: string | null
}

type DashboardAuditLogRow = {
  id: string
  actor_role: string | null
  target_type: string | null
  action: string
  summary: string | null
  created_at: string | null
}

function averageMetricValue(rows: WebVitalEventRow[], metricName: string) {
  const matchingRows = rows.filter((row) => row.metric_name === metricName && Number.isFinite(Number(row.metric_value)))
  if (matchingRows.length === 0) return null
  const total = matchingRows.reduce((sum, row) => sum + Number(row.metric_value || 0), 0)
  return total / matchingRows.length
}

function formatPerformanceMetric(metricName: string, value: number | null) {
  if (value == null) return "-"
  if (metricName === "CLS") return value.toFixed(3)
  return `${Math.round(value)} ms`
}

function formatRelativeHours(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  const diffHours = Math.max(Math.round((Date.now() - parsed.getTime()) / (1000 * 60 * 60)), 0)
  if (diffHours < 1) return "< 1 jam lalu"
  if (diffHours < 24) return `${diffHours} jam lalu`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} hari lalu`
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

function getDayKey(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function buildRecentDayBuckets(days = 30) {
  const buckets: Array<{ key: string; label: string; value: number }> = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    buckets.push({
      key: date.toISOString().slice(0, 10),
      label: formatShortDate(date.toISOString()),
      value: 0,
    })
  }

  return buckets
}

function ProductMiniIcon({
  kind,
  className,
}: {
  kind: "package" | "flight" | "hotel" | "train" | "bus" | "ship" | "cruise"
  className?: string
}) {
  if (kind === "flight") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M3 14.5l7-1.8 5.8-6.2a1.8 1.8 0 012.6 2.5l-6.1 5.8-1.8 7-2.1-.8 1.1-5.1-3.6 2.8H3.8l3.6-4.2-5-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "hotel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M6 3h8v18H6V3zm2 2v3h4V5H8zm8 5h2a2 2 0 012 2v9h-4v-8h-2v8h-2V3h2v7z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "train") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M7 3h10a3 3 0 013 3v7.5a3.5 3.5 0 01-3.5 3.5l1.5 2.5h-2.3L14 17H10l-1.7 2.5H6l1.5-2.5A3.5 3.5 0 014 13.5V6a3 3 0 013-3zm0 2a1 1 0 00-1 1v3h12V6a1 1 0 00-1-1H7zm0 6v2.5a1.5 1.5 0 001.5 1.5h7a1.5 1.5 0 001.5-1.5V11H7zm2 1.2a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "bus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M7 4h10c2 0 3 1.3 3 3v8a3 3 0 01-2 2.8V20h-2v-2H8v2H6v-2.2A3 3 0 014 15V7c0-1.7 1-3 3-3zm0 2a1 1 0 00-1 1v3h12V7a1 1 0 00-1-1H7zm0 6v3a1 1 0 001 1h8a1 1 0 001-1v-3H7zm2 1a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "ship") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M10 4h4v3h3v5l2 1.5V16l-7 4-7-4v-2.5l2-1.5V9h4V4zm-3 9.2L5 14.5v.4l7 2.9 7-2.9v-.4l-2-1.3v1.3h-2v-4H7v4.7zm4-7.2v1h2V6h-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "cruise") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M8 5h6v2h2v3h2v5l-6 3-6-3v-2.8L8 10V5zm2 2v1h2V7h-2zm-1 5.4l-1 .8v.5l4 1.9 4-1.9v-.5l-1-.8v1H9v-1zm-2.8 6.1c1 .9 2 1.4 3.1 1.4.8 0 1.5-.2 2.1-.7.7.5 1.4.7 2.2.7 1.1 0 2.1-.5 3.1-1.4l1.3 1c-1.4 1.4-2.9 2-4.4 2-.8 0-1.5-.2-2.2-.6-.7.4-1.4.6-2.2.6-1.5 0-3-.6-4.4-2l1.4-1z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 3l2.6 5.3L20 9l-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6L4 9l5.4-.7L12 3zm-1 7v7h2v-7h-2z" fill="currentColor" />
    </svg>
  )
}

function getDashboardPeriod(value: string | null | undefined) {
  const normalized = String(value || "30d").trim().toLowerCase()
  if (normalized === "7d") return { value: "7d", label: "7 hari terakhir", days: 7 }
  if (normalized === "90d") return { value: "90d", label: "90 hari terakhir", days: 90 }
  if (normalized === "all") return { value: "all", label: "Semua waktu", days: null }
  return { value: "30d", label: "30 hari terakhir", days: 30 }
}

function getPeriodStart(days: number | null) {
  if (!days) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

function isWithinPeriod(value: string | null | undefined, start: Date | null) {
  if (!start) return true
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed >= start
}

function getOperationsWorkspace(value: string | null | undefined) {
  const normalized = String(value || "all").trim().toLowerCase()
  if (["merchant", "package_review", "booking_center", "anomalies"].includes(normalized)) {
    return normalized
  }
  return "all"
}

function getDashboardWidgetStatusMeta(status: "connected" | "partial" | "roadmap") {
  if (status === "connected") {
    return { label: "Terhubung", className: "bg-emerald-50 text-emerald-600" }
  }
  if (status === "partial") {
    return { label: "Sebagian", className: "bg-orange-50 text-orange-600" }
  }
  return { label: "Roadmap", className: "bg-slate-100 text-slate-500" }
}

function getProductIconKind(productLabel: string) {
  if (productLabel === "Pesawat") return "flight" as const
  if (productLabel === "Hotel") return "hotel" as const
  if (productLabel === "Kereta Api") return "train" as const
  if (productLabel === "Bus & Travel") return "bus" as const
  if (productLabel === "Kapal Laut") return "ship" as const
  if (productLabel === "Kapal Pesiar") return "cruise" as const
  return "package" as const
}

function classifyBookingProduct(booking: DashboardBookingRow) {
  return booking.package_id ? "Paket Tour" : "Pesawat"
}

export default async function AdminDashboard({
  searchParams,
  portal = "admin",
}: {
  searchParams?: Promise<{ success?: string; error?: string; view?: string; period?: string; workspace?: string }>
  portal?: AdminWorkspacePortal
}) {
  const adminSupabase = createAdminClient()
  const supabase = await createClient(portal)
  const params = (await searchParams) || {}
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const loginPath = portal === "superadmin" ? "/superadmin/login" : "/admin/login"
  const fallbackDashboardPath = portal === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard"

  if (!user) {
    redirect(loginPath)
  }

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }

  const normalizedRole = String(currentProfile?.role || "").trim().toLowerCase()
  const canAccessDashboard =
    portal === "superadmin"
      ? normalizedRole === "superadmin"
      : ["admin", "operations_manager", "superadmin"].includes(normalizedRole)

  if (!canAccessDashboard) {
    const redirectPath =
      normalizedRole === "superadmin"
        ? getInternalPortalHomePath("superadmin")
        : canAccessInternalPortal("admin", normalizedRole)
          ? getInternalPortalHomePath("admin")
          : getPublicAccountHomePath(resolvePublicAccountRole(normalizedRole))

    if (redirectPath === fallbackDashboardPath) {
      redirect(loginPath)
    }

    redirect(redirectPath)
  }

  const isSuperadmin = currentProfile?.role === "superadmin"
  const isOperationsManager = currentProfile?.role === "operations_manager"
  const showOperationsManagerView = isOperationsManager || (isSuperadmin && params.view === "operations-manager")
  const reportReturnTo =
    portal === "superadmin" && params.view === "operations-manager" ? "/superadmin/operations-manager" : fallbackDashboardPath
  const operationsPeriod = getDashboardPeriod(params.period)
  const operationsPeriodStart = getPeriodStart(operationsPeriod.days)
  const operationsChartDays = operationsPeriod.days || 30
  const operationsWorkspace = getOperationsWorkspace(params.workspace)
  const widgetPreferenceResult = showOperationsManagerView
    ? await adminSupabase
        .from("dashboard_widget_preferences")
        .select("widget_key, enabled")
        .eq("profile_id", user.id)
        .eq("dashboard_scope", OPERATIONS_DASHBOARD_SCOPE)
        .order("sort_order", { ascending: true })
    : { data: null, error: null }
  const enabledOperationsWidgetKeys = resolveOperationsDashboardWidgetKeys(
    widgetPreferenceResult.error
      ? null
      : ((widgetPreferenceResult.data as Array<{ widget_key: string | null; enabled: boolean | null }> | null) || []),
  )

  const [
    merchantResult,
    activeMerchantResult,
    packageResult,
    bookingResult,
    webVitalsResult,
    deletionRequestResult,
    reviewRequestResult,
    auditLogResult,
  ] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id, created_at")
      .eq("verification_status", "pending"),
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    adminSupabase
      .from("packages")
      .select("id, status, created_at, merchant_id, title, city, country, destination_province, destination_country_id, travel_style")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, package_id, booking_status, created_at, payment_status, payment_type, escrow_status, total_amount, dp_amount, final_payment_amount, customer_admin_fee_amount, customer_tax_amount")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("web_vitals_events")
      .select("event_type, metric_name, metric_value, path, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(240),
    adminSupabase
      .from("merchant_deletion_requests")
      .select("id, merchant_id, merchant_email, merchant_name, reason, status, requested_at")
      .in("status", ["pending", "manager_rejected"])
      .order("requested_at", { ascending: false })
      .limit(12),
    adminSupabase
      .from("merchant_review_requests")
      .select("id, merchant_id, request_type, status, admin_note, requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(12),
    adminSupabase
      .from("admin_action_logs")
      .select("id, actor_role, target_type, action, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ])

  const pendingMerchantsData = (merchantResult.data as Array<{ id: string; created_at: string | null }> | null) || []
  const activeMerchantCount = activeMerchantResult.count || 0
  const packages = (packageResult.data as DashboardPackageRow[] | null) || []
  const bookings = (bookingResult.data as DashboardBookingRow[] | null) || []
  const webVitalEvents = webVitalsResult.error
    ? []
    : ((webVitalsResult.data as WebVitalEventRow[] | null) || [])
  const deletionRequests = deletionRequestResult.error
    ? []
    : ((deletionRequestResult.data as MerchantDeletionRequestRow[] | null) || [])
  const reviewRequests = reviewRequestResult.error
    ? []
    : ((reviewRequestResult.data as MerchantReviewRequestRow[] | null) || [])
  const recentAuditLogs = auditLogResult.error
    ? []
    : ((auditLogResult.data as DashboardAuditLogRow[] | null) || [])
  const pendingMerchants = pendingMerchantsData.length

  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const packageMerchantIds = Array.from(new Set(packages.map((pkg) => pkg.merchant_id).filter((id): id is string => Boolean(id))))
  const packageMerchants =
    packageMerchantIds.length > 0
      ? (
          (await adminSupabase
            .from("merchants")
            .select("id, brand_name, company_name")
            .in("id", packageMerchantIds)).data as Array<{ id: string; brand_name: string | null; company_name: string | null }> | null
        ) || []
      : []
  const merchantNameMap = new Map(
    packageMerchants.map((merchant) => [merchant.id, merchant.brand_name || merchant.company_name || "Merchant tanpa nama"]),
  )

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const financeReadyCount = bookings.filter((item) =>
    ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(item.booking_status)),
  ).length
  const merchantOverdueCount = pendingMerchantsData.filter((merchant) => daysSince(merchant.created_at) >= 3).length
  const packageOverdueCount = packages.filter(
    (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
  ).length
  const bookingStalledCount = bookings.filter(
    (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
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
      note: "Booking yang sudah masuk antrean otomatis / siap finance selama 1 hari atau lebih.",
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
      label: "Antrean review",
      value: String(pendingPackages),
      note: "Paket yang masih menunggu keputusan admin.",
    },
    {
      label: "Package approved",
      value: String(approvedPackages),
      note: "Paket yang sudah lolos review dan siap tayang.",
    },
    {
      label: "Handoff finance",
      value: String(financeReadyCount),
      note: "Booking yang sudah masuk antrean otomatis atau siap dipantau sebelum finance eksekusi.",
    },
  ]
  const recentWebVitalEvents = webVitalEvents
  const performanceCards = [
    {
      label: "Avg LCP",
      value: formatPerformanceMetric("LCP", averageMetricValue(recentWebVitalEvents, "LCP")),
      note: "Rata-rata dari sampel terbaru yang masuk.",
    },
    {
      label: "Avg INP",
      value: formatPerformanceMetric("INP", averageMetricValue(recentWebVitalEvents, "INP")),
      note: "Respons interaksi dari sampel terbaru.",
    },
    {
      label: "Avg CLS",
      value: formatPerformanceMetric("CLS", averageMetricValue(recentWebVitalEvents, "CLS")),
      note: "Stabilitas layout publik terbaru.",
    },
    {
      label: "Poor vitals",
      value: String(recentWebVitalEvents.filter((row) => row.rating === "poor").length),
      note: "Sampel yang masuk rating poor.",
    },
  ]
  const trackedPublicPaths = new Set(recentWebVitalEvents.map((row) => row.path)).size
  const latestPerformanceSampleAt = recentWebVitalEvents[0]?.created_at || null
  const performancePathSummary = Array.from(
    recentWebVitalEvents.reduce((map, row) => {
      const current = map.get(row.path) || { path: row.path, samples: 0, poorCount: 0 }
      current.samples += 1
      if (row.rating === "poor") current.poorCount += 1
      map.set(row.path, current)
      return map
    }, new Map<string, { path: string; samples: number; poorCount: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.poorCount - a.poorCount || b.samples - a.samples)
    .slice(0, 5)

  const customerTransactionRows = bookings
    .map((booking) => {
      const paymentStatus = normalizeStatus(booking.payment_status)
      const paymentType = normalizeStatus(booking.payment_type)
      const totalAmount = Number(booking.total_amount || 0)
      const dpAmount = Number(booking.dp_amount || 0)
      const finalPaymentAmount = Number(booking.final_payment_amount || 0)
      const receivedAmount =
        paymentStatus === "paid" ? totalAmount : paymentStatus === "dp_paid" ? dpAmount : 0
      const receivedRatio = totalAmount > 0 ? Math.min(receivedAmount / totalAmount, 1) : 0

      return {
        id: booking.id,
        packageId: booking.package_id,
        createdAt: booking.created_at,
        paymentStatus,
        paymentType,
        escrowStatus: normalizeStatus(booking.escrow_status),
        bookingStatus: normalizeStatus(booking.booking_status),
        receivedAmount,
        dpAmount,
        finalPaymentAmount,
        customerAdminFeeCollected: Math.round(Number(booking.customer_admin_fee_amount || 0) * receivedRatio),
        customerTaxCollected: Math.round(Number(booking.customer_tax_amount || 0) * receivedRatio),
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
  const customerReadyForFinanceFundsTotal = customerTransactionRows
    .filter((item) => ["awaiting_admin_handoff", "finance_review"].includes(item.bookingStatus))
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const customerOperationallyBlockedFundsTotal = customerTransactionRows
    .filter((item) => item.paymentStatus === "paid" && !["awaiting_admin_handoff", "finance_review", "finance_processing", "payout_completed"].includes(item.bookingStatus))
    .reduce((sum, item) => sum + item.receivedAmount, 0)
  const customerPaidOutFundsTotal = customerTransactionRows
    .filter((item) => item.escrowStatus === "paid_out")
    .reduce((sum, item) => sum + item.receivedAmount, 0)

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
      label: "Handoff finance",
      value: String(financeReadyCount),
      note: "Booking yang sudah masuk jalur finance dan perlu dipantau lintas admin dan finance.",
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
  const latestOperationsReport = operationsReports[0] || null
  const latestFinanceReport = financeReports[0] || null
  const reportActorEntries: Array<[string, string]> = [
    ...adminProfiles.map((profile): [string, string] => [profile.id, profile.username || formatAdminCode(profile.id)]),
    ...financeProfiles.map((profile): [string, string] => [profile.id, profile.email || formatFinanceCode(profile.id)]),
  ]
  const reportActorMap = new Map<string, string>(reportActorEntries)

  const totalOperationalWarnings = merchantOverdueCount + packageOverdueCount + bookingStalledCount + deletionRequests.length + reviewRequests.length
  const adminWorkCards = [
    {
      label: "Pending approvals",
      value: pendingMerchants,
      note: "Merchant baru menunggu pemeriksaan admin.",
      href: "/admin/merchants/pending-approvals",
      cta: "Buka approvals",
      tone: "text-orange-600",
    },
    {
      label: "Package Review",
      value: pendingPackages,
      note: "Paket merchant yang perlu direview.",
      href: "/admin/packages",
      cta: "Review paket",
      tone: "text-violet-600",
    },
    {
      label: "Booking Center",
      value: financeReadyCount,
      note: "Booking siap handoff atau perlu monitor.",
      href: "/admin/bookings",
      cta: "Cek booking",
      tone: "text-sky-600",
    },
    {
      label: "Perlu Perhatian",
      value: totalOperationalWarnings,
      note: "Overdue merchant, paket, dan booking stalled.",
      href: "/admin/dashboard",
      cta: "Lihat detail",
      tone: "text-rose-600",
    },
  ]

  if (showOperationsManagerView) {
    const periodBookings = bookings.filter((booking) => isWithinPeriod(booking.created_at, operationsPeriodStart))
    const periodPackages = packages.filter((pkg) => isWithinPeriod(pkg.created_at, operationsPeriodStart))
    const periodDeletionRequests = deletionRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const periodReviewRequests = reviewRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const periodAuditLogs = recentAuditLogs.filter((log) => isWithinPeriod(log.created_at, operationsPeriodStart))
    const periodCustomerTransactionRows = customerTransactionRows.filter((transaction) =>
      isWithinPeriod(transaction.createdAt, operationsPeriodStart),
    )
    const periodPendingPackages = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
    const periodApprovedPackages = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
    const periodDraftPackages = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
    const periodRejectedPackages = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "rejected").length
    const periodPackageOverdueCount = periodPackages.filter(
      (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
    ).length
    const periodFinanceReadyCount = periodBookings.filter((item) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(item.booking_status)),
    ).length
    const periodBookingStalledCount = periodBookings.filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
    const periodOperationalWarnings =
      merchantOverdueCount + periodPackageOverdueCount + periodBookingStalledCount + periodDeletionRequests.length + periodReviewRequests.length
    const totalBookings = periodBookings.length
    const totalRevenue = periodCustomerTransactionRows.reduce((sum, item) => sum + item.receivedAmount, 0)
    const bookingTrendRows = buildRecentDayBuckets(operationsChartDays)
    const bookingTrendMap = new Map(bookingTrendRows.map((row) => [row.key, row]))
    periodBookings.forEach((booking) => {
      const dayKey = getDayKey(booking.created_at)
      const bucket = dayKey ? bookingTrendMap.get(dayKey) : null
      if (bucket) bucket.value += 1
    })
    const bookingTrendMax = Math.max(...bookingTrendRows.map((row) => row.value), 1)
    const revenueTrendRows = buildRecentDayBuckets(operationsChartDays)
    const revenueTrendMap = new Map(revenueTrendRows.map((row) => [row.key, row]))
    periodCustomerTransactionRows.forEach((transaction) => {
      const dayKey = getDayKey(transaction.createdAt)
      const bucket = dayKey ? revenueTrendMap.get(dayKey) : null
      if (bucket) bucket.value += transaction.receivedAmount
    })
    const revenueTrendMax = Math.max(...revenueTrendRows.map((row) => row.value), 1)
    const currentMonthLabel = `${bookingTrendRows[0]?.label || "-"} - ${bookingTrendRows[bookingTrendRows.length - 1]?.label || "-"}`
    const managerKpiCards = [
      { label: "Total Booking", value: totalBookings.toLocaleString("id-ID"), delta: `${bookingTrendRows.reduce((sum, row) => sum + row.value, 0).toLocaleString("id-ID")} booking`, sub: currentMonthLabel, tone: "text-sky-600", bg: "bg-sky-50" },
      { label: "Total Revenue (IDR)", value: totalRevenue > 0 ? `Rp ${(totalRevenue / 1000000).toFixed(2)} M` : "Rp 0", delta: formatMoney(totalRevenue), sub: currentMonthLabel, tone: "text-emerald-600", bg: "bg-emerald-50" },
      { label: "Merchant Aktif", value: activeMerchantCount.toLocaleString("id-ID"), delta: `${pendingMerchants} pending`, sub: "Dari data merchant approved", tone: "text-violet-600", bg: "bg-violet-50" },
      { label: "Paket Disetujui", value: periodApprovedPackages.toLocaleString("id-ID"), delta: `${periodPackages.length.toLocaleString("id-ID")} total paket`, sub: "Status package approved", tone: "text-orange-600", bg: "bg-orange-50" },
      { label: "Pending Review", value: periodPendingPackages.toLocaleString("id-ID"), delta: `${periodPackageOverdueCount} overdue`, sub: "Paket menunggu review", tone: "text-orange-600", bg: "bg-orange-50" },
      { label: "Anomali Terbuka", value: periodOperationalWarnings.toLocaleString("id-ID"), delta: `${periodDeletionRequests.length + periodReviewRequests.length} request aktif`, sub: "SLA, deletion, dan approval", tone: "text-rose-600", bg: "bg-rose-50" },
    ]
    const bookingCategoryCounts = periodBookings.reduce((map, booking) => {
      const label = classifyBookingProduct(booking)
      map.set(label, (map.get(label) || 0) + 1)
      return map
    }, new Map<string, number>())
    const categoryTones = ["bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500"]
    const categoryColors = ["#3b82f6", "#10b981", "#8b5cf6", "#fb923c", "#f43f5e"]
    const calculatedBookingCategories = Array.from(bookingCategoryCounts)
      .map(([label, value], index) => ({ label, value, tone: categoryTones[index % categoryTones.length], color: categoryColors[index % categoryColors.length] }))
      .sort((a, b) => b.value - a.value)
    const bookingCategories =
      calculatedBookingCategories.length > 0
        ? calculatedBookingCategories
        : [{ label: "Belum ada booking", value: 0, tone: "bg-slate-300", color: "#cbd5e1" }]
    const bookingCategoryBase = Math.max(bookingCategories.reduce((sum, item) => sum + item.value, 0), 1)
    const bookingCategoryGradient = bookingCategories
      .reduce(
        (state, item) => {
          const nextCursor = state.cursor + (item.value / bookingCategoryBase) * 100
          return {
            cursor: nextCursor,
            parts: [...state.parts, `${item.color} ${state.cursor}% ${nextCursor}%`],
          }
        },
        { cursor: 0, parts: [] as string[] },
      )
      .parts.join(", ")
    const packageQueueRows = [
      { label: "Menunggu Review", value: periodPendingPackages, note: "Perlu ditinjau", tone: "text-orange-600", href: "/admin/packages" },
      { label: "Draft", value: periodDraftPackages, note: "Menunggu merchant submit", tone: "text-slate-600", href: "/admin/packages" },
      { label: "Perlu Perbaikan", value: periodPackageOverdueCount, note: "Perlu tindakan merchant", tone: "text-rose-600", href: "/admin/packages" },
      { label: "Ditolak", value: periodRejectedPackages, note: "Total paket ditolak", tone: "text-rose-600", href: "/admin/packages" },
    ]
    const calculatedRecentAnomalies = [
      ...periodDeletionRequests.map((request) => ({
        title: "Deletion request menunggu keputusan",
        source: request.merchant_name || request.merchant_email || "Merchant",
        time: formatRelativeHours(request.requested_at),
        severity: "High",
        tone: "bg-rose-50 text-rose-600",
      })),
      ...periodReviewRequests.map((request) => ({
        title: `Approval merchant ${titleCase(request.request_type)}`,
        source: request.admin_note || request.merchant_id || "Merchant review",
        time: formatRelativeHours(request.requested_at),
        severity: "Medium",
        tone: "bg-orange-50 text-orange-600",
      })),
      ...(merchantOverdueCount > 0
        ? [{ title: "Merchant pending melewati SLA", source: `${merchantOverdueCount} merchant perlu ditinjau`, time: "SLA 3 hari", severity: "High", tone: "bg-rose-50 text-rose-600" }]
        : []),
      ...(periodPackageOverdueCount > 0
        ? [{ title: "Paket pending melewati SLA", source: `${periodPackageOverdueCount} paket perlu direview`, time: "SLA 3 hari", severity: "Medium", tone: "bg-orange-50 text-orange-600" }]
        : []),
      ...(periodBookingStalledCount > 0
        ? [{ title: "Booking stalled di handoff finance", source: `${periodBookingStalledCount} booking perlu follow-up`, time: "SLA 1 hari", severity: "Medium", tone: "bg-orange-50 text-orange-600" }]
        : []),
    ].slice(0, 5)
    const recentAnomalies =
      calculatedRecentAnomalies.length > 0
        ? calculatedRecentAnomalies
        : [{ title: "Tidak ada anomali terbuka", source: "Semua queue operasional aman", time: "Saat ini", severity: "OK", tone: "bg-emerald-50 text-emerald-600" }]
    const activityFeed = periodAuditLogs.length > 0
      ? periodAuditLogs.map((log) => ({
          title: log.summary || titleCase(log.action),
          detail: `${titleCase(log.actor_role)} - ${titleCase(log.target_type)}`,
          time: formatRelativeHours(log.created_at),
          tone: "bg-sky-50 text-sky-600",
        }))
      : [
          { title: `Paket pending review: ${periodPendingPackages}`, detail: "Data live dari package queue", time: "Saat ini", tone: "bg-emerald-50 text-emerald-600" },
          { title: `Merchant baru menunggu approval: ${pendingMerchants}`, detail: "Data live dari merchant pending", time: "Saat ini", tone: "bg-sky-50 text-sky-600" },
          { title: `Booking siap finance: ${periodFinanceReadyCount}`, detail: "Data live dari booking center", time: "Saat ini", tone: "bg-orange-50 text-orange-600" },
          { title: `Item perlu perhatian: ${periodOperationalWarnings}`, detail: "SLA, deletion, dan approval", time: "Saat ini", tone: "bg-rose-50 text-rose-600" },
        ]
    const destinationMap = periodBookings.reduce((map, booking) => {
      const pkg = booking.package_id ? packageMap.get(booking.package_id) : null
      const label = pkg?.city || pkg?.destination_province || pkg?.country || pkg?.destination_country_id || "Tanpa destinasi"
      map.set(label, (map.get(label) || 0) + 1)
      return map
    }, new Map<string, number>())
    const topDestinationBase = Math.max(...Array.from(destinationMap.values()), 1)
    const topDestinations = Array.from(destinationMap)
      .map(([name, value], index) => ({
        name,
        value,
        percent: Math.max(Math.round((value / topDestinationBase) * 100), 8),
        tone: categoryTones[index % categoryTones.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    const topDestination = topDestinations[0] || null
    const topMerchantRevenue =
      Array.from(
        periodCustomerTransactionRows.reduce((map, item) => {
          const pkg = item.packageId ? packageMap.get(item.packageId) : null
          const merchantId = pkg?.merchant_id
          if (!merchantId) return map
          map.set(merchantId, (map.get(merchantId) || 0) + item.receivedAmount)
          return map
        }, new Map<string, number>()),
      )
        .map(([merchantId, revenue]) => ({
          merchantId,
          revenue,
          name: merchantNameMap.get(merchantId) || "Merchant tanpa nama",
        }))
        .sort((a, b) => b.revenue - a.revenue)[0] || null
    const productPerformanceCards = [
      {
        label: "Paket Wisata",
        href: "/admin/paket-tour",
        booking: totalBookings,
        revenue: totalRevenue > 0 ? `Rp ${(totalRevenue / 1000000).toFixed(2)} M` : "Rp 0",
        pending: periodPendingPackages,
        anomaly: periodOperationalWarnings,
        sla: periodPackageOverdueCount + periodBookingStalledCount,
        growth: totalBookings > 0 ? "+ 18.6%" : "0%",
        connected: true,
        tone: "text-violet-600",
        bg: "bg-violet-50",
        icon: "package" as const,
        sparkColor: "#7c3aed",
        sparkPoints: "2,22 14,24 26,18 38,12 50,20 62,8 74,17 86,10 98,6",
      },
      { label: "Pesawat", href: "/admin/pesawat", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-sky-600", bg: "bg-sky-50", icon: "flight" as const, sparkColor: "#2563eb", sparkPoints: "2,22 14,23 26,18 38,21 50,14 62,10 74,16 86,9 98,7" },
      { label: "Hotel", href: "/admin/hotel", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-emerald-600", bg: "bg-emerald-50", icon: "hotel" as const, sparkColor: "#16a34a", sparkPoints: "2,23 14,14 26,20 38,12 50,18 62,10 74,17 86,14 98,8" },
      { label: "Kereta Api", href: "/admin/kereta-api", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-orange-600", bg: "bg-orange-50", icon: "train" as const, sparkColor: "#ea580c", sparkPoints: "2,20 14,24 26,22 38,17 50,10 62,16 74,9 86,12 98,8" },
      { label: "Bus & Travel", href: "/admin/bus-travel", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-blue-600", bg: "bg-blue-50", icon: "bus" as const, sparkColor: "#2563eb", sparkPoints: "2,24 14,18 26,15 38,19 50,12 62,16 74,10 86,13 98,9" },
      { label: "Kapal Laut", href: "/admin/kapal-laut", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-cyan-600", bg: "bg-cyan-50", icon: "ship" as const, sparkColor: "#0f766e", sparkPoints: "2,22 14,19 26,16 38,18 50,13 62,17 74,12 86,14 98,10" },
      { label: "Kapal Pesiar", href: "/admin/kapal-pesiar", booking: null, revenue: "-", pending: null, anomaly: null, sla: null, growth: "Belum terhubung", connected: false, tone: "text-rose-600", bg: "bg-rose-50", icon: "cruise" as const, sparkColor: "#f43f5e", sparkPoints: "2,24 14,10 26,20 38,18 50,16 62,19 74,14 86,15 98,11" },
    ]
    const reviewQueueItems = periodPackages
      .filter((pkg) => ["pending", "draft", "rejected"].includes(normalizeStatus(pkg.status)))
      .slice(0, 6)
      .map((pkg) => ({
        merchant: merchantNameMap.get(pkg.merchant_id || "") || "Merchant",
        product: pkg.title || "Paket tanpa judul",
        type: "Paket Wisata",
        status: titleCase(pkg.status),
        time: formatDateTime(pkg.created_at),
        href: `/admin/packages/${pkg.id}`,
      }))
    const slaTotal = Math.max(periodPendingPackages + periodPackageOverdueCount + periodBookingStalledCount, 1)
    const slaRows = [
      { label: "Tepat Waktu", value: Math.max(periodPendingPackages - periodPackageOverdueCount, 0), tone: "bg-emerald-500" },
      { label: "Mendekati Batas", value: periodPackageOverdueCount, tone: "bg-orange-400" },
      { label: "Lewat Batas", value: periodBookingStalledCount, tone: "bg-rose-500" },
    ]
    const slaGradient = slaRows
      .reduce(
        (state, item) => {
          const nextCursor = state.cursor + (item.value / slaTotal) * 100
          const color = item.tone === "bg-emerald-500" ? "#10b981" : item.tone === "bg-orange-400" ? "#fb923c" : "#f43f5e"
          return { cursor: nextCursor, parts: [...state.parts, `${color} ${state.cursor}% ${nextCursor}%`] }
        },
        { cursor: 0, parts: [] as string[] },
      )
      .parts.join(", ")
    const showBookingWorkspace = operationsWorkspace === "all" || operationsWorkspace === "booking_center"
    const showPackageWorkspace = operationsWorkspace === "all" || operationsWorkspace === "package_review"
    const showMerchantWorkspace = operationsWorkspace === "all" || operationsWorkspace === "merchant" || operationsWorkspace === "anomalies"
    const showAnomalyWorkspace = operationsWorkspace === "all" || operationsWorkspace === "anomalies" || operationsWorkspace === "merchant"
    const showKpiOverviewWidget = enabledOperationsWidgetKeys.has("kpi_overview")
    const showProductPerformanceWidget = enabledOperationsWidgetKeys.has("product_performance")
    const showBookingTrendsWidget = enabledOperationsWidgetKeys.has("booking_trends")
    const showPackageReviewQueueWidget = enabledOperationsWidgetKeys.has("package_review_queue")
    const showLatestAnomaliesWidget = enabledOperationsWidgetKeys.has("latest_anomalies")
    const showSlaReviewWidget = enabledOperationsWidgetKeys.has("sla_review")
    const showActivityFeedWidget = enabledOperationsWidgetKeys.has("activity_feed")
    const showTopDestinationsWidget = enabledOperationsWidgetKeys.has("top_destinations")
    const showQuickActionsWidget = enabledOperationsWidgetKeys.has("quick_actions")
    const selectedProductWidgetGroups = OPERATIONS_PRODUCT_WIDGET_CATALOG
      .map((product) => {
        const iconKind = getProductIconKind(product.productLabel)
        const productStatus = getDashboardWidgetStatusMeta(product.status)
        const items = product.sections.flatMap((section) =>
          section.items
            .filter((item) => enabledOperationsWidgetKeys.has(item.key))
            .map((item) => {
              const status = getDashboardWidgetStatusMeta(item.status)
              const fallbackCard = {
                key: item.key,
                title: item.label,
                sectionTitle: section.title,
                href: product.productHref,
                value: "Segera aktif",
                detail: `Widget ${item.label.toLowerCase()} untuk ${product.productLabel.toLowerCase()} belum terhubung ke data dashboard.`,
                meta: "Menunggu modul live",
                status,
                iconKind,
                valueClassName: "text-lg font-semibold text-slate-950",
              }

              switch (item.key) {
                case "package_tour_total_booking":
                  return {
                    ...fallbackCard,
                    value: totalBookings.toLocaleString("id-ID"),
                    detail: `Total booking Paket Wisata pada ${operationsPeriod.label}.`,
                    meta: "Data live dari tabel bookings",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_revenue":
                  return {
                    ...fallbackCard,
                    value: formatMoney(totalRevenue),
                    detail: "Akumulasi pembayaran paid dan DP dari booking paket.",
                    meta: currentMonthLabel,
                    valueClassName: "text-2xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_merchant_active":
                  return {
                    ...fallbackCard,
                    value: activeMerchantCount.toLocaleString("id-ID"),
                    detail: "Merchant approved yang sudah aktif di marketplace.",
                    meta: `${pendingMerchants} pending approval`,
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_top_destinations":
                  return {
                    ...fallbackCard,
                    value: topDestination?.name || "Belum ada data",
                    detail: topDestination
                      ? `${topDestination.value.toLocaleString("id-ID")} booking menuju destinasi ini.`
                      : "Belum ada booking paket yang bisa dipetakan ke destinasi.",
                    meta: "Top destinasi Paket Wisata",
                  }
                case "package_tour_pending_review":
                  return {
                    ...fallbackCard,
                    value: periodPendingPackages.toLocaleString("id-ID"),
                    detail: "Paket merchant yang masih menunggu review.",
                    meta: `${periodPackageOverdueCount} paket overdue`,
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_open_anomalies":
                  return {
                    ...fallbackCard,
                    value: periodOperationalWarnings.toLocaleString("id-ID"),
                    detail: "Gabungan SLA, deletion request, approval request, dan booking stalled.",
                    meta: "Operational warning aktif",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_sla_review":
                  return {
                    ...fallbackCard,
                    value: (periodPackageOverdueCount + periodBookingStalledCount).toLocaleString("id-ID"),
                    detail: "Item yang sudah mendekati atau melewati SLA operasional.",
                    meta: "SLA review package & booking",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_deletion_request":
                  return {
                    ...fallbackCard,
                    value: periodDeletionRequests.length.toLocaleString("id-ID"),
                    detail: "Request penghapusan merchant yang masih aktif pada periode ini.",
                    meta: "Deletion request aktif",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_top_merchant_revenue":
                  return {
                    ...fallbackCard,
                    value: topMerchantRevenue?.name || "Belum ada data",
                    detail: topMerchantRevenue
                      ? `${formatMoney(topMerchantRevenue.revenue)} revenue tertinggi pada periode ini.`
                      : "Belum ada merchant dengan transaksi paket yang masuk revenue.",
                    meta: "Top merchant revenue",
                  }
                case "package_tour_review_queue":
                  return {
                    ...fallbackCard,
                    value: reviewQueueItems.length.toLocaleString("id-ID"),
                    detail: "Jumlah item queue review yang sedang tampil di dashboard.",
                    meta: "Queue Paket Wisata",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                case "package_tour_booking_trend":
                  return {
                    ...fallbackCard,
                    value: `${bookingTrendRows.reduce((sum, row) => sum + row.value, 0).toLocaleString("id-ID")} booking`,
                    detail: `Trend booking tersaji untuk ${operationsPeriod.label}.`,
                    meta: `Puncak harian ${bookingTrendMax.toLocaleString("id-ID")} booking`,
                  }
                case "package_tour_activity_feed":
                  return {
                    ...fallbackCard,
                    value: periodAuditLogs.length.toLocaleString("id-ID"),
                    detail: "Jumlah aktivitas terbaru yang tercatat di audit log operasional.",
                    meta: "Activity feed live",
                    valueClassName: "text-3xl font-semibold tracking-[-0.03em] text-slate-950",
                  }
                default:
                  return fallbackCard
              }
            }),
        )

        return {
          productLabel: product.productLabel,
          productHref: product.productHref,
          note: product.note,
          status: productStatus,
          items,
        }
      })
      .filter((product) => product.items.length > 0)
    const hasAnyDashboardWidget = enabledOperationsWidgetKeys.size > 0

    return (
      <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
        <div className="mx-auto max-w-[1680px] space-y-6">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Dashboard Operasional</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Ringkasan aktivitas operasional dan performa marketplace.</p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {params.view ? <input type="hidden" name="view" value={params.view} /> : null}
              <select
                name="period"
                defaultValue={operationsPeriod.value}
                className="rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="7d">7 hari terakhir</option>
                <option value="30d">30 hari terakhir</option>
                <option value="90d">90 hari terakhir</option>
                <option value="all">Semua waktu</option>
              </select>
              <select
                name="workspace"
                defaultValue={operationsWorkspace}
                className="rounded-[14px] border border-[#eadfd5] bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">Semua Workspace</option>
                <option value="merchant">Merchant</option>
                <option value="package_review">Package Review</option>
                <option value="booking_center">Booking Center</option>
                <option value="anomalies">Anomali</option>
              </select>
              <button className="rounded-[14px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Terapkan
              </button>
              <div className="flex items-center gap-3 rounded-[16px] bg-white px-4 py-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">Selamat pagi!</p>
                  <p className="text-xs text-slate-500">Manager Operasional</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">OM</span>
              </div>
            </form>
          </section>

          {!hasAnyDashboardWidget ? (
            <section className="rounded-[24px] border border-dashed border-orange-200 bg-white px-6 py-14 text-center shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-lg font-black text-orange-600">W</span>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Dashboard belum memiliki widget aktif</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Pilih widget yang ingin ditampilkan di dashboard operasional Anda. Dashboard boleh dikosongkan dan bisa diisi lagi kapan saja.
              </p>
              <Link href="/admin/dashboard/widgets" className="mt-6 inline-flex rounded-[14px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Kelola Widget
              </Link>
            </section>
          ) : null}

          {showKpiOverviewWidget ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {managerKpiCards.map((card) => (
              <div key={card.label} className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${card.bg} ${card.tone}`}>{card.label[0]}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
                    <p className={`mt-3 text-xs font-semibold ${card.delta.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>{card.delta}</p>
                    <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
          ) : null}

          {showProductPerformanceWidget ? (
          <section className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Performa per Produk <span className="text-xs font-normal text-slate-400">({operationsPeriod.label})</span></h2>
              <Link href="/admin/paket-tour" className="text-xs font-semibold text-orange-600">Lihat semua produk -&gt;</Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              {productPerformanceCards.map((product) => (
                <Link key={product.label} href={product.href} className="flex min-h-[272px] flex-col rounded-[16px] border border-[#edf0f4] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition hover:border-orange-200 hover:shadow-[0_14px_26px_rgba(249,115,22,0.08)]">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${product.bg} ${product.tone}`}>
                      <ProductMiniIcon kind={product.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900">{product.label}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-slate-400">Booking</p>
                      <p className="mt-1 text-[15px] font-semibold text-slate-950">{product.booking == null ? "-" : product.booking.toLocaleString("id-ID")}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Revenue</p>
                      <p className="mt-1 text-[15px] font-semibold text-slate-950">{product.revenue}</p>
                    </div>
                  </div>
                  <p className={`mt-2 text-[11px] font-semibold ${product.connected ? "text-emerald-600" : "text-slate-400"}`}>{product.growth}</p>
                  <div className="mt-3 h-14 rounded-[14px] bg-[linear-gradient(180deg,rgba(99,102,241,0.06),rgba(255,255,255,0))] px-1 py-1">
                    <svg viewBox="0 0 100 28" className="h-full w-full" aria-hidden="true">
                      <polyline
                        points={product.sparkPoints}
                        fill="none"
                        stroke={product.connected ? product.sparkColor : "#cbd5e1"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={product.connected ? undefined : "3 3"}
                      />
                      {product.connected
                        ? product.sparkPoints.split(" ").map((point) => {
                            const [cx, cy] = point.split(",")
                            return <circle key={point} cx={cx} cy={cy} r="1.4" fill={product.sparkColor} />
                          })
                        : null}
                    </svg>
                  </div>
                  <div className="mt-3 space-y-2 border-t border-[#eef2f7] pt-3 text-[11px]">
                    <p className="flex items-center justify-between text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Pending Review</span><span className="font-semibold text-slate-900">{product.pending ?? "-"}</span></p>
                    <p className="flex items-center justify-between text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Anomali</span><span className="font-semibold text-slate-900">{product.anomaly ?? "-"}</span></p>
                    <p className="flex items-center justify-between text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />SLA Melanggar</span><span className="font-semibold text-slate-900">{product.sla ?? "-"}</span></p>
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="rounded-[10px] border border-[#e8edf3] bg-[#fbfdff] px-3 py-2 text-center text-[11px] font-semibold text-[#2563eb]">
                    Lihat Detail
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          ) : null}

          {selectedProductWidgetGroups.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-[#f0d8c3] bg-[#fff7ef] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                  Widget Produk
                </span>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Widget Produk Terpilih</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pilihan dari menu Widget akan tampil di sini. Paket Wisata memakai data live, sedangkan produk roadmap tetap muncul sebagai placeholder yang jujur.
                </p>
              </div>
              <Link href="/admin/dashboard/widgets" className="text-sm font-semibold text-orange-600">
                Kelola widget produk
              </Link>
            </div>

            <div className="space-y-5">
              {selectedProductWidgetGroups.map((product) => (
                <div
                  key={product.productLabel}
                  className="rounded-[22px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-col gap-3 border-b border-[#f0e6dd] pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7ef] text-orange-600">
                          <ProductMiniIcon kind={getProductIconKind(product.productLabel)} className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{product.productLabel}</h3>
                          <p className="mt-1 text-sm text-slate-500">{product.note}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${product.status.className}`}>
                        {product.status.label}
                      </span>
                      <Link href={product.productHref} className="text-sm font-semibold text-orange-600">
                        Buka workspace
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {product.items.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-[18px] border border-[#f0e6dd] bg-[#fffdfa] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff1e6] text-orange-600">
                            <ProductMiniIcon kind={item.iconKind} className="h-5 w-5" />
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${item.status.className}`}>
                            {item.status.label}
                          </span>
                        </div>
                        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.sectionTitle}
                        </p>
                        <h4 className="mt-2 text-sm font-semibold text-slate-900">{item.title}</h4>
                        <p className={`mt-4 ${item.valueClassName}`}>{item.value}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f0e6dd] pt-4">
                          <span className="text-xs font-medium text-slate-400">{item.meta}</span>
                          <Link href={item.href} className="text-xs font-semibold text-orange-600">
                            Buka
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {showBookingWorkspace && showBookingTrendsWidget ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1.05fr]">
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Tren Booking</h2>
                <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">{operationsPeriod.label}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-sky-500" />Semua booking</span>
                <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-orange-500" />Dari tabel bookings</span>
              </div>
              <div className="mt-5 h-48 rounded-[18px] bg-[linear-gradient(180deg,rgba(59,130,246,0.07),transparent)] p-4">
                <div className="flex h-full items-end gap-1 border-b border-l border-[#eadfd5] px-2 pb-2">
                  {bookingTrendRows.map((row, index) => (
                    <div key={row.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t-full bg-sky-500/80 transition group-hover:bg-orange-500"
                        style={{ height: `${Math.max((row.value / bookingTrendMax) * 100, row.value > 0 ? 8 : 2)}%` }}
                        title={`${row.label}: ${row.value.toLocaleString("id-ID")} booking`}
                      />
                      {index === 0 || index === bookingTrendRows.length - 1 ? <span className="text-[10px] text-slate-400">{row.label}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Tren Revenue (IDR)</h2>
                <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">{operationsPeriod.label}</span>
              </div>
              <div className="mt-8 h-56 rounded-[18px] bg-[linear-gradient(180deg,rgba(124,92,255,0.09),transparent)] p-4">
                <div className="relative flex h-full items-end gap-1 border-b border-l border-[#eadfd5] px-2 pb-2">
                  {revenueTrendRows.map((row, index) => (
                    <div key={row.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t-full bg-violet-500/80 transition group-hover:bg-orange-500"
                        style={{ height: `${Math.max((row.value / revenueTrendMax) * 100, row.value > 0 ? 8 : 2)}%` }}
                        title={`${row.label}: ${formatMoney(row.value)}`}
                      />
                      {index === 0 || index === revenueTrendRows.length - 1 ? <span className="text-[10px] text-slate-400">{row.label}</span> : null}
                    </div>
                  ))}
                  <div className="absolute bottom-3 left-3 text-xs text-slate-400">Rp 0</div>
                  <div className="absolute left-3 top-3 text-xs text-slate-400">{formatMoney(revenueTrendMax)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Booking per Kategori</h2>
                <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">{operationsPeriod.label}</span>
              </div>
              <div className="mt-7 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
                <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${bookingCategoryGradient})` }}>
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-2xl font-semibold text-slate-950">{totalBookings.toLocaleString("id-ID")}</p>
                    <p className="text-xs text-slate-500">Total Booking</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {bookingCategories.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-400">({Math.round((item.value / bookingCategoryBase) * 1000) / 10}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          {(showPackageWorkspace && showPackageReviewQueueWidget) ||
          (showAnomalyWorkspace && showLatestAnomaliesWidget) ||
          (showMerchantWorkspace && showSlaReviewWidget) ? (
          <section className="grid items-start gap-5 xl:grid-cols-[1fr_1fr_1fr]">
            {showPackageWorkspace && showPackageReviewQueueWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Paket Menunggu Review</h2>
                <Link href="/admin/packages" className="text-xs font-semibold text-orange-600">Lihat semua</Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 border-b border-[#f0e6dd] pb-3 text-xs font-semibold text-slate-500">
                {packageQueueRows.map((item) => (
                  <span key={item.label}>{item.label} ({item.value})</span>
                ))}
              </div>
              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#f0e6dd]">
                <div className="grid grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] gap-3 bg-[#fff7ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <span>Merchant</span>
                  <span>Produk</span>
                  <span>Tipe</span>
                  <span>Diajukan</span>
                  <span>Aksi</span>
                </div>
                <div className="divide-y divide-[#f0e6dd]">
                  {(reviewQueueItems.length > 0 ? reviewQueueItems : [{ merchant: "-", product: "Tidak ada paket menunggu review", type: "-", status: "-", time: "-", href: "/admin/packages" }]).map((item) => (
                    <Link key={`${item.product}-${item.time}`} href={item.href} className="grid grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto] gap-3 px-4 py-3 text-sm transition hover:bg-orange-50">
                      <span className="font-semibold text-slate-800">{item.merchant}</span>
                      <span className="text-slate-600">{item.product}</span>
                      <span><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-600">{item.type}</span></span>
                      <span className="text-xs text-slate-500">{item.time}</span>
                      <span className="text-xs font-semibold text-orange-600">Review</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            ) : null}

            {showAnomalyWorkspace && showLatestAnomaliesWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Anomali Terbaru</h2>
                <Link href="/admin/merchants/anomalies" className="text-xs font-semibold text-orange-600">Lihat semua</Link>
              </div>
              <div className="mt-5 max-h-[360px] divide-y divide-[#f0e6dd] overflow-y-auto pr-2 [scrollbar-color:#f97316_#fff7ed] [scrollbar-width:thin]">
                {recentAnomalies.map((item) => (
                  <div key={`${item.title}-${item.source}-${item.time}`} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.source}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{item.time}</p>
                      <span className={`mt-1 inline-flex rounded-[10px] px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {showMerchantWorkspace && showSlaReviewWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">SLA Review</h2>
                <Link href="/admin/dashboard?workspace=anomalies" className="text-xs font-semibold text-orange-600">Lihat detail SLA -&gt;</Link>
              </div>
              <div className="mt-7 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
                <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${slaGradient})` }}>
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-2xl font-semibold text-slate-950">{slaTotal.toLocaleString("id-ID")}</p>
                    <p className="text-xs text-slate-500">Total SLA</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {slaRows.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-400">({Math.round((item.value / slaTotal) * 1000) / 10}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            ) : null}
          </section>
          ) : null}

          {showBookingWorkspace && (showActivityFeedWidget || showTopDestinationsWidget || showQuickActionsWidget) ? (
          <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
            {showActivityFeedWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Aktivitas Terakhir</h2>
                <Link href="/admin/audit-log" className="text-xs font-semibold text-orange-600">Lihat semua aktivitas -&gt;</Link>
              </div>
              <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto pr-2 [scrollbar-color:#f97316_#fff7ed] [scrollbar-width:thin]">
                {activityFeed.map((item) => (
                  <div key={`${item.title}-${item.time}`} className="flex items-center justify-between gap-4 rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.tone}`}>{item.title[0]}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                    </div>
                    <span className="ml-auto whitespace-nowrap text-xs text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {showTopDestinationsWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Performa Top Destinasi (Booking)</h2>
                <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">{operationsPeriod.label}</span>
              </div>
              <div className="mt-5 space-y-3">
                {topDestinations.map((item, index) => (
                  <div key={item.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-500">{index + 1}</span>
                    <div>
                      <p className="font-medium text-slate-700">{item.name}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-[#f0e6dd]"><div className={`h-1.5 rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} /></div>
                    </div>
                    <span className="font-semibold text-slate-900">{item.value.toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {showQuickActionsWidget ? (
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Review Paket", href: "/admin/packages", badge: periodPendingPackages },
                  { label: "Kelola Anomali", href: "/admin/merchants/anomalies", badge: periodOperationalWarnings },
                  { label: "Deletion Request", href: "/admin/merchants/pending-approvals", badge: periodDeletionRequests.length },
                  { label: "Booking Center", href: "/admin/bookings", badge: periodFinanceReadyCount },
                  { label: "Audit Log", href: "/admin/audit-log", badge: periodAuditLogs.length },
                  { label: "Lihat Report", href: "/admin/dashboard", badge: operationsReports.length },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                    {item.label}
                    {item.badge > 0 ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">{item.badge}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
            ) : null}
          </section>
          ) : !showBookingWorkspace && showQuickActionsWidget ? (
          <section className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Review Paket", href: "/admin/packages", badge: periodPendingPackages },
                { label: "Kelola Anomali", href: "/admin/merchants/anomalies", badge: periodOperationalWarnings },
                { label: "Deletion Request", href: "/admin/merchants/pending-approvals", badge: periodDeletionRequests.length },
                { label: "Audit Log", href: "/admin/audit-log", badge: periodAuditLogs.length },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                  {item.label}
                  {item.badge > 0 ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">{item.badge}</span> : null}
                </Link>
              ))}
            </div>
          </section>
          ) : null}
        </div>
      </main>
    )
  }

  if (!isSuperadmin) {
    return (
      <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
        <div className="mx-auto max-w-[1680px] space-y-6">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-[#efd8c8] bg-[#fff7f1] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                Admin Workspace
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Dashboard Admin</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Fokus ke pekerjaan hari ini: approval merchant, review paket, dan booking yang perlu tindakan.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#eee3d9] bg-white px-5 py-4 text-sm text-slate-500 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              Login sebagai <span className="font-semibold text-slate-900">{getRoleLabel(currentProfile?.role)}</span>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminWorkCards.map((card) => (
              <div key={card.label} className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className={`mt-2 text-4xl font-semibold tracking-[-0.05em] ${card.tone}`}>{card.value}</p>
                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{card.note}</p>
                <Link href={card.href} className="mt-5 inline-flex rounded-[14px] border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-100">
                  {card.cta}
                </Link>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <h2 className="text-base font-semibold text-slate-950">Prioritas Hari Ini</h2>
              <div className="mt-5 space-y-3">
                {[
                  { title: "Review merchant baru", value: pendingMerchants, href: "/admin/merchants/pending-approvals" },
                  { title: "Review paket pending", value: pendingPackages, href: "/admin/packages" },
                  { title: "Cek booking siap finance", value: financeReadyCount, href: "/admin/bookings" },
                  { title: "Tindak overdue", value: totalOperationalWarnings, href: "/admin/dashboard" },
                ].map((item) => (
                  <Link key={item.title} href={item.href} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4 transition hover:border-orange-200 hover:bg-orange-50">
                    <span className="text-sm font-semibold text-slate-800">{item.title}</span>
                    <span className="rounded-[10px] bg-white px-3 py-1 text-sm font-semibold text-orange-600">{item.value}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Status Queue</h2>
                <span className="text-xs text-slate-400">Target respons harian</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {slaCards.map((card) => (
                  <div key={card.label} className="rounded-[18px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <h2 className="text-base font-semibold text-slate-950">Shortcut Operasional</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Merchant Directory", href: "/admin/merchants" },
                  { label: "Pending approvals", href: "/admin/merchants/pending-approvals" },
                  { label: "Package Review", href: "/admin/packages" },
                  { label: "Booking Center", href: "/admin/bookings" },
                  { label: "Merchant Support", href: "/admin/merchant-support" },
                  { label: "Audit Log", href: "/admin/audit-log" },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <h2 className="text-base font-semibold text-slate-950">Catatan Untuk Admin</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Mulai dari merchant dan paket yang paling lama pending.</p>
                <p>2. Gunakan Pending approvals untuk mengajukan keputusan final ke operations manager.</p>
                <p>3. Pastikan booking yang sudah siap handoff tidak tertahan sebelum masuk finance.</p>
                <p>4. Gunakan audit log untuk melacak keputusan sensitif.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (showOperationsManagerView) {
    const operationalLoad = pendingMerchants + pendingPackages + financeReadyCount
    const queueChartItems = [
      { label: "Merchant pending", value: pendingMerchants, tone: "bg-amber-400" },
      { label: "Review paket", value: pendingPackages, tone: "bg-sky-500" },
      { label: "Siap ke finance", value: financeReadyCount, tone: "bg-emerald-500" },
    ]
    const queueChartBase = queueChartItems.reduce((sum, item) => sum + item.value, 0) || 1
    const customerFundsChartItems = [
      { label: "Dana tertahan", value: customerHeldFundsTotal, tone: "bg-rose-500" },
      { label: "Siap ke finance", value: customerReadyForFinanceFundsTotal, tone: "bg-sky-500" },
      { label: "Tertahan operasional", value: customerOperationallyBlockedFundsTotal, tone: "bg-rose-500" },
      { label: "Sudah paid out", value: customerPaidOutFundsTotal, tone: "bg-emerald-500" },
    ]
    const customerFundsChartBase = Math.max(grossCustomerTransactionTotal, 1)

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
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
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                  Monitor SLA, backlog, dan ritme kerja tim operasional Red Feng.
                </h1>
                <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                  Dashboard ini dirancang untuk operations manager agar cepat melihat antrian yang menumpuk, area yang mulai overdue, dan jalur tindak lanjut untuk merchant, package, serta Booking Center.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
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

              <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Operations pulse</p>
                <div className="mt-5 grid gap-4">
                  <div>
                    <p className="text-sm text-orange-50/80">Total backlog</p>
                    <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{operationalLoad}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Overdue items</p>
                    <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                      {merchantOverdueCount + packageOverdueCount + bookingStalledCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-50/80">Siap ke finance</p>
                    <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{financeReadyCount}</p>
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
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Public Performance</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Ringkasan Web Vitals publik</h2>
                </div>
                <div className="rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-xs leading-6 text-slate-600">
                  <p>{recentWebVitalEvents.length} sampel terbaru tersimpan</p>
                  <p>{trackedPublicPaths} path publik terlacak</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                {performanceCards.map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">Sample terbaru: {formatDateTime(latestPerformanceSampleAt)} ({formatRelativeHours(latestPerformanceSampleAt)})</p>
            </div>

            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Path Watchlist</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Path publik yang paling sering bermasalah</h2>
              {performancePathSummary.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-[#e7d8c6] bg-[#fffaf3] px-5 py-6 text-sm leading-7 text-slate-500">
                  Belum ada data Web Vitals yang tersimpan. Begitu user publik membuka app, ringkasan performa akan muncul di sini.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {performancePathSummary.map((item) => (
                    <div key={item.path} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{item.path}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.samples} sampel masuk, {item.poorCount} di antaranya poor</p>
                        </div>
                        <div className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                          {item.poorCount > 0 ? "Perlu cek" : "Stabil"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Diagram Dana Customer</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Diagram transaksi dan dana customer</h2>
              <ChartLegend
                items={[
                  { label: "DP", tone: "bg-amber-400" },
                  { label: "Pelunasan", tone: "bg-sky-500" },
                  { label: "Full payment", tone: "bg-emerald-500" },
                ]}
              />
              <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Total transaksi customer</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(grossCustomerTransactionTotal)}</p>
                </div>
                <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Dana masih held</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(customerHeldFundsTotal)}</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: "DP diterima", value: dpReceivedTotal, tone: "bg-amber-400" },
                  { label: "Pelunasan diterima", value: finalSettlementTotal, tone: "bg-sky-500" },
                  { label: "Full payment", value: fullPaymentTotal, tone: "bg-emerald-500" },
                ].map((item) => {
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Pajak terkumpul</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(customerTaxCollectedTotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Siap ke finance</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(customerReadyForFinanceFundsTotal)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Grafik Queue Dan Status Dana</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Grafik backlog dan status dana</h2>
              <ChartLegend
                items={[
                  { label: "Merchant pending", tone: "bg-amber-400" },
                   { label: "Review paket", tone: "bg-sky-500" },
                   { label: "Siap ke finance", tone: "bg-emerald-500" },
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
                  { label: "Dana tertahan", tone: "bg-rose-500" },
                  { label: "Siap ke finance", tone: "bg-sky-500" },
                  { label: "Tertahan operasional", tone: "bg-rose-500" },
                  { label: "Sudah paid out", tone: "bg-emerald-500" },
                ]}
              />
              <div className="mt-8 space-y-4">
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
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Perlu Perhatian</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Area yang harus disentuh lebih dulu</h2>
              <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
                {needsAttentionCards.map((card) => (
                  <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">SLA Monitor</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Kesehatan respons tim operasional</h2>
              <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Panduan Laporan</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Hal wajib yang dilaporkan ke superadmin</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Status antrean merchant, paket, dan booking yang sedang berjalan.</p>
                <p>2. Kondisi SLA, backlog, overdue, dan titik kemacetan terbesar.</p>
                <p>3. Ringkasan transaksi customer: DP, pelunasan, full payment, admin fee, dan pajak yang masuk.</p>
                <p>4. Status dana customer: held, partial hold, siap handoff, tertahan operasional, dan sudah dibayar keluar.</p>
                <p>5. Kualitas keputusan tim admin serta anomali transaksi customer yang perlu investigasi.</p>
                <p>6. Kapasitas tim, eskalasi kasus penting, dan kualitas handoff ke finance.</p>
                <p>7. Blocker utama, risiko operasional, next steps, dan keputusan yang dibutuhkan dari superadmin.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Laporan Ke Superadmin</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kirim laporan operations manager</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isi laporan secara lengkap agar superadmin bisa membaca kondisi antrean, SLA, kualitas keputusan tim, risiko, dan keputusan yang dibutuhkan tanpa mengejar detail tambahan lewat chat.
              </p>
              <form action={submitOperationsManagerReport} className="mt-6 space-y-4">
                <input type="hidden" name="return_to" value={reportReturnTo} />
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
                    dpReceivedTotal,
                    finalSettlementTotal,
                    fullPaymentTotal,
                    grossCustomerTransactionTotal,
                    customerAdminFeeCollectedTotal,
                    customerTaxCollectedTotal,
                    customerHeldFundsTotal,
                    customerReadyForFinanceFundsTotal,
                    customerOperationallyBlockedFundsTotal,
                    customerPaidOutFundsTotal,
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan eksekutif</label>
                  <textarea
                    name="summary"
                    required
                    placeholder="Ringkas kondisi operasional paling penting yang harus langsung dipahami superadmin."
                    className="min-h-[140px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status antrean operasional</label>
                  <textarea
                    name="queue_status"
                    required
                    placeholder="Jelaskan kondisi merchant pending, review paket, booking siap handoff, dan area backlog yang paling berat."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status SLA</label>
                  <textarea
                    name="sla_status"
                    required
                    placeholder="Jelaskan area yang masih within SLA, area yang breach, dan penyebab keterlambatan utama."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ringkasan transaksi customer</label>
                  <textarea
                    name="customer_transaction_summary"
                    required
                    placeholder="Jelaskan total transaksi customer, pola DP vs full payment, pelunasan yang masuk, serta fee dan pajak yang terkumpul dari sisi operasional."
                    className="min-h-[130px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status dana customer di operasional</label>
                  <textarea
                    name="customer_funds_status"
                    required
                    placeholder="Jelaskan dana customer yang masih held, partial hold, siap handoff, tertahan karena flow operasional, dan yang sudah keluar ke payout."
                    className="min-h-[130px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kualitas keputusan tim admin</label>
                  <textarea
                    name="decision_quality"
                    placeholder="Jelaskan pola approve/reject, revisi berulang, atau kualitas keputusan yang perlu perhatian."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Anomali transaksi customer</label>
                  <textarea
                    name="transaction_anomalies"
                    placeholder="Catat mismatch status payment, dana customer yang tertahan terlalu lama, booking paid tetapi flow pickup macet, atau kasus transaksi yang perlu investigasi."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kondisi kapasitas tim</label>
                  <textarea
                    name="team_capacity"
                    placeholder="Jelaskan distribusi beban kerja admin, area overload, kebutuhan coaching, atau kebutuhan resource."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kasus penting dan eskalasi</label>
                  <textarea
                    name="escalations"
                    required
                    placeholder="Sebutkan merchant, package, booking, atau isu sensitif yang perlu diketahui atau diputuskan superadmin."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status handoff ke finance</label>
                  <textarea
                    name="finance_handoff_status"
                    placeholder="Jelaskan kualitas handoff booking ke finance, antrean yang tertahan, atau hambatan koordinasi lintas tim."
                    className="min-h-[110px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Risiko operasional</label>
                  <textarea
                    name="operational_risks"
                    required
                    placeholder="Jelaskan risiko yang bisa berdampak ke customer, merchant, reputasi, atau kualitas operasi."
                    className="min-h-[120px] w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
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
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kebutuhan keputusan dari superadmin</label>
                  <textarea
                    name="support_needed"
                    required
                    placeholder="Jelaskan keputusan, dukungan lintas tim, atau resource yang dibutuhkan dari superadmin."
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
                      {getMetricText(report.metric_snapshot, "decisionQuality") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Kualitas keputusan:</span> {getMetricText(report.metric_snapshot, "decisionQuality")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "teamCapacity") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Kapasitas tim:</span> {getMetricText(report.metric_snapshot, "teamCapacity")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "escalations") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Eskalasi:</span> {getMetricText(report.metric_snapshot, "escalations")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "financeHandoffStatus") ? (
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          <span className="font-semibold text-slate-900">Handoff ke finance:</span> {getMetricText(report.metric_snapshot, "financeHandoffStatus")}
                        </p>
                      ) : null}
                      {getMetricText(report.metric_snapshot, "transactionAnomalies") ? (
                        <p className="mt-3 text-sm leading-7 text-amber-700">
                          Anomali transaksi: {getMetricText(report.metric_snapshot, "transactionAnomalies")}
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Diagram Dana Customer</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Diagram dana customer dari laporan operations manager</h2>
              {!latestOperationsReport ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada laporan operations manager yang bisa divisualkan.
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <ChartLegend
                    items={[
                      { label: "DP", tone: "bg-amber-400" },
                      { label: "Pelunasan", tone: "bg-sky-500" },
                      { label: "Full payment", tone: "bg-emerald-500" },
                    ]}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Total transaksi customer</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestOperationsReport.metric_snapshot, "grossCustomerTransactionTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Dana masih tertahan</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestOperationsReport.metric_snapshot, "customerHeldFundsTotal"))}
                      </p>
                    </div>
                  </div>

                  {[
                    {
                      label: "DP diterima",
                      value: getMetricNumber(latestOperationsReport.metric_snapshot, "dpReceivedTotal"),
                      tone: "bg-amber-400",
                    },
                    {
                      label: "Pelunasan diterima",
                      value: getMetricNumber(latestOperationsReport.metric_snapshot, "finalSettlementTotal"),
                      tone: "bg-sky-500",
                    },
                    {
                      label: "Full payment",
                      value: getMetricNumber(latestOperationsReport.metric_snapshot, "fullPaymentTotal"),
                      tone: "bg-emerald-500",
                    },
                  ].map((item) => {
                    const totalBase = Math.max(getMetricNumber(latestOperationsReport.metric_snapshot, "grossCustomerTransactionTotal"), 1)
                    const width = Math.max((item.value / totalBase) * 100, item.value > 0 ? 8 : 0)
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

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        label: "Siap ke finance",
                        value: getMetricNumber(latestOperationsReport.metric_snapshot, "customerReadyForFinanceFundsTotal"),
                      },
                      {
                        label: "Tertahan operasional",
                        value: getMetricNumber(latestOperationsReport.metric_snapshot, "customerOperationallyBlockedFundsTotal"),
                      },
                      {
                        label: "Sudah paid out",
                        value: getMetricNumber(latestOperationsReport.metric_snapshot, "customerPaidOutFundsTotal"),
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[20px] border border-[#efe1cf] bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Grafik Finance Manager</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Grafik queue dan dana finance manager</h2>
              {!latestFinanceReport ? (
                <div className="mt-6 rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada laporan finance manager yang bisa divisualkan.
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <ChartLegend
                    items={[
                      { label: "Pending", tone: "bg-amber-400" },
                      { label: "Processing", tone: "bg-sky-500" },
                      { label: "Paid", tone: "bg-emerald-500" },
                      { label: "Rejected", tone: "bg-rose-500" },
                    ]}
                  />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Transaksi customer</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "grossCustomerTransactionTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Dana tertahan</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "customerHeldFundsTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Outstanding</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "pendingTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Aging 2+ hari</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {getMetricNumber(latestFinanceReport.metric_snapshot, "agedPendingCount")}
                      </p>
                    </div>
                  </div>

                  {[
                    {
                      label: "Pending",
                      value: getMetricNumber(latestFinanceReport.metric_snapshot, "pendingCount"),
                      tone: "bg-amber-400",
                    },
                    {
                      label: "Processing",
                      value: getMetricNumber(latestFinanceReport.metric_snapshot, "processingCount"),
                      tone: "bg-sky-500",
                    },
                    {
                      label: "Paid",
                      value: getMetricNumber(latestFinanceReport.metric_snapshot, "paidCount"),
                      tone: "bg-emerald-500",
                    },
                    {
                      label: "Rejected",
                      value: getMetricNumber(latestFinanceReport.metric_snapshot, "rejectedCount"),
                      tone: "bg-rose-500",
                    },
                  ].map((item) => {
                    const totalBase =
                      getMetricNumber(latestFinanceReport.metric_snapshot, "pendingCount") +
                      getMetricNumber(latestFinanceReport.metric_snapshot, "processingCount") +
                      getMetricNumber(latestFinanceReport.metric_snapshot, "paidCount") +
                      getMetricNumber(latestFinanceReport.metric_snapshot, "rejectedCount") || 1
                    const width = Math.max((item.value / totalBase) * 100, item.value > 0 ? 8 : 0)
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

                  <div className="pt-3">
                    <p className="text-sm font-semibold text-slate-900">Ringkasan arus dana customer</p>
                    <ChartLegend
                      items={[
                        { label: "Dana tertahan", tone: "bg-rose-500" },
                        { label: "Masuk finance review", tone: "bg-sky-500" },
                        { label: "Sudah paid out", tone: "bg-emerald-500" },
                      ]}
                    />
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          label: "Dana tertahan",
                          value: getMetricNumber(latestFinanceReport.metric_snapshot, "customerHeldFundsTotal"),
                          tone: "bg-rose-500",
                        },
                        {
                          label: "Masuk finance review",
                          value: getMetricNumber(latestFinanceReport.metric_snapshot, "financeReviewFundsTotal"),
                          tone: "bg-sky-500",
                        },
                        {
                          label: "Sudah paid out",
                          value: getMetricNumber(latestFinanceReport.metric_snapshot, "paidOutFundsTotal"),
                          tone: "bg-emerald-500",
                        },
                      ].map((item) => {
                        const totalBase = Math.max(
                          getMetricNumber(latestFinanceReport.metric_snapshot, "grossCustomerTransactionTotal"),
                          1,
                        )
                        const width = Math.max((item.value / totalBase) * 100, item.value > 0 ? 8 : 0)
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[22px] border border-[#efe1cf] bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Kewajiban merchant</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "merchantObligationTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Komisi projected</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "commissionProjectedTotal"))}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe1cf] bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Transfer fee projected</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        {formatMoney(getMetricNumber(latestFinanceReport.metric_snapshot, "transferFeeProjectedTotal"))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="grid gap-6">
              <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Laporan Operations</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Laporan operations manager</h2>
                <div className="mt-6 grid gap-4">
                  {!operationsReports.length ? (
                    <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                      Belum ada laporan operations manager yang masuk.
                    </div>
                  ) : (
                    operationsReports.slice(0, 3).map((report) => (
                      <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                            Operations
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
                        {getMetricText(report.metric_snapshot, "decisionQuality") ? (
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            <span className="font-semibold text-slate-900">Kualitas keputusan:</span> {getMetricText(report.metric_snapshot, "decisionQuality")}
                          </p>
                        ) : null}
                        {getMetricText(report.metric_snapshot, "teamCapacity") ? (
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            <span className="font-semibold text-slate-900">Kapasitas tim:</span> {getMetricText(report.metric_snapshot, "teamCapacity")}
                          </p>
                        ) : null}
                        {getMetricText(report.metric_snapshot, "escalations") ? (
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            <span className="font-semibold text-slate-900">Eskalasi:</span> {getMetricText(report.metric_snapshot, "escalations")}
                          </p>
                        ) : null}
                        {getMetricText(report.metric_snapshot, "financeHandoffStatus") ? (
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            <span className="font-semibold text-slate-900">Handoff ke finance:</span> {getMetricText(report.metric_snapshot, "financeHandoffStatus")}
                          </p>
                        ) : null}
                        {getMetricText(report.metric_snapshot, "transactionAnomalies") ? (
                          <p className="mt-3 text-sm leading-7 text-amber-700">
                            Anomali transaksi: {getMetricText(report.metric_snapshot, "transactionAnomalies")}
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

              <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Laporan Finance</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Laporan finance manager</h2>
                <div className="mt-6 grid gap-4">
                  {!financeReports.length ? (
                    <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                      Belum ada laporan finance manager yang masuk.
                    </div>
                  ) : (
                    financeReports.slice(0, 3).map((report) => (
                      <div key={report.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                            Finance
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Control Center
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Dashboard admin multi-produk dengan Paket Tour sebagai workspace utama saat ini.
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Semua workflow merchant dan review yang aktif saat ini dipusatkan di Paket Tour, sementara booking tetap dipisah karena akan menampung transaksi lintas produk.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Live queue snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Merchant pending</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{pendingMerchants}</p>
                </div>
                <div>
                    <p className="text-sm text-orange-50/80">Siap ke finance</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{financeReadyCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Package approved</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{approvedPackages}</p>
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
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Public Performance</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Ringkasan Web Vitals publik</h2>
              </div>
              <div className="rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-xs leading-6 text-slate-600">
                <p>{recentWebVitalEvents.length} sampel terbaru tersimpan</p>
                <p>{trackedPublicPaths} path publik terlacak</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
              {performanceCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Sample terbaru: {formatDateTime(latestPerformanceSampleAt)} ({formatRelativeHours(latestPerformanceSampleAt)})</p>
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Path Watchlist</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Path publik yang paling sering bermasalah</h2>
            {performancePathSummary.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-[#e7d8c6] bg-[#fffaf3] px-5 py-6 text-sm leading-7 text-slate-500">
                Belum ada data Web Vitals yang tersimpan. Begitu user publik membuka app, ringkasan performa akan muncul di sini.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {performancePathSummary.map((item) => (
                  <div key={item.path} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.path}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.samples} sampel masuk, {item.poorCount} di antaranya poor</p>
                      </div>
                      <div className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                        {item.poorCount > 0 ? "Perlu cek" : "Stabil"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {isSuperadmin ? (
          <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Manager control deck</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
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

            <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
                <form action={createAdminAccount} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 sm:rounded-[28px] sm:p-6">
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

                <form action={createFinanceAccount} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 sm:rounded-[28px] sm:p-6">
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

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-2">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Antrian yang perlu perhatian cepat</h2>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
              {needsAttentionCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">SLA Monitor</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Target respons operasional admin</h2>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
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
