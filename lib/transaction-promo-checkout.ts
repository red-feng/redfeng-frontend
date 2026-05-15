import type { SupabaseClient } from "@supabase/supabase-js"
import { convertCurrencyAmount, getLiveLocalizedPackagePricing } from "@/lib/currency-rates"
import {
  calculateBookingAmounts,
  getFinanceSettings,
  resolveActiveCustomerPaymentMethod,
  type FinancePaymentMethod,
} from "@/lib/finance/settings"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import {
  evaluateTransactionPromoRule,
  normalizeTransactionPromoCode,
  selectBestAutoTransactionPromo,
  type TransactionPromoRuleRecord,
  type TransactionPromoRuleTargetRecord,
} from "@/lib/transaction-promos"

type PackagePricingRow = {
  id: string
  merchant_id?: string | null
  price_adult?: number | null
  price_child?: number | null
  currency?: string | null
  default_language?: string | null
  published_languages?: string[] | null
}

type ResolvePackageCheckoutPromoPricingParams = {
  supabase: SupabaseClient
  packageId: string
  locale: Locale
  adultCount: number
  childCount: number
  paymentMethod: string | null | undefined
  promoCode?: string | null
  customerId?: string | null
  customerEmail?: string | null
}

type TransactionPromoApplicationResult = {
  applied: boolean
  source: "code" | "auto" | "none"
  message: string | null
  discountAmount: number
  normalizedCode: string | null
  rule: TransactionPromoRuleRecord | null
  target: TransactionPromoRuleTargetRecord | null
}

async function resolvePromoApproverNames(
  supabase: SupabaseClient,
  approverIds: string[],
) {
  const normalizedIds = Array.from(new Set(approverIds.map((value) => String(value || "").trim()).filter(Boolean)))
  if (!normalizedIds.length) {
    return new Map<string, string>()
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", normalizedIds)

  const result = new Map<string, string>()
  for (const row of ((data as Array<{ id: string | null; username: string | null }> | null) || [])) {
    const id = String(row.id || "").trim()
    if (!id) continue
    result.set(id, String(row.username || "").trim())
  }
  return result
}

function normalizeString(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function toPositiveInteger(value: number | null | undefined) {
  return Math.max(Math.trunc(Number(value || 0)), 0)
}

function getPromoErrorMessage(reason: string) {
  if (reason === "not_started") return "Promo ini belum mulai berlaku."
  if (reason === "ended") return "Promo ini sudah berakhir."
  if (reason === "minimum_order_not_met") return "Nilai transaksi belum memenuhi minimum promo."
  if (reason === "quota_exhausted") return "Kuota promo ini sudah habis."
  if (reason === "user_quota_exhausted") return "Batas penggunaan promo untuk akun Anda sudah tercapai."
  if (reason === "target_mismatch") return "Promo ini tidak berlaku untuk paket atau metode pembayaran yang dipilih."
  if (reason === "code_required" || reason === "code_mismatch") return "Kode promo tidak cocok."
  if (reason === "inactive_status") return "Promo ini sedang tidak aktif."
  if (reason === "discount_zero") return "Promo ini belum memberikan potongan pada transaksi ini."
  return "Promo tidak bisa dipakai untuk transaksi ini."
}

async function resolveTransactionPromoApplicationFromDatabase(params: {
  supabase: SupabaseClient
  subtotalAmount: number
  packageId: string
  merchantId?: string | null
  locale: Locale
  paymentMethod: FinancePaymentMethod
  promoCode?: string | null
  customerId?: string | null
  customerEmail?: string | null
}): Promise<TransactionPromoApplicationResult> {
  const normalizedPromoCode = normalizeTransactionPromoCode(params.promoCode)
  const { data: ruleRows } = await params.supabase
    .from("transaction_promo_rules")
    .select("id, code, name, description, discount_type, discount_value, max_discount_amount, minimum_order_amount, quota_total, quota_per_user, starts_at, ends_at, status, is_auto_apply, approved_by, approved_at, marketing_approved_by, marketing_approved_at, finance_approved_by, finance_approved_at")
    .eq("status", "active")

  const activeRules = ((ruleRows as TransactionPromoRuleRecord[] | null) || []).filter((rule) => rule.id)
  if (!activeRules.length) {
    return {
      applied: false,
      source: "none",
      message: normalizedPromoCode ? "Kode promo tidak ditemukan atau belum aktif." : null,
      discountAmount: 0,
      normalizedCode: normalizedPromoCode,
      rule: null,
      target: null,
    }
  }

  const ruleIds = activeRules.map((rule) => rule.id)
  const [targetResult, redemptionResult] = await Promise.all([
    params.supabase
      .from("transaction_promo_rule_targets")
      .select("id, rule_id, product_type, product_id, product_reference, merchant_id, payment_method, customer_locale, channel")
      .in("rule_id", ruleIds),
    params.supabase
      .from("transaction_promo_redemptions")
      .select("rule_id, user_id, email, status")
      .in("rule_id", ruleIds)
      .in("status", ["reserved", "applied"]),
  ])

  const targetsByRuleId = new Map<string, TransactionPromoRuleTargetRecord[]>()
  for (const row of ((targetResult.data as TransactionPromoRuleTargetRecord[] | null) || [])) {
    const ruleId = String(row.rule_id || "")
    if (!ruleId) continue
    const current = targetsByRuleId.get(ruleId) || []
    current.push(row)
    targetsByRuleId.set(ruleId, current)
  }

  const normalizedCustomerEmail = normalizeString(params.customerEmail)
  const totalRedemptionsByRuleId = new Map<string, number>()
  const userRedemptionsByRuleId = new Map<string, number>()
  for (const row of ((redemptionResult.data as Array<{ rule_id: string | null; user_id?: string | null; email?: string | null }> | null) || [])) {
    const ruleId = String(row.rule_id || "")
    if (!ruleId) continue
    totalRedemptionsByRuleId.set(ruleId, (totalRedemptionsByRuleId.get(ruleId) || 0) + 1)

    const sameUser =
      (params.customerId && String(row.user_id || "") === String(params.customerId)) ||
      (normalizedCustomerEmail && normalizeString(row.email) === normalizedCustomerEmail)

    if (sameUser) {
      userRedemptionsByRuleId.set(ruleId, (userRedemptionsByRuleId.get(ruleId) || 0) + 1)
    }
  }

  const context = {
    subtotalAmount: params.subtotalAmount,
    currency: "IDR",
    productType: "package_tour" as const,
    productId: params.packageId,
    merchantId: params.merchantId || null,
    paymentMethod: params.paymentMethod,
    customerLocale: params.locale,
    channel: "public_web" as const,
    customerId: params.customerId || null,
    customerEmail: params.customerEmail || null,
    promoCode: normalizedPromoCode,
  }

  if (normalizedPromoCode) {
    const matchingRules = activeRules.filter((rule) => normalizeTransactionPromoCode(rule.code) === normalizedPromoCode)
    if (!matchingRules.length) {
      return {
        applied: false,
        source: "code",
        message: "Kode promo tidak ditemukan atau belum aktif.",
        discountAmount: 0,
        normalizedCode: normalizedPromoCode,
        rule: null,
        target: null,
      }
    }

    const evaluated = matchingRules.map((rule) => ({
      rule,
      result: evaluateTransactionPromoRule({
        rule,
        targets: targetsByRuleId.get(rule.id) || [],
        context,
        totalRedemptions: totalRedemptionsByRuleId.get(rule.id) || 0,
        userRedemptions: userRedemptionsByRuleId.get(rule.id) || 0,
      }),
    }))

    const validMatch = evaluated
      .filter((entry) => entry.result.valid)
      .sort((a, b) => b.result.discountAmount - a.result.discountAmount)[0]

    if (validMatch) {
      return {
        applied: true,
        source: "code",
        message: null,
        discountAmount: validMatch.result.discountAmount,
        normalizedCode: normalizedPromoCode,
        rule: validMatch.rule,
        target: validMatch.result.target,
      }
    }

    const failure = evaluated[0]?.result
    return {
      applied: false,
      source: "code",
      message: failure?.valid ? null : getPromoErrorMessage(failure?.reason || "target_mismatch"),
      discountAmount: 0,
      normalizedCode: normalizedPromoCode,
      rule: evaluated[0]?.rule || null,
      target: failure?.target || null,
    }
  }

  const autoMatch = selectBestAutoTransactionPromo({
    rules: activeRules,
    targetsByRuleId,
    context,
    totalRedemptionsByRuleId,
    userRedemptionsByRuleId,
  })

  if (!autoMatch) {
    return {
      applied: false,
      source: "none",
      message: null,
      discountAmount: 0,
      normalizedCode: null,
      rule: null,
      target: null,
    }
  }

  return {
    applied: true,
    source: "auto",
    message: null,
    discountAmount: autoMatch.discountAmount,
    normalizedCode: autoMatch.normalizedCode,
    rule: activeRules.find((rule) => rule.id === autoMatch.ruleId) || null,
    target: autoMatch.target,
  }
}

export async function resolvePackageCheckoutPromoPricing({
  supabase,
  packageId,
  locale,
  adultCount,
  childCount,
  paymentMethod,
  promoCode,
  customerId,
  customerEmail,
}: ResolvePackageCheckoutPromoPricingParams) {
  const { data: packagePricing } = await supabase
    .from("packages")
    .select("id, merchant_id, price_adult, price_child, currency, default_language, published_languages")
    .eq("id", packageId)
    .single()

  if (!packagePricing) {
    throw new Error("Paket tidak ditemukan")
  }

  const activeLocale = normalizeLocale(locale)
  const localizedPricing = await getLiveLocalizedPackagePricing({
    locale: activeLocale,
    defaultLanguage: packagePricing.default_language,
    publishedLanguages: packagePricing.published_languages,
    baseCurrency: packagePricing.currency,
    baseAdultPrice: packagePricing.price_adult,
    baseChildPrice: packagePricing.price_child,
  })

  const adultPriceCharge = await convertCurrencyAmount({
    amount: Number(packagePricing.price_adult || 0),
    fromCurrency: packagePricing.currency || "IDR",
    toCurrency: "IDR",
  })
  const childPriceCharge = await convertCurrencyAmount({
    amount: Number(packagePricing.price_child || 0),
    fromCurrency: packagePricing.currency || "IDR",
    toCurrency: "IDR",
  })

  const normalizedAdultCount = toPositiveInteger(adultCount)
  const normalizedChildCount = toPositiveInteger(childCount)
  const paymentSubtotalAmount =
    Number(adultPriceCharge.amount || 0) * normalizedAdultCount +
    Number(childPriceCharge.amount || 0) * normalizedChildCount
  const displaySubtotalAmount =
    Number(localizedPricing.priceAdult || 0) * normalizedAdultCount +
    Number(localizedPricing.priceChild || 0) * normalizedChildCount
  const normalizedPaymentMethod = resolveActiveCustomerPaymentMethod(paymentMethod)
  const financeSettings = await getFinanceSettings(supabase as never)

  const promo = await resolveTransactionPromoApplicationFromDatabase({
    supabase,
    subtotalAmount: paymentSubtotalAmount,
    packageId,
    merchantId: (packagePricing as PackagePricingRow).merchant_id || null,
    locale: activeLocale,
    paymentMethod: normalizedPaymentMethod,
    promoCode,
    customerId,
    customerEmail,
  })

  const paymentDiscountAmount = Math.max(Math.min(Math.round(promo.discountAmount), paymentSubtotalAmount), 0)
  const discountRatio = paymentSubtotalAmount > 0 ? paymentDiscountAmount / paymentSubtotalAmount : 0
  const displayDiscountAmount = Math.max(Math.min(Math.round(displaySubtotalAmount * discountRatio), displaySubtotalAmount), 0)

  const paymentSubtotalAfterDiscount = Math.max(paymentSubtotalAmount - paymentDiscountAmount, 0)
  const displaySubtotalAfterDiscount = Math.max(displaySubtotalAmount - displayDiscountAmount, 0)
  const paymentBreakdown = calculateBookingAmounts(paymentSubtotalAfterDiscount, normalizedPaymentMethod, financeSettings)
  const displayBreakdown = calculateBookingAmounts(displaySubtotalAfterDiscount, normalizedPaymentMethod, financeSettings)
  const approverNameMap = promo.applied
    ? await resolvePromoApproverNames(supabase, [
        String(promo.rule?.approved_by || ""),
        String(promo.rule?.marketing_approved_by || ""),
        String(promo.rule?.finance_approved_by || ""),
      ])
    : new Map<string, string>()

  return {
    packagePricing: packagePricing as PackagePricingRow,
    locale: activeLocale,
    financeSettings,
    paymentMethod: normalizedPaymentMethod,
    localizedPricing,
    paymentPricing: {
      currency: adultPriceCharge.currency || "IDR",
      adultPrice: Number(adultPriceCharge.amount || 0),
      childPrice: Number(childPriceCharge.amount || 0),
      exchangeDate: adultPriceCharge.date || childPriceCharge.date,
    },
    counts: {
      adultCount: normalizedAdultCount,
      childCount: normalizedChildCount,
    },
    beforePromo: {
      paymentSubtotalAmount,
      displaySubtotalAmount,
    },
    promo,
    paymentBreakdown,
    displayBreakdown: {
      currency: localizedPricing.currency,
      subtotalAmount: displaySubtotalAfterDiscount,
      subtotalBeforeDiscount: displaySubtotalAmount,
      discountAmount: displayDiscountAmount,
      adminFeeAmount: displayBreakdown.customerAdminFeeAmount,
      taxAmount: displayBreakdown.customerTaxAmount,
      totalAmount: displayBreakdown.totalAmount,
      dpAmount: displayBreakdown.dpAmount,
      finalPaymentAmount: displayBreakdown.finalPaymentAmount,
    },
    promoSnapshot: promo.applied
      ? {
          rule_id: promo.rule?.id || null,
          rule_name: promo.rule?.name || null,
          code: promo.normalizedCode,
          source: promo.source,
          discount_amount: paymentDiscountAmount,
          display_discount_amount: displayDiscountAmount,
          subtotal_before_discount: paymentSubtotalAmount,
          subtotal_after_discount: paymentBreakdown.subtotalAmount,
          display_subtotal_before_discount: displaySubtotalAmount,
          display_subtotal_after_discount: displaySubtotalAfterDiscount,
          payment_method: normalizedPaymentMethod,
          locale: activeLocale,
          product_type: "package_tour",
          product_id: packageId,
          approved_by: promo.rule?.approved_by || null,
          approved_at: promo.rule?.approved_at || null,
          approved_by_name: approverNameMap.get(String(promo.rule?.approved_by || "").trim()) || null,
          marketing_approved_by: promo.rule?.marketing_approved_by || null,
          marketing_approved_at: promo.rule?.marketing_approved_at || null,
          marketing_approved_by_name: approverNameMap.get(String(promo.rule?.marketing_approved_by || "").trim()) || null,
          finance_approved_by: promo.rule?.finance_approved_by || null,
          finance_approved_at: promo.rule?.finance_approved_at || null,
          finance_approved_by_name: approverNameMap.get(String(promo.rule?.finance_approved_by || "").trim()) || null,
        }
      : null,
  }
}
