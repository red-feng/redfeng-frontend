type FinanceSettingsRow = {
  id?: string | null
  redfeng_commission_percent?: number | string | null
  customer_admin_fee_percent?: number | string | null
  customer_tax_percent?: number | string | null
  merchant_transfer_fee?: number | string | null
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
}

export type MerchantPayoutBreakdown = {
  grossAmount: number
  redfengCommissionPercent: number
  redfengCommissionAmount: number
  customerAdminFeePercent: number
  customerTaxPercent: number
  merchantTransferFee: number
  netAmount: number
}

export const defaultFinanceSettings: FinanceSettings = {
  redfengCommissionPercent: 12,
  customerAdminFeePercent: 3,
  customerTaxPercent: 11,
  merchantTransferFee: 6500,
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function getFinanceSettings(adminSupabase: FinanceSettingsQuery) {
  try {
    const { data, error } = await adminSupabase
      .from("finance_settings")
      .select(
        "id, redfeng_commission_percent, customer_admin_fee_percent, customer_tax_percent, merchant_transfer_fee",
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
    }
  } catch {
    return defaultFinanceSettings
  }
}

export function calculateMerchantPayout(grossAmount: number, settings: FinanceSettings): MerchantPayoutBreakdown {
  const normalizedGross = Math.max(Number(grossAmount || 0), 0)
  const redfengCommissionAmount = Math.round(
    normalizedGross * (settings.redfengCommissionPercent / 100),
  )
  const merchantTransferFee = Math.max(Math.round(settings.merchantTransferFee), 0)
  const netAmount = Math.max(normalizedGross - redfengCommissionAmount - merchantTransferFee, 0)

  return {
    grossAmount: normalizedGross,
    redfengCommissionPercent: settings.redfengCommissionPercent,
    redfengCommissionAmount,
    customerAdminFeePercent: settings.customerAdminFeePercent,
    customerTaxPercent: settings.customerTaxPercent,
    merchantTransferFee,
    netAmount,
  }
}
