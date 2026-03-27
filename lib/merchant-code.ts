export function formatMerchantCode(merchantId: string | null | undefined) {
  const normalized = String(merchantId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()

  if (!normalized) return "RFM-UNASSIGNED"

  const chunkA = normalized.slice(0, 6) || "000000"
  const chunkB = normalized.slice(-6) || "000000"

  return `RFM-${chunkA}-${chunkB}`
}
