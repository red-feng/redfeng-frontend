import type { SupabaseClient } from "@supabase/supabase-js"
import { getTransactionPromoReasonLabel } from "@/lib/transaction-promos"

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

type TransactionPromoEventAnalyticsRow = {
  rule_id: string | null
  event_type: string | null
  reason: string | null
}

type TransactionPromoLinkAnalyticsRow = {
  transaction_promo_rule_id: string | null
  marketing_promo_id: string | null
}

type MarketingPromoEventAnalyticsRow = {
  promo_id: string | null
  promo_slug: string | null
  event_type: string | null
}

export type TransactionPromoAnalyticsSummary = {
  linkedCampaignCount: number
  impressionEvents: number
  clickEvents: number
  quotedEvents: number
  rejectedEvents: number
  revertedEvents: number
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
    impressionEvents: number
    clickEvents: number
    quotedEvents: number
    rejectedEvents: number
    revertedEvents: number
    linkedCampaignCount: number
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
  topRejectReasons: Array<{
    reason: string
    label: string
    count: number
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
  const [{ data: rulesData }, { data: redemptionsData }, { data: eventsData }, { data: promoLinksData }, { data: marketingEventsData }] = await Promise.all([
    supabase.from("transaction_promo_rules").select("id, name, code, status, transaction_promo_rule_targets(merchant_id, payment_method)"),
    supabase.from("transaction_promo_redemptions").select("rule_id, booking_id, discount_amount, status"),
    supabase.from("transaction_promo_events").select("rule_id, event_type, reason"),
    supabase.from("marketing_promo_transaction_rules").select("transaction_promo_rule_id, marketing_promo_id"),
    supabase.from("marketing_promo_events").select("promo_id, promo_slug, event_type"),
  ])

  const rules = ((rulesData as TransactionPromoRuleAnalyticsRow[] | null) || []).filter((rule) => rule.id)
  const redemptions = (redemptionsData as TransactionPromoRedemptionAnalyticsRow[] | null) || []
  const events = (eventsData as TransactionPromoEventAnalyticsRow[] | null) || []
  const promoLinks = (promoLinksData as TransactionPromoLinkAnalyticsRow[] | null) || []
  const marketingEvents = (marketingEventsData as MarketingPromoEventAnalyticsRow[] | null) || []
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
  const linkedCampaignsByRuleId = new Map<string, number>()
  const linkedCampaignIdSet = new Set<string>()
  const ruleIdsByCampaignId = new Map<string, string[]>()
  for (const row of promoLinks) {
    const ruleId = normalizeString(row.transaction_promo_rule_id)
    const campaignId = normalizeString(row.marketing_promo_id)
    if (!ruleId || !campaignId) continue
    linkedCampaignIdSet.add(campaignId)
    linkedCampaignsByRuleId.set(ruleId, (linkedCampaignsByRuleId.get(ruleId) || 0) + 1)
    const currentRuleIds = ruleIdsByCampaignId.get(campaignId) || []
    currentRuleIds.push(ruleId)
    ruleIdsByCampaignId.set(campaignId, currentRuleIds)
  }

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
      impressionEvents: number
      clickEvents: number
      quotedEvents: number
      rejectedEvents: number
      revertedEvents: number
      linkedCampaignCount: number
    }
  >()

  const linkedCampaignCount = linkedCampaignIdSet.size
  let impressionEvents = 0
  let clickEvents = 0
  let quotedEvents = 0
  let rejectedEvents = 0
  let revertedEvents = 0
  let appliedRedemptions = 0
  let reservedRedemptions = 0
  let appliedDiscountCost = 0
  let reservedDiscountCost = 0
  let appliedGmv = 0
  let reservedGmv = 0
  const paymentMethodSummaryMap = new Map<string, { paymentMethod: string; appliedRedemptions: number; appliedDiscountCost: number; appliedGmv: number }>()
  const merchantSummaryMap = new Map<string, { merchantId: string; appliedRedemptions: number; appliedDiscountCost: number; appliedGmv: number }>()
  const rejectReasonSummaryMap = new Map<string, number>()

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
      impressionEvents: 0,
      clickEvents: 0,
      quotedEvents: 0,
      rejectedEvents: 0,
      revertedEvents: 0,
      linkedCampaignCount: linkedCampaignsByRuleId.get(ruleId) || 0,
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

  for (const row of marketingEvents) {
    const campaignId = normalizeString(row.promo_id)
    const eventType = normalizeString(row.event_type).toLowerCase()
    if (!campaignId || !eventType) continue

    const linkedRuleIds = Array.from(new Set(ruleIdsByCampaignId.get(campaignId) || []))
    if (!linkedRuleIds.length) continue

    for (const ruleId of linkedRuleIds) {
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
        impressionEvents: 0,
        clickEvents: 0,
        quotedEvents: 0,
        rejectedEvents: 0,
        revertedEvents: 0,
        linkedCampaignCount: linkedCampaignsByRuleId.get(ruleId) || 0,
      }

      if (eventType === "impression") {
        impressionEvents += 1
        promoSummary.impressionEvents += 1
      }
      if (eventType === "click") {
        clickEvents += 1
        promoSummary.clickEvents += 1
      }

      promoSummaryMap.set(ruleId, promoSummary)
    }
  }

  for (const row of events) {
    const ruleId = normalizeString(row.rule_id)
    const eventType = normalizeString(row.event_type).toLowerCase()
    if (!ruleId || !eventType) continue

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
      impressionEvents: 0,
      clickEvents: 0,
      quotedEvents: 0,
      rejectedEvents: 0,
      revertedEvents: 0,
      linkedCampaignCount: linkedCampaignsByRuleId.get(ruleId) || 0,
    }

    if (eventType === "quoted") {
      quotedEvents += 1
      promoSummary.quotedEvents += 1
    }
    if (eventType === "rejected") {
      rejectedEvents += 1
      promoSummary.rejectedEvents += 1
      const reasonKey = normalizeString(row.reason).toLowerCase() || "unknown"
      rejectReasonSummaryMap.set(reasonKey, (rejectReasonSummaryMap.get(reasonKey) || 0) + 1)
    }
    if (eventType === "reverted") {
      revertedEvents += 1
      promoSummary.revertedEvents += 1
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

  const topRejectReasons = Array.from(rejectReasonSummaryMap.entries())
    .map(([reason, count]) => ({
      reason,
      label: getTransactionPromoReasonLabel(reason),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    linkedCampaignCount,
    impressionEvents,
    clickEvents,
    quotedEvents,
    rejectedEvents,
    revertedEvents,
    appliedRedemptions,
    reservedRedemptions,
    appliedDiscountCost,
    reservedDiscountCost,
    appliedGmv,
    reservedGmv,
    topPromosByApplied,
    topPaymentMethodsByApplied,
    topMerchantsByApplied,
    topRejectReasons,
  }
}
