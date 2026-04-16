function formatIdentityCode(prefix: string, rawId: string | null | undefined, fallback: string) {
  const normalized = String(rawId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()

  if (!normalized) return fallback

  const chunkA = normalized.slice(0, 6) || "000000"
  const chunkB = normalized.slice(-6) || "000000"

  return `${prefix}-${chunkA}-${chunkB}`
}

export function formatMerchantCode(merchantId: string | null | undefined) {
  return formatIdentityCode("RFM", merchantId, "RFM-UNASSIGNED")
}

export function formatCustomerCode(customerId: string | null | undefined) {
  return formatIdentityCode("RFC", customerId, "RFC-GUEST")
}

export function formatAdminCode(adminId: string | null | undefined) {
  return formatIdentityCode("RFA", adminId, "RFA-UNASSIGNED")
}

export function formatFinanceCode(financeId: string | null | undefined) {
  return formatIdentityCode("RFF", financeId, "RFF-UNASSIGNED")
}

export function formatPackageCode(packageCode: string | null | undefined, packageId: string | null | undefined) {
  const explicitCode = String(packageCode || "").trim().toUpperCase()
  if (explicitCode) return explicitCode
  return formatIdentityCode("PKG", packageId, "PKG-UNASSIGNED")
}
