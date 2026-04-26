import Link from "next/link"
import { redirect } from "next/navigation"
import AdminDashboardHeightSync from "@/app/components/AdminDashboardHeightSync"
import AdminDashboardToolbarActions from "@/app/components/AdminDashboardToolbarActions"
import { formatAdminCode, formatFinanceCode } from "@/lib/merchant-code"
import { canAccessInternalPortal, getInternalPortalHomePath, getRoleLabel } from "@/lib/internal-roles"
import { getPublicAccountHomePath, resolvePublicAccountRole } from "@/lib/login-role-lock"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getBookingProductLabel, resolveBookingProductType, type BookingProductType } from "@/lib/booking-products"
import { getAccessibleInternalProducts, getAccessibleInternalProductTypes, hasInternalProductAccess } from "@/lib/internal-product-access"
import {
  OPERATIONS_DASHBOARD_SCOPE,
  resolveOperationsDashboardWidgetKeys,
} from "@/lib/admin-dashboard-widgets"
import { submitOperationsManagerReport } from "./actions"
import { createAdminAccount } from "@/app/admin/(protected)/team-accounts/actions"
import { createFinanceAccount } from "@/app/finance/(protected)/team-accounts/finance-actions"

type AdminWorkspacePortal = "admin" | "superadmin"
const JAKARTA_TIMEZONE = "Asia/Jakarta"

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

function formatCompactMoney(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(2)} B`
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(1)} K`
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatCompactCount(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
  return amount.toLocaleString("id-ID")
}

function calculateGrowthRate(current: number, previous: number) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 1000) / 10
  if (current > 0) return 100
  return 0
}

function getGreetingByJakartaTime() {
  const hourLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: JAKARTA_TIMEZONE,
  }).format(new Date())
  const hour = Number.parseInt(hourLabel, 10)

  if (hour >= 4 && hour < 11) return "Selamat pagi"
  if (hour >= 11 && hour < 15) return "Selamat siang"
  if (hour >= 15 && hour < 18) return "Selamat sore"
  return "Selamat malam"
}

function getCurrentJakartaDateTimeLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIMEZONE,
  }).format(new Date())
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
  booking_product_type: string | null
  supplier_id: string | null
  fulfillment_mode: string | null
  supplier_order_status: string | null
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

type DashboardSupplierRow = {
  id: string
  supplier_code: string
  internal_display_name: string | null
  internal_alias: string | null
  brand_visibility: string | null
  supplier_type: string | null
  status: string | null
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

function normalizeFulfillmentMode(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "affiliate_api" || normalized === "affiliate_manual" || normalized === "internal") {
    return normalized
  }
  return "internal"
}

function getMaskedSupplierLabel(supplier: DashboardSupplierRow | null | undefined) {
  if (!supplier) return "Mitra Eksternal"

  const supplierType = String(supplier.supplier_type || "").trim().toLowerCase()
  const brandVisibility = String(supplier.brand_visibility || "").trim().toLowerCase()

  if (
    supplierType === "affiliate" ||
    supplierType === "aggregator" ||
    brandVisibility === "owner_only" ||
    brandVisibility === "superadmin_only" ||
    brandVisibility === "restricted_internal"
  ) {
    return supplier.internal_alias || supplier.internal_display_name || "Mitra Eksternal"
  }

  return supplier.internal_display_name || supplier.supplier_code || "Mitra Eksternal"
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

function buildSparklinePoints(rows: Array<{ value: number }>, width = 100, height = 28) {
  if (rows.length === 0) return null
  const sampledRows = rows.length <= 8
    ? rows
    : Array.from({ length: 8 }, (_, index) => {
        const rowIndex = Math.min(
          Math.round((index / 7) * (rows.length - 1)),
          rows.length - 1,
        )
        return rows[rowIndex]
      })
  const maxValue = Math.max(...sampledRows.map((row) => row.value), 0)
  if (maxValue <= 0) return null
  const minX = 2
  const maxX = width - 2
  const minY = 6
  const maxY = height - 4
  return sampledRows
    .map((row, index) => {
      const x =
        sampledRows.length === 1
          ? width / 2
          : minX + ((maxX - minX) / (sampledRows.length - 1)) * index
      const ratio = row.value / maxValue
      const y = maxY - ratio * (maxY - minY)
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    .join(" ")
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

function TinySparkline({
  points,
  stroke,
}: {
  points: string | null
  stroke: string
}) {
  if (!points) {
    return <div className="mt-5 h-12 rounded-[14px] border border-dashed border-[#dbe3f0] bg-[#f8fbff]" />
  }

  return (
    <svg viewBox="0 0 100 28" aria-hidden="true" className="mt-5 h-12 w-full">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function buildLinePath(values: number[], width = 520, height = 220) {
  if (values.length === 0) return ""
  const maxValue = Math.max(...values, 0)
  const minX = 24
  const maxX = width - 20
  const minY = 14
  const maxY = height - 22

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : minX + ((maxX - minX) / (values.length - 1)) * index
      const ratio = maxValue > 0 ? value / maxValue : 0
      const y = maxY - ratio * (maxY - minY)
      return `${index === 0 ? "M" : "L"} ${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`
    })
    .join(" ")
}

function DashboardLineChart({
  labels,
  series,
  valueFormatter,
}: {
  labels: string[]
  series: Array<{ label: string; values: number[]; color: string }>
  valueFormatter?: (value: number) => string
}) {
  const width = 520
  const height = 220
  const maxValue = Math.max(
    ...series.flatMap((item) => item.values),
    1,
  )
  const hasData = series.some((item) => item.values.some((value) => value > 0))
  const tickValues = [0, maxValue * 0.33, maxValue * 0.66, maxValue]
  const formatValue = valueFormatter || ((value: number) => value.toLocaleString("id-ID"))

  return (
    <div className="mt-4 rounded-[18px] border border-[#edf2f7] bg-[linear-gradient(180deg,#ffffff,rgba(248,250,252,0.9))] p-3.5">
      {!hasData ? (
        <div className="flex h-[212px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#dbe4f0] bg-[#fbfdff] text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada trend live</p>
          <p className="mt-1 max-w-[240px] text-xs leading-5 text-slate-400">
            Grafik akan aktif otomatis setelah ada booking atau revenue yang tercatat pada periode ini.
          </p>
        </div>
      ) : (
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="h-[212px] w-full">
        {tickValues.map((value, index) => {
          const y = height - 22 - ((height - 36) * value) / maxValue
          return (
            <g key={`tick-${index}`}>
              <line x1="24" x2={width - 14} y1={y} y2={y} stroke="#edf2f7" strokeWidth="1" strokeDasharray={index === 0 ? "0" : "4 4"} />
              <text x="2" y={y + 4} fontSize="10" fill="#94a3b8">
                {formatValue(Math.round(value))}
              </text>
            </g>
          )
        })}
        {series.map((item) => (
          <path
            key={item.label}
            d={buildLinePath(item.values, width, height)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {labels.map((label, index) => {
          const x = labels.length === 1 ? width / 2 : 24 + ((width - 44) / (labels.length - 1)) * index
          return (
            <text key={label} x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {label}
            </text>
          )
        })}
      </svg>
      )}
    </div>
  )
}

function DashboardGlyph({
  kind,
  className,
}: {
  kind: "booking" | "revenue" | "issue" | "sla" | "anomaly" | "failure" | "alert" | "refresh" | "bell"
  className?: string
}) {
  if (kind === "revenue") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 3a7 7 0 017 7v8a3 3 0 01-3 3H8a3 3 0 01-3-3v-8a7 7 0 017-7zm0 2a5 5 0 00-5 5v8a1 1 0 001 1h8a1 1 0 001-1v-8a5 5 0 00-5-5zm0 3c1.8 0 3 1.1 3 2.5 0 1.3-1 2.2-2.5 2.5V15h2v2h-2v1h-2v-1H8v-2h2v-2.1c-1.8-.3-3-1.3-3-2.9h2c0 .6.6 1 1.5 1h2c.8 0 1.5-.4 1.5-1s-.7-1-1.5-1h-1c-2.1 0-3.5-1-3.5-2.5S9.4 7 11 6.7V5h2v1.7c1.6.3 2.7 1.2 2.9 2.8h-2C13.8 8.6 13 8 12 8h-1z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "issue") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2l9 4v6c0 5.2-3.2 9.9-8.1 11.8L12 24l-.9-.2C6.2 21.9 3 17.2 3 12V6l9-4zm0 3.1L5 7.9V12c0 4 2.4 7.6 6 9.1 3.6-1.5 6-5.1 6-9.1V7.9l-5-2.8zM11 8h2v5h-2V8zm0 7h2v2h-2v-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "sla") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0-2a10 10 0 110 20 10 10 0 010-20zm1 5v5.2l3.6 2.1-1 1.7L11 13V7h2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "anomaly") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2l10 18H2L12 2zm0 4.2L5.4 18h13.2L12 6.2zM11 9h2v4h-2V9zm0 5h2v2h-2v-2z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "failure") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 17l-5.5 2.9 1-6.2L3 8.9 9 8l3-6zm0 4.7L10.2 10h-3.1l2.5 2.3-.6 3.3 3-1.7 3 1.7-.6-3.3 2.5-2.3h-3.1L12 6.7zm-1.4 4.1 1.4 1.4 1.4-1.4 1.4 1.4-1.4 1.4 1.4 1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4-1.4 1.4-1.4-1.4-1.4 1.4-1.4z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "alert") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 2a5 5 0 015 5v1.3c0 1.7.5 3.4 1.5 4.8l1 1.5V17H4.5v-2.4l1-1.5A8.2 8.2 0 007 8.3V7a5 5 0 015-5zm0 20a3 3 0 01-2.8-2h5.6A3 3 0 0112 22zm3.8-7l-.9-1.4A10.2 10.2 0 0115 8.3V7a3 3 0 10-6 0v1.3c0 1.8-.5 3.5-1.5 5L6.7 15h9.1z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "refresh") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 5a7 7 0 016.5 4.4h-2.3l3.8 4 3.8-4h-2.2A10 10 0 1022 14h-2a8 8 0 11-8-9z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === "bell") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 3a5 5 0 015 5v1.1c0 1.6.5 3.2 1.5 4.5l1 1.4V17H4.5v-2l1-1.4A7.5 7.5 0 007 9.1V8a5 5 0 015-5zm0 19a2.8 2.8 0 01-2.6-1.8h5.2A2.8 2.8 0 0112 22z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm1 2v10h12V7H6zm2 2h3v3H8V9zm5 0h3v3h-3V9zm-5 5h8v2H8v-2z" fill="currentColor" />
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

function isWithinDateRange(value: string | null | undefined, start: Date | null, end: Date | null) {
  if (!start || !end) return false
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed >= start && parsed < end
}

function getOperationsWorkspace(value: string | null | undefined) {
  const normalized = String(value || "all").trim().toLowerCase()
  if ([
    "merchant",
    "package_review",
    "booking_center",
    "anomalies",
    "kpi_overview",
    "product_performance",
    "quick_actions",
    "source_performance",
    "operational_tasks",
    "alerts_overview",
  ].includes(normalized)) {
    return normalized
  }
  return "all"
}

function getOperationsProduct(value: string | null | undefined): "all" | BookingProductType {
  const normalized = String(value || "all").trim().toLowerCase()
  if (["package_tour", "flight", "hotel", "train", "bus", "sea", "cruise"].includes(normalized)) {
    return normalized as BookingProductType
  }
  return "all"
}

function getOperationsSource(value: string | null | undefined): "all" | "internal" | "affiliate" {
  const normalized = String(value || "all").trim().toLowerCase()
  if (normalized === "internal" || normalized === "affiliate") return normalized
  return "all"
}

function getSuperadminRegion(
  value: string | null | undefined,
):
  | "all"
  | "indonesia"
  | "international"
  | "bali"
  | "jawa"
  | "sumatera"
  | "kalimantan"
  | "sulawesi"
  | "nusa_tenggara" {
  const normalized = String(value || "all").trim().toLowerCase()
  if (
    normalized === "indonesia" ||
    normalized === "international" ||
    normalized === "bali" ||
    normalized === "jawa" ||
    normalized === "sumatera" ||
    normalized === "kalimantan" ||
    normalized === "sulawesi" ||
    normalized === "nusa_tenggara"
  ) {
    return normalized
  }
  return "all"
}

function getSuperadminWorkspace(value: string | null | undefined): "all" | "commercial" | "operational" | "platform" {
  const normalized = String(value || "all").trim().toLowerCase()
  if (normalized === "commercial" || normalized === "operational" || normalized === "platform") return normalized
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

type OperationsProductKey = BookingProductType

const OPERATIONS_PRODUCT_SUMMARIES: Array<{
  key: OperationsProductKey
  label: string
  href: string
  status: "connected" | "partial" | "roadmap"
  icon: "package" | "flight" | "hotel" | "train" | "bus" | "ship" | "cruise"
  tone: string
  bg: string
  sparkColor: string
  sparkPoints: string
}> = [
  { key: "package_tour", label: "Paket Wisata", href: "/admin/paket-tour", status: "connected", icon: "package", tone: "text-violet-600", bg: "bg-violet-50", sparkColor: "#7c3aed", sparkPoints: "2,22 14,24 26,18 38,12 50,20 62,8 74,17 86,10 98,6" },
  { key: "flight", label: "Pesawat", href: "/admin/pesawat", status: "partial", icon: "flight", tone: "text-sky-600", bg: "bg-sky-50", sparkColor: "#2563eb", sparkPoints: "2,22 14,23 26,18 38,21 50,14 62,10 74,16 86,9 98,7" },
  { key: "hotel", label: "Hotel", href: "/admin/hotel", status: "roadmap", icon: "hotel", tone: "text-emerald-600", bg: "bg-emerald-50", sparkColor: "#16a34a", sparkPoints: "2,23 14,14 26,20 38,12 50,18 62,10 74,17 86,14 98,8" },
  { key: "train", label: "Kereta Api", href: "/admin/kereta-api", status: "roadmap", icon: "train", tone: "text-orange-600", bg: "bg-orange-50", sparkColor: "#ea580c", sparkPoints: "2,20 14,24 26,22 38,17 50,10 62,16 74,9 86,12 98,8" },
  { key: "bus", label: "Bus & Travel", href: "/admin/bus-travel", status: "roadmap", icon: "bus", tone: "text-blue-600", bg: "bg-blue-50", sparkColor: "#2563eb", sparkPoints: "2,24 14,18 26,15 38,19 50,12 62,16 74,10 86,13 98,9" },
  { key: "sea", label: "Kapal Laut", href: "/admin/kapal-laut", status: "roadmap", icon: "ship", tone: "text-cyan-600", bg: "bg-cyan-50", sparkColor: "#0f766e", sparkPoints: "2,22 14,19 26,16 38,18 50,13 62,17 74,12 86,14 98,10" },
  { key: "cruise", label: "Kapal Pesiar", href: "/admin/kapal-pesiar", status: "roadmap", icon: "cruise", tone: "text-rose-600", bg: "bg-rose-50", sparkColor: "#f43f5e", sparkPoints: "2,24 14,10 26,20 38,18 50,16 62,19 74,14 86,15 98,11" },
]

function getProductFilterFromLabel(productLabel: string) {
  if (productLabel === "Paket Wisata") return "package_tour"
  if (productLabel === "Pesawat") return "flight"
  if (productLabel === "Hotel") return "hotel"
  if (productLabel === "Kereta Api") return "train"
  if (productLabel === "Bus & Travel") return "bus"
  if (productLabel === "Kapal Laut") return "sea"
  if (productLabel === "Kapal Pesiar") return "cruise"
  return "all"
}

function getOperationsProductLabel(productKey: OperationsProductKey) {
  return getBookingProductLabel(productKey)
}

function classifyBookingProduct(booking: DashboardBookingRow): OperationsProductKey {
  return resolveBookingProductType({
    bookingProductType: booking.booking_product_type,
    packageId: booking.package_id,
  })
}

export default async function AdminDashboard({
  searchParams,
  portal = "admin",
}: {
  searchParams?: Promise<{ success?: string; error?: string; view?: string; period?: string; workspace?: string; product?: string; source?: string; region?: string; super_workspace?: string }>
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
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, currentProfile?.role)
  const accessibleProductTypes = getAccessibleInternalProductTypes(accessibleProducts)
  const canAccessPackageTour = hasInternalProductAccess(accessibleProducts, "package_tour")
  const operationsPeriod = getDashboardPeriod(params.period)
  const operationsPeriodStart = getPeriodStart(operationsPeriod.days)
  const operationsChartDays = operationsPeriod.days || 30
  const operationsWorkspace = getOperationsWorkspace(params.workspace)
  const operationsSource = getOperationsSource(params.source)
  const superadminRegion = getSuperadminRegion(params.region)
  const superadminWorkspace = getSuperadminWorkspace(params.super_workspace)
  const requestedOperationsProduct = getOperationsProduct(params.product)
  const operationsProduct =
    requestedOperationsProduct === "all" || accessibleProductTypes.includes(requestedOperationsProduct)
      ? requestedOperationsProduct
      : "all"
  const widgetPreferenceResult = showOperationsManagerView
    ? await adminSupabase
        .from("dashboard_widget_preferences")
        .select("widget_key, enabled, sort_order")
        .eq("profile_id", user.id)
        .eq("dashboard_scope", OPERATIONS_DASHBOARD_SCOPE)
        .order("sort_order", { ascending: true })
    : { data: null, error: null }
  const widgetPreferenceRows = widgetPreferenceResult.error
    ? null
    : ((widgetPreferenceResult.data as Array<{ widget_key: string | null; enabled: boolean | null; sort_order: number | null }> | null) || [])
  const enabledOperationsWidgetKeys = resolveOperationsDashboardWidgetKeys(
    widgetPreferenceRows,
  )
  const [
    merchantResult,
    packageResult,
    bookingResult,
    supplierCatalogResult,
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
      .from("packages")
      .select("id, status, created_at, merchant_id, title, city, country, destination_province, destination_country_id, travel_style")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, package_id, supplier_id, fulfillment_mode, supplier_order_status, booking_product_type, booking_status, created_at, payment_status, payment_type, escrow_status, total_amount, dp_amount, final_payment_amount, customer_admin_fee_amount, customer_tax_amount")
      .order("created_at", { ascending: false }),
    adminSupabase.from("suppliers").select("id, supplier_code, internal_display_name, internal_alias, brand_visibility, supplier_type, status"),
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

  const pendingMerchantsData = canAccessPackageTour ? ((merchantResult.data as Array<{ id: string; created_at: string | null }> | null) || []) : []
  const suppliers = supplierCatalogResult.error ? [] : ((supplierCatalogResult.data as DashboardSupplierRow[] | null) || [])
  const packages = canAccessPackageTour ? ((packageResult.data as DashboardPackageRow[] | null) || []) : []
  const bookings = (((bookingResult.data as DashboardBookingRow[] | null) || []) as DashboardBookingRow[])
    .filter((booking) => accessibleProductTypes.includes(classifyBookingProduct(booking)))
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

  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]))
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
  const classifyBookingSource = (booking: DashboardBookingRow) => {
    const supplier = booking.supplier_id ? supplierMap.get(booking.supplier_id) : null
    const fulfillmentMode = normalizeFulfillmentMode(booking.fulfillment_mode)
    return fulfillmentMode !== "internal" ||
      supplier?.supplier_type === "affiliate" ||
      supplier?.supplier_type === "aggregator"
      ? "affiliate"
      : "internal"
  }

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
      note: "Antrean partner/merchant yang belum selesai ditinjau selama 3 hari atau lebih.",
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
      label: "Approval pending",
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
      const supplier = booking.supplier_id ? supplierMap.get(booking.supplier_id) : null
      const fulfillmentMode = normalizeFulfillmentMode(booking.fulfillment_mode)
      const bookingSource = classifyBookingSource(booking)

      return {
        id: booking.id,
        packageId: booking.package_id,
        bookingProductType: classifyBookingProduct(booking),
        bookingSource,
        fulfillmentMode,
        supplierType: String(supplier?.supplier_type || "").trim().toLowerCase() || null,
        supplierCode: supplier?.supplier_code || null,
        supplierOrderStatus: normalizeStatus(booking.supplier_order_status),
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
      note: "Queue approval yang masih menunggu keputusan tim admin.",
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
  const [platformProfileCountResult, totalMerchantCountResult, activeSupplierCountResult] = isSuperadmin
    ? await Promise.all([
        adminSupabase.from("profiles").select("id", { head: true, count: "exact" }),
        adminSupabase.from("merchants").select("id", { head: true, count: "exact" }),
        adminSupabase.from("suppliers").select("id", { head: true, count: "exact" }).eq("status", "active"),
      ])
    : [
        { count: 0, error: null, data: null },
        { count: 0, error: null, data: null },
        { count: 0, error: null, data: null },
      ]
  const totalPlatformProfiles = Number(platformProfileCountResult.count || 0)
  const totalMerchantCount = Number(totalMerchantCountResult.count || 0)
  const activeSupplierCount = Number(activeSupplierCountResult.count || 0)

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
      note: "Overdue approval, paket, dan booking yang tertahan.",
      href: "/admin/dashboard",
      cta: "Lihat detail",
      tone: "text-rose-600",
    },
  ]

  // PROTECTED-OPS-DASHBOARD-START
  // Dashboard manager operasional dikunci secara struktural.
  // Saat mengedit dashboard lain, hindari mengubah blok ini tanpa review khusus.
  if (showOperationsManagerView) {
    const allPeriodBookings = bookings.filter((booking) => isWithinPeriod(booking.created_at, operationsPeriodStart))
    const allPeriodInternalBookings = allPeriodBookings.filter((booking) => classifyBookingSource(booking) === "internal")
    const allPeriodAffiliateBookings = allPeriodBookings.filter((booking) => classifyBookingSource(booking) === "affiliate")
    const sourcePendingMerchantsData = operationsSource === "affiliate" ? [] : pendingMerchantsData
    const sourcePendingMerchants = sourcePendingMerchantsData.length
    const sourceMerchantOverdueCount = operationsSource === "affiliate" ? 0 : merchantOverdueCount
    const allPeriodPackages = packages.filter((pkg) => isWithinPeriod(pkg.created_at, operationsPeriodStart))
    const globalPeriodBookings =
      operationsSource === "internal"
        ? allPeriodInternalBookings
        : operationsSource === "affiliate"
          ? allPeriodAffiliateBookings
          : allPeriodBookings
    const globalPeriodInternalBookings = operationsSource === "affiliate" ? [] : allPeriodInternalBookings
    const globalPeriodAffiliateBookings = operationsSource === "internal" ? [] : allPeriodAffiliateBookings
    const globalPeriodPackages = operationsSource === "affiliate" ? [] : allPeriodPackages
    const globalPeriodDeletionRequests = deletionRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const globalPeriodReviewRequests = reviewRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const globalPeriodAuditLogs = recentAuditLogs.filter((log) => isWithinPeriod(log.created_at, operationsPeriodStart))
    const globalPeriodCustomerTransactionRows = customerTransactionRows.filter((transaction) =>
      isWithinPeriod(transaction.createdAt, operationsPeriodStart),
    )
    const globalPeriodInternalTransactionRows = globalPeriodCustomerTransactionRows.filter((transaction) => transaction.bookingSource === "internal")
    const globalPeriodAffiliateTransactionRows = globalPeriodCustomerTransactionRows.filter((transaction) => transaction.bookingSource === "affiliate")
    const globalPendingPackages = globalPeriodPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
    const globalPackageOverdueCount = globalPeriodPackages.filter(
      (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
    ).length
    const globalInternalFinanceReadyCount = globalPeriodInternalBookings.filter((booking) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
    ).length
    const globalAffiliateFinanceReadyCount = globalPeriodAffiliateBookings.filter((booking) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
    ).length
    const globalFinanceReadyCount = globalPeriodBookings.filter((item) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(item.booking_status)),
    ).length
    const globalInternalBookingStalledCount = globalPeriodInternalBookings.filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
    const globalAffiliateBookingStalledCount = globalPeriodAffiliateBookings.filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
    const globalBookingStalledCount = globalPeriodBookings.filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
    const accessibleProductSummaries = OPERATIONS_PRODUCT_SUMMARIES.filter((product) => {
      if (!accessibleProductTypes.includes(product.key)) return false
      if (operationsSource === "internal") return product.key === "package_tour"
      if (operationsSource === "affiliate") return product.key !== "package_tour"
      return true
    })
    const globalRevenueTotal = globalPeriodCustomerTransactionRows.reduce((sum, item) => sum + item.receivedAmount, 0)
    const globalInternalRevenueTotal = globalPeriodInternalTransactionRows.reduce((sum, item) => sum + item.receivedAmount, 0)
    const globalAffiliateRevenueTotal = globalPeriodAffiliateTransactionRows.reduce((sum, item) => sum + item.receivedAmount, 0)
    const totalBookingBase = Math.max(globalPeriodBookings.length, 1)
    const totalRevenueBase = Math.max(globalRevenueTotal, 1)
    const internalBookingShare = Math.round((globalPeriodInternalBookings.length / totalBookingBase) * 1000) / 10
    const affiliateBookingShare = Math.round((globalPeriodAffiliateBookings.length / totalBookingBase) * 1000) / 10
    const internalRevenueShare = Math.round((globalInternalRevenueTotal / totalRevenueBase) * 1000) / 10
    const affiliateRevenueShare = Math.round((globalAffiliateRevenueTotal / totalRevenueBase) * 1000) / 10
    const affiliateIssueCount = globalPeriodAffiliateBookings.filter((booking) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
    ).length
    const affiliateApiErrorCount = globalPeriodAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length
    const affiliateFailureCount = globalPeriodAffiliateBookings.filter((booking) => {
      const supplierStatus = normalizeStatus(booking.supplier_order_status)
      return ["failed", "cancel_requested", "cancelled", "refund_requested", "refunded"].includes(supplierStatus)
    }).length
    const internalFailureCount = globalPeriodInternalBookings.filter((booking) => {
      const bookingStatus = normalizeStatus(booking.booking_status)
      return ["cancel_requested", "cancelled", "refund_requested", "refunded", "failed"].includes(bookingStatus)
    }).length
    const internalPendingIssueCount = sourcePendingMerchants + globalPendingPackages
    const totalPendingIssueCount = internalPendingIssueCount + affiliateIssueCount
    const slaTrackedItemCount = sourcePendingMerchants + globalPendingPackages + globalFinanceReadyCount
    const slaBreachCount = sourceMerchantOverdueCount + globalPackageOverdueCount + globalBookingStalledCount
    const slaComplianceRate =
      slaTrackedItemCount > 0 ? Math.max(0, Math.round(((slaTrackedItemCount - slaBreachCount) / slaTrackedItemCount) * 1000) / 10) : 100
    const internalSlaTrackedCount = sourcePendingMerchants + globalPendingPackages + globalInternalFinanceReadyCount
    const internalSlaBreachCount = sourceMerchantOverdueCount + globalPackageOverdueCount + globalInternalBookingStalledCount
    const affiliateSlaTrackedCount = globalAffiliateFinanceReadyCount
    const affiliateSlaBreachCount = globalAffiliateBookingStalledCount
    const affiliateFailureRate =
      globalPeriodAffiliateBookings.length > 0
        ? Math.round((affiliateFailureCount / globalPeriodAffiliateBookings.length) * 1000) / 10
        : 0
    const internalFailureRate =
      globalPeriodInternalBookings.length > 0
        ? Math.round((internalFailureCount / globalPeriodInternalBookings.length) * 1000) / 10
        : 0
    const totalFailureCount = internalFailureCount + affiliateFailureCount
    const totalFailureRate =
      globalPeriodBookings.length > 0
        ? Math.round((totalFailureCount / globalPeriodBookings.length) * 1000) / 10
        : 0
    const alertRecentWindowStart = getPeriodStart(7)
    const alertPreviousWindowStart = getPeriodStart(14)
    const anomalySignalCurrentCount =
      sourcePendingMerchantsData.filter((merchant) => isWithinDateRange(merchant.created_at, alertRecentWindowStart, new Date())).length +
      globalPeriodPackages.filter(
        (pkg) =>
          normalizeStatus(pkg.status) === "pending" &&
          (daysSince(pkg.created_at) >= 3 || isWithinDateRange(pkg.created_at, alertRecentWindowStart, new Date())),
      ).length +
      deletionRequests.filter((request) => isWithinDateRange(request.requested_at, alertRecentWindowStart, new Date())).length +
      reviewRequests.filter((request) => isWithinDateRange(request.requested_at, alertRecentWindowStart, new Date())).length +
      bookings.filter(
        (booking) =>
          ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) &&
          isWithinDateRange(booking.created_at, alertRecentWindowStart, new Date()),
      ).length +
      bookings.filter(
        (booking) =>
          classifyBookingSource(booking) === "affiliate" &&
          normalizeStatus(booking.supplier_order_status) === "failed" &&
          isWithinDateRange(booking.created_at, alertRecentWindowStart, new Date()),
      ).length
    const anomalySignalPreviousCount =
      sourcePendingMerchantsData.filter((merchant) => isWithinDateRange(merchant.created_at, alertPreviousWindowStart, alertRecentWindowStart)).length +
      globalPeriodPackages.filter(
        (pkg) =>
          normalizeStatus(pkg.status) === "pending" &&
          isWithinDateRange(pkg.created_at, alertPreviousWindowStart, alertRecentWindowStart),
      ).length +
      deletionRequests.filter((request) => isWithinDateRange(request.requested_at, alertPreviousWindowStart, alertRecentWindowStart)).length +
      reviewRequests.filter((request) => isWithinDateRange(request.requested_at, alertPreviousWindowStart, alertRecentWindowStart)).length +
      bookings.filter(
        (booking) =>
          ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) &&
          isWithinDateRange(booking.created_at, alertPreviousWindowStart, alertRecentWindowStart),
      ).length +
      bookings.filter(
        (booking) =>
          classifyBookingSource(booking) === "affiliate" &&
          normalizeStatus(booking.supplier_order_status) === "failed" &&
          isWithinDateRange(booking.created_at, alertPreviousWindowStart, alertRecentWindowStart),
      ).length
    const anomalySpikeDelta = Math.max(anomalySignalCurrentCount - anomalySignalPreviousCount, 0)
    const anomalySpikeRate =
      anomalySignalPreviousCount > 0
        ? Math.round((anomalySpikeDelta / anomalySignalPreviousCount) * 1000) / 10
        : anomalySignalCurrentCount > 0
          ? 100
          : 0
    const sourcePerformanceCards = [
      {
        title: "Booking Source Mix",
        summary: `${internalBookingShare}% internal | ${affiliateBookingShare}% affiliate`,
        detail: `${globalPeriodInternalBookings.length.toLocaleString("id-ID")} booking internal dan ${globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking affiliate pada ${operationsPeriod.label.toLowerCase()}.`,
        rows: [
          { label: "Internal RedFeng", value: `${internalBookingShare}%`, width: internalBookingShare, valueNote: `${globalPeriodInternalBookings.length.toLocaleString("id-ID")} booking`, tone: "bg-sky-500" },
          { label: "Channel Mitra", value: `${affiliateBookingShare}%`, width: affiliateBookingShare, valueNote: `${globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking`, tone: "bg-orange-500" },
        ],
      },
      {
        title: "Revenue Source Mix",
        summary: `${internalRevenueShare}% internal | ${affiliateRevenueShare}% affiliate`,
        detail: `${formatMoney(globalInternalRevenueTotal)} revenue internal dan ${formatMoney(globalAffiliateRevenueTotal)} revenue affiliate pada ${operationsPeriod.label.toLowerCase()}.`,
        rows: [
          { label: "Internal RedFeng", value: `${internalRevenueShare}%`, width: internalRevenueShare, valueNote: formatMoney(globalInternalRevenueTotal), tone: "bg-emerald-500" },
          { label: "Channel Mitra", value: `${affiliateRevenueShare}%`, width: affiliateRevenueShare, valueNote: formatMoney(globalAffiliateRevenueTotal), tone: "bg-orange-500" },
        ],
      },
      {
        title: "Affiliate Snapshot",
        summary: `${globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking affiliate`,
        detail: "Snapshot awal channel mitra. Conversion belum ditampilkan sampai denominator channel mitra tersedia di data operasional.",
        rows: [
          { label: "Booking Mitra", value: globalPeriodAffiliateBookings.length.toLocaleString("id-ID"), width: affiliateBookingShare, valueNote: "Mitra eksternal", tone: "bg-violet-500" },
          { label: "Revenue Affiliate", value: formatMoney(globalAffiliateRevenueTotal), width: affiliateRevenueShare, valueNote: `${affiliateRevenueShare}% share`, tone: "bg-fuchsia-500" },
          { label: "Issue Affiliate", value: affiliateIssueCount.toLocaleString("id-ID"), width: Math.min(Math.max(affiliateIssueCount * 12, affiliateIssueCount > 0 ? 12 : 0), 100), valueNote: "Perlu follow-up", tone: "bg-rose-500" },
        ],
      },
    ]

    const periodBookings = globalPeriodBookings.filter((booking) => {
      if (!isWithinPeriod(booking.created_at, operationsPeriodStart)) return false
      if (operationsProduct === "all") return true
      return classifyBookingProduct(booking) === operationsProduct
    })
    const periodPackages = globalPeriodPackages.filter((pkg) => {
      if (!isWithinPeriod(pkg.created_at, operationsPeriodStart)) return false
      return operationsProduct === "all" || operationsProduct === "package_tour"
    })
    const periodDeletionRequests = deletionRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const periodReviewRequests = reviewRequests.filter((request) => isWithinPeriod(request.requested_at, operationsPeriodStart))
    const periodAuditLogs = globalPeriodAuditLogs
    const periodCustomerTransactionRows = globalPeriodCustomerTransactionRows.filter((transaction) => {
      if (operationsProduct === "all") return true
      return transaction.bookingProductType === operationsProduct
    })
    const periodPendingPackages = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
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
    const bookingTrendRows = buildRecentDayBuckets(operationsChartDays).map((row) => ({ ...row, internal: 0, affiliate: 0 }))
    const bookingTrendMap = new Map(bookingTrendRows.map((row) => [row.key, row]))
    periodBookings.forEach((booking) => {
      const dayKey = getDayKey(booking.created_at)
      const bucket = dayKey ? bookingTrendMap.get(dayKey) : null
      if (bucket) {
        bucket.value += 1
        if (classifyBookingSource(booking) === "affiliate") {
          bucket.affiliate += 1
        } else {
          bucket.internal += 1
        }
      }
    })
    const revenueTrendRows = buildRecentDayBuckets(operationsChartDays).map((row) => ({ ...row, internal: 0, affiliate: 0 }))
    const revenueTrendMap = new Map(revenueTrendRows.map((row) => [row.key, row]))
    periodCustomerTransactionRows.forEach((transaction) => {
      const dayKey = getDayKey(transaction.createdAt)
      const bucket = dayKey ? revenueTrendMap.get(dayKey) : null
      if (bucket) {
        bucket.value += transaction.receivedAmount
        if (transaction.bookingSource === "affiliate") {
          bucket.affiliate += transaction.receivedAmount
        } else {
          bucket.internal += transaction.receivedAmount
        }
      }
    })
    const flightStalledBookingCount = globalPeriodBookings.filter(
      (booking) => classifyBookingProduct(booking) === "flight" && ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
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
        ? [{ title: "Approval pending melewati SLA", source: `${sourceMerchantOverdueCount} item perlu ditinjau`, time: "SLA 3 hari", severity: "High", tone: "bg-rose-50 text-rose-600" }]
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
        : [{
            title: "Tidak ada anomali terbuka",
            source: "Semua queue operasional aman pada periode ini",
            time: "Saat ini",
            severity: "OK",
            tone: "bg-emerald-50 text-emerald-600",
          }]
    const primaryAccessibleProductHref = accessibleProductSummaries[0]?.href || "/admin/dashboard/widgets"
    const primaryAccessibleProductLabel = accessibleProductSummaries[0]?.label || "Produk"
    const globalQuickActions = [
      { label: "Booking Center", href: "/admin/bookings", badge: periodFinanceReadyCount },
      { label: "Audit Log", href: "/admin/audit-log", badge: periodAuditLogs.length },
      { label: "Approval Merchant", href: "/admin/merchants/pending-approvals", badge: sourcePendingMerchants },
      { label: `Workspace ${primaryAccessibleProductLabel}`, href: primaryAccessibleProductHref, badge: 0 },
      { label: "Kelola Widget", href: "/admin/dashboard/widgets", badge: 0 },
      { label: "Lihat Report", href: "/admin/dashboard", badge: operationsReports.length },
    ]
    const alertCards = [
      {
        title: "SLA Warning",
        value: slaBreachCount.toLocaleString("id-ID"),
        delta: `${sourceMerchantOverdueCount} merchant | ${globalPackageOverdueCount} paket | ${globalBookingStalledCount} booking`,
        note: "Item yang sudah melewati SLA internal untuk approval, review, atau handoff booking.",
        href: canAccessPackageTour ? "/admin/packages" : "/admin/bookings",
        tone: slaBreachCount > 0 ? "border-orange-200 bg-orange-50/60 text-orange-600" : "border-emerald-200 bg-emerald-50/70 text-emerald-600",
      },
      {
        title: "API Error",
        value: affiliateApiErrorCount.toLocaleString("id-ID"),
        delta: `${affiliateFailureCount.toLocaleString("id-ID")} total failure affiliate`,
        note: "Indikasi error supplier/order pada jalur mitra eksternal yang perlu follow-up operasional.",
        href: "/admin/bookings",
        tone: affiliateApiErrorCount > 0 ? "border-rose-200 bg-rose-50/70 text-rose-600" : "border-emerald-200 bg-emerald-50/70 text-emerald-600",
      },
      {
        title: "Spike Anomaly",
        value: anomalySpikeDelta.toLocaleString("id-ID"),
        delta: `${anomalySpikeRate.toLocaleString("id-ID")}% dibanding 7 hari sebelumnya`,
        note: "Kenaikan sinyal anomaly dari approval, review, booking stalled, dan failed affiliate dibanding minggu sebelumnya.",
        href: "/admin/dashboard?workspace=alerts_overview",
        tone: anomalySpikeDelta > 0 ? "border-violet-200 bg-violet-50/70 text-violet-600" : "border-emerald-200 bg-emerald-50/70 text-emerald-600",
      },
    ]
    const productBookingCounts = globalPeriodBookings.reduce((map, booking) => {
      const productKey = classifyBookingProduct(booking)
      map.set(productKey, (map.get(productKey) || 0) + 1)
      return map
    }, new Map<OperationsProductKey, number>())
    const productRevenueTotals = globalPeriodCustomerTransactionRows.reduce((map, item) => {
      const productKey = item.bookingProductType
      map.set(productKey, (map.get(productKey) || 0) + item.receivedAmount)
      return map
    }, new Map<OperationsProductKey, number>())
    const affiliatePendingIssueCounts = globalPeriodAffiliateBookings.reduce((map, booking) => {
      if (!["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status))) {
        return map
      }
      const productKey = classifyBookingProduct(booking)
      map.set(productKey, (map.get(productKey) || 0) + 1)
      return map
    }, new Map<OperationsProductKey, number>())
    const productBookingTrendPoints = new Map<OperationsProductKey, string | null>(
      OPERATIONS_PRODUCT_SUMMARIES.map((product) => {
        const rows = buildRecentDayBuckets(operationsChartDays)
        const rowMap = new Map(rows.map((row) => [row.key, row]))
        globalPeriodBookings
          .filter((booking) => classifyBookingProduct(booking) === product.key)
          .forEach((booking) => {
            const dayKey = getDayKey(booking.created_at)
            const bucket = dayKey ? rowMap.get(dayKey) : null
            if (bucket) bucket.value += 1
          })
        return [product.key, buildSparklinePoints(rows)]
      }),
    )
    const productAnomalyCounts = new Map<OperationsProductKey, number>([
      ["package_tour", sourceMerchantOverdueCount + globalPackageOverdueCount + globalPeriodDeletionRequests.length + globalPeriodReviewRequests.length],
      ["flight", globalPeriodBookings.filter((booking) => !booking.package_id && ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1).length],
      ["hotel", 0],
      ["train", 0],
      ["bus", 0],
      ["sea", 0],
      ["cruise", 0],
    ])
    const productSlaCounts = new Map<OperationsProductKey, number>([
      ["package_tour", globalPackageOverdueCount + globalPeriodBookings.filter((booking) => Boolean(booking.package_id) && ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1).length],
      ["flight", globalPeriodBookings.filter((booking) => !booking.package_id && ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1).length],
      ["hotel", 0],
      ["train", 0],
      ["bus", 0],
      ["sea", 0],
      ["cruise", 0],
    ])
    const productPerformanceCards = accessibleProductSummaries
      .map((product) => {
        const bookingCount = productBookingCounts.get(product.key) || 0
        const revenueTotal = productRevenueTotals.get(product.key) || 0
        const isConnected = product.status !== "roadmap"
        const liveTrendPoints = isConnected ? productBookingTrendPoints.get(product.key) || null : null
        const statusMeta = getDashboardWidgetStatusMeta(product.status)
        const hasLiveRevenue = revenueTotal > 0
        const stateNote =
          product.status === "roadmap"
            ? "Modul belum live. Workspace tetap bisa dibuka untuk melihat struktur dan kesiapan produk."
            : liveTrendPoints
              ? `${bookingCount.toLocaleString("id-ID")} booking live tercatat pada ${operationsPeriod.label.toLowerCase()}.`
              : hasLiveRevenue
                ? `Revenue sudah tercatat, tetapi belum ada pola booking yang cukup untuk membentuk trend di ${operationsPeriod.label.toLowerCase()}.`
                : product.status === "partial"
                  ? "Workspace sudah aktif sebagian, tetapi belum ada aktivitas live yang cukup pada periode ini."
                  : "Belum ada aktivitas live pada periode ini."
        const ctaLabel =
          product.status === "roadmap"
            ? "Buka Workspace"
            : liveTrendPoints || hasLiveRevenue
              ? "Lihat Data"
              : "Buka Workspace"
        const issueCount =
          product.key === "package_tour"
            ? (productAnomalyCounts.get(product.key) ?? 0)
            : product.key === "flight"
              ? flightStalledBookingCount
              : 0
        const statusDescription =
          product.status === "roadmap"
            ? "Roadmap"
            : product.status === "partial"
              ? "Sebagian"
              : "Terhubung"
        const metricRows = product.status === "roadmap"
          ? [
              { label: "Status Modul", value: "Roadmap" },
              { label: "Booking Live", value: "Belum aktif" },
              { label: "Akses", value: "Workspace siap" },
            ]
          : product.key === "package_tour"
            ? [
                { label: "Pending Review", value: globalPendingPackages.toLocaleString("id-ID") },
                { label: "Anomali", value: (productAnomalyCounts.get(product.key) ?? 0).toLocaleString("id-ID") },
                { label: "SLA Melanggar", value: (productSlaCounts.get(product.key) ?? 0).toLocaleString("id-ID") },
              ]
            : [
                { label: "Queue Booking", value: flightStalledBookingCount.toLocaleString("id-ID") },
                { label: "Anomali", value: (productAnomalyCounts.get(product.key) ?? 0).toLocaleString("id-ID") },
                { label: "SLA Monitor", value: (productSlaCounts.get(product.key) ?? 0).toLocaleString("id-ID") },
              ]
        return {
          label: product.label,
          href: product.href,
          booking: isConnected ? bookingCount : null,
          revenue: isConnected ? (revenueTotal > 0 ? `Rp ${(revenueTotal / 1000000).toFixed(2)} M` : "Rp 0") : "-",
          revenueValue: revenueTotal,
          issueCount,
          statusDescription,
          growth: isConnected ? statusMeta.label : "Roadmap",
          connected: isConnected,
          tone: product.tone,
          bg: product.bg,
          icon: product.icon,
          sparkColor: product.sparkColor,
          sparkPoints: liveTrendPoints,
          hasLiveTrend: Boolean(liveTrendPoints),
          stateNote,
          ctaLabel,
          metricRows,
        }
      })
      .filter((product) => operationsProduct === "all" || getProductFilterFromLabel(product.label) === operationsProduct)
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
    const internalOperationalIssueItems = globalPeriodInternalBookings
      .filter((booking) =>
        [
          "failed",
          "cancel_requested",
          "refund_requested",
          "cancelled",
          "refunded",
          "awaiting_admin_handoff",
          "finance_review",
        ].includes(normalizeStatus(booking.booking_status)),
      )
      .slice(0, 6)
      .map((booking) => {
        const bookingStatus = normalizeStatus(booking.booking_status)
        const issueLabel =
          bookingStatus === "failed"
            ? "Booking failed"
            : bookingStatus === "refund_requested"
              ? "Refund requested"
              : bookingStatus === "cancel_requested"
                ? "Cancel requested"
                : bookingStatus === "cancelled"
                  ? "Cancelled"
                  : bookingStatus === "refunded"
                    ? "Refunded"
                    : bookingStatus === "finance_review"
                      ? "Finance review"
                      : "Admin handoff"
        return {
          id: booking.id,
          product: getOperationsProductLabel(classifyBookingProduct(booking)),
          supplier: "Internal RedFeng",
          issue: issueLabel,
          time: formatDateTime(booking.created_at),
          rawCreatedAt: booking.created_at || "",
          href: "/admin/bookings",
        }
      })
    const affiliateOperationalIssueItems = globalPeriodAffiliateBookings
      .filter((booking) =>
        [
          "failed",
          "cancel_requested",
          "refund_requested",
          "cancelled",
          "refunded",
          "awaiting_admin_handoff",
          "finance_review",
        ].includes(normalizeStatus(booking.supplier_order_status)) ||
        ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
      )
      .slice(0, 6)
      .map((booking) => {
        const supplier = booking.supplier_id ? supplierMap.get(booking.supplier_id) : null
        const supplierStatus = normalizeStatus(booking.supplier_order_status)
        const bookingStatus = normalizeStatus(booking.booking_status)
        const issueLabel =
          supplierStatus === "failed"
            ? "Supplier failed"
            : supplierStatus === "refund_requested"
              ? "Refund requested"
              : supplierStatus === "cancel_requested"
                ? "Cancel requested"
                : supplierStatus === "cancelled"
                  ? "Cancelled"
                  : supplierStatus === "refunded"
                    ? "Refunded"
                    : bookingStatus === "finance_review"
                      ? "Finance review"
                      : "Admin handoff"
        return {
          id: booking.id,
          product: getOperationsProductLabel(classifyBookingProduct(booking)),
          supplier: getMaskedSupplierLabel(supplier),
          issue: issueLabel,
          time: formatDateTime(booking.created_at),
          rawCreatedAt: booking.created_at || "",
          href: "/admin/bookings",
        }
      })
    const operationalIssueItems =
      operationsSource === "internal"
        ? internalOperationalIssueItems
        : operationsSource === "affiliate"
          ? affiliateOperationalIssueItems
          : [...internalOperationalIssueItems, ...affiliateOperationalIssueItems]
              .sort((a, b) => {
                if (a.rawCreatedAt === b.rawCreatedAt) return a.product.localeCompare(b.product, "id")
                return b.rawCreatedAt.localeCompare(a.rawCreatedAt, "id")
              })
              .slice(0, 6)
    const showKpiWorkspace = operationsWorkspace === "all" || operationsWorkspace === "kpi_overview"
    const showSourcePerformanceWorkspace = operationsWorkspace === "all" || operationsWorkspace === "source_performance"
    const showProductSummaryWorkspace = operationsWorkspace === "all" || operationsWorkspace === "product_performance"
    const showOperationalWorkspace =
      operationsWorkspace === "all" || operationsWorkspace === "operational_tasks" || operationsWorkspace === "package_review"
    const showBookingWorkspace = operationsWorkspace === "all" || operationsWorkspace === "booking_center"
    const showAlertWorkspace = operationsWorkspace === "all" || operationsWorkspace === "alerts_overview" || operationsWorkspace === "anomalies"
    const showQuickActionsWorkspace = operationsWorkspace === "all" || operationsWorkspace === "quick_actions"
    const showKpiOverviewWidget = enabledOperationsWidgetKeys.has("kpi_overview")
    const showSourcePerformanceWidget = enabledOperationsWidgetKeys.has("source_performance")
    const showProductPerformanceWidget = enabledOperationsWidgetKeys.has("product_performance")
    const showOperationalTasksWidget = enabledOperationsWidgetKeys.has("operational_tasks")
    const showBookingTrendsWidget = enabledOperationsWidgetKeys.has("booking_trends")
    const showAlertsOverviewWidget = enabledOperationsWidgetKeys.has("alerts_overview")
    const showQuickActionsWidget = enabledOperationsWidgetKeys.has("quick_actions")
    const hasAnyDashboardWidget =
      showKpiOverviewWidget ||
      showSourcePerformanceWidget ||
      showProductPerformanceWidget ||
      showOperationalTasksWidget ||
      showBookingTrendsWidget ||
      showAlertsOverviewWidget ||
      showQuickActionsWidget
    const primaryProductOverviewHref = productPerformanceCards[0]?.href || "/admin/dashboard/widgets"
    const selectedTrendProductKeys = productPerformanceCards
      .map((product) => getProductFilterFromLabel(product.label))
      .filter((key): key is OperationsProductKey => key !== "all")
    const bookingTrendSeries = selectedTrendProductKeys.map((productKey) => {
      const rows = buildRecentDayBuckets(operationsChartDays)
      const rowMap = new Map(rows.map((row) => [row.key, row]))
      periodBookings
        .filter((booking) => classifyBookingProduct(booking) === productKey)
        .forEach((booking) => {
          const dayKey = getDayKey(booking.created_at)
          const bucket = dayKey ? rowMap.get(dayKey) : null
          if (bucket) bucket.value += 1
        })
      const productMeta = OPERATIONS_PRODUCT_SUMMARIES.find((product) => product.key === productKey)
      return {
        label: getOperationsProductLabel(productKey),
        values: rows.map((row) => row.value),
        color: productMeta?.sparkColor || "#2563eb",
      }
    })
    const revenueTrendSeries = selectedTrendProductKeys.map((productKey) => {
      const rows = buildRecentDayBuckets(operationsChartDays)
      const rowMap = new Map(rows.map((row) => [row.key, row]))
      periodCustomerTransactionRows
        .filter((transaction) => transaction.bookingProductType === productKey)
        .forEach((transaction) => {
          const dayKey = getDayKey(transaction.createdAt)
          const bucket = dayKey ? rowMap.get(dayKey) : null
          if (bucket) bucket.value += transaction.receivedAmount
        })
      const productMeta = OPERATIONS_PRODUCT_SUMMARIES.find((product) => product.key === productKey)
      return {
        label: getOperationsProductLabel(productKey),
        values: rows.map((row) => row.value),
        color: productMeta?.sparkColor || "#2563eb",
      }
    })
    const bookingTrendHasData = bookingTrendSeries.some((series) => series.values.some((value) => value > 0))
    const revenueTrendHasData = revenueTrendSeries.some((series) => series.values.some((value) => value > 0))
    const bookingSparkline = buildSparklinePoints(bookingTrendRows.map((row) => ({ value: row.value })), 100, 28)
    const revenueSparkline = buildSparklinePoints(revenueTrendRows.map((row) => ({ value: row.value })), 100, 28)
    const comparisonWindowStart =
      operationsPeriod.days && operationsPeriodStart
        ? new Date(operationsPeriodStart.getTime() - operationsPeriod.days * 24 * 60 * 60 * 1000)
        : null
    const previousGlobalBookings =
      comparisonWindowStart && operationsPeriodStart
        ? bookings.filter((booking) => isWithinDateRange(booking.created_at, comparisonWindowStart, operationsPeriodStart))
        : []
    const previousGlobalTransactions =
      comparisonWindowStart && operationsPeriodStart
        ? customerTransactionRows.filter((transaction) => isWithinDateRange(transaction.createdAt, comparisonWindowStart, operationsPeriodStart))
        : []
    const previousBookingCount = previousGlobalBookings.length
    const previousRevenueTotal = previousGlobalTransactions.reduce((sum, item) => sum + item.receivedAmount, 0)
    const formatTrendDelta = (current: number, previous: number, suffix = "vs periode sebelumnya") => {
      if (!operationsPeriod.days) return "Tanpa pembanding"
      if (previous <= 0) {
        return current > 0 ? `+100% ${suffix}` : `0% ${suffix}`
      }
      const change = ((current - previous) / previous) * 100
      const sign = change > 0 ? "+" : ""
      return `${sign}${change.toFixed(1)}% ${suffix}`
    }
    const bookingDeltaLabel = formatTrendDelta(globalPeriodBookings.length, previousBookingCount)
    const revenueDeltaLabel = formatTrendDelta(globalRevenueTotal, previousRevenueTotal)
    const greetingLabel = currentProfile?.role === "operations_manager" ? "Manager Operasional" : getRoleLabel(currentProfile?.role)
    const merchantNearDueCount = pendingMerchantsData.filter((merchant) => daysSince(merchant.created_at) === 2).length
    const packageNearDueCount = periodPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) === 2).length
    const internalBookingNearDueCount = periodBookings.filter(
      (booking) =>
        classifyBookingSource(booking) === "internal" &&
        ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) &&
        daysSince(booking.created_at) === 0,
    ).length
    const affiliateBookingNearDueCount = periodBookings.filter(
      (booking) =>
        classifyBookingSource(booking) === "affiliate" &&
        ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) &&
        daysSince(booking.created_at) === 0,
    ).length
    const bookingNearDueCount = internalBookingNearDueCount + affiliateBookingNearDueCount
    const slaNearDueCount = merchantNearDueCount + packageNearDueCount + bookingNearDueCount
    const slaOnTimeCount = Math.max(slaTrackedItemCount - slaBreachCount - slaNearDueCount, 0)
    const internalSlaComplianceRate =
      internalSlaTrackedCount > 0 ? Math.max(0, Math.round(((internalSlaTrackedCount - internalSlaBreachCount) / internalSlaTrackedCount) * 1000) / 10) : 100
    const affiliateSlaComplianceRate =
      affiliateSlaTrackedCount > 0 ? Math.max(0, Math.round(((affiliateSlaTrackedCount - affiliateSlaBreachCount) / affiliateSlaTrackedCount) * 1000) / 10) : 100
    const severityRows = [
      { label: "High", value: recentAnomalies.filter((item) => item.severity === "High").length, tone: "bg-rose-500" },
      { label: "Medium", value: recentAnomalies.filter((item) => item.severity === "Medium").length, tone: "bg-amber-500" },
      { label: "Low", value: recentAnomalies.filter((item) => item.severity === "Low" || item.severity === "OK").length, tone: "bg-emerald-500" },
    ]
    const alertRailItems = [
      {
        title: "SLA Terlambat",
        detail: `${slaBreachCount} item operasional melewati SLA`,
        time: operationsPeriod.label,
        href: canAccessPackageTour ? "/admin/packages" : "/admin/bookings",
        tone: "border-rose-100 bg-rose-50/80",
        iconTone: "text-rose-500",
      },
      {
        title: "Anomali Aktif",
        detail: `${recentAnomalies.length} sinyal perlu dipantau`,
        time: "Realtime operasional",
        href: "/admin/merchants/anomalies",
        tone: "border-orange-100 bg-orange-50/80",
        iconTone: "text-orange-500",
      },
      {
        title: "API Error Affiliate",
        detail: `${affiliateApiErrorCount} error order mitra eksternal`,
        time: "Affiliate channel",
        href: "/admin/bookings",
        tone: "border-amber-100 bg-amber-50/80",
        iconTone: "text-amber-500",
      },
      {
        title: "Spike Anomaly",
        detail: anomalySpikeDelta > 0 ? `Naik ${anomalySpikeRate.toLocaleString("id-ID")}% dari minggu sebelumnya` : "Belum ada lonjakan anomaly",
        time: "7 hari terakhir",
        href: "/admin/dashboard?workspace=alerts_overview",
        tone: "border-violet-100 bg-violet-50/80",
        iconTone: "text-violet-500",
      },
      {
        title: "Data Valid",
        detail: affiliateFailureCount > 0 ? `${affiliateFailureCount} booking affiliate gagal perlu cek ulang` : "Tidak ada booking affiliate gagal pada periode ini",
        time: "Status saat ini",
        href: "/admin/bookings",
        tone: "border-sky-100 bg-sky-50/80",
        iconTone: "text-sky-500",
      },
    ]
    const bottomSummaryCards = [
      {
        label: "Merchant Paket Aktif",
        value: packageMerchantIds.length.toLocaleString("id-ID"),
        delta: `${sourcePendingMerchants.toLocaleString("id-ID")} approval pending`,
        tone: "text-sky-600",
        bg: "bg-sky-50",
      },
      {
        label: "Merchant Perlu Tindak",
        value: (sourceMerchantOverdueCount + globalPeriodDeletionRequests.length).toLocaleString("id-ID"),
        delta: `${sourceMerchantOverdueCount} SLA | ${globalPeriodDeletionRequests.length} deletion`,
        tone: "text-rose-600",
        bg: "bg-rose-50",
      },
      {
        label: "Affiliate Issue",
        value: affiliateIssueCount.toLocaleString("id-ID"),
        delta: `${affiliateApiErrorCount} API error`,
        tone: "text-orange-600",
        bg: "bg-orange-50",
      },
      {
        label: "Share Affiliate",
        value: `${affiliateBookingShare.toLocaleString("id-ID")}%`,
        delta: `${globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking`,
        tone: "text-violet-600",
        bg: "bg-violet-50",
      },
      {
        label: "SLA Aman",
        value: `${slaComplianceRate.toLocaleString("id-ID")}%`,
        delta: `${slaOnTimeCount.toLocaleString("id-ID")} item on time`,
        tone: "text-emerald-600",
        bg: "bg-emerald-50",
      },
    ]
    const alertSignalCount = slaBreachCount + affiliateApiErrorCount + calculatedRecentAnomalies.length
    const alertsToolbarParams = new URLSearchParams({
      period: operationsPeriod.value,
      product: operationsProduct,
      workspace: "alerts_overview",
      source: operationsSource,
    })
    if (params.view) {
      alertsToolbarParams.set("view", params.view)
    }
    const alertsWorkspaceHref = `/admin/dashboard?${alertsToolbarParams.toString()}`
    const operationalPriorityItems = [
      sourceMerchantOverdueCount > 0
        ? {
            title: "Approval merchant melewati SLA",
            value: sourceMerchantOverdueCount,
            note: "Perlu keputusan final agar queue onboarding tidak menumpuk.",
            href: "/admin/merchants/pending-approvals",
            tone: "border-rose-200 bg-rose-50/80 text-rose-600",
          }
        : null,
      globalPackageOverdueCount > 0
        ? {
            title: "Paket review overdue",
            value: globalPackageOverdueCount,
            note: "Ada paket pending yang sudah lewat SLA review 3 hari.",
            href: "/admin/packages",
            tone: "border-orange-200 bg-orange-50/80 text-orange-600",
          }
        : null,
      globalBookingStalledCount > 0
        ? {
            title: "Booking stalled di handoff",
            value: globalBookingStalledCount,
            note: "Booking siap finance perlu follow-up agar tidak tertahan lebih lama.",
            href: "/admin/bookings",
            tone: "border-amber-200 bg-amber-50/80 text-amber-600",
          }
        : null,
      affiliateApiErrorCount > 0
        ? {
            title: "Error channel affiliate",
            value: affiliateApiErrorCount,
            note: "Status order penyedia eksternal perlu dicek ulang oleh tim operasional.",
            href: "/admin/bookings",
            tone: "border-violet-200 bg-violet-50/80 text-violet-600",
          }
        : null,
      slaNearDueCount > 0
        ? {
            title: "Queue mendekati SLA",
            value: slaNearDueCount,
            note: "Item ini belum breach, tapi perlu diprioritaskan di shift berjalan.",
            href: alertsWorkspaceHref,
            tone: "border-sky-200 bg-sky-50/80 text-sky-600",
          }
        : null,
    ].filter(
      (
        item,
      ): item is {
        title: string
        value: number
        note: string
        href: string
        tone: string
      } => Boolean(item),
    )
    const createOperationsDashboardHref = (overrides?: {
      workspace?: string
      product?: string
      source?: "all" | "internal" | "affiliate"
    }) => {
      const nextParams = new URLSearchParams()
      nextParams.set("period", operationsPeriod.value)
      nextParams.set("product", overrides?.product ?? operationsProduct)
      nextParams.set("workspace", overrides?.workspace ?? operationsWorkspace)
      nextParams.set("source", overrides?.source ?? operationsSource)
      if (params.view) nextParams.set("view", params.view)
      return `/admin/dashboard?${nextParams.toString()}`
    }
    const topOperationalPriority = operationalPriorityItems[0] || null
    const greetingPrefix = getGreetingByJakartaTime()
    const currentJakartaDateTimeLabel = getCurrentJakartaDateTimeLabel()
    const operationsSourceLabel =
      operationsSource === "internal" ? "Internal" : operationsSource === "affiliate" ? "Affiliate" : "Semua"
    const pendingIssueTitle = operationsSource === "all" ? "Pending Issue (Semua)" : `Pending Issue (${operationsSourceLabel})`
    const slaTitle = operationsSource === "all" ? "SLA Compliance" : `SLA Compliance (${operationsSourceLabel})`
    const activeAnomalyTitle = operationsSource === "all" ? "Anomali Aktif" : `Anomali Aktif (${operationsSourceLabel})`
    const failureRateTitle = operationsSource === "all" ? "Failure Rate" : `Failure Rate (${operationsSourceLabel})`
    const productPerformanceTitle = operationsSource === "all" ? "Performa per Kategori" : `Performa per Kategori (${operationsSourceLabel})`
    const bookingTrendTitle = operationsSource === "all" ? "Trend Booking" : `Trend Booking (${operationsSourceLabel})`
    const revenueTrendTitle = operationsSource === "all" ? "Trend Revenue" : `Trend Revenue (${operationsSourceLabel})`
    const alertsOverviewTitle = operationsSource === "all" ? "Alert & Notifikasi" : `Alert & Notifikasi (${operationsSourceLabel})`
    const bookingIssueTitle = operationsSource === "all" ? "Booking Bermasalah" : `Booking Bermasalah (${operationsSourceLabel})`
    const recentAnomalyTitle = operationsSource === "all" ? "Anomali Terbaru" : `Anomali Terbaru (${operationsSourceLabel})`
    const pendingIssueRows = [
      {
        label: "Approval Merchant",
        source: "Internal",
        value: sourcePendingMerchants,
        href: "/admin/merchants/pending-approvals",
      },
      {
        label: "Paket Wisata",
        source: "Internal",
        value: globalPendingPackages,
        href: "/admin/packages",
      },
      ...accessibleProductSummaries
        .filter((product) => product.key !== "package_tour")
        .map((product) => ({
          label: product.label,
          source: "Affiliate",
          value: affiliatePendingIssueCounts.get(product.key) || 0,
          href: product.href,
        })),
    ]
      .filter((item) => item.value > 0)
      .sort((a, b) => {
        if (a.source !== b.source) return a.source === "Internal" ? -1 : 1
        if (b.value !== a.value) return b.value - a.value
        return a.label.localeCompare(b.label, "id")
      })
    const showSplitKpiStory = showKpiWorkspace && showKpiOverviewWidget && operationsWorkspace === "all"
    const showCompactKpiGrid = showKpiWorkspace && showKpiOverviewWidget && operationsWorkspace !== "all"
    const emptyOperationalIssueItem =
      operationsSource === "internal"
        ? { id: "empty-internal-ops", product: "-", supplier: "Internal RedFeng", issue: "Belum ada issue internal", time: "Saat ini", rawCreatedAt: "", href: "/admin/bookings" }
        : operationsSource === "affiliate"
          ? { id: "empty-affiliate-ops", product: "-", supplier: "Mitra Eksternal", issue: "Belum ada issue mitra", time: "Saat ini", rawCreatedAt: "", href: "/admin/bookings" }
          : { id: "empty-all-ops", product: "-", supplier: "Semua Channel", issue: "Belum ada issue booking", time: "Saat ini", rawCreatedAt: "", href: "/admin/bookings" }

    return (
      <main className="min-h-screen min-w-0 w-full bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="w-full space-y-7">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="max-w-[760px]">
              <h1 className="text-[1.72rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[1.95rem]">
                {greetingPrefix}, {greetingLabel}!
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">
                {currentJakartaDateTimeLabel} WIB
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-end">
              <form className="flex flex-wrap items-center gap-3 xl:flex-nowrap xl:justify-end">
                {params.view ? <input type="hidden" name="view" value={params.view} /> : null}
                <input type="hidden" name="source" value={operationsSource} />
                <label className="inline-flex h-11 min-w-[208px] items-center gap-2 rounded-[14px] border border-[#e9eef6] bg-white px-4 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                  <DashboardGlyph kind="booking" className="h-4 w-4 text-slate-400" />
                  <select name="period" defaultValue={operationsPeriod.value} className="w-full bg-transparent font-medium outline-none">
                    <option value="7d">7 hari terakhir</option>
                    <option value="30d">30 hari terakhir</option>
                    <option value="90d">90 hari terakhir</option>
                    <option value="all">Semua waktu</option>
                  </select>
                </label>
                <label className="inline-flex h-11 min-w-[160px] items-center gap-2 rounded-[14px] border border-[#e9eef6] bg-white px-4 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                  <select name="product" defaultValue={operationsProduct} className="w-full bg-transparent font-medium outline-none">
                    <option value="all">Semua Produk</option>
                    {accessibleProductTypes.includes("package_tour") ? <option value="package_tour">Paket Wisata</option> : null}
                    {accessibleProductTypes.includes("flight") ? <option value="flight">Pesawat</option> : null}
                    {accessibleProductTypes.includes("hotel") ? <option value="hotel">Hotel</option> : null}
                    {accessibleProductTypes.includes("train") ? <option value="train">Kereta Api</option> : null}
                    {accessibleProductTypes.includes("bus") ? <option value="bus">Bus & Travel</option> : null}
                    {accessibleProductTypes.includes("sea") ? <option value="sea">Kapal Laut</option> : null}
                    {accessibleProductTypes.includes("cruise") ? <option value="cruise">Kapal Pesiar</option> : null}
                  </select>
                </label>
                <label className="inline-flex h-11 min-w-[174px] items-center gap-2 rounded-[14px] border border-[#e9eef6] bg-white px-4 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                  <select name="workspace" defaultValue={operationsWorkspace} className="w-full bg-transparent font-medium outline-none">
                    <option value="all">Semua Workspace</option>
                    <option value="kpi_overview">KPI Utama</option>
                    <option value="source_performance">Source Performance</option>
                    <option value="product_performance">Per Kategori</option>
                    <option value="booking_center">Trend</option>
                    <option value="operational_tasks">Operational Task</option>
                    <option value="alerts_overview">Alert & Notifikasi</option>
                    <option value="quick_actions">Quick Actions</option>
                  </select>
                </label>
                <button className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#f97316] px-5 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(249,115,22,0.22)] transition hover:bg-[#ea580c]">
                  Terapkan
                </button>
              </form>
              <div className="inline-flex h-11 items-center rounded-[14px] border border-[#e9eef6] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                {([
                  { key: "all", label: "All" },
                  { key: "internal", label: "Internal" },
                  { key: "affiliate", label: "Affiliate" },
                ] as const).map((item) => (
                  <Link
                    key={item.key}
                    href={createOperationsDashboardHref({ source: item.key })}
                    className={`inline-flex h-9 items-center justify-center rounded-[10px] px-3 text-sm font-semibold transition ${
                      operationsSource === item.key ? "bg-[#fff7f1] text-orange-600" : "text-slate-500 hover:text-orange-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <AdminDashboardToolbarActions alertsCount={alertSignalCount} alertsHref={alertsWorkspaceHref} />
            </div>
          </section>

          {!hasAnyDashboardWidget ? (
            <section className="rounded-[28px] border border-dashed border-orange-200 bg-white px-6 py-14 text-center shadow-[0_20px_45px_rgba(15,23,42,0.04)]">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-lg font-black text-orange-600">W</span>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Dashboard belum memiliki widget aktif</h2>
              <Link href="/admin/dashboard/widgets" className="mt-6 inline-flex rounded-[14px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Kelola Widget
              </Link>
            </section>
          ) : null}

          {showSplitKpiStory ? (
            <>
              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <DashboardGlyph kind="booking" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">Total Booking</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{globalPeriodBookings.length.toLocaleString("id-ID")}</p>
                <p className={`mt-1 text-[12px] font-semibold ${bookingDeltaLabel.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{bookingDeltaLabel}</p>
                <div className="mt-4 space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Internal</span>
                    <span className="font-semibold text-slate-900">{globalPeriodInternalBookings.length.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Affiliate</span>
                    <span className="font-semibold text-slate-900">{globalPeriodAffiliateBookings.length.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <TinySparkline points={bookingSparkline} stroke="#2563eb" />
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <DashboardGlyph kind="revenue" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">Total Revenue (GMV)</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{formatCompactMoney(globalRevenueTotal)}</p>
                <p className={`mt-1 text-[12px] font-semibold ${revenueDeltaLabel.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{revenueDeltaLabel}</p>
                <div className="mt-4 space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Internal</span>
                    <span className="font-semibold text-slate-900">{formatMoney(globalInternalRevenueTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Affiliate</span>
                    <span className="font-semibold text-slate-900">{formatMoney(globalAffiliateRevenueTotal)}</span>
                  </div>
                </div>
                <TinySparkline points={revenueSparkline} stroke="#10b981" />
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <DashboardGlyph kind="booking" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">Source Mix</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{internalBookingShare.toLocaleString("id-ID")}%</p>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">internal booking share</p>
                <div className="mt-4 space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Booking</span>
                    <span className="font-semibold text-slate-900">{internalBookingShare}% internal | {affiliateBookingShare}% affiliate</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Revenue</span>
                    <span className="font-semibold text-slate-900">{internalRevenueShare}% internal | {affiliateRevenueShare}% affiliate</span>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef2f7]">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(Math.max(internalBookingShare, 0), 100)}%` }} />
                </div>
              </article>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <DashboardGlyph kind="issue" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{pendingIssueTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{totalPendingIssueCount.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[12px] font-semibold text-rose-500">{internalPendingIssueCount} internal | {affiliateIssueCount} affiliate</p>
                <div className="mt-5 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="space-y-2.5 text-sm">
                  {pendingIssueRows.length > 0 ? pendingIssueRows.map((item) => (
                    <Link
                      key={`${item.label}-${item.source}`}
                      href={item.href}
                      className="block rounded-[12px] px-2 py-1.5 text-slate-600 transition hover:bg-white hover:text-orange-600"
                    >
                      <span className="block truncate">
                        <span className="text-slate-400">- </span>
                        <span>{item.label}</span>
                        <span className="text-slate-500"> ({item.source})</span>
                        <span className="text-slate-400">: </span>
                        <span className="font-semibold text-slate-900">{item.value}</span>
                      </span>
                    </Link>
                  )) : (
                    <div className="rounded-[12px] px-2 py-1.5 text-[12px] text-slate-400">- Tidak ada issue aktif</div>
                  )}
                  </div>
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <DashboardGlyph kind="sla" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{slaTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{slaComplianceRate.toLocaleString("id-ID")}%</p>
                <p className={`mt-1 text-[12px] font-semibold ${slaComplianceRate >= 90 ? "text-emerald-600" : "text-rose-500"}`}>
                  {slaBreachCount.toLocaleString("id-ID")} breach dari {slaTrackedItemCount.toLocaleString("id-ID")} item operasional
                </p>
                <div className="mt-5 flex flex-col items-center gap-4">
                  <div className="flex h-[124px] w-[124px] items-center justify-center rounded-full" style={{ background: `conic-gradient(#22c55e 0% ${slaTrackedItemCount > 0 ? (slaOnTimeCount / slaTrackedItemCount) * 100 : 100}%, #fb923c ${slaTrackedItemCount > 0 ? (slaOnTimeCount / slaTrackedItemCount) * 100 : 100}% ${slaTrackedItemCount > 0 ? ((slaOnTimeCount + slaNearDueCount) / slaTrackedItemCount) * 100 : 100}%, #ef4444 ${slaTrackedItemCount > 0 ? ((slaOnTimeCount + slaNearDueCount) / slaTrackedItemCount) * 100 : 100}% 100%)` }}>
                    <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-white">
                      <p className="text-[2rem] font-semibold text-slate-950">{slaComplianceRate.toLocaleString("id-ID")}%</p>
                    </div>
                  </div>
                  <div className="w-full max-w-[210px] space-y-2.5">
                    {[
                      { label: "On Time", value: slaOnTimeCount, tone: "bg-emerald-500" },
                      { label: "Mendekati", value: slaNearDueCount, tone: "bg-orange-400" },
                      { label: "Terlambat", value: slaBreachCount, tone: "bg-rose-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />{item.label}</span>
                        <span className="shrink-0 font-semibold text-slate-900">{slaTrackedItemCount > 0 ? Math.round((item.value / slaTrackedItemCount) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Internal SLA</span>
                      <span className="text-right font-semibold text-slate-900">
                        {internalSlaComplianceRate.toLocaleString("id-ID")}% ({internalSlaBreachCount}/{internalSlaTrackedCount || 0})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Affiliate SLA</span>
                      <span className="text-right font-semibold text-slate-900">
                        {affiliateSlaComplianceRate.toLocaleString("id-ID")}% ({affiliateSlaBreachCount}/{affiliateSlaTrackedCount || 0})
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <DashboardGlyph kind="anomaly" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{activeAnomalyTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{recentAnomalies.length}</p>
                <p className="mt-1 text-[12px] font-semibold text-rose-500">{severityRows[0].value} high | {severityRows[1].value} medium | {severityRows[2].value} low</p>
                <div className="mt-5 space-y-3 text-sm">
                  {severityRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />{row.label}</span>
                      <span className="font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <DashboardGlyph kind="failure" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{failureRateTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{totalFailureRate.toLocaleString("id-ID")}%</p>
                <p className={`mt-1 text-[12px] font-semibold ${totalFailureRate <= 3 ? "text-emerald-600" : "text-rose-500"}`}>
                  {totalFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodBookings.length.toLocaleString("id-ID")} total booking
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Internal</span>
                      <span className="font-semibold text-slate-900">
                        {internalFailureRate.toLocaleString("id-ID")}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {internalFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodInternalBookings.length.toLocaleString("id-ID")} booking
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Affiliate</span>
                      <span className="font-semibold text-slate-900">
                        {affiliateFailureRate.toLocaleString("id-ID")}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {affiliateFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking
                    </p>
                  </div>
                </div>
              </article>
            </section>
            </>
          ) : showCompactKpiGrid ? (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <DashboardGlyph kind="booking" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">Total Booking</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{globalPeriodBookings.length.toLocaleString("id-ID")}</p>
                <p className={`mt-1 text-[12px] font-semibold ${bookingDeltaLabel.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{bookingDeltaLabel}</p>
                <div className="mt-4 space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Internal</span>
                    <span className="font-semibold text-slate-900">{globalPeriodInternalBookings.length.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Affiliate</span>
                    <span className="font-semibold text-slate-900">{globalPeriodAffiliateBookings.length.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <TinySparkline points={bookingSparkline} stroke="#2563eb" />
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <DashboardGlyph kind="revenue" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">Total Revenue (GMV)</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{formatCompactMoney(globalRevenueTotal)}</p>
                <p className={`mt-1 text-[12px] font-semibold ${revenueDeltaLabel.startsWith("-") ? "text-rose-500" : "text-emerald-600"}`}>{revenueDeltaLabel}</p>
                <div className="mt-4 space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Internal</span>
                    <span className="font-semibold text-slate-900">{formatMoney(globalInternalRevenueTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500">Affiliate</span>
                    <span className="font-semibold text-slate-900">{formatMoney(globalAffiliateRevenueTotal)}</span>
                  </div>
                </div>
                <TinySparkline points={revenueSparkline} stroke="#10b981" />
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <DashboardGlyph kind="issue" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{pendingIssueTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{totalPendingIssueCount.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[12px] font-semibold text-rose-500">{internalPendingIssueCount} internal | {affiliateIssueCount} affiliate</p>
                <div className="mt-5 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                  <div className="space-y-2.5 text-sm">
                  {pendingIssueRows.length > 0 ? pendingIssueRows.map((item) => (
                    <Link
                      key={`${item.label}-${item.source}`}
                      href={item.href}
                      className="block rounded-[12px] px-2 py-1.5 text-slate-600 transition hover:bg-white hover:text-orange-600"
                    >
                      <span className="block truncate">
                        <span className="text-slate-400">- </span>
                        <span>{item.label}</span>
                        <span className="text-slate-500"> ({item.source})</span>
                        <span className="text-slate-400">: </span>
                        <span className="font-semibold text-slate-900">{item.value}</span>
                      </span>
                    </Link>
                  )) : (
                    <div className="rounded-[12px] px-2 py-1.5 text-[12px] text-slate-400">- Tidak ada issue aktif</div>
                  )}
                  </div>
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <DashboardGlyph kind="sla" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{slaTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{slaComplianceRate.toLocaleString("id-ID")}%</p>
                <p className={`mt-1 text-[12px] font-semibold ${slaComplianceRate >= 90 ? "text-emerald-600" : "text-rose-500"}`}>
                  {slaBreachCount.toLocaleString("id-ID")} breach dari {slaTrackedItemCount.toLocaleString("id-ID")} item operasional
                </p>
                <div className="mt-5 flex flex-col items-center gap-4">
                  <div className="flex h-[124px] w-[124px] items-center justify-center rounded-full" style={{ background: `conic-gradient(#22c55e 0% ${slaTrackedItemCount > 0 ? (slaOnTimeCount / slaTrackedItemCount) * 100 : 100}%, #fb923c ${slaTrackedItemCount > 0 ? (slaOnTimeCount / slaTrackedItemCount) * 100 : 100}% ${slaTrackedItemCount > 0 ? ((slaOnTimeCount + slaNearDueCount) / slaTrackedItemCount) * 100 : 100}%, #ef4444 ${slaTrackedItemCount > 0 ? ((slaOnTimeCount + slaNearDueCount) / slaTrackedItemCount) * 100 : 100}% 100%)` }}>
                    <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-white">
                      <p className="text-[2rem] font-semibold text-slate-950">{slaComplianceRate.toLocaleString("id-ID")}%</p>
                    </div>
                  </div>
                  <div className="w-full max-w-[210px] space-y-2.5">
                    {[
                      { label: "On Time", value: slaOnTimeCount, tone: "bg-emerald-500" },
                      { label: "Mendekati", value: slaNearDueCount, tone: "bg-orange-400" },
                      { label: "Terlambat", value: slaBreachCount, tone: "bg-rose-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} />{item.label}</span>
                        <span className="shrink-0 font-semibold text-slate-900">{slaTrackedItemCount > 0 ? Math.round((item.value / slaTrackedItemCount) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full space-y-2 rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Internal SLA</span>
                      <span className="text-right font-semibold text-slate-900">
                        {internalSlaComplianceRate.toLocaleString("id-ID")}% ({internalSlaBreachCount}/{internalSlaTrackedCount || 0})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Affiliate SLA</span>
                      <span className="text-right font-semibold text-slate-900">
                        {affiliateSlaComplianceRate.toLocaleString("id-ID")}% ({affiliateSlaBreachCount}/{affiliateSlaTrackedCount || 0})
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <DashboardGlyph kind="anomaly" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{activeAnomalyTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{recentAnomalies.length}</p>
                <p className="mt-1 text-[12px] font-semibold text-rose-500">{severityRows[0].value} high | {severityRows[1].value} medium | {severityRows[2].value} low</p>
                <div className="mt-5 space-y-3 text-sm">
                  {severityRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />{row.label}</span>
                      <span className="font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="min-h-[224px] rounded-[24px] border border-[#e9eef6] bg-white p-6 shadow-[0_18px_36px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <DashboardGlyph kind="failure" className="h-5 w-5" />
                  </span>
                  <p className="text-[15px] font-medium text-slate-700">{failureRateTitle}</p>
                </div>
                <p className="mt-5 text-[2.35rem] font-semibold tracking-[-0.06em] text-slate-950">{totalFailureRate.toLocaleString("id-ID")}%</p>
                <p className={`mt-1 text-[12px] font-semibold ${totalFailureRate <= 3 ? "text-emerald-600" : "text-rose-500"}`}>
                  {totalFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodBookings.length.toLocaleString("id-ID")} total booking
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Internal</span>
                      <span className="font-semibold text-slate-900">
                        {internalFailureRate.toLocaleString("id-ID")}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {internalFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodInternalBookings.length.toLocaleString("id-ID")} booking
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Affiliate</span>
                      <span className="font-semibold text-slate-900">
                        {affiliateFailureRate.toLocaleString("id-ID")}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {affiliateFailureCount.toLocaleString("id-ID")} gagal dari {globalPeriodAffiliateBookings.length.toLocaleString("id-ID")} booking
                    </p>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {showSourcePerformanceWorkspace && showSourcePerformanceWidget && operationsWorkspace === "source_performance" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              {sourcePerformanceCards.map((card) => (
                <div key={card.title} className="rounded-[22px] border border-[#e5eaf3] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{card.summary}</p>
                  <div className="mt-5 space-y-3">
                    {card.rows.map((row) => (
                      <div key={`${card.title}-${row.label}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-slate-600">{row.label}</span>
                          <span className="font-semibold text-slate-900">{row.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#eef2f7]">
                          <div className={`h-2 rounded-full ${row.tone}`} style={{ width: `${Math.min(Math.max(row.width, 0), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {showOperationalWorkspace && showOperationalTasksWidget ? (
            <section className="grid items-start gap-5 xl:grid-cols-[minmax(420px,1.18fr)_minmax(320px,1fr)_minmax(320px,1fr)]">
              {canAccessPackageTour ? (
                <section
                  data-dashboard-height-source="operational"
                  className="rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-950">Paket Menunggu Review</h2>
                    <Link href="/admin/packages" className="text-xs font-semibold text-[#2563eb]">Lihat semua</Link>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 border-b border-[#edf2f7] pb-3 text-xs font-medium text-slate-500">
                    {packageQueueRows.map((item) => (
                      <span key={item.label}>{item.label} ({item.value})</span>
                    ))}
                  </div>
                    <div className="mt-4 overflow-hidden rounded-[16px] border border-[#edf2f7]">
                      <div className="grid grid-cols-[minmax(92px,1fr)_minmax(140px,1.25fr)_76px_84px_56px] gap-3 bg-[#f8fafc] px-4 py-3 text-[11px] font-semibold text-slate-400">
                      <span>Merchant</span>
                      <span>Produk</span>
                      <span>Kategori</span>
                      <span>Diajukan</span>
                      <span>Aksi</span>
                    </div>
                    <div className="divide-y divide-[#edf2f7]">
                      {(reviewQueueItems.length > 0 ? reviewQueueItems : [{ merchant: "-", product: "Tidak ada paket menunggu review", type: "-", status: "-", time: "-", href: "/admin/packages" }]).map((item) => (
                        <Link key={`${item.product}-${item.time}`} href={item.href} className="grid grid-cols-[minmax(92px,1fr)_minmax(140px,1.25fr)_76px_84px_56px] gap-3 px-4 py-3.5 text-sm transition hover:bg-[#f8fbff]">
                          <span className="font-semibold text-slate-800">{item.merchant}</span>
                          <span className="text-slate-600">{item.product}</span>
                          <span><span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-600">{item.type}</span></span>
                          <span className="text-xs text-slate-500">{item.time}</span>
                          <span className="text-xs font-semibold text-orange-600">Review</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section
                data-dashboard-height-target="operational"
                className="flex flex-col overflow-hidden rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">{bookingIssueTitle}</h2>
                  <Link href="/admin/bookings" className="text-xs font-semibold text-[#2563eb]">Lihat semua</Link>
                </div>
                  <div className="mt-4 overflow-hidden rounded-[16px] border border-[#edf2f7]">
                    <div className="grid grid-cols-[minmax(88px,1fr)_88px_minmax(108px,1fr)_72px] gap-3 bg-[#f8fafc] px-4 py-3 text-[11px] font-semibold text-slate-400">
                    <span>Produk</span>
                    <span>Penyedia</span>
                    <span>Masalah</span>
                    <span>Waktu</span>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {(operationalIssueItems.length > 0
                      ? operationalIssueItems
                      : [emptyOperationalIssueItem]).map((item) => (
                      <Link key={item.id} href={item.href} className="grid grid-cols-[minmax(88px,1fr)_88px_minmax(108px,1fr)_72px] gap-3 px-4 py-3.5 text-sm transition hover:bg-[#f8fbff]">
                        <span className="font-semibold text-slate-800">{item.product}</span>
                        <span className="text-slate-600">{item.supplier}</span>
                        <span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.issue.startsWith("Belum ada issue") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                            {item.issue}
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">{item.time}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              <section
                data-dashboard-height-target="operational"
                className="flex flex-col overflow-hidden rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">{recentAnomalyTitle}</h2>
                  <Link href="/admin/merchants/anomalies" className="text-xs font-semibold text-[#2563eb]">Lihat semua</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentAnomalies.map((item) => (
                    <div key={`${item.title}-${item.source}-${item.time}`} className="rounded-[16px] border border-[#edf2f7] px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${item.tone}`}>
                          <DashboardGlyph kind="anomaly" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

            <AdminDashboardHeightSync />
            <section className="grid gap-5 xl:grid-cols-[minmax(420px,1.35fr)_minmax(280px,1fr)_minmax(280px,1fr)_280px] xl:items-start">
            {showProductSummaryWorkspace && showProductPerformanceWidget ? (
              <section
                data-dashboard-height-source="category"
                className="flex flex-col self-start rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-base font-semibold text-slate-950">
                      <span>{productPerformanceTitle}</span>
                      <span className="text-xs font-normal text-slate-400">({operationsPeriod.label})</span>
                    </h2>
                  </div>
                  <Link href={primaryProductOverviewHref} className="shrink-0 text-xs font-semibold text-[#2563eb]">Lihat semua</Link>
                </div>
                <div className="mt-4 overflow-hidden rounded-[18px] border border-[#edf2f7]">
                  <div className="grid grid-cols-[minmax(132px,1.55fr)_minmax(56px,0.58fr)_minmax(84px,0.8fr)_minmax(44px,0.42fr)_minmax(64px,0.55fr)] gap-2.5 bg-[#f8fafc] px-4 py-3 text-[11px] font-semibold text-slate-400">
                    <span>Kategori</span>
                    <span>Booking</span>
                    <span>Revenue</span>
                    <span>Issue</span>
                    <span>SLA</span>
                  </div>
                  <div className="divide-y divide-[#edf2f7]">
                    {productPerformanceCards.map((product) => (
                      <Link key={product.label} href={product.href} className="grid grid-cols-[minmax(132px,1.55fr)_minmax(56px,0.58fr)_minmax(84px,0.8fr)_minmax(44px,0.42fr)_minmax(64px,0.55fr)] gap-2.5 px-4 py-3 text-sm transition hover:bg-[#f8fbff]">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${product.bg} ${product.tone}`}>
                            <ProductMiniIcon kind={product.icon} className="h-4 w-4" />
                          </span>
                          <span className="truncate font-semibold text-slate-800">{product.label}</span>
                        </span>
                        <span className="font-semibold text-slate-900">{product.booking == null ? "-" : product.booking.toLocaleString("id-ID")}</span>
                        <span className="font-semibold text-slate-900">{product.revenue}</span>
                        <span className="font-semibold text-slate-700">{product.issueCount}</span>
                        <span className={`inline-flex h-fit rounded-full px-2 py-1 text-[11px] font-semibold ${product.issueCount > 0 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {product.connected ? `${Math.max(100 - product.issueCount * 3, 60)}%` : "-"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {showBookingWorkspace && showBookingTrendsWidget ? (
              <>
                <section
                  data-dashboard-height-target="category"
                  data-dashboard-height-mode="when-active"
                  data-dashboard-height-active={bookingTrendHasData ? "true" : "false"}
                  className="flex flex-col overflow-hidden rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-950">{bookingTrendTitle} <span className="text-xs font-normal text-slate-400">({operationsPeriod.label})</span></h2>
                    <Link href="/admin/bookings" className="text-xs font-semibold text-[#2563eb]">Lihat detail</Link>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                    {bookingTrendSeries.map((item) => (
                      <span key={item.label} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex-1">
                    <DashboardLineChart labels={bookingTrendRows.map((row) => row.label)} series={bookingTrendSeries} />
                  </div>
                </section>

                <section
                  data-dashboard-height-target="category"
                  data-dashboard-height-mode="when-active"
                  data-dashboard-height-active={revenueTrendHasData ? "true" : "false"}
                  className="flex flex-col overflow-hidden rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-950">{revenueTrendTitle} <span className="text-xs font-normal text-slate-400">({operationsPeriod.label})</span></h2>
                    <Link href="/admin/bookings" className="text-xs font-semibold text-[#2563eb]">Lihat detail</Link>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                    {revenueTrendSeries.map((item) => (
                      <span key={item.label} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex-1">
                    <DashboardLineChart labels={revenueTrendRows.map((row) => row.label)} series={revenueTrendSeries} valueFormatter={(value) => `${Math.round(value / 1000000)}M`} />
                  </div>
                </section>
              </>
            ) : null}

            {showAlertWorkspace && showAlertsOverviewWidget ? (
              <section
                data-dashboard-height-target="category"
                data-dashboard-height-mode="always"
                className="flex flex-col overflow-hidden rounded-[22px] border border-[#e9eef6] bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.035)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">{alertsOverviewTitle}</h2>
                  <Link href="/admin/dashboard?workspace=alerts_overview" className="text-xs font-semibold text-[#2563eb]">Lihat semua</Link>
                </div>
                  <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {alertRailItems.map((item) => (
                    <Link key={item.title} href={item.href} className={`block rounded-[16px] border p-3.5 transition hover:-translate-y-0.5 ${item.tone}`}>
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${item.iconTone}`}>
                          <DashboardGlyph kind="alert" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </section>

          {showAlertWorkspace && showAlertsOverviewWidget && operationsWorkspace === "alerts_overview" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              {alertCards.map((item) => (
                <Link key={item.title} href={item.href} className={`rounded-[22px] border p-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 ${item.tone}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.title}</p>
                  <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{item.value}</p>
                  <p className="mt-3 text-xs font-semibold">{item.delta}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
                </Link>
              ))}
            </section>
          ) : null}

            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_1.35fr]">
            {bottomSummaryCards.map((card) => (
              <article key={card.label} className="rounded-[20px] border border-[#e9eef6] bg-white px-5 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.03)]">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.bg} ${card.tone}`}>
                    <DashboardGlyph kind="booking" className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-slate-600">{card.label}</p>
                </div>
                <p className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
                <p className={`mt-1 text-xs font-semibold ${card.tone}`}>{card.delta}</p>
              </article>
            ))}
              <article className="rounded-[20px] border border-[#e9eef6] bg-[linear-gradient(135deg,#fffaf2,white)] px-5 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                      <DashboardGlyph kind="alert" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Prioritas Operasional</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full border border-[#f6dcb9] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                  {operationalPriorityItems.length > 0 ? `${operationalPriorityItems.length} fokus` : "Stabil"}
                </span>
              </div>
              {topOperationalPriority ? (
                <div className="mt-4 space-y-3">
                  <Link
                    href={topOperationalPriority.href}
                    className={`block rounded-[16px] border px-4 py-3 transition hover:-translate-y-0.5 ${topOperationalPriority.tone}`}
                  >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{topOperationalPriority.title}</p>
                        </div>
                        <span className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">
                          {topOperationalPriority.value.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </Link>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {operationalPriorityItems.slice(1, 3).map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={`rounded-[14px] border px-4 py-3 transition hover:-translate-y-0.5 ${item.tone}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Queue</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                          </div>
                          <span className="text-lg font-semibold text-slate-950">{item.value.toLocaleString("id-ID")}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-700">Queue utama terkendali</p>
                </div>
              )}
            </article>
          </section>

          {showQuickActionsWorkspace && showQuickActionsWidget && operationsWorkspace === "quick_actions" ? (
            <section className="rounded-[22px] border border-[#e5eaf3] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
              <h2 className="text-base font-semibold text-slate-950">Quick Actions Global</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {globalQuickActions.map((item) => (
                  <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-[16px] border border-[#edf2f7] bg-[#fbfdff] px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
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

  // PROTECTED-OPS-DASHBOARD-END

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
                Fokus ke pekerjaan hari ini: approval, review produk, dan booking yang perlu tindakan.
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
                  { title: "Review approval baru", value: pendingMerchants, href: "/admin/merchants/pending-approvals" },
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
                <p>1. Mulai dari approval dan paket yang paling lama pending.</p>
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
      { label: "Approval pending", value: pendingMerchants, tone: "bg-amber-400" },
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
                  Dashboard ini dirancang untuk operations manager agar cepat melihat antrean yang menumpuk, area yang mulai overdue, dan jalur tindak lanjut untuk approval, package, serta Booking Center.
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
                  { label: "Approval pending", tone: "bg-amber-400" },
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
                <p>1. Status antrean approval, paket, dan booking yang sedang berjalan.</p>
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
                    placeholder="Jelaskan kondisi approval pending, review paket, booking siap handoff, dan area backlog yang paling berat."
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
                    placeholder="Sebutkan approval, package, booking, atau isu sensitif yang perlu diketahui atau diputuskan superadmin."
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
    const formatDateRangeLabel = (date: Date) =>
      date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: JAKARTA_TIMEZONE,
      })
    const compareRangeEnd = operationsPeriodStart ? new Date(operationsPeriodStart) : null
    const compareRangeStart =
      compareRangeEnd && operationsPeriod.days
        ? new Date(compareRangeEnd.getTime() - operationsPeriod.days * 24 * 60 * 60 * 1000)
        : null
    const headerCompareLabel =
      compareRangeStart && compareRangeEnd
        ? `Perbandingan: ${formatDateRangeLabel(compareRangeStart)} - ${formatDateRangeLabel(new Date(compareRangeEnd.getTime() - 24 * 60 * 60 * 1000))}`
        : "Perbandingan: semua data historis"
    const describeGrowth = (current: number, previous: number) => {
      if (!operationsPeriod.days) {
        return { label: "Semua waktu", className: "text-slate-400" }
      }
      const rate = calculateGrowthRate(current, previous)
      const isPositive = rate >= 0
      return {
        label: `${isPositive ? "↑" : "↓"} ${Math.abs(rate).toFixed(1)}% vs kemarin`,
        className: isPositive ? "text-emerald-500" : "text-rose-500",
      }
    }
    const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]))
    const normalizeRegionText = (value: string | null | undefined) => normalizeStatus(value ?? null)
    const matchesProvinceGroup = (province: string, city: string, regionKey: typeof superadminRegion) => {
      if (regionKey === "bali") {
        return province.includes("bali") || city.includes("bali")
      }
      if (regionKey === "jawa") {
        return (
          province.includes("jakarta") ||
          province.includes("banten") ||
          province.includes("jawa barat") ||
          province.includes("jawa tengah") ||
          province.includes("yogyakarta") ||
          province.includes("jawa timur") ||
          city.includes("jakarta") ||
          city.includes("bandung") ||
          city.includes("surabaya") ||
          city.includes("yogyakarta")
        )
      }
      if (regionKey === "sumatera") {
        return (
          province.includes("aceh") ||
          province.includes("sumatera") ||
          province.includes("riau") ||
          province.includes("jambi") ||
          province.includes("bengkulu") ||
          province.includes("lampung") ||
          city.includes("medan") ||
          city.includes("padang") ||
          city.includes("palembang")
        )
      }
      if (regionKey === "kalimantan") {
        return province.includes("kalimantan") || city.includes("pontianak") || city.includes("balikpapan")
      }
      if (regionKey === "sulawesi") {
        return province.includes("sulawesi") || city.includes("makassar") || city.includes("manado")
      }
      if (regionKey === "nusa_tenggara") {
        return province.includes("nusa tenggara") || city.includes("lombok") || city.includes("labuan bajo")
      }
      return false
    }
    const isDomesticPackage = (pkg: DashboardPackageRow | null | undefined) => {
      const country = normalizeStatus(pkg?.country ?? null)
      const destinationCountryId = normalizeStatus(pkg?.destination_country_id ?? null)
      return !country || country === "indonesia" || destinationCountryId === "indonesia"
    }
    const matchesSelectedRegion = (packageId: string | null | undefined) => {
      if (superadminRegion === "all") return true
      if (!packageId) return false
      const pkg = packageMap.get(packageId)
      if (!pkg) return false
      const isDomestic = isDomesticPackage(pkg)
      if (superadminRegion === "indonesia") return isDomestic
      if (superadminRegion === "international") return !isDomestic
      if (!isDomestic) return false
      const province = normalizeRegionText(pkg.destination_province)
      const city = normalizeRegionText(pkg.city)
      return matchesProvinceGroup(province, city, superadminRegion)
    }
    const regionPackages = packages.filter((pkg) => matchesSelectedRegion(pkg.id))
    const isRegionScoped = superadminRegion !== "all"
    const regionFilterNote =
      superadminRegion === "all"
        ? "Semua data ikut terbaca."
        : "Filter region hanya menghitung package dan booking yang punya mapping destination valid."
    const regionPendingMerchants = isRegionScoped ? 0 : pendingMerchants
    const regionMerchantOverdueCount = isRegionScoped ? 0 : merchantOverdueCount
    const regionReviewRequests = isRegionScoped ? [] : reviewRequests
    const regionDeletionRequests = isRegionScoped ? [] : deletionRequests
    const superadminPeriodBookings = bookings.filter(
      (booking) => isWithinPeriod(booking.created_at, operationsPeriodStart) && matchesSelectedRegion(booking.package_id),
    )
    const superadminPreviousBookings =
      compareRangeStart && compareRangeEnd
        ? bookings.filter((booking) => isWithinDateRange(booking.created_at, compareRangeStart, compareRangeEnd) && matchesSelectedRegion(booking.package_id))
        : []
    const superadminPeriodTransactions = customerTransactionRows.filter((transaction) =>
      isWithinPeriod(transaction.createdAt, operationsPeriodStart) && matchesSelectedRegion(transaction.packageId),
    )
    const superadminPreviousTransactions =
      compareRangeStart && compareRangeEnd
        ? customerTransactionRows.filter((transaction) => isWithinDateRange(transaction.createdAt, compareRangeStart, compareRangeEnd) && matchesSelectedRegion(transaction.packageId))
        : []
    const superadminInternalBookings = superadminPeriodBookings.filter((booking) => classifyBookingSource(booking) === "internal")
    const superadminAffiliateBookings = superadminPeriodBookings.filter((booking) => classifyBookingSource(booking) === "affiliate")
    const superadminInternalTransactions = superadminPeriodTransactions.filter((transaction) => transaction.bookingSource === "internal")
    const superadminAffiliateTransactions = superadminPeriodTransactions.filter((transaction) => transaction.bookingSource === "affiliate")
    const totalBookingValue = superadminPeriodBookings.length
    const previousBookingValue = superadminPreviousBookings.length
    const totalRevenueValue = superadminPeriodTransactions.reduce((sum, transaction) => sum + transaction.receivedAmount, 0)
    const previousRevenueValue = superadminPreviousTransactions.reduce((sum, transaction) => sum + transaction.receivedAmount, 0)
    const totalCommissionValue = superadminPeriodTransactions.reduce((sum, transaction) => sum + transaction.customerAdminFeeCollected, 0)
    const previousCommissionValue = superadminPreviousTransactions.reduce((sum, transaction) => sum + transaction.customerAdminFeeCollected, 0)
    const internalCommissionValue = superadminInternalTransactions.reduce((sum, transaction) => sum + transaction.customerAdminFeeCollected, 0)
    const affiliateCommissionValue = superadminAffiliateTransactions.reduce((sum, transaction) => sum + transaction.customerAdminFeeCollected, 0)
    const totalAccountsValue = totalPlatformProfiles
    const internalAccountValue = adminProfiles.length + financeProfiles.length + 1
    const businessMixTotal = Math.max(totalBookingValue, 1)
    const affiliateShareValue = Math.round((superadminAffiliateBookings.length / businessMixTotal) * 100)
    const regionPendingPackages = regionPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
    const regionPackageOverdueCount = regionPackages.filter(
      (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
    ).length
    const regionFinanceReadyCount = superadminPeriodBookings.filter((booking) =>
      ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)),
    ).length
    const regionBookingStalledCount = superadminPeriodBookings.filter(
      (booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1,
    ).length
    const healthyWebVitalsCount = recentWebVitalEvents.filter((row) => row.rating !== "poor").length
    const poorWebVitalsCount = recentWebVitalEvents.filter((row) => row.rating === "poor").length
    const systemHealthRate =
      recentWebVitalEvents.length > 0 ? Math.round((healthyWebVitalsCount / recentWebVitalEvents.length) * 10000) / 100 : 100
    const pendingCriticalItems = [
      { label: "SLA Terlambat", value: regionMerchantOverdueCount + regionPackageOverdueCount + regionBookingStalledCount },
      { label: "Booking Gagal", value: superadminAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length },
      { label: "Review Sensitif", value: regionReviewRequests.length },
      { label: "Poor Vitals", value: poorWebVitalsCount },
    ].filter((item) => item.value > 0)
    const pendingCriticalValue = pendingCriticalItems.reduce((sum, item) => sum + item.value, 0)
    const alertItems = [
      {
        title: "SLA Terlambat",
        detail: `${regionMerchantOverdueCount + regionPackageOverdueCount + regionBookingStalledCount} antrean melewati SLA aktif`,
        level: "High",
        levelClassName: "bg-rose-50 text-rose-600",
        toneClassName: "border-rose-100 bg-rose-50/55",
        iconClassName: "bg-rose-50 text-rose-500",
        timeLabel: formatRelativeHours(recentAuditLogs[0]?.created_at || null),
        count: regionMerchantOverdueCount + regionPackageOverdueCount + regionBookingStalledCount,
      },
      {
        title: "Anomali Harga",
        detail: `${regionReviewRequests.length} review merchant sensitif menunggu keputusan`,
        level: "Medium",
        levelClassName: "bg-amber-50 text-amber-600",
        toneClassName: "border-amber-100 bg-amber-50/55",
        iconClassName: "bg-amber-50 text-amber-500",
        timeLabel: formatRelativeHours(regionReviewRequests[0]?.requested_at || null),
        count: regionReviewRequests.length,
      },
      {
        title: "API Error Affiliate",
        detail: `${superadminAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length} booking affiliate gagal sinkron`,
        level: "High",
        levelClassName: "bg-orange-50 text-orange-600",
        toneClassName: "border-orange-100 bg-orange-50/55",
        iconClassName: "bg-orange-50 text-orange-500",
        timeLabel: formatRelativeHours(superadminAffiliateBookings[0]?.created_at || null),
        count: superadminAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length,
      },
      {
        title: "Data Tidak Valid",
        detail: `${poorWebVitalsCount} sampel web vitals masuk kategori poor`,
        level: poorWebVitalsCount > 0 ? "Medium" : "Low",
        levelClassName: poorWebVitalsCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
        toneClassName: poorWebVitalsCount > 0 ? "border-amber-100 bg-amber-50/55" : "border-emerald-100 bg-emerald-50/55",
        iconClassName: poorWebVitalsCount > 0 ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500",
        timeLabel: formatRelativeHours(latestPerformanceSampleAt),
        count: poorWebVitalsCount,
      },
    ].filter((item) => item.count > 0)
    const recentActivityBuckets = buildRecentDayBuckets(7).map((bucket) => ({ ...bucket, booking: 0, revenue: 0, commission: 0, activity: 0 }))
    const bucketMap = new Map(recentActivityBuckets.map((bucket) => [bucket.key, bucket]))
    for (const booking of bookings) {
      const key = getDayKey(booking.created_at)
      if (!key) continue
      const bucket = bucketMap.get(key)
      if (!bucket) continue
      bucket.booking += 1
    }
    for (const transaction of customerTransactionRows) {
      const key = getDayKey(transaction.createdAt)
      if (!key) continue
      const bucket = bucketMap.get(key)
      if (!bucket) continue
      bucket.revenue += transaction.receivedAmount
      bucket.commission += transaction.customerAdminFeeCollected
    }
    for (const log of teamActionLogs) {
      const key = getDayKey(log.created_at)
      if (!key) continue
      const bucket = bucketMap.get(key)
      if (!bucket) continue
      bucket.activity += 1
    }
    const bookingSparkPoints = buildSparklinePoints(recentActivityBuckets.map((bucket) => ({ value: bucket.booking })))
    const revenueSparkPoints = buildSparklinePoints(recentActivityBuckets.map((bucket) => ({ value: bucket.revenue })))
    const commissionSparkPoints = buildSparklinePoints(recentActivityBuckets.map((bucket) => ({ value: bucket.commission })))
    const accountSparkPoints = buildSparklinePoints(recentActivityBuckets.map((bucket) => ({ value: bucket.activity })))
    const categoryRows = OPERATIONS_PRODUCT_SUMMARIES.map((product) => {
      const currentBookings = superadminPeriodBookings.filter((booking) => classifyBookingProduct(booking) === product.key)
      const previousBookings = superadminPreviousBookings.filter((booking) => classifyBookingProduct(booking) === product.key)
      const currentTransactions = superadminPeriodTransactions.filter((transaction) => transaction.bookingProductType === product.key)
      const pendingQueueCount =
        product.key === "package_tour"
          ? regionPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length +
            currentBookings.filter((booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status))).length
          : currentBookings.filter((booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status))).length
      const breachCount =
        product.key === "package_tour"
          ? regionPackages.filter((pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3).length +
            currentBookings.filter((booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1).length
          : currentBookings.filter((booking) => ["awaiting_admin_handoff", "finance_review"].includes(normalizeStatus(booking.booking_status)) && daysSince(booking.created_at) >= 1).length
      const slaRate = pendingQueueCount > 0 ? Math.max(0, Math.round(((pendingQueueCount - breachCount) / pendingQueueCount) * 100)) : 100
      return {
        product,
        bookings: currentBookings.length,
        revenue: currentTransactions.reduce((sum, transaction) => sum + transaction.receivedAmount, 0),
        growth: calculateGrowthRate(currentBookings.length, previousBookings.length),
        slaRate,
      }
    })
      .filter((row) => row.bookings > 0 || row.revenue > 0 || row.product.key === "package_tour")
      .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue)
    const topCategoryRows = categoryRows.slice(0, 7)
    const trendRows = buildRecentDayBuckets(7).map((row) => ({
      ...row,
      package_tour: 0,
      flight: 0,
      hotel: 0,
      train: 0,
      bus: 0,
      sea: 0,
      cruise: 0,
    }))
    const trendRowMap = new Map(trendRows.map((row) => [row.key, row]))
    for (const booking of bookings.filter((item) => isWithinPeriod(item.created_at, getPeriodStart(7)))) {
      const key = getDayKey(booking.created_at)
      if (!key) continue
      const row = trendRowMap.get(key)
      if (!row) continue
      row[classifyBookingProduct(booking)] += 1
    }
    const topTrendProducts = categoryRows.slice(0, 6).map((row) => row.product)
    const trendSeries = topTrendProducts.map((product) => ({
      label: product.label,
      values: trendRows.map((row) => row[product.key]),
      color: product.sparkColor,
    }))
    const bookingByIdMap = new Map(superadminPeriodBookings.map((booking) => [booking.id, booking]))
    const merchantRevenueRows = Array.from(
      superadminPeriodTransactions.reduce((map, transaction) => {
        const packageRow = transaction.packageId ? packageMap.get(transaction.packageId) : null
        const merchantId = packageRow?.merchant_id || null
        const booking = bookingByIdMap.get(transaction.id)
        const supplier = booking?.supplier_id ? supplierMap.get(booking.supplier_id) : null
        const merchantLabel =
          merchantId && merchantNameMap.get(merchantId)
            ? merchantNameMap.get(merchantId)!
            : getMaskedSupplierLabel(supplier)
        const sourceLabel = merchantId ? "Merchant" : "Partner"
        const current = map.get(merchantLabel) || { label: merchantLabel, sourceLabel, revenue: 0, bookings: 0 }
        current.revenue += transaction.receivedAmount
        current.bookings += 1
        map.set(merchantLabel, current)
        return map
      }, new Map<string, { label: string; sourceLabel: string; revenue: number; bookings: number }>()),
    )
      .map(([, value]) => value)
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, 5)
    const pendingPackageRows = regionPackages
      .filter((pkg) => normalizeStatus(pkg.status) === "pending")
      .slice(0, 5)
      .map((pkg) => ({
        id: pkg.id,
        merchant: merchantNameMap.get(pkg.merchant_id || "") || "Merchant tanpa nama",
        product: pkg.title || "Paket tanpa judul",
        category: "Paket Wisata",
        submittedAt: formatDateTime(pkg.created_at),
        submittedLabel: formatRelativeHours(pkg.created_at),
        slaLabel: daysSince(pkg.created_at) >= 3 ? "Melewati SLA" : `${Math.max(1, 3 - daysSince(pkg.created_at))} hari lagi`,
        slaClassName: daysSince(pkg.created_at) >= 3 ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600",
        href: `/superadmin/packages/${pkg.id}`,
      }))
    const systemStatusItems = [
      {
        label: "Website & App",
        status: poorWebVitalsCount === 0 ? "Healthy" : poorWebVitalsCount <= 4 ? "Review" : "Degraded",
        className: poorWebVitalsCount === 0 ? "bg-emerald-50 text-emerald-600" : poorWebVitalsCount <= 4 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600",
      },
      {
        label: "Merchant Queue",
        status: regionPendingMerchants === 0 ? "Healthy" : regionPendingMerchants <= 8 ? "Review" : "Busy",
        className: regionPendingMerchants === 0 ? "bg-emerald-50 text-emerald-600" : regionPendingMerchants <= 8 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600",
      },
      {
        label: "Booking Queue",
        status: regionFinanceReadyCount === 0 ? "Healthy" : regionFinanceReadyCount <= 8 ? "Review" : "Busy",
        className: regionFinanceReadyCount === 0 ? "bg-emerald-50 text-emerald-600" : regionFinanceReadyCount <= 8 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600",
      },
      {
        label: "Affiliate Sync",
        status: superadminAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length === 0 ? "Healthy" : "Syncing",
        className: superadminAffiliateBookings.filter((booking) => normalizeStatus(booking.supplier_order_status) === "failed").length === 0 ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600",
      },
      {
        label: "Audit Trail",
        status: recentAuditLogs.length > 0 ? formatRelativeHours(recentAuditLogs[0]?.created_at) : "Belum ada data",
        className: "bg-slate-100 text-slate-600",
      },
    ]
    const platformMetricRows = [
      { label: "Total Merchant", value: totalMerchantCount, note: `${regionPendingMerchants} menunggu approval`, tone: "bg-blue-50 text-blue-600" },
      { label: "Supplier Aktif", value: activeSupplierCount || suppliers.filter((supplier) => normalizeStatus(supplier.status) === "active").length, note: `${suppliers.filter((supplier) => normalizeStatus(supplier.supplier_type) === "affiliate").length} channel affiliate`, tone: "bg-orange-50 text-orange-600" },
      { label: "Internal Account", value: internalAccountValue, note: `${financeProfiles.length} finance | ${adminProfiles.length} ops`, tone: "bg-violet-50 text-violet-600" },
      { label: "Report Feed", value: managerReports.length, note: `${operationsReports.length} ops | ${financeReports.length} finance`, tone: "bg-emerald-50 text-emerald-600" },
    ]
    const bookingGrowthMeta = describeGrowth(totalBookingValue, previousBookingValue)
    const revenueGrowthMeta = describeGrowth(totalRevenueValue, previousRevenueValue)
    const commissionGrowthMeta = describeGrowth(totalCommissionValue, previousCommissionValue)
    const accountGrowthMeta = {
      label: `${internalAccountValue} internal account aktif`,
      className: "text-emerald-500",
    }
    const alertsHref = "/superadmin/dashboard#alerts"
    const showCommercialWorkspace = superadminWorkspace === "all" || superadminWorkspace === "commercial"
    const showOperationalWorkspace = superadminWorkspace === "all" || superadminWorkspace === "operational"
    const showPlatformWorkspace = superadminWorkspace === "all" || superadminWorkspace === "platform"

    return (
      <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-[1680px] space-y-6">
          {params.success ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm text-emerald-700">
              {params.success}
            </div>
          ) : null}
          {params.error ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-700">
              {params.error}
            </div>
          ) : null}

          <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">Dashboard Super Admin</h1>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600">✓</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Kontrol penuh ekosistem RedFeng untuk channel, integrasi, antrean operasional, dan kualitas sistem.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <form method="get" className="flex flex-wrap items-center gap-3">
                <div className="rounded-[16px] border border-[#e5ebf3] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <label className="block">
                    <select name="period" defaultValue={operationsPeriod.value} className="bg-transparent text-[13px] font-semibold text-slate-700 outline-none">
                      <option value="7d">7 hari terakhir</option>
                      <option value="30d">30 hari terakhir</option>
                      <option value="90d">90 hari terakhir</option>
                      <option value="all">Semua waktu</option>
                    </select>
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">{headerCompareLabel}</p>
                </div>
                <div className="rounded-[16px] border border-[#e5ebf3] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <label className="block">
                    <select name="region" defaultValue={superadminRegion} className="bg-transparent text-[13px] font-medium text-slate-600 outline-none">
                      <option value="all">Semua Region</option>
                      <option value="indonesia">Indonesia</option>
                      <option value="international">Luar Indonesia</option>
                      <option value="bali">Bali</option>
                      <option value="jawa">Jawa</option>
                      <option value="sumatera">Sumatera</option>
                      <option value="kalimantan">Kalimantan</option>
                      <option value="sulawesi">Sulawesi</option>
                      <option value="nusa_tenggara">Nusa Tenggara</option>
                    </select>
                  </label>
                </div>
                <div className="rounded-[16px] border border-[#e5ebf3] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <label className="block">
                    <select name="super_workspace" defaultValue={superadminWorkspace} className="bg-transparent text-[13px] font-medium text-slate-600 outline-none">
                      <option value="all">Semua Workspace</option>
                      <option value="commercial">Commercial</option>
                      <option value="operational">Operational</option>
                      <option value="platform">Platform</option>
                    </select>
                  </label>
                </div>
                <button
                  type="submit"
                  className="rounded-[16px] bg-[#f97316] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(249,115,22,0.24)] transition hover:bg-[#ea580c]"
                >
                  Terapkan
                </button>
                {superadminRegion !== "all" ? (
                  <span className="inline-flex max-w-[360px] rounded-[16px] border border-[#e5ebf3] bg-white px-4 py-3 text-[12px] leading-5 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    {regionFilterNote}
                  </span>
                ) : null}
              </form>
              <div className="flex items-center gap-2">
                <AdminDashboardToolbarActions alertsCount={alertItems.length} alertsHref={alertsHref} />
                <div className="flex items-center gap-3 rounded-[16px] border border-[#e5ebf3] bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#fb7185)] text-sm font-semibold text-white">
                    SA
                  </span>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold text-slate-900">Super Admin</p>
                    <p className="truncate text-xs text-slate-400">{formatAdminCode(user.id)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-6">
            {showCommercialWorkspace ? <div className="rounded-[26px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <DashboardGlyph kind="booking" className="h-5 w-5" />
                </div>
                <span className="text-slate-300">^</span>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-slate-700">Total Booking</p>
              <p className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCompactCount(totalBookingValue)}</p>
              <p className={`mt-1 text-[12px] font-semibold ${bookingGrowthMeta.className}`}>{bookingGrowthMeta.label}</p>
              <TinySparkline points={bookingSparkPoints} stroke="#3b82f6" />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[#f8fbff] p-3">
                <div>
                  <p className="text-[11px] text-slate-500">Internal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(superadminInternalBookings.length)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Affiliate</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(superadminAffiliateBookings.length)}</p>
                </div>
              </div>
            </div> : null}

            {showCommercialWorkspace ? <div className="rounded-[26px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <DashboardGlyph kind="revenue" className="h-5 w-5" />
                </div>
                <span className="text-slate-300">^</span>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-slate-700">Total Revenue (GMV)</p>
              <p className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCompactMoney(totalRevenueValue)}</p>
              <p className={`mt-1 text-[12px] font-semibold ${revenueGrowthMeta.className}`}>{revenueGrowthMeta.label}</p>
              <TinySparkline points={revenueSparkPoints} stroke="#10b981" />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[#f7fffb] p-3">
                <div>
                  <p className="text-[11px] text-slate-500">Internal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactMoney(superadminInternalTransactions.reduce((sum, item) => sum + item.receivedAmount, 0))}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Affiliate</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactMoney(superadminAffiliateTransactions.reduce((sum, item) => sum + item.receivedAmount, 0))}</p>
                </div>
              </div>
            </div> : null}

            {showCommercialWorkspace ? <div className="rounded-[26px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <DashboardGlyph kind="issue" className="h-5 w-5" />
                </div>
                <span className="text-slate-300">^</span>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-slate-700">Net Commission</p>
              <p className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCompactMoney(totalCommissionValue)}</p>
              <p className={`mt-1 text-[12px] font-semibold ${commissionGrowthMeta.className}`}>{commissionGrowthMeta.label}</p>
              <TinySparkline points={commissionSparkPoints} stroke="#f97316" />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[#fffaf5] p-3">
                <div>
                  <p className="text-[11px] text-slate-500">Internal Margin</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactMoney(internalCommissionValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Affiliate Komisi</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactMoney(affiliateCommissionValue)}</p>
                </div>
              </div>
            </div> : null}

            {showPlatformWorkspace ? <div className="rounded-[26px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <DashboardGlyph kind="bell" className="h-5 w-5" />
                </div>
                <span className="text-slate-300">^</span>
              </div>
              <p className="mt-4 text-[13px] font-semibold text-slate-700">Platform Accounts</p>
              <p className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950">{formatCompactCount(totalAccountsValue)}</p>
              <p className={`mt-1 text-[12px] font-semibold ${accountGrowthMeta.className}`}>{accountGrowthMeta.label}</p>
              <TinySparkline points={accountSparkPoints} stroke="#6366f1" />
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[18px] bg-[#f8f8ff] p-3">
                <div>
                  <p className="text-[11px] text-slate-500">Internal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(internalAccountValue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Merchant</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactCount(totalMerchantCount)}</p>
                </div>
              </div>
            </div> : null}

            {showPlatformWorkspace ? <div className="rounded-[26px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-slate-700">System Health</p>
                <span className="text-slate-300">^</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#22c55e 0 ${systemHealthRate}%, #e2e8f0 ${systemHealthRate}% 100%)` }}
                >
                  <div className="flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">{systemHealthRate.toFixed(2)}%</p>
                    <p className="text-[11px] text-slate-400">Uptime</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2 text-[12px] text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Web Vitals Sehat</span>
                    <span className="font-semibold text-slate-900">{healthyWebVitalsCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Tracked Paths</span>
                    <span className="font-semibold text-slate-900">{trackedPublicPaths}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Error Rate</span>
                    <span className={`font-semibold ${poorWebVitalsCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                      {recentWebVitalEvents.length > 0 ? `${((poorWebVitalsCount / recentWebVitalEvents.length) * 100).toFixed(2)}%` : "0.00%"}
                    </span>
                  </div>
                </div>
              </div>
            </div> : null}

            {showOperationalWorkspace ? <div className="rounded-[26px] border border-[#f3d6d6] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">Pending Critical</p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-rose-600">{pendingCriticalValue}</p>
                </div>
                <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-rose-50 px-2 py-1 text-sm font-semibold text-rose-600">
                  {pendingCriticalValue}
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {pendingCriticalItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Tidak ada sinyal kritikal aktif.</p>
                ) : (
                  pendingCriticalItems.slice(0, 4).map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div> : null}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_320px]">
            <div className="space-y-6">
              {showCommercialWorkspace ? <div className="grid gap-6 xl:grid-cols-[0.95fr_1.2fr_1.25fr]">
                <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Business Mix</h2>
                    <span className="text-[12px] text-slate-400">Hari ini</span>
                  </div>
                  <div className="mt-6 flex flex-col items-center">
                    <div
                      className="relative flex h-56 w-56 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(#2f6bff 0 ${affiliateShareValue}%, #33c684 ${affiliateShareValue}% 100%)` }}
                    >
                      <div className="flex h-[164px] w-[164px] flex-col items-center justify-center rounded-full bg-white text-center">
                        <p className="text-[2.3rem] font-semibold tracking-[-0.04em] text-slate-950">{affiliateShareValue}%</p>
                        <p className="text-base text-slate-500">Affiliate</p>
                      </div>
                    </div>
                    <div className="mt-6 grid w-full gap-3">
                      <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[#f8fbff] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3.5 w-3.5 rounded-full bg-[#2f6bff]" />
                          <span className="text-sm font-medium text-slate-600">Affiliate</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{formatCompactCount(superadminAffiliateBookings.length)} booking</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[#f7fffb] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3.5 w-3.5 rounded-full bg-[#33c684]" />
                          <span className="text-sm font-medium text-slate-600">Internal</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{formatCompactCount(superadminInternalBookings.length)} booking</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Performa per Kategori</h2>
                    <Link href="/superadmin/bookings" className="text-[12px] font-semibold text-[#2563eb]">Lihat semua</Link>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-[20px] border border-[#eef2f7]">
                    <div className="grid grid-cols-[1.6fr_0.8fr_1fr_0.8fr_0.7fr] gap-3 bg-[#f8fafc] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <span>Kategori</span>
                      <span>Booking</span>
                      <span>Revenue</span>
                      <span>Growth</span>
                      <span>SLA</span>
                    </div>
                    <div className="divide-y divide-[#eef2f7]">
                      {topCategoryRows.map((row) => (
                        <div key={row.product.key} className="grid grid-cols-[1.6fr_0.8fr_1fr_0.8fr_0.7fr] gap-3 px-4 py-3.5 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${row.product.bg} ${row.product.tone}`}>
                              <ProductMiniIcon kind={row.product.icon} className="h-4 w-4" />
                            </span>
                            <span className="font-medium text-slate-700">{row.product.label}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{formatCompactCount(row.bookings)}</span>
                          <span className="font-semibold text-slate-900">{formatCompactMoney(row.revenue)}</span>
                          <span className={row.growth >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                            {row.growth >= 0 ? "↑" : "↓"} {Math.abs(row.growth).toFixed(0)}%
                          </span>
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            row.slaRate >= 90 ? "bg-emerald-50 text-emerald-600" : row.slaRate >= 75 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                          }`}>
                            {row.slaRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Trend 7 Hari</h2>
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-600">Booking</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4">
                    {topTrendProducts.map((product) => (
                      <div key={product.key} className="inline-flex items-center gap-2 text-[12px] text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: product.sparkColor }} />
                        <span>{product.label}</span>
                      </div>
                    ))}
                  </div>
                  <DashboardLineChart labels={trendRows.map((row) => row.label)} series={trendSeries} />
                </div>
              </div> : null}

              <div className="grid gap-6 xl:grid-cols-[1.65fr_0.8fr_0.85fr]">
                {showOperationalWorkspace ? <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Operasional Real-Time</h2>
                    <Link href="/superadmin/bookings" className="text-[12px] font-semibold text-[#2563eb]">Lihat semua</Link>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { label: "Paket Menunggu Review", value: regionPendingPackages, active: true },
                      { label: "Booking Bermasalah", value: regionFinanceReadyCount, active: false },
                      { label: "Anomali Aktif", value: regionReviewRequests.length + regionDeletionRequests.length, active: false },
                      { label: "Merchant Pending", value: regionPendingMerchants, active: false },
                    ].map((tab) => (
                      <span
                        key={tab.label}
                        className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                          tab.active ? "bg-[#fff1eb] text-orange-600" : "bg-[#f8fafc] text-slate-400"
                        }`}
                      >
                        {tab.label} ({tab.value})
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 overflow-hidden rounded-[20px] border border-[#eef2f7]">
                    <div className="grid grid-cols-[1.25fr_1.4fr_0.8fr_0.95fr_0.9fr_0.8fr] gap-3 bg-[#f8fafc] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <span>Merchant</span>
                      <span>Produk</span>
                      <span>Kategori</span>
                      <span>Diajukan</span>
                      <span>SLA</span>
                      <span>Aksi</span>
                    </div>
                    <div className="divide-y divide-[#eef2f7]">
                      {pendingPackageRows.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-slate-500">Belum ada paket yang menunggu review.</div>
                      ) : (
                        pendingPackageRows.map((row) => (
                          <div key={row.id} className="grid grid-cols-[1.25fr_1.4fr_0.8fr_0.95fr_0.9fr_0.8fr] gap-3 px-4 py-3.5 text-sm">
                            <span className="font-medium text-slate-700">{row.merchant}</span>
                            <span className="text-slate-600">{row.product}</span>
                            <span className="inline-flex w-fit rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600">{row.category}</span>
                            <div className="text-slate-500">
                              <p>{row.submittedAt}</p>
                              <p className="mt-1 text-[11px]">{row.submittedLabel}</p>
                            </div>
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.slaClassName}`}>{row.slaLabel}</span>
                            <Link
                              href={row.href}
                              className="inline-flex w-fit items-center justify-center rounded-[12px] bg-[#3b82f6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#2563eb]"
                            >
                              Review
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div> : null}

                {showCommercialWorkspace ? <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Top Merchant & Partner</h2>
                    <Link href="/superadmin/bookings" className="text-[12px] font-semibold text-[#2563eb]">Lihat semua</Link>
                  </div>
                  <div className="mt-5 space-y-4">
                    {merchantRevenueRows.length === 0 ? (
                      <p className="text-sm text-slate-500">Belum ada merchant atau partner dengan revenue tercatat.</p>
                    ) : (
                      merchantRevenueRows.map((row) => (
                        <div key={row.label} className="flex items-start justify-between gap-4 rounded-[18px] bg-[#f8fbff] px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{row.label}</p>
                            <p className="mt-1 text-[12px] text-slate-400">{row.sourceLabel} • {formatCompactCount(row.bookings)} booking</p>
                          </div>
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-900">{formatCompactMoney(row.revenue)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div> : null}

                {showPlatformWorkspace ? <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Platform Metrics</h2>
                    <span className="text-slate-300">^</span>
                  </div>
                  <div className="mt-5 space-y-4">
                    {platformMetricRows.map((row) => (
                      <div key={row.label} className="flex items-start gap-3 rounded-[18px] bg-[#f8fafc] px-4 py-3.5">
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${row.tone}`}>
                          <DashboardGlyph kind="booking" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-600">{row.label}</p>
                            <p className="text-lg font-semibold text-slate-950">{formatCompactCount(row.value)}</p>
                          </div>
                          <p className="mt-1 text-[12px] text-slate-400">{row.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div> : null}
              </div>
            </div>

            <div className="space-y-6">
              {showOperationalWorkspace ? <div id="alerts" className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Alert & Notifikasi</h2>
                  <Link href="/superadmin/audit-log" className="text-[12px] font-semibold text-[#2563eb]">Lihat semua</Link>
                </div>
                <div className="mt-5 space-y-3">
                  {alertItems.length === 0 ? (
                    <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/60 px-4 py-4 text-sm text-emerald-700">
                      Tidak ada alert kritikal. Sistem terlihat stabil pada periode ini.
                    </div>
                  ) : (
                    alertItems.map((item) => (
                      <div key={item.title} className={`rounded-[20px] border px-4 py-4 ${item.toneClassName}`}>
                        <div className="flex items-start gap-3">
                          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.iconClassName}`}>
                            <DashboardGlyph kind="alert" className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-[13px] leading-6 text-slate-500">{item.detail}</p>
                              </div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.levelClassName}`}>{item.level}</span>
                            </div>
                            <p className="mt-2 text-[12px] text-slate-400">{item.timeLabel}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div> : null}

              {showPlatformWorkspace ? <div className="rounded-[28px] border border-[#e8edf5] bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">System Status</h2>
                  <span className="text-slate-300">^</span>
                </div>
                <div className="mt-5 space-y-3">
                  {systemStatusItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#f8fafc] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-500 shadow-[0_6px_20px_rgba(15,23,42,0.06)]">
                          <span className="h-2.5 w-2.5 rounded-full bg-current" />
                        </span>
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.className}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div> : null}
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (isSuperadmin && params.view === "__legacy_superadmin_disabled__") {
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
                  <p className="text-sm text-orange-50/80">Approval pending</p>
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
