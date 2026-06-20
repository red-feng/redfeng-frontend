export type FlightIssueReasonFilter = "all" | "timeout" | "deposit" | "fare-seat" | "pnr-ticket" | "rejected" | "unknown"

export type FlightIssueFailureReasonBadge = {
  value: Exclude<FlightIssueReasonFilter, "all">
  label: string
  note: string
  tone: string
}

type SupplierFailureSource = {
  last_error?: string | null
  response_payload?: Record<string, unknown> | null
}

export function cleanFlightIssueText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function pickFlightIssueMessageFromPayload(value: unknown, depth = 0): string {
  if (depth > 4) return ""
  if (typeof value === "string") return cleanFlightIssueText(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const picked = pickFlightIssueMessageFromPayload(item, depth + 1)
      if (picked) return picked
    }
    return ""
  }
  if (!isRecord(value)) return ""

  const preferredKeys = [
    "message",
    "error",
    "errorMessage",
    "reason",
    "description",
    "statusMessage",
    "status_message",
    "responseMessage",
    "response_message",
  ]
  for (const key of preferredKeys) {
    const picked = pickFlightIssueMessageFromPayload(value[key], depth + 1)
    if (picked) return picked
  }
  for (const item of Object.values(value)) {
    const picked = pickFlightIssueMessageFromPayload(item, depth + 1)
    if (picked) return picked
  }
  return ""
}

export function extractFlightSupplierFailureReason(order: SupplierFailureSource | null | undefined) {
  if (!order) return ""
  return cleanFlightIssueText(order.last_error) || pickFlightIssueMessageFromPayload(order.response_payload)
}

export function truncateFlightIssueReason(value: string, maxLength = 120) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}...`
}

function normalizeReasonText(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

export function classifyFlightIssueFailureReason(rawReason: string): FlightIssueFailureReasonBadge {
  const reason = cleanFlightIssueText(rawReason) || "Response supplier belum memberi alasan spesifik."
  const normalized = normalizeReasonText(reason)

  if (/timeout|timed_out|time_out|etimedout|504|gateway|abort/.test(normalized)) {
    return {
      value: "timeout",
      label: "Supplier timeout",
      note: truncateFlightIssueReason(reason),
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }
  if (/saldo|deposit|balance|insufficient|limit|credit/.test(normalized)) {
    return {
      value: "deposit",
      label: "Saldo/deposit supplier",
      note: truncateFlightIssueReason(reason),
      tone: "border-violet-200 bg-violet-50 text-violet-800",
    }
  }
  if (/fare|price|harga|class|seat|sold_out|soldout|unavailable|not_available|habis/.test(normalized)) {
    return {
      value: "fare-seat",
      label: "Fare/seat berubah",
      note: truncateFlightIssueReason(reason),
      tone: "border-orange-200 bg-orange-50 text-orange-800",
    }
  }
  if (/pnr|ticket|tiket|e_ticket|empty|null|missing|not_found|kosong/.test(normalized)) {
    return {
      value: "pnr-ticket",
      label: "PNR/tiket belum keluar",
      note: truncateFlightIssueReason(reason),
      tone: "border-sky-200 bg-sky-50 text-sky-800",
    }
  }
  if (/reject|rejected|deny|denied|failed|gagal|invalid|error|decline/.test(normalized)) {
    return {
      value: "rejected",
      label: "Supplier rejected",
      note: truncateFlightIssueReason(reason),
      tone: "border-rose-200 bg-rose-50 text-rose-800",
    }
  }

  return {
    value: "unknown",
    label: "Unknown supplier response",
    note: truncateFlightIssueReason(reason),
    tone: "border-slate-200 bg-white text-slate-700",
  }
}

export function normalizeFlightIssueReasonFilter(value: string | undefined): FlightIssueReasonFilter {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "timeout" ||
    normalized === "deposit" ||
    normalized === "fare-seat" ||
    normalized === "pnr-ticket" ||
    normalized === "rejected" ||
    normalized === "unknown"
  ) {
    return normalized
  }
  return "all"
}
