import { getOptionalEnv } from "@/lib/env"

type KopraPayload = Record<string, unknown>

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

  return data || {}
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

  return postJson(url, {
    refundId: payload.refundId,
    amount: payload.amount,
    destinationBankName: payload.bankName,
    destinationAccountNumber: payload.bankAccountNumber,
    destinationAccountHolder: payload.bankAccountHolder,
    note: payload.note,
    orderId: payload.orderId,
  })
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

  return postJson(url, {
    refundId: payload.refundId,
    referenceNo: payload.referenceNo,
    orderId: payload.orderId,
  })
}
