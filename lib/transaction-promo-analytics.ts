import type { SupabaseClient } from "@supabase/supabase-js"

type TransactionPromoRuleAnalyticsRow = {
  id: string
  name: string | null
  code: string | null
  status: string | null
  transaction_promo_rule_targets:
    | Array<{
        merchant_id: string | null
        payment_method: string | null
      }>
    | null
}

type TransactionPromoRedemptionAnalyticsRow = {
  rule_id: string | null
  booking_id: string | null
  discount_amount: number | string | null
  status: string | null
}

type TransactionPromoBookingAnalyticsRow = {
  id: string
  total_amount: number | string | null
}

export type TransactionPromoAnalyticsSummary = {
  appliedRedemptions: number
  reservedRedemptions: number
  appliedDiscountCost: number
  reservedDiscountCost: number
  appliedGmv: number
  reservedGmv: number
  topPromosByApplied: Array<{
    ruleId: string
    name: string
    code: string | null
    status: string
    appliedRedemptions: number
    reservedRedemptions: number
    appliedDiscountCost: number
    appliedGmv: number
  }>
  topPaymentMethodsByApplied: Array<{
    paymentMethod: string
    appliedRedemptions: number
    appliedDiscountCost: number
    appliedGmv: number
  }>
  topMerchantsByApplied: Array<{
    merchantId: string
    appliedRedemptions: number
    appliedDiscountCost: number
    appliedGmv: number
  }>
}

function normalizeString(value: string | null | undefined) {
  return String(value || "").trim()
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export async function getTransactionPromoAnalyticsSummary(
  supabase: SupabaseClient,
): Promise<TransactionPromoAnalyticsSummary> {
  const [{ data: rulesData }, { data: redemptionsData }] = await Promise.all([
    supabase.from("transaction_promo_rules").select("id, name, code, status, transaction_promo_rule_targets(merchant_id, payment_method)"),
    supabase.from("transaction_promo_redemptions").select("rule_id, booking_id, discount_amount, status"),
  ])

  const rules = ((rulesData as TransactionPromoRuleAnalyticsRow[] | null) || []).filter((rule) => rule.id)
  const redemptions = (redemptionsData as TransactionPromoRedemptionAnalyticsRow[] | null) || []
  const bookingIds = Array.from(new Set(redemptions.map((row) => normalizeString(row.booking_id)).filter(Boolean)))
  const { data: bookingsData } = bookingIds.length
    ? await supabase.from("bookings").select("id, total_amount").in("id", bookingIds)
    : { data: [] as TransactionPromoBookingAnalyticsRow[] }

  const bookingAmountById = new Map(
    (((bookingsData as TransactionPromoBookingAnalyticsRow[] | null) || [])).map((booking) => [
      booking.id,
      toNumber(booking.total_amount),
    ]),
  )
  const ruleMap = new Map(
    rules.map((rule) => [
      rule.id,
      {
        name: normalizeString(rule.name) || "Untitled",
        code: normalizeString(rule.code) || null,
        status: normalizeString(rule.status) || "draft",
        paymentMethod:
          Array.from(
            new Set(
              (((rule.transaction_promo_rule_targets as Array<{ payment_method: string | null }> | null) || []))
                .map((target) => normalizeString(target.payment_method).toLowerCase())
                .filter(Boolean),
            ),
          ).length === 1
            ? Array.from(
                new Set(
                  (((rule.transaction_promo_rule_targets as Array<{ payment_method: string | null }> | null) || []))
                    .map((target) => normalizeString(target.payment_method).toLowerCase())
                    .filter(Boolean),
                ),
              )[0]
            : null,
        merchantId:
          Array.from(
            new Set(
              (((rule.transaction_promo_rule_targets as Array<{ merchant_id: string | null }> | null) || []))
                .map((target) => normalizeString(target.merchant_id))
                .filter(Boolean),
            ),
          ).length === 1
            ? Array.from(
                new Set(
                  (((rule.transaction_promo_rule_targets as Array<{ merchant_id: string | null }> | null) || []))
                    .map((target) => normalizeString(target.merchant_id))
                    .filter(Boolean),
                ),
              )[0]
            : null,
      },
    ]),
  )

  const promoSummaryMap = new Map<
    string,
    {
      ruleId: string
      name: string
      code: string | null
      status: string
      appliedRedemptions: number
      reservedRedemptions: number
      appliedDiscountCost: number
      appliedGmv: number
    }
  >()

  let appliedRedemptions = 0
  let reservedRedemptions = 0
  let appliedDiscountCost = 0
  let reservedDiscountCost = 0
  let appliedGmv = 0
  let reservedGmv = 0
  const paymentMethodSummaryMap = new Map<string, { paymentMethod: string; appliedRedemptions: number; appliedDiscountCost: number; appliedGmv: number }>()
  const merchantSummaryMap = new Map<string, { merchantId: string; appliedRedemptions: number; appliedDiscountCost: number; appliedGmv: number }>()

  for (const row of redemptions) {
    const ruleId = normalizeString(row.rule_id)
    if (!ruleId) continue

    const status = normalizeString(row.status).toLowerCase()
    const discountAmount = toNumber(row.discount_amount)
    const bookingAmount = bookingAmountById.get(normalizeString(row.booking_id)) || 0
    const ruleMeta = ruleMap.get(ruleId) || { name: "Untitled", code: null, status: "draft", paymentMethod: null, merchantId: null }
    const promoSummary = promoSummaryMap.get(ruleId) || {
      ruleId,
      name: ruleMeta.name,
      code: ruleMeta.code,
      status: ruleMeta.status,
      appliedRedemptions: 0,
      reservedRedemptions: 0,
      appliedDiscountCost: 0,
      appliedGmv: 0,
    }

    if (status === "applied") {
      appliedRedemptions += 1
      appliedDiscountCost += discountAmount
      appliedGmv += bookingAmount
      promoSummary.appliedRedemptions += 1
      promoSummary.appliedDiscountCost += discountAmount
      promoSummary.appliedGmv += bookingAmount

      if (ruleMeta.paymentMethod) {
        const paymentMethodSummary = paymentMethodSummaryMap.get(ruleMeta.paymentMethod) || {
          paymentMethod: ruleMeta.paymentMethod,
          appliedRedemptions: 0,
          appliedDiscountCost: 0,
          appliedGmv: 0,
        }
        paymentMethodSummary.appliedRedemptions += 1
        paymentMethodSummary.appliedDiscountCost += discountAmount
        paymentMethodSummary.appliedGmv += bookingAmount
        paymentMethodSummaryMap.set(ruleMeta.paymentMethod, paymentMethodSummary)
      }

      if (ruleMeta.merchantId) {
        const merchantSummary = merchantSummaryMap.get(ruleMeta.merchantId) || {
          merchantId: ruleMeta.merchantId,
          appliedRedemptions: 0,
          appliedDiscountCost: 0,
          appliedGmv: 0,
        }
        merchantSummary.appliedRedemptions += 1
        merchantSummary.appliedDiscountCost += discountAmount
        merchantSummary.appliedGmv += bookingAmount
        merchantSummaryMap.set(ruleMeta.merchantId, merchantSummary)
      }
    }

    if (status === "reserved") {
      reservedRedemptions += 1
      reservedDiscountCost += discountAmount
      reservedGmv += bookingAmount
      promoSummary.reservedRedemptions += 1
    }

    promoSummaryMap.set(ruleId, promoSummary)
  }

  const topPromosByApplied = Array.from(promoSummaryMap.values())
    .sort((a, b) => {
      if (b.appliedRedemptions !== a.appliedRedemptions) return b.appliedRedemptions - a.appliedRedemptions
      if (b.appliedGmv !== a.appliedGmv) return b.appliedGmv - a.appliedGmv
      return b.appliedDiscountCost - a.appliedDiscountCost
    })
    .slice(0, 5)

  const topPaymentMethodsByApplied = Array.from(paymentMethodSummaryMap.values())
    .sort((a, b) => {
      if (b.appliedRedemptions !== a.appliedRedemptions) return b.appliedRedemptions - a.appliedRedemptions
      if (b.appliedGmv !== a.appliedGmv) return b.appliedGmv - a.appliedGmv
      return b.appliedDiscountCost - a.appliedDiscountCost
    })
    .slice(0, 5)

  const topMerchantsByApplied = Array.from(merchantSummaryMap.values())
    .sort((a, b) => {
      if (b.appliedRedemptions !== a.appliedRedemptions) return b.appliedRedemptions - a.appliedRedemptions
      if (b.appliedGmv !== a.appliedGmv) return b.appliedGmv - a.appliedGmv
      return b.appliedDiscountCost - a.appliedDiscountCost
    })
    .slice(0, 5)

  return {
    appliedRedemptions,
    reservedRedemptions,
    appliedDiscountCost,
    reservedDiscountCost,
    appliedGmv,
    reservedGmv,
    topPromosByApplied,
    topPaymentMethodsByApplied,
    topMerchantsByApplied,
  }
}
