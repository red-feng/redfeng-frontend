import midtransClient from "midtrans-client"
import { getOptionalEnv, getRequiredEnv } from "@/lib/env"

function isMidtransProduction() {
  return getOptionalEnv("MIDTRANS_IS_PRODUCTION", "true").toLowerCase() !== "false"
}

function createMidtransSnapClient() {
  return new midtransClient.Snap({
    isProduction: isMidtransProduction(),
    serverKey: getRequiredEnv("MIDTRANS_SERVER_KEY"),
  })
}

export async function getMidtransTransactionStatus(transactionIdOrOrderId: string) {
  const client = createMidtransSnapClient()
  return client.transaction.status(transactionIdOrOrderId)
}

export async function cancelMidtransTransaction(transactionIdOrOrderId: string) {
  const client = createMidtransSnapClient()
  return client.transaction.cancel(transactionIdOrOrderId)
}

export async function refundMidtransTransaction(params: {
  transactionIdOrOrderId: string
  refundKey: string
  amount: number
  reason: string
  direct?: boolean
}) {
  const client = createMidtransSnapClient()
  const payload = {
    refund_key: params.refundKey,
    amount: params.amount,
    reason: params.reason,
  }

  if (params.direct) {
    return client.transaction.refundDirect(params.transactionIdOrOrderId, payload)
  }

  return client.transaction.refund(params.transactionIdOrOrderId, payload)
}
