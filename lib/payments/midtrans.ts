import midtransClient from "midtrans-client"
import { getOptionalEnv, getRequiredEnv } from "@/lib/env"

export function isMidtransProduction() {
  return getOptionalEnv("MIDTRANS_IS_PRODUCTION", "true").toLowerCase() !== "false"
}

export function getMidtransSnapScriptUrl() {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js"
}

export function createMidtransSnapClient() {
  return new midtransClient.Snap({
    isProduction: isMidtransProduction(),
    serverKey: getRequiredEnv("MIDTRANS_SERVER_KEY"),
  })
}
