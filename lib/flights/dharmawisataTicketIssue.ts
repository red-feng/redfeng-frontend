import {
  dharmawisataJsonFetch,
  dharmawisataLogin,
  getDharmawisataAccessTokenOverride,
  getDharmawisataConfiguredPath,
  getDharmawisataCredentials,
  isDharmawisataConfigured,
} from "@/lib/dharmawisata/client"

type JsonRecord = Record<string, unknown>

export type DharmawisataTicketIssueInput = {
  bookingId: string
  bookingCode?: string | null
  bookingDate?: string | null
  supplierOrderId?: string | null
  supplierReference?: string | null
  pnrCode?: string | null
  airlineId?: string | null
  fareReferenceId?: string | null
  airlineAccessCode?: string | null
  originAirportCode?: string | null
  destinationAirportCode?: string | null
  tripType?: string | null
  departureAt?: string | null
  returnAt?: string | null
  passengerCount?: number | null
}

export type DharmawisataTicketIssueResult = {
  ok: boolean
  skipped: boolean
  mode: "api" | "manual_unconfigured"
  message: string
  ticketNumber: string | null
  pnrCode: string | null
  raw: JsonRecord
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function safeText(value: unknown, maxLength = 240) {
  const normalized = normalizeText(value)
  if (!normalized) return ""
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function redactCredentialFields(raw: JsonRecord): JsonRecord {
  return {
    ...raw,
    userID: normalizeText(raw.userID) ? "[redacted]" : raw.userID,
    accessToken: normalizeText(raw.accessToken) ? "[redacted]" : raw.accessToken,
  }
}

function responseKeys(raw: JsonRecord) {
  const blocked = new Set(["accessToken", "userID"])
  return Object.keys(raw)
    .filter((key) => !blocked.has(key))
    .sort()
}

function pickStringDeep(value: unknown, keys: string[]): string | null {
  const record = asRecord(value)
  if (!record) return null

  for (const key of keys) {
    const direct = normalizeText(record[key])
    if (direct) return direct
  }

  for (const childValue of Object.values(record)) {
    if (Array.isArray(childValue)) {
      for (const item of childValue) {
        const fromItem = pickStringDeep(item, keys)
        if (fromItem) return fromItem
      }
      continue
    }

    if (asRecord(childValue)) {
      const fromChild = pickStringDeep(childValue, keys)
      if (fromChild) return fromChild
    }
  }

  return null
}

function getResponseStatus(raw: JsonRecord) {
  return normalizeText(
    raw.status ??
      raw.responseStatus ??
      raw.respStatus ??
      raw.resultStatus ??
      raw.code ??
      raw.responseCode,
  ).toLowerCase()
}

function getResponseMessage(raw: JsonRecord) {
  return (
    pickStringDeep(raw, ["respMessage", "message", "errorMessage", "resultMessage", "description"]) ||
    "Dharmawisata ticket issue response diterima."
  )
}

function isSuccessfulIssue(raw: JsonRecord) {
  const status = getResponseStatus(raw)
  const message = getResponseMessage(raw).toLowerCase()

  if (["success", "sukses", "ok", "issued", "true", "00", "0"].includes(status)) return true
  if (status && ["failed", "fail", "error", "false"].includes(status)) return false
  return /\b(success|sukses|issued|berhasil)\b/.test(message)
}

function extractTicketNumber(raw: JsonRecord) {
  return pickStringDeep(raw, [
    "ticketNumber",
    "ticket_number",
    "ticketNo",
    "ticket_no",
    "eTicketNumber",
    "eticketNumber",
    "eticket_no",
    "eTicketNo",
  ])
}

function extractPnrCode(raw: JsonRecord) {
  return pickStringDeep(raw, [
    "pnrCode",
    "pnr_code",
    "pnr",
    "recordLocator",
    "bookingCode",
    "booking_code",
    "supplierReference",
  ])
}

function normalizeDharmawisataTripType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "round_trip" ? "RoundTrip" : "OneWay"
}

function summarizeIssueResponse(raw: JsonRecord): JsonRecord {
  return {
    status: safeText(raw.status),
    message: safeText(raw.respMessage || raw.message, 480),
    bookingStatus: safeText(raw.bookingStatus),
    airlineID: safeText(raw.airlineID),
    origin: safeText(raw.origin),
    destination: safeText(raw.destination),
    tripType: safeText(raw.tripType),
    departDate: safeText(raw.departDate),
    returnDate: safeText(raw.returnDate),
    bookingCode: safeText(raw.bookingCode),
    bookingDate: safeText(raw.bookingDate),
    airlineAccessCode: safeText(raw.airlineAccessCode),
    respTime: safeText(raw.respTime),
    responseKeys: responseKeys(raw),
  }
}

function buildIssuePayload(input: DharmawisataTicketIssueInput, accessToken: string) {
  const credentials = getDharmawisataCredentials()
  const supplierBookingCode = input.bookingCode || input.supplierOrderId || input.supplierReference || input.pnrCode || undefined

  return {
    airlineID: input.airlineId || undefined,
    origin: input.originAirportCode || undefined,
    destination: input.destinationAirportCode || undefined,
    tripType: normalizeDharmawisataTripType(input.tripType),
    departDate: input.departureAt || undefined,
    returnDate: input.returnAt || undefined,
    bookingCode: supplierBookingCode,
    bookingDate: input.bookingDate || undefined,
    airlineAccessCode: input.airlineAccessCode || input.fareReferenceId || input.supplierOrderId || undefined,
    userID: credentials.userId,
    accessToken,
  }
}

export async function issueDharmawisataFlightTicket(
  input: DharmawisataTicketIssueInput,
): Promise<DharmawisataTicketIssueResult> {
  const issuePath = getDharmawisataConfiguredPath("DHARMAWISATA_H2H_ISSUE_PATH")

  if (!isDharmawisataConfigured() || !issuePath) {
    return {
      ok: false,
      skipped: true,
      mode: "manual_unconfigured",
      message: "Endpoint issue Dharmawisata belum dikonfigurasi. Isi DHARMAWISATA_H2H_ISSUE_PATH=/Airline/Issued untuk auto-issue.",
      ticketNumber: null,
      pnrCode: null,
      raw: {
        issueMode: "manual_unconfigured",
        configured: false,
        requiredEnv: "DHARMAWISATA_H2H_ISSUE_PATH",
        officialPath: "/Airline/Issued",
      },
    }
  }

  try {
    const accessTokenOverride = getDharmawisataAccessTokenOverride()
    const auth = accessTokenOverride ? { accessToken: accessTokenOverride } : await dharmawisataLogin({ language: 1 })
    const accessToken = normalizeText(auth.accessToken)

    if (!accessToken) {
      return {
        ok: false,
        skipped: false,
        mode: "api",
        message: "Login Dharmawisata berhasil dipanggil, tetapi access token kosong.",
        ticketNumber: null,
        pnrCode: null,
        raw: {
          issueMode: "api",
          auth: redactCredentialFields(auth),
          error: "empty_access_token",
        },
      }
    }

    const payload = buildIssuePayload(input, accessToken)
    const rawResponse = await dharmawisataJsonFetch({
      path: issuePath,
      method: "POST",
      body: payload,
    })
    const raw = asRecord(rawResponse) || { response: rawResponse }
    const ok = isSuccessfulIssue(raw)

    return {
      ok,
      skipped: false,
      mode: "api",
      message: getResponseMessage(raw),
      ticketNumber: extractTicketNumber(raw),
      pnrCode: extractPnrCode(raw),
      raw: {
        issueMode: "api",
        request: {
          ...payload,
          userID: "[redacted]",
          accessToken: "[redacted]",
        },
        responseSummary: summarizeIssueResponse(raw),
        response: redactCredentialFields(raw),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dharmawisata ticket issue gagal tanpa pesan error."

    return {
      ok: false,
      skipped: false,
      mode: "api",
      message,
      ticketNumber: null,
      pnrCode: null,
      raw: {
        issueMode: "api",
        error: message,
      },
    }
  }
}
