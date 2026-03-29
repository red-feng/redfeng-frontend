import { getOptionalEnv } from "@/lib/env"

type KopraPayload = Record<string, unknown>
export type KopraExecutionRequest = {
  refundId: string
  orderId: string | null
  amount: number
  currency: "IDR"
  note: string | null
  source: {
    system: "redfeng-finance"
    channel: "kopra_manual"
  }
  beneficiary: {
    bankName: string | null
    accountNumber: string | null
    accountHolder: string | null
  }
}

export type KopraExecutionResponse = {
  success: boolean
  status: string
  message?: string | null
  referenceNo?: string | null
  transactionId?: string | null
  raw?: Record<string, unknown> | null
}

export type KopraStatusRequest = {
  refundId: string
  orderId: string | null
  referenceNo: string | null
}

export type KopraStatusResponse = {
  success: boolean
  status: string
  message?: string | null
  referenceNo?: string | null
  transactionId?: string | null
  raw?: Record<string, unknown> | null
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function normalizeSuccess(value: unknown) {
  if (typeof value === "boolean") return value
  const keyword = String(value || "").trim().toLowerCase()
  return ["success", "successful", "ok", "paid", "completed"].includes(keyword)
}

function normalizeKopraResponse(data: Record<string, unknown>): KopraExecutionResponse {
  const status = firstString(
    data.status,
    data.transactionStatus,
    data.transaction_status,
    data.message,
  ) || "unknown"

  return {
    success: normalizeSuccess(data.success) || normalizeSuccess(status),
    status,
    message: firstString(data.message, data.statusMessage, data.status_message),
    referenceNo: firstString(data.referenceNo, data.reference_no, data.bankReferenceNo),
    transactionId: firstString(data.transactionId, data.transaction_id, data.bankTransactionId),
    raw: data,
  }
}

function getKopraHeaders() {
  const token = getOptionalEnv("KOPRA_API_TOKEN")
  const apiKey = getOptionalEnv("KOPRA_API_KEY")

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  }
}

async function postJson(url: string, body: KopraPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: getKopraHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const text = await response.text()
  let data: Record<string, unknown> | null = null

  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string" && data.message.trim()
        ? data.message
        : `Kopra API error ${response.status}`,
    )
  }

  return asRecord(data)
}

export function isKopraExecutionConfigured() {
  return Boolean(getOptionalEnv("KOPRA_REFUND_API_URL"))
}

export function isKopraStatusConfigured() {
  return Boolean(getOptionalEnv("KOPRA_STATUS_API_URL"))
}

export async function executeKopraRefundTransfer(payload: {
  refundId: string
  amount: number
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
  note: string | null
  orderId: string | null
}) {
  const url = getOptionalEnv("KOPRA_REFUND_API_URL")
  if (!url) {
    throw new Error("KOPRA_REFUND_API_URL belum diatur.")
  }

  const requestBody: KopraExecutionRequest = {
    refundId: payload.refundId,
    orderId: payload.orderId,
    amount: payload.amount,
    currency: "IDR",
    note: payload.note,
    source: {
      system: "redfeng-finance",
      channel: "kopra_manual",
    },
    beneficiary: {
      bankName: payload.bankName,
      accountNumber: payload.bankAccountNumber,
      accountHolder: payload.bankAccountHolder,
    },
  }

  const response = await postJson(url, requestBody)
  return normalizeKopraResponse(response)
}

export async function getKopraRefundStatus(payload: {
  refundId: string
  referenceNo: string | null
  orderId: string | null
}) {
  const url = getOptionalEnv("KOPRA_STATUS_API_URL")
  if (!url) {
    throw new Error("KOPRA_STATUS_API_URL belum diatur.")
  }

  const requestBody: KopraStatusRequest = {
    refundId: payload.refundId,
    referenceNo: payload.referenceNo,
    orderId: payload.orderId,
  }

  const response = await postJson(url, requestBody)
  return normalizeKopraResponse(response)
}
