type FinanceSettingsRow = {
  id?: string | null
  redfeng_commission_percent?: number | string | null
  customer_admin_fee_percent?: number | string | null
  customer_tax_percent?: number | string | null
  merchant_transfer_fee?: number | string | null
  customer_admin_fee_rules?: unknown
  merchant_transfer_fee_rules?: unknown
}

type FinanceSettingsQuery = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: FinanceSettingsRow | null; error: { message?: string } | null }>
      }
    }
  }
}

export type FinanceSettings = {
  redfengCommissionPercent: number
  customerAdminFeePercent: number
  customerTaxPercent: number
  merchantTransferFee: number
  customerAdminFeeRules: Record<FinancePaymentMethod, number>
  merchantTransferFeeRules: Record<string, number>
}

export type FinancePaymentMethod = "bank_transfer" | "qris" | "credit_card"

export type MerchantPayoutBreakdown = {
  grossAmount: number
  redfengCommissionPercent: number
  redfengCommissionAmount: number
  customerAdminFeePercent: number
  customerTaxPercent: number
  merchantTransferFee: number
  netAmount: number
  merchantBankName: string | null
}

export type BookingPriceBreakdown = {
  subtotalAmount: number
  paymentMethod: FinancePaymentMethod
  customerAdminFeePercent: number
  customerAdminFeeAmount: number
  customerTaxPercent: number
  customerTaxAmount: number
  totalAmount: number
  dpAmount: number
  finalPaymentAmount: number
}

export const defaultFinanceSettings: FinanceSettings = {
  redfengCommissionPercent: 12,
  customerAdminFeePercent: 3,
  customerTaxPercent: 11,
  merchantTransferFee: 6500,
  customerAdminFeeRules: {
    bank_transfer: 3,
    qris: 1.5,
    credit_card: 3.5,
  },
  merchantTransferFeeRules: {
    default: 6500,
    bca: 6500,
    bni: 6500,
    bri: 6500,
    mandiri: 6500,
    permata: 6500,
    cimb: 6500,
    bsi: 6500,
  },
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseJsonObject(value: unknown) {
  if (!value) return null
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== "string") return null
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function normalizeKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeBankKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

function resolveNumericRules<T extends string>(
  source: Record<string, unknown> | null,
  fallback: Record<T, number>,
) {
  const result = { ...fallback } as Record<T, number>
  if (!source) return result

  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeKey(key) as T
    const parsed = Number(value)
    if (normalizedKey && Number.isFinite(parsed)) {
      result[normalizedKey] = parsed
    }
  }

  return result
}

export async function getFinanceSettings(adminSupabase: FinanceSettingsQuery) {
  try {
    const { data, error } = await adminSupabase
      .from("finance_settings")
      .select(
        "id, redfeng_commission_percent, customer_admin_fee_percent, customer_tax_percent, merchant_transfer_fee, customer_admin_fee_rules, merchant_transfer_fee_rules",
      )
      .eq("id", "default")
      .maybeSingle()

    if (error || !data) {
      return defaultFinanceSettings
    }

    return {
      redfengCommissionPercent: toNumber(
        data.redfeng_commission_percent,
        defaultFinanceSettings.redfengCommissionPercent,
      ),
      customerAdminFeePercent: toNumber(
        data.customer_admin_fee_percent,
        defaultFinanceSettings.customerAdminFeePercent,
      ),
      customerTaxPercent: toNumber(data.customer_tax_percent, defaultFinanceSettings.customerTaxPercent),
      merchantTransferFee: toNumber(data.merchant_transfer_fee, defaultFinanceSettings.merchantTransferFee),
      customerAdminFeeRules: resolveNumericRules(
        parseJsonObject(data.customer_admin_fee_rules),
        defaultFinanceSettings.customerAdminFeeRules,
      ),
      merchantTransferFeeRules: {
        ...defaultFinanceSettings.merchantTransferFeeRules,
        ...Object.fromEntries(
          Object.entries(parseJsonObject(data.merchant_transfer_fee_rules) || {}).flatMap(([key, value]) => {
            const normalizedKey = normalizeBankKey(key)
            const parsed = Number(value)
            return normalizedKey && Number.isFinite(parsed) ? [[normalizedKey, parsed]] : []
          }),
        ),
      },
    }
  } catch {
    return defaultFinanceSettings
  }
}

export function normalizePaymentMethod(value: string | null | undefined): FinancePaymentMethod {
  const normalized = normalizeKey(value)
  if (normalized === "qris") return "qris"
  if (normalized === "credit_card" || normalized === "card" || normalized === "kartu_kredit") {
    return "credit_card"
  }
  return "bank_transfer"
}

export function resolveCustomerAdminFeePercent(
  paymentMethod: string | null | undefined,
  settings: FinanceSettings,
) {
  const normalizedMethod = normalizePaymentMethod(paymentMethod)
  const ruleValue = settings.customerAdminFeeRules[normalizedMethod]
  if (Number.isFinite(ruleValue)) {
    return Number(ruleValue)
  }
  return settings.customerAdminFeePercent
}

export function resolveMerchantTransferFee(
  bankName: string | null | undefined,
  settings: FinanceSettings,
) {
  const normalizedBank = normalizeBankKey(bankName)
  const bankSpecificFee =
    (normalizedBank ? settings.merchantTransferFeeRules[normalizedBank] : undefined) ??
    settings.merchantTransferFeeRules.default

  return Math.max(
    Math.round(
      Number.isFinite(Number(bankSpecificFee)) ? Number(bankSpecificFee) : settings.merchantTransferFee,
    ),
    0,
  )
}

export function calculateBookingAmounts(
  subtotalAmount: number,
  paymentMethod: string | null | undefined,
  settings: FinanceSettings,
): BookingPriceBreakdown {
  const normalizedSubtotal = Math.max(Number(subtotalAmount || 0), 0)
  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod)
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(normalizedPaymentMethod, settings)
  const customerTaxPercent = settings.customerTaxPercent
  const customerAdminFeeAmount = Math.round(normalizedSubtotal * (customerAdminFeePercent / 100))
  const customerTaxAmount = Math.round((normalizedSubtotal + customerAdminFeeAmount) * (customerTaxPercent / 100))
  const totalAmount = normalizedSubtotal + customerAdminFeeAmount + customerTaxAmount
  const dpAmount = Math.round(totalAmount * 0.3)

  return {
    subtotalAmount: normalizedSubtotal,
    paymentMethod: normalizedPaymentMethod,
    customerAdminFeePercent,
    customerAdminFeeAmount,
    customerTaxPercent,
    customerTaxAmount,
    totalAmount,
    dpAmount,
    finalPaymentAmount: Math.max(totalAmount - dpAmount, 0),
  }
}

export function calculateMerchantPayout(
  grossAmount: number,
  settings: FinanceSettings,
  merchantBankName?: string | null,
): MerchantPayoutBreakdown {
  const normalizedGross = Math.max(Number(grossAmount || 0), 0)
  const redfengCommissionAmount = Math.round(
    normalizedGross * (settings.redfengCommissionPercent / 100),
  )
  const merchantTransferFee = resolveMerchantTransferFee(merchantBankName, settings)
  const netAmount = Math.max(normalizedGross - redfengCommissionAmount - merchantTransferFee, 0)

  return {
    grossAmount: normalizedGross,
    redfengCommissionPercent: settings.redfengCommissionPercent,
    redfengCommissionAmount,
    customerAdminFeePercent: settings.customerAdminFeePercent,
    customerTaxPercent: settings.customerTaxPercent,
    merchantTransferFee,
    netAmount,
    merchantBankName: merchantBankName || null,
  }
}
