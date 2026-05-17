import { normalizeBookingProductType, type BookingProductType } from "@/lib/booking-products"

export type TransactionPromoDiscountType = "percentage" | "fixed_amount"
export type TransactionPromoStatus = "draft" | "approved" | "active" | "paused" | "expired"
export type TransactionPromoChannel = "public_web" | "mobile_web" | "mobile_app" | "internal"

export const transactionPromoStatuses: TransactionPromoStatus[] = ["draft", "approved", "active", "paused", "expired"]
export const transactionPromoDiscountTypes: TransactionPromoDiscountType[] = ["percentage", "fixed_amount"]
export const transactionPromoChannels: TransactionPromoChannel[] = ["public_web", "mobile_web", "mobile_app", "internal"]

export type TransactionPromoRuleRecord = {
  id: string
  code?: string | null
  name: string
  description?: string | null
  discount_type: string | null
  discount_value: number | string | null
  max_discount_amount?: number | string | null
  minimum_order_amount?: number | string | null
  quota_total?: number | null
  quota_per_user?: number | null
  starts_at?: string | null
  ends_at?: string | null
  status?: string | null
  is_auto_apply?: boolean | null
  new_user_only?: boolean | null
  approved_by?: string | null
  approved_at?: string | null
  marketing_approved_by?: string | null
  marketing_approved_at?: string | null
  finance_approved_by?: string | null
  finance_approved_at?: string | null
}

export type TransactionPromoRuleTargetRecord = {
  id?: string
  rule_id?: string
  product_type: string | null
  product_id?: string | null
  product_reference?: string | null
  merchant_id?: string | null
  payment_method?: string | null
  customer_locale?: string | null
  channel?: string | null
}

export type TransactionPromoContext = {
  subtotalAmount: number
  currency?: string | null
  productType: BookingProductType
  productId?: string | null
  productReference?: string | null
  merchantId?: string | null
  paymentMethod?: string | null
  customerLocale?: string | null
  channel?: TransactionPromoChannel | string | null
  customerId?: string | null
  customerEmail?: string | null
  promoCode?: string | null
}

export type TransactionPromoEvaluationResult =
  | {
      valid: true
      ruleId: string
      discountAmount: number
      normalizedCode: string | null
      target: TransactionPromoRuleTargetRecord | null
    }
  | {
      valid: false
      ruleId: string
      reason:
        | "invalid_discount_type"
        | "inactive_status"
        | "not_started"
        | "ended"
        | "minimum_order_not_met"
        | "code_required"
        | "code_mismatch"
        | "quota_exhausted"
        | "user_quota_exhausted"
        | "new_user_only"
        | "target_mismatch"
        | "discount_zero"
      discountAmount: 0
      normalizedCode: string | null
      target: TransactionPromoRuleTargetRecord | null
    }

export type TransactionPromoFailureReason = Extract<TransactionPromoEvaluationResult, { valid: false }>["reason"]

type EvaluateTransactionPromoRuleParams = {
  rule: TransactionPromoRuleRecord
  targets?: TransactionPromoRuleTargetRecord[]
  context: TransactionPromoContext
  totalRedemptions?: number
  userRedemptions?: number
  isNewCustomer?: boolean
  nowIso?: string
}

type SelectBestAutoPromoParams = {
  rules: TransactionPromoRuleRecord[]
  targetsByRuleId?: Map<string, TransactionPromoRuleTargetRecord[]>
  context: TransactionPromoContext
  totalRedemptionsByRuleId?: Map<string, number>
  userRedemptionsByRuleId?: Map<string, number>
  isNewCustomer?: boolean
  nowIso?: string
}

function toNumber(value: number | string | null | undefined) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function normalizeString(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

export function normalizeTransactionPromoCode(value: string | null | undefined) {
  const normalized = normalizeString(value)
  return normalized || null
}

export function isTransactionPromoDiscountType(value: string | null | undefined): value is TransactionPromoDiscountType {
  const normalized = normalizeString(value)
  return normalized === "percentage" || normalized === "fixed_amount"
}

export function isTransactionPromoStatus(value: string | null | undefined): value is TransactionPromoStatus {
  const normalized = normalizeString(value)
  return normalized === "draft" || normalized === "approved" || normalized === "active" || normalized === "paused" || normalized === "expired"
}

export function isTransactionPromoChannel(value: string | null | undefined): value is TransactionPromoChannel {
  const normalized = normalizeString(value)
  return normalized === "public_web" || normalized === "mobile_web" || normalized === "mobile_app" || normalized === "internal"
}

export function getTransactionPromoStatusLabel(value: string | null | undefined) {
  const normalized = normalizeString(value)
  if (normalized === "draft") return "Draft / revisi"
  if (normalized === "approved") return "Siap review finance"
  if (normalized === "active") return "Live checkout"
  if (normalized === "paused") return "Dijeda"
  if (normalized === "expired") return "Berakhir"
  return "Status tidak dikenal"
}

export function getTransactionPromoDiscountTypeLabel(value: string | null | undefined) {
  const normalized = normalizeString(value)
  if (normalized === "percentage") return "Persentase"
  if (normalized === "fixed_amount") return "Nominal tetap"
  return "Unknown"
}

export function getTransactionPromoChannelLabel(value: string | null | undefined) {
  const normalized = normalizeString(value)
  if (normalized === "public_web") return "Public Web"
  if (normalized === "mobile_web") return "Mobile Web"
  if (normalized === "mobile_app") return "Mobile App"
  if (normalized === "internal") return "Internal"
  return "Unknown"
}

export function getTransactionPromoModeLabel(isAutoApply: boolean | null | undefined, code?: string | null) {
  if (isAutoApply) return "Auto-apply"
  const normalizedCode = String(code || "").trim()
  return normalizedCode ? `Voucher / kupon: ${normalizedCode}` : "Voucher / kupon"
}

export function getTransactionPromoAudienceLabel(newUserOnly: boolean | null | undefined) {
  return newUserOnly ? "Khusus customer baru" : "Semua customer"
}

export function getTransactionPromoReasonLabel(reason: TransactionPromoFailureReason | string | null | undefined) {
  const normalized = normalizeString(reason)
  if (normalized === "not_started") return "Belum mulai"
  if (normalized === "ended") return "Sudah berakhir"
  if (normalized === "minimum_order_not_met") return "Minimum order belum terpenuhi"
  if (normalized === "quota_exhausted") return "Kuota total habis"
  if (normalized === "user_quota_exhausted") return "Kuota akun habis"
  if (normalized === "new_user_only") return "Khusus customer baru"
  if (normalized === "target_mismatch") return "Target transaksi tidak cocok"
  if (normalized === "code_required") return "Butuh voucher / kupon"
  if (normalized === "code_mismatch") return "Kode tidak cocok"
  if (normalized === "inactive_status") return "Belum live checkout"
  if (normalized === "discount_zero") return "Potongan nol"
  if (normalized === "invalid_discount_type") return "Tipe diskon tidak valid"
  return "Promo tidak valid"
}

export function isTransactionPromoRuleCurrentlyLive(rule: TransactionPromoRuleRecord, nowIso = new Date().toISOString()) {
  if (normalizeString(rule.status) !== "active") {
    return false
  }

  const now = new Date(nowIso)
  const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
  const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

  if (startsAt && startsAt.getTime() > now.getTime()) return false
  if (endsAt && endsAt.getTime() < now.getTime()) return false
  return true
}

export function calculateTransactionPromoDiscount(rule: TransactionPromoRuleRecord, subtotalAmount: number) {
  const subtotal = Math.max(toNumber(subtotalAmount), 0)
  if (!subtotal || !isTransactionPromoDiscountType(rule.discount_type)) return 0

  const discountValue = Math.max(toNumber(rule.discount_value), 0)
  if (!discountValue) return 0

  const rawDiscount =
    rule.discount_type === "percentage"
      ? Math.round(subtotal * (discountValue / 100))
      : Math.round(discountValue)

  const cappedDiscount = rule.max_discount_amount
    ? Math.min(rawDiscount, Math.max(toNumber(rule.max_discount_amount), 0))
    : rawDiscount

  return Math.max(Math.min(cappedDiscount, subtotal), 0)
}

export function doesTransactionPromoTargetMatch(context: TransactionPromoContext, target: TransactionPromoRuleTargetRecord) {
  const normalizedTargetProductType = normalizeBookingProductType(target.product_type)
  if (!normalizedTargetProductType) return false
  if (normalizedTargetProductType !== context.productType) return false

  if (target.product_id && String(target.product_id) !== String(context.productId || "")) return false
  if (normalizeString(target.product_reference) && normalizeString(target.product_reference) !== normalizeString(context.productReference)) return false
  if (target.merchant_id && String(target.merchant_id) !== String(context.merchantId || "")) return false
  if (normalizeString(target.payment_method) && normalizeString(target.payment_method) !== normalizeString(context.paymentMethod)) return false
  if (normalizeString(target.customer_locale) && normalizeString(target.customer_locale) !== normalizeString(context.customerLocale)) return false
  if (normalizeString(target.channel) && normalizeString(target.channel) !== normalizeString(context.channel)) return false

  return true
}

export function evaluateTransactionPromoRule({
  rule,
  targets = [],
  context,
  totalRedemptions = 0,
  userRedemptions = 0,
  isNewCustomer = true,
  nowIso = new Date().toISOString(),
}: EvaluateTransactionPromoRuleParams): TransactionPromoEvaluationResult {
  const normalizedCode = normalizeTransactionPromoCode(rule.code)
  const providedCode = normalizeTransactionPromoCode(context.promoCode)

  if (!isTransactionPromoDiscountType(rule.discount_type)) {
    return { valid: false, ruleId: rule.id, reason: "invalid_discount_type", discountAmount: 0, normalizedCode, target: null }
  }

  if (!isTransactionPromoStatus(rule.status) || normalizeString(rule.status) !== "active") {
    return { valid: false, ruleId: rule.id, reason: "inactive_status", discountAmount: 0, normalizedCode, target: null }
  }

  const now = new Date(nowIso)
  const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
  const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

  if (startsAt && startsAt.getTime() > now.getTime()) {
    return { valid: false, ruleId: rule.id, reason: "not_started", discountAmount: 0, normalizedCode, target: null }
  }

  if (endsAt && endsAt.getTime() < now.getTime()) {
    return { valid: false, ruleId: rule.id, reason: "ended", discountAmount: 0, normalizedCode, target: null }
  }

  if (normalizedCode) {
    if (!providedCode && !rule.is_auto_apply) {
      return { valid: false, ruleId: rule.id, reason: "code_required", discountAmount: 0, normalizedCode, target: null }
    }

    if (providedCode && normalizedCode !== providedCode) {
      return { valid: false, ruleId: rule.id, reason: "code_mismatch", discountAmount: 0, normalizedCode, target: null }
    }
  }

  if (toNumber(context.subtotalAmount) < Math.max(toNumber(rule.minimum_order_amount), 0)) {
    return { valid: false, ruleId: rule.id, reason: "minimum_order_not_met", discountAmount: 0, normalizedCode, target: null }
  }

  if (rule.quota_total && totalRedemptions >= rule.quota_total) {
    return { valid: false, ruleId: rule.id, reason: "quota_exhausted", discountAmount: 0, normalizedCode, target: null }
  }

  if (rule.quota_per_user && userRedemptions >= rule.quota_per_user) {
    return { valid: false, ruleId: rule.id, reason: "user_quota_exhausted", discountAmount: 0, normalizedCode, target: null }
  }

   if (rule.new_user_only && !isNewCustomer) {
    return { valid: false, ruleId: rule.id, reason: "new_user_only", discountAmount: 0, normalizedCode, target: null }
  }

  const matchingTarget = targets.length ? targets.find((target) => doesTransactionPromoTargetMatch(context, target)) || null : null
  if (targets.length && !matchingTarget) {
    return { valid: false, ruleId: rule.id, reason: "target_mismatch", discountAmount: 0, normalizedCode, target: null }
  }

  const discountAmount = calculateTransactionPromoDiscount(rule, context.subtotalAmount)
  if (discountAmount <= 0) {
    return { valid: false, ruleId: rule.id, reason: "discount_zero", discountAmount: 0, normalizedCode, target: matchingTarget }
  }

  return {
    valid: true,
    ruleId: rule.id,
    discountAmount,
    normalizedCode,
    target: matchingTarget,
  }
}

export function selectBestAutoTransactionPromo({
  rules,
  targetsByRuleId = new Map<string, TransactionPromoRuleTargetRecord[]>(),
  context,
  totalRedemptionsByRuleId = new Map<string, number>(),
  userRedemptionsByRuleId = new Map<string, number>(),
  isNewCustomer = true,
  nowIso = new Date().toISOString(),
}: SelectBestAutoPromoParams) {
  const candidates = rules
    .filter((rule) => Boolean(rule.is_auto_apply))
    .map((rule) =>
      evaluateTransactionPromoRule({
        rule,
        targets: targetsByRuleId.get(rule.id) || [],
        context,
        totalRedemptions: totalRedemptionsByRuleId.get(rule.id) || 0,
        userRedemptions: userRedemptionsByRuleId.get(rule.id) || 0,
        isNewCustomer,
        nowIso,
      }),
    )
    .filter((result): result is Extract<TransactionPromoEvaluationResult, { valid: true }> => result.valid)
    .sort((a, b) => b.discountAmount - a.discountAmount)

  return candidates[0] || null
}
