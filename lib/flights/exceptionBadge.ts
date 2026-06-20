import { isAirAsiaFlight } from "@/lib/flights/automationPolicy"

type AdminSupabase = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>

export type FlightExceptionBadgeRow = {
  lifecycle_status: string | null
  issue_status: string | null
  airline_code: string | null
  airline_name: string | null
  issue_requested_at: string | null
  created_at: string | null
}

function hoursSince(value: string | null | undefined, nowMs = Date.now()) {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((nowMs - parsed.getTime()) / 3600000))
}

function isFlightTerminal(row: FlightExceptionBadgeRow) {
  const lifecycle = String(row.lifecycle_status || "").trim().toLowerCase()
  const issue = String(row.issue_status || "").trim().toLowerCase()
  return lifecycle === "issued" || lifecycle === "cancelled" || lifecycle === "refund_required" || issue === "issued" || issue === "cancelled" || issue === "refunded"
}

export function isFlightExceptionBadgeRow(row: FlightExceptionBadgeRow, nowMs = Date.now()) {
  if (isFlightTerminal(row)) return false

  const lifecycle = String(row.lifecycle_status || "").trim().toLowerCase()
  const issue = String(row.issue_status || "").trim().toLowerCase()
  const isAirAsia = isAirAsiaFlight({ airlineCode: row.airline_code, airlineName: row.airline_name })

  return (
    lifecycle === "issue_failed" ||
    issue === "issue_failed" ||
    isAirAsia ||
    lifecycle === "payment_verified" ||
    (lifecycle === "ticketing" && hoursSince(row.issue_requested_at || row.created_at, nowMs) >= 1) ||
    ((lifecycle === "fare_recheck_required" || lifecycle === "fare_rechecked" || !lifecycle) && hoursSince(row.created_at, nowMs) >= 1)
  )
}

export async function getFlightExceptionBadgeCount(adminSupabase: AdminSupabase) {
  const { data, error } = await adminSupabase
    .from("flight_booking_details")
    .select("lifecycle_status, issue_status, airline_code, airline_name, issue_requested_at, created_at")
    .order("created_at", { ascending: false })

  if (error) return 0

  const nowMs = Date.now()
  const rows = ((data as FlightExceptionBadgeRow[] | null) || []) as FlightExceptionBadgeRow[]
  return rows.filter((row) => isFlightExceptionBadgeRow(row, nowMs)).length
}
